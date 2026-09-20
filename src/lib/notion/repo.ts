import { isFullPage, type BlockObjectRequest, type PageObjectResponse } from '@notionhq/client'
import type { Adjudication, CatalogEntry, ExtractedReport, Policy, ReportMeta } from '@/lib/rules/types'
import { notion, notionEnv } from './client'
import { blocksToProsa, toCatalogEntry, toPolicy, toReportMeta, toSolicitud, verdictProps, wDate, wSelect, wText, type Solicitud } from './mappers'
import { P } from './schema'

type Filter = NonNullable<Parameters<ReturnType<typeof notion>['dataSources']['query']>[0]['filter']>
type Sorts = NonNullable<Parameters<ReturnType<typeof notion>['dataSources']['query']>[0]['sorts']>

async function queryAll(data_source_id: string, filter?: Filter, sorts?: Sorts): Promise<PageObjectResponse[]> {
  const out: PageObjectResponse[] = []
  let cursor: string | undefined
  do {
    const res = await notion().dataSources.query({
      data_source_id,
      ...(filter ? { filter } : {}),
      ...(sorts ? { sorts } : {}),
      page_size: 100,
      ...(cursor ? { start_cursor: cursor } : {}),
    })
    for (const r of res.results) if (isFullPage(r)) out.push(r)
    cursor = res.has_more && res.next_cursor ? res.next_cursor : undefined
  } while (cursor)
  return out
}

export async function listSolicitudes(): Promise<Solicitud[]> {
  const pages = await queryAll(notionEnv().solicitudes, undefined, [{ property: P.solicitudes.id, direction: 'ascending' }])
  return pages.map(toSolicitud)
}

/** Por título (`PA-0001`). */
export async function getSolicitud(id: string): Promise<Solicitud | null> {
  const pages = await queryAll(notionEnv().solicitudes, { property: P.solicitudes.id, title: { equals: id } })
  return pages[0] ? toSolicitud(pages[0]) : null
}

export async function getSolicitudByPageId(pageId: string): Promise<Solicitud> {
  const page = await notion().pages.retrieve({ page_id: pageId })
  if (!isFullPage(page)) throw new Error(`La página ${pageId} no es accesible`)
  return toSolicitud(page)
}

export async function getInforme(pageId: string): Promise<{ meta: ReportMeta; prosa: string }> {
  const page = await notion().pages.retrieve({ page_id: pageId })
  if (!isFullPage(page)) throw new Error(`El informe ${pageId} no es accesible`)
  const blocks: Parameters<typeof blocksToProsa>[0] = []
  let cursor: string | undefined
  do {
    const res = await notion().blocks.children.list({ block_id: pageId, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) })
    blocks.push(...res.results)
    cursor = res.has_more && res.next_cursor ? res.next_cursor : undefined
  } while (cursor)
  const prosa = blocksToProsa(blocks)
  if (!prosa) throw new Error(`El informe ${pageId} no tiene texto en el cuerpo de la página`)
  return { meta: toReportMeta(page), prosa }
}

export async function findPolizaByCedula(cedula: string): Promise<Policy | null> {
  const pages = await queryAll(notionEnv().polizas, { property: P.polizas.cedula, rich_text: { equals: cedula } })
  return pages[0] ? toPolicy(pages[0]) : null
}

export async function getCatalogo(): Promise<CatalogEntry[]> {
  const pages = await queryAll(notionEnv().catalogo)
  return pages.map(toCatalogEntry).filter((c) => c.id)
}

/** Pura: ¿hay un análisis en curso más reciente que el límite? */
export function shouldLock(s: Solicitud, lockMinutos: number, now = new Date()): boolean {
  if (s.estado !== 'En análisis' || !s.analizadoEl) return false
  return now.getTime() - new Date(s.analizadoEl).getTime() < lockMinutos * 60_000
}

/** Marca la solicitud como "En análisis". Devuelve false si otro análisis la tiene bloqueada. */
export async function acquireLock(s: Solicitud, lockMinutos: number): Promise<boolean> {
  if (shouldLock(s, lockMinutos)) return false
  await notion().pages.update({
    page_id: s.pageId,
    properties: { [P.solicitudes.estado]: wSelect('En análisis'), [P.solicitudes.analizadoEl]: wDate(new Date().toISOString()) },
  })
  return true
}

export async function saveVerdict(
  pageId: string,
  a: Adjudication,
  extra: { extraction: ExtractedReport; procedure: CatalogEntry | null; policyPageId: string | null; version: string },
): Promise<void> {
  await notion().pages.update({ page_id: pageId, properties: verdictProps(a, extra) })
}

export async function saveError(pageId: string, message: string): Promise<void> {
  await notion().pages.update({
    page_id: pageId,
    properties: {
      [P.solicitudes.estado]: wSelect('Error'),
      [P.solicitudes.motivo]: wText(message),
      [P.solicitudes.analizadoEl]: wDate(new Date().toISOString()),
    },
  })
}

/** Notion acepta máximo 100 bloques por llamada. */
export async function appendBlocks(pageId: string, blocks: BlockObjectRequest[]): Promise<void> {
  for (let i = 0; i < blocks.length; i += 100) {
    await notion().blocks.children.append({ block_id: pageId, children: blocks.slice(i, i + 100) })
  }
}
