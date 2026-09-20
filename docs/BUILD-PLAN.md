# Amparo — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consola pública de pre-autorización quirúrgica que lee informes y pólizas de Notion, adjudica con un motor de reglas determinista (LLM solo extrae y redacta), transmite el razonamiento por SSE y escribe el veredicto de vuelta en Notion; disparable por botón y por webhook.

**Architecture:** Next.js 16 (App Router) sirve la consola y dos route handlers (SSE y webhook). `src/lib/rules` es un motor puro sin I/O; `src/lib/pipeline` orquesta extract → policy → adjudicate → letter → sync emitiendo eventos tipados; `src/lib/notion` encapsula la API v5 (data sources); `scripts/` crea y resetea la demo desde `cases/*.md`.

**Tech Stack:** bun · Next.js 16 · React 19 · TypeScript strict · Tailwind v4 · zod · `@notionhq/client` v5 · `ai` (Vercel AI SDK) + `@openrouter/ai-sdk-provider` · `gray-matter` · `bun test` · Docker/CapRover.

**Spec:** `docs/DISENO.md` (leerlo entero antes de ejecutar cualquier tarea).

## Global Constraints

- Español neutro en TODO texto visible o generado (UI, carta, docs, prompts): sin voseo (`vos`, `tenés`, `elegí`, `acá`…). Usar `tú`/impersonal.
- Nombres del motor fuera de la UI: nada de "LLM", "Zod", "SSE", "prompt" en pantalla. Etapas: "Extractor clínico (IA)", "Auditor de póliza", "Adjudicador", "Carta al hospital", "Registro en Notion".
- Nunca borrar datos en Notion desde el pipeline: reanalizar sobrescribe propiedades y **añade** bloques. Solo `notion:reset` borra bloques, y únicamente los marcados con el centinela `— amparo —`.
- Ningún secreto en el repo. `.env` está en `.gitignore`; `.env.example` documenta cada variable.
- Notion API version `2025-09-03`; `Estado` es `select` (la API no crea `status`).
- Formato: fechas `dd/MM/yyyy`, moneda `USD 1,234.56`.
- Commits `feat:/fix:/docs:/chore:/test:`; sin `Co-Authored-By`; sin `VOR-#`.
- Cada tarea termina con `bun test` verde y `bun run typecheck` verde (`tsc --noEmit`).
- Vigilar el presupuesto de OpenRouter (límite USD 2): los tests unitarios y golden **no** llaman al LLM.

## Mapa de archivos

| Archivo | Responsabilidad |
|---|---|
| `src/lib/rules/types.ts` | Taxonomías (`as const`), tipos de dominio, esquema Zod `ExtractedReportSchema` |
| `src/lib/rules/config.ts` | `RulesConfig` y `DEFAULT_RULES_CONFIG` |
| `src/lib/rules/clauses.ts` | Tabla de cláusulas (id → título) |
| `src/lib/rules/engine.ts` | `adjudicate(input)`: R1..R8 + prioridad + formato de veredicto |
| `src/lib/format.ts` | `formatDate`, `formatMoney`, `daysBetween`, `addDays` |
| `src/lib/cases/schema.ts` | Zod del frontmatter de `cases/*.md` y de `catalogo.json` |
| `src/lib/cases/load.ts` | `loadCatalog()`, `loadCases()` (gray-matter) |
| `src/lib/notion/client.ts` | Cliente singleton + `env()` tipado |
| `src/lib/notion/schema.ts` | Definición de propiedades de las 4 bases para `databases.create` |
| `src/lib/notion/mappers.ts` | Página de Notion → `Policy` / `CatalogEntry` / `ReportMeta` / `Solicitud` y viceversa |
| `src/lib/notion/repo.ts` | Lecturas/escrituras: listar solicitudes, obtener, buscar póliza por cédula, catálogo, lock, guardar veredicto, bloques |
| `src/lib/llm/openrouter.ts` | Provider + `primaryModel`/`fallbackModel` + `withFallback()` |
| `src/lib/pipeline/events.ts` | Tipos `PipelineEvent`, `Emit`, `StepId`, títulos de etapas |
| `src/lib/pipeline/extract.ts` | Prompt + `generateObject` + reintento con error Zod |
| `src/lib/pipeline/policy.ts` | Resolver póliza y catálogo, calcular días/saldo (evidencia) |
| `src/lib/pipeline/letter.ts` | Prompt de la carta + `streamText` + validación del estado literal |
| `src/lib/pipeline/sync.ts` | Escribir propiedades + bloques (carta + traza) en la Solicitud |
| `src/lib/pipeline/run.ts` | `runPreauth(id, emit)` orquestando las 5 etapas con manejo de error |
| `src/lib/sse-client.ts` | Parser SSE sobre `fetch` (POST) para el cliente |
| `src/app/api/health/route.ts` | Salud |
| `src/app/api/solicitudes/[id]/analizar/route.ts` | POST → SSE |
| `src/app/api/webhooks/notion/route.ts` | POST webhook (verificación, firma, filtro, `after()`) |
| `src/app/page.tsx` | Lista de solicitudes |
| `src/app/solicitudes/[id]/page.tsx` | Detalle + análisis |
| `src/components/*` | `SolicitudTable`, `EstadoBadge`, `ReportPane`, `AnalysisPanel`, `StepList`, `RulesTable`, `VerdictCard` |
| `scripts/notion-seed.ts` · `scripts/notion-reset.ts` | Seed y reset |
| `cases/catalogo.json` · `cases/PA-00xx.md` | Datos demo |
| `tests/rules/*.test.ts` · `tests/cases/*.test.ts` · `tests/cases/*.extraction.json` | Unit + golden |
| `docs/equipo/*.md` | Tareas de Cristian y Levi + formato de casos |

**Orden de ejecución y por qué:** 1 scaffold → 2 tipos/config/cláusulas → 3 motor (TDD) → 4 formato de casos + catálogo + 2 casos + golden → **5 docs de equipo (desbloquea a Cristian y Levi)** → 6 esquema Notion → 7 seed (corre contra el workspace real) → 8 repo Notion → 9 LLM → 10 pipeline → 11 SSE → 12 lista → 13 detalle → 14 reset → 15 webhook → 16 deploy → 17 docs finales.

---

### Task 1: Scaffold del proyecto

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx` (placeholder), `src/app/api/health/route.ts`, `.env.example`, `bunfig.toml`, `tests/smoke.test.ts`

**Interfaces:**
- Produces: scripts `bun dev`, `bun run build`, `bun test`, `bun run typecheck`; ruta `GET /api/health`.

- [ ] **Step 1: Crear la app**

```bash
cd /c/amparo && bunx create-next-app@latest . --ts --tailwind --app --src-dir --no-eslint --import-alias "@/*" --use-bun --yes
```
Si pregunta por sobrescribir (existen `docs/`, `.gitignore`, `.env`), aceptar; luego `git checkout -- .gitignore` y volver a añadir `.env` y `.env.local` si el generado no los cubre.

- [ ] **Step 2: Dependencias**

```bash
bun add @notionhq/client ai @openrouter/ai-sdk-provider zod gray-matter
bun add -d @types/bun
```

- [ ] **Step 3: `package.json` scripts** (mantener los de Next; añadir)

```json
"typecheck": "tsc --noEmit",
"test": "bun test",
"notion:seed": "bun run scripts/notion-seed.ts",
"notion:reset": "bun run scripts/notion-reset.ts"
```

- [ ] **Step 4: `next.config.ts`**

```ts
import type { NextConfig } from 'next'
const nextConfig: NextConfig = { output: 'standalone' }
export default nextConfig
```

- [ ] **Step 5: `bunfig.toml`** (para que `bun test` cargue `.env` y solo mire `tests/`)

```toml
[test]
root = "tests"
```

- [ ] **Step 6: `.env.example`**

```bash
# OpenRouter (https://openrouter.ai/keys)
OPENROUTER_API_KEY=
OPENROUTER_MODEL=google/gemini-2.5-flash
OPENROUTER_MODEL_FALLBACK=google/gemini-2.5-pro
# Notion: integración interna (https://www.notion.so/profile/integrations)
NOTION_TOKEN=
# Página padre bajo la que el seed crea "Amparo · Pre-autorización quirúrgica" (compartida con la integración)
NOTION_PARENT_PAGE_ID=
# Los siguientes los escribe `bun run notion:seed` en .env.notion; copiarlos aquí y a CapRover
NOTION_ROOT_PAGE_ID=
NOTION_DS_POLIZAS=
NOTION_DS_CATALOGO=
NOTION_DS_INFORMES=
NOTION_DS_SOLICITUDES=
# Token de verificación que Notion envía al crear la suscripción del webhook
NOTION_WEBHOOK_SECRET=
APP_URL=http://localhost:3010
```

- [ ] **Step 7: Health route** `src/app/api/health/route.ts`

```ts
export const dynamic = 'force-dynamic'
export async function GET() {
  return Response.json({ ok: true, version: process.env.npm_package_version ?? '0.0.0' })
}
```

- [ ] **Step 8: Smoke test** `tests/smoke.test.ts`

```ts
import { describe, expect, it } from 'bun:test'
describe('smoke', () => {
  it('runs', () => expect(1 + 1).toBe(2))
})
```

- [ ] **Step 9: Verificar**

```bash
bun test && bun run typecheck && bun run build
```
Expected: 1 test verde, sin errores de tipos, build ok.

- [ ] **Step 10: Commit**

```bash
git add package.json bun.lock tsconfig.json next.config.ts postcss.config.mjs bunfig.toml .env.example src tests public .gitignore
git commit -m "chore: scaffold Next.js 16 + bun + tailwind v4"
```

---

### Task 2: Tipos de dominio, configuración y cláusulas

**Files:**
- Create: `src/lib/rules/types.ts`, `src/lib/rules/config.ts`, `src/lib/rules/clauses.ts`, `src/lib/format.ts`
- Test: `tests/rules/format.test.ts`, `tests/rules/clauses.test.ts`

**Interfaces:**
- Produces: todas las taxonomías `as const`, tipos `Policy`, `CatalogEntry`, `ReportMeta`, `ExtractedReport`, `RuleResult`, `Adjudication`, `AdjudicationInput`, `RulesConfig`; `ExtractedReportSchema` (Zod); `CLAUSULAS`; `formatDate`, `formatMoney`, `daysBetween`, `addDays`.

- [ ] **Step 1: `src/lib/rules/types.ts`**

```ts
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
  catalogoId: z.string().nullable().describe('ID del catálogo que mejor corresponde al procedimiento propuesto, o null si ninguno encaja'),
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

export type AdjudicationInput = {
  extraction: ExtractedReport
  report: ReportMeta
  policy: Policy | null
  procedure: CatalogEntry | null
  config: RulesConfig
}

export type RulesConfig = {
  carenciaGeneralDias: number
  carenciaPreexistenciaDias: number
  umbralConfianza: number
  tiposQueEximenCarencia: TipoAtencion[]
  lockMinutos: number
}
```

- [ ] **Step 2: `src/lib/rules/config.ts`**

```ts
import type { RulesConfig } from './types'

export const DEFAULT_RULES_CONFIG: RulesConfig = {
  carenciaGeneralDias: 30,
  carenciaPreexistenciaDias: 730,
  umbralConfianza: 0.7,
  tiposQueEximenCarencia: ['Emergencia'],
  lockMinutos: 2,
}
```

- [ ] **Step 3: `src/lib/rules/clauses.ts`**

```ts
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
```

- [ ] **Step 4: `src/lib/format.ts`**

```ts
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
```

- [ ] **Step 5: Tests** `tests/rules/format.test.ts`

```ts
import { describe, expect, it } from 'bun:test'
import { addDays, daysBetween, formatDate, formatMoney } from '@/lib/format'

describe('format', () => {
  it('daysBetween cuenta días completos', () => {
    expect(daysBetween('2026-01-01', '2026-01-31')).toBe(30)
    expect(daysBetween('2026-01-31', '2026-01-01')).toBe(-30)
  })
  it('addDays suma días', () => {
    expect(addDays('2026-01-01', 30)).toBe('2026-01-31')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
  })
  it('formatDate dd/MM/yyyy', () => expect(formatDate('2026-09-18')).toBe('18/09/2026'))
  it('formatMoney USD 1,234.56', () => expect(formatMoney(1234.5)).toBe('USD 1,234.50'))
})
```

`tests/rules/clauses.test.ts`

```ts
import { describe, expect, it } from 'bun:test'
import { clausula } from '@/lib/rules/clauses'

describe('clauses', () => {
  it('formatea una cláusula conocida', () => {
    expect(clausula('4.3')).toBe('Cláusula 4.3 — Carencia por preexistencias declaradas')
  })
  it('falla con cláusula desconocida', () => expect(() => clausula('99')).toThrow())
})
```

- [ ] **Step 6: Verificar y commit**

```bash
bun test && bun run typecheck
git add src/lib tests/rules
git commit -m "feat: tipos de dominio, configuración de reglas, cláusulas y formato"
```
Nota: `bun test` con alias `@/` requiere que `tsconfig.json` tenga `"paths": {"@/*": ["./src/*"]}` (create-next-app lo genera). Si bun no resuelve el alias, usar rutas relativas en tests.

---

### Task 3: Motor de reglas (TDD)

**Files:**
- Create: `src/lib/rules/engine.ts`
- Test: `tests/rules/engine.test.ts`, `tests/rules/fixtures.ts`

**Interfaces:**
- Consumes: tipos de Task 2, `daysBetween`, `addDays`, `formatDate`, `formatMoney`, `clausula`.
- Produces: `adjudicate(input: AdjudicationInput): Adjudication` (pura, síncrona).

- [ ] **Step 1: Fixtures** `tests/rules/fixtures.ts`

```ts
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
```

- [ ] **Step 2: Tests** `tests/rules/engine.test.ts` (escribirlos todos antes de implementar)

```ts
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
    const a = adjudicate(base({ report: { ...reportBase, fecha: '2026-06-01' }, procedure: { ...apendicectomia, exentoEnEmergencia: false } }))
    expect(a.estado).toBe('Rechazada')
  })
  it('urgencia no exime', () => {
    const a = adjudicate(base({ report: { ...reportBase, fecha: '2026-06-01', tipoAtencion: 'Urgencia' } }))
    expect(a.estado).toBe('Rechazada')
  })
  it('preexistencia declarada aplica 730 días incluso en emergencia', () => {
    const a = adjudicate(base({
      policy: { ...policyBase, preexistencias: ['Cardiopatía isquémica'], inicioVigencia: '2025-07-01' },
      procedure: { ...apendicectomia, preexistenciaRelacionada: ['Cardiopatía isquémica'] },
      report: { ...reportBase, fecha: '2026-09-18' },
    }))
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
    const a = adjudicate(base({
      extraction: { ...extractionBase, tipoAtencionInferido: 'Electiva', documentosMencionados: ['Historia clínica'] },
    }))
    expect(a.advertencias.some((w) => w.includes('urgencia'))).toBe(true)
    expect(a.advertencias.some((w) => w.includes('Historia clínica'))).toBe(true)
  })
})
```

- [ ] **Step 3: Correr y ver fallar**

```bash
bun test tests/rules/engine.test.ts
```
Expected: FAIL — `Cannot find module '@/lib/rules/engine'`.

- [ ] **Step 4: Implementar** `src/lib/rules/engine.ts`

```ts
import { addDays, daysBetween, formatDate, formatMoney } from '@/lib/format'
import { clausula } from './clauses'
import type { Adjudication, AdjudicationInput, DocumentoTipo, RuleResult } from './types'

type Ctx = AdjudicationInput & { reglas: RuleResult[] }

function push<T extends RuleResult>(ctx: Ctx, r: T): T {
  ctx.reglas.push(r)
  return r
}
const skip = (ctx: Ctx, id: RuleResult['id'], titulo: string, clausulaId: string | null, por: string) =>
  push(ctx, { id, clausula: clausulaId, titulo, resultado: 'no_aplica', evidencia: `No evaluada: ${por}.` })

function r1Vigencia(ctx: Ctx): RuleResult {
  const { policy, report } = ctx
  const titulo = 'Póliza vigente en la fecha del informe'
  if (!policy) return push(ctx, { id: 'R1', clausula: '2', titulo, resultado: 'no_cumple', evidencia: `No existe póliza asociada a la cédula ${report.cedula}.` })
  if (policy.estado !== 'Vigente') return push(ctx, { id: 'R1', clausula: '2', titulo, resultado: 'no_cumple', evidencia: `La póliza ${policy.numero} está en estado "${policy.estado}".` })
  const dentro = daysBetween(policy.inicioVigencia, report.fecha) >= 0 && daysBetween(report.fecha, policy.finVigencia) >= 0
  if (!dentro) return push(ctx, { id: 'R1', clausula: '2', titulo, resultado: 'no_cumple', evidencia: `El informe (${formatDate(report.fecha)}) está fuera de la vigencia ${formatDate(policy.inicioVigencia)} – ${formatDate(policy.finVigencia)}.` })
  return push(ctx, { id: 'R1', clausula: '2', titulo, resultado: 'cumple', evidencia: `Póliza ${policy.numero} vigente (${formatDate(policy.inicioVigencia)} – ${formatDate(policy.finVigencia)}), plan ${policy.plan}.` })
}

function r2Extraccion(ctx: Ctx): RuleResult {
  const { extraction, procedure, config } = ctx
  const titulo = 'Procedimiento identificado con certeza'
  const ok = extraction.confianza >= config.umbralConfianza && procedure !== null
  const conf = `confianza ${extraction.confianza.toFixed(2)} (umbral ${config.umbralConfianza})`
  if (!ok) {
    const causa = procedure === null ? 'ningún procedimiento del catálogo corresponde al informe' : 'la confianza de la extracción está bajo el umbral'
    return push(ctx, { id: 'R2', clausula: null, titulo, resultado: 'no_cumple', evidencia: `"${extraction.procedimientoTexto}": ${causa}; ${conf}.${extraction.ambiguedades.length ? ' Ambigüedades: ' + extraction.ambiguedades.join('; ') + '.' : ''}` })
  }
  return push(ctx, { id: 'R2', clausula: null, titulo, resultado: 'cumple', evidencia: `"${extraction.procedimientoTexto}" → ${procedure!.procedimiento} (CPT ${procedure!.cpt}); ${conf}.` })
}

function r3Red(ctx: Ctx): RuleResult {
  const { policy, report } = ctx
  const titulo = 'Hospital dentro de la red'
  const ok = policy!.red.includes(report.hospital)
  return push(ctx, { id: 'R3', clausula: '3', titulo, resultado: ok ? 'cumple' : 'no_cumple', evidencia: ok ? `${report.hospital} pertenece a la red de la póliza.` : `${report.hospital} no está en la red: ${policy!.red.join(', ')}.` })
}

function r4Exclusion(ctx: Ctx): RuleResult {
  const p = ctx.procedure!
  const titulo = 'Procedimiento no excluido'
  if (p.excluido) return push(ctx, { id: 'R4', clausula: '5', titulo, resultado: 'no_cumple', evidencia: `${p.procedimiento} está excluido: ${p.motivoExclusion ?? 'sin motivo registrado'}.` })
  return push(ctx, { id: 'R4', clausula: '5', titulo, resultado: 'cumple', evidencia: `${p.procedimiento} no figura entre las exclusiones.` })
}

function r5Plan(ctx: Ctx): RuleResult {
  const p = ctx.procedure!
  const plan = ctx.policy!.plan
  const titulo = 'Cubierto por el plan contratado'
  const ok = p.planes.includes(plan)
  return push(ctx, { id: 'R5', clausula: '6', titulo, resultado: ok ? 'cumple' : 'no_cumple', evidencia: ok ? `El plan ${plan} cubre ${p.procedimiento}.` : `El plan ${plan} no cubre ${p.procedimiento} (cubierto en: ${p.planes.join(', ')}).` })
}

function r6Carencia(ctx: Ctx): RuleResult & { datos: { elegibleDesde?: string; clausulaAplicada: string } } {
  const { policy, report, procedure, config } = ctx
  const p = procedure!
  const pol = policy!
  const titulo = 'Período de carencia cumplido'
  const dias = daysBetween(pol.inicioVigencia, report.fecha)
  const preexistentes = p.preexistenciaRelacionada.filter((x) => pol.preexistencias.includes(x))
  const base = Math.max(config.carenciaGeneralDias, p.carenciaDias)
  const clausulaBase = p.carenciaDias > config.carenciaGeneralDias ? '4.2' : '4.1'
  const aplicable = preexistentes.length ? Math.max(base, config.carenciaPreexistenciaDias) : base
  const clausulaAplicada = preexistentes.length ? '4.3' : clausulaBase
  const exento = config.tiposQueEximenCarencia.includes(report.tipoAtencion) && p.exentoEnEmergencia && preexistentes.length === 0
  const datos = { diasTranscurridos: dias, carenciaAplicable: aplicable, exento, preexistentes, clausulaAplicada }
  if (exento) return push(ctx, { id: 'R6', clausula: '4.4', titulo, resultado: 'cumple', evidencia: `Atención de ${report.tipoAtencion}: ${p.procedimiento} está exento de carencia en emergencias (${dias} días transcurridos de ${aplicable}).`, datos })
  if (dias >= aplicable) return push(ctx, { id: 'R6', clausula: clausulaAplicada, titulo, resultado: 'cumple', evidencia: `${dias} días desde el inicio de vigencia; carencia aplicable ${aplicable} días.`, datos })
  const elegibleDesde = addDays(pol.inicioVigencia, aplicable)
  const porQue = preexistentes.length ? `preexistencia declarada (${preexistentes.join(', ')}) eleva la carencia a ${aplicable} días` : `carencia de ${aplicable} días para ${p.procedimiento}`
  const nota = preexistentes.length && config.tiposQueEximenCarencia.includes(report.tipoAtencion) ? ' La emergencia no exime la carencia por preexistencia.' : ''
  return push(ctx, { id: 'R6', clausula: clausulaAplicada, titulo, resultado: 'no_cumple', evidencia: `${dias} días transcurridos; ${porQue}. Elegible desde ${formatDate(elegibleDesde)}.${nota}`, datos: { ...datos, elegibleDesde } })
}

