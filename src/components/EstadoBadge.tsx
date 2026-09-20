import type { EstadoSolicitud } from '@/lib/rules/types'

/**
 * Sitio: celda de la lista y cabecera del detalle.
 * 1. Manda: el escenario (lista) o el veredicto (detalle); el estado solo acompaña.
 * 2. Choca con: el veredicto grande del detalle, por eso aquí NO hay color: glifo + texto en tinta.
 * 3. Se mueve: nada.
 * 4. "En análisis" es el único estado vivo y lleva el verde (uno por pantalla).
 * 5. Quien ya miraba: el glifo cambia sin saltos de ancho (whitespace-nowrap).
 */
const GLYPH: Record<EstadoSolicitud, { g: string; c: string }> = {
  'Pendiente': { g: '○', c: 'text-ink-3' },
  'En análisis': { g: '◐', c: 'text-ok' },
  'Preaprobada': { g: '●', c: 'text-ink' },
  'Rechazada': { g: '×', c: 'text-ink' },
  'Documentos faltantes': { g: '△', c: 'text-ink' },
  'Error': { g: '!', c: 'text-no' },
}

export function EstadoBadge({ estado }: { estado: EstadoSolicitud }) {
  const { g, c } = GLYPH[estado]
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm whitespace-nowrap ${c}`}>
      <span aria-hidden className={`font-mono ${estado === 'En análisis' ? 'animate-pulse' : ''}`}>
        {g}
      </span>
      {estado}
    </span>
  )
}
