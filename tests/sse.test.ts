import { describe, expect, it } from 'bun:test'
import { formatSSE } from '@/lib/sse'

describe('formatSSE', () => {
  it('serializa evento y data en dos líneas y línea en blanco', () => {
    expect(formatSSE({ event: 'token', data: { text: 'hola\nmundo' } })).toBe('event: token\ndata: {"text":"hola\\nmundo"}\n\n')
  })
})
