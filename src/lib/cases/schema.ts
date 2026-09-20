import { z } from 'zod'
import { CATEGORIAS, DOCUMENTOS, ESTADOS_POLIZA, HOSPITALES, PLANES, PREEXISTENCIAS, TIPOS_ATENCION } from '@/lib/rules/types'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD (entre comillas en el YAML)')

export const CatalogEntrySchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  procedimiento: z.string(),
  cpt: z.string(),
  cie10: z.string(),
  categoria: z.enum(CATEGORIAS),
  planes: z.array(z.enum(PLANES)),
  carenciaDias: z.number().int().min(0),
  exentoEnEmergencia: z.boolean(),
  excluido: z.boolean(),
  motivoExclusion: z.string().optional(),
  preexistenciaRelacionada: z.array(z.enum(PREEXISTENCIAS)),
  documentosRequeridos: z.array(z.enum(DOCUMENTOS)),
  montoMaximo: z.number().positive().optional(),
})
export const CatalogSchema = z.array(CatalogEntrySchema)

export const PolicyFrontmatter = z.object({
  numero: z.string(),
  asegurado: z.string(),
  cedula: z.string().regex(/^\d{10}$/, 'cédula de 10 dígitos, entre comillas'),
  fechaNacimiento: isoDate,
  plan: z.enum(PLANES),
  estado: z.enum(ESTADOS_POLIZA),
  inicioVigencia: isoDate,
  finVigencia: isoDate,
  sumaAsegurada: z.number().positive(),
  montoConsumido: z.number().min(0),
  preexistencias: z.array(z.enum(PREEXISTENCIAS)),
  red: z.array(z.enum(HOSPITALES)).min(1),
})

export const ReportFrontmatter = z.object({
  id: z.string().regex(/^INF-\d{4}$/),
  paciente: z.string(),
  cedula: z.string().regex(/^\d{10}$/, 'cédula de 10 dígitos, entre comillas'),
  hospital: z.enum(HOSPITALES),
  medico: z.string(),
  fecha: isoDate,
  tipoAtencion: z.enum(TIPOS_ATENCION),
  adjuntos: z.array(z.enum(DOCUMENTOS)),
  presupuesto: z.number().positive(),
})

export const CaseFrontmatter = z.object({
  id: z.string().regex(/^PA-\d{4}$/),
  titulo: z.string(),
  esperado: z.enum(['Preaprobada', 'Rechazada', 'Documentos faltantes']),
  motivoEsperado: z.string(),
  /** `null` = el caso prueba "cédula sin póliza"; el seed no crea póliza. */
  poliza: PolicyFrontmatter.nullable(),
  informe: ReportFrontmatter,
})
export type CaseFrontmatter = z.infer<typeof CaseFrontmatter>
