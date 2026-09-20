import { clausula } from '@/lib/rules/clauses'
import type { RuleResult } from '@/lib/rules/types'

/**
 * Sitio: evidencia desplegada del paso "Adjudicador".
 * 1. Manda: el resultado de cada regla (cumple / no cumple), en tinta; el verde ya lo lleva el veredicto.
 * 2. Choca con: nada; vive dentro del paso, con hairlines.
 * 3. Se mueve: al desplegarse empuja hacia abajo los pasos siguientes (esperado).
 * 4. No tiene estados propios: llega completa.
 * 5. Quien ya miraba: el orden R1..R8 es fijo.
 */
const MARK: Record<RuleResult['resultado'], { t: string; c: string }> = {
  cumple: { t: 'Cumple', c: 'text-ink' },
  no_cumple: { t: 'No cumple', c: 'text-no font-semibold' },
  no_aplica: { t: 'No aplica', c: 'text-ink-3' },
}

export function RulesTable({ reglas }: { reglas: RuleResult[] }) {
  return (
    <table className="w-full text-xs">
      <tbody>
        {reglas.map((r) => (
          <tr key={r.id} className="border-t border-line align-top">
            <td className="py-2 pr-3 font-mono text-ink-3">{r.id}</td>
            <td className="py-2 pr-3">
              <div className="font-medium text-ink">{r.titulo}</div>
              <div className="text-ink-2">{r.evidencia}</div>
              {r.clausula && <div className="text-ink-3">{clausula(r.clausula)}</div>}
            </td>
            <td className={`py-2 whitespace-nowrap text-right ${MARK[r.resultado].c}`}>{MARK[r.resultado].t}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