function r7Documentos(ctx: Ctx): RuleResult & { datos: { faltantes: DocumentoTipo[] } } {
  const p = ctx.procedure!
  const titulo = 'Documentación completa'
  const faltantes = p.documentosRequeridos.filter((d) => !ctx.report.adjuntos.includes(d))
  const datos = { requeridos: p.documentosRequeridos, adjuntos: ctx.report.adjuntos, faltantes }
  if (faltantes.length) return push(ctx, { id: 'R7', clausula: '7', titulo, resultado: 'no_cumple', evidencia: `Faltan: ${faltantes.join(', ')}.`, datos })
  return push(ctx, { id: 'R7', clausula: '7', titulo, resultado: 'cumple', evidencia: `Adjuntos los ${p.documentosRequeridos.length} documentos requeridos.`, datos })
}

function r8Monto(ctx: Ctx): RuleResult & { datos: { saldo: number; tope: number } } {
  const pol = ctx.policy!
  const p = ctx.procedure!
  const titulo = 'Presupuesto dentro de la suma asegurada'
  const saldo = pol.sumaAsegurada - pol.montoConsumido
  const tope = p.montoMaximo !== undefined ? Math.min(saldo, p.montoMaximo) : saldo
  const datos = { saldo, tope, presupuesto: ctx.report.presupuesto, montoMaximo: p.montoMaximo ?? null }
  if (saldo <= 0) return push(ctx, { id: 'R8', clausula: '8', titulo, resultado: 'no_cumple', evidencia: `Suma asegurada agotada (consumido ${formatMoney(pol.montoConsumido)} de ${formatMoney(pol.sumaAsegurada)}).`, datos })
  if (ctx.report.presupuesto > tope) return push(ctx, { id: 'R8', clausula: '8', titulo, resultado: 'no_cumple', evidencia: `Presupuesto ${formatMoney(ctx.report.presupuesto)} excede el tope ${formatMoney(tope)} (saldo ${formatMoney(saldo)}${p.montoMaximo !== undefined ? `, máximo del procedimiento ${formatMoney(p.montoMaximo)}` : ''}).`, datos })
  return push(ctx, { id: 'R8', clausula: '8', titulo, resultado: 'cumple', evidencia: `Presupuesto ${formatMoney(ctx.report.presupuesto)} dentro del tope ${formatMoney(tope)}.`, datos })
}

function advertencias(ctx: Ctx): string[] {
  const out: string[] = []
  const { extraction, report } = ctx
  if (extraction.tipoAtencionInferido !== report.tipoAtencion) out.push(`Inconsistencia de urgencia: el hospital declara "${report.tipoAtencion}" pero el informe describe una atención "${extraction.tipoAtencionInferido}".`)
  for (const d of extraction.documentosMencionados) if (!report.adjuntos.includes(d)) out.push(`El informe menciona "${d}" pero no está adjunto.`)
  return out
}

export function adjudicate(input: AdjudicationInput): Adjudication {
  const ctx: Ctx = { ...input, reglas: [] }
  const common = { reglas: ctx.reglas, documentosFaltantes: [] as DocumentoTipo[], advertencias: [] as string[] }
  const finish = (a: Omit<Adjudication, 'reglas' | 'advertencias'>): Adjudication => ({ ...a, reglas: ctx.reglas, advertencias: advertencias(ctx) })

  const r1 = r1Vigencia(ctx)
  const r2 = r2Extraccion(ctx)
  if (r1.resultado === 'no_cumple') {
    for (const [id, t, c] of [['R3', 'Hospital dentro de la red', '3'], ['R4', 'Procedimiento no excluido', '5'], ['R5', 'Cubierto por el plan contratado', '6'], ['R6', 'Período de carencia cumplido', '4.1'], ['R7', 'Documentación completa', '7'], ['R8', 'Presupuesto dentro de la suma asegurada', '8']] as const) skip(ctx, id, t, c, 'la póliza no está vigente')
    return finish({ ...common, estado: 'Rechazada', veredicto: 'Rechazada: sin cobertura vigente', motivo: r1.evidencia, clausulas: ['2'] })
  }
  if (r2.resultado === 'no_cumple') {
    const r3 = r3Red(ctx)
    for (const [id, t, c] of [['R4', 'Procedimiento no excluido', '5'], ['R5', 'Cubierto por el plan contratado', '6'], ['R6', 'Período de carencia cumplido', '4.1'], ['R7', 'Documentación completa', '7'], ['R8', 'Presupuesto dentro de la suma asegurada', '8']] as const) skip(ctx, id, t, c, 'no se identificó el procedimiento')
    void r3
    return finish({ ...common, estado: 'Documentos faltantes', veredicto: 'Documentos faltantes: informe médico ampliado', motivo: `${r2.evidencia} Se requiere un informe médico ampliado que especifique el procedimiento propuesto.`, clausulas: ['7'], documentosFaltantes: ['Informe médico'] })
  }
  const r3 = r3Red(ctx)
  const r4 = r4Exclusion(ctx)
  const r5 = r5Plan(ctx)
  const r6 = r6Carencia(ctx)
  const r7 = r7Documentos(ctx)
  const r8 = r8Monto(ctx)
  const p = ctx.procedure!
  const nombre = `${p.procedimiento} (CPT ${p.cpt})`

  if (r3.resultado === 'no_cumple') return finish({ ...common, estado: 'Rechazada', veredicto: 'Rechazada: hospital fuera de la red', motivo: r3.evidencia, clausulas: ['3'] })
  if (r4.resultado === 'no_cumple') return finish({ ...common, estado: 'Rechazada', veredicto: `Rechazada: ${p.procedimiento} es un procedimiento excluido`, motivo: r4.evidencia, clausulas: ['5'] })
  if (r5.resultado === 'no_cumple') return finish({ ...common, estado: 'Rechazada', veredicto: `Rechazada: ${nombre} no está cubierto por el plan ${ctx.policy!.plan}`, motivo: r5.evidencia, clausulas: ['6'] })
  if (r6.resultado === 'no_cumple') return finish({ ...common, estado: 'Rechazada', veredicto: `Rechazada por carencia: elegible desde ${formatDate(r6.datos.elegibleDesde!)}`, motivo: r6.evidencia, clausulas: [r6.datos.clausulaAplicada], elegibleDesde: r6.datos.elegibleDesde })
  if (r8.resultado === 'no_cumple' && r8.datos.saldo <= 0) return finish({ ...common, estado: 'Rechazada', veredicto: 'Rechazada: suma asegurada agotada', motivo: r8.evidencia, clausulas: ['8'] })
  if (r7.resultado === 'no_cumple') return finish({ ...common, estado: 'Documentos faltantes', veredicto: `Documentos faltantes: ${r7.datos.faltantes.join(', ')}`, motivo: `${nombre} es elegible, pero ${r7.evidencia.toLowerCase()}`, clausulas: ['7'], documentosFaltantes: r7.datos.faltantes })
  if (r8.resultado === 'no_cumple') return finish({ ...common, estado: 'Preaprobada', veredicto: `Preaprobada hasta ${formatMoney(r8.datos.tope)}: ${nombre}`, motivo: `${r8.evidencia} El excedente queda a cargo del paciente.`, clausulas: ['8'], topeAprobado: r8.datos.tope })
  return finish({ ...common, estado: 'Preaprobada', veredicto: `Preaprobada: ${nombre} cubierta por el plan ${ctx.policy!.plan}`, motivo: `Cumple vigencia, red, plan, carencia, documentación y monto (${formatMoney(ctx.report.presupuesto)} de ${formatMoney(r8.datos.tope)} disponibles).`, clausulas: [] })
}
```

- [ ] **Step 5: Correr hasta verde**

```bash
bun test tests/rules && bun run typecheck
```
Expected: todos PASS. `push` es genérico para que r6/r7/r8 conserven el tipo de `datos`; si el typecheck se queja del tipo de retorno declarado, quitar la anotación de retorno de esas tres funciones y dejar que TypeScript la infiera.

- [ ] **Step 6: Commit**

```bash
git add src/lib/rules/engine.ts tests/rules
git commit -m "feat: motor de reglas determinista R1-R8 con tests"
```

---

### Task 4: Formato de casos, catálogo, dos casos y golden tests

**Files:**
- Create: `src/lib/cases/schema.ts`, `src/lib/cases/load.ts`, `cases/catalogo.json`, `cases/PA-0001.md`, `cases/PA-0003.md`, `tests/cases/PA-0001.extraction.json`, `tests/cases/PA-0003.extraction.json`
- Test: `tests/cases/golden.test.ts`, `tests/cases/load.test.ts`

**Interfaces:**
- Consumes: tipos y taxonomías de Task 2, `adjudicate` de Task 3.
- Produces: `loadCatalog(): CatalogEntry[]`, `loadCases(): CaseFile[]`, tipo `CaseFile = CaseFrontmatter & { prosa: string }` donde `CaseFrontmatter = { id, titulo, esperado, motivoEsperado, poliza: Policy | null, informe: ReportMeta }`.

- [ ] **Step 1: `src/lib/cases/schema.ts`**

```ts
import { z } from 'zod'
import { CATEGORIAS, DOCUMENTOS, ESTADOS_POLIZA, HOSPITALES, PLANES, PREEXISTENCIAS, TIPOS_ATENCION } from '@/lib/rules/types'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'YYYY-MM-DD')

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
  cedula: z.string().regex(/^\d{10}$/),
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
  cedula: z.string().regex(/^\d{10}$/),
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
```

Nota YAML: las fechas del frontmatter deben ir **entre comillas** (`"2026-05-15"`); sin comillas, YAML las convierte a `Date` y el esquema las rechaza. Las cédulas también entre comillas (empiezan por cero).

- [ ] **Step 2: `src/lib/cases/load.ts`**

```ts
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import matter from 'gray-matter'
import type { CatalogEntry } from '@/lib/rules/types'
import { CaseFrontmatter, CatalogSchema } from './schema'

const CASES_DIR = join(process.cwd(), 'cases')

export type CaseFile = CaseFrontmatter & { prosa: string }

export function loadCatalog(): CatalogEntry[] {
  const raw = JSON.parse(readFileSync(join(CASES_DIR, 'catalogo.json'), 'utf8'))
  return CatalogSchema.parse(raw)
}

export function loadCases(): CaseFile[] {
  return readdirSync(CASES_DIR)
    .filter((f) => /^PA-\d{4}\.md$/.test(f))
    .sort()
    .map((f) => {
      const { data, content } = matter(readFileSync(join(CASES_DIR, f), 'utf8'))
      const fm = CaseFrontmatter.parse(data)
      if (`${fm.id}.md` !== f) throw new Error(`${f}: el id del frontmatter (${fm.id}) no coincide con el nombre del archivo`)
      const prosa = content.trim()
      if (prosa.split(/\s+/).length < 80) throw new Error(`${f}: la prosa del informe debe tener al menos 80 palabras`)
      return { ...fm, prosa }
    })
}
```

- [ ] **Step 3: `cases/catalogo.json`** (13 entradas)

```json
[
  { "id": "apendicectomia-laparoscopica", "procedimiento": "Apendicectomía laparoscópica", "cpt": "44970", "cie10": "K35.80", "categoria": "Cirugía general", "planes": ["Básico", "Plus", "Premium"], "carenciaDias": 90, "exentoEnEmergencia": true, "excluido": false, "preexistenciaRelacionada": [], "documentosRequeridos": ["Informe médico", "Exámenes de laboratorio", "Imagenología", "Presupuesto hospitalario"] },
  { "id": "artroscopia-rodilla", "procedimiento": "Artroscopia de rodilla", "cpt": "29881", "cie10": "M23.2", "categoria": "Ortopedia", "planes": ["Básico", "Plus", "Premium"], "carenciaDias": 90, "exentoEnEmergencia": false, "excluido": false, "preexistenciaRelacionada": ["Artrosis"], "documentosRequeridos": ["Informe médico", "Imagenología", "Presupuesto hospitalario"] },
  { "id": "colecistectomia-laparoscopica", "procedimiento": "Colecistectomía laparoscópica", "cpt": "47562", "cie10": "K80.20", "categoria": "Cirugía general", "planes": ["Básico", "Plus", "Premium"], "carenciaDias": 90, "exentoEnEmergencia": true, "excluido": false, "preexistenciaRelacionada": [], "documentosRequeridos": ["Informe médico", "Exámenes de laboratorio", "Imagenología", "Presupuesto hospitalario"] },
  { "id": "cesarea", "procedimiento": "Cesárea", "cpt": "59510", "cie10": "O82", "categoria": "Maternidad", "planes": ["Básico", "Plus", "Premium"], "carenciaDias": 300, "exentoEnEmergencia": false, "excluido": false, "preexistenciaRelacionada": [], "documentosRequeridos": ["Informe médico", "Imagenología", "Exámenes de laboratorio", "Presupuesto hospitalario"] },
  { "id": "rinoplastia-estetica", "procedimiento": "Rinoplastia estética", "cpt": "30400", "cie10": "Z41.1", "categoria": "Estética", "planes": [], "carenciaDias": 0, "exentoEnEmergencia": false, "excluido": true, "motivoExclusion": "Procedimiento con finalidad estética, sin indicación funcional (cláusula 5.1)", "preexistenciaRelacionada": [], "documentosRequeridos": ["Informe médico"] },
  { "id": "septoplastia-funcional", "procedimiento": "Septoplastia funcional", "cpt": "30520", "cie10": "J34.2", "categoria": "Otorrinolaringología", "planes": ["Básico", "Plus", "Premium"], "carenciaDias": 90, "exentoEnEmergencia": false, "excluido": false, "preexistenciaRelacionada": [], "documentosRequeridos": ["Informe médico", "Imagenología", "Presupuesto hospitalario"] },
  { "id": "bypass-coronario", "procedimiento": "Bypass coronario (revascularización miocárdica)", "cpt": "33533", "cie10": "I25.10", "categoria": "Cardiovascular", "planes": ["Plus", "Premium"], "carenciaDias": 180, "exentoEnEmergencia": true, "excluido": false, "preexistenciaRelacionada": ["Cardiopatía isquémica", "Hipertensión"], "documentosRequeridos": ["Informe médico", "Exámenes de laboratorio", "Imagenología", "Segunda opinión", "Presupuesto hospitalario"] },
  { "id": "reemplazo-total-cadera", "procedimiento": "Reemplazo total de cadera", "cpt": "27130", "cie10": "M16.1", "categoria": "Ortopedia", "planes": ["Plus", "Premium"], "carenciaDias": 180, "exentoEnEmergencia": false, "excluido": false, "preexistenciaRelacionada": ["Artrosis"], "documentosRequeridos": ["Informe médico", "Imagenología", "Presupuesto hospitalario", "Consentimiento informado"] },
  { "id": "herniorrafia-inguinal", "procedimiento": "Herniorrafia inguinal", "cpt": "49505", "cie10": "K40.90", "categoria": "Cirugía general", "planes": ["Básico", "Plus", "Premium"], "carenciaDias": 90, "exentoEnEmergencia": true, "excluido": false, "preexistenciaRelacionada": [], "documentosRequeridos": ["Informe médico", "Exámenes de laboratorio", "Presupuesto hospitalario"], "montoMaximo": 4000 },
  { "id": "amigdalectomia", "procedimiento": "Amigdalectomía", "cpt": "42826", "cie10": "J35.01", "categoria": "Otorrinolaringología", "planes": ["Básico", "Plus", "Premium"], "carenciaDias": 90, "exentoEnEmergencia": false, "excluido": false, "preexistenciaRelacionada": [], "documentosRequeridos": ["Informe médico", "Exámenes de laboratorio", "Presupuesto hospitalario"] },
  { "id": "histerectomia", "procedimiento": "Histerectomía", "cpt": "58150", "cie10": "D25.9", "categoria": "Cirugía general", "planes": ["Plus", "Premium"], "carenciaDias": 180, "exentoEnEmergencia": false, "excluido": false, "preexistenciaRelacionada": [], "documentosRequeridos": ["Informe médico", "Imagenología", "Exámenes de laboratorio", "Segunda opinión", "Presupuesto hospitalario"] },
  { "id": "facoemulsificacion-catarata", "procedimiento": "Facoemulsificación de catarata", "cpt": "66984", "cie10": "H25.9", "categoria": "Oftalmología", "planes": ["Básico", "Plus", "Premium"], "carenciaDias": 180, "exentoEnEmergencia": false, "excluido": false, "preexistenciaRelacionada": ["Diabetes tipo 2"], "documentosRequeridos": ["Informe médico", "Presupuesto hospitalario"] },
  { "id": "bypass-gastrico", "procedimiento": "Bypass gástrico", "cpt": "43644", "cie10": "E66.01", "categoria": "Bariátrica", "planes": ["Premium"], "carenciaDias": 365, "exentoEnEmergencia": false, "excluido": false, "preexistenciaRelacionada": ["Obesidad", "Diabetes tipo 2"], "documentosRequeridos": ["Informe médico", "Exámenes de laboratorio", "Historia clínica", "Segunda opinión", "Presupuesto hospitalario"] }
]
```

- [ ] **Step 4: `cases/PA-0001.md`** (Jose)

```markdown
---
id: PA-0001
titulo: Apendicectomía laparoscópica de emergencia
esperado: Preaprobada
motivoEsperado: Emergencia exime la carencia de 90 días; documentación completa; presupuesto dentro del saldo.
poliza:
  numero: POL-2025-0141
  asegurado: María Fernanda López Cedeño
  cedula: "0923456789"
  fechaNacimiento: "1991-04-12"
  plan: Básico
  estado: Vigente
  inicioVigencia: "2026-05-15"
  finVigencia: "2027-05-14"
  sumaAsegurada: 20000
  montoConsumido: 350
  preexistencias: []
  red: [Hospital Alcívar, Clínica Kennedy, Hospital Clínica San Francisco]
informe:
  id: INF-0001
  paciente: María Fernanda López Cedeño
  cedula: "0923456789"
  hospital: Clínica Kennedy
  medico: Dr. Andrés Villacís Mora
  fecha: "2026-09-18"
  tipoAtencion: Emergencia
  adjuntos: [Informe médico, Exámenes de laboratorio, Imagenología, Presupuesto hospitalario]
  presupuesto: 3800
---

**Paciente:** María Fernanda López Cedeño, 35 años, femenina. **Ingreso:** 18/09/2026, 02:40, servicio de Emergencia.

**Motivo de consulta:** dolor abdominal de 18 horas de evolución, inicialmente periumbilical y luego localizado en fosa ilíaca derecha, acompañado de náusea, un episodio de vómito y fiebre de 38.4 °C.

**Examen físico:** abdomen doloroso a la palpación en fosa ilíaca derecha con signo de Blumberg positivo y defensa localizada. Signo de Rovsing positivo. Sin masas palpables. Frecuencia cardíaca 104 lpm, presión arterial 118/76 mmHg.

**Exámenes complementarios:** leucocitosis de 16,800/µL con neutrofilia del 84 %; PCR 62 mg/L. Ecografía abdominal: apéndice cecal de 11 mm de diámetro, no compresible, con líquido periapendicular escaso; sin colecciones. Se adjuntan los resultados de laboratorio y el informe ecográfico.

**Diagnóstico:** apendicitis aguda no complicada (CIE-10 K35.80).

**Plan:** se indica apendicectomía laparoscópica de urgencia en las próximas 6 horas, bajo anestesia general, con profilaxis antibiótica (cefazolina + metronidazol). Riesgo quirúrgico ASA I. Estancia estimada 24-48 horas. Se adjunta el presupuesto hospitalario por USD 3,800.00 que incluye honorarios, insumos, quirófano y hospitalización.

Dr. Andrés Villacís Mora — Cirugía general — Reg. 1712-09-4451
```

- [ ] **Step 5: `cases/PA-0003.md`** (Jose)

```markdown
---
id: PA-0003
titulo: Colecistectomía laparoscópica sin imagenología ni presupuesto
esperado: Documentos faltantes
motivoEsperado: Cumple vigencia, red, plan y carencia; faltan Imagenología y Presupuesto hospitalario.
poliza:
  numero: POL-2024-0877
  asegurado: Carlos Alberto Mendoza Ruiz
  cedula: "0912345678"
  fechaNacimiento: "1978-11-03"
  plan: Plus
  estado: Vigente
  inicioVigencia: "2024-10-01"
  finVigencia: "2026-09-30"
  sumaAsegurada: 35000
  montoConsumido: 4200
  preexistencias: [Hipertensión]
  red: [Hospital Alcívar, Clínica Kennedy, Omni Hospital, Hospital Luis Vernaza]
