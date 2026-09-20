import { describe, expect, it } from 'bun:test'
import { addDays, daysBetween, formatDate, formatMoney } from '@/lib/format'

describe('format', () => {
  it('daysBetween cuenta días completos', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30)
    expect(daysBetween('2026-01-31', '2026-01-01')).toBe(-30)
  })
  it('addDays suma días', () => {
    expect(addDays('2026-01-01', 30)).toBe('2026-01-31')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
  it('formatDate dd/MM/yyyy', () => expect(formatDate('2026-09-18')).toBe('18/09/2026'))
  it('formatMoney USD 1,234.56', () => expect(formatMoney(1234.5)).toBe('USD 1,234.50'))
})
