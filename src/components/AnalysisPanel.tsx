'use client'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import type { Solicitud } from '@/lib/notion/mappers'
import type { PipelineEvent } from '@/lib/pipeline/events'
import { readSSE } from '@/lib/sse-client'
import { idleSteps, StepList, type Steps } from './StepList'
import { VerdictCard, type VerdictView } from './VerdictCard'

/**
 * Sitio: columna derecha del detalle (la consola).
 * 1. Manda: mientras corre, el paso en curso; al terminar, el veredicto.
 * 2. Choca con: el informe de la izquierda (estático) — no compite: aquí todo es acción y resultado.
 * 3. Se mueve: el veredicto entra arriba y empuja los pasos; la carta crece dentro de su paso.
 * 4. Cargando/corriendo: botón deshabilitado + aria-busy, paso vivo en verde. Fallando: aviso en
 *    palabras del producto con "Reanalizar". Disparado desde Notion: polling cada 3 s con aviso.
 * 5. Quien ya miraba: si recarga, ve el resultado leído de Notion y puede reanalizar en vivo.
 */
type Phase = 'idle' | 'streaming' | 'polling' | 'finished' | 'failed'

function storedVerdict(s: Solicitud): VerdictView | null {
  if (s.estado !== 'Preaprobada' && s.estado !== 'Rechazada' && s.estado !== 'Documentos faltantes') return null
  return {
    estado: s.estado,
    veredicto: s.veredicto,
    motivo: s.motivo,
    clausulas: s.clausulas ? s.clausulas.split(',').map((x) => x.trim()).filter(Boolean) : [],
    documentosFaltantes: s.documentosFaltantes,
    elegibleDesde: s.elegibleDesde,
    topeAprobado: s.topeAprobado,
    esperado: s.esperado,
  }
}

const LOST = 'Se perdió la conexión con el análisis. Vuelve a cargar la página para leer el resultado desde Notion.'

export function AnalysisPanel({ initial }: { initial: Solicitud }) {
  const [solicitud, setSolicitud] = useState(initial)
  const [phase, setPhase] = useState<Phase>(initial.estado === 'En análisis' ? 'polling' : storedVerdict(initial) ? 'finished' : 'idle')
  const [steps, setSteps] = useState<Steps>(idleSteps())
  const [letter, setLetter] = useState('')
  const [verdict, setVerdict] = useState<VerdictView | null>(storedVerdict(initial))
  const [error, setError] = useState<string | null>(initial.estado === 'Error' ? initial.motivo : null)
  const busy = useRef(false)
  const router = useRouter()

  useEffect(() => {
    if (phase !== 'polling') return
    const t = setInterval(async () => {
      try {
        const r = await fetch(`/api/solicitudes/${solicitud.id}`, { cache: 'no-store' })
        if (!r.ok) return
        const s = (await r.json()) as Solicitud
        if (s.estado === 'En análisis') return
        setSolicitud(s)
        setVerdict(storedVerdict(s))
        setError(s.estado === 'Error' ? s.motivo : null)
        setPhase(s.estado === 'Error' ? 'failed' : storedVerdict(s) ? 'finished' : 'idle')
        router.refresh()
      } catch {
        /* siguiente intento */
      }
    }, 3000)
    return () => clearInterval(t)
  }, [phase, solicitud.id])

  async function analizar() {
    if (busy.current) return
    busy.current = true
    setPhase('streaming')
    setSteps(idleSteps())
    setLetter('')
    setVerdict(null)
    setError(null)
    try {
      const res = await fetch(`/api/solicitudes/${solicitud.id}/analizar`, { method: 'POST' })
      if (!res.ok) {
        if (res.status === 409) {
          setPhase('polling')
          return
        }
        const j = (await res.json().catch(() => ({ error: res.statusText }))) as { error?: string }
        throw new Error(j.error ?? `No se pudo iniciar el análisis (${res.status})`)
      }
      let terminado = false
      for await (const m of readSSE(res)) {
        const e = { event: m.event, data: JSON.parse(m.data) } as PipelineEvent
        if (e.event === 'step') {
          setSteps((s) => ({ ...s, [e.data.step]: { status: e.data.status, detail: e.data.detail, data: e.data.data ?? s[e.data.step].data } }))
        } else if (e.event === 'token') {
          setLetter((l) => l + e.data.text)
        } else if (e.event === 'verdict') {
          setVerdict({ ...e.data, esperado: solicitud.esperado })
        } else if (e.event === 'error') {
          terminado = true
          setError(e.data.message)
          setPhase('failed')
        } else if (e.event === 'done') {
          terminado = true
          setPhase('finished')
          setSolicitud((s) => ({ ...s, url: e.data.notionUrl }))
          router.refresh() // re-renderiza el encabezado (estado) sin perder el estado de la consola
        }
      }
      if (!terminado) {
        setError(LOST)
        setPhase('failed')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      setPhase('failed')
    } finally {
      busy.current = false
    }
  }

  const running = phase === 'streaming' || phase === 'polling'
  const label = phase === 'idle' ? 'Analizar' : phase === 'streaming' ? 'Analizando…' : phase === 'polling' ? 'Análisis en curso…' : 'Reanalizar'
  // Los pasos se ven siempre (en gris antes de correr), salvo cuando el resultado viene de Notion y no hay traza en vivo.
  const showSteps = phase !== 'finished' || steps.extract.status !== 'idle'
  const analizadoEl = solicitud.analizadoEl ? new Date(solicitud.analizadoEl).toLocaleString('es-EC', { timeZone: 'America/Guayaquil', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }) : null

  return (
    <div className="space-y-5" aria-busy={running}>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={analizar}
          disabled={running}
          className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface transition-opacity disabled:opacity-40"
        >
          {label}
        </button>
        <a href={solicitud.url} target="_blank" rel="noreferrer" className="text-sm text-ink-2 underline-offset-4 hover:underline">
          Ver en Notion ↗
        </a>
        {phase === 'polling' && <span className="text-xs text-ok">Disparado desde Notion · esta vista se actualiza sola.</span>}
      </div>

      {error && (
        <div className="border-l-2 border-no bg-no-bg px-4 py-3 text-sm text-no" role="alert">
          {error}
        </div>
      )}

      {verdict && <VerdictCard v={verdict} />}

      {showSteps && <StepList steps={steps} letter={letter} />}

      {phase === 'finished' && !showSteps && (
        <p className="text-xs text-ink-3">
          Resultado leído de Notion{analizadoEl ? ` (${analizadoEl})` : ''}. La carta y la traza completas están en la página de Notion. Pulsa
          «Reanalizar» para verlo en vivo.
        </p>
      )}
    </div>
  )
}
