import { addDays, daysBetween, formatDate, formatMoney } from '@/lib/format'
import type { Adjudication, AdjudicationInput, DocumentoTipo, RuleId, RuleResult } from './types'

/**
 * Adjudicador determinista. Función pura: sin red, sin LLM, sin reloj.
 * Evalúa las reglas que aplican (todas, para que la traza sea completa) y
 * decide por prioridad: rechazos duros → documentos faltantes → preaprobación.
 */

type Ctx = AdjudicationInput & { reglas: RuleResult[] }

function push<T extends RuleResult>(ctx: Ctx, r: T): T {
  ctx.reglas.push(r)
  return r
}

const TITULOS: Record<RuleId, string> = {
  R1: 'Póliza vigente en la fecha del informe',
  R2: 'Procedimiento identificado con certeza',
  R3: 'Hospital dentro de la red',
  R4: 'Procedimiento no excluido',
  R5: 'Cubierto por el plan contratado',
  R6: 'Período de carencia cumplido',
  R7: 'Documentación completa',
  R8: 'Presupuesto dentro de la suma asegurada',
}
const CLAUSULA_BASE: Record<RuleId, string | null> = { R1: '2', R2: null, R3: '3', R4: '5', R5: '6', R6: '4.1', R7: '7', R8: '8' }

function skip(ctx: Ctx, ids: RuleId[], porQue: string) {
  for (const id of ids) push(ctx, { id, clausula: CLAUSULA_BASE[id], titulo: TITULOS[id], resultado: 'no_aplica', evidencia: `No evaluada: ${porQue}.` })
}

function r1Vigencia(ctx: Ctx): RuleResult {
  const { policy, report } = ctx
  const titulo = TITULOS.R1
  if (!policy) {
    return push(ctx, { id: 'R1', clausula: '2', titulo, resultado: 'no_cumple', evidencia: `No existe póliza asociada a la cédula ${report.cedula}.` })
  }
  if (policy.estado !== 'Vigente') {
    return push(ctx, { id: 'R1', clausula: '2', titulo, resultado: 'no_cumple', evidencia: `La póliza ${policy.numero} está en estado "${policy.estado}".` })
  }
  const dentro = daysBetween(policy.inicioVigencia, report.fecha) >= 0 && daysBetween(report.fecha, policy.finVigencia) >= 0
  if (!dentro) {
    return push(ctx, {
      id: 'R1', clausula: '2', titulo, resultado: 'no_cumple',
      evidencia: `El informe (${formatDate(report.fecha)}) está fuera de la vigencia ${formatDate(policy.inicioVigencia)} – ${formatDate(policy.finVigencia)}.`,
    })
  }
  return push(ctx, {
    id: 'R1', clausula: '2', titulo, resultado: 'cumple',
    evidencia: `Póliza ${policy.numero} vigente (${formatDate(policy.inicioVigencia)} – ${formatDate(policy.finVigencia)}), plan ${policy.plan}.`,
  })
}

function r2Extraccion(ctx: Ctx): RuleResult {
  const { extraction, procedure, config } = ctx
  const titulo = TITULOS.R2
  const ok = extraction.confianza >= config.umbralConfianza && procedure !== null
  const conf = `confianza ${extraction.confianza.toFixed(2)} (umbral ${config.umbralConfianza})`
  if (!ok) {
    const causa = procedure === null ? 'ningún procedimiento del catálogo corresponde al informe' : 'la confianza de la extracción está bajo el umbral'
    const amb = extraction.ambiguedades.length ? ` Ambigüedades: ${extraction.ambiguedades.join('; ')}.` : ''
    return push(ctx, { id: 'R2', clausula: null, titulo, resultado: 'no_cumple', evidencia: `"${extraction.procedimientoTexto}": ${causa}; ${conf}.${amb}` })
  }
  return push(ctx, {
    id: 'R2', clausula: null, titulo, resultado: 'cumple',
    evidencia: `"${extraction.procedimientoTexto}" → ${procedure.procedimiento} (CPT ${procedure.cpt}); ${conf}.`,
  })
}

