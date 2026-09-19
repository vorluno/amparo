# Amparo — Diseño del sistema

> Agente de pre-autorización quirúrgica en tiempo real. Reto 1 del filtro del HackIAthon (Viamatica + ADEN).
> Spec aprobada en conversación el 19/09/2026. Entrega: 21/09/2026. Equipo: Jose (núcleo), Cristian y Levi (casos, QA, docs).

---

## 0. Contexto y objetivo

**Lo que pide el reto (texto del filtro):** un agente que reciba el informe médico digital (hospital) y la póliza del paciente (aseguradora) en una base de datos de Notion; que analice si el procedimiento está cubierto y si cumple los requisitos de carencia; y que emita **preaprobación** o **solicitud de documentos faltantes** de forma instantánea.

**Entregables:** enlace público del agente funcional + enlace del repositorio. Se envían a `hackiathon@viamatica.com`.

**Qué evalúan:** "capacidad de análisis, criterio técnico y ejecución con herramientas de IA". Es un filtro de pre-registro, no el hackathon. El jurado es gente de seguros/tecnología en Ecuador.

**Objetivo del diseño:** que en 48 horas exista una demo pública, estable y auditable, donde el jurado vea al agente razonar en vivo y donde cada veredicto cite la cláusula que lo sostiene. Nada que "casi" funcione.

---

## 1. Decisiones tomadas

| # | Decisión | Elección | Por qué |
|---|---|---|---|
| D1 | Alcance | Solo Reto 1 | 48 h |
| D2 | 3D / WebGL de la propuesta original | **Fuera** | Costo 2-4 días, no demuestra criterio, compite con el motor de reglas |
| D3 | Tipo de interfaz | **Consola de adjudicación** (lista → analizar → streaming → veredicto → Notion) | El evaluador ve el razonamiento, no solo texto |
| D4 | Trigger | **Botón + webhook de Notion** | El título dice "tiempo real"; el webhook cuesta ~2 h |
| D5 | Motor | **Pipeline fijo, LLM en los bordes** (extrae y redacta), **código decide** | Testeable sin LLM; imposible alucinar una aprobación |
| D6 | LLM | **OpenRouter** (Vercel AI SDK + `@openrouter/ai-sdk-provider`) | Decisión de Jose |
| D7 | Deploy | **CapRover** (Docker, Next.js standalone) | Decisión de Jose |
| D8 | Repo | `github.com/vorluno/amparo`, **público** | Decisión de Jose |
| D9 | Idioma de la UI y docs | **Español neutro** (sin voseo) | Jurado ecuatoriano |
| D10 | Datos demo | **Archivos en el repo** → script de seed a Notion | Reproducible, reseteable, el jurado puede levantarlo en su workspace |
| D11 | Caso "hospital fuera de red" | **Rechazo** (no reembolso reducido) | Tres veredictos limpios; el matiz no aporta en 48 h |
| D12 | Nombre | **Amparo** | En seguros, "amparar" = cubrir. Corto, neutro, sin "3D" |
| D13 | Stack | Next.js 16 · React 19 · TypeScript · Tailwind v4 · bun · Zod · `@notionhq/client` v5 | Stack de Vorluno |

**Fuera de alcance (explícito):** autenticación de usuarios, multi-aseguradora, OCR de PDFs escaneados, tarifario de precios por hospital, notificaciones por correo, panel de métricas, i18n.

---

## 2. Arquitectura (vista de 30 segundos)

```
 Hospital ──► Notion: Informes médicos ──┐
                                         ├──► Notion: Solicitudes (Pendiente)
 Aseguradora ► Notion: Pólizas ──────────┘            │
                                                      │ (a) botón "Analizar" en la consola  → SSE
                                                      │ (b) webhook de Notion (page.created /
                                                      │     page.properties_updated)         → async
                                                      ▼
                            ┌──────────── Pipeline `runPreauth(solicitudId, emit)` ────────────┐
                            │ 1. Extractor clínico (LLM → JSON Zod, elige del catálogo)        │
                            │ 2. Auditor de póliza (código: póliza por cédula + catálogo)      │
                            │ 3. Adjudicador (código puro: reglas R1..R8, cita cláusulas)      │
                            │ 4. Redacción de la carta (LLM, a partir del veredicto ya tomado)│
                            │ 5. Sincronización a Notion (propiedades + carta + traza)        │
                            └──────────────────────────────────────────────────────────────────┘
                                                      │
                                                      ▼
                                    Consola (Next.js) pinta cada paso en vivo
```

