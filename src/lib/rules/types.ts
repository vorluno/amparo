import { z } from 'zod'

export const PLANES = ['Básico', 'Plus', 'Premium'] as const
export type Plan = (typeof PLANES)[number]

export const ESTADOS_POLIZA = ['Vigente', 'Suspendida por mora', 'Cancelada'] as const
export type EstadoPoliza = (typeof ESTADOS_POLIZA)[number]

export const TIPOS_ATENCION = ['Electiva', 'Urgencia', 'Emergencia'] as const
export type TipoAtencion = (typeof TIPOS_ATENCION)[number]

export const DOCUMENTOS = [
  'Informe médico',
  'Exámenes de laboratorio',
  'Imagenología',
  'Consentimiento informado',
  'Historia clínica',
  'Presupuesto hospitalario',
  'Segunda opinión',
] as const
export type DocumentoTipo = (typeof DOCUMENTOS)[number]

export const PREEXISTENCIAS = [
  'Hipertensión',
  'Diabetes tipo 2',
  'Cardiopatía isquémica',
  'Obesidad',
  'Asma',
  'Artrosis',
] as const
export type Preexistencia = (typeof PREEXISTENCIAS)[number]

export const HOSPITALES = [
  'Hospital Alcívar',
  'Clínica Kennedy',
  'Hospital Clínica San Francisco',
  'Omni Hospital',
  'Hospital Luis Vernaza',
  'Clínica Guayaquil',
  'Hospital Metropolitano (Quito)',
] as const
export type Hospital = (typeof HOSPITALES)[number]

export const CATEGORIAS = [
  'Cirugía general',
  'Ortopedia',
  'Cardiovascular',
  'Maternidad',
  'Otorrinolaringología',
  'Estética',
  'Oftalmología',
  'Bariátrica',
] as const
export type Categoria = (typeof CATEGORIAS)[number]

export const ESTADOS_SOLICITUD = [
  'Pendiente',
  'En análisis',
  'Preaprobada',
  'Rechazada',
  'Documentos faltantes',
  'Error',
] as const
export type EstadoSolicitud = (typeof ESTADOS_SOLICITUD)[number]

/** Fechas siempre como 'YYYY-MM-DD' (sin hora) para evitar zonas horarias. */
export type ISODate = string

export type Policy = {
  numero: string
  asegurado: string
  cedula: string
  fechaNacimiento: ISODate
  plan: Plan
  estado: EstadoPoliza
  inicioVigencia: ISODate
  finVigencia: ISODate
  sumaAsegurada: number
  montoConsumido: number
  preexistencias: Preexistencia[]
  red: Hospital[]
  notionPageId?: string
  notionUrl?: string
}

export type CatalogEntry = {
  id: string // slug estable, ej. 'apendicectomia-laparoscopica'
  procedimiento: string
  cpt: string
  cie10: string
  categoria: Categoria
  planes: Plan[]
  carenciaDias: number
  exentoEnEmergencia: boolean
  excluido: boolean
  motivoExclusion?: string
  preexistenciaRelacionada: Preexistencia[]
  documentosRequeridos: DocumentoTipo[]
  montoMaximo?: number
  notionPageId?: string
}

export type ReportMeta = {
  id: string // 'INF-0001'
  paciente: string
  cedula: string
  hospital: Hospital
  medico: string
  fecha: ISODate
  tipoAtencion: TipoAtencion
  adjuntos: DocumentoTipo[]
  presupuesto: number
  notionPageId?: string
  notionUrl?: string
}

export const ExtractedReportSchema = z.object({
  catalogoId: z
    .string()
    .nullable()
    .describe('ID del catálogo que mejor corresponde al procedimiento propuesto, o null si ninguno encaja'),
  procedimientoTexto: z.string().describe('Cómo nombra el informe al procedimiento propuesto'),
  diagnostico: z.string(),
  cie10Sugerido: z.string().nullable(),
  especialidad: z.string(),
  tipoAtencionInferido: z.enum(TIPOS_ATENCION),
  justificacionClinica: z.string().describe('1-3 frases que citan el informe'),
  documentosMencionados: z.array(z.enum(DOCUMENTOS)),
  esEstetico: z.boolean().describe('true si la finalidad es estética y no funcional/reconstructiva'),
  confianza: z.number().min(0).max(1),
  ambiguedades: z.array(z.string()),
})
export type ExtractedReport = z.infer<typeof ExtractedReportSchema>

export type RuleId = 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | 'R6' | 'R7' | 'R8'
export type RuleOutcome = 'cumple' | 'no_cumple' | 'no_aplica'

export type RuleResult = {
  id: RuleId
  clausula: string | null
  titulo: string
  resultado: RuleOutcome
  evidencia: string
  datos?: Record<string, unknown>
}

export type Adjudication = {
  estado: Extract<EstadoSolicitud, 'Preaprobada' | 'Rechazada' | 'Documentos faltantes'>
  veredicto: string
  motivo: string
  clausulas: string[]
  reglas: RuleResult[]
  documentosFaltantes: DocumentoTipo[]
  elegibleDesde?: ISODate
  topeAprobado?: number
  advertencias: string[]
}

export type RulesConfig = {
  carenciaGeneralDias: number
  carenciaPreexistenciaDias: number
  umbralConfianza: number
  tiposQueEximenCarencia: TipoAtencion[]
  lockMinutos: number
}

export type AdjudicationInput = {
  extraction: ExtractedReport
  report: ReportMeta
  policy: Policy | null
  procedure: CatalogEntry | null
  config: RulesConfig
}
