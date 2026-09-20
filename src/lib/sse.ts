import type { PipelineEvent } from '@/lib/pipeline/events'

export function formatSSE(e: PipelineEvent): string {
  return `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`
}

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  Connection: 'keep-alive',
  // nginx (CapRover) no debe bufferizar el stream.
  'X-Accel-Buffering': 'no',
} as const