**Principio rector:** la IA hace lo que el código no puede (leer prosa médica y redactar para humanos); el código hace lo que la IA no debe (decidir cobertura y dinero).

---

## 3. Modelo de datos en Notion

Cuatro bases de datos bajo una página raíz **"Amparo · Pre-autorización quirúrgica"**. Hospital y aseguradora no comparten identificadores: el agente cruza por **cédula**. La API (versión `2025-09-03`) no permite crear propiedades tipo `status`, por eso todos los estados son `select`.

### 3.1 Pólizas (aseguradora)

| Propiedad | Tipo | Notas |
|---|---|---|
| Nº de póliza | title | `POL-2025-0141` |
| Asegurado | rich_text | |
| Cédula | rich_text | 10 dígitos, clave de cruce |
| Fecha de nacimiento | date | |
| Plan | select | Básico · Plus · Premium |
| Estado | select | Vigente · Suspendida por mora · Cancelada |
| Inicio de vigencia | date | **base de toda carencia** |
| Fin de vigencia | date | |
| Suma asegurada anual | number (USD) | |
| Monto consumido | number (USD) | |
| Preexistencias declaradas | multi_select | Hipertensión · Diabetes tipo 2 · Cardiopatía isquémica · Obesidad · Asma · Artrosis |
| Red de hospitales | multi_select | misma lista que `Informes.Hospital` |

### 3.2 Catálogo de procedimientos (reglas de cobertura)

| Propiedad | Tipo | Notas |
|---|---|---|
| Procedimiento | title | `Apendicectomía laparoscópica` |
| Código CPT | rich_text | `44970` |
| CIE-10 asociado | rich_text | `K35.80` |
| Categoría | select | Cirugía general · Ortopedia · Cardiovascular · Maternidad · Otorrinolaringología · Estética · Oftalmología · Bariátrica |
| Cubierto en planes | multi_select | Básico · Plus · Premium |
| Carencia (días) | number | |
| Exento de carencia en emergencia | checkbox | |
| Excluido | checkbox | |
| Motivo de exclusión | rich_text | ej. "Procedimiento estético, cláusula 5.1" |
| Preexistencia relacionada | multi_select | misma taxonomía que la póliza |
| Documentos requeridos | multi_select | Informe médico · Exámenes de laboratorio · Imagenología · Consentimiento informado · Historia clínica · Presupuesto hospitalario · Segunda opinión |
| Monto máximo cubierto | number (USD) | vacío = sin tope propio |

El catálogo vive en el repo como `cases/catalogo.json` (lo escribe Jose: son las reglas). Mínimo 13 entradas: las 9 de la matriz de casos más Amigdalectomía, Histerectomía, Facoemulsificación de catarata y Bypass gástrico (preexistencia relacionada: Obesidad; solo Premium).

### 3.3 Informes médicos (hospital)

| Propiedad | Tipo | Notas |
|---|---|---|
| Informe | title | `INF-0001 · Apendicectomía` |
| Paciente | rich_text | |
| Cédula | rich_text | clave de cruce |
| Hospital | select | Hospital Alcívar · Clínica Kennedy · Hospital Clínica San Francisco · Omni Hospital · Hospital Luis Vernaza · Clínica Guayaquil · Hospital Metropolitano (Quito) |
| Médico tratante | rich_text | |
| Fecha del informe | date | fecha contra la que se calcula la carencia |
| Tipo de atención | select | Electiva · Urgencia · Emergencia |
| Documentos adjuntos | multi_select | misma taxonomía; **es la verdad** para "faltantes" |
| Presupuesto estimado | number (USD) | |
| **Cuerpo de la página** | bloques | **el informe clínico en prosa**: lo único que lee el LLM. No hay campo "procedimiento": el agente lo infiere |

