import type { CreateDatabaseParameters } from '@notionhq/client'
import {
  CATEGORIAS,
  DOCUMENTOS,
  ESTADOS_POLIZA,
  ESTADOS_SOLICITUD,
  HOSPITALES,
  PLANES,
  PREEXISTENCIAS,
  TIPOS_ATENCION,
  type EstadoSolicitud,
} from '@/lib/rules/types'

type Props = NonNullable<NonNullable<CreateDatabaseParameters['initial_data_source']>['properties']>
type SelectColor = 'default' | 'gray' | 'brown' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple' | 'pink' | 'red'

/** Nombres de propiedades: única fuente de verdad (se ven en Notion, van en español). */
export const P = {
  polizas: {
    numero: 'Nº de póliza',
    asegurado: 'Asegurado',
    cedula: 'Cédula',
    fechaNacimiento: 'Fecha de nacimiento',
    plan: 'Plan',
    estado: 'Estado',
    inicio: 'Inicio de vigencia',
    fin: 'Fin de vigencia',
    suma: 'Suma asegurada anual',
    consumido: 'Monto consumido',
    preexistencias: 'Preexistencias declaradas',
    red: 'Red de hospitales',
  },
  catalogo: {
    procedimiento: 'Procedimiento',
    id: 'ID',
    cpt: 'Código CPT',
    cie10: 'CIE-10 asociado',
    categoria: 'Categoría',
    planes: 'Cubierto en planes',
    carencia: 'Carencia (días)',
    exento: 'Exento de carencia en emergencia',
    excluido: 'Excluido',
    motivoExclusion: 'Motivo de exclusión',
    preexistencia: 'Preexistencia relacionada',
    documentos: 'Documentos requeridos',
    maximo: 'Monto máximo cubierto',
  },
  informes: {
    informe: 'Informe',
    id: 'ID',
    paciente: 'Paciente',
    cedula: 'Cédula',
    hospital: 'Hospital',
    medico: 'Médico tratante',
    fecha: 'Fecha del informe',
    tipo: 'Tipo de atención',
    adjuntos: 'Documentos adjuntos',
    presupuesto: 'Presupuesto estimado',
  },
  solicitudes: {
    id: 'ID',
    informe: 'Informe médico',
    estado: 'Estado',
    escenario: 'Escenario',
    esperado: 'Veredicto esperado',
    paciente: 'Paciente',
    hospital: 'Hospital',
    poliza: 'Póliza',
    procedimiento: 'Procedimiento detectado',
    cpt: 'CPT detectado',
    veredicto: 'Veredicto',
    motivo: 'Motivo',
    clausulas: 'Cláusulas aplicadas',
    faltantes: 'Documentos faltantes',
    elegibleDesde: 'Elegible desde',
    tope: 'Tope aprobado',
    confianza: 'Confianza de extracción',
    analizadoEl: 'Analizado el',
    version: 'Versión del agente',
  },
} as const

export const SOLICITUD_ESTADO_COLORS: Record<EstadoSolicitud, SelectColor> = {
  'Pendiente': 'gray',
  'En análisis': 'blue',
  'Preaprobada': 'green',
  'Rechazada': 'red',
  'Documentos faltantes': 'yellow',
  'Error': 'red',
}

const ESPERADOS = ['Preaprobada', 'Rechazada', 'Documentos faltantes'] as const

const title = () => ({ title: {} })
const text = () => ({ rich_text: {} })
const num = (format: 'number' | 'dollar' = 'number') => ({ number: { format } })
const date = () => ({ date: {} })
const check = () => ({ checkbox: {} })
const select = (opts: readonly string[], colors?: Partial<Record<string, SelectColor>>) => ({
  select: { options: opts.map((name) => ({ name, ...(colors?.[name] ? { color: colors[name] } : {}) })) },
})
const multi = (opts: readonly string[]) => ({ multi_select: { options: opts.map((name) => ({ name })) } })
const relation = (data_source_id: string) => ({ relation: { data_source_id, single_property: {} } })

/** Definiciones de propiedades para `databases.create` (initial_data_source.properties). */
export function dbSchemas(ds: { polizas?: string; informes?: string }) {
  const p = P
  const polizas: Props = {
    [p.polizas.numero]: title(),
    [p.polizas.asegurado]: text(),
    [p.polizas.cedula]: text(),
    [p.polizas.fechaNacimiento]: date(),
    [p.polizas.plan]: select(PLANES),
    [p.polizas.estado]: select(ESTADOS_POLIZA, { Vigente: 'green', 'Suspendida por mora': 'yellow', Cancelada: 'red' }),
    [p.polizas.inicio]: date(),
    [p.polizas.fin]: date(),
    [p.polizas.suma]: num('dollar'),
    [p.polizas.consumido]: num('dollar'),
    [p.polizas.preexistencias]: multi(PREEXISTENCIAS),
    [p.polizas.red]: multi(HOSPITALES),
  }
  const catalogo: Props = {
    [p.catalogo.procedimiento]: title(),
    [p.catalogo.id]: text(),
    [p.catalogo.cpt]: text(),
    [p.catalogo.cie10]: text(),
    [p.catalogo.categoria]: select(CATEGORIAS),
    [p.catalogo.planes]: multi(PLANES),
    [p.catalogo.carencia]: num(),
    [p.catalogo.exento]: check(),
    [p.catalogo.excluido]: check(),
    [p.catalogo.motivoExclusion]: text(),
    [p.catalogo.preexistencia]: multi(PREEXISTENCIAS),
    [p.catalogo.documentos]: multi(DOCUMENTOS),
    [p.catalogo.maximo]: num('dollar'),
  }
  const informes: Props = {
    [p.informes.informe]: title(),
    [p.informes.id]: text(),
    [p.informes.paciente]: text(),
    [p.informes.cedula]: text(),
    [p.informes.hospital]: select(HOSPITALES),
    [p.informes.medico]: text(),
    [p.informes.fecha]: date(),
    [p.informes.tipo]: select(TIPOS_ATENCION, { Electiva: 'gray', Urgencia: 'orange', Emergencia: 'red' }),
    [p.informes.adjuntos]: multi(DOCUMENTOS),
    [p.informes.presupuesto]: num('dollar'),
  }
  const solicitudes = (): Props => {
    if (!ds.polizas || !ds.informes) throw new Error('Solicitudes requiere los data source IDs de Pólizas e Informes')
    return {
      [p.solicitudes.id]: title(),
      [p.solicitudes.informe]: relation(ds.informes),
      [p.solicitudes.estado]: select(ESTADOS_SOLICITUD, SOLICITUD_ESTADO_COLORS),
      [p.solicitudes.escenario]: text(),
      [p.solicitudes.esperado]: select(ESPERADOS, { Preaprobada: 'green', Rechazada: 'red', 'Documentos faltantes': 'yellow' }),
      [p.solicitudes.paciente]: text(),
      [p.solicitudes.hospital]: text(),
      [p.solicitudes.poliza]: relation(ds.polizas),
      [p.solicitudes.procedimiento]: text(),
      [p.solicitudes.cpt]: text(),
      [p.solicitudes.veredicto]: text(),
      [p.solicitudes.motivo]: text(),
      [p.solicitudes.clausulas]: text(),
      [p.solicitudes.faltantes]: multi(DOCUMENTOS),
      [p.solicitudes.elegibleDesde]: date(),
      [p.solicitudes.tope]: num('dollar'),
      [p.solicitudes.confianza]: num(),
      [p.solicitudes.analizadoEl]: date(),
      [p.solicitudes.version]: text(),
    }
  }
  return { polizas, catalogo, informes, solicitudes }
}