informe:
  id: INF-0003
  paciente: Carlos Alberto Mendoza Ruiz
  cedula: "0912345678"
  hospital: Omni Hospital
  medico: Dra. Paulina Sáenz Guerrero
  fecha: "2026-09-15"
  tipoAtencion: Electiva
  adjuntos: [Informe médico, Exámenes de laboratorio]
  presupuesto: 5200
---

**Paciente:** Carlos Alberto Mendoza Ruiz, 47 años, masculino. **Consulta externa de Cirugía general,** 15/09/2026.

**Antecedentes:** hipertensión arterial controlada con losartán 50 mg/día. Sin cirugías previas. No alergias conocidas.

**Enfermedad actual:** cuadro de tres meses de evolución con episodios recurrentes de dolor en hipocondrio derecho posprandial, de 30 a 90 minutos de duración, irradiado a escápula derecha, asociado a náusea. El último episodio, hace diez días, motivó consulta en emergencia donde se manejó con analgesia y se dio alta con indicación de valoración quirúrgica.

**Examen físico:** abdomen blando, depresible, con dolor leve a la palpación profunda en hipocondrio derecho, signo de Murphy negativo en este momento. Sin ictericia.

**Exámenes:** hemograma normal, bilirrubinas y transaminasas dentro de rangos, fosfatasa alcalina 98 U/L. La ecografía realizada en emergencia describió vesícula con múltiples litos de hasta 14 mm y pared de 3 mm, sin dilatación de la vía biliar; ese informe ecográfico fue entregado al paciente y no se adjunta a esta solicitud.

**Diagnóstico:** colelitiasis sintomática (CIE-10 K80.20).

**Plan:** colecistectomía laparoscópica electiva, a programar en las próximas tres semanas. Estancia estimada 24 horas. El presupuesto hospitalario se encuentra en elaboración por el departamento de admisiones y será remitido a la aseguradora.

Dra. Paulina Sáenz Guerrero — Cirugía general — Reg. 0918-11-2207
```

- [ ] **Step 6: Extracciones esperadas** `tests/cases/PA-0001.extraction.json`

```json
{
  "catalogoId": "apendicectomia-laparoscopica",
  "procedimientoTexto": "apendicectomía laparoscópica de urgencia",
  "diagnostico": "Apendicitis aguda no complicada",
  "cie10Sugerido": "K35.80",
  "especialidad": "Cirugía general",
  "tipoAtencionInferido": "Emergencia",
  "justificacionClinica": "Dolor en fosa ilíaca derecha con Blumberg positivo, leucocitosis y ecografía con apéndice de 11 mm no compresible.",
  "documentosMencionados": ["Exámenes de laboratorio", "Imagenología", "Presupuesto hospitalario"],
  "esEstetico": false,
  "confianza": 0.96,
  "ambiguedades": []
}
```

`tests/cases/PA-0003.extraction.json`

```json
{
  "catalogoId": "colecistectomia-laparoscopica",
  "procedimientoTexto": "colecistectomía laparoscópica electiva",
  "diagnostico": "Colelitiasis sintomática",
  "cie10Sugerido": "K80.20",
  "especialidad": "Cirugía general",
  "tipoAtencionInferido": "Electiva",
  "justificacionClinica": "Episodios recurrentes de cólico biliar con ecografía que describe múltiples litos vesiculares de hasta 14 mm.",
  "documentosMencionados": ["Exámenes de laboratorio", "Imagenología"],
  "esEstetico": false,
  "confianza": 0.94,
  "ambiguedades": []
}
```

- [ ] **Step 7: Golden test** `tests/cases/golden.test.ts`

```ts
import { describe, expect, it } from 'bun:test'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadCases, loadCatalog } from '@/lib/cases/load'
import { DEFAULT_RULES_CONFIG } from '@/lib/rules/config'
import { adjudicate } from '@/lib/rules/engine'
import { ExtractedReportSchema } from '@/lib/rules/types'

const catalog = loadCatalog()
const cases = loadCases()

describe('golden: cada caso con extracción fija produce el veredicto esperado', () => {
  for (const c of cases) {
    const file = join(process.cwd(), 'tests', 'cases', `${c.id}.extraction.json`)
    const run = existsSync(file) ? it : it.skip
    run(`${c.id} → ${c.esperado}`, () => {
      const extraction = ExtractedReportSchema.parse(JSON.parse(readFileSync(file, 'utf8')))
      const procedure = extraction.catalogoId ? (catalog.find((p) => p.id === extraction.catalogoId) ?? null) : null
      if (extraction.catalogoId && !procedure) throw new Error(`${c.id}: catalogoId ${extraction.catalogoId} no existe en el catálogo`)
      const a = adjudicate({ extraction, report: c.informe, policy: c.poliza, procedure, config: DEFAULT_RULES_CONFIG })
      expect(a.estado).toBe(c.esperado)
    })
  }
})
```

`tests/cases/load.test.ts`

```ts
import { describe, expect, it } from 'bun:test'
import { loadCases, loadCatalog } from '@/lib/cases/load'

describe('cases', () => {
  it('el catálogo valida y tiene ids únicos', () => {
    const c = loadCatalog()
    expect(c.length).toBeGreaterThanOrEqual(13)
    expect(new Set(c.map((x) => x.id)).size).toBe(c.length)
  })
  it('los casos validan y tienen ids únicos', () => {
    const cs = loadCases()
    expect(cs.length).toBeGreaterThanOrEqual(2)
    expect(new Set(cs.map((x) => x.id)).size).toBe(cs.length)
  })
})
```

- [ ] **Step 8: Verificar y commit**

```bash
bun test && bun run typecheck
git add src/lib/cases cases tests/cases
git commit -m "feat: formato de casos, catálogo de procedimientos, casos PA-0001/PA-0003 y golden tests"
```

---

### Task 5: Documentos del equipo (desbloquea a Cristian y Levi)

**Files:**
- Create: `docs/equipo/FORMATO-CASOS.md`, `docs/equipo/CRISTIAN.md`, `docs/equipo/LEVI.md`, `docs/CONDICIONES-GENERALES.md` (esqueleto con las cláusulas, Levi lo redacta)

**Interfaces:**
- Consumes: el formato de Task 4 (frontmatter + prosa), la matriz de casos de `docs/DISENO.md` §3 y las taxonomías de Task 2 (copiadas literalmente en el doc: son las únicas palabras válidas).

- [ ] **Step 1: `docs/equipo/FORMATO-CASOS.md`** — contiene, en este orden: (1) qué es un caso y por qué vive en el repo; (2) el archivo `cases/PA-0001.md` completo como ejemplo; (3) tabla de campos del frontmatter con tipo, ejemplo y regla (fechas y cédulas entre comillas; cédula ecuatoriana de 10 dígitos; `poliza: null` solo para el caso "sin póliza"); (4) las listas cerradas copiadas de `src/lib/rules/types.ts` (planes, estados, tipos de atención, documentos, preexistencias, hospitales); (5) guía de la prosa: 150-400 palabras, estructura Paciente / Motivo / Examen / Exámenes / Diagnóstico con CIE-10 / Plan con el procedimiento y el presupuesto, español neutro, sin nombrar el procedimiento del catálogo en el frontmatter (el agente debe inferirlo); (6) cómo lograr cada veredicto esperado (qué fecha de vigencia produce carencia, qué adjuntos faltan, etc.); (7) cómo probar localmente: `bun test tests/cases` (el caso se salta si no existe su `.extraction.json`, y eso está bien: Jose los escribe); (8) cómo entregar: rama `casos/<nombre>`, un commit por caso `feat(cases): PA-00xx <título>`, PR a `main`.

- [ ] **Step 2: `docs/equipo/CRISTIAN.md`** — encabezado con el contexto en 5 líneas (qué es Amparo, qué evalúan, fecha de entrega 21/09, dónde está la spec). Tareas numeradas con entregable, archivo, criterio de "hecho" y hora objetivo:
  1. Leer `FORMATO-CASOS.md` y `cases/PA-0001.md` (20 min).
  2. Casos **PA-0002** (artroscopia de rodilla, electiva, póliza con 45 días → Rechazada por carencia), **PA-0004** (cesárea, póliza 7 meses → Rechazada por carencia 300 días), **PA-0005** (rinoplastia estética → Rechazada por exclusión; la prosa debe dejar claro que la finalidad es estética), **PA-0006** (septoplastia funcional por desviación septal con obstrucción nasal documentada → Preaprobada; la prosa NO debe sonar estética). Cada uno con su tabla de por qué da ese veredicto. Hora objetivo: 20/09 13:00.
  3. `docs/CASOS.md`: tabla con las 12 filas (ID, título, veredicto esperado, regla que lo decide, cláusula) y una columna vacía "Obtenido" para el QA del 21. Hora objetivo: 20/09 16:00.
  4. Borrador del correo de envío a `hackiathon@viamatica.com` en `docs/CORREO-ENVIO.md`: asunto, 6-8 líneas, enlace demo, enlace repo, cómo probar el tiempo real, equipo. Hora objetivo: 20/09 18:00.
  5. QA del 21/09 (mañana): correr PA-0001 a PA-0006 en la demo pública y anotar "Obtenido" + hora + observaciones en `docs/CASOS.md`.
  Reglas: español neutro; no editar nada fuera de `cases/` y `docs/` sin avisar; no tocar Notion a mano; preguntas en el chat del equipo con el ID del caso.

- [ ] **Step 3: `docs/equipo/LEVI.md`** — mismo encabezado. Tareas:
  1. Leer `FORMATO-CASOS.md`, `cases/PA-0001.md` y `docs/DISENO.md` §4 (30 min).
  2. Redactar `docs/CONDICIONES-GENERALES.md` a partir del esqueleto: para cada cláusula (2, 3, 4.1, 4.2, 4.3, 4.4, 5, 5.1, 6, 7, 8) un párrafo de 3-6 líneas en lenguaje de póliza, coherente con los parámetros (30 días general, 730 preexistencia, emergencia exime salvo preexistencia, documentos por procedimiento, tope = saldo o máximo del procedimiento). Hora objetivo: 20/09 12:00.
  3. Casos **PA-0007** (bypass coronario, preexistencia "Cardiopatía isquémica" declarada, póliza Plus con 14 meses → Rechazada por carencia de preexistencia), **PA-0008** (reemplazo de cadera, plan Básico → Rechazada: no cubierto por el plan), **PA-0009** (herniorrafia inguinal, presupuesto 5,600 con saldo 2,900 → Preaprobada con tope), **PA-0010** (`poliza: null`, cédula sin póliza → Rechazada: sin cobertura vigente), **PA-0011** (amigdalectomía en Hospital Metropolitano (Quito) fuera de la red → Rechazada: fuera de red), **PA-0012** (informe ambiguo: dolor lumbar crónico con "valoración quirúrgica a definir", sin procedimiento concreto → Documentos faltantes: informe ampliado). Hora objetivo: 20/09 17:00.
  4. Guion del GIF de 20 s (qué se clickea, qué se ve) en `docs/DEMO-GUION.md`. Hora objetivo: 20/09 19:00.
  5. QA del 21/09 (mañana): correr PA-0007 a PA-0012 en la demo pública + probar el webhook (cambiar una solicitud a `Pendiente` en Notion y ver que se analiza sola), anotar en `docs/CASOS.md`; grabar el GIF y 4 capturas (lista, detalle en curso, veredicto preaprobado, veredicto rechazado) en `docs/media/`.
  Mismas reglas que Cristian.

- [ ] **Step 4: `docs/CONDICIONES-GENERALES.md`** (esqueleto): título "Condiciones Generales — Plan de Salud Amparo (documento demo)", nota de que es ficticio para el HackIAthon, y las 11 cláusulas como encabezados `## Cláusula 4.3 — Carencia por preexistencias declaradas` seguidos de `_(Levi: redactar)_`.

- [ ] **Step 5: Commit y aviso**

```bash
git add docs/equipo docs/CONDICIONES-GENERALES.md
git commit -m "docs: tareas de Cristian y Levi, formato de casos y esqueleto de condiciones generales"
```
Crear el repo `vorluno/amparo` (público) y hacer el primer push para que ellos puedan clonar: `gh repo create vorluno/amparo --public --source=. --push`. Verificar antes que `.env` no está en el árbol: `git ls-files | grep -c '^.env$'` debe dar 0.

---

### Task 6: Esquema de Notion, cliente y mappers

**Files:**
- Create: `src/lib/notion/client.ts`, `src/lib/notion/schema.ts`, `src/lib/notion/mappers.ts`
- Test: `tests/notion/mappers.test.ts`

**Interfaces:**
- Produces: `notion()` (cliente singleton), `notionEnv()` (data source IDs), `P` (nombres de propiedades), `dbSchemas(dsIds)` (definiciones para `databases.create`), `SOLICITUD_ESTADO_COLORS`; tipo `Solicitud`; `toPolicy(page)`, `toCatalogEntry(page)`, `toReportMeta(page)`, `toSolicitud(page)`; `policyProps(p)`, `catalogProps(c)`, `reportProps(r)`, `solicitudSeedProps(...)`, `verdictProps(...)`, `prosaToBlocks(prosa)`, `blocksToProsa(blocks)`.

- [ ] **Step 1: `src/lib/notion/client.ts`**

```ts
import { Client } from '@notionhq/client'

let client: Client | undefined

export function notion(): Client {
  if (!client) {
    const auth = process.env.NOTION_TOKEN
    if (!auth) throw new Error('Falta NOTION_TOKEN')
    client = new Client({ auth, notionVersion: '2025-09-03' })
  }
  return client
}

function required(name: string): string {
  const v = process.env[name]
  if (!v) throw new Error(`Falta la variable de entorno ${name} (ejecuta bun run notion:seed y copia .env.notion)`)
  return v
}

/** Data source IDs de las 4 bases. */
export function notionEnv() {
  return {
    polizas: required('NOTION_DS_POLIZAS'),
    catalogo: required('NOTION_DS_CATALOGO'),
    informes: required('NOTION_DS_INFORMES'),
    solicitudes: required('NOTION_DS_SOLICITUDES'),
  }
}

/** Pausa para respetar el límite de ~3 req/s de Notion. */
export const throttle = (ms = 350) => new Promise((r) => setTimeout(r, ms))
```

- [ ] **Step 2: `src/lib/notion/schema.ts`**

```ts
import type { CreateDatabaseParameters } from '@notionhq/client'
import { CATEGORIAS, DOCUMENTOS, ESTADOS_POLIZA, ESTADOS_SOLICITUD, HOSPITALES, PLANES, PREEXISTENCIAS, TIPOS_ATENCION } from '@/lib/rules/types'

type Props = NonNullable<CreateDatabaseParameters['initial_data_source']>['properties']

/** Nombres de propiedades: única fuente de verdad (se ven en Notion, van en español). */
export const P = {
  polizas: {
    numero: 'Nº de póliza', asegurado: 'Asegurado', cedula: 'Cédula', fechaNacimiento: 'Fecha de nacimiento', plan: 'Plan', estado: 'Estado',
    inicio: 'Inicio de vigencia', fin: 'Fin de vigencia', suma: 'Suma asegurada anual', consumido: 'Monto consumido', preexistencias: 'Preexistencias declaradas', red: 'Red de hospitales',
  },
  catalogo: {
    procedimiento: 'Procedimiento', id: 'ID', cpt: 'Código CPT', cie10: 'CIE-10 asociado', categoria: 'Categoría', planes: 'Cubierto en planes', carencia: 'Carencia (días)',
    exento: 'Exento de carencia en emergencia', excluido: 'Excluido', motivoExclusion: 'Motivo de exclusión', preexistencia: 'Preexistencia relacionada', documentos: 'Documentos requeridos', maximo: 'Monto máximo cubierto',
  },
  informes: {
    informe: 'Informe', id: 'ID', paciente: 'Paciente', cedula: 'Cédula', hospital: 'Hospital', medico: 'Médico tratante', fecha: 'Fecha del informe', tipo: 'Tipo de atención', adjuntos: 'Documentos adjuntos', presupuesto: 'Presupuesto estimado',
  },
  solicitudes: {
    id: 'ID', informe: 'Informe médico', estado: 'Estado', escenario: 'Escenario', esperado: 'Veredicto esperado', paciente: 'Paciente', hospital: 'Hospital', poliza: 'Póliza',
    procedimiento: 'Procedimiento detectado', cpt: 'CPT detectado', veredicto: 'Veredicto', motivo: 'Motivo', clausulas: 'Cláusulas aplicadas', faltantes: 'Documentos faltantes',
    elegibleDesde: 'Elegible desde', tope: 'Tope aprobado', confianza: 'Confianza de extracción', analizadoEl: 'Analizado el', version: 'Versión del agente',
  },
} as const

export const SOLICITUD_ESTADO_COLORS: Record<(typeof ESTADOS_SOLICITUD)[number], 'gray' | 'blue' | 'green' | 'red' | 'yellow'> = {
  'Pendiente': 'gray', 'En análisis': 'blue', 'Preaprobada': 'green', 'Rechazada': 'red', 'Documentos faltantes': 'yellow', 'Error': 'red',
}

const title = () => ({ title: {} })
const text = () => ({ rich_text: {} })
const num = (format: 'number' | 'dollar' = 'number') => ({ number: { format } })
const date = () => ({ date: {} })
const check = () => ({ checkbox: {} })
const select = (opts: readonly string[], colors?: Record<string, string>) => ({ select: { options: opts.map((name) => ({ name, ...(colors?.[name] ? { color: colors[name] } : {}) })) } })
const multi = (opts: readonly string[]) => ({ multi_select: { options: opts.map((name) => ({ name })) } })
const relation = (data_source_id: string) => ({ relation: { data_source_id, single_property: {} } })

const ESPERADOS = ['Preaprobada', 'Rechazada', 'Documentos faltantes'] as const

export function dbSchemas(ds: { polizas?: string; informes?: string }) {
  const p = P
  const polizas: Props = {
    [p.polizas.numero]: title(), [p.polizas.asegurado]: text(), [p.polizas.cedula]: text(), [p.polizas.fechaNacimiento]: date(),
    [p.polizas.plan]: select(PLANES), [p.polizas.estado]: select(ESTADOS_POLIZA), [p.polizas.inicio]: date(), [p.polizas.fin]: date(),
    [p.polizas.suma]: num('dollar'), [p.polizas.consumido]: num('dollar'), [p.polizas.preexistencias]: multi(PREEXISTENCIAS), [p.polizas.red]: multi(HOSPITALES),
  } as Props
  const catalogo: Props = {
    [p.catalogo.procedimiento]: title(), [p.catalogo.id]: text(), [p.catalogo.cpt]: text(), [p.catalogo.cie10]: text(), [p.catalogo.categoria]: select(CATEGORIAS),
    [p.catalogo.planes]: multi(PLANES), [p.catalogo.carencia]: num(), [p.catalogo.exento]: check(), [p.catalogo.excluido]: check(), [p.catalogo.motivoExclusion]: text(),
    [p.catalogo.preexistencia]: multi(PREEXISTENCIAS), [p.catalogo.documentos]: multi(DOCUMENTOS), [p.catalogo.maximo]: num('dollar'),
  } as Props
  const informes: Props = {
    [p.informes.informe]: title(), [p.informes.id]: text(), [p.informes.paciente]: text(), [p.informes.cedula]: text(), [p.informes.hospital]: select(HOSPITALES),
    [p.informes.medico]: text(), [p.informes.fecha]: date(), [p.informes.tipo]: select(TIPOS_ATENCION), [p.informes.adjuntos]: multi(DOCUMENTOS), [p.informes.presupuesto]: num('dollar'),
  } as Props
  const solicitudes = (): Props => {
    if (!ds.polizas || !ds.informes) throw new Error('Solicitudes requiere los data source IDs de Pólizas e Informes')
    return {
      [p.solicitudes.id]: title(), [p.solicitudes.informe]: relation(ds.informes), [p.solicitudes.estado]: select(ESTADOS_SOLICITUD, SOLICITUD_ESTADO_COLORS),
      [p.solicitudes.escenario]: text(), [p.solicitudes.esperado]: select(ESPERADOS), [p.solicitudes.paciente]: text(), [p.solicitudes.hospital]: text(), [p.solicitudes.poliza]: relation(ds.polizas),
      [p.solicitudes.procedimiento]: text(), [p.solicitudes.cpt]: text(), [p.solicitudes.veredicto]: text(), [p.solicitudes.motivo]: text(), [p.solicitudes.clausulas]: text(),
      [p.solicitudes.faltantes]: multi(DOCUMENTOS), [p.solicitudes.elegibleDesde]: date(), [p.solicitudes.tope]: num('dollar'), [p.solicitudes.confianza]: num(),
      [p.solicitudes.analizadoEl]: date(), [p.solicitudes.version]: text(),
    } as Props
  }
  return { polizas, catalogo, informes, solicitudes }
}
```
Si el tipo `single_property: {}` no compila con la versión instalada del SDK, usar `dual_property: {}` (crea la propiedad espejo; inofensivo) o castear el objeto de la relación `as never`.