### 3.4 Solicitudes de pre-autorización (cola de trabajo)

| Propiedad | Tipo | Quién la escribe |
|---|---|---|
| ID | title (`PA-0001`) | seed |
| Informe médico | relation → Informes | seed |
| Estado | select: Pendiente · En análisis · Preaprobada · Rechazada · Documentos faltantes · Error | seed / agente |
| Póliza | relation → Pólizas | agente (resuelta por cédula) |
| Procedimiento detectado | rich_text | agente |
| CPT detectado | rich_text | agente |
| Veredicto | rich_text (una línea) | agente |
| Motivo | rich_text | agente |
| Cláusulas aplicadas | rich_text | agente, ej. "4.2, 7" |
| Documentos faltantes | multi_select | agente |
| Elegible desde | date | agente, solo en carencia |
| Tope aprobado | number (USD) | agente, solo en preaprobada con tope |
| Confianza de extracción | number 0-1 | agente |
| Analizado el | date (con hora) | agente; también sirve de lock |
| Versión del agente | rich_text | agente, `amparo@1.0.0` |
| **Cuerpo de la página** | bloques | agente: carta de respuesta al hospital + traza de razonamiento (una lista por regla) |

---

## 4. Motor de reglas (Adjudicador)

Función pura `adjudicate(input): Adjudication` en `src/lib/rules/engine.ts`. No toca red ni LLM. Recibe:

```ts
type AdjudicationInput = {
  extraction: ExtractedReport          // salida del Extractor (ya validada)
  report: ReportMeta                   // propiedades del informe (hospital, tipo, adjuntos, presupuesto, fecha)
  policy: Policy | null                // null = no se encontró por cédula
  procedure: CatalogEntry | null       // null = el extractor no pudo elegir del catálogo
  config: RulesConfig                  // parámetros globales
}
```

### 4.1 Parámetros globales (`src/lib/rules/config.ts`)

| Parámetro | Valor | Cláusula |
|---|---|---|
| `carenciaGeneralDias` | 30 | 4.1 |
| `carenciaPreexistenciaDias` | 730 | 4.3 |
| `umbralConfianza` | 0.7 | — (criterio del agente) |
| `tiposQueEximenCarencia` | `['Emergencia']` (no `Urgencia`) | 4.4 |
| `lockMinutos` | 2 | — |

### 4.2 Reglas, en orden de evaluación

Cada regla devuelve `RuleResult { id, clausula, titulo, resultado: 'cumple' | 'no_cumple' | 'no_aplica', evidencia, datos? }`. Se evalúan **todas** las que aplican (para que la traza sea completa) y el veredicto se decide por **prioridad**: rechazos duros → documentos faltantes → preaprobación (con o sin tope).

| # | Regla | Cláusula | Si no cumple → |
|---|---|---|---|
| R1 | Póliza encontrada por cédula, `Estado = Vigente`, y `Fecha del informe` dentro de la vigencia | 2 | **Rechazada: sin cobertura vigente** |
| R2 | Extracción confiable: `confianza ≥ umbral` **y** `procedure ≠ null` | — | **Documentos faltantes: informe médico ampliado** (el agente no adivina) |
| R3 | Hospital del informe ∈ `Póliza.Red de hospitales` | 3 | **Rechazada: fuera de red** |
| R4 | `Catálogo.Excluido = false` | 5 | **Rechazada: exclusión** (cita `Motivo de exclusión`) |
| R5 | `Póliza.Plan` ∈ `Catálogo.Cubierto en planes` | 6 | **Rechazada: no cubierto por el plan** |
| R6 | Carencia cumplida (ver 4.3) | 4.1–4.4 | **Rechazada por carencia** + `Elegible desde` |
| R7 | `Catálogo.Documentos requeridos` ⊆ `Informe.Documentos adjuntos` | 7 | **Documentos faltantes** (lista exacta) |
| R8 | `Presupuesto ≤ tope`, donde `tope = min(saldo, Monto máximo cubierto)` y `saldo = Suma asegurada − Monto consumido` | 8 | **Preaprobada con tope** (`Tope aprobado = tope`; excedente a cargo del paciente). Si `saldo ≤ 0` → **Rechazada: suma asegurada agotada** |

