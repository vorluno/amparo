import { describe, expect, it } from 'bun:test'
import { blocksToProsa, prosaToBlocks } from '@/lib/notion/mappers'

type ParagraphReq = { paragraph: { rich_text: Array<{ text: { content: string }; annotations: { bold: boolean } }> } }

describe('prosa ⇄ bloques', () => {
  it('convierte negritas y párrafos y vuelve', () => {
    const prosa = '**Paciente:** Juan Pérez, 40 años.\n\n**Plan:** apendicectomía.'
    const blocks = prosaToBlocks(prosa) as unknown as ParagraphReq[]
    expect(blocks).toHaveLength(2)
    expect(blocks[0].paragraph.rich_text[0].annotations.bold).toBe(true)
    expect(blocks[0].paragraph.rich_text[0].text.content).toBe('Paciente:')
    // Simula la respuesta de Notion: cada segmento trae plain_text.
    const responses = blocks.map((b, i) => ({
      object: 'block',
      id: String(i),
      type: 'paragraph',
      paragraph: { rich_text: b.paragraph.rich_text.map((t) => ({ ...t, plain_text: t.text.content })) },
    }))
    expect(blocksToProsa(responses as never)).toBe(prosa) // ida y vuelta conserva las negritas
  })
})
