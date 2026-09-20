import { verifyWebhookSignature } from '@notionhq/client'
import { after } from 'next/server'
import { notionEnv } from '@/lib/notion/client'
import { acquireLock, getSolicitudByPageId } from '@/lib/notion/repo'
import { silentEmit } from '@/lib/pipeline/events'
import { defaultDeps, runPreauth } from '@/lib/pipeline/run'
import { shouldProcess, type NotionWebhookEvent } from '@/lib/webhook'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * Webhook de la integración de Notion: cuando una Solicitud cambia (creada o editada por una
 * persona) y está en `Pendiente`, se analiza sola. Es el "tiempo real" del reto.
 */
export async function POST(req: Request) {
  const body = await req.text()
  let payload: NotionWebhookEvent & { verification_token?: string }
  try {
    payload = JSON.parse(body)
  } catch {
    return Response.json({ error: 'JSON inválido' }, { status: 400 })
  }

  // 1) Handshake inicial: Notion envía el token una sola vez al crear la suscripción.
  if (payload.verification_token) {
    console.log(`[webhook] verification_token recibido — guárdalo como NOTION_WEBHOOK_SECRET: ${payload.verification_token}`)
    return Response.json({ ok: true })
  }

  // 2) Firma HMAC sobre el cuerpo crudo.
  const secret = process.env.NOTION_WEBHOOK_SECRET
  if (!secret) return Response.json({ error: 'Webhook no configurado' }, { status: 503 })
  const trusted = await verifyWebhookSignature({ body, signature: req.headers.get('x-notion-signature'), verificationToken: secret })
  if (!trusted) return Response.json({ error: 'Firma inválida' }, { status: 401 })

  // 3) Filtro barato antes de tocar la API.
  const gate = shouldProcess(payload, { solicitudesDs: notionEnv().solicitudes, solicitudesDb: process.env.NOTION_DB_SOLICITUDES })
  if (!gate.process || !payload.entity) {
    console.log(`[webhook] ignorado: ${gate.reason}`)
    return Response.json({ ok: true, ignored: gate.reason })
  }

  // 4) Responder ya; analizar después de responder (Notion reintenta si no recibe 2xx a tiempo).
  const pageId = payload.entity.id
  after(async () => {
    try {
      const s = await getSolicitudByPageId(pageId)
      if (!s.id.startsWith('PA-')) {
        console.log(`[webhook] ${pageId} no es una solicitud`)
        return
      }
      if (s.estado !== 'Pendiente') {
        console.log(`[webhook] ${s.id} en estado "${s.estado}", no se analiza`)
        return
      }
      if (!s.informePageId) {
        console.log(`[webhook] ${s.id} sin informe`)
        return
      }
      if (!(await acquireLock(s, defaultDeps.config.lockMinutos))) {
        console.log(`[webhook] ${s.id} bloqueada`)
        return
      }
      console.log(`[webhook] analizando ${s.id}`)
      const r = await runPreauth(s, silentEmit)
      console.log(`[webhook] ${s.id} terminado ok=${r.ok}`)
    } catch (e) {
      console.error('[webhook] error', e)
    }
  })
  return Response.json({ ok: true, queued: pageId })
}
