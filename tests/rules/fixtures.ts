import type { CatalogEntry, ExtractedReport, Policy, ReportMeta } from '@/lib/rules/types'

export const policyBase: Policy = {
  numero: 'POL-2025-0141',
  asegurado: 'María Fernanda López Cedeño',
  cedula: '0923456789',
  fechaNacimiento: '1991-04-12',
  plan: 'Básico',
  estado: 'Vigente',
  inicioVigencia: '2026-05-15',
  finVigencia: '2027-05-14',
  sumaAsegurada: 20000,
  montoConsumido: 350,
  preexistencias: [],
  red: ['Hospital Alcívar', 'Clínica Kennedy', 'Hospital Clínica San Francisco'],
}

export const apendicectomia: CatalogEntry = {
  id: 'apendicectomia-laparoscopica',
  procedimiento: 'Apendicectomía laparoscópica',
  cpt: '44970',
  cie10: 'K35.80',
  categoria: 'Cirugía general',
  planes: ['Básico', 'Plus', 'Premium'],
  carenciaDias: 90,
  exentoEnEmergencia: true,
  excluido: false,
  preexistenciaRelacionada: [],
  documentosRequeridos: ['Informe médico', 'Exámenes de laboratorio', 'Imagenología', 'Presupuesto hospitalario'],
}

export const reportBase: ReportMeta = {
  id: 'INF-0001',
  paciente: 'María Fernanda López Cedeño',
  cedula: '0923456789',
  hospital: 'Clínica Kennedy',
  medico: 'Dr. Andrés Villacís',
  fecha: '2026-09-18',
  tipoAtencion: 'Emergencia',
  adjuntos: ['Informe médico', 'Exámenes de laboratorio', 'Imagenología', 'Presupuesto hospitalario'],
  presupuesto: 3800,
}

export const extractionBase: ExtractedReport = {
  catalogoId: 'apendicectomia-laparoscopica',
  procedimientoTexto: 'apendicectomía laparoscópica de urgencia',
  diagnostico: 'Apendicitis aguda',
  cie10Sugerido: 'K35.80',
  especialidad: 'Cirugía general',
  tipoAtencionInferido: 'Emergencia',
  justificacionClinica: 'Dolor en fosa ilíaca derecha con signos de irritación peritoneal y ecografía compatible.',
  documentosMencionados: ['Imagenología', 'Exámenes de laboratorio'],
  esEstetico: false,
  confianza: 0.95,
  ambiguedades: [],
}
