import type { Solicitud } from '@/lib/notion/mappers'
import * as notionRepo from '@/lib/notion/repo'
import { DEFAULT_RULES_CONFIG } from '@/lib/rules/config'
import { adjudicate } from '@/lib/rules/engine'
import type { Adjudication, CatalogEntry, ExtractedReport, RulesConfig } from '@/lib/rules/types'
import { STEP_TITLES, type Emit, type StepId } from './events'
import { extractReport, type ExtractInput } from './extract'
import { streamLetter, type LetterInput } from './letter'
import { policyEvidence } from './policy'
import { buildVerdictBlocks } from './sync'

export const AGENT_VERSION = 'amparo@1.0.0'

export type PipelineDeps = {
  repo: Pick<typeof notionRepo, 'getSolicitud' | 'acquireLock' | 'getInforme' | 'getCatalogo' | 'findPolizaByCedula' | 'saveVerdict' | 'saveError' | 'appendBlocks'>
  extract: (input: ExtractInput) => Promise<{ extraction: ExtractedReport; modelId: string; attempts: number }>
  letter: (input: LetterInput, onToken: (t: string) => void) => Promise<string>
  config: RulesConfig
}
export const defaultDeps: PipelineDeps = { repo: notionRepo, extract: extractReport, letter: streamLetter, config: DEFAULT_RULES_CONFIG }

export type StartResult = { ok: true; solicitud: Solicitud } | { ok: false; reason: 'not_found' | 'locked' | 'no_informe' }

/** Localiza la solicitud y toma el lock. Quien llama decide qué responder si falla. */
export async function startAnalysis(id: string, deps: PipelineDeps = defaultDeps): Promise<StartResult> {
  const s = await deps.repo.getSolicitud(id)
  if (!s) return { ok: false, reason: 'not_found' }
  if (!s.informePageId) return { ok: false, reason: 'no_informe' }
  const locked = await deps.repo.acquireLock(s, deps.config.lockMinutos)
  return locked ? { ok: true, solicitud: s } : { ok: false, reason: 'locked' }
}

/** Ejecuta las 5 etapas sobre una solicitud ya bloqueada. Nunca lanza: los errores se emiten y se guardan en Notion. */
export async function runPreauth(s: Solicitud, emit: Emit, deps: PipelineDeps = defaultDeps): Promise<{ ok: boolean }> {
  let step: StepId = 'extract'
  const running = (id: StepId, detail?: string) => {
    step = id
    emit({ event: 'step', data: { step: id, status: 'running', title: STEP_TITLES[id], detail } })
  }
  const done = (id: StepId, detail: string, data?: unknown) => emit({ event: 'step', data: { step: id, status: 'done', title: STEP_TITLES[id], detail, data } })

  try {
    running('extract', 'Leyendo el informe clínico…')
    const [{ meta, prosa }, catalog] = await Promise.all([deps.repo.getInforme(s.informePageId!), deps.repo.getCatalogo()])
    const { extraction, modelId, attempts } = await deps.extract({ prosa, meta, catalog })
    const procedure: CatalogEntry | null = extraction.catalogoId ? (catalog.find((c) => c.id === extraction.catalogoId) ?? null) : null
    done(
      'extract',
      procedure
        ? `${procedure.procedimiento} (CPT ${procedure.cpt}) · confianza ${extraction.confianza.toFixed(2)}`
        : `Sin procedimiento identificable · confianza ${extraction.confianza.toFixed(2)}`,
      { extraction, modelId, attempts, procedure },
    )

    running('policy', `Buscando póliza por cédula ${meta.cedula}…`)
    const policy = await deps.repo.findPolizaByCedula(meta.cedula)
    const evidence = policyEvidence(policy, procedure, meta)
    done('policy', evidence.resumen, evidence)

    running('adjudicate', 'Aplicando las reglas de cobertura…')
    const adjudication: Adjudication = adjudicate({ extraction, report: meta, policy, procedure, config: deps.config })
    done('adjudicate', adjudication.veredicto, {
      estado: adjudication.estado,
      reglas: adjudication.reglas,
      clausulas: adjudication.clausulas,
      advertencias: adjudication.advertencias,
    })

    running('letter', 'Redactando la respuesta al hospital…')
    const carta = await deps.letter({ adjudication, extraction, report: meta, policy, procedure }, (text) => emit({ event: 'token', data: { text } }))
    done('letter', `${carta.split(/\s+/).length} palabras`)

    running('sync', 'Escribiendo el veredicto en Notion…')
    const analizadoEl = new Date().toISOString()
    await deps.repo.saveVerdict(s.pageId, adjudication, { extraction, procedure, policyPageId: policy?.notionPageId ?? null, version: AGENT_VERSION })
    await deps.repo.appendBlocks(s.pageId, buildVerdictBlocks(adjudication, carta, extraction, { version: AGENT_VERSION, modelId, analizadoEl }))
    done('sync', 'Solicitud actualizada')

    const { reglas: _reglas, ...verdict } = adjudication
    void _reglas
    emit({ event: 'verdict', data: verdict })
    emit({ event: 'done', data: { notionUrl: s.url } })
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`[pipeline] ${s.id} falló en ${step}:`, message)
    try {
      await deps.repo.saveError(s.pageId, `Error en ${STEP_TITLES[step]}: ${message}`)
    } catch (e2) {
      console.error('[pipeline] no se pudo guardar el error en Notion', e2)
    }
    emit({ event: 'step', data: { step, status: 'error', title: STEP_TITLES[step], detail: message } })
    emit({ event: 'error', data: { message, step } })
    return { ok: false }
  }
}
