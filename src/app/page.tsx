import { SolicitudTable } from '@/components/SolicitudTable'
import { listSolicitudes } from '@/lib/notion/repo'

export const dynamic = 'force-dynamic'

/**
 * Sitio: pantalla principal.
 * 1. Manda: la lista de solicitudes (P01); el título y una línea de contexto, nada más.
 * 2. Choca con: nada. Ancho acotado a 56rem para que las filas no floten (P05).
 * 3. Se mueve: nada.
 * 4. Cargando: render en servidor. Fallando: aviso con reintento en palabras del producto.
 * 5. Quien ya miraba: al volver de un análisis ve el nuevo estado en la misma fila.
 */
export default async function Home() {
  let rows: Awaited<ReturnType<typeof listSolicitudes>> = []
  let error: string | null = null
  try {
    rows = await listSolicitudes()
  } catch (e) {
    error = e instanceof Error ? e.message : String(e)
  }
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Solicitudes de pre-autorización</h1>
        <p className="mt-1 text-sm text-ink-3">
          {rows.length ? `${rows.length} casos de demostración. ` : ''}Elige uno y pulsa Analizar para ver al agente razonar.
        </p>
      </div>
      {error ? (
        <div className="border-t border-b border-line py-6 text-sm text-no">
          No se pudieron leer las solicitudes de Notion.{' '}
          <a href="/" className="underline underline-offset-4">
            Reintentar
          </a>
          <div className="mt-1 text-xs text-ink-3">{error}</div>
        </div>
      ) : (
        <SolicitudTable rows={rows} />
      )}
    </div>
  )
}
