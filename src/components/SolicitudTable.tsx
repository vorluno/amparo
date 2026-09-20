import Link from 'next/link'
import type { Solicitud } from '@/lib/notion/mappers'
import { EstadoBadge } from './EstadoBadge'

/**
 * Sitio: pantalla principal, debajo del título.
 * 1. Manda: cada fila es una solicitud; el escenario es su protagonista, paciente y hospital lo acompañan debajo (P03).
 * 2. Choca con: nada; filas con hairline, sin tabla ni columna de acción (P11: la fila entera es el enlace).
 * 3. Se mueve: a 400 px el estado baja a una segunda línea; nunca hay desborde horizontal.
 * 4. Vacío: mensaje con el comando de seed. Error: lo maneja la página. Corriendo: "En análisis" en verde.
 * 5. Quien ya miraba: orden fijo por ID; solo cambia el estado.
 */
export function SolicitudTable({ rows }: { rows: Solicitud[] }) {
  if (!rows.length) {
    return (
      <div className="border-t border-b border-line py-12 text-center text-sm text-ink-3">
        No hay solicitudes. Ejecuta <code className="font-mono">bun run notion:seed</code> para poblar la demo.
      </div>
    )
  }
  return (
    <ul className="border-t border-line">
      {rows.map((s) => (
        <li key={s.id} className="border-b border-line">
          <Link
            href={`/solicitudes/${s.id}`}
            className="group grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-1 py-4 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto_1.5rem]"
          >
            <span className="font-mono text-xs text-ink-3 sm:pt-0.5">{s.id}</span>
            <span className="col-span-2 min-w-0 sm:col-span-1">
              <span className="line-clamp-2 block text-[15px] font-medium leading-snug group-hover:underline underline-offset-4 sm:truncate">{s.escenario || s.id}</span>
              <span className="mt-0.5 block truncate text-sm text-ink-3">
                {s.paciente || '—'} · {s.hospital || '—'}
              </span>
            </span>
            <span className="col-start-2 row-start-1 justify-self-end sm:col-start-auto sm:row-start-auto">
              <EstadoBadge estado={s.estado} />
            </span>
            <span aria-hidden className="hidden text-ink-3 transition-transform group-hover:translate-x-0.5 sm:block">
              →
            </span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
