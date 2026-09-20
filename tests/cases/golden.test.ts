import { describe, expect, it } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadCases, loadCatalog } from '@/lib/cases/load'
import { DEFAULT_RULES_CONFIG } from '@/lib/rules/config'
import { adjudicate } from '@/lib/rules/engine'
import { ExtractedReportSchema } from '@/lib/rules/types'

const catalog = loadCatalog()
const cases = loadCases()

describe('golden: cada caso con extracción fija produce el veredicto esperado', () => {
  for (const c of cases) {
    const file = join(process.cwd(), 'tests', 'cases', `${c.id}.extraction.json`)
    const run = existsSync(file) ? it : it.skip
    run(`${c.id} → ${c.esperado}`, () => {
      const extraction = ExtractedReportSchema.parse(JSON.parse(readFileSync(file, 'utf8')))
      const procedure = extraction.catalogoId ? (catalog.find((p) => p.id === extraction.catalogoId) ?? null) : null
      if (extraction.catalogoId && !procedure) throw new Error(`${c.id}: catalogoId ${extraction.catalogoId} no existe en el catálogo`)
      const a = adjudicate({ extraction, report: c.informe, policy: c.poliza, procedure, config: DEFAULT_RULES_CONFIG })
      expect(a.estado).toBe(c.esperado)
    })
  }
})
