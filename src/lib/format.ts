const DAY_MS = 86_400_000

/** 'YYYY-MM-DD' → Date UTC a medianoche (evita desfases de zona horaria). */
export function parseISODate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) throw new Error(`Fecha inválida (se espera YYYY-MM-DD): ${iso}`)
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

export function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10)
}

/** Días completos entre dos fechas ISO (b - a). Puede ser negativo. */
export function daysBetween(a: string, b: string): number {
  return Math.floor((parseISODate(b).getTime() - parseISODate(a).getTime()) / DAY_MS)
}

export function addDays(iso: string, days: number): string {
  return toISODate(new Date(parseISODate(iso).getTime() + days * DAY_MS))
}

/** 'YYYY-MM-DD' → 'dd/MM/yyyy' */
export function formatDate(iso: string): string {
  const d = parseISODate(iso)
  const dd = String(d.getUTCDate()).padStart(2, '0')
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getUTCFullYear()}`
}

/** 1234.5 → 'USD 1,234.50' */
export function formatMoney(n: number): string {
  return `USD ${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}
