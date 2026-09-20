import { formatDate, formatMoney } from '@/lib/format'
import { clausula } from '@/lib/rules/clauses'
import type { Adjudication } from '@/lib/rules/types'

export type VerdictView = Pick<Adjudication, 'estado' | 'veredicto' | 'motivo' | 'clausulas' | 'documentosFaltantes'> & {
  elegibleDesde?: string | null
  topeAprobado?: number | null
  esperado?: Adjudication['estado'] | null
}

/**
 * Sitio: arriba de la consola, cuando ya hay veredicto.
 * 1. Manda: el veredicto. Es lo único con color pleno en la pantalla: verde si Preaprobada
 *    (el único verde vivo), rojo o ámbar apagados si no.
 * 2. Choca con: el paso en curso (también verde) — nunca coinciden: el veredicto aparece cuando
 *    ya no hay pasos corriendo.
 * 3. Se mueve: empuja la lista de pasos hacia abajo; el usuario ya la vio correr.
 * 4. No tiene estados propios.
 * 5. Quien ya miraba: "Esperado / coincide" le dice si el caso salió como estaba previsto.
 */
const TONE: Record<Adjudication['estado'], { bar: string; label: string; bg: string }> = {
  'Preaprobada': { bar: 'border-ok', label: 'text-ok', bg: 'bg-ok-bg' },
  'Rechazada': { bar: 'border-no', label: 'text-no', bg: 'bg-no-bg' },
  'Documentos faltantes': { bar: 'border-warn', label: 'text-warn', bg: 'bg-warn-bg' },
}

export function VerdictCard({ v }: { v: VerdictView }) {
  const t = TONE[v.estado]
  const coincide = v.esperado ? v.esperado === v.estado : null
  return (
    <section aria-live="polite" className={`border-l-2 ${t.bar} ${t.bg} px-5 py-4`}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className={`text-xs font-semibold uppercase tracking-wide ${t.label}`}>{v.estado}</div>
          <h3 className="mt-1 text-lg font-semibold leading-snug tracking-tight">{v.veredicto}</h3>
        </div>
        {v.esperado && (
          <div className="shrink-0 text-right text-xs text-ink-3">
            Esperado: {v.esperado}
            <br />
            <span className={coincide ? 'text-ink' : 'text-no font-semibold'}>{coincide ? 'coincide' : 'no coincide'}</span>
          </div>
        )}
      </div>
      <p className="mt-3 text-sm text-ink-2">{v.motivo}</p>
      <dl className="mt-3 grid gap-1 text-sm">
        {v.clausulas.length > 0 && (
          <div>
            <dt className="inline text-ink-3">Cláusulas: </dt>
            <dd className="inline">{v.clausulas.map(clausula).join(' · ')}</dd>
          </div>
        )}
        {v.documentosFaltantes.length > 0 && (
          <div>
            <dt className="inline text-ink-3">Documentos requeridos: </dt>
            <dd className="inline">{v.documentosFaltantes.join(', ')}</dd>
          </div>
        )}
        {v.elegibleDesde && (
          <div>
            <dt className="inline text-ink-3">Elegible desde: </dt>
            <dd className="inline">{formatDate(v.elegibleDesde)}</dd>
          </div>
        )}
        {v.topeAprobado != null && (
          <div>
            <dt className="inline text-ink-3">Tope aprobado: </dt>
            <dd className="inline">{formatMoney(v.topeAprobado)}</dd>
          </div>
        )}
      </dl>
    </section>
  )
}
