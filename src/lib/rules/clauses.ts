/** Cláusulas de las Condiciones Generales demo (docs/CONDICIONES-GENERALES.md). */
export const CLAUSULAS: Record<string, string> = {
  '2': 'Vigencia y estado de la póliza',
  '3': 'Red de prestadores',
  '4.1': 'Carencia general',
  '4.2': 'Carencia por procedimiento',
  '4.3': 'Carencia por preexistencias declaradas',
  '4.4': 'Emergencias',
  '5': 'Exclusiones',
  '5.1': 'Procedimientos estéticos',
  '6': 'Cobertura por plan',
  '7': 'Documentación para pre-autorización',
  '8': 'Suma asegurada y topes',
}

export function clausula(id: string): string {
  const titulo = CLAUSULAS[id]
  if (!titulo) throw new Error(`Cláusula desconocida: ${id}`)
  return `Cláusula ${id} — ${titulo}`
}
