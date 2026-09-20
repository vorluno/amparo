import { describe, expect, it } from 'bun:test'
import { parseBlock, readSSE } from '@/lib/sse-client'

describe('parseBlock', () => {
  it('lee event y data', () => expect(parseBlock('event: token\ndata: {"text":"a"}')).toEqual({ event: 'token', data: '{"text":"a"}' }))
  it('ignora comentarios keep-alive', () => expect(parseBlock(': keep-alive')).toBeNull())
})

describe('readSSE', () => {
  it('reensambla mensajes partidos entre chunks', async () => {
    const enc = new TextEncoder()
    const chunks = ['event: step\ndata: {"a":1}\n\nevent: tok', 'en\ndata: {"t":"x"}\n\n: keep-alive\n\n']
    const body = new ReadableStream<Uint8Array>({
      start(c) {
        for (const ch of chunks) c.enqueue(enc.encode(ch))
        c.close()
      },
    })
    const out = []
    for await (const m of readSSE(new Response(body))) out.push(m)
    expect(out).toEqual([
      { event: 'step', data: '{"a":1}' },
      { event: 'token', data: '{"t":"x"}' },
    ])
  })
})
