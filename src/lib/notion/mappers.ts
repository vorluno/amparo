import type { BlockObjectRequest, BlockObjectResponse, PageObjectResponse, PartialBlockObjectResponse } from '@notionhq/client'
import type { Adjudication, CatalogEntry, DocumentoTipo, EstadoSolicitud, ExtractedReport, Policy, ReportMeta } from '@/lib/rules/types'
import { P } from './schema'

type Page = PageObjectResponse
type Prop = Page['properties'][string]

const prop = (page: Page, name: string): Prop | undefined => page.properties[name]
const plain = (rt: Array<{ plain_text: string }> | undefined) => (rt ?? []).map((t) => t.plain_text).join('')

export const readTitle = (page: Page, name: string) => { const p = prop(page, name); return p?.type === 'title' ? plain(p.title) : '' }
export const readText = (page: Page, name: string) => { const p = prop(page, name); return p?.type === 'rich_text' ? plain(p.rich_text) : '' }
export const readSelect = (page: Page, name: string) => { const p = prop(page, name); return p?.type === 'select' ? (p.select?.name ?? '') : '' }
export const readMulti = (page: Page, name: string) => { const p = prop(page, name); return p?.type === 'multi_select' ? p.multi_select.map((o) => o.name) : [] }
export const readNumber = (page: Page, name: string) => { const p = prop(page, name); return p?.type === 'number' ? p.number : null }
export const readDate = (page: Page, name: string) => { const p = prop(page, name); return p?.type === 'date' ? (p.date?.start ?? null) : null }
export const readCheck = (page: Page, name: string) => { const p = prop(page, name); return p?.type === 'checkbox' ? p.checkbox : false }
export const readRelation = (page: Page, name: string) => { const p = prop(page, name); return p?.type === 'relation' ? p.relation.map((r) => r.id) : [] }

/** Notion limita cada segmento de rich_text a 2000 caracteres. */
const clip = (s: string, max = 1900) => (s.length > max ? s.slice(0, max - 1) + '…' : s)
export const wTitle = (s: string) => ({ title: [{ type: 'text' as const, text: { content: clip(s) } }] })
export const wText = (s: string) => ({ rich_text: s ? [{ type: 'text' as const, text: { content: clip(s) } }] : [] })
export const wSelect = (s: string) => ({ select: { name: s } })
export const wMulti = (xs: readonly string[]) => ({ multi_select: xs.map((name) => ({ name })) })
export const wNumber = (n: number | null | undefined) => ({ number: n ?? null })
export const wDate = (iso: string | null | undefined) => ({ date: iso ? { start: iso } : null })
export const wCheck = (b: boolean) => ({ checkbox: b })
export const wRelation = (ids: string[]) => ({ relation: ids.map((id) => ({ id })) })

export function toPolicy(page: Page): Policy {
  const p = P.polizas
  return {
    numero: readTitle(page, p.numero),
    asegurado: readText(page, p.asegurado),
    cedula: readText(page, p.cedula),
    fechaNacimiento: readDate(page, p.fechaNacimiento) ?? '',
    plan: readSelect(page, p.plan) as Policy['plan'],
    estado: readSelect(page, p.estado) as Policy['estado'],
    inicioVigencia: readDate(page, p.inicio) ?? '',
    finVigencia: readDate(page, p.fin) ?? '',
    sumaAsegurada: readNumber(page, p.suma) ?? 0,
    montoConsumido: readNumber(page, p.consumido) ?? 0,
    preexistencias: readMulti(page, p.preexistencias) as Policy['preexistencias'],
    red: readMulti(page, p.red) as Policy['red'],
    notionPageId: page.id,
    notionUrl: page.url,
  }
}

