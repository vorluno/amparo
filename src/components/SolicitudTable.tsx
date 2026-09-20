import Link from 'next/link'
import type { Solicitud } from '@/lib/notion/mappers'
import { EstadoBadge } from './EstadoBadge'

/**
 * Sitio: pantalla principal, debajo del título.
 * 1. Manda: la lista misma; cada fila es una solicitud y su escenario.
 * 2. Choca con: nada arriba (título) ni abajo (pie). A 400 px la tabla se desplaza dentro de su
 *    contenedor (overflow-x-auto), la página no.
 * 3. Se mueve: nada.
 * 4. Vacío: mensaje con el comando de seed. Error: lo maneja la página. Corriendo: "En análisis" en verde.
 * 5. Quien ya miraba: la fila conserva su posición (orden por ID); solo cambia el estado y el verbo.
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
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-ink-3">
          <tr className="border-b border-line">
            <th className="py-3 pr-4 font-medium">ID</th>
            <th className="py-3 pr-4 font-medium">Escenario</th>
            <th className="py-3 pr-4 font-medium">Paciente</th>
            <th className="py-3 pr-4 font-medium">Hospital</th>
            <th className="py-3 pr-4 font-medium">Estado</th>
            <th className="py-3 text-right font-medium">Acción</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const accion = s.estado === 'Pendiente' || s.estado === 'Error' ? 'Analizar' : s.estado === 'En análisis' ? 'Ver progreso' : 'Ver resultado'
            return (
              <tr key={s.id} className="border-b border-line hover:bg-surface">
                <td className="py-3 pr-4 font-mono text-xs text-ink-2 whitespace-nowrap">{s.id}</td>
                <td className="py-3 pr-4 min-w-64">
                  <Link href={`/solicitudes/${s.id}`} className="font-medium hover:underline underline-offset-4">
                    {s.escenario || s.id}
                  </Link>
                </td>
                <td className="py-3 pr-4 whitespace-nowrap">{s.paciente || '—'}</td>
                <td className="py-3 pr-4 text-ink-2 whitespace-nowrap">{s.hospital || '—'}</td>
                <td className="py-3 pr-4">
                  <EstadoBadge estado={s.estado} />
                </td>
                <td className="py-3 text-right whitespace-nowrap">
                  <Link href={`/solicitudes/${s.id}`} className="font-medium underline-offset-4 hover:underline">
                    {accion} →
                  </Link>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