Si R1 falla, R3–R8 quedan `no_aplica` (sin póliza no hay contra qué evaluar) pero R2 sí se evalúa (la traza muestra que el informe era legible). Si R2 falla, R4–R8 quedan `no_aplica`.

### 4.3 Cálculo de carencia (R6)

```
diasTranscurridos = díasEntre(Póliza.InicioVigencia, Informe.Fecha)     // inclusivo del día de inicio
carenciaBase      = max(config.carenciaGeneralDias, Catálogo.CarenciaDias)
preexistente      = Catálogo.PreexistenciaRelacionada ∩ Póliza.PreexistenciasDeclaradas ≠ ∅
carenciaAplicable = preexistente ? max(carenciaBase, config.carenciaPreexistenciaDias) : carenciaBase
exento            = Informe.TipoAtencion ∈ config.tiposQueEximenCarencia && Catálogo.ExentoEnEmergencia && !preexistente
cumple            = exento || diasTranscurridos >= carenciaAplicable
elegibleDesde     = InicioVigencia + carenciaAplicable días        // solo si !cumple
```

Decisión de diseño: la preexistencia declarada **no** se exime por emergencia (es la práctica del mercado y evita el abuso "todo es emergencia"). La traza lo dice explícitamente.

### 4.4 Advertencias (no cambian el veredicto)

- El extractor infiere `tipoAtencionInferido` de la prosa; si difiere de `Informe.Tipo de atención` (el hospital dice Emergencia, la prosa describe algo programado), se emite `advertencia: inconsistencia de urgencia` en la traza. Es material para un auditor humano, no para el agente.
- El extractor lista `documentosMencionados` en la prosa; si menciona un documento que no está en adjuntos, advertencia "el informe menciona X pero no está adjunto".

### 4.5 Salida

```ts
type Adjudication = {
  estado: 'Preaprobada' | 'Rechazada' | 'Documentos faltantes'
  veredicto: string                 // una línea, para la propiedad
  motivo: string                    // 1-3 frases
  clausulas: string[]               // ['4.2', '7']
  reglas: RuleResult[]              // traza completa
  documentosFaltantes: DocumentoTipo[]
  elegibleDesde?: string            // ISO date
  topeAprobado?: number
  advertencias: string[]
}
```

---

## 5. Pipeline y streaming

`runPreauth(solicitudId, emit)` en `src/lib/pipeline/run.ts`. `emit` es un `EventEmitter` tipado; el endpoint SSE lo conecta al stream y el webhook le pasa un emisor que solo registra logs.

### 5.1 Etapas

| Etapa | `step` | Quién | Entrada → salida |
|---|---|---|---|
| Extractor clínico | `extract` | LLM | prosa del informe + catálogo (nombres y CPT) → `ExtractedReport` |
| Auditor de póliza | `policy` | código | cédula → `Policy`; `catalogoId` → `CatalogEntry`; cálculo de días, saldo |
| Adjudicador | `adjudicate` | código | `adjudicate()` → `Adjudication` |
| Redacción | `letter` | LLM (stream) | `Adjudication` + datos → carta al hospital en español neutro |
| Sincronización | `sync` | código | propiedades de la Solicitud + bloques (carta + traza) |

### 5.2 Contrato del Extractor (Zod)

```ts
const ExtractedReport = z.object({
  catalogoId: z.string().nullable(),          // ID del catálogo elegido, o null si no encaja ninguno
  procedimientoTexto: z.string(),             // cómo lo nombra el informe
  diagnostico: z.string(),
  cie10Sugerido: z.string().nullable(),
  especialidad: z.string(),
  tipoAtencionInferido: z.enum(['Electiva', 'Urgencia', 'Emergencia']),
  justificacionClinica: z.string(),           // 1-3 frases citando el informe
  documentosMencionados: z.array(DocumentoTipo),
  esEstetico: z.boolean(),                    // ayuda a distinguir rinoplastia de septoplastia
  confianza: z.number().min(0).max(1),
  ambiguedades: z.array(z.string()),
})
```

