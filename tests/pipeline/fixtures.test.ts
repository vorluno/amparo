import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadCatalog } from '@/lib/cases/load'
import { ExtractedReportSchema } from '@/lib/rules/types'

/**
 * Salidas reales del modelo (grabadas con scripts de prueba) validadas contra el esquema:
 * si el modelo o el esquema cambian, este test lo detecta sin llamar a la red.
 */
const dir = join(process.cwd(), 'tests', 'pipeline', 'fixtures')
const catalog = loadCatalog()

describe('fixtures reales del extractor', () => {
  for (const f of readdirSync(dir).filter((x) => x.endsWith('.real.json'))) {
    it(`${f} cumple el esquema y apunta a un ID del catálogo`, () => {
      const e = ExtractedReportSchema.parse(JSON.parse(readFileSync(join(dir, f), 'utf8')))
      if (e.catalogoId) {
        expect(catalog.some((c) => c.id === e.catalogoId)).toBe(true)
        expect(e.confianza).toBeGreaterThanOrEqual(0.7)
      } else {
        // Sin procedimiento identificable, la certeza debe quedar bajo el mínimo: el agente no adivina.
        expect(e.confianza).toBeLessThan(0.7)
      }
    })
  }
})
