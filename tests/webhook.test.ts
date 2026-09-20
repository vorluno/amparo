import { describe, expect, it } from 'bun:test'
import { shouldProcess } from '@/lib/webhook'

const DS = 'abcd1234abcd1234abcd1234abcd1234'
const DB = 'db00000000000000000000000000000d'
const ids = { solicitudesDs: DS, solicitudesDb: DB }
const base = {
  type: 'page.properties_updated',
  entity: { id: 'p', type: 'page' },
  authors: [{ id: 'u', type: 'person' as const }],
  data: { parent: { id: DB, type: 'database', data_source_id: DS } },
}

describe('shouldProcess', () => {
  it('acepta cambios de persona en Solicitudes', () => expect(shouldProcess(base, ids).process).toBe(true))
  it('acepta page.created', () => expect(shouldProcess({ ...base, type: 'page.created' }, ids).process).toBe(true))
  it('ignora escrituras del bot', () => expect(shouldProcess({ ...base, authors: [{ id: 'b', type: 'bot' }] }, ids).process).toBe(false))
  it('ignora otras bases por data source', () =>
    expect(shouldProcess({ ...base, data: { parent: { id: DB, type: 'database', data_source_id: 'otra' } } }, ids).process).toBe(false))
  it('ignora otras bases por database id cuando no viene el data source', () =>
    expect(shouldProcess({ ...base, data: { parent: { id: 'otra-db', type: 'database' } } }, ids).process).toBe(false))
  it('deja pasar si no puede determinar la base (se relee la página)', () =>
    expect(shouldProcess({ ...base, data: { parent: { id: 'x', type: 'page' } } }, ids).process).toBe(true))
  it('ignora otros tipos', () => expect(shouldProcess({ ...base, type: 'page.deleted' }, ids).process).toBe(false))
})