El extractor **elige del catálogo** (recibe la lista con IDs); no inventa códigos. Si ninguno encaja, `catalogoId = null` y baja la confianza. Ese es el puente determinista entre prosa y reglas.

### 5.3 Llamadas al LLM

- Proveedor: OpenRouter vía `@openrouter/ai-sdk-provider` + `ai` (Vercel AI SDK). `generateObject` para el extractor, `streamText` para la carta.
- Modelo: `OPENROUTER_MODEL` (env). Principal: el Claude Sonnet vigente en OpenRouter (ID a confirmar el 20/09 contra el catálogo de OpenRouter). Fallback `OPENROUTER_MODEL_FALLBACK` si el principal falla dos veces.
- Extractor: `temperature 0`, timeout 30 s, **un reintento** si la salida rompe el esquema, pasando el error de Zod al modelo.
- Carta: máx. 250 palabras, tono formal, español neutro, **no puede alterar el veredicto**: el prompt recibe el veredicto cerrado y las cláusulas; el sistema valida que la carta contenga el estado literal.
- El texto de la prosa se pasa completo (los informes demo tienen 150-400 palabras).

### 5.4 Eventos SSE

```
event: step     data: { step, status: 'running' | 'done' | 'error', title, detail?, data? }
event: token    data: { text }                       // carta, en streaming
event: verdict  data: Adjudication (sin `reglas`, que ya viajó en el step `adjudicate`)
event: error    data: { message, step }
event: done     data: { notionUrl }
: keep-alive                                         // comentario cada 15 s
```

Cabeceras: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no` (nginx de CapRover no debe bufferizar).

### 5.5 Idempotencia y errores

- Al iniciar: leer la Solicitud. Si `Estado = En análisis` y `Analizado el` hace menos de `lockMinutos` → `409 Conflict` ("análisis en curso"). Si el lock es viejo, se toma.
- Se escribe `Estado = En análisis` + `Analizado el = ahora` **antes** de llamar al LLM.
- Cualquier fallo → `Estado = Error`, `Motivo = <mensaje>`, evento `error`, HTTP sigue siendo 200 (ya se abrió el stream). Reanalizar está siempre permitido desde la consola.
- Reanalizar sobrescribe propiedades y **añade** nuevos bloques (no borra los anteriores: historial).

---

## 6. Consola (UI)

Next.js 16 App Router, React 19, Tailwind v4, bun. Español neutro. Sin nombres del motor en pantalla (nada de "LLM", "Zod", "SSE"): las etapas se llaman "Extractor clínico (IA)", "Auditor de póliza", "Adjudicador", "Carta al hospital", "Registro en Notion".

### 6.1 Rutas

| Ruta | Qué muestra |
|---|---|
| `/` | Cabecera "Amparo · Pre-autorización quirúrgica en tiempo real". Lista de solicitudes leída de Notion: ID, paciente, hospital, tipo de atención, procedimiento detectado (o "—"), estado (badge), acción **Analizar** / **Ver**. Ordenada por ID. |
| `/solicitudes/[id]` | Dos columnas. Izquierda: informe (prosa completa, hospital, fecha, tipo, adjuntos, presupuesto). Derecha: las 5 etapas como lista vertical con estado (pendiente · en curso · listo · error), cada una expandible con su evidencia: JSON legible del extractor, póliza resuelta (plan, vigencia, días transcurridos, saldo), tabla de reglas ✓/✗ con cláusula y evidencia, carta en streaming, y al final el **veredicto grande** con motivo, cláusulas y (si aplica) documentos faltantes / elegible desde / tope. Botón "Ver en Notion". Botón "Reanalizar". |
| `/api/solicitudes/[id]/analizar` | `POST` → SSE |
| `/api/webhooks/notion` | `POST` (sección 7) |
| `/api/health` | `GET` → `{ ok, version, notion: 'ok' \| 'error' }` |

### 6.2 Estados que la UI debe manejar

- Lista vacía ("No hay solicitudes. Ejecuta `bun run notion:seed`").
- Notion inaccesible (mensaje y reintento).
- Solicitud `En análisis` por el webhook: la vista de detalle muestra "Análisis automático en curso" y hace polling cada 3 s hasta que cambie de estado; luego pinta el resultado leído de Notion (sin streaming).
- Solicitud ya analizada: pinta el resultado desde Notion (propiedades + traza), con "Reanalizar".
- Error de análisis: estado `Error` con el motivo y "Reanalizar".
- SSE cortado (red): la UI muestra "Conexión perdida" y ofrece releer desde Notion.

### 6.3 Estética

- Base **monocromo** (fondo claro, texto casi negro, grises medidos), tipografía Geist Sans + Geist Mono para evidencia y códigos. Un solo color vivo por pantalla: el **verde del veredicto Preaprobada**; rojo y ámbar solo como semánticos de Rechazada / Documentos faltantes, apagados.
- Sin animaciones decorativas: la única "animación" es el progreso real de las etapas y el texto de la carta llegando.
- Debe pasar `vorluno-ui-integracion` (capturas reales a 1280 y 400) y `vorluno-selfcheck` antes de "listo".

---

## 7. Webhook de Notion

`POST /api/webhooks/notion` en `src/app/api/webhooks/notion/route.ts`.

1. **Verificación inicial:** el primer request de Notion trae `{ verification_token }`. Se registra en logs; Jose lo copia a `NOTION_WEBHOOK_SECRET` en CapRover. Se responde `200`.
2. **Firma:** cada evento se valida con `verifyWebhookSignature({ body, signature: headers['x-notion-signature'], verificationToken })` de `@notionhq/client`. Firma inválida → `401`.
3. **Filtro:** solo `page.created` y `page.properties_updated`; `entity.type === 'page'`; se ignora si **algún** `authors[].type === 'bot'` (nuestras propias escrituras); se lee la página y se procesa solo si su data source es la de Solicitudes y `Estado = Pendiente`.
4. **Ejecución:** se responde `200` de inmediato y el análisis corre en `after()` (`next/server`) con un emisor que solo registra logs. El lock de la sección 5.5 evita dobles análisis si Notion reintenta.
5. **Suscripción en Notion:** en la integración, eventos `page.created` + `page.properties_updated`, URL `https://<subdominio>/api/webhooks/notion`. Requiere el deploy hecho **antes** (día 20).

