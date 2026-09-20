import { describe, expect, it } from 'bun:test'
import { MockLanguageModelV3 } from 'ai/test'
import { buildExtractPrompt, extractReport } from '@/lib/pipeline/extract'
import { apendicectomia, reportBase } from '../rules/fixtures'

const good = {
  catalogoId: 'apendicectomia-laparoscopica',
  procedimientoTexto: 'apendicectomía',
  diagnostico: 'Apendicitis',
  cie10Sugerido: 'K35.80',
  especialidad: 'Cirugía general',
  tipoAtencionInferido: 'Emergencia',
  justificacionClinica: 'Dolor en FID.',
  documentosMencionados: ['Imagenología'],
  esEstetico: false,
  confianza: 0.9,
  ambiguedades: [],
}

/** Modelo falso que devuelve, en orden, cada JSON de la lista (el último se repite). */
const mock = (jsons: string[]) => {
  let i = 0
  return () =>
    new MockLanguageModelV3({
      doGenerate: async () => ({
        content: [{ type: 'text', text: jsons[Math.min(i++, jsons.length - 1)] }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: { total: 1, noCache: 1, cacheRead: 0, cacheWrite: 0 },
          outputTokens: { total: 1, text: 1, reasoning: 0 },
        },
        warnings: [],
      }),
    })
}
const ids = () => ({ primary: 'p', fallback: 'f' })

describe('extractReport', () => {
  const input = { prosa: 'Informe…', meta: reportBase, catalog: [apendicectomia] }
  it('el prompt incluye el catálogo y el informe', () => {
    const p = buildExtractPrompt(input)
    expect(p).toContain('apendicectomia-laparoscopica | Apendicectomía laparoscópica | CPT 44970')
    expect(p).toContain('Informe…')
  })
  it('devuelve la extracción válida al primer intento', async () => {
    const r = await extractReport(input, { primary: mock([JSON.stringify(good)]), fallback: mock([]), ids })
    expect(r.extraction.catalogoId).toBe('apendicectomia-laparoscopica')
    expect(r.attempts).toBe(1)
    expect(r.modelId).toBe('p')
  })
  it('reintenta si la primera salida rompe el esquema', async () => {
    const r = await extractReport(input, { primary: mock(['{"confianza": "alta"}', JSON.stringify(good)]), fallback: mock([]), ids })
    expect(r.attempts).toBe(2)
  })
  it('cae al fallback si el principal falla dos veces', async () => {
    const r = await extractReport(input, { primary: mock(['no es json']), fallback: mock([JSON.stringify(good)]), ids })
    expect(r.attempts).toBe(3)
    expect(r.modelId).toBe('f')
  })
  it('anula catalogoId si no existe en el catálogo', async () => {
    const r = await extractReport(input, { primary: mock([JSON.stringify({ ...good, catalogoId: 'inventado' })]), fallback: mock([]), ids })
    expect(r.extraction.catalogoId).toBeNull()
  })
})
