# Amparo — Pre-autorización quirúrgica en tiempo real

Un agente que recibe el **informe médico del hospital** y la **póliza del asegurado** en Notion, y responde al instante con **Preaprobada**, **Rechazada** o **Documentos faltantes**, citando la regla y la cláusula que lo sostienen. Solución al Reto 1 del filtro del HackIAthon (Viamatica + ADEN).

**Demo pública:** https://amparo.vorluno.dev · **Datos en Notion (público):** https://sly-sovereign-37f.notion.site/3e19e19beec6819da242e6559857cc51

> La IA lee y redacta; las reglas deciden. El modelo de lenguaje solo hace lo que el código no puede (leer prosa clínica y escribir la carta al hospital); un motor de reglas determinista, testeable sin red, decide cobertura y dinero.

---

## Cómo probarlo (3 pasos)

1. Abre https://amparo.vorluno.dev y elige una solicitud (cada una es un caso de demostración con su veredicto esperado a la vista).
2. Pulsa **Analizar**. Verás las cinco etapas encenderse en orden: extractor clínico, auditor de póliza, adjudicador, carta al hospital y registro en Notion. Cada etapa se despliega para mostrar su evidencia; el adjudicador enseña las ocho reglas con "cumple / no cumple" y la cláusula.
3. Pulsa **Ver en Notion**: la solicitud quedó con el veredicto en sus propiedades y, en el cuerpo de la página, la carta y la traza completa.

**El "tiempo real" desde Notion:** en la base *Solicitudes de pre-autorización* (enlace "Datos en Notion"), cambia el **Estado** de cualquier solicitud a `Pendiente` (o edita cualquier propiedad de una que ya esté en `Pendiente`). Sin tocar la consola, en menos de un minuto pasa a `En análisis` y luego al veredicto: la integración de Notion dispara un webhook y el agente corre solo. La consola, si la tienes abierta, se actualiza sola.

---

## Arquitectura

```
 Hospital ──► Notion: Informes médicos ──┐
                                         ├──► Notion: Solicitudes (Pendiente)
 Aseguradora ► Notion: Pólizas ──────────┘            │
                                                      │ (a) botón "Analizar" en la consola  → SSE
                                                      │ (b) webhook de Notion (page.created /
                                                      │     page.properties_updated)         → async
                                                      ▼
                            ┌──────────── Pipeline runPreauth(solicitud, emit) ──────────────┐
                            │ 1. Extractor clínico (LLM → JSON validado; elige del catálogo)  │
                            │ 2. Auditor de póliza (código: póliza por cédula + catálogo)     │
                            │ 3. Adjudicador (código puro: reglas R1..R8, cita cláusulas)     │
                            │ 4. Carta al hospital (LLM, con el veredicto ya tomado)         │
                            │ 5. Registro en Notion (propiedades + carta + traza)            │
                            └──────────────────────────────────────────────────────────────────┘
                                                      │
                                                      ▼
                                    Consola (Next.js) pinta cada paso en vivo
```

- **Datos:** cuatro bases en Notion — Pólizas, Catálogo de procedimientos, Informes médicos y Solicitudes. Hospital y aseguradora no comparten identificadores: el agente cruza por **cédula**.
- **Extractor clínico:** lee la prosa del informe y devuelve un JSON validado con esquema. No inventa códigos: **elige un ID del catálogo** (o `null` si ninguno encaja). Ese es el puente determinista entre texto libre y reglas.
- **Adjudicador:** función pura `adjudicate(input)`; evalúa las ocho reglas, guarda la evidencia de cada una y decide por prioridad. Se prueba con 29 tests unitarios y con "golden tests" de los casos, sin llamar a ningún modelo.
- **Carta:** el modelo redacta a partir del veredicto cerrado; el sistema verifica que la carta empiece con el estado literal y lo antepone si el modelo lo omitió.
- **Streaming:** cada etapa emite eventos por Server-Sent Events hacia la consola. Lock de dos minutos por solicitud para que dos clics simultáneos no dupliquen el análisis.
- **Stack:** Next.js 16 · React 19 · TypeScript · Tailwind v4 · bun · zod · `@notionhq/client` v5 (API 2025-09-03) · Vercel AI SDK + OpenRouter (Gemini 2.5 Flash, con Gemini 2.5 Pro de respaldo) · Docker en CapRover.

## El criterio: ocho reglas, una cláusula cada una

| # | Regla | Cláusula | Si no cumple |
|---|---|---|---|
| R1 | Póliza encontrada por cédula, en estado Vigente y con el informe dentro de la vigencia | 2 | Rechazada: sin cobertura vigente |
| R2 | Procedimiento identificado con certeza (≥ 70 %) y presente en el catálogo | — | Documentos faltantes: informe médico ampliado |
| R3 | Hospital dentro de la red de la póliza | 3 | Rechazada: fuera de red |
| R4 | Procedimiento no excluido | 5 | Rechazada: exclusión |
| R5 | Cubierto por el plan contratado | 6 | Rechazada: no cubierto por el plan |
| R6 | Período de carencia cumplido | 4.1–4.4 | Rechazada por carencia + fecha "elegible desde" |
| R7 | Documentación requerida completa | 7 | Documentos faltantes (lista exacta) |
| R8 | Presupuesto dentro del saldo de la suma asegurada y del máximo del procedimiento | 8 | Preaprobada con tope (o Rechazada si la suma está agotada) |

