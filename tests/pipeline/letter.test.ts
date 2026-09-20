import { describe, expect, it } from 'bun:test'
import { buildLetterPrompt, ensureEstadoHeader } from '@/lib/pipeline/letter'
import { DEFAULT_RULES_CONFIG } from '@/lib/rules/config'
import { adjudicate } from '@/lib/rules/engine'
import { apendicectomia, extractionBase, policyBase, reportBase } from '../rules/fixtures'

describe('ensureEstadoHeader', () => {
  it('respeta la carta si ya empieza con el estado', () =>
    expect(ensureEstadoHeader('Estado: Preaprobada\n\nTexto', 'Preaprobada')).toBe('Estado: Preaprobada\n\nTexto'))
  it('antepone el estado si falta', () => expect(ensureEstadoHeader('Texto', 'Rechazada')).toBe('Estado: Rechazada\n\nTexto'))
  it('corrige el estado si el modelo puso otro', () =>
    expect(ensureEstadoHeader('Estado: Rechazada\n\nTexto', 'Preaprobada')).toBe('Estado: Preaprobada\n\nTexto'))
})

describe('buildLetterPrompt', () => {
  it('incluye veredicto, póliza y fechas en dd/MM/yyyy', () => {
    const adjudication = adjudicate({ extraction: extractionBase, report: reportBase, policy: policyBase, procedure: apendicectomia, config: DEFAULT_RULES_CONFIG })
    const p = buildLetterPrompt({ adjudication, extraction: extractionBase, report: reportBase, policy: policyBase, procedure: apendicectomia })
    expect(p).toContain('Estado: Preaprobada')
    expect(p).toContain('POL-2025-0141')
    expect(p).toContain('15/05/2026')
  })
})
