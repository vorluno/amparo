import { daysBetween, formatDate, formatMoney } from '@/lib/format'
import type { CatalogEntry, Policy, ReportMeta } from '@/lib/rules/types'

/** Evidencia legible de la etapa "Auditor de póliza" (antes de adjudicar). */
export function policyEvidence(policy: Policy | null, procedure: CatalogEntry | null, report: ReportMeta) {
  if (!policy) {
    return { encontrada: false as const, cedula: report.cedula, resumen: `No existe póliza para la cédula ${report.cedula}.` }
  }
  const dias = daysBetween(policy.inicioVigencia, report.fecha)
  const saldo = policy.sumaAsegurada - policy.montoConsumido
  return {
    encontrada: true as const,
    numero: policy.numero,
    asegurado: policy.asegurado,
    plan: policy.plan,
    estado: policy.estado,
    vigencia: `${formatDate(policy.inicioVigencia)} – ${formatDate(policy.finVigencia)}`,
    diasTranscurridos: dias,
    saldo,
    saldoTexto: formatMoney(saldo),
    preexistencias: policy.preexistencias,
    red: policy.red,
    enRed: policy.red.includes(report.hospital),
    procedimiento: procedure
      ? {
          nombre: procedure.procedimiento,
          cpt: procedure.cpt,
          planes: procedure.planes,
          carenciaDias: procedure.carenciaDias,
          exentoEnEmergencia: procedure.exentoEnEmergencia,
          excluido: procedure.excluido,
          documentosRequeridos: procedure.documentosRequeridos,
          montoMaximo: procedure.montoMaximo ?? null,
        }
      : null,
    resumen: `Póliza ${policy.numero} (${policy.plan}, ${policy.estado}); ${dias} días de vigencia a la fecha del informe; saldo ${formatMoney(saldo)}.`,
  }
}
