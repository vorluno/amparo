export type NotionWebhookEvent = {
  type: string
  entity?: { id: string; type: string }
  authors?: Array<{ id: string; type: 'person' | 'bot' | 'agent' }>
  data?: { parent?: { id: string; type: string; data_source_id?: string }; updated_properties?: string[] }
}

const TYPES = new Set(['page.created', 'page.properties_updated'])
const norm = (id: string) => id.replace(/-/g, '')

/** Filtro puro, sin red: qué eventos merecen releer la página y (quizá) analizar. */
export function shouldProcess(e: NotionWebhookEvent, ids: { solicitudesDs: string; solicitudesDb?: string }): { process: boolean; reason: string } {
  if (!TYPES.has(e.type)) return { process: false, reason: `tipo ${e.type} ignorado` }
  if (e.entity?.type !== 'page') return { process: false, reason: 'no es una página' }
  if (e.authors?.some((a) => a.type === 'bot')) return { process: false, reason: 'escritura propia (bot)' }
  const parent = e.data?.parent
  if (parent?.data_source_id && norm(parent.data_source_id) !== norm(ids.solicitudesDs)) return { process: false, reason: 'otra base' }
  if (!parent?.data_source_id && parent?.type === 'database' && ids.solicitudesDb && norm(parent.id) !== norm(ids.solicitudesDb)) {
    return { process: false, reason: 'otra base' }
  }
  return { process: true, reason: 'ok' }
}