- [ ] **Step 3: `src/lib/notion/mappers.ts`**

```ts
import type { BlockObjectRequest, BlockObjectResponse, PageObjectResponse, PartialBlockObjectResponse } from '@notionhq/client'
import type { Adjudication, CatalogEntry, DocumentoTipo, EstadoSolicitud, ExtractedReport, Policy, ReportMeta } from '@/lib/rules/types'
import { P } from './schema'

type Page = PageObjectResponse
type Prop = Page['properties'][string]

const prop = (page: Page, name: string): Prop | undefined => page.properties[name]
const plain = (rt: Array<{ plain_text: string }> | undefined) => (rt ?? []).map((t) => t.plain_text).join('')
export const readTitle = (page: Page, name: string) => { const p = prop(page, name); return p?.type === 'title' ? plain(p.title) : '' }
export const readText = (page: Page, name: string) => { const p = prop(page, name); return p?.type === 'rich_text' ? plain(p.rich_text) : '' }
export const readSelect = (page: Page, name: string) => { const p = prop(page, name); return p?.type === 'select' ? (p.select?.name ?? '') : '' }
export const readMulti = (page: Page, name: string) => { const p = prop(page, name); return p?.type === 'multi_select' ? p.multi_select.map((o) => o.name) : [] }
export const readNumber = (page: Page, name: string) => { const p = prop(page, name); return p?.type === 'number' ? p.number : null }
export const readDate = (page: Page, name: string) => { const p = prop(page, name); return p?.type === 'date' ? (p.date?.start ?? null) : null }
export const readCheck = (page: Page, name: string) => { const p = prop(page, name); return p?.type === 'checkbox' ? p.checkbox : false }
export const readRelation = (page: Page, name: string) => { const p = prop(page, name); return p?.type === 'relation' ? p.relation.map((r) => r.id) : [] }

/** Notion limita cada segmento de rich_text a 2000 caracteres. */
const clip = (s: string, max = 1900) => (s.length > max ? s.slice(0, max - 1) + '…' : s)
export const wTitle = (s: string) => ({ title: [{ type: 'text' as const, text: { content: clip(s) } }] })
export const wText = (s: string) => ({ rich_text: s ? [{ type: 'text' as const, text: { content: clip(s) } }] : [] })
export const wSelect = (s: string) => ({ select: { name: s } })
export const wMulti = (xs: readonly string[]) => ({ multi_select: xs.map((name) => ({ name })) })
export const wNumber = (n: number | null | undefined) => ({ number: n ?? null })
export const wDate = (iso: string | null | undefined) => ({ date: iso ? { start: iso } : null })
export const wCheck = (b: boolean) => ({ checkbox: b })
export const wRelation = (ids: string[]) => ({ relation: ids.map((id) => ({ id })) })

export function toPolicy(page: Page): Policy {
  const p = P.polizas
  return {
    numero: readTitle(page, p.numero), asegurado: readText(page, p.asegurado), cedula: readText(page, p.cedula), fechaNacimiento: readDate(page, p.fechaNacimiento) ?? '',
    plan: readSelect(page, p.plan) as Policy['plan'], estado: readSelect(page, p.estado) as Policy['estado'],
    inicioVigencia: readDate(page, p.inicio) ?? '', finVigencia: readDate(page, p.fin) ?? '', sumaAsegurada: readNumber(page, p.suma) ?? 0, montoConsumido: readNumber(page, p.consumido) ?? 0,
    preexistencias: readMulti(page, p.preexistencias) as Policy['preexistencias'], red: readMulti(page, p.red) as Policy['red'], notionPageId: page.id, notionUrl: page.url,
  }
}

export function toCatalogEntry(page: Page): CatalogEntry {
  const p = P.catalogo
  const maximo = readNumber(page, p.maximo)
  const motivo = readText(page, p.motivoExclusion)
  return {
    id: readText(page, p.id), procedimiento: readTitle(page, p.procedimiento), cpt: readText(page, p.cpt), cie10: readText(page, p.cie10), categoria: readSelect(page, p.categoria) as CatalogEntry['categoria'],
    planes: readMulti(page, p.planes) as CatalogEntry['planes'], carenciaDias: readNumber(page, p.carencia) ?? 0, exentoEnEmergencia: readCheck(page, p.exento), excluido: readCheck(page, p.excluido),
    ...(motivo ? { motivoExclusion: motivo } : {}), preexistenciaRelacionada: readMulti(page, p.preexistencia) as CatalogEntry['preexistenciaRelacionada'],
    documentosRequeridos: readMulti(page, p.documentos) as DocumentoTipo[], ...(maximo !== null ? { montoMaximo: maximo } : {}), notionPageId: page.id,
  }
}

export function toReportMeta(page: Page): ReportMeta {
  const p = P.informes
  return {
    id: readText(page, p.id), paciente: readText(page, p.paciente), cedula: readText(page, p.cedula), hospital: readSelect(page, p.hospital) as ReportMeta['hospital'], medico: readText(page, p.medico),
    fecha: readDate(page, p.fecha) ?? '', tipoAtencion: readSelect(page, p.tipo) as ReportMeta['tipoAtencion'], adjuntos: readMulti(page, p.adjuntos) as DocumentoTipo[], presupuesto: readNumber(page, p.presupuesto) ?? 0,
    notionPageId: page.id, notionUrl: page.url,
  }
}

export type Solicitud = {
  id: string; pageId: string; url: string; estado: EstadoSolicitud; escenario: string; esperado: Adjudication['estado'] | null; paciente: string; hospital: string
  informePageId: string | null; polizaPageId: string | null
  procedimientoDetectado: string; cptDetectado: string; veredicto: string; motivo: string; clausulas: string; documentosFaltantes: DocumentoTipo[]
  elegibleDesde: string | null; topeAprobado: number | null; confianza: number | null; analizadoEl: string | null; version: string
}

export function toSolicitud(page: Page): Solicitud {
  const p = P.solicitudes
  return {
    id: readTitle(page, p.id), pageId: page.id, url: page.url, estado: (readSelect(page, p.estado) || 'Pendiente') as EstadoSolicitud, escenario: readText(page, p.escenario), paciente: readText(page, p.paciente), hospital: readText(page, p.hospital),
    esperado: (readSelect(page, p.esperado) || null) as Solicitud['esperado'], informePageId: readRelation(page, p.informe)[0] ?? null, polizaPageId: readRelation(page, p.poliza)[0] ?? null,
    procedimientoDetectado: readText(page, p.procedimiento), cptDetectado: readText(page, p.cpt), veredicto: readText(page, p.veredicto), motivo: readText(page, p.motivo), clausulas: readText(page, p.clausulas),
    documentosFaltantes: readMulti(page, p.faltantes) as DocumentoTipo[], elegibleDesde: readDate(page, p.elegibleDesde), topeAprobado: readNumber(page, p.tope), confianza: readNumber(page, p.confianza),
    analizadoEl: readDate(page, p.analizadoEl), version: readText(page, p.version),
  }
}

export function policyProps(x: Policy) {
  const p = P.polizas
  return {
    [p.numero]: wTitle(x.numero), [p.asegurado]: wText(x.asegurado), [p.cedula]: wText(x.cedula), [p.fechaNacimiento]: wDate(x.fechaNacimiento), [p.plan]: wSelect(x.plan), [p.estado]: wSelect(x.estado),
    [p.inicio]: wDate(x.inicioVigencia), [p.fin]: wDate(x.finVigencia), [p.suma]: wNumber(x.sumaAsegurada), [p.consumido]: wNumber(x.montoConsumido), [p.preexistencias]: wMulti(x.preexistencias), [p.red]: wMulti(x.red),
  }
}

export function catalogProps(x: CatalogEntry) {
  const p = P.catalogo
  return {
    [p.procedimiento]: wTitle(x.procedimiento), [p.id]: wText(x.id), [p.cpt]: wText(x.cpt), [p.cie10]: wText(x.cie10), [p.categoria]: wSelect(x.categoria), [p.planes]: wMulti(x.planes),
    [p.carencia]: wNumber(x.carenciaDias), [p.exento]: wCheck(x.exentoEnEmergencia), [p.excluido]: wCheck(x.excluido), [p.motivoExclusion]: wText(x.motivoExclusion ?? ''),
    [p.preexistencia]: wMulti(x.preexistenciaRelacionada), [p.documentos]: wMulti(x.documentosRequeridos), [p.maximo]: wNumber(x.montoMaximo),
  }
}

export function reportProps(x: ReportMeta) {
  const p = P.informes
  return {
    [p.informe]: wTitle(`${x.id} · ${x.paciente}`), [p.id]: wText(x.id), [p.paciente]: wText(x.paciente), [p.cedula]: wText(x.cedula), [p.hospital]: wSelect(x.hospital), [p.medico]: wText(x.medico),
    [p.fecha]: wDate(x.fecha), [p.tipo]: wSelect(x.tipoAtencion), [p.adjuntos]: wMulti(x.adjuntos), [p.presupuesto]: wNumber(x.presupuesto),
  }
}

export function solicitudSeedProps(x: { id: string; escenario: string; esperado: Adjudication['estado']; informePageId: string; paciente: string; hospital: string }) {
  const p = P.solicitudes
  return { [p.id]: wTitle(x.id), [p.escenario]: wText(x.escenario), [p.esperado]: wSelect(x.esperado), [p.paciente]: wText(x.paciente), [p.hospital]: wText(x.hospital), [p.informe]: wRelation([x.informePageId]) }
}

/** Propiedades que escribe el agente al terminar. Reanalizar las sobrescribe todas. */
export function verdictProps(a: Adjudication, x: { extraction: ExtractedReport; procedure: CatalogEntry | null; policyPageId: string | null; version: string }) {
  const p = P.solicitudes
  return {
    [p.estado]: wSelect(a.estado), [p.poliza]: wRelation(x.policyPageId ? [x.policyPageId] : []),
    [p.procedimiento]: wText(x.procedure?.procedimiento ?? x.extraction.procedimientoTexto), [p.cpt]: wText(x.procedure?.cpt ?? ''),
    [p.veredicto]: wText(a.veredicto), [p.motivo]: wText(a.motivo), [p.clausulas]: wText(a.clausulas.join(', ')), [p.faltantes]: wMulti(a.documentosFaltantes),
    [p.elegibleDesde]: wDate(a.elegibleDesde ?? null), [p.tope]: wNumber(a.topeAprobado ?? null), [p.confianza]: wNumber(Number(x.extraction.confianza.toFixed(2))),
    [p.analizadoEl]: wDate(new Date().toISOString()), [p.version]: wText(x.version),
  }
}

/** Markdown mínimo (**negrita**, párrafos separados por línea en blanco) → bloques de párrafo. */
export function prosaToBlocks(prosa: string): BlockObjectRequest[] {
  return prosa.split(/\n\s*\n/).map((para) => {
    const rich = para.split('**').map((seg, i) => ({ type: 'text' as const, text: { content: clip(seg.replace(/\n/g, ' ')) }, annotations: { bold: i % 2 === 1 } })).filter((s) => s.text.content.length)
    return { object: 'block' as const, type: 'paragraph' as const, paragraph: { rich_text: rich } }
  })
}

/** Bloques de párrafo → texto plano con párrafos separados por línea en blanco (lo que lee el extractor). */
export function blocksToProsa(blocks: Array<BlockObjectResponse | PartialBlockObjectResponse>): string {
  return blocks
    .map((b) => ('type' in b && b.type === 'paragraph' ? plain(b.paragraph.rich_text) : ''))
    .filter(Boolean)
    .join('\n\n')
}
```

- [ ] **Step 4: Test** `tests/notion/mappers.test.ts`

```ts
import { describe, expect, it } from 'bun:test'
import { blocksToProsa, prosaToBlocks } from '@/lib/notion/mappers'

describe('prosa ⇄ bloques', () => {
  it('convierte negritas y párrafos y vuelve', () => {
    const prosa = '**Paciente:** Juan Pérez, 40 años.\n\n**Plan:** apendicectomía.'
    const blocks = prosaToBlocks(prosa)
    expect(blocks).toHaveLength(2)
    expect((blocks[0] as { paragraph: { rich_text: Array<{ annotations: { bold: boolean } }> } }).paragraph.rich_text[0].annotations.bold).toBe(true)
    const back = blocksToProsa(blocks.map((b, i) => ({ ...b, id: String(i), object: 'block', paragraph: { ...(b as { paragraph: { rich_text: Array<{ text: { content: string } }> } }).paragraph, rich_text: (b as { paragraph: { rich_text: Array<{ text: { content: string } }> } }).paragraph.rich_text.map((t) => ({ ...t, plain_text: t.text.content })) } })) as never)
    expect(back).toBe('Paciente: Juan Pérez, 40 años.\n\nPlan: apendicectomía.')
  })
})
```

- [ ] **Step 5: Verificar y commit**

```bash
bun test && bun run typecheck
git add src/lib/notion tests/notion
git commit -m "feat: esquema de Notion, cliente y mappers"
```

---

### Task 7: Seed de Notion (corre contra el workspace real)

**Files:**
- Create: `scripts/notion-seed.ts`, `.env.notion` (generado, en `.gitignore`)
- Modify: `.gitignore` (añadir `.env.notion`)

**Interfaces:**
- Consumes: `loadCatalog`, `loadCases` (Task 4); `dbSchemas`, `P`, mappers (Task 6); `notion()`, `throttle`.
- Produces: 4 bases pobladas; `.env.notion` con `NOTION_ROOT_PAGE_ID`, `NOTION_DB_*` (ids de base, para enlaces) y `NOTION_DS_*` (data source ids).

- [ ] **Step 1: `scripts/notion-seed.ts`**

```ts
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { loadCases, loadCatalog } from '@/lib/cases/load'
import { notion, throttle } from '@/lib/notion/client'
import { catalogProps, policyProps, prosaToBlocks, reportProps, solicitudSeedProps } from '@/lib/notion/mappers'
import { dbSchemas, P } from '@/lib/notion/schema'

const ROOT_TITLE = 'Amparo · Pre-autorización quirúrgica'
const ENV_FILE = '.env.notion'

type Ids = { NOTION_ROOT_PAGE_ID: string; NOTION_DB_POLIZAS: string; NOTION_DS_POLIZAS: string; NOTION_DB_CATALOGO: string; NOTION_DS_CATALOGO: string; NOTION_DB_INFORMES: string; NOTION_DS_INFORMES: string; NOTION_DB_SOLICITUDES: string; NOTION_DS_SOLICITUDES: string }

function readIds(): Ids | null {
  if (!existsSync(ENV_FILE)) return null
  const out: Record<string, string> = {}
  for (const line of readFileSync(ENV_FILE, 'utf8').split('\n')) { const m = /^([A-Z_]+)=(.+)$/.exec(line.trim()); if (m) out[m[1]] = m[2] }
  return out as unknown as Ids
}

async function createDb(parentPageId: string, name: string, properties: ReturnType<typeof dbSchemas>['polizas']) {
  const db = await notion().databases.create({ parent: { type: 'page_id', page_id: parentPageId }, title: [{ type: 'text', text: { content: name } }], initial_data_source: { properties } })
  await throttle()
  const ds = (db as { data_sources?: Array<{ id: string }> }).data_sources?.[0]?.id
  if (!ds) throw new Error(`La base ${name} se creó sin data source`)
  console.log(`✓ base "${name}" ${db.id} (data source ${ds})`)
  return { dbId: db.id, dsId: ds }
}

async function createStructure(): Promise<Ids> {
  const parent = process.env.NOTION_PARENT_PAGE_ID
  if (!parent) throw new Error('Falta NOTION_PARENT_PAGE_ID (página compartida con la integración)')
  const root = await notion().pages.create({
    parent: { type: 'page_id', page_id: parent },
    properties: { title: { title: [{ type: 'text', text: { content: ROOT_TITLE } }] } },
    children: [{ object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: 'Datos demo del agente Amparo (HackIAthon Viamatica, Reto 1). Generados por bun run notion:seed desde el repositorio.' } }] } }],
  })
  await throttle()
  console.log(`✓ página raíz ${root.id}`)
  const s0 = dbSchemas({})
  const polizas = await createDb(root.id, 'Pólizas', s0.polizas)
  const catalogo = await createDb(root.id, 'Catálogo de procedimientos', s0.catalogo)
  const informes = await createDb(root.id, 'Informes médicos', s0.informes)
  const s1 = dbSchemas({ polizas: polizas.dsId, informes: informes.dsId })
  const solicitudes = await createDb(root.id, 'Solicitudes de pre-autorización', s1.solicitudes())
  const ids: Ids = {
    NOTION_ROOT_PAGE_ID: root.id, NOTION_DB_POLIZAS: polizas.dbId, NOTION_DS_POLIZAS: polizas.dsId, NOTION_DB_CATALOGO: catalogo.dbId, NOTION_DS_CATALOGO: catalogo.dsId,
    NOTION_DB_INFORMES: informes.dbId, NOTION_DS_INFORMES: informes.dsId, NOTION_DB_SOLICITUDES: solicitudes.dbId, NOTION_DS_SOLICITUDES: solicitudes.dsId,
  }
  writeFileSync(ENV_FILE, Object.entries(ids).map(([k, v]) => `${k}=${v}`).join('\n') + '\n')
  console.log(`✓ ids escritos en ${ENV_FILE} — copia las líneas NOTION_* a .env y a CapRover`)
  return ids
}

async function findByProp(dsId: string, property: string, kind: 'title' | 'rich_text', value: string): Promise<string | null> {
  const res = await notion().dataSources.query({ data_source_id: dsId, filter: kind === 'title' ? { property, title: { equals: value } } : { property, rich_text: { equals: value } }, page_size: 1 })
  await throttle()
  return res.results[0]?.id ?? null
}

async function upsert(dsId: string, key: { property: string; kind: 'title' | 'rich_text'; value: string }, properties: Record<string, unknown>, children?: ReturnType<typeof prosaToBlocks>): Promise<string> {
  const existing = await findByProp(dsId, key.property, key.kind, key.value)
  if (existing) {
    await notion().pages.update({ page_id: existing, properties: properties as never })
    await throttle()
    console.log(`  ~ actualizado ${key.value}`)
    return existing
  }
  const page = await notion().pages.create({ parent: { type: 'data_source_id', data_source_id: dsId }, properties: properties as never, ...(children ? { children } : {}) })
  await throttle()
  console.log(`  + creado ${key.value}`)
  return page.id
}

async function main() {
  const ids = readIds() ?? (await createStructure())
  console.log('— Catálogo')
  for (const c of loadCatalog()) await upsert(ids.NOTION_DS_CATALOGO, { property: P.catalogo.id, kind: 'rich_text', value: c.id }, catalogProps(c))
  console.log('— Casos')
  for (const cs of loadCases()) {
    if (cs.poliza) await upsert(ids.NOTION_DS_POLIZAS, { property: P.polizas.numero, kind: 'title', value: cs.poliza.numero }, policyProps(cs.poliza))
    const informeId = await upsert(ids.NOTION_DS_INFORMES, { property: P.informes.id, kind: 'rich_text', value: cs.informe.id }, reportProps(cs.informe), prosaToBlocks(cs.prosa))
    await upsert(ids.NOTION_DS_SOLICITUDES, { property: P.solicitudes.id, kind: 'title', value: cs.id }, { ...solicitudSeedProps({ id: cs.id, escenario: cs.titulo, esperado: cs.esperado, informePageId: informeId, paciente: cs.informe.paciente, hospital: cs.informe.hospital }), ...(await findByProp(ids.NOTION_DS_SOLICITUDES, P.solicitudes.id, 'title', cs.id) ? {} : { [P.solicitudes.estado]: { select: { name: 'Pendiente' } } }) })
  }
  console.log('✓ seed completo')
}

main().catch((e) => { console.error(e); process.exit(1) })
```
Nota: al **actualizar** un informe existente no se reescribe el cuerpo (evitar borrar bloques). Si cambió la prosa de un caso ya sembrado, borrar la página del informe en Notion a mano y volver a correr el seed. Al actualizar una solicitud existente, no se toca `Estado` (eso lo hace `notion:reset`).

- [ ] **Step 2: `.gitignore`** — añadir `.env.notion`.

- [ ] **Step 3: Ejecutar contra el workspace**

```bash
echo "NOTION_PARENT_PAGE_ID=2e69e19b-eec6-800d-9285-caae3f08ade3" >> .env   # página VORLUNO
bun run notion:seed
cat .env.notion >> .env
```
Expected: 4 bases creadas, 13 procedimientos, 2 pólizas, 2 informes, 2 solicitudes. Abrir Notion y comprobar que el informe INF-0001 tiene la prosa con negritas y que PA-0001 está `Pendiente` con la relación al informe. Volver a correr `bun run notion:seed`: todo debe salir como `~ actualizado`, sin duplicados.

- [ ] **Step 4: Commit**

