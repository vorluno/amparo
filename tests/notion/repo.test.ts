import { describe, expect, it } from 'bun:test'
import type { Solicitud } from '@/lib/notion/mappers'
import { shouldLock } from '@/lib/notion/repo'

const s = (over: Partial<Solicitud>): Solicitud => ({
  id: 'PA-0001',
  pageId: 'p',
  url: '',
  estado: 'Pendiente',
  escenario: '',
  esperado: null,
  paciente: '',
  hospital: '',
  informePageId: null,
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
  ...over,
})

describe('shouldLock', () => {
  const now = new Date('2026-09-20T12:00:00Z')
  it('bloquea si está en análisis hace menos del límite', () =>
    expect(shouldLock(s({ estado: 'En análisis', analizadoEl: '2026-09-20T11:59:00Z' }), 2, now)).toBe(true))
  it('no bloquea si el lock es viejo', () =>
    expect(shouldLock(s({ estado: 'En análisis', analizadoEl: '2026-09-20T11:50:00Z' }), 2, now)).toBe(false))
  it('no bloquea en otros estados', () =>
    expect(shouldLock(s({ estado: 'Preaprobada', analizadoEl: '2026-09-20T11:59:00Z' }), 2, now)).toBe(false))
})