export function toCatalogEntry(page: Page): CatalogEntry {
  const p = P.catalogo
  const maximo = readNumber(page, p.maximo)
  const motivo = readText(page, p.motivoExclusion)
  return {
    id: readText(page, p.id),
    procedimiento: readTitle(page, p.procedimiento),
    cpt: readText(page, p.cpt),
    cie10: readText(page, p.cie10),
    categoria: readSelect(page, p.categoria) as CatalogEntry['categoria'],
    planes: readMulti(page, p.planes) as CatalogEntry['planes'],
    carenciaDias: readNumber(page, p.carencia) ?? 0,
    exentoEnEmergencia: readCheck(page, p.exento),
    excluido: readCheck(page, p.excluido),
    ...(motivo ? { motivoExclusion: motivo } : {}),
    preexistenciaRelacionada: readMulti(page, p.preexistencia) as CatalogEntry['preexistenciaRelacionada'],
    documentosRequeridos: readMulti(page, p.documentos) as DocumentoTipo[],
    ...(maximo !== null ? { montoMaximo: maximo } : {}),
    notionPageId: page.id,
  }
}

export function toReportMeta(page: Page): ReportMeta {
  const p = P.informes
  return {
    id: readText(page, p.id),
    paciente: readText(page, p.paciente),
    cedula: readText(page, p.cedula),
    hospital: readSelect(page, p.hospital) as ReportMeta['hospital'],
    medico: readText(page, p.medico),
    fecha: readDate(page, p.fecha) ?? '',
    tipoAtencion: readSelect(page, p.tipo) as ReportMeta['tipoAtencion'],
    adjuntos: readMulti(page, p.adjuntos) as DocumentoTipo[],
    presupuesto: readNumber(page, p.presupuesto) ?? 0,
    notionPageId: page.id,
    notionUrl: page.url,
  }
}

export type Solicitud = {
  id: string
  pageId: string
  url: string
  estado: EstadoSolicitud
  escenario: string
  esperado: Adjudication['estado'] | null
  paciente: string
  hospital: string
  informePageId: string | null
  polizaPageId: string | null
  procedimientoDetectado: string
  cptDetectado: string
  veredicto: string
  motivo: string
  clausulas: string
  documentosFaltantes: DocumentoTipo[]
  elegibleDesde: string | null
  topeAprobado: number | null
  confianza: number | null
  analizadoEl: string | null
  version: string
}

export function toSolicitud(page: Page): Solicitud {
  const p = P.solicitudes
  return {
    id: readTitle(page, p.id),
    pageId: page.id,
    url: page.url,
    estado: (readSelect(page, p.estado) || 'Pendiente') as EstadoSolicitud,
    escenario: readText(page, p.escenario),
    esperado: (readSelect(page, p.esperado) || null) as Solicitud['esperado'],
    paciente: readText(page, p.paciente),
    hospital: readText(page, p.hospital),
    informePageId: readRelation(page, p.informe)[0] ?? null,
    polizaPageId: readRelation(page, p.poliza)[0] ?? null,
    procedimientoDetectado: readText(page, p.procedimiento),
    cptDetectado: readText(page, p.cpt),
    veredicto: readText(page, p.veredicto),
    motivo: readText(page, p.motivo),
    clausulas: readText(page, p.clausulas),
    documentosFaltantes: readMulti(page, p.faltantes) as DocumentoTipo[],
    elegibleDesde: readDate(page, p.elegibleDesde),
    topeAprobado: readNumber(page, p.tope),
    confianza: readNumber(page, p.confianza),
    analizadoEl: readDate(page, p.analizadoEl),
    version: readText(page, p.version),
  }
}

export function policyProps(x: Policy) {
  const p = P.polizas
  return {
    [p.numero]: wTitle(x.numero),
    [p.asegurado]: wText(x.asegurado),
    [p.cedula]: wText(x.cedula),
    [p.fechaNacimiento]: wDate(x.fechaNacimiento),
    [p.plan]: wSelect(x.plan),
    [p.estado]: wSelect(x.estado),
    [p.inicio]: wDate(x.inicioVigencia),
    [p.fin]: wDate(x.finVigencia),
    [p.suma]: wNumber(x.sumaAsegurada),
    [p.consumido]: wNumber(x.montoConsumido),
    [p.preexistencias]: wMulti(x.preexistencias),
    [p.red]: wMulti(x.red),
  }
}

