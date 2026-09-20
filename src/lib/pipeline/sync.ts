import type { BlockObjectRequest } from '@notionhq/client'
import { clausula } from '@/lib/rules/clauses'
import type { Adjudication, ExtractedReport } from '@/lib/rules/types'

const text = (content: string, bold = false) => ({ type: 'text' as const, text: { content: content.slice(0, 1900) }, annotations: { bold } })
const paragraph = (content: string, bold = false): BlockObjectRequest => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: [text(content, bold)] } })
const heading = (content: string): BlockObjectRequest => ({ object: 'block', type: 'heading_3', heading_3: { rich_text: [text(content)] } })
const bullet = (content: string): BlockObjectRequest => ({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [text(content)] } })
const divider = (): BlockObjectRequest => ({ object: 'block', type: 'divider', divider: {} })

const icon = (r: Adjudication['reglas'][number]['resultado']) => (r === 'cumple' ? '✅' : r === 'no_cumple' ? '❌' : '⏭️')

/** Bloques que el agente añade a la página de la Solicitud en cada análisis (historial: el pipeline nunca borra). */
export function buildVerdictBlocks(
  a: Adjudication,
  carta: string,
  extraction: ExtractedReport,
  meta: { version: string; modelId: string; analizadoEl: string },
): BlockObjectRequest[] {
  const out: BlockObjectRequest[] = [divider(), paragraph(`— ${meta.version} · ${meta.modelId} · ${meta.analizadoEl} —`, true), heading('Carta al hospital')]
  for (const p of carta.split(/\n\s*\n/)) if (p.trim()) out.push(paragraph(p.trim()))
  out.push(heading('Traza del adjudicador'))
  for (const r of a.reglas) {
    out.push(bullet(`${icon(r.resultado)} ${r.id} · ${r.titulo} — ${r.evidencia}${r.clausula ? ` (${clausula(r.clausula)})` : ''}`))
  }
  if (a.advertencias.length) {
    out.push(heading('Advertencias para el auditor'))
    for (const w of a.advertencias) out.push(bullet(w))
  }
  out.push(
    heading('Extracción clínica'),
    paragraph(
      `Procedimiento en el informe: "${extraction.procedimientoTexto}" · Diagnóstico: ${extraction.diagnostico} · Especialidad: ${extraction.especialidad} · Atención inferida: ${extraction.tipoAtencionInferido} · Confianza: ${extraction.confianza.toFixed(2)}`,
    ),
    paragraph(`Justificación: ${extraction.justificacionClinica}`),
  )
  return out
}
