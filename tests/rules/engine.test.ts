import { describe, expect, it } from 'bun:test'
import { DEFAULT_RULES_CONFIG } from '@/lib/rules/config'
import { adjudicate } from '@/lib/rules/engine'
import type { AdjudicationInput } from '@/lib/rules/types'
import { apendicectomia, extractionBase, policyBase, reportBase } from './fixtures'

const base = (over: Partial<AdjudicationInput> = {}): AdjudicationInput => ({
  extraction: extractionBase,
  report: reportBase,
  policy: policyBase,
  procedure: apendicectomia,
  config: DEFAULT_RULES_CONFIG,
  ...over,
})
const rule = (a: ReturnType<typeof adjudicate>, id: string) => a.reglas.find((r) => r.id === id)!

describe('R1 vigencia', () => {
  it('rechaza sin póliza', () => {
    const a = adjudicate(base({ policy: null }))
    expect(a.estado).toBe('Rechazada')
    expect(a.clausulas).toEqual(['2'])
    expect(rule(a, 'R3').resultado).toBe('no_aplica')
    expect(rule(a, 'R2').resultado).toBe('cumple') // R2 sí se evalúa
  })
  it('rechaza póliza suspendida por mora', () => {
    const a = adjudicate(base({ policy: { ...policyBase, estado: 'Suspendida por mora' } }))
    expect(a.estado).toBe('Rechazada')
    expect(a.veredicto).toContain('sin cobertura vigente')
  })
  it('rechaza informe fuera de vigencia', () => {
    const a = adjudicate(base({ report: { ...reportBase, fecha: '2027-06-01' } }))
    expect(a.estado).toBe('Rechazada')
  })
  it('acepta informe el último día de vigencia', () => {
    const a = adjudicate(base({ report: { ...reportBase, fecha: '2027-05-14' } }))
    expect(rule(a, 'R1').resultado).toBe('cumple')
  })
})

describe('R2 extracción confiable', () => {
  it('pide informe ampliado si la confianza es baja', () => {
    const a = adjudicate(base({ extraction: { ...extractionBase, confianza: 0.4 } }))
    expect(a.estado).toBe('Documentos faltantes')
    expect(a.documentosFaltantes).toEqual(['Informe médico'])
    expect(rule(a, 'R4').resultado).toBe('no_aplica')
  })
  it('pide informe ampliado si no eligió del catálogo', () => {
    const a = adjudicate(base({ procedure: null, extraction: { ...extractionBase, catalogoId: null } }))
    expect(a.estado).toBe('Documentos faltantes')
  })
})

describe('R3 red', () => {
  it('rechaza hospital fuera de red', () => {
    const a = adjudicate(base({ report: { ...reportBase, hospital: 'Hospital Metropolitano (Quito)' } }))
    expect(a.estado).toBe('Rechazada')
    expect(a.clausulas).toEqual(['3'])
  })
})

describe('R4 exclusión', () => {
  it('rechaza procedimiento excluido citando el motivo', () => {
    const a = adjudicate(base({ procedure: { ...apendicectomia, excluido: true, motivoExclusion: 'Procedimiento estético' } }))
    expect(a.estado).toBe('Rechazada')
    expect(a.motivo).toContain('Procedimiento estético')
    expect(a.clausulas).toEqual(['5'])
  })
})

describe('R5 plan', () => {
  it('rechaza si el plan no cubre', () => {
    const a = adjudicate(base({ procedure: { ...apendicectomia, planes: ['Plus', 'Premium'] } }))
    expect(a.estado).toBe('Rechazada')
    expect(a.clausulas).toEqual(['6'])
  })
})