```bash
git add scripts/notion-seed.ts .gitignore
git commit -m "feat: seed reproducible de las 4 bases de Notion desde cases/"
```

---

### Task 8: Repositorio de Notion (lecturas y escrituras del pipeline)

**Files:**
- Create: `src/lib/notion/repo.ts`
- Test: `tests/notion/repo.test.ts` (solo la lógica de lock, con cliente falso)

**Interfaces:**
- Produces:
  - `listSolicitudes(): Promise<Solicitud[]>`
  - `getSolicitud(id: string): Promise<Solicitud | null>` (por título `PA-00xx`)
  - `getSolicitudByPageId(pageId: string): Promise<Solicitud>`
  - `getInforme(pageId: string): Promise<{ meta: ReportMeta; prosa: string }>`
  - `findPolizaByCedula(cedula: string): Promise<Policy | null>`
  - `getCatalogo(): Promise<CatalogEntry[]>`
  - `shouldLock(s: Solicitud, lockMinutos: number, now?: Date): boolean` (pura)
  - `acquireLock(s: Solicitud, lockMinutos: number): Promise<boolean>`
  - `saveVerdict(pageId, a, extra)`, `saveError(pageId, message)`, `appendBlocks(pageId, blocks)`

- [ ] **Step 1: Test del lock** `tests/notion/repo.test.ts`

```ts
import { describe, expect, it } from 'bun:test'
import type { Solicitud } from '@/lib/notion/mappers'
import { shouldLock } from '@/lib/notion/repo'

const s = (over: Partial<Solicitud>): Solicitud => ({ id: 'PA-0001', pageId: 'p', url: '', estado: 'Pendiente', escenario: '', esperado: null, paciente: '', hospital: '', informePageId: null, polizaPageId: null, procedimientoDetectado: '', cptDetectado: '', veredicto: '', motivo: '', clausulas: '', documentosFaltantes: [], elegibleDesde: null, topeAprobado: null, confianza: null, analizadoEl: null, version: '', ...over })

describe('shouldLock', () => {
  const now = new Date('2026-09-20T12:00:00Z')
  it('bloquea si está en análisis hace menos del límite', () => expect(shouldLock(s({ estado: 'En análisis', analizadoEl: '2026-09-20T11:59:00Z' }), 2, now)).toBe(true))
  it('no bloquea si el lock es viejo', () => expect(shouldLock(s({ estado: 'En análisis', analizadoEl: '2026-09-20T11:50:00Z' }), 2, now)).toBe(false))
  it('no bloquea en otros estados', () => expect(shouldLock(s({ estado: 'Preaprobada', analizadoEl: '2026-09-20T11:59:00Z' }), 2, now)).toBe(false))
})
```

- [ ] **Step 2: `src/lib/notion/repo.ts`**

```ts
import type { BlockObjectRequest, PageObjectResponse } from '@notionhq/client'
import type { Adjudication, CatalogEntry, ExtractedReport, Policy, ReportMeta } from '@/lib/rules/types'
import { notion, notionEnv } from './client'
import { blocksToProsa, toCatalogEntry, toPolicy, toReportMeta, toSolicitud, verdictProps, wDate, wSelect, wText, type Solicitud } from './mappers'
import { P } from './schema'

const isPage = (x: unknown): x is PageObjectResponse => typeof x === 'object' && x !== null && (x as { object?: string }).object === 'page' && 'properties' in x

async function queryAll(data_source_id: string, filter?: Record<string, unknown>, sorts?: Array<Record<string, unknown>>): Promise<PageObjectResponse[]> {
  const out: PageObjectResponse[] = []
  let cursor: string | undefined
  do {
    const res = await notion().dataSources.query({ data_source_id, ...(filter ? { filter: filter as never } : {}), ...(sorts ? { sorts: sorts as never } : {}), page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) })
    out.push(...res.results.filter(isPage))
    cursor = res.has_more && res.next_cursor ? res.next_cursor : undefined
  } while (cursor)
  return out
}

export async function listSolicitudes(): Promise<Solicitud[]> {
  const pages = await queryAll(notionEnv().solicitudes, undefined, [{ property: P.solicitudes.id, direction: 'ascending' }])
  return pages.map(toSolicitud)
}

export async function getSolicitud(id: string): Promise<Solicitud | null> {
  const pages = await queryAll(notionEnv().solicitudes, { property: P.solicitudes.id, title: { equals: id } })
  return pages[0] ? toSolicitud(pages[0]) : null
}

export async function getSolicitudByPageId(pageId: string): Promise<Solicitud> {
  const page = await notion().pages.retrieve({ page_id: pageId })
  if (!isPage(page)) throw new Error(`La página ${pageId} no es accesible`)
  return toSolicitud(page)
}

export async function getInforme(pageId: string): Promise<{ meta: ReportMeta; prosa: string }> {
  const page = await notion().pages.retrieve({ page_id: pageId })
  if (!isPage(page)) throw new Error(`El informe ${pageId} no es accesible`)
  const blocks: Array<Parameters<typeof blocksToProsa>[0][number]> = []
  let cursor: string | undefined
  do {
    const res = await notion().blocks.children.list({ block_id: pageId, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) })
    blocks.push(...res.results)
    cursor = res.has_more && res.next_cursor ? res.next_cursor : undefined
  } while (cursor)
  const prosa = blocksToProsa(blocks)
  if (!prosa) throw new Error(`El informe ${pageId} no tiene texto en el cuerpo de la página`)
  return { meta: toReportMeta(page), prosa }
}

export async function findPolizaByCedula(cedula: string): Promise<Policy | null> {
  const pages = await queryAll(notionEnv().polizas, { property: P.polizas.cedula, rich_text: { equals: cedula } })
  return pages[0] ? toPolicy(pages[0]) : null
}

export async function getCatalogo(): Promise<CatalogEntry[]> {
  const pages = await queryAll(notionEnv().catalogo)
  return pages.map(toCatalogEntry).filter((c) => c.id)
}

export function shouldLock(s: Solicitud, lockMinutos: number, now = new Date()): boolean {
  if (s.estado !== 'En análisis' || !s.analizadoEl) return false
  return now.getTime() - new Date(s.analizadoEl).getTime() < lockMinutos * 60_000
}

/** Marca la solicitud como "En análisis". Devuelve false si otro análisis la tiene bloqueada. */
export async function acquireLock(s: Solicitud, lockMinutos: number): Promise<boolean> {
  if (shouldLock(s, lockMinutos)) return false
  await notion().pages.update({ page_id: s.pageId, properties: { [P.solicitudes.estado]: wSelect('En análisis'), [P.solicitudes.analizadoEl]: wDate(new Date().toISOString()) } as never })
  return true
}

export async function saveVerdict(pageId: string, a: Adjudication, extra: { extraction: ExtractedReport; procedure: CatalogEntry | null; policyPageId: string | null; version: string }): Promise<void> {
  await notion().pages.update({ page_id: pageId, properties: verdictProps(a, extra) as never })
}

export async function saveError(pageId: string, message: string): Promise<void> {
  await notion().pages.update({ page_id: pageId, properties: { [P.solicitudes.estado]: wSelect('Error'), [P.solicitudes.motivo]: wText(message), [P.solicitudes.analizadoEl]: wDate(new Date().toISOString()) } as never })
}

/** Notion acepta máximo 100 bloques por llamada. */
export async function appendBlocks(pageId: string, blocks: BlockObjectRequest[]): Promise<void> {
  for (let i = 0; i < blocks.length; i += 100) await notion().blocks.children.append({ block_id: pageId, children: blocks.slice(i, i + 100) })
}
```

- [ ] **Step 3: Verificación manual contra Notion** (script efímero, no se commitea)

```bash
bun -e "import('./src/lib/notion/repo.ts').then(async r => { const s = await r.listSolicitudes(); console.log(s.map(x => [x.id, x.estado, x.escenario])); const i = await r.getInforme(s[0].informePageId!); console.log(i.meta.cedula, i.prosa.slice(0, 120)); console.log((await r.findPolizaByCedula(i.meta.cedula))?.numero); console.log((await r.getCatalogo()).length) })"
```
Expected: 2 solicitudes `Pendiente`, prosa del INF-0001, `POL-2025-0141`, 13.

- [ ] **Step 4: Tests y commit**

```bash
bun test && bun run typecheck
git add src/lib/notion/repo.ts tests/notion/repo.test.ts
git commit -m "feat: repositorio de Notion (lecturas, lock, veredicto, bloques)"
```

---

### Task 9: LLM — proveedor OpenRouter, extractor clínico y carta

**Files:**
- Create: `src/lib/llm/openrouter.ts`, `src/lib/pipeline/extract.ts`, `src/lib/pipeline/letter.ts`
- Test: `tests/pipeline/extract.test.ts` (prompt y reintento con modelo falso; sin red), `tests/pipeline/letter.test.ts`

**Interfaces:**
- Consumes: `ExtractedReportSchema`, tipos (Task 2); `CatalogEntry`, `ReportMeta`.
- Produces:
  - `primaryModel()`, `fallbackModel()`, `modelIds()`.
  - `extractReport(input: { prosa: string; meta: ReportMeta; catalog: CatalogEntry[] }, deps?: ExtractDeps): Promise<{ extraction: ExtractedReport; modelId: string; attempts: number }>`
  - `buildExtractPrompt(input)` (para tests y para mostrar en docs).
  - `streamLetter(input: LetterInput, onToken: (t: string) => void, deps?): Promise<string>` y `ensureEstadoHeader(text, estado)`.

- [ ] **Step 1: `src/lib/llm/openrouter.ts`**

```ts
import { createOpenRouter } from '@openrouter/ai-sdk-provider'

const DEFAULT_PRIMARY = 'google/gemini-2.5-flash'
const DEFAULT_FALLBACK = 'google/gemini-2.5-pro'

let provider: ReturnType<typeof createOpenRouter> | undefined
function openrouter() {
  if (!provider) {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('Falta OPENROUTER_API_KEY')
    provider = createOpenRouter({ apiKey, appName: 'Amparo', appUrl: process.env.APP_URL })
  }
  return provider
}

export function modelIds() {
  return { primary: process.env.OPENROUTER_MODEL ?? DEFAULT_PRIMARY, fallback: process.env.OPENROUTER_MODEL_FALLBACK ?? DEFAULT_FALLBACK }
}
export const primaryModel = () => openrouter()(modelIds().primary)
export const fallbackModel = () => openrouter()(modelIds().fallback)
```

- [ ] **Step 2: `src/lib/pipeline/extract.ts`**

```ts
import { generateObject, type LanguageModel } from 'ai'
import { DOCUMENTOS, ExtractedReportSchema, type CatalogEntry, type ExtractedReport, type ReportMeta } from '@/lib/rules/types'
import { fallbackModel, modelIds, primaryModel } from '@/lib/llm/openrouter'

export type ExtractInput = { prosa: string; meta: ReportMeta; catalog: CatalogEntry[] }
export type ExtractDeps = { primary: () => LanguageModel; fallback: () => LanguageModel; ids: () => { primary: string; fallback: string } }
const defaultDeps: ExtractDeps = { primary: primaryModel, fallback: fallbackModel, ids: modelIds }

export const EXTRACT_SYSTEM = `Eres un auditor médico de una aseguradora. Tu única tarea es ESTRUCTURAR un informe clínico: identificar el procedimiento propuesto y elegirlo del catálogo. NO decides cobertura ni carencias; eso lo hace otro sistema con reglas.
Reglas:
- "catalogoId" debe ser exactamente uno de los IDs del catálogo, el que corresponde al procedimiento que el informe PROPONE realizar (no a estudios ya realizados). Si el informe no propone un procedimiento concreto o ninguno del catálogo corresponde, usa null y una confianza menor a 0.5.
- "esEstetico" es true solo si la finalidad es estética; una cirugía funcional o reconstructiva (por ejemplo, septoplastia por obstrucción nasal) NO es estética.
- "tipoAtencionInferido" se deduce de la narrativa clínica (ingreso por emergencia, urgencia diferible o cirugía programada), no de lo que diga el encabezado.
- "documentosMencionados" solo admite valores de esta lista: ${DOCUMENTOS.join(' | ')}. Incluye un documento si el informe dice que se adjunta, se realizó o se entregará.
- "justificacionClinica": 1 a 3 frases que citen hallazgos del informe.
- "confianza": entre 0 y 1; alta solo si el procedimiento está nombrado sin ambigüedad.
- Responde en español neutro (sin voseo). Devuelve únicamente el objeto JSON.`

export function buildExtractPrompt({ prosa, meta, catalog }: ExtractInput): string {
  const lista = catalog.map((c) => `- ${c.id} | ${c.procedimiento} | CPT ${c.cpt} | ${c.categoria}`).join('\n')
  return `CATÁLOGO DE PROCEDIMIENTOS (id | nombre | CPT | categoría):\n${lista}\n\nDATOS DEL ENCABEZADO (hospital): tipo de atención declarado "${meta.tipoAtencion}", hospital ${meta.hospital}, fecha ${meta.fecha}.\n\nINFORME CLÍNICO:\n"""\n${prosa}\n"""`
}

export async function extractReport(input: ExtractInput, deps: ExtractDeps = defaultDeps): Promise<{ extraction: ExtractedReport; modelId: string; attempts: number }> {
  const prompt = buildExtractPrompt(input)
  const ids = deps.ids()
  const attempts: Array<{ model: () => LanguageModel; id: string; hint?: string }> = [
    { model: deps.primary, id: ids.primary },
    { model: deps.primary, id: ids.primary, hint: 'reintento' },
    { model: deps.fallback, id: ids.fallback },
  ]
  let lastError: unknown
  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i]
    try {
      const extra = a.hint && lastError ? `\n\nTu respuesta anterior no cumplió el esquema: ${String((lastError as Error).message).slice(0, 500)}. Responde de nuevo respetando exactamente el esquema.` : ''
      const { object } = await generateObject({ model: a.model(), schema: ExtractedReportSchema, system: EXTRACT_SYSTEM, prompt: prompt + extra, temperature: 0, maxOutputTokens: 1024, abortSignal: AbortSignal.timeout(30_000) })
      const catalogoId = object.catalogoId && input.catalog.some((c) => c.id === object.catalogoId) ? object.catalogoId : null
      return { extraction: { ...object, catalogoId }, modelId: a.id, attempts: i + 1 }
    } catch (e) {
      lastError = e
      console.warn(`[extract] intento ${i + 1} (${a.id}) falló:`, (e as Error).message)
    }
  }
  throw new Error(`El extractor clínico falló tras ${attempts.length} intentos: ${(lastError as Error).message}`)
}
```
Si `generateObject` falla con Gemini por el modo de salida estructurada, crear el modelo con `openrouter(id, { structuredOutputs: { strict: false } })` en `openrouter.ts`.

- [ ] **Step 3: `src/lib/pipeline/letter.ts`**

```ts
import { streamText, type LanguageModel } from 'ai'
import { formatDate, formatMoney } from '@/lib/format'
import { primaryModel } from '@/lib/llm/openrouter'
import type { Adjudication, CatalogEntry, ExtractedReport, Policy, ReportMeta } from '@/lib/rules/types'

export type LetterInput = { adjudication: Adjudication; extraction: ExtractedReport; report: ReportMeta; policy: Policy | null; procedure: CatalogEntry | null }

export const LETTER_SYSTEM = `Redactas, en nombre de la aseguradora, la respuesta formal al hospital sobre una solicitud de pre-autorización quirúrgica. El veredicto YA ESTÁ TOMADO por el sistema de reglas: no lo cambies, no lo matices, no agregues condiciones que no estén en los datos.
Formato: máximo 220 palabras, español neutro (sin voseo), tono profesional y claro. Primera línea exactamente "Estado: <estado>". Luego un párrafo con el veredicto y su motivo citando las cláusulas; si faltan documentos, una lista con viñetas; si hay fecha de elegibilidad o tope, indícalos. Cierra con "Departamento de Pre-autorizaciones — Amparo". No inventes números de trámite ni datos que no recibas.`

export function buildLetterPrompt(x: LetterInput): string {
  const a = x.adjudication
  const lines = [
    `Estado: ${a.estado}`, `Veredicto: ${a.veredicto}`, `Motivo: ${a.motivo}`, `Cláusulas: ${a.clausulas.length ? a.clausulas.join(', ') : 'ninguna'}`,
    `Paciente: ${x.report.paciente} (cédula ${x.report.cedula}) — Hospital: ${x.report.hospital} — Médico: ${x.report.medico} — Fecha del informe: ${formatDate(x.report.fecha)}`,
    `Procedimiento: ${x.procedure ? `${x.procedure.procedimiento} (CPT ${x.procedure.cpt})` : x.extraction.procedimientoTexto} — Diagnóstico: ${x.extraction.diagnostico}`,
    x.policy ? `Póliza: ${x.policy.numero}, plan ${x.policy.plan}, vigencia ${formatDate(x.policy.inicioVigencia)} a ${formatDate(x.policy.finVigencia)}` : 'Póliza: no encontrada',
    a.documentosFaltantes.length ? `Documentos faltantes: ${a.documentosFaltantes.join(', ')}` : '', a.elegibleDesde ? `Elegible desde: ${formatDate(a.elegibleDesde)}` : '', a.topeAprobado !== undefined ? `Tope aprobado: ${formatMoney(a.topeAprobado)}` : '',
    a.advertencias.length ? `Advertencias para el auditor (no incluir en la carta): ${a.advertencias.join(' ')}` : '',
  ]
  return lines.filter(Boolean).join('\n')
}

/** Garantía determinista: la carta empieza con el estado literal aunque el modelo lo omita. */
export function ensureEstadoHeader(text: string, estado: Adjudication['estado']): string {
  const t = text.trim()
  return t.startsWith(`Estado: ${estado}`) ? t : `Estado: ${estado}\n\n${t.replace(/^Estado:.*\n+/i, '')}`
}

export async function streamLetter(x: LetterInput, onToken: (t: string) => void, deps: { model: () => LanguageModel } = { model: primaryModel }): Promise<string> {
  const { textStream } = streamText({ model: deps.model(), system: LETTER_SYSTEM, prompt: buildLetterPrompt(x), temperature: 0.3, maxOutputTokens: 600, abortSignal: AbortSignal.timeout(45_000) })
  let full = ''
  for await (const chunk of textStream) { full += chunk; onToken(chunk) }
  return ensureEstadoHeader(full, x.adjudication.estado)
}
```

- [ ] **Step 4: Tests** `tests/pipeline/extract.test.ts` (usa `MockLanguageModelV2` de `ai/test`; si la versión instalada expone `MockLanguageModelV3`, usar ese nombre)

```ts
import { describe, expect, it } from 'bun:test'
import { MockLanguageModelV2 } from 'ai/test'
import { buildExtractPrompt, extractReport } from '@/lib/pipeline/extract'
import { apendicectomia, reportBase } from '../rules/fixtures'

const good = { catalogoId: 'apendicectomia-laparoscopica', procedimientoTexto: 'apendicectomía', diagnostico: 'Apendicitis', cie10Sugerido: 'K35.80', especialidad: 'Cirugía general', tipoAtencionInferido: 'Emergencia', justificacionClinica: 'Dolor en FID.', documentosMencionados: ['Imagenología'], esEstetico: false, confianza: 0.9, ambiguedades: [] }
const mock = (jsons: string[]) => { let i = 0; return () => new MockLanguageModelV2({ doGenerate: async () => ({ content: [{ type: 'text', text: jsons[Math.min(i++, jsons.length - 1)] }], finishReason: 'stop', usage: { inputTokens: 1, outputTokens: 1, totalTokens: 2 }, warnings: [] }) }) }

describe('extractReport', () => {
  const input = { prosa: 'Informe…', meta: reportBase, catalog: [apendicectomia] }
  it('el prompt incluye el catálogo y el informe', () => {
    const p = buildExtractPrompt(input)
    expect(p).toContain('apendicectomia-laparoscopica | Apendicectomía laparoscópica | CPT 44970')
    expect(p).toContain('Informe…')
  })
  it('devuelve la extracción válida al primer intento', async () => {
    const r = await extractReport(input, { primary: mock([JSON.stringify(good)]), fallback: mock([]), ids: () => ({ primary: 'p', fallback: 'f' }) })
    expect(r.extraction.catalogoId).toBe('apendicectomia-laparoscopica')
    expect(r.attempts).toBe(1)
  })
  it('reintenta si la primera salida rompe el esquema', async () => {
    const r = await extractReport(input, { primary: mock(['{"confianza": "alta"}', JSON.stringify(good)]), fallback: mock([]), ids: () => ({ primary: 'p', fallback: 'f' }) })
    expect(r.attempts).toBe(2)
  })
  it('anula catalogoId si no existe en el catálogo', async () => {
    const r = await extractReport(input, { primary: mock([JSON.stringify({ ...good, catalogoId: 'inventado' })]), fallback: mock([]), ids: () => ({ primary: 'p', fallback: 'f' }) })
    expect(r.extraction.catalogoId).toBeNull()
  })
})
```

`tests/pipeline/letter.test.ts`