Demo del "tiempo real" para el jurado: cambiar una Solicitud a `Pendiente` en Notion y ver cómo, sin tocar la consola, pasa a `En análisis` y luego al veredicto, con la carta escrita en la página.

---

## 8. Seed y reset (`scripts/`)

- `cases/catalogo.json` — catálogo (Jose).
- `cases/PA-0001.md` … `cases/PA-0012.md` — un archivo por caso: frontmatter YAML con `poliza`, `informe`, `esperado`, `motivoEsperado`; cuerpo = prosa del informe (Cristian: 1-6; Levi: 7-12). Formato exacto y ejemplo completo en `docs/equipo/FORMATO-CASOS.md`.
- `bun run notion:seed` — crea la página raíz (o usa `NOTION_ROOT_PAGE_ID`), crea las 4 bases con `POST /databases` + `initial_data_source.properties` (relaciones con `data_source_id`), inserta catálogo, pólizas, informes (prosa como bloques de párrafo) y solicitudes en `Pendiente`. Escribe los IDs resultantes en `.env.notion` (para copiar a CapRover). Idempotente: si `.env.notion` existe, no recrea las bases; hace upsert de filas por clave (`Nº de póliza`, `Procedimiento`, `Informe`, `ID`).
- `bun run notion:reset` — todas las solicitudes a `Pendiente`, limpia las propiedades del agente, borra los bloques que escribió el agente (marcados con un párrafo centinela `— amparo —`). Se corre antes de la demo/entrega.
- Rate limit de Notion (~3 req/s): el seed serializa con pausa de 350 ms.

---

## 9. Deploy en CapRover

