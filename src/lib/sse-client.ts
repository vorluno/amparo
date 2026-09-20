export type SSEMessage = { event: string; data: string }

export function parseBlock(raw: string): SSEMessage | null {
  let event = 'message'
  const data: string[] = []
  for (const line of raw.split('\n')) {
    if (line.startsWith(':')) continue
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
  }
  return data.length ? { event, data: data.join('\n') } : null
}

/** Parser SSE mínimo sobre fetch (EventSource no permite POST). */
export async function* readSSE(res: Response): AsyncGenerator<SSEMessage> {
  if (!res.body) throw new Error('Respuesta sin cuerpo')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const msg = parseBlock(raw)
      if (msg) yield msg
    }
  }
}