```ts
import { describe, expect, it } from 'bun:test'
import { ensureEstadoHeader } from '@/lib/pipeline/letter'

describe('ensureEstadoHeader', () => {
  it('respeta la carta si ya empieza con el estado', () => expect(ensureEstadoHeader('Estado: Preaprobada\n\nTexto', 'Preaprobada')).toBe('Estado: Preaprobada\n\nTexto'))
  it('antepone el estado si falta o es otro', () => expect(ensureEstadoHeader('Estado: Rechazada\n\nTexto', 'Preaprobada')).toBe('Estado: Preaprobada\n\nTexto'))
})
```

- [ ] **Step 5: Prueba real de una extracción (una sola llamada, ~USD 0.002)**

```bash
bun -e "import('./src/lib/pipeline/extract.ts').then(async m => { const { loadCases, loadCatalog } = await import('./src/lib/cases/load.ts'); const c = loadCases()[0]; const r = await m.extractReport({ prosa: c.prosa, meta: c.informe, catalog: loadCatalog() }); console.log(JSON.stringify(r, null, 2)) })"
```
Expected: `catalogoId: 'apendicectomia-laparoscopica'`, `tipoAtencionInferido: 'Emergencia'`, `confianza ≥ 0.85`. Guardar la salida como fixture en `tests/pipeline/fixtures/PA-0001.real.json` y añadir un test que la valide contra `ExtractedReportSchema` (detección de drift).

- [ ] **Step 6: Commit**

```bash
git add src/lib/llm src/lib/pipeline/extract.ts src/lib/pipeline/letter.ts tests/pipeline
git commit -m "feat: extractor clínico y carta con OpenRouter (reintento, fallback, validación del estado)"
```

---

### Task 10: Pipeline `runPreauth` con eventos

**Files:**
- Create: `src/lib/pipeline/events.ts`, `src/lib/pipeline/policy.ts`, `src/lib/pipeline/sync.ts`, `src/lib/pipeline/run.ts`
- Test: `tests/pipeline/run.test.ts` (repo y LLM falsos)

**Interfaces:**
- Produces:
  - `type StepId`, `STEP_TITLES`, `type PipelineEvent`, `type Emit`.
  - `startAnalysis(id: string, deps?): Promise<{ ok: true; solicitud: Solicitud } | { ok: false; reason: 'not_found' | 'locked' | 'no_informe' }>`
  - `runPreauth(solicitud: Solicitud, emit: Emit, deps?: PipelineDeps): Promise<{ ok: boolean }>`
  - `AGENT_VERSION`

- [ ] **Step 1: `src/lib/pipeline/events.ts`**

```ts
import type { Adjudication } from '@/lib/rules/types'

export type StepId = 'extract' | 'policy' | 'adjudicate' | 'letter' | 'sync'
export const STEP_ORDER: StepId[] = ['extract', 'policy', 'adjudicate', 'letter', 'sync']
export const STEP_TITLES: Record<StepId, string> = {
  extract: 'Extractor clínico (IA)', policy: 'Auditor de póliza', adjudicate: 'Adjudicador', letter: 'Carta al hospital', sync: 'Registro en Notion',
}

export type PipelineEvent =
  | { event: 'step'; data: { step: StepId; status: 'running' | 'done' | 'error'; title: string; detail?: string; data?: unknown } }
  | { event: 'token'; data: { text: string } }
  | { event: 'verdict'; data: Omit<Adjudication, 'reglas'> }
  | { event: 'error'; data: { message: string; step: StepId } }
  | { event: 'done'; data: { notionUrl: string } }

export type Emit = (e: PipelineEvent) => void
export const silentEmit: Emit = (e) => { if (e.event !== 'token') console.log(`[pipeline] ${e.event}`, JSON.stringify(e.data).slice(0, 200)) }
```

- [ ] **Step 2: `src/lib/pipeline/policy.ts`**

```ts
import { daysBetween, formatDate, formatMoney } from '@/lib/format'
import type { CatalogEntry, Policy, ReportMeta } from '@/lib/rules/types'

/** Evidencia legible de la etapa "Auditor de póliza" (antes de adjudicar). */
export function policyEvidence(policy: Policy | null, procedure: CatalogEntry | null, report: ReportMeta) {
  if (!policy) return { encontrada: false as const, cedula: report.cedula, resumen: `No existe póliza para la cédula ${report.cedula}.` }
  const dias = daysBetween(policy.inicioVigencia, report.fecha)
  const saldo = policy.sumaAsegurada - policy.montoConsumido
  return {
    encontrada: true as const, numero: policy.numero, asegurado: policy.asegurado, plan: policy.plan, estado: policy.estado,
    vigencia: `${formatDate(policy.inicioVigencia)} – ${formatDate(policy.finVigencia)}`, diasTranscurridos: dias, saldo, saldoTexto: formatMoney(saldo),
    preexistencias: policy.preexistencias, red: policy.red, enRed: policy.red.includes(report.hospital),
    procedimiento: procedure ? { nombre: procedure.procedimiento, cpt: procedure.cpt, planes: procedure.planes, carenciaDias: procedure.carenciaDias, exentoEnEmergencia: procedure.exentoEnEmergencia, excluido: procedure.excluido, documentosRequeridos: procedure.documentosRequeridos, montoMaximo: procedure.montoMaximo ?? null } : null,
    resumen: `Póliza ${policy.numero} (${policy.plan}, ${policy.estado}); ${dias} días de vigencia a la fecha del informe; saldo ${formatMoney(saldo)}.`,
  }
}
```

- [ ] **Step 3: `src/lib/pipeline/sync.ts`**

```ts
import type { BlockObjectRequest } from '@notionhq/client'
import { clausula } from '@/lib/rules/clauses'
import type { Adjudication, ExtractedReport } from '@/lib/rules/types'

const text = (content: string, bold = false) => ({ type: 'text' as const, text: { content: content.slice(0, 1900) }, annotations: { bold } })
const paragraph = (content: string, bold = false): BlockObjectRequest => ({ object: 'block', type: 'paragraph', paragraph: { rich_text: [text(content, bold)] } })
const heading = (content: string): BlockObjectRequest => ({ object: 'block', type: 'heading_3', heading_3: { rich_text: [text(content)] } })
const bullet = (content: string): BlockObjectRequest => ({ object: 'block', type: 'bulleted_list_item', bulleted_list_item: { rich_text: [text(content)] } })
const divider = (): BlockObjectRequest => ({ object: 'block', type: 'divider', divider: {} })

const icon = (r: Adjudication['reglas'][number]['resultado']) => (r === 'cumple' ? '✅' : r === 'no_cumple' ? '❌' : '⏭️')

/** Bloques que el agente añade a la página de la Solicitud en cada análisis (historial: nunca se borran desde el pipeline). */
export function buildVerdictBlocks(a: Adjudication, carta: string, extraction: ExtractedReport, meta: { version: string; modelId: string; analizadoEl: string }): BlockObjectRequest[] {
  const out: BlockObjectRequest[] = [divider(), paragraph(`— amparo ${meta.version} · ${meta.modelId} · ${meta.analizadoEl} —`, true), heading('Carta al hospital')]
  for (const p of carta.split(/\n\s*\n/)) if (p.trim()) out.push(paragraph(p.trim()))
  out.push(heading('Traza del adjudicador'))
  for (const r of a.reglas) out.push(bullet(`${icon(r.resultado)} ${r.id} · ${r.titulo} — ${r.evidencia}${r.clausula ? ` (${clausula(r.clausula)})` : ''}`))
  if (a.advertencias.length) { out.push(heading('Advertencias para el auditor')); for (const w of a.advertencias) out.push(bullet(w)) }
  out.push(heading('Extracción clínica'), paragraph(`Procedimiento en el informe: "${extraction.procedimientoTexto}" · Diagnóstico: ${extraction.diagnostico} · Especialidad: ${extraction.especialidad} · Atención inferida: ${extraction.tipoAtencionInferido} · Confianza: ${extraction.confianza.toFixed(2)}`), paragraph(`Justificación: ${extraction.justificacionClinica}`))
  return out
}
```

- [ ] **Step 4: `src/lib/pipeline/run.ts`**

```ts
import * as notionRepo from '@/lib/notion/repo'
import type { Solicitud } from '@/lib/notion/mappers'
import { DEFAULT_RULES_CONFIG } from '@/lib/rules/config'
import { adjudicate } from '@/lib/rules/engine'
import type { Adjudication, CatalogEntry, ExtractedReport, RulesConfig } from '@/lib/rules/types'
import { type Emit, STEP_TITLES, type StepId } from './events'
import { extractReport, type ExtractInput } from './extract'
import { type LetterInput, streamLetter } from './letter'
import { policyEvidence } from './policy'
import { buildVerdictBlocks } from './sync'

export const AGENT_VERSION = 'amparo@1.0.0'

export type PipelineDeps = {
  repo: Pick<typeof notionRepo, 'getSolicitud' | 'acquireLock' | 'getInforme' | 'getCatalogo' | 'findPolizaByCedula' | 'saveVerdict' | 'saveError' | 'appendBlocks'>
  extract: (input: ExtractInput) => Promise<{ extraction: ExtractedReport; modelId: string; attempts: number }>
  letter: (input: LetterInput, onToken: (t: string) => void) => Promise<string>
  config: RulesConfig
}
export const defaultDeps: PipelineDeps = { repo: notionRepo, extract: extractReport, letter: streamLetter, config: DEFAULT_RULES_CONFIG }

export async function startAnalysis(id: string, deps: PipelineDeps = defaultDeps): Promise<{ ok: true; solicitud: Solicitud } | { ok: false; reason: 'not_found' | 'locked' | 'no_informe' }> {
  const s = await deps.repo.getSolicitud(id)
  if (!s) return { ok: false, reason: 'not_found' }
  if (!s.informePageId) return { ok: false, reason: 'no_informe' }
  const locked = await deps.repo.acquireLock(s, deps.config.lockMinutos)
  return locked ? { ok: true, solicitud: s } : { ok: false, reason: 'locked' }
}

/** Ejecuta las 5 etapas sobre una solicitud ya bloqueada. Nunca lanza: los errores se emiten y se guardan en Notion. */
export async function runPreauth(s: Solicitud, emit: Emit, deps: PipelineDeps = defaultDeps): Promise<{ ok: boolean }> {
  let step: StepId = 'extract'
  const running = (id: StepId, detail?: string) => { step = id; emit({ event: 'step', data: { step: id, status: 'running', title: STEP_TITLES[id], detail } }) }
  const done = (id: StepId, detail: string, data?: unknown) => emit({ event: 'step', data: { step: id, status: 'done', title: STEP_TITLES[id], detail, data } })
  try {
    running('extract', 'Leyendo el informe clínico…')
    const [{ meta, prosa }, catalog] = await Promise.all([deps.repo.getInforme(s.informePageId!), deps.repo.getCatalogo()])
    const { extraction, modelId, attempts } = await deps.extract({ prosa, meta, catalog })
    const procedure: CatalogEntry | null = extraction.catalogoId ? (catalog.find((c) => c.id === extraction.catalogoId) ?? null) : null
    done('extract', procedure ? `${procedure.procedimiento} (CPT ${procedure.cpt}) · confianza ${extraction.confianza.toFixed(2)}` : `Sin procedimiento identificable · confianza ${extraction.confianza.toFixed(2)}`, { extraction, modelId, attempts, procedure })

    running('policy', `Buscando póliza por cédula ${meta.cedula}…`)
    const policy = await deps.repo.findPolizaByCedula(meta.cedula)
    const evidence = policyEvidence(policy, procedure, meta)
    done('policy', evidence.resumen, evidence)

    running('adjudicate', 'Aplicando las reglas de cobertura…')
    const adjudication: Adjudication = adjudicate({ extraction, report: meta, policy, procedure, config: deps.config })
    done('adjudicate', adjudication.veredicto, { estado: adjudication.estado, reglas: adjudication.reglas, clausulas: adjudication.clausulas, advertencias: adjudication.advertencias })

    running('letter', 'Redactando la respuesta al hospital…')
    const carta = await deps.letter({ adjudication, extraction, report: meta, policy, procedure }, (text) => emit({ event: 'token', data: { text } }))
    done('letter', `${carta.split(/\s+/).length} palabras`)

    running('sync', 'Escribiendo el veredicto en Notion…')
    const analizadoEl = new Date().toISOString()
    await deps.repo.saveVerdict(s.pageId, adjudication, { extraction, procedure, policyPageId: policy?.notionPageId ?? null, version: AGENT_VERSION })
    await deps.repo.appendBlocks(s.pageId, buildVerdictBlocks(adjudication, carta, extraction, { version: AGENT_VERSION, modelId, analizadoEl }))
    done('sync', 'Solicitud actualizada')

    const { reglas: _omit, ...verdict } = adjudication
    void _omit
    emit({ event: 'verdict', data: verdict })
    emit({ event: 'done', data: { notionUrl: s.url } })
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    console.error(`[pipeline] ${s.id} falló en ${step}:`, message)
    try { await deps.repo.saveError(s.pageId, `Error en ${STEP_TITLES[step]}: ${message}`) } catch (e2) { console.error('[pipeline] no se pudo guardar el error en Notion', e2) }
    emit({ event: 'step', data: { step, status: 'error', title: STEP_TITLES[step], detail: message } })
    emit({ event: 'error', data: { message, step } })
    return { ok: false }
  }
}
```

- [ ] **Step 5: Test** `tests/pipeline/run.test.ts`

```ts
import { describe, expect, it } from 'bun:test'
import type { Solicitud } from '@/lib/notion/mappers'
import { type PipelineEvent } from '@/lib/pipeline/events'
import { type PipelineDeps, runPreauth, startAnalysis } from '@/lib/pipeline/run'
import { DEFAULT_RULES_CONFIG } from '@/lib/rules/config'
import { apendicectomia, extractionBase, policyBase, reportBase } from '../rules/fixtures'

const solicitud: Solicitud = { id: 'PA-0001', pageId: 'page-1', url: 'https://notion.so/page-1', estado: 'Pendiente', escenario: '', esperado: 'Preaprobada', paciente: '', hospital: '', informePageId: 'inf-1', polizaPageId: null, procedimientoDetectado: '', cptDetectado: '', veredicto: '', motivo: '', clausulas: '', documentosFaltantes: [], elegibleDesde: null, topeAprobado: null, confianza: null, analizadoEl: null, version: '' }

function deps(over: Partial<PipelineDeps['repo']> = {}, extractFails = false): PipelineDeps & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    repo: {
      getSolicitud: async (id) => (id === 'PA-0001' ? solicitud : null),
      acquireLock: async () => { calls.push('lock'); return true },
      getInforme: async () => ({ meta: reportBase, prosa: 'Informe…' }),
      getCatalogo: async () => [apendicectomia],
      findPolizaByCedula: async () => policyBase,
      saveVerdict: async () => { calls.push('saveVerdict') },
      saveError: async () => { calls.push('saveError') },
      appendBlocks: async () => { calls.push('appendBlocks') },
      ...over,
    },
    extract: async () => { if (extractFails) throw new Error('modelo caído'); return { extraction: extractionBase, modelId: 'mock', attempts: 1 } },
    letter: async (_x, onToken) => { onToken('Estado: Preaprobada'); return 'Estado: Preaprobada\n\nCarta.' },
    config: DEFAULT_RULES_CONFIG,
  }
}

describe('runPreauth', () => {
  it('emite las 5 etapas, el veredicto y done; escribe en Notion', async () => {
    const d = deps()
    const events: PipelineEvent[] = []
    const r = await runPreauth(solicitud, (e) => events.push(e), d)
    expect(r.ok).toBe(true)
    const doneSteps = events.filter((e) => e.event === 'step' && e.data.status === 'done').map((e) => (e as { data: { step: string } }).data.step)
    expect(doneSteps).toEqual(['extract', 'policy', 'adjudicate', 'letter', 'sync'])
    expect(events.some((e) => e.event === 'token')).toBe(true)
    expect((events.find((e) => e.event === 'verdict') as { data: { estado: string } }).data.estado).toBe('Preaprobada')
    expect(events.at(-1)?.event).toBe('done')
    expect(d.calls).toEqual(['saveVerdict', 'appendBlocks'])
  })
  it('ante un fallo guarda Error en Notion y emite error sin lanzar', async () => {
    const d = deps({}, true)
    const events: PipelineEvent[] = []
    const r = await runPreauth(solicitud, (e) => events.push(e), d)
    expect(r.ok).toBe(false)
    expect(d.calls).toEqual(['saveError'])
    expect(events.at(-1)?.event).toBe('error')
  })
})

describe('startAnalysis', () => {
  it('not_found si no existe', async () => expect(await startAnalysis('PA-9999', deps())).toEqual({ ok: false, reason: 'not_found' }))
  it('locked si el lock falla', async () => expect(await startAnalysis('PA-0001', deps({ acquireLock: async () => false }))).toEqual({ ok: false, reason: 'locked' }))
  it('ok con la solicitud bloqueada', async () => expect((await startAnalysis('PA-0001', deps())).ok).toBe(true))
})
```

- [ ] **Step 6: Verificar y commit**

```bash
bun test && bun run typecheck
git add src/lib/pipeline tests/pipeline/run.test.ts
git commit -m "feat: pipeline runPreauth con eventos, evidencia de póliza y bloques de veredicto"
```

---

### Task 11: Endpoint SSE `POST /api/solicitudes/[id]/analizar`

**Files:**
- Create: `src/app/api/solicitudes/[id]/analizar/route.ts`, `src/lib/sse.ts`
- Test: `tests/sse.test.ts`

**Interfaces:**
- Produces: `formatSSE(e: PipelineEvent): string`; ruta que responde `text/event-stream` (200), `404` si no existe, `409` si está bloqueada, `422` si no tiene informe.

- [ ] **Step 1: `src/lib/sse.ts`**

```ts
import type { PipelineEvent } from '@/lib/pipeline/events'

export function formatSSE(e: PipelineEvent): string {
  return `event: ${e.event}\ndata: ${JSON.stringify(e.data)}\n\n`
}

export const SSE_HEADERS = {
  'Content-Type': 'text/event-stream; charset=utf-8',
  'Cache-Control': 'no-cache, no-transform',
  'Connection': 'keep-alive',
  'X-Accel-Buffering': 'no',
} as const
```

- [ ] **Step 2: Test** `tests/sse.test.ts`

```ts
import { describe, expect, it } from 'bun:test'
import { formatSSE } from '@/lib/sse'

describe('formatSSE', () => {
  it('serializa evento y data en dos líneas y línea en blanco', () => {
    expect(formatSSE({ event: 'token', data: { text: 'hola\nmundo' } })).toBe('event: token\ndata: {"text":"hola\\nmundo"}\n\n')
  })
})
```

- [ ] **Step 3: Ruta** `src/app/api/solicitudes/[id]/analizar/route.ts`

```ts
import { runPreauth, startAnalysis } from '@/lib/pipeline/run'
import { formatSSE, SSE_HEADERS } from '@/lib/sse'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const start = await startAnalysis(id)
  if (!start.ok) {
    const status = start.reason === 'not_found' ? 404 : start.reason === 'locked' ? 409 : 422
    const message = start.reason === 'not_found' ? 'Solicitud no encontrada' : start.reason === 'locked' ? 'Ya hay un análisis en curso para esta solicitud' : 'La solicitud no tiene informe médico asociado'
    return Response.json({ error: message }, { status })
  }
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false
      const write = (s: string) => { if (!closed) controller.enqueue(encoder.encode(s)) }
      const keepAlive = setInterval(() => write(': keep-alive\n\n'), 15_000)
      runPreauth(start.solicitud, (e) => write(formatSSE(e)))
        .catch((e) => write(formatSSE({ event: 'error', data: { message: String(e), step: 'sync' } })))
        .finally(() => { clearInterval(keepAlive); closed = true; controller.close() })
    },
  })
  return new Response(stream, { headers: SSE_HEADERS })
}
```

- [ ] **Step 4: Prueba manual end-to-end (1 llamada real, PA-0001)**

```bash
bun dev &
curl -N -X POST http://localhost:3010/api/solicitudes/PA-0001/analizar
```
Expected: eventos `step` running/done para las 5 etapas, `token`s de la carta, `verdict` con `estado: "Preaprobada"`, `done`. En Notion, PA-0001 pasa a `Preaprobada` con la carta y la traza en el cuerpo. Repetir el `curl` de inmediato dos veces en paralelo: uno de los dos debe responder `409`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/sse.ts src/app/api/solicitudes tests/sse.test.ts
git commit -m "feat: endpoint SSE de análisis con lock y keep-alive"
```

---

### Task 12: Consola — layout, tokens visuales y lista de solicitudes

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/page.tsx`
- Create: `src/components/EstadoBadge.tsx`, `src/components/SolicitudTable.tsx`, `src/lib/notion/urls.ts`

**Interfaces:**
- Consumes: `listSolicitudes()` (Task 8), `Solicitud` (Task 6).
- Produces: `EstadoBadge`, `SolicitudTable`, `notionPageUrl(id)`.

Antes de escribir UI: invocar `vorluno-web-standards` y `vorluno-ui-integracion` (5 preguntas del sitio). Estética fijada en `docs/DISENO.md` §6.3: monocromo, Geist, **un solo verde vivo** (el de Preaprobada); rojo y ámbar apagados; sin animación decorativa.