export function catalogProps(x: CatalogEntry) {
  const p = P.catalogo
  return {
    [p.procedimiento]: wTitle(x.procedimiento),
    [p.id]: wText(x.id),
    [p.cpt]: wText(x.cpt),
    [p.cie10]: wText(x.cie10),
    [p.categoria]: wSelect(x.categoria),
    [p.planes]: wMulti(x.planes),
    [p.carencia]: wNumber(x.carenciaDias),
    [p.exento]: wCheck(x.exentoEnEmergencia),
    [p.excluido]: wCheck(x.excluido),
    [p.motivoExclusion]: wText(x.motivoExclusion ?? ''),
    [p.preexistencia]: wMulti(x.preexistenciaRelacionada),
    [p.documentos]: wMulti(x.documentosRequeridos),
    [p.maximo]: wNumber(x.montoMaximo),
  }
}

export function reportProps(x: ReportMeta) {
  const p = P.informes
  return {
    [p.informe]: wTitle(`${x.id} · ${x.paciente}`),
    [p.id]: wText(x.id),
    [p.paciente]: wText(x.paciente),
    [p.cedula]: wText(x.cedula),
    [p.hospital]: wSelect(x.hospital),
    [p.medico]: wText(x.medico),
    [p.fecha]: wDate(x.fecha),
    [p.tipo]: wSelect(x.tipoAtencion),
    [p.adjuntos]: wMulti(x.adjuntos),
    [p.presupuesto]: wNumber(x.presupuesto),
  }
}

export function solicitudSeedProps(x: {
  id: string
  escenario: string
  esperado: Adjudication['estado']
  informePageId: string
  paciente: string
  hospital: string
}) {
  const p = P.solicitudes
  return {
    [p.id]: wTitle(x.id),
    [p.escenario]: wText(x.escenario),
    [p.esperado]: wSelect(x.esperado),
    [p.paciente]: wText(x.paciente),
    [p.hospital]: wText(x.hospital),
    [p.informe]: wRelation([x.informePageId]),
  }
}

/** Propiedades que escribe el agente al terminar. Reanalizar las sobrescribe todas. */
export function verdictProps(
  a: Adjudication,
  x: { extraction: ExtractedReport; procedure: CatalogEntry | null; policyPageId: string | null; version: string },
) {
  const p = P.solicitudes
  return {
    [p.estado]: wSelect(a.estado),
    [p.poliza]: wRelation(x.policyPageId ? [x.policyPageId] : []),
    [p.procedimiento]: wText(x.procedure?.procedimiento ?? x.extraction.procedimientoTexto),
    [p.cpt]: wText(x.procedure?.cpt ?? ''),
    [p.veredicto]: wText(a.veredicto),
    [p.motivo]: wText(a.motivo),
    [p.clausulas]: wText(a.clausulas.join(', ')),
    [p.faltantes]: wMulti(a.documentosFaltantes),
    [p.elegibleDesde]: wDate(a.elegibleDesde ?? null),
    [p.tope]: wNumber(a.topeAprobado ?? null),
    [p.confianza]: wNumber(Number(x.extraction.confianza.toFixed(2))),
    [p.analizadoEl]: wDate(new Date().toISOString()),
    [p.version]: wText(x.version),
  }
}

/** Markdown mínimo (**negrita**, párrafos separados por línea en blanco) → bloques de párrafo. */
export function prosaToBlocks(prosa: string): BlockObjectRequest[] {
  return prosa.split(/\n\s*\n/).map((para) => {
    const rich = para
      .split('**')
      .map((seg, i) => ({ type: 'text' as const, text: { content: clip(seg.replace(/\n/g, ' ')) }, annotations: { bold: i % 2 === 1 } }))
      .filter((s) => s.text.content.length)
    return { object: 'block' as const, type: 'paragraph' as const, paragraph: { rich_text: rich } }
  })
}

/** Bloques de párrafo → texto plano con párrafos separados por línea en blanco (lo que lee el extractor). */
export function blocksToProsa(blocks: Array<BlockObjectResponse | PartialBlockObjectResponse>): string {
  return blocks
    .map((b) => ('type' in b && b.type === 'paragraph' ? plain(b.paragraph.rich_text) : ''))
    .filter(Boolean)
    .join('\n\n')
}
