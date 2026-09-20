import type { Adjudication } from '@/lib/rules/types'

export type StepId = 'extract' | 'policy' | 'adjudicate' | 'letter' | 'sync'
export const STEP_ORDER: StepId[] = ['extract', 'policy', 'adjudicate', 'letter', 'sync']
export const STEP_TITLES: Record<StepId, string> = {
  extract: 'Extractor clínico (IA)',
  policy: 'Auditor de póliza',
  adjudicate: 'Adjudicador',
  letter: 'Carta al hospital',
  sync: 'Registro en Notion',
}

export type PipelineEvent =
  | { event: 'step'; data: { step: StepId; status: 'running' | 'done' | 'error'; title: string; detail?: string; data?: unknown } }
  | { event: 'token'; data: { text: string } }
  | { event: 'verdict'; data: Omit<Adjudication, 'reglas'> }
  | { event: 'error'; data: { message: string; step: StepId } }
  | { event: 'done'; data: { notionUrl: string } }

export type Emit = (e: PipelineEvent) => void

/** Emisor para ejecuciones sin cliente (webhook): solo registra en logs. */
export const silentEmit: Emit = (e) => {
  if (e.event !== 'token') console.log(`[pipeline] ${e.event}`, JSON.stringify(e.data).slice(0, 200))
}
