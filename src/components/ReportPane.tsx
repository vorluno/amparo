import { formatDate, formatMoney } from '@/lib/format'
import type { ReportMeta } from '@/lib/rules/types'

/**
 * Sitio: columna izquierda del detalle.
 * 1. Manda: en esta columna, la prosa del informe (es lo que el jurado compara con el veredicto).
 * 2. Choca con: la consola de la derecha; a <1024 px se apila arriba y no compite.
 * 3. Se mueve: nada; la ficha de datos va arriba de la prosa, en dos columnas que colapsan a una en 400 px.
 * 4. Cargando: render en servidor. Fallando: la página muestra un aviso si no hay informe.
 * 5. Quien ya miraba: es estático; nunca cambia durante el análisis.
 */
function Bold({ text }: { text: string }) {
  return (
    <>
      {text.split('**').map((seg, i) =>
        i % 2 ? (
          <strong key={i} className="font-semibold text-ink">
            {seg}
          </strong>
        ) : (
          <span key={i}>{seg}</span>
        ),
      )}
    </>
  )
}

export function ReportPane({ meta, prosa }: { meta: ReportMeta; prosa: string }) {
  const filas: Array<[string, string]> = [
    ['Paciente', `${meta.paciente} · C.I. ${meta.cedula}`],
    ['Hospital', meta.hospital],
    ['Médico', meta.medico],
    ['Fecha', formatDate(meta.fecha)],
    ['Atención', meta.tipoAtencion],
    ['Presupuesto', formatMoney(meta.presupuesto)],
    ['Adjuntos', meta.adjuntos.length ? meta.adjuntos.join(', ') : 'Ninguno'],
  ]
  return (
    <section aria-labelledby="informe-titulo">
      <div className="flex items-baseline justify-between border-b border-line pb-2">
        <h2 id="informe-titulo" className="text-sm font-semibold">
          Informe médico <span className="ml-1 font-mono text-xs font-normal text-ink-3">{meta.id}</span>
        </h2>
        <span className="text-xs text-ink-3">Hospital</span>
      </div>
      <dl className="grid grid-cols-[minmax(0,auto)_minmax(0,1fr)] gap-x-4 gap-y-1 border-b border-line py-3 text-sm">
        {filas.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-ink-3">{k}</dt>
            <dd className="min-w-0 break-words">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="space-y-3 py-4 text-sm leading-relaxed text-ink-2">
        {prosa.split(/\n\s*\n/).map((p, i) => (
          <p key={i}>
            <Bold text={p} />
          </p>
        ))}
      </div>
    </section>
  )
}
