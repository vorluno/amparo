export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({ ok: true, version: process.env.APP_VERSION ?? '0.0.0' })
}
