/**
 * Crea (una vez) la página raíz y las 4 bases de Notion, y puebla catálogo, pólizas,
 * informes y solicitudes desde `cases/`. Idempotente: si `.env.notion` existe, no recrea
 * las bases; hace upsert de filas por clave. Nunca borra nada.
 *
 *   bun run notion:seed
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { loadCases, loadCatalog } from '@/lib/cases/load'
import { notion, throttle } from '@/lib/notion/client'
import { catalogProps, policyProps, prosaToBlocks, reportProps, solicitudSeedProps, wSelect } from '@/lib/notion/mappers'
import { dbSchemas, P } from '@/lib/notion/schema'

const ROOT_TITLE = 'Amparo · Pre-autorización quirúrgica'
const ENV_FILE = '.env.notion'

type Ids = {
  NOTION_ROOT_PAGE_ID: string
  NOTION_DB_POLIZAS: string
  NOTION_DS_POLIZAS: string
  NOTION_DB_CATALOGO: string
  NOTION_DS_CATALOGO: string
  NOTION_DB_INFORMES: string
  NOTION_DS_INFORMES: string
  NOTION_DB_SOLICITUDES: string
  NOTION_DS_SOLICITUDES: string
}

function readIds(): Ids | null {
  if (!existsSync(ENV_FILE)) return null
  const out: Record<string, string> = {}
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) {
    const m = /^([A-Z_]+)=(.+)$/.exec(line.trim())
    if (m) out[m[1]] = m[2]
  }
  return out as unknown as Ids
}

type Props = ReturnType<typeof dbSchemas>['polizas']

async function createDb(parentPageId: string, name: string, properties: Props) {
  const db = await notion().databases.create({
    parent: { type: 'page_id', page_id: parentPageId },
    title: [{ type: 'text', text: { content: name } }],
    initial_data_source: { properties },
  })
  await throttle()
  const ds = 'data_sources' in db ? db.data_sources[0]?.id : undefined
  if (!ds) throw new Error(`La base ${name} se creó sin data source`)
  console.log(`✓ base "${name}" ${db.id} (data source ${ds})`)
  return { dbId: db.id, dsId: ds }
}

async function createStructure(): Promise<Ids> {
  const parent = process.env.NOTION_PARENT_PAGE_ID
  if (!parent) throw new Error('Falta NOTION_PARENT_PAGE_ID (página compartida con la integración)')
  const root = await notion().pages.create({
    parent: { type: 'page_id', page_id: parent },
    properties: { title: { title: [{ type: 'text', text: { content: ROOT_TITLE } }] } },
    children: [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [
            {
              type: 'text',
              text: {
                content:
                  'Datos demo del agente Amparo (HackIAthon Viamatica, Reto 1). Generados por `bun run notion:seed` desde el repositorio github.com/vorluno/amparo. Las cuatro bases de abajo son las que lee y escribe el agente.',
              },
            },
          ],
        },
      },
    ],
  })
  await throttle()
  console.log(`✓ página raíz ${root.id}`)
  const s0 = dbSchemas({})
  const polizas = await createDb(root.id, 'Pólizas', s0.polizas)
  const catalogo = await createDb(root.id, 'Catálogo de procedimientos', s0.catalogo)
  const informes = await createDb(root.id, 'Informes médicos', s0.informes)
  const s1 = dbSchemas({ polizas: polizas.dsId, informes: informes.dsId })
  const solicitudes = await createDb(root.id, 'Solicitudes de pre-autorización', s1.solicitudes())
  const ids: Ids = {
    NOTION_ROOT_PAGE_ID: root.id,
    NOTION_DB_POLIZAS: polizas.dbId,
    NOTION_DS_POLIZAS: polizas.dsId,
    NOTION_DB_CATALOGO: catalogo.dbId,
    NOTION_DS_CATALOGO: catalogo.dsId,
    NOTION_DB_INFORMES: informes.dbId,
    NOTION_DS_INFORMES: informes.dsId,
    NOTION_DB_SOLICITUDES: solicitudes.dbId,
    NOTION_DS_SOLICITUDES: solicitudes.dsId,
  }
  writeFileSync(ENV_FILE, Object.entries(ids).map(([k, v]) => `${k}=${v}`).join('\n') + '\n')
  console.log(`✓ ids escritos en ${ENV_FILE} — copia las líneas NOTION_* a .env y a CapRover`)
  return ids
}

type Key = { property: string; kind: 'title' | 'rich_text'; value: string }

async function findByKey(dsId: string, key: Key): Promise<string | null> {
  const res = await notion().dataSources.query({
    data_source_id: dsId,
    filter: key.kind === 'title' ? { property: key.property, title: { equals: key.value } } : { property: key.property, rich_text: { equals: key.value } },
    page_size: 1,
  })
  await throttle()
  return res.results[0]?.id ?? null
}

async function upsert(dsId: string, key: Key, properties: Record<string, unknown>, onCreate?: { extra?: Record<string, unknown>; children?: ReturnType<typeof prosaToBlocks> }): Promise<string> {
  const existing = await findByKey(dsId, key)
  if (existing) {
    await notion().pages.update({ page_id: existing, properties: properties as never })
    await throttle()
    console.log(`  ~ actualizado ${key.value}`)
    return existing
  }
  const page = await notion().pages.create({
    parent: { type: 'data_source_id', data_source_id: dsId },
    properties: { ...properties, ...(onCreate?.extra ?? {}) } as never,
    ...(onCreate?.children ? { children: onCreate.children } : {}),
  })
  await throttle()
  console.log(`  + creado ${key.value}`)
  return page.id
}

async function main() {
  const ids = readIds() ?? (await createStructure())
  console.log('— Catálogo')
  for (const c of loadCatalog()) {
    await upsert(ids.NOTION_DS_CATALOGO, { property: P.catalogo.id, kind: 'rich_text', value: c.id }, catalogProps(c))
  }
  console.log('— Casos')
  for (const cs of loadCases()) {
    if (cs.poliza) {
      await upsert(ids.NOTION_DS_POLIZAS, { property: P.polizas.numero, kind: 'title', value: cs.poliza.numero }, policyProps(cs.poliza))
    }
    // Al actualizar un informe existente no se reescribe el cuerpo (nunca borramos bloques).
    const informeId = await upsert(ids.NOTION_DS_INFORMES, { property: P.informes.id, kind: 'rich_text', value: cs.informe.id }, reportProps(cs.informe), {
      children: prosaToBlocks(cs.prosa),
    })
    // Al actualizar una solicitud existente no se toca `Estado` (eso lo hace notion:reset).
    await upsert(
      ids.NOTION_DS_SOLICITUDES,
      { property: P.solicitudes.id, kind: 'title', value: cs.id },
      solicitudSeedProps({ id: cs.id, escenario: cs.titulo, esperado: cs.esperado, informePageId: informeId, paciente: cs.informe.paciente, hospital: cs.informe.hospital }),
      { extra: { [P.solicitudes.estado]: wSelect('Pendiente') } },
    )
  }
  console.log('✓ seed completo')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