- [ ] **Step 1: `src/app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-ink: #141414;
  --color-ink-2: #4b4b4b;
  --color-ink-3: #8c8c8c;
  --color-paper: #fafaf9;
  --color-surface: #ffffff;
  --color-line: #e6e6e3;
  --color-ok: #15803d;      /* único verde vivo: veredicto Preaprobada */
  --color-ok-bg: #f0fdf4;
  --color-no: #9f1239;      /* rechazo, apagado */
  --color-no-bg: #fff1f2;
  --color-warn: #a16207;    /* documentos faltantes, apagado */
  --color-warn-bg: #fefce8;
  --color-run: #1d4ed8;     /* en curso */
  --font-sans: var(--font-geist-sans), ui-sans-serif, system-ui;
  --font-mono: var(--font-geist-mono), ui-monospace, monospace;
}

html { background: var(--color-paper); color: var(--color-ink); }
body { font-family: var(--font-sans); -webkit-font-smoothing: antialiased; }
```

- [ ] **Step 2: `src/lib/notion/urls.ts`**

```ts
/** id con guiones → URL pública de Notion. */
export const notionPageUrl = (id: string) => `https://www.notion.so/${id.replace(/-/g, '')}`
```

- [ ] **Step 3: `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import Link from 'next/link'
import { notionPageUrl } from '@/lib/notion/urls'
import './globals.css'

const sans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

export const metadata: Metadata = {
  title: 'Amparo · Pre-autorización quirúrgica en tiempo real',
  description: 'Agente que cruza el informe médico del hospital con la póliza del asegurado en Notion y emite preaprobación, rechazo o solicitud de documentos, con cada regla y cláusula a la vista.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const rootId = process.env.NOTION_ROOT_PAGE_ID
  return (
    <html lang="es" className={`${sans.variable} ${mono.variable}`}>
      <body className="min-h-dvh flex flex-col">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between gap-4">
            <Link href="/" className="flex items-baseline gap-3">
              <span className="text-xl font-semibold tracking-tight">Amparo</span>
              <span className="hidden sm:inline text-sm text-ink-3">Pre-autorización quirúrgica en tiempo real</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm text-ink-2">
              {rootId && <a href={notionPageUrl(rootId)} target="_blank" rel="noreferrer" className="hover:text-ink">Datos en Notion ↗</a>}
              <a href="https://github.com/vorluno/amparo" target="_blank" rel="noreferrer" className="hover:text-ink">Repositorio ↗</a>
            </nav>
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 flex-1">{children}</main>
        <footer className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-4 text-xs text-ink-3">HackIAthon Viamatica · Reto 1 · La IA lee y redacta; las reglas deciden.</div>
        </footer>
      </body>
    </html>
  )
}
```

- [ ] **Step 4: `src/components/EstadoBadge.tsx`**

```tsx
import type { EstadoSolicitud } from '@/lib/rules/types'

const STYLES: Record<EstadoSolicitud, string> = {
  'Pendiente': 'bg-paper text-ink-2 border-line',
  'En análisis': 'bg-surface text-run border-run/30',
  'Preaprobada': 'bg-ok-bg text-ok border-ok/30',
  'Rechazada': 'bg-no-bg text-no border-no/30',
  'Documentos faltantes': 'bg-warn-bg text-warn border-warn/30',
  'Error': 'bg-no-bg text-no border-no/30',
}

export function EstadoBadge({ estado }: { estado: EstadoSolicitud }) {
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap ${STYLES[estado]}`}>{estado}</span>
}
```

- [ ] **Step 5: `src/components/SolicitudTable.tsx`**

```tsx
import Link from 'next/link'
import type { Solicitud } from '@/lib/notion/mappers'
import { EstadoBadge } from './EstadoBadge'

export function SolicitudTable({ rows }: { rows: Solicitud[] }) {
  if (!rows.length) {
    return <div className="rounded-lg border border-dashed border-line p-10 text-center text-ink-3">No hay solicitudes. Ejecuta <code className="font-mono">bun run notion:seed</code> para poblar la demo.</div>
  }
  return (
    <div className="overflow-x-auto rounded-lg border border-line bg-surface">
      <table className="w-full text-sm">
        <thead className="text-left text-xs uppercase tracking-wide text-ink-3">
          <tr className="border-b border-line">
            <th className="px-4 py-3">ID</th><th className="px-4 py-3">Escenario</th><th className="px-4 py-3">Paciente</th><th className="px-4 py-3">Hospital</th><th className="px-4 py-3">Estado</th><th className="px-4 py-3 text-right">Acción</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const accion = s.estado === 'Pendiente' || s.estado === 'Error' ? 'Analizar' : s.estado === 'En análisis' ? 'Ver progreso' : 'Ver resultado'
            return (
              <tr key={s.id} className="border-b border-line last:border-0 hover:bg-paper">
                <td className="px-4 py-3 font-mono text-xs">{s.id}</td>
                <td className="px-4 py-3">{s.escenario || '—'}</td>
                <td className="px-4 py-3">{s.paciente || '—'}</td>
                <td className="px-4 py-3 text-ink-2">{s.hospital || '—'}</td>
                <td className="px-4 py-3"><EstadoBadge estado={s.estado} /></td>
                <td className="px-4 py-3 text-right"><Link href={`/solicitudes/${s.id}`} className="font-medium underline-offset-4 hover:underline">{accion} →</Link></td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
```

- [ ] **Step 6: `src/app/page.tsx`**

```tsx
import { listSolicitudes } from '@/lib/notion/repo'
import { SolicitudTable } from '@/components/SolicitudTable'

export const dynamic = 'force-dynamic'

export default async function Home() {
  let rows: Awaited<ReturnType<typeof listSolicitudes>> = []
  let error: string | null = null
  try { rows = await listSolicitudes() } catch (e) { error = e instanceof Error ? e.message : String(e) }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Solicitudes de pre-autorización</h1>
        <p className="mt-1 text-sm text-ink-2 max-w-2xl">Cada solicitud enlaza un informe médico del hospital. El agente busca la póliza por cédula, aplica las reglas de cobertura y escribe el veredicto en Notion. Elige una para verlo razonar.</p>
      </div>
      {error ? (
        <div className="rounded-lg border border-no/30 bg-no-bg p-4 text-sm text-no">No se pudo leer Notion: {error}. <a href="/" className="underline">Reintentar</a></div>
      ) : (
        <SolicitudTable rows={rows} />
      )}
    </div>
  )
}
```

- [ ] **Step 7: Ver en el navegador y commit**

```bash
bun dev
```
Abrir `http://localhost:3010`: tabla con PA-0001 y PA-0003 (estado real de Notion). Capturas a 1280 y 400 (con `example-skills:webapp-testing` o Chrome): sin scroll horizontal en 400 salvo el de la tabla contenida.

```bash
git add src/app src/components src/lib/notion/urls.ts
git commit -m "feat: consola — layout, tokens visuales y lista de solicitudes"
```

---

### Task 13: Consola — detalle con streaming, evidencia y veredicto

**Files:**
- Create: `src/lib/sse-client.ts`, `src/app/api/solicitudes/[id]/route.ts`, `src/app/solicitudes/[id]/page.tsx`, `src/components/ReportPane.tsx`, `src/components/AnalysisPanel.tsx`, `src/components/StepList.tsx`, `src/components/RulesTable.tsx`, `src/components/VerdictCard.tsx`
- Test: `tests/sse-client.test.ts`

**Interfaces:**
- Consumes: `getSolicitud`, `getInforme` (Task 8); `PipelineEvent`, `STEP_ORDER`, `STEP_TITLES` (Task 10); endpoint SSE (Task 11).
- Produces: `readSSE(res)`; `GET /api/solicitudes/[id]` → `Solicitud` JSON (polling).

- [ ] **Step 1: `src/lib/sse-client.ts`**

```ts
export type SSEMessage = { event: string; data: string }

/** Parser SSE mínimo sobre fetch (EventSource no permite POST). */
export async function* readSSE(res: Response): AsyncGenerator<SSEMessage> {
  if (!res.body) throw new Error('Respuesta sin cuerpo')
  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    let idx: number
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const raw = buffer.slice(0, idx)
      buffer = buffer.slice(idx + 2)
      const msg = parseBlock(raw)
      if (msg) yield msg
    }
  }
}

export function parseBlock(raw: string): SSEMessage | null {
  let event = 'message'
  const data: string[] = []
  for (const line of raw.split('\n')) {
    if (line.startsWith(':')) continue
    if (line.startsWith('event:')) event = line.slice(6).trim()
    else if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
  }
  return data.length ? { event, data: data.join('\n') } : null
}
```

`tests/sse-client.test.ts`

```ts
import { describe, expect, it } from 'bun:test'
import { parseBlock } from '@/lib/sse-client'

describe('parseBlock', () => {
  it('lee event y data', () => expect(parseBlock('event: token\ndata: {"text":"a"}')).toEqual({ event: 'token', data: '{"text":"a"}' }))
  it('ignora comentarios keep-alive', () => expect(parseBlock(': keep-alive')).toBeNull())
})
```

- [ ] **Step 2: `src/app/api/solicitudes/[id]/route.ts`** (polling)

```ts
import { getSolicitud } from '@/lib/notion/repo'

export const dynamic = 'force-dynamic'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const s = await getSolicitud(id)
  return s ? Response.json(s) : Response.json({ error: 'Solicitud no encontrada' }, { status: 404 })
}
```

- [ ] **Step 3: `src/components/ReportPane.tsx`**

```tsx
import { formatDate, formatMoney } from '@/lib/format'
import type { ReportMeta } from '@/lib/rules/types'

function Bold({ text }: { text: string }) {
  return <>{text.split('**').map((seg, i) => (i % 2 ? <strong key={i} className="font-semibold text-ink">{seg}</strong> : <span key={i}>{seg}</span>))}</>
}

export function ReportPane({ meta, prosa }: { meta: ReportMeta; prosa: string }) {
  const filas: Array<[string, string]> = [
    ['Paciente', `${meta.paciente} · C.I. ${meta.cedula}`], ['Hospital', meta.hospital], ['Médico', meta.medico], ['Fecha', formatDate(meta.fecha)],
    ['Atención', meta.tipoAtencion], ['Presupuesto', formatMoney(meta.presupuesto)], ['Adjuntos', meta.adjuntos.length ? meta.adjuntos.join(', ') : 'Ninguno'],
  ]
  return (
    <section className="rounded-lg border border-line bg-surface">
      <div className="border-b border-line px-5 py-3 flex items-center justify-between"><h2 className="text-sm font-semibold">Informe médico <span className="font-mono text-xs text-ink-3">{meta.id}</span></h2><span className="text-xs text-ink-3">Hospital</span></div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 px-5 py-4 text-sm border-b border-line">
        {filas.map(([k, v]) => (<div key={k} className="contents"><dt className="text-ink-3">{k}</dt><dd>{v}</dd></div>))}
      </dl>
      <div className="px-5 py-4 space-y-3 text-sm leading-relaxed text-ink-2">
        {prosa.split(/\n\s*\n/).map((p, i) => (<p key={i}><Bold text={p} /></p>))}
      </div>
    </section>
  )
}
```

- [ ] **Step 4: `src/components/RulesTable.tsx`**

```tsx
import { clausula } from '@/lib/rules/clauses'
import type { RuleResult } from '@/lib/rules/types'

const MARK: Record<RuleResult['resultado'], { t: string; c: string }> = { cumple: { t: 'Cumple', c: 'text-ok' }, no_cumple: { t: 'No cumple', c: 'text-no' }, no_aplica: { t: 'No aplica', c: 'text-ink-3' } }

export function RulesTable({ reglas }: { reglas: RuleResult[] }) {
  return (
    <table className="w-full text-xs">
      <tbody>
        {reglas.map((r) => (
          <tr key={r.id} className="border-t border-line align-top">
            <td className="py-2 pr-2 font-mono text-ink-3">{r.id}</td>
            <td className="py-2 pr-2"><div className="font-medium text-ink">{r.titulo}</div><div className="text-ink-2">{r.evidencia}</div>{r.clausula && <div className="text-ink-3">{clausula(r.clausula)}</div>}</td>
            <td className={`py-2 whitespace-nowrap font-medium ${MARK[r.resultado].c}`}>{MARK[r.resultado].t}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
```

- [ ] **Step 5: `src/components/VerdictCard.tsx`**

```tsx
import { formatDate, formatMoney } from '@/lib/format'
import { clausula } from '@/lib/rules/clauses'
import type { Adjudication } from '@/lib/rules/types'

export type VerdictView = Pick<Adjudication, 'estado' | 'veredicto' | 'motivo' | 'clausulas' | 'documentosFaltantes'> & { elegibleDesde?: string | null; topeAprobado?: number | null; esperado?: Adjudication['estado'] | null }

const TONE: Record<Adjudication['estado'], string> = { 'Preaprobada': 'border-ok/40 bg-ok-bg', 'Rechazada': 'border-no/30 bg-no-bg', 'Documentos faltantes': 'border-warn/30 bg-warn-bg' }
const TEXT: Record<Adjudication['estado'], string> = { 'Preaprobada': 'text-ok', 'Rechazada': 'text-no', 'Documentos faltantes': 'text-warn' }

export function VerdictCard({ v }: { v: VerdictView }) {
  return (
    <section className={`rounded-lg border p-5 ${TONE[v.estado]}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className={`text-xs font-semibold uppercase tracking-wide ${TEXT[v.estado]}`}>{v.estado}</div>
          <h3 className="mt-1 text-lg font-semibold tracking-tight">{v.veredicto}</h3>
        </div>
        {v.esperado && <div className="text-xs text-ink-3 text-right whitespace-nowrap">Esperado: {v.esperado}<br /><span className={v.esperado === v.estado ? 'text-ok' : 'text-no'}>{v.esperado === v.estado ? 'coincide' : 'no coincide'}</span></div>}
      </div>
      <p className="mt-3 text-sm text-ink-2">{v.motivo}</p>
      <dl className="mt-3 grid gap-1 text-sm">
        {v.clausulas.length > 0 && <div><dt className="inline text-ink-3">Cláusulas: </dt><dd className="inline">{v.clausulas.map(clausula).join(' · ')}</dd></div>}
        {v.documentosFaltantes.length > 0 && <div><dt className="inline text-ink-3">Documentos requeridos: </dt><dd className="inline">{v.documentosFaltantes.join(', ')}</dd></div>}
        {v.elegibleDesde && <div><dt className="inline text-ink-3">Elegible desde: </dt><dd className="inline">{formatDate(v.elegibleDesde)}</dd></div>}
        {v.topeAprobado != null && <div><dt className="inline text-ink-3">Tope aprobado: </dt><dd className="inline">{formatMoney(v.topeAprobado)}</dd></div>}
      </dl>
    </section>
  )
}
```

- [ ] **Step 6: `src/components/StepList.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { STEP_ORDER, STEP_TITLES, type StepId } from '@/lib/pipeline/events'
import { RulesTable } from './RulesTable'

export type StepState = { status: 'idle' | 'running' | 'done' | 'error'; detail?: string; data?: unknown }
export type Steps = Record<StepId, StepState>
export const idleSteps = (): Steps => ({ extract: { status: 'idle' }, policy: { status: 'idle' }, adjudicate: { status: 'idle' }, letter: { status: 'idle' }, sync: { status: 'idle' } })

const DOT: Record<StepState['status'], string> = { idle: 'bg-line', running: 'bg-run animate-pulse', done: 'bg-ink', error: 'bg-no' }

function KV({ rows }: { rows: Array<[string, unknown]> }) {
  return <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">{rows.filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => (<div key={k} className="contents"><dt className="text-ink-3">{k}</dt><dd className="text-ink-2 break-words">{Array.isArray(v) ? (v.length ? v.join(', ') : '—') : String(v)}</dd></div>))}</dl>
}

function Evidence({ step, data, letter }: { step: StepId; data: unknown; letter: string }) {
  const d = (data ?? {}) as Record<string, any> // eslint-disable-line @typescript-eslint/no-explicit-any
  if (step === 'extract' && d.extraction) { const e = d.extraction; return <KV rows={[['Procedimiento en el informe', e.procedimientoTexto], ['Del catálogo', d.procedure ? `${d.procedure.procedimiento} (CPT ${d.procedure.cpt})` : 'ninguno'], ['Diagnóstico', e.diagnostico], ['Especialidad', e.especialidad], ['Atención inferida', e.tipoAtencionInferido], ['Documentos mencionados', e.documentosMencionados], ['Finalidad estética', e.esEstetico ? 'sí' : 'no'], ['Confianza', e.confianza?.toFixed?.(2)], ['Ambigüedades', e.ambiguedades], ['Justificación', e.justificacionClinica], ['Modelo', `${d.modelId} · ${d.attempts} intento(s)`]]} /> }
  if (step === 'policy') { return d.encontrada ? <KV rows={[['Póliza', `${d.numero} · ${d.asegurado}`], ['Plan', d.plan], ['Estado', d.estado], ['Vigencia', d.vigencia], ['Días transcurridos', d.diasTranscurridos], ['Saldo', d.saldoTexto], ['Preexistencias', d.preexistencias], ['Hospital en red', d.enRed ? 'sí' : 'no'], ['Carencia del procedimiento', d.procedimiento ? `${d.procedimiento.carenciaDias} días${d.procedimiento.exentoEnEmergencia ? ' (exento en emergencia)' : ''}` : undefined], ['Documentos requeridos', d.procedimiento?.documentosRequeridos]]} /> : <p className="text-xs text-ink-2">{d.resumen}</p> }
  if (step === 'adjudicate' && d.reglas) return <RulesTable reglas={d.reglas} />
  if (step === 'letter') return letter ? <pre className="whitespace-pre-wrap font-sans text-xs leading-relaxed text-ink-2">{letter}</pre> : null
  return null
}

