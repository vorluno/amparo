import { streamText, type LanguageModel } from 'ai'
import { formatDate, formatMoney } from '@/lib/format'
import { primaryModel } from '@/lib/llm/openrouter'
import type { Adjudication, CatalogEntry, ExtractedReport, Policy, ReportMeta } from '@/lib/rules/types'

export type LetterInput = {
  adjudication: Adjudication
  extraction: ExtractedReport
  report: ReportMeta
  policy: Policy | null
  procedure: CatalogEntry | null
}

export const LETTER_SYSTEM = `Redactas, en nombre de la aseguradora, la respuesta formal al hospital sobre una solicitud de pre-autorización quirúrgica. El veredicto YA ESTÁ TOMADO por el sistema de reglas: no lo cambies, no lo matices, no agregues condiciones que no estén en los datos.

Formato: máximo 220 palabras, español neutro (sin voseo), tono profesional y claro. La primera línea es exactamente "Estado: <estado>". Luego un párrafo con el veredicto y su motivo citando las cláusulas; si faltan documentos, una lista con viñetas; si hay fecha de elegibilidad o tope aprobado, indícalos con claridad. Cierra con "Departamento de Pre-autorizaciones — Amparo". No inventes números de trámite ni datos que no recibas.`

export function buildLetterPrompt(x: LetterInput): string {
  const a = x.adjudication
  const lines = [
    `Estado: ${a.estado}`,
    `Veredicto: ${a.veredicto}`,
    `Motivo: ${a.motivo}`,
    `Cláusulas: ${a.clausulas.length ? a.clausulas.join(', ') : 'ninguna'}`,
    `Paciente: ${x.report.paciente} (cédula ${x.report.cedula}) — Hospital: ${x.report.hospital} — Médico: ${x.report.medico} — Fecha del informe: ${formatDate(x.report.fecha)}`,
    `Procedimiento: ${x.procedure ? `${x.procedure.procedimiento} (CPT ${x.procedure.cpt})` : x.extraction.procedimientoTexto} — Diagnóstico: ${x.extraction.diagnostico}`,
    x.policy
      ? `Póliza: ${x.policy.numero}, plan ${x.policy.plan}, vigencia ${formatDate(x.policy.inicioVigencia)} a ${formatDate(x.policy.finVigencia)}`
      : 'Póliza: no encontrada',
    a.documentosFaltantes.length ? `Documentos faltantes: ${a.documentosFaltantes.join(', ')}` : '',
    a.elegibleDesde ? `Elegible desde: ${formatDate(a.elegibleDesde)}` : '',
    a.topeAprobado !== undefined ? `Tope aprobado: ${formatMoney(a.topeAprobado)}` : '',
  ]
  return lines.filter(Boolean).join('\n')
}

/** Garantía determinista: la carta empieza con el estado literal aunque el modelo lo omita o lo cambie. */
export function ensureEstadoHeader(text: string, estado: Adjudication['estado']): string {
  const t = text.trim()
  if (t.startsWith(`Estado: ${estado}`)) return t
  return `Estado: ${estado}\n\n${t.replace(/^Estado:.*\n+/i, '')}`
}

export async function streamLetter(
  x: LetterInput,
  onToken: (t: string) => void,
  deps: { model: () => LanguageModel } = { model: primaryModel },
): Promise<string> {
  const { textStream } = streamText({
    model: deps.model(),
    system: LETTER_SYSTEM,
    prompt: buildLetterPrompt(x),
    temperature: 0.3,
    maxOutputTokens: 600,
    abortSignal: AbortSignal.timeout(45_000),
  })
  let full = ''
  for await (const chunk of textStream) {
    full += chunk
    onToken(chunk)
  }
  return ensureEstadoHeader(full, x.adjudication.estado)
}