function r3Red(ctx: Ctx): RuleResult {
  const policy = ctx.policy!
  const { report } = ctx
  const ok = policy.red.includes(report.hospital)
  return push(ctx, {
    id: 'R3', clausula: '3', titulo: TITULOS.R3, resultado: ok ? 'cumple' : 'no_cumple',
    evidencia: ok ? `${report.hospital} pertenece a la red de la póliza.` : `${report.hospital} no está en la red: ${policy.red.join(', ')}.`,
  })
}

function r4Exclusion(ctx: Ctx): RuleResult {
  const p = ctx.procedure!
  if (p.excluido) {
    return push(ctx, { id: 'R4', clausula: '5', titulo: TITULOS.R4, resultado: 'no_cumple', evidencia: `${p.procedimiento} está excluido: ${p.motivoExclusion ?? 'sin motivo registrado'}.` })
  }
  return push(ctx, { id: 'R4', clausula: '5', titulo: TITULOS.R4, resultado: 'cumple', evidencia: `${p.procedimiento} no figura entre las exclusiones.` })
}

function r5Plan(ctx: Ctx): RuleResult {
  const p = ctx.procedure!
  const plan = ctx.policy!.plan
  const ok = p.planes.includes(plan)
  return push(ctx, {
    id: 'R5', clausula: '6', titulo: TITULOS.R5, resultado: ok ? 'cumple' : 'no_cumple',
    evidencia: ok ? `El plan ${plan} cubre ${p.procedimiento}.` : `El plan ${plan} no cubre ${p.procedimiento} (cubierto en: ${p.planes.length ? p.planes.join(', ') : 'ningún plan'}).`,
  })
}

type CarenciaDatos = { diasTranscurridos: number; carenciaAplicable: number; exento: boolean; preexistentes: string[]; clausulaAplicada: string; elegibleDesde?: string }

function r6Carencia(ctx: Ctx): RuleResult & { datos: CarenciaDatos } {
  const { report, config } = ctx
  const p = ctx.procedure!
  const pol = ctx.policy!
  const titulo = TITULOS.R6
  const dias = daysBetween(pol.inicioVigencia, report.fecha)
  const preexistentes = p.preexistenciaRelacionada.filter((x) => pol.preexistencias.includes(x))
  const base = Math.max(config.carenciaGeneralDias, p.carenciaDias)
  const clausulaBase = p.carenciaDias > config.carenciaGeneralDias ? '4.2' : '4.1'
  const aplicable = preexistentes.length ? Math.max(base, config.carenciaPreexistenciaDias) : base
  const clausulaAplicada = preexistentes.length ? '4.3' : clausulaBase
  const exento = config.tiposQueEximenCarencia.includes(report.tipoAtencion) && p.exentoEnEmergencia && preexistentes.length === 0
  const datos: CarenciaDatos = { diasTranscurridos: dias, carenciaAplicable: aplicable, exento, preexistentes, clausulaAplicada }
  if (exento) {
    return push(ctx, {
      id: 'R6', clausula: '4.4', titulo, resultado: 'cumple',
      evidencia: `Atención de ${report.tipoAtencion}: ${p.procedimiento} está exento de carencia en emergencias (${dias} días transcurridos de ${aplicable}).`,
      datos,
    })
  }
  if (dias >= aplicable) {
    return push(ctx, { id: 'R6', clausula: clausulaAplicada, titulo, resultado: 'cumple', evidencia: `${dias} días desde el inicio de vigencia; carencia aplicable ${aplicable} días.`, datos })
  }
  const elegibleDesde = addDays(pol.inicioVigencia, aplicable)
  const porQue = preexistentes.length
    ? `la preexistencia declarada (${preexistentes.join(', ')}) eleva la carencia a ${aplicable} días`
    : `carencia de ${aplicable} días para ${p.procedimiento}`
  const nota = preexistentes.length && config.tiposQueEximenCarencia.includes(report.tipoAtencion) ? ' La emergencia no exime la carencia por preexistencia.' : ''
  return push(ctx, {
    id: 'R6', clausula: clausulaAplicada, titulo, resultado: 'no_cumple',
    evidencia: `${dias} días transcurridos; ${porQue}. Elegible desde ${formatDate(elegibleDesde)}.${nota}`,
    datos: { ...datos, elegibleDesde },
  })
}

