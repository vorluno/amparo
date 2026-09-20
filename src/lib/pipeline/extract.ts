import { generateObject, type LanguageModel } from 'ai'
import { fallbackModel, modelIds, primaryModel } from '@/lib/llm/openrouter'
import { DOCUMENTOS, ExtractedReportSchema, type CatalogEntry, type ExtractedReport, type ReportMeta } from '@/lib/rules/types'

export type ExtractInput = { prosa: string; meta: ReportMeta; catalog: CatalogEntry[] }
export type ExtractDeps = {
  primary: () => LanguageModel
  fallback: () => LanguageModel
  ids: () => { primary: string; fallback: string }
}
const defaultDeps: ExtractDeps = { primary: primaryModel, fallback: fallbackModel, ids: modelIds }

export const EXTRACT_SYSTEM = `Eres un auditor médico de una aseguradora. Tu única tarea es ESTRUCTURAR un informe clínico: identificar el procedimiento que el informe propone realizar y elegirlo del catálogo. NO decides cobertura ni carencias; eso lo hace otro sistema con reglas.

Reglas:
- "catalogoId" debe ser exactamente uno de los IDs del catálogo, el que corresponde al procedimiento que el informe PROPONE realizar (no a estudios ya realizados ni a antecedentes). Si el informe no propone un procedimiento concreto, o ninguno del catálogo corresponde, usa null y una confianza menor a 0.5.
- "esEstetico" es true solo si la finalidad es estética; una cirugía funcional o reconstructiva (por ejemplo, una septoplastia por obstrucción nasal) NO es estética.
- "tipoAtencionInferido" se deduce de la narrativa clínica, no del encabezado. Definiciones: "Emergencia" = ingreso por el servicio de emergencia o cirugía no diferible que debe realizarse en horas (riesgo vital o de complicación inminente); "Urgencia" = atención pronta pero diferible en días; "Electiva" = cirugía programada en consulta externa. Que el informe diga "de urgencia" no impide que sea Emergencia si la cirugía es en horas.
- "documentosMencionados" solo admite valores de esta lista: ${DOCUMENTOS.join(' | ')}. Incluye un documento si el informe dice que se adjunta, que se realizó o que se entregará.
- "justificacionClinica": 1 a 3 frases que citen hallazgos concretos del informe.
- "confianza": entre 0 y 1; alta solo si el procedimiento está nombrado sin ambigüedad.
- Escribe en español neutro (sin voseo). Devuelve únicamente el objeto JSON.`

export function buildExtractPrompt({ prosa, meta, catalog }: ExtractInput): string {
  const lista = catalog.map((c) => `- ${c.id} | ${c.procedimiento} | CPT ${c.cpt} | ${c.categoria}`).join('\n')
  return [
    `CATÁLOGO DE PROCEDIMIENTOS (id | nombre | CPT | categoría):\n${lista}`,
    `DATOS DEL ENCABEZADO (declarados por el hospital): tipo de atención "${meta.tipoAtencion}", hospital ${meta.hospital}, fecha ${meta.fecha}.`,
    `INFORME CLÍNICO:\n"""\n${prosa}\n"""`,
  ].join('\n\n')
}

export async function extractReport(
  input: ExtractInput,
  deps: ExtractDeps = defaultDeps,
): Promise<{ extraction: ExtractedReport; modelId: string; attempts: number }> {
  const prompt = buildExtractPrompt(input)
  const ids = deps.ids()
  const attempts: Array<{ model: () => LanguageModel; id: string; retry?: boolean }> = [
    { model: deps.primary, id: ids.primary },
    { model: deps.primary, id: ids.primary, retry: true },
    { model: deps.fallback, id: ids.fallback },
  ]
  let lastError: unknown
  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i]
    try {
      const hint =
        a.retry && lastError
          ? `\n\nTu respuesta anterior no cumplió el esquema: ${String((lastError as Error).message).slice(0, 500)}. Responde de nuevo respetando exactamente el esquema.`
          : ''
      const { object } = await generateObject({
        model: a.model(),
        schema: ExtractedReportSchema,
        system: EXTRACT_SYSTEM,
        prompt: prompt + hint,
        temperature: 0,
        maxOutputTokens: 1024,
        abortSignal: AbortSignal.timeout(30_000),
      })
      // El puente determinista: solo se acepta un ID que exista en el catálogo.
      const catalogoId = object.catalogoId && input.catalog.some((c) => c.id === object.catalogoId) ? object.catalogoId : null
      return { extraction: { ...object, catalogoId }, modelId: a.id, attempts: i + 1 }
    } catch (e) {
      lastError = e
      console.warn(`[extract] intento ${i + 1} (${a.id}) falló:`, (e as Error).message)
    }
  }
  throw new Error(`El extractor clínico falló tras ${attempts.length} intentos: ${(lastError as Error).message}`)
}