**Carencia (R6):** `días = fecha del informe − inicio de vigencia`. Carencia aplicable = la mayor entre la general (30 días) y la del procedimiento; si el asegurado declaró una preexistencia relacionada, 730 días. Una atención de **Emergencia** exime la carencia solo si el catálogo lo permite para ese procedimiento y **nunca** cuando media una preexistencia declarada. La urgencia diferible no exime.

Prioridad del veredicto: rechazos (R1, R3, R4, R5, R6, suma agotada) → documentos faltantes (R2, R7) → preaprobada (con tope si R8 lo exige). Todas las reglas que aplican se evalúan y quedan en la traza, aunque el veredicto ya esté decidido. Detalle con ejemplos numéricos en [`docs/REGLAS.md`](docs/REGLAS.md); las cláusulas, en [`docs/CONDICIONES-GENERALES.md`](docs/CONDICIONES-GENERALES.md).

## Los casos de demostración

Doce casos cubren cada regla al menos una vez; cada uno es un archivo en [`cases/`](cases/) con la póliza, el informe (prosa clínica) y el veredicto esperado. La matriz completa y el resultado del QA están en [`docs/CASOS.md`](docs/CASOS.md).

| ID | Escenario | Esperado |
|---|---|---|
| PA-0001 | Apendicectomía de emergencia, póliza de 4 meses | Preaprobada (emergencia exime carencia) |
| PA-0002 | Artroscopia de rodilla, electiva, póliza de 45 días | Rechazada por carencia |
| PA-0003 | Colecistectomía sin imagenología ni presupuesto | Documentos faltantes |
| PA-0004 | Cesárea, póliza de 7 meses | Rechazada por carencia (300 días) |
| PA-0005 | Rinoplastia estética | Rechazada por exclusión |
| PA-0006 | Septoplastia funcional por desviación septal | Preaprobada (la IA la distingue de la estética) |
| PA-0007 | Bypass coronario con cardiopatía isquémica declarada | Rechazada por carencia de preexistencia |
| PA-0008 | Reemplazo de cadera con plan Básico | Rechazada: no cubierto por el plan |
| PA-0009 | Herniorrafia con presupuesto mayor que el saldo | Preaprobada con tope |
| PA-0010 | Cédula sin póliza | Rechazada: sin cobertura vigente |
| PA-0011 | Amigdalectomía en hospital fuera de red | Rechazada: fuera de red |
| PA-0012 | Informe ambiguo sin procedimiento concreto | Documentos faltantes: informe ampliado |

## Levantarlo en tu propio workspace

```bash
git clone https://github.com/vorluno/amparo && cd amparo
bun install
cp .env.example .env
```

1. Crea una integración interna en https://www.notion.so/profile/integrations y copia su token en `NOTION_TOKEN`.
2. Crea (o elige) una página de Notion, compártela con la integración y pon su ID en `NOTION_PARENT_PAGE_ID`.
3. `bun run notion:seed` — crea la página "Amparo · Pre-autorización quirúrgica", las cuatro bases y los casos. Copia las líneas de `.env.notion` a `.env`.
4. Pon tu clave de OpenRouter en `OPENROUTER_API_KEY` y ejecuta `bun dev` → http://localhost:3947.
5. `bun run notion:reset` deja la demo limpia (solicitudes en `Pendiente`, sin trazas). `bun test` corre los 65 tests sin tocar la red.

Para el webhook: despliega con HTTPS (`Dockerfile` + `captain-definition` incluidos para CapRover), crea la suscripción en la integración apuntando a `/api/webhooks/notion` con los eventos `page.created` y `page.properties_updated`, y guarda el `verification_token` que Notion envía como `NOTION_WEBHOOK_SECRET`.

## Decisiones y límites

- **Sin 3D ni efectos.** Se descartó un "gemelo digital anatómico" a favor de una consola que enseña el razonamiento; lo que evalúa un jurado de seguros es el criterio, no el shader.
- **El modelo nunca decide cobertura.** Si el modelo alucina, lo peor que puede pasar es una extracción errada que el adjudicador rechaza por baja certeza o que el auditor humano ve en la traza; no puede aprobar nada.
- **Nunca se borra desde el pipeline.** Reanalizar sobrescribe propiedades y añade bloques (historial). Solo `notion:reset` elimina, y únicamente lo que escribió el agente.
- **Fuera de alcance:** OCR de PDF escaneados, múltiples aseguradoras, autenticación de usuarios, notificaciones por correo, tarifario por hospital. Con más tiempo: adjuntos reales (archivos en Notion), coaseguro y deducibles por plan, historial de siniestros del asegurado, panel de métricas de tiempos de respuesta.
- Todas las decisiones, con su porqué: [`docs/DECISIONES.md`](docs/DECISIONES.md). Diseño completo: [`docs/DISENO.md`](docs/DISENO.md). Bitácora: [`docs/BITACORA.md`](docs/BITACORA.md).

## Equipo

- **José L. González** (Vorluno) — arquitectura, motor de reglas, pipeline, consola, despliegue.
- **Cristian** — casos clínicos PA-0002 a PA-0006, matriz de QA, correo de envío.
- **Levi** — Condiciones Generales, casos PA-0007 a PA-0012, QA del webhook, capturas y GIF.