function r7Documentos(ctx: Ctx): RuleResult & { datos: { faltantes: DocumentoTipo[] } } {
  const p = ctx.procedure!
  const faltantes = p.documentosRequeridos.filter((d) => !ctx.report.adjuntos.includes(d))
  const datos = { requeridos: p.documentosRequeridos, adjuntos: ctx.report.adjuntos, faltantes }
  if (faltantes.length) {
    return push(ctx, { id: 'R7', clausula: '7', titulo: TITULOS.R7, resultado: 'no_cumple', evidencia: `Faltan: ${faltantes.join(', ')}.`, datos })
  }
  return push(ctx, { id: 'R7', clausula: '7', titulo: TITULOS.R7, resultado: 'cumple', evidencia: `Adjuntos los ${p.documentosRequeridos.length} documentos requeridos.`, datos })
}

function r8Monto(ctx: Ctx): RuleResult & { datos: { saldo: number; tope: number } } {
  const pol = ctx.policy!
  const p = ctx.procedure!
  const titulo = TITULOS.R8
  const saldo = pol.sumaAsegurada - pol.montoConsumido
  const tope = p.montoMaximo !== undefined ? Math.min(saldo, p.montoMaximo) : saldo
  const datos = { saldo, tope, presupuesto: ctx.report.presupuesto, montoMaximo: p.montoMaximo ?? null }
  if (saldo <= 0) {
    return push(ctx, { id: 'R8', clausula: '8', titulo, resultado: 'no_cumple', evidencia: `Suma asegurada agotada (consumido ${formatMoney(pol.montoConsumido)} de ${formatMoney(pol.sumaAsegurada)}).`, datos })
  }
  if (ctx.report.presupuesto > tope) {
    const max = p.montoMaximo !== undefined ? `, máximo del procedimiento ${formatMoney(p.montoMaximo)}` : ''
    return push(ctx, { id: 'R8', clausula: '8', titulo, resultado: 'no_cumple', evidencia: `Presupuesto ${formatMoney(ctx.report.presupuesto)} excede el tope ${formatMoney(tope)} (saldo ${formatMoney(saldo)}${max}).`, datos })
  }
  return push(ctx, { id: 'R8', clausula: '8', titulo, resultado: 'cumple', evidencia: `Presupuesto ${formatMoney(ctx.report.presupuesto)} dentro del tope ${formatMoney(tope)}.`, datos })
}

/** No cambian el veredicto; son material para un auditor humano. */
function advertencias(ctx: Ctx): string[] {
  const out: string[] = []
  const { extraction, report } = ctx
  if (extraction.tipoAtencionInferido !== report.tipoAtencion) {
    out.push(`Inconsistencia de urgencia: el hospital declara "${report.tipoAtencion}" pero el informe describe una atención "${extraction.tipoAtencionInferido}".`)
  }
  for (const d of extraction.documentosMencionados) {
    if (!report.adjuntos.includes(d)) out.push(`El informe menciona "${d}" pero no está adjunto.`)
  }
  return out
}

