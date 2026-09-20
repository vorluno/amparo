import { describe, expect, it } from 'bun:test'
import type { Solicitud } from '@/lib/notion/mappers'
import type { PipelineEvent } from '@/lib/pipeline/events'
import { runPreauth, startAnalysis, type PipelineDeps } from '@/lib/pipeline/run'
import { DEFAULT_RULES_CONFIG } from '@/lib/rules/config'
import { apendicectomia, extractionBase, policyBase, reportBase } from '../rules/fixtures'

const solicitud: Solicitud = {
  id: 'PA-0001',
  pageId: 'page-1',
  url: 'https://notion.so/page-1',
  estado: 'Pendiente',
  escenario: '',
  esperado: 'Preaprobada',
  paciente: '',
  hospital: '',
  informePageId: 'inf-1',
  polizaPageId: null,
  procedimientoDetectado: '',
  cptDetectado: '',
  veredicto: '',
  motivo: '',
  clausulas: '',
  documentosFaltantes: [],
  elegibleDesde: null,
  topeAprobado: null,
  confianza: null,
  analizadoEl: null,
  version: '',
}

function deps(over: Partial<PipelineDeps['repo']> = {}, extractFails = false): PipelineDeps & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    repo: {
      getSolicitud: async (id) => (id === 'PA-0001' ? solicitud : null),
      acquireLock: async () => {
        calls.push('lock')
        return true
      },
      getInforme: async () => ({ meta: reportBase, prosa: 'Informe…' }),
      getCatalogo: async () => [apendicectomia],
      findPolizaByCedula: async () => policyBase,
      saveVerdict: async () => {
        calls.push('saveVerdict')
      },
      saveError: async () => {
        calls.push('saveError')
      },
      appendBlocks: async () => {
        calls.push('appendBlocks')
      },
      ...over,
    },
    extract: async () => {
      if (extractFails) throw new Error('modelo caído')
      return { extraction: extractionBase, modelId: 'mock', attempts: 1 }
    },
    letter: async (_x, onToken) => {
      onToken('Estado: Preaprobada')
      return 'Estado: Preaprobada\n\nCarta.'
    },
    config: DEFAULT_RULES_CONFIG,
  }
}

describe('runPreauth', () => {
  it('emite las 5 etapas, el veredicto y done; escribe en Notion', async () => {
    const d = deps()
    const events: PipelineEvent[] = []
    const r = await runPreauth(solicitud, (e) => events.push(e), d)
    expect(r.ok).toBe(true)
    const doneSteps = events.filter((e) => e.event === 'step' && e.data.status === 'done').map((e) => (e as { data: { step: string } }).data.step)
    expect(doneSteps).toEqual(['extract', 'policy', 'adjudicate', 'letter', 'sync'])
    expect(events.some((e) => e.event === 'token')).toBe(true)
    expect((events.find((e) => e.event === 'verdict') as { data: { estado: string } }).data.estado).toBe('Preaprobada')
    expect(events.at(-1)?.event).toBe('done')
    expect(d.calls).toEqual(['saveVerdict', 'appendBlocks'])
  })
  it('ante un fallo guarda Error en Notion y emite error sin lanzar', async () => {
    const d = deps({}, true)
    const events: PipelineEvent[] = []
    const r = await runPreauth(solicitud, (e) => events.push(e), d)
    expect(r.ok).toBe(false)
    expect(d.calls).toEqual(['saveError'])
    expect(events.at(-1)?.event).toBe('error')
  })
})

describe('startAnalysis', () => {
  it('not_found si no existe', async () => expect(await startAnalysis('PA-9999', deps())).toEqual({ ok: false, reason: 'not_found' }))
  it('locked si el lock falla', async () =>
    expect(await startAnalysis('PA-0001', deps({ acquireLock: async () => false }))).toEqual({ ok: false, reason: 'locked' }))
  it('ok con la solicitud bloqueada', async () => expect((await startAnalysis('PA-0001', deps())).ok).toBe(true))
})