export function StepList({ steps, letter }: { steps: Steps; letter: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({ adjudicate: true, letter: true })
  return (
    <ol className="divide-y divide-line rounded-lg border border-line bg-surface">
      {STEP_ORDER.map((id, i) => {
        const s = steps[id]
        const canOpen = s.status === 'done' || (id === 'letter' && s.status === 'running')
        return (
          <li key={id}>
            <button type="button" disabled={!canOpen} onClick={() => setOpen((o) => ({ ...o, [id]: !o[id] }))} className="w-full flex items-start gap-3 px-4 py-3 text-left disabled:cursor-default">
              <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${DOT[s.status]}`} aria-hidden />
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2 text-sm"><span className="font-mono text-xs text-ink-3">{i + 1}</span><span className="font-medium">{STEP_TITLES[id]}</span>{canOpen && <span className="ml-auto text-xs text-ink-3">{open[id] ? 'ocultar' : 'ver evidencia'}</span>}</span>
                {s.detail && <span className={`block text-xs mt-0.5 ${s.status === 'error' ? 'text-no' : 'text-ink-2'}`}>{s.detail}</span>}
              </span>
            </button>
            {canOpen && open[id] && <div className="px-4 pb-4 pl-9"><Evidence step={id} data={s.data} letter={letter} /></div>}
          </li>
        )
      })}
    </ol>
  )
}
```

- [ ] **Step 7: `src/components/AnalysisPanel.tsx`**

```tsx
'use client'
import { useEffect, useRef, useState } from 'react'
import type { Solicitud } from '@/lib/notion/mappers'
import type { PipelineEvent } from '@/lib/pipeline/events'
import { readSSE } from '@/lib/sse-client'
import { idleSteps, StepList, type Steps } from './StepList'
import { VerdictCard, type VerdictView } from './VerdictCard'

type Phase = 'idle' | 'streaming' | 'polling' | 'finished' | 'failed'

function storedVerdict(s: Solicitud): VerdictView | null {
  if (s.estado !== 'Preaprobada' && s.estado !== 'Rechazada' && s.estado !== 'Documentos faltantes') return null
  return { estado: s.estado, veredicto: s.veredicto, motivo: s.motivo, clausulas: s.clausulas ? s.clausulas.split(',').map((x) => x.trim()).filter(Boolean) : [], documentosFaltantes: s.documentosFaltantes, elegibleDesde: s.elegibleDesde, topeAprobado: s.topeAprobado, esperado: s.esperado }
}

export function AnalysisPanel({ initial }: { initial: Solicitud }) {
  const [solicitud, setSolicitud] = useState(initial)
  const [phase, setPhase] = useState<Phase>(initial.estado === 'En análisis' ? 'polling' : storedVerdict(initial) ? 'finished' : 'idle')
  const [steps, setSteps] = useState<Steps>(idleSteps())
  const [letter, setLetter] = useState('')
  const [verdict, setVerdict] = useState<VerdictView | null>(storedVerdict(initial))
  const [error, setError] = useState<string | null>(initial.estado === 'Error' ? initial.motivo : null)
  const busy = useRef(false)

  useEffect(() => {
    if (phase !== 'polling') return
    const t = setInterval(async () => {
      const r = await fetch(`/api/solicitudes/${solicitud.id}`, { cache: 'no-store' })
      if (!r.ok) return
      const s = (await r.json()) as Solicitud
      if (s.estado !== 'En análisis') { setSolicitud(s); setVerdict(storedVerdict(s)); setError(s.estado === 'Error' ? s.motivo : null); setPhase(s.estado === 'Error' ? 'failed' : 'finished') }
    }, 3000)
    return () => clearInterval(t)
  }, [phase, solicitud.id])

  async function analizar() {
    if (busy.current) return
    busy.current = true
    setPhase('streaming'); setSteps(idleSteps()); setLetter(''); setVerdict(null); setError(null)
    try {
      const res = await fetch(`/api/solicitudes/${solicitud.id}/analizar`, { method: 'POST' })
      if (!res.ok) { const j = await res.json().catch(() => ({ error: res.statusText })); if (res.status === 409) { setPhase('polling'); return } throw new Error(j.error ?? `HTTP ${res.status}`) }
      let terminado = false
      for await (const m of readSSE(res)) {
        const e = { event: m.event, data: JSON.parse(m.data) } as PipelineEvent
        if (e.event === 'step') setSteps((s) => ({ ...s, [e.data.step]: { status: e.data.status, detail: e.data.detail, data: e.data.data ?? s[e.data.step].data } }))
        else if (e.event === 'token') setLetter((l) => l + e.data.text)
        else if (e.event === 'verdict') setVerdict({ ...e.data, esperado: solicitud.esperado })
        else if (e.event === 'error') { terminado = true; setError(e.data.message); setPhase('failed') }
        else if (e.event === 'done') { terminado = true; setPhase('finished'); setSolicitud((s) => ({ ...s, url: e.data.notionUrl })) }
      }
      if (!terminado) { setError('Conexión perdida. Vuelve a cargar la página para leer el resultado desde Notion.'); setPhase('failed') }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e)); setPhase('failed')
    } finally { busy.current = false }
  }

  const label = phase === 'idle' ? 'Analizar' : phase === 'streaming' ? 'Analizando…' : phase === 'polling' ? 'Análisis automático en curso…' : 'Reanalizar'
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={analizar} disabled={phase === 'streaming' || phase === 'polling'} className="rounded-md bg-ink px-4 py-2 text-sm font-medium text-surface disabled:opacity-50">{label}</button>
        <a href={solicitud.url} target="_blank" rel="noreferrer" className="text-sm text-ink-2 underline-offset-4 hover:underline">Ver en Notion ↗</a>
        {phase === 'polling' && <span className="text-xs text-ink-3">Disparado desde Notion. Esta vista se actualiza sola.</span>}
      </div>
      {error && <div className="rounded-lg border border-no/30 bg-no-bg p-3 text-sm text-no">{error}</div>}
      {verdict && <VerdictCard v={verdict} />}
      {(phase === 'streaming' || (phase === 'failed' && !verdict) || steps.extract.status !== 'idle') && <StepList steps={steps} letter={letter} />}
      {phase === 'finished' && steps.extract.status === 'idle' && <p className="text-xs text-ink-3">Resultado leído de Notion (analizado el {solicitud.analizadoEl ? new Date(solicitud.analizadoEl).toLocaleString('es-EC') : '—'}, {solicitud.version || 'agente'}). La carta y la traza completas están en la página de Notion. Pulsa "Reanalizar" para verlo en vivo.</p>}
    </div>
  )
}
```

- [ ] **Step 8: `src/app/solicitudes/[id]/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { AnalysisPanel } from '@/components/AnalysisPanel'
import { EstadoBadge } from '@/components/EstadoBadge'
import { ReportPane } from '@/components/ReportPane'
import { getInforme, getSolicitud } from '@/lib/notion/repo'

export const dynamic = 'force-dynamic'

export default async function SolicitudPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const s = await getSolicitud(id)
  if (!s) notFound()
  const informe = s.informePageId ? await getInforme(s.informePageId) : null
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3 text-sm"><Link href="/" className="text-ink-3 hover:text-ink">← Solicitudes</Link><span className="font-mono text-xs text-ink-3">{s.id}</span><EstadoBadge estado={s.estado} /></div>
      <div><h1 className="text-2xl font-semibold tracking-tight">{s.escenario || s.id}</h1>{s.esperado && <p className="mt-1 text-sm text-ink-3">Caso de demostración · veredicto esperado: {s.esperado}</p>}</div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <div>{informe ? <ReportPane meta={informe.meta} prosa={informe.prosa} /> : <div className="rounded-lg border border-warn/30 bg-warn-bg p-4 text-sm text-warn">Esta solicitud no tiene informe médico enlazado.</div>}</div>
        <div><AnalysisPanel initial={s} /></div>
      </div>
    </div>
  )
}
```

- [ ] **Step 9: Verificación visual y funcional**

1. `bun run notion:reset` (Task 14) o poner PA-0001 en `Pendiente` a mano por esta vez.
2. `bun dev` → `/solicitudes/PA-0001` → "Analizar": las etapas se encienden en orden, la carta llega palabra a palabra, aparece la tarjeta Preaprobada con "coincide".
3. Recargar: el resultado se lee desde Notion; "Reanalizar" repite el flujo.
4. `/solicitudes/PA-0003` → Documentos faltantes: Imagenología, Presupuesto hospitalario; advertencia "el informe menciona Imagenología pero no está adjunto" en la traza.
5. Capturas a 1280 y 400 de lista, detalle en curso y veredicto; guardar en `docs/media/`. Pasar `vorluno-ui-integracion` y `vorluno-selfcheck`.

- [ ] **Step 10: Commit**

```bash
bun test && bun run typecheck
git add src/app src/components src/lib/sse-client.ts tests/sse-client.test.ts docs/media
git commit -m "feat: consola — detalle con streaming, evidencia por etapa y veredicto"
```

---

### Task 14: Reset de la demo

**Files:**
- Create: `scripts/notion-reset.ts`

**Interfaces:**
- Consumes: `listSolicitudes`, `notion()`, `P`, `throttle`.
- Produces: `bun run notion:reset` → todas las solicitudes en `Pendiente`, propiedades del agente vacías, cuerpo de cada solicitud vacío (el seed nunca escribe cuerpo en Solicitudes; todo bloque ahí lo escribió el agente).

- [ ] **Step 1: `scripts/notion-reset.ts`**

```ts
import { notion, throttle } from '@/lib/notion/client'
import { wDate, wMulti, wNumber, wRelation, wSelect, wText } from '@/lib/notion/mappers'
import { listSolicitudes } from '@/lib/notion/repo'
import { P } from '@/lib/notion/schema'

const p = P.solicitudes
const CLEAN = {
  [p.estado]: wSelect('Pendiente'), [p.poliza]: wRelation([]), [p.procedimiento]: wText(''), [p.cpt]: wText(''), [p.veredicto]: wText(''), [p.motivo]: wText(''), [p.clausulas]: wText(''),
  [p.faltantes]: wMulti([]), [p.elegibleDesde]: wDate(null), [p.tope]: wNumber(null), [p.confianza]: wNumber(null), [p.analizadoEl]: wDate(null), [p.version]: wText(''),
}

async function deleteChildren(pageId: string): Promise<number> {
  let n = 0
  let cursor: string | undefined
  do {
    const res = await notion().blocks.children.list({ block_id: pageId, page_size: 100, ...(cursor ? { start_cursor: cursor } : {}) })
    for (const b of res.results) { await notion().blocks.delete({ block_id: b.id }); await throttle(); n++ }
    cursor = res.has_more && res.next_cursor ? res.next_cursor : undefined
  } while (cursor)
  return n
}

async function main() {
  const only = process.argv[2] // opcional: PA-0003
  for (const s of await listSolicitudes()) {
    if (only && s.id !== only) continue
    await notion().pages.update({ page_id: s.pageId, properties: CLEAN as never })
    await throttle()
    const n = await deleteChildren(s.pageId)
    console.log(`↺ ${s.id} → Pendiente (${n} bloques del agente eliminados)`)
  }
  console.log('✓ reset completo')
}

main().catch((e) => { console.error(e); process.exit(1) })
```
Este es el **único** lugar del sistema que borra algo, y solo bloques que escribió el agente en páginas de Solicitudes. Acepta un ID para resetear una sola: `bun run notion:reset PA-0003`.

- [ ] **Step 2: Probar y commit**

```bash
bun run notion:reset && bun run notion:reset PA-0001
git add scripts/notion-reset.ts
git commit -m "feat: reset de la demo (solicitudes a Pendiente, bloques del agente eliminados)"
```

---

### Task 15: Webhook de Notion

**Files:**
- Create: `src/app/api/webhooks/notion/route.ts`, `src/lib/webhook.ts`
- Test: `tests/webhook.test.ts`

**Interfaces:**
- Consumes: `verifyWebhookSignature` de `@notionhq/client`; `getSolicitudByPageId`, `acquireLock` (Task 8); `runPreauth`, `defaultDeps` (Task 10); `silentEmit`.
- Produces: `shouldProcess(event, solicitudesDsId): { process: boolean; reason: string }` (pura).

- [ ] **Step 1: `src/lib/webhook.ts`**

```ts
export type NotionWebhookEvent = {
  type: string
  entity?: { id: string; type: string }
  authors?: Array<{ id: string; type: 'person' | 'bot' | 'agent' }>
  data?: { parent?: { id: string; type: string }; updated_properties?: string[] }
}

const TYPES = new Set(['page.created', 'page.properties_updated'])

/** Filtro puro: qué eventos disparan un análisis. */
export function shouldProcess(e: NotionWebhookEvent, solicitudesDsId: string): { process: boolean; reason: string } {
  if (!TYPES.has(e.type)) return { process: false, reason: `tipo ${e.type} ignorado` }
  if (e.entity?.type !== 'page') return { process: false, reason: 'no es una página' }
  if (e.authors?.some((a) => a.type === 'bot')) return { process: false, reason: 'escritura propia (bot)' }
  const parent = e.data?.parent
  if (parent && parent.type === 'data_source' && parent.id.replace(/-/g, '') !== solicitudesDsId.replace(/-/g, '')) return { process: false, reason: 'otra base' }
  return { process: true, reason: 'ok' }
}
```

- [ ] **Step 2: Test** `tests/webhook.test.ts`

```ts
import { describe, expect, it } from 'bun:test'
import { shouldProcess } from '@/lib/webhook'

const DS = 'abcd1234'
const base = { type: 'page.properties_updated', entity: { id: 'p', type: 'page' }, authors: [{ id: 'u', type: 'person' as const }], data: { parent: { id: DS, type: 'data_source' } } }

describe('shouldProcess', () => {
  it('acepta cambios de persona en Solicitudes', () => expect(shouldProcess(base, DS).process).toBe(true))
  it('ignora escrituras del bot', () => expect(shouldProcess({ ...base, authors: [{ id: 'b', type: 'bot' }] }, DS).process).toBe(false))
  it('ignora otras bases', () => expect(shouldProcess({ ...base, data: { parent: { id: 'otra', type: 'data_source' } } }, DS).process).toBe(false))
  it('ignora otros tipos', () => expect(shouldProcess({ ...base, type: 'page.deleted' }, DS).process).toBe(false))
})
```

- [ ] **Step 3: Ruta** `src/app/api/webhooks/notion/route.ts`

```ts
import { verifyWebhookSignature } from '@notionhq/client'
import { after } from 'next/server'
import { notionEnv } from '@/lib/notion/client'
import { acquireLock, getSolicitudByPageId } from '@/lib/notion/repo'
import { silentEmit } from '@/lib/pipeline/events'
import { defaultDeps, runPreauth } from '@/lib/pipeline/run'
import { shouldProcess, type NotionWebhookEvent } from '@/lib/webhook'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: Request) {
  const body = await req.text()
  let payload: NotionWebhookEvent & { verification_token?: string }
  try { payload = JSON.parse(body) } catch { return Response.json({ error: 'JSON inválido' }, { status: 400 }) }

  // 1) Handshake inicial: Notion envía el token una sola vez al crear la suscripción.
  if (payload.verification_token) {
    console.log(`[webhook] verification_token recibido — guárdalo como NOTION_WEBHOOK_SECRET: ${payload.verification_token}`)
    return Response.json({ ok: true })
  }

  // 2) Firma.
  const secret = process.env.NOTION_WEBHOOK_SECRET
  if (!secret) return Response.json({ error: 'Webhook no configurado' }, { status: 503 })
  const signature = req.headers.get('x-notion-signature') ?? ''
  const trusted = await verifyWebhookSignature({ body, signature, verificationToken: secret })
  if (!trusted) return Response.json({ error: 'Firma inválida' }, { status: 401 })

  // 3) Filtro barato antes de tocar la API.
  const gate = shouldProcess(payload, notionEnv().solicitudes)
  if (!gate.process || !payload.entity) { console.log(`[webhook] ignorado: ${gate.reason}`); return Response.json({ ok: true, ignored: gate.reason }) }

  // 4) Responder ya; analizar después de responder.
  const pageId = payload.entity.id
  after(async () => {
    try {
      const s = await getSolicitudByPageId(pageId)
      if (s.estado !== 'Pendiente') { console.log(`[webhook] ${s.id} en estado ${s.estado}, no se analiza`); return }
      if (!s.informePageId) { console.log(`[webhook] ${s.id} sin informe`); return }
      if (!(await acquireLock(s, defaultDeps.config.lockMinutos))) { console.log(`[webhook] ${s.id} bloqueada`); return }
      console.log(`[webhook] analizando ${s.id}`)
      await runPreauth(s, silentEmit)
    } catch (e) { console.error('[webhook] error', e) }
  })
  return Response.json({ ok: true, queued: pageId })
}
```
La página del evento puede no ser una Solicitud (el filtro por `data.parent` solo aplica cuando Notion lo envía); por eso se relee la página y se comprueba `estado` y `informePageId` antes de correr.

- [ ] **Step 4: Suscripción (después del deploy, Task 16)**

1. En `notion.so/profile/integrations` → integración "claude" → pestaña Webhooks → crear suscripción con URL `https://amparo.vorluno.dev/api/webhooks/notion`, eventos `page.created` y `page.properties_updated`.
2. Leer en los logs de CapRover el `verification_token`, ponerlo en `NOTION_WEBHOOK_SECRET`, redeploy; volver a Notion y confirmar la verificación.
3. Prueba: `bun run notion:reset PA-0003`; en Notion cambiar cualquier propiedad de PA-0003 (o simplemente el reset ya la dejó Pendiente: editar `Escenario` y restaurarlo) → en ≤60 s pasa a `En análisis` y luego a `Documentos faltantes`; la consola en `/solicitudes/PA-0003` muestra "Análisis automático en curso" y luego el resultado.

- [ ] **Step 5: Commit**

```bash
bun test && bun run typecheck
git add src/lib/webhook.ts src/app/api/webhooks tests/webhook.test.ts
git commit -m "feat: webhook de Notion con verificación de firma, filtro y ejecución diferida"
```

---

### Task 16: Deploy en CapRover

**Files:**
- Create: `Dockerfile`, `captain-definition`, `.dockerignore`

- [ ] **Step 1: `Dockerfile`**

```dockerfile
FROM oven/bun:1 AS deps
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

FROM oven/bun:1 AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN bun run build

FROM node:22-alpine AS run
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0 NEXT_TELEMETRY_DISABLED=1
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

`captain-definition`

```json
{ "schemaVersion": 2, "dockerfilePath": "./Dockerfile" }
```

`.dockerignore`

```
node_modules
.next
.git
.env
.env.*
docs/media
```

- [ ] **Step 2: Build local para validar la imagen**

```bash
docker build -t amparo . && docker run --rm -p 3001:3000 --env-file .env amparo
curl -s localhost:3001/api/health
```
Expected: `{"ok":true,...}`. Si `next build` falla por `output: 'standalone'` con `next/font`, es normal que tarde; no toca nada.

- [ ] **Step 3: App en CapRover**

1. Crear app `amparo` (sin persistent data). Habilitar HTTPS y forzar HTTPS; dominio `amparo.vorluno.dev` (CNAME al captain).
2. Variables de entorno: todas las de `.env` menos `NOTION_PARENT_PAGE_ID`; `APP_URL=https://amparo.vorluno.dev`.
3. Deploy: `bunx caprover deploy` (elige app `amparo`, rama `main`) — o subir tarball desde el panel.
4. Verificar SSE en producción: `curl -N -X POST https://amparo.vorluno.dev/api/solicitudes/PA-0001/analizar` debe mostrar eventos **progresivamente**. Si llegan todos al final, en la app → "Nginx Configurations" añadir dentro del `location /`: `proxy_buffering off; proxy_cache off; proxy_read_timeout 300s;` y guardar.
5. `bun run notion:reset` desde local y comprobar la consola pública.

- [ ] **Step 4: Commit**

```bash
git add Dockerfile captain-definition .dockerignore
git commit -m "chore: Dockerfile standalone y captain-definition para CapRover"
git push origin main
```

---

### Task 17: Documentación final, QA y entrega

**Files:**
- Create: `README.md`, `docs/REGLAS.md`, `docs/DECISIONES.md`, `docs/BITACORA.md`; completar `docs/CASOS.md` (Cristian), `docs/CONDICIONES-GENERALES.md` (Levi), `docs/CORREO-ENVIO.md` (Cristian), `docs/media/*` (Levi)

- [ ] **Step 1: `README.md`** con las 8 secciones de `docs/DISENO.md` §12, en este orden: qué es + enlace demo + GIF; cómo usarlo (3 pasos) y cómo probar el tiempo real desde Notion; arquitectura (diagrama de §2) y principio rector; el criterio (tabla R1–R8 con cláusula + fórmula de carencia de §4.3); los 12 casos (tabla resumida + enlace a `docs/CASOS.md`); levantarlo en tu workspace (`bun install` → crear integración → compartir una página con ella → `NOTION_PARENT_PAGE_ID` → `bun run notion:seed` → copiar `.env.notion` → `OPENROUTER_API_KEY` → `bun dev`); decisiones y límites (no OCR, una aseguradora, sin autenticación, sin notificaciones; qué haríamos después); equipo (nombres completos, roles).

- [ ] **Step 2: `docs/REGLAS.md`** — para cada regla: qué comprueba, cláusula, evidencia que emite, ejemplo numérico con un caso real (`PA-0002` para carencia: inicio 05/08/2026, informe 19/09/2026 → 45 días < 90 → elegible 03/11/2026; ajustar a las fechas reales del caso de Cristian). Incluir la definición exacta de `diasTranscurridos` (días completos, el día de inicio cuenta como 0) y la tabla de prioridad de veredictos.

- [ ] **Step 3: `docs/DECISIONES.md`** — D1..D13 de la spec + D14 "Escenario y Veredicto esperado visibles en la Solicitud" (el jurado ve qué prueba cada caso y si el agente coincidió) + D15 "Gemini 2.5 Flash como principal" (costo/latencia; Pro como fallback) + las que surjan en la ejecución.

- [ ] **Step 4: `docs/BITACORA.md`** — una entrada por bloque de trabajo (fecha/hora, qué se hizo, qué se rompió, qué quedó pendiente). Se escribe durante la ejecución, no al final.

- [ ] **Step 5: QA final (21/09 mañana)**

```bash
bun run notion:reset
```
Cristian corre PA-0001…0006 y Levi PA-0007…0012 en la demo pública; anotan "Obtenido" en `docs/CASOS.md`. Levi prueba el webhook con PA-0003 y graba el GIF. Cualquier discrepancia esperado ≠ obtenido vuelve a Jose: se corrige en reglas o en el caso (nunca ajustando el LLM a mano) y se documenta en `BITACORA.md`.

- [ ] **Step 6: Sello y entrega**

1. `bun test && bun run typecheck && bun run build` verdes. `git ls-files | grep -E '^\.env' ` → solo `.env.example`.
2. Pasar `vorluno-selfcheck` sobre README + consola.
3. `bun run notion:reset` (demo limpia). Publicar la página raíz de Notion (Share → Publish) para que el enlace "Datos en Notion" abra al jurado.
4. `git tag v1.0.0 && git push --tags`.
5. Enviar `docs/CORREO-ENVIO.md` a `hackiathon@viamatica.com` con enlace demo + repo.
6. Subir el límite de OpenRouter a USD 5–10 y, después del 21, rotar la clave de OpenRouter y el token de Notion.

---

## Cronograma (desde el 20/09 03:00, hora Panamá)

| Bloque | Tareas | Objetivo |
|---|---|---|
| 20/09 03:00–06:00 | 1, 2, 3, 4, 5 → push del repo | Cristian y Levi pueden arrancar al despertar |
| 20/09 09:00–13:00 | 6, 7, 8, 9 | Seed real + extracción real de PA-0001 |
| 20/09 13:00–17:00 | 10, 11, 12 | `curl` SSE funcionando + lista |
| 20/09 17:00–21:00 | 13, 14 | Consola completa con capturas |
| 20/09 21:00–23:00 | 16, 15 | Deploy público + webhook verificado |
| 21/09 08:00–12:00 | 17 (QA de los 12 casos, README, correcciones) | Entrega al mediodía |
| 21/09 tarde | Colchón | — |

Orden de corte si falta tiempo (de la spec §14): webhook → GIF → reset → advertencias. Nunca: motor + tests, consola con streaming, deploy, README.
