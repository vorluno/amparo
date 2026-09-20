'use client'
import { useState } from 'react'
import { STEP_ORDER, STEP_TITLES, type StepId } from '@/lib/pipeline/events'
import { RulesTable } from './RulesTable'

export type StepState = { status: 'idle' | 'running' | 'done' | 'error'; detail?: string; data?: unknown }
export type Steps = Record<StepId, StepState>
export const idleSteps = (): Steps => ({
  extract: { status: 'idle' },
  policy: { status: 'idle' },
  adjudicate: { status: 'idle' },
  letter: { status: 'idle' },
  sync: { status: 'idle' },
})

/**
 * Sitio: consola (columna derecha del detalle), debajo del veredicto cuando lo hay.
 * 1. Manda: el paso en curso (verde, pulso) mientras corre; al terminar, el veredicto de arriba.
 * 2. Choca con: nada; pasos separados por hairlines, numerados; la evidencia se despliega dentro.
 * 3. Se mueve: al desplegar evidencia se empujan los pasos de abajo.
 * 4. Cargando/corriendo: punto verde con pulso y frase del paso en verde; los demás en gris.
 *    Fallando: el paso en rojo apagado con el motivo en palabras del producto.
 * 5. Quien ya miraba: los pasos hechos quedan en tinta y siguen desplegables.
 */
const DOT: Record<StepState['status'], string> = {
  idle: 'bg-line',
  running: 'bg-ok animate-pulse',
  done: 'bg-ink',
  error: 'bg-no',
}

type Row = [string, unknown]

function KV({ rows }: { rows: Row[] }) {
  const show = rows.filter(([, v]) => v !== undefined && v !== null && v !== '')
  return (
    <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-3 gap-y-1 text-xs">
      {show.map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink-3">{k}</dt>
          <dd className="min-w-0 break-words text-ink-2">{Array.isArray(v) ? (v.length ? v.join(', ') : '—') : String(v)}</dd>
        </div>
      ))}
    </dl>
  )
}

/** Nombres de producto para los identificadores del motor (nunca se pinta un id tal cual). */
const MODEL_NAMES: Record<string, string> = {
  'google/gemini-2.5-flash': 'Gemini 2.5 Flash',
  'google/gemini-2.5-pro': 'Gemini 2.5 Pro',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = Record<string, any>

function Evidence({ step, data, letter }: { step: StepId; data: unknown; letter: string }) {
  const d = (data ?? {}) as Loose
  if (step === 'extract' && d.extraction) {
    const e = d.extraction as Loose
    return (
      <KV
        rows={[
          ['Procedimiento en el informe', e.procedimientoTexto],
          ['Del catálogo', d.procedure ? `${d.procedure.procedimiento} (CPT ${d.procedure.cpt})` : 'ninguno'],
          ['Diagnóstico', e.diagnostico],
          ['Especialidad', e.especialidad],
          ['Atención inferida', e.tipoAtencionInferido],
          ['Documentos mencionados', e.documentosMencionados],
          ['Finalidad estética', e.esEstetico ? 'sí' : 'no'],
          ['Certeza', typeof e.confianza === 'number' ? `${Math.round(e.confianza * 100)} %` : undefined],
          ['Ambigüedades', e.ambiguedades],
          ['Justificación', e.justificacionClinica],
          ['Modelo', d.modelId ? `${MODEL_NAMES[d.modelId] ?? 'modelo de lenguaje'}${d.attempts > 1 ? ` · ${d.attempts} intentos` : ''}` : undefined],
        ]}
      />
    )
  }
  if (step === 'policy') {
    if (!d.encontrada) return <p className="text-xs text-ink-2">{d.resumen}</p>
    return (
      <KV
        rows={[
          ['Póliza', `${d.numero} · ${d.asegurado}`],
          ['Plan', d.plan],
          ['Estado', d.estado],
          ['Vigencia', d.vigencia],
          ['Días transcurridos', d.diasTranscurridos],
          ['Saldo', d.saldoTexto],
          ['Preexistencias', d.preexistencias],
          ['Hospital en red', d.enRed ? 'sí' : 'no'],
          ['Carencia del procedimiento', d.procedimiento ? `${d.procedimiento.carenciaDias} días${d.procedimiento.exentoEnEmergencia ? ' (exento en emergencia)' : ''}` : undefined],
          ['Documentos requeridos', d.procedimiento?.documentosRequeridos],
        ]}
      />
    )
  }
  if (step === 'adjudicate' && d.reglas) {
    return (
      <div className="space-y-2">
        <RulesTable reglas={d.reglas} />
        {Array.isArray(d.advertencias) && d.advertencias.length > 0 && (
          <div className="border-t border-line pt-2 text-xs text-ink-2">
            <div className="text-ink-3">Advertencias para el auditor</div>
            <ul className="mt-1 list-disc pl-4">
              {d.advertencias.map((w: string) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  }
  if (step === 'letter') return letter ? <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-ink-2">{letter}</pre> : null
  return null
}

export function StepList({ steps, letter }: { steps: Steps; letter: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ adjudicate: true, letter: true })
  return (
    <ol className="border-t border-line" aria-label="Etapas del análisis">
      {STEP_ORDER.map((id, i) => {
        const s = steps[id]
        const canOpen = s.status === 'done' || (id === 'letter' && s.status === 'running')
        const isOpen = canOpen && !!open[id]
        return (
          <li key={id} className="border-b border-line">
            <button
              type="button"
              disabled={!canOpen}
              aria-expanded={canOpen ? isOpen : undefined}
              onClick={() => setOpen((o) => ({ ...o, [id]: !o[id] }))}
              className="group flex w-full items-start gap-3 py-3 text-left disabled:cursor-default"
            >
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[s.status]}`} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-sm">
                  <span className="font-mono text-xs text-ink-3">{i + 1}</span>
                  <span className={`font-medium ${s.status === 'idle' ? 'text-ink-3' : s.status === 'running' ? 'text-ok' : 'text-ink'}`}>{STEP_TITLES[id]}</span>
                  {canOpen && <span className="ml-auto text-xs text-ink-3 opacity-70 group-hover:opacity-100">{isOpen ? 'ocultar' : 'evidencia'}</span>}
                </span>
                {s.detail && <span className={`mt-0.5 block text-xs ${s.status === 'error' ? 'text-no' : s.status === 'running' ? 'text-ok' : 'text-ink-2'}`}>{s.detail}</span>}
              </span>
            </button>
            {isOpen && (
              <div className="pb-4 pl-[1.4rem]">
                <Evidence step={id} data={s.data} letter={letter} />
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