- `Dockerfile` multi-stage: `oven/bun` para instalar y `next build` (`output: 'standalone'`), runtime `node:22-alpine` ejecutando `server.js`. `captain-definition` → `{"schemaVersion":2,"dockerfilePath":"./Dockerfile"}`.
- Variables en CapRover: `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_MODEL_FALLBACK`, `NOTION_TOKEN`, `NOTION_WEBHOOK_SECRET`, `NOTION_DB_POLIZAS`, `NOTION_DB_CATALOGO`, `NOTION_DB_INFORMES`, `NOTION_DB_SOLICITUDES` (data source IDs), `APP_URL`.
- HTTPS con Let's Encrypt desde CapRover. Subdominio: **pendiente de Jose** (propuesta: `amparo.vorluno.dev`).
- SSE: cabecera `X-Accel-Buffering: no`; verificar en el primer deploy que el stream llega token a token (si no, ajustar `proxy_buffering off` en la plantilla nginx de la app).
- `.env.example` en el repo; **ningún secreto** en el repo público.
- Deploy manual desde la CLI de CapRover (`caprover deploy`) o desde GitHub con webhook de CapRover. Elegir el manual el día 20 (menos partes móviles).

---

## 10. Estructura del repositorio

```
amparo/
├── README.md                     # portada para el jurado (sección 12)
├── docs/
│   ├── DISENO.md                 # este documento
│   ├── BUILD-PLAN.md             # plan de implementación (writing-plans)
│   ├── BITACORA.md               # qué se hizo cada día
│   ├── REGLAS.md                 # motor con ejemplos numéricos
│   ├── CONDICIONES-GENERALES.md  # las cláusulas demo que citan las reglas
│   ├── CASOS.md                  # matriz de 12 casos: esperado vs obtenido
│   ├── DECISIONES.md             # ADR breves (D1..D13 + las que surjan)
│   └── equipo/
│       ├── CRISTIAN.md           # tareas, formato, cómo entregar
│       ├── LEVI.md
│       └── FORMATO-CASOS.md
├── cases/
│   ├── catalogo.json
│   └── PA-0001.md … PA-0012.md
├── scripts/
│   ├── notion-seed.ts
│   └── notion-reset.ts
├── src/
│   ├── app/                      # rutas (sección 6.1)
│   ├── components/               # consola: lista, detalle, etapas, veredicto
│   └── lib/
│       ├── notion/               # client (v5, data sources), schema (propiedades), repo (lecturas/escrituras)
│       ├── rules/                # config, clauses, types, engine
│       ├── pipeline/             # run, extract, policy, letter, sync, events
│       └── llm/                  # openrouter.ts (provider + modelo + fallback)
├── tests/
│   ├── rules/                    # unit: cada regla + bordes
│   └── cases/                    # golden: 12 casos con extracción fija → veredicto esperado
├── Dockerfile · captain-definition · .env.example · package.json · tsconfig.json
```

---

## 11. Testing

- **Unit (bun test) del motor:** cada regla con su caso "cumple" y "no cumple"; bordes: día exacto de fin de carencia (inclusivo), emergencia sin `Exento`, emergencia con preexistencia, dos preexistencias, saldo exactamente igual al presupuesto, saldo cero, póliza que vence el mismo día del informe.
- **Golden de casos:** para cada `cases/PA-00xx.md` existe un `tests/cases/PA-00xx.extraction.json` (la extracción que se espera del LLM, escrita a mano) → `adjudicate()` debe devolver `esperado`. Corre sin red. Es la prueba de "criterio" que el jurado puede ejecutar.
- **Contrato del extractor:** test que valida el esquema Zod contra 2 salidas reales grabadas (fixture) del modelo, para detectar drift.
- **Smoke E2E (manual, día 21):** los 12 casos desde la consola pública + 1 caso por webhook. Resultado registrado en `docs/CASOS.md` (esperado vs obtenido, quién lo corrió, hora).

---

## 12. Documentación (para el jurado)