describe('R6 carencia', () => {
  const electiva = { ...reportBase, tipoAtencion: 'Electiva' as const }
  it('rechaza por carencia y calcula elegible desde', () => {
    // inicio 2026-05-15 + 90 = 2026-08-13; informe 2026-06-29 (45 días)
    const a = adjudicate(base({ report: { ...electiva, fecha: '2026-06-29' } }))
    expect(a.estado).toBe('Rechazada')
    expect(a.elegibleDesde).toBe('2026-08-13')
    expect(a.clausulas).toEqual(['4.2'])
  })
  it('cumple exactamente el día 90', () => {
    const a = adjudicate(base({ report: { ...electiva, fecha: '2026-08-13' } }))
    expect(rule(a, 'R6').resultado).toBe('cumple')
  })
  it('emergencia exime carencia si el catálogo lo permite', () => {
    const a = adjudicate(base({ report: { ...reportBase, fecha: '2026-06-01' } }))
    expect(rule(a, 'R6').resultado).toBe('cumple')
    expect(a.clausulas).not.toContain('4.2')
  })
  it('emergencia NO exime si el catálogo no lo permite', () => {
    const a = adjudicate(
      base({ report: { ...reportBase, fecha: '2026-06-01' }, procedure: { ...apendicectomia, exentoEnEmergencia: false } }),
    )
    expect(a.estado).toBe('Rechazada')
  })
  it('urgencia no exime', () => {
    const a = adjudicate(base({ report: { ...reportBase, fecha: '2026-06-01', tipoAtencion: 'Urgencia' } }))
    expect(a.estado).toBe('Rechazada')
  })
  it('preexistencia declarada aplica 730 días incluso en emergencia', () => {
    const a = adjudicate(
      base({
        policy: { ...policyBase, preexistencias: ['Cardiopatía isquémica'], inicioVigencia: '2025-07-01' },
        procedure: { ...apendicectomia, preexistenciaRelacionada: ['Cardiopatía isquémica'] },
        report: { ...reportBase, fecha: '2026-09-18' },
      }),
    )
    expect(a.estado).toBe('Rechazada')
    expect(a.clausulas).toEqual(['4.3'])
    expect(a.elegibleDesde).toBe('2027-07-01')
  })
  it('usa la carencia general cuando la del procedimiento es menor', () => {
    const a = adjudicate(base({ report: { ...electiva, fecha: '2026-05-30' }, procedure: { ...apendicectomia, carenciaDias: 0 } }))
    expect(a.estado).toBe('Rechazada')
    expect(a.elegibleDesde).toBe('2026-06-14')
    expect(a.clausulas).toEqual(['4.1'])
  })
})

describe('R7 documentos', () => {
  it('lista exactamente los faltantes', () => {
    const a = adjudicate(base({ report: { ...reportBase, adjuntos: ['Informe médico', 'Exámenes de laboratorio'] } }))
    expect(a.estado).toBe('Documentos faltantes')
    expect(a.documentosFaltantes).toEqual(['Imagenología', 'Presupuesto hospitalario'])
    expect(a.clausulas).toEqual(['7'])
  })
  it('los rechazos tienen prioridad sobre documentos faltantes', () => {
    const a = adjudicate(base({ report: { ...reportBase, adjuntos: [], hospital: 'Hospital Metropolitano (Quito)' } }))
    expect(a.estado).toBe('Rechazada')
  })
})

describe('R8 monto', () => {
  it('preaprueba con tope cuando el presupuesto excede el saldo', () => {
    const a = adjudicate(base({ policy: { ...policyBase, sumaAsegurada: 4000, montoConsumido: 1850 } }))
    expect(a.estado).toBe('Preaprobada')
    expect(a.topeAprobado).toBe(2150)
    expect(a.veredicto).toContain('USD 2,150.00')
  })
  it('respeta el monto máximo del procedimiento', () => {
    const a = adjudicate(base({ procedure: { ...apendicectomia, montoMaximo: 3000 } }))
    expect(a.topeAprobado).toBe(3000)
  })
  it('sin tope cuando alcanza', () => {
    const a = adjudicate(base())
    expect(a.estado).toBe('Preaprobada')
    expect(a.topeAprobado).toBeUndefined()
    expect(a.clausulas).toEqual([])
  })
  it('rechaza con suma agotada', () => {
    const a = adjudicate(base({ policy: { ...policyBase, montoConsumido: 20000 } }))
    expect(a.estado).toBe('Rechazada')
    expect(a.clausulas).toEqual(['8'])
  })
})

describe('advertencias', () => {
  it('avisa inconsistencia de urgencia y documento mencionado no adjunto', () => {
    const a = adjudicate(
      base({
        extraction: { ...extractionBase, tipoAtencionInferido: 'Electiva', documentosMencionados: ['Historia clínica'] },
      }),
    )
    expect(a.advertencias.some((w) => w.includes('urgencia'))).toBe(true)
    expect(a.advertencias.some((w) => w.includes('Historia clínica'))).toBe(true)
  })
})
