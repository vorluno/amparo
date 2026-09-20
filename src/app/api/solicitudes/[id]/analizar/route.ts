import { runPreauth, startAnalysis } from '@/lib/pipeline/run'
import { formatSSE, SSE_HEADERS } from '@/lib/sse'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const MESSAGES = {
  not_found: { status: 404, error: 'Solicitud no encontrada' },
  locked: { status: 409, error: 'Ya hay un análisis en curso para esta solicitud' },
  no_informe: { status: 422, error: 'La solicitud no tiene informe médico asociado' },
} as const

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const start = await startAnalysis(id)
  if (!start.ok) {
    const m = MESSAGES[start.reason]
    return Response.json({ error: m.error }, { status: m.status })
  }

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const write = (s: string) => {
        if (closed) return
        try {
          controller.enqueue(encoder.encode(s))
        } catch {
          closed = true
        }
      }
      const keepAlive = setInterval(() => write(': keep-alive\n\n'), 15_000)
      runPreauth(start.solicitud, (e) => write(formatSSE(e)))
        .catch((e) => write(formatSSE({ event: 'error', data: { message: String(e), step: 'sync' } })))
        .finally(() => {
          clearInterval(keepAlive)
          closed = true
          try {
            controller.close()
          } catch {
            /* ya cerrado por el cliente */
          }
        })
    },
  })
  return new Response(stream, { headers: SSE_HEADERS })
}
