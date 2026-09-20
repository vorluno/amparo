/**
 * Devuelve la demo a su estado inicial: todas las solicitudes en `Pendiente`, propiedades del
 * agente vacías y cuerpo de cada solicitud limpio. Es el ÚNICO lugar del sistema que borra algo,
 * y solo bloques que escribió el agente en páginas de Solicitudes (el seed nunca escribe cuerpo ahí).
 *
 *   bun run notion:reset            # todas
 *   bun run notion:reset PA-0003    # una sola
 */
import { notion, throttle } from '@/lib/notion/client'
import { wDate, wMulti, wNumber, wRelation, wSelect, wText } from '@/lib/notion/mappers'
import { listSolicitudes } from '@/lib/notion/repo'
import { P } from '@/lib/notion/schema'

const p = P.solicitudes
const CLEAN = {
  [p.estado]: wSelect('Pendiente'),
  [p.poliza]: wRelation([]),
  [p.procedimiento]: wText(''),
  [p.cpt]: wText(''),
  [p.veredicto]: wText(''),
  [p.motivo]: wText(''),
  [p.clausulas]: wText(''),
  [p.faltantes]: wMulti([]),
  [p.elegibleDesde]: wDate(null),
  [p.tope]: wNumber(null),
  [p.confianza]: wNumber(null),
  [p.analizadoEl]: wDate(null),
  [p.version]: wText(''),
}

async function deleteChildren(pageId: string): Promise<number> {
  let n = 0
  let cursor: string | undefined
  do {
    const res = await notion().blocks.children.list({ block_id: pageId, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) })
    for (const b of res.results) {
      await notion().blocks.delete({ block_id: b.id })
      await throttle(200)
      n++
    }
    cursor = res.has_more && res.next_cursor ? res.next_cursor : undefined
  } while (cursor)
  return n
}

async function main() {
  const only = process.argv[2]
  const all = await listSolicitudes()
  const targets = only ? all.filter((s) => s.id === only) : all
  if (only && !targets.length) throw new Error(`No existe la solicitud ${only}`)
  for (const s of targets) {
    await notion().pages.update({ page_id: s.pageId, properties: CLEAN })
    await throttle()
    const n = await deleteChildren(s.pageId)
    console.log(`↺ ${s.id} → Pendiente (${n} bloques del agente eliminados)`)
  }
  console.log('✓ reset completo')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
