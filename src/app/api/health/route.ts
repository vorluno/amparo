export const dynamic = 'force-dynamic'

export async function GET() {
  return Response.json({ ok: true, version: process.env.npm_package_version ?? '0.0.0' })
}