export function adjudicate(input: AdjudicationInput): Adjudication {
  const ctx: Ctx = { ...input, reglas: [] }
  const finish = (a: Omit<Adjudication, 'reglas' | 'advertencias' | 'documentosFaltantes'> & { documentosFaltantes?: DocumentoTipo[] }): Adjudication => ({
    ...a,
    documentosFaltantes: a.documentosFaltantes ?? [],
    reglas: ctx.reglas,
    advertencias: advertencias(ctx),
  })

  const r1 = r1Vigencia(ctx)
  const r2 = r2Extraccion(ctx)

  if (r1.resultado === 'no_cumple') {
    skip(ctx, ['R3', 'R4', 'R5', 'R6', 'R7', 'R8'], 'la póliza no está vigente')
    return finish({ estado: 'Rechazada', veredicto: 'Rechazada: sin cobertura vigente', motivo: r1.evidencia, clausulas: ['2'] })
  }
  if (r2.resultado === 'no_cumple') {
    r3Red(ctx)
    skip(ctx, ['R4', 'R5', 'R6', 'R7', 'R8'], 'no se identificó el procedimiento')
    return finish({
      estado: 'Documentos faltantes',
      veredicto: 'Documentos faltantes: informe médico ampliado',
      motivo: `${r2.evidencia} Se requiere un informe médico ampliado que especifique el procedimiento propuesto.`,
      clausulas: ['7'],
      documentosFaltantes: ['Informe médico'],
    })
  }

  const r3 = r3Red(ctx)
  const r4 = r4Exclusion(ctx)
  const r5 = r5Plan(ctx)
  const r6 = r6Carencia(ctx)
  const r7 = r7Documentos(ctx)
  const r8 = r8Monto(ctx)
  const p = ctx.procedure!
  const plan = ctx.policy!.plan
  const nombre = `${p.procedimiento} (CPT ${p.cpt})`

  if (r3.resultado === 'no_cumple') return finish({ estado: 'Rechazada', veredicto: 'Rechazada: hospital fuera de la red', motivo: r3.evidencia, clausulas: ['3'] })
  if (r4.resultado === 'no_cumple') return finish({ estado: 'Rechazada', veredicto: `Rechazada: ${p.procedimiento} es un procedimiento excluido`, motivo: r4.evidencia, clausulas: ['5'] })
  if (r5.resultado === 'no_cumple') return finish({ estado: 'Rechazada', veredicto: `Rechazada: ${nombre} no está cubierto por el plan ${plan}`, motivo: r5.evidencia, clausulas: ['6'] })
  if (r6.resultado === 'no_cumple') {
    return finish({
      estado: 'Rechazada',
      veredicto: `Rechazada por carencia: elegible desde ${formatDate(r6.datos.elegibleDesde!)}`,
      motivo: r6.evidencia,
      clausulas: [r6.datos.clausulaAplicada],
      elegibleDesde: r6.datos.elegibleDesde,
    })
  }
  if (r8.resultado === 'no_cumple' && r8.datos.saldo <= 0) {
    return finish({ estado: 'Rechazada', veredicto: 'Rechazada: suma asegurada agotada', motivo: r8.evidencia, clausulas: ['8'] })
  }
  if (r7.resultado === 'no_cumple') {
    return finish({
      estado: 'Documentos faltantes',
      veredicto: `Documentos faltantes: ${r7.datos.faltantes.join(', ')}`,
      motivo: `${nombre} es elegible, pero ${r7.evidencia.charAt(0).toLowerCase()}${r7.evidencia.slice(1)}`,
      clausulas: ['7'],
      documentosFaltantes: r7.datos.faltantes,
    })
  }
  if (r8.resultado === 'no_cumple') {
    return finish({
      estado: 'Preaprobada',
      veredicto: `Preaprobada hasta ${formatMoney(r8.datos.tope)}: ${nombre}`,
      motivo: `${r8.evidencia} El excedente queda a cargo del paciente.`,
      clausulas: ['8'],
      topeAprobado: r8.datos.tope,
    })
  }
  return finish({
    estado: 'Preaprobada',
    veredicto: `Preaprobada: ${nombre} cubierta por el plan ${plan}`,
    motivo: `Cumple vigencia, red, plan, carencia, documentación y monto (${formatMoney(ctx.report.presupuesto)} de ${formatMoney(r8.datos.tope)} disponibles).`,
    clausulas: [],
  })
}
