import { describe, expect, it } from 'bun:test'
import { loadCases, loadCatalog } from '@/lib/cases/load'

describe('cases', () => {
  it('el catálogo valida y tiene ids únicos', () => {
    const c = loadCatalog()
    expect(c.length).toBeGreaterThanOrEqual(13)
    expect(new Set(c.map((x) => x.id)).size).toBe(c.length)
  })
  it('los casos validan y tienen ids únicos', () => {
    const cs = loadCases()
    expect(cs.length).toBeGreaterThanOrEqual(2)
    expect(new Set(cs.map((x) => x.id)).size).toBe(cs.length)
    expect(new Set(cs.map((x) => x.informe.id)).size).toBe(cs.length)
  })
})
