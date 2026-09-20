import { getSolicitud } from '@/lib/notion/repo'

export const dynamic = 'force-dynamic'

/** Estado actual de una solicitud (lo usa la consola para seguir un análisis disparado desde Notion). */
export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const s = await getSolicitud(id)
  return s ? Response.json(s) : Response.json({ error: 'Solicitud no encontrada' }, { status: 404 })
}