`README.md` (español neutro), en este orden:
1. Qué es Amparo en 3 líneas + **enlace a la demo** + GIF de 20 s.
2. Cómo se usa (3 pasos) y cómo probar el "tiempo real" desde Notion.
3. Arquitectura (el diagrama de la sección 2) y el principio rector.
4. El criterio: tabla de reglas con cláusula (sección 4.2) y el cálculo de carencia.
5. Los 12 casos y su resultado esperado (enlace a `docs/CASOS.md`).
6. Cómo levantarlo en tu propio workspace (`bun install` → integración de Notion → `notion:seed` → `.env` → `bun dev`).
7. Decisiones y límites honestos (qué no hace, qué haría con más tiempo).
8. Equipo.

---

## 13. Reparto y cronograma

Hora local Panamá (UTC-5). Hoy 19/09 ~14:00.

| Cuándo | Jose (núcleo) | Cristian | Levi |
|---|---|---|---|
| **19 tarde** | Repo + spec + `docs/equipo/*` + `FORMATO-CASOS.md` + `catalogo.json` + casos PA-0001 y PA-0003 (para no depender de nadie) | Lee `CRISTIAN.md`; empieza PA-0002, 0004, 0005, 0006 | Lee `LEVI.md`; redacta `CONDICIONES-GENERALES.md` (a partir del esqueleto de cláusulas que deja Jose) |
| **19 noche** | Motor de reglas + tests unitarios + golden de PA-0001/0003. Seed a Notion (workspace de Jose) | PR con sus casos | PR con Condiciones Generales; empieza PA-0007…0012 |
| **20 mañana** | Extractor (OpenRouter) + pipeline + SSE + `notion:reset` | Revisa comentarios de PR; escribe `docs/CASOS.md` (esperado) | PR con sus casos |
| **20 tarde** | Consola (lista + detalle + streaming) | Borrador del correo de envío + texto del README secciones 1, 2, 8 | Guion del GIF/capturas |
| **20 noche** | Deploy CapRover + webhook + suscripción en Notion | — | — |
| **21 mañana** | Corrección de lo que salga del QA; selfcheck; README final; tag `v1.0.0` | QA casos 1-6 en la demo pública → `docs/CASOS.md` | QA casos 7-12 + webhook; GIF y capturas |
| **21 mediodía** | Reset de la demo. **Envío del correo** | — | — |
| **21 tarde** | Colchón | — | — |

Reglas del equipo: ramas `casos/cristian`, `casos/levi`; PR a `main`; Jose revisa y mergea. Nunca editar Notion a mano (todo entra por seed). Español neutro en todo texto. Ninguna credencial en el repo.

---

## 14. Riesgos y mitigaciones

| Riesgo | Mitigación |
|---|---|
| El modelo rompe el esquema o elige mal del catálogo | `temperature 0`, reintento con error de Zod, fallback de modelo, golden tests independientes del LLM, caso 12 demuestra el umbral |
| Nginx de CapRover bufferiza el SSE | Cabecera `X-Accel-Buffering: no`; verificar el día 20 con tiempo para tocar la plantilla nginx |
| Webhook de Notion no llega / loop con nuestras escrituras | Filtro por `authors[].type === 'bot'` + `Estado = Pendiente` + lock; el botón sigue funcionando aunque el webhook falle |
| Jurado dispara dos análisis a la vez | Lock de 2 min por Solicitud → `409` |
| Rate limit de Notion en el seed | Serializado con pausa |
| Casos de Cristian/Levi llegan tarde o mal | Jose escribe PA-0001 y PA-0003 el día 19; el formato tiene un ejemplo completo; la demo funciona con 2 casos |
| Se acaba el tiempo | Orden de corte: 1) webhook, 2) GIF, 3) `notion:reset` (se puede resetear a mano), 4) advertencias 4.4. Nunca se corta: motor + tests, consola con streaming, deploy, README |
| Repo público con secretos | `.env` en `.gitignore`, `.env.example`, revisión antes del primer push |

---

## 15. Entradas pendientes de Jose (no bloquean el arranque)

1. Workspace de Notion donde vivirá la demo (y token de la integración).
2. Subdominio en CapRover.
3. ID exacto del modelo en OpenRouter (se confirma el 20/09).
4. Nombres completos de Cristian y Levi para el README (sección Equipo).
