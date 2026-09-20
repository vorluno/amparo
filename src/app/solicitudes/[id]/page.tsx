import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AnalysisPanel } from '@/components/AnalysisPanel'
import { EstadoBadge } from '@/components/EstadoBadge'
import { ReportPane } from '@/components/ReportPane'
import { getInforme, getSolicitud } from '@/lib/notion/repo'
import { notionPageUrl } from '@/lib/notion/urls'

export const dynamic = 'force-dynamic'

/**
 * Sitio: detalle de una solicitud.
 * 1. Manda: la consola (derecha): botón, veredicto y pasos. El informe (izquierda) es el material.
 * 2. Choca con: nada; dos columnas 5/7 con minmax(0) para que a 400 px no haya desborde.
 * 3. Se mueve: en móvil la consola va arriba (la acción y el veredicto primero) y el informe debajo.
 * 4. Cargando: render en servidor. Fallando: 404 si no existe; aviso si no hay informe enlazado.
 * 5. Quien ya miraba: título = escenario; estado y esperado siempre visibles arriba.
 */
export default async function SolicitudPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await getSolicitud(id)
  if (!s) notFound()
  const informe = s.informePageId ? await getInforme(s.informePageId) : null
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <Link href="/" className="text-ink-3 hover:text-ink">
          ← Solicitudes
        </Link>
        <span className="font-mono text-xs text-ink-3">{s.id}</span>
        <EstadoBadge estado={s.estado} />
      </div>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{s.escenario || s.id}</h1>
        {s.esperado && <p className="mt-1 text-sm text-ink-3">Caso de demostración · veredicto esperado: {s.esperado}</p>}
      </div>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div className="min-w-0 order-2 lg:order-1">
          {informe ? (
            <ReportPane meta={informe.meta} prosa={informe.prosa} />
          ) : (
            <div className="border-l-2 border-warn bg-warn-bg px-4 py-3 text-sm text-warn">Esta solicitud no tiene un informe médico enlazado.</div>
          )}
        </div>
        <div className="min-w-0 order-1 lg:order-2">
          <AnalysisPanel initial={s} notionUrl={notionPageUrl(s.pageId)} />
        </div>
      </div>
    </div>
  )
}
