import { SolicitudTable } from '@/components/SolicitudTable'
import { listSolicitudes } from '@/lib/notion/repo'

export const dynamic = 'force-dynamic'

/**
 * Sitio: pantalla principal.
 * 1. Manda: la lista de solicitudes.
 * 2. Choca con: nada; título y párrafo de una línea arriba.
 * 3. Se mueve: nada.
 * 4. Cargando: render en servidor (no hay estado intermedio visible). Fallando: aviso con reintento,
 *    en palabras del producto. Corriendo: filas "En análisis" en verde.
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Solicitudes de pre-autorización</h1>
        <p className="mt-1 max-w-2xl text-sm text-ink-2">
          Cada solicitud enlaza un informe médico del hospital. El agente busca la póliza por cédula, aplica las reglas de cobertura y escribe
          el veredicto en Notion. Elige una para verlo razonar.
        </p>
      </div>
      {error ? (
        <div className="border-t border-b border-line py-6 text-sm text-no">
          No se pudieron leer las solicitudes de Notion. <a href="/" className="underline underline-offset-4">Reintentar</a>
          <div className="mt-1 text-xs text-ink-3">{error}</div>
        </div>
      ) : (
        <SolicitudTable rows={rows} />
      )}
    </div>
  )
}
