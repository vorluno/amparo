import { describe, expect, it } from 'bun:test'
import { clausula } from '@/lib/rules/clauses'

describe('clauses', () => {
  it('formatea una cláusula conocida', () => {
    expect(clausula('4.3')).toBe('Cláusula 4.3 — Carencia por preexistencias declaradas')
  })
  it('falla con cláusula desconocida', () => expect(() => clausula('99')).toThrow())
})
