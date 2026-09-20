# Bitácora

Hora local Panamá (UTC-5).

## 19/09/2026

- **14:00–16:00** — Lectura del reto y de la propuesta técnica inicial ("AegisSurg 3D"). Decisión de descartar el 3D y de construir una consola de adjudicación con motor de reglas determinista (D1–D13). Spec en `docs/DISENO.md`.
- **Noche** — Plan de 17 tareas en `docs/BUILD-PLAN.md`, con código por paso y cronograma.

## 20/09/2026

- **02:30** — Credenciales verificadas: integración de Notion "claude" con acceso al workspace; clave de OpenRouter (límite USD 2). IDs de modelo confirmados: `google/gemini-2.5-flash` / `google/gemini-2.5-pro`.
- **03:20** — T1 scaffold (Next.js 16.3.5, bun 1.3, Tailwind v4). Puerto de desarrollo cambiado dos veces por colisión en la máquina: 3000 → 3010 → **3947**.
- **03:40** — T2 tipos, configuración, cláusulas, formato. T3 motor de reglas con TDD: 29 tests verdes a la primera.
- **04:00** — T4 formato de casos, catálogo de 13 procedimientos, PA-0001 y PA-0003 con sus extracciones esperadas, golden tests. T5 documentos de equipo (`docs/equipo/`). **Repo público creado y publicado: github.com/vorluno/amparo.**
- **15:50** — T6 esquema de Notion + mappers. T7 **seed real**: página raíz, 4 bases, 13 procedimientos, 2 pólizas, 2 informes, 2 solicitudes. Segunda corrida: 19 actualizados, 0 creados (idempotente).
- **16:00** — T8 repositorio de Notion verificado contra datos reales. T9 extractor y carta: primera extracción real en 3,2 s, ID correcto, certeza 100 %; el modelo leyó "de urgencia en 6 horas" como Urgencia → definiciones explícitas en el prompt (D18) → Emergencia. Tests con modelo falso: reintento y fallback.
- **16:00** — T10 pipeline con eventos; T11 endpoint SSE. **Primer análisis end-to-end real** de PA-0001: 5 etapas, carta en streaming, Notion actualizada; lock 409 verificado con dos peticiones simultáneas.
- **16:05–16:25** — T12–T13 consola. Verificación en Chrome: paso en curso en verde, botón bloqueado, veredicto con "coincide". Correcciones tras mirar: negritas de la prosa perdidas al leer de Notion, "confianza 1.00" → "certeza 100 %", pasos visibles desde el inicio, `router.refresh()` para el estado del encabezado, desajuste de hidratación por la fecha (zona fija), consola arriba en móvil. Capturas a 1280 y 400 con Playwright: sin desborde horizontal.
- **16:30** — T14 reset. T15 webhook: probado en local con firma válida (`signWebhookPayload`) → análisis en segundo plano; firma inválida → 401.
- **16:40** — T16 Dockerfile (322 MB) validado en local; app `amparo` creada en CapRover por API; variables y SSL; **deploy desde `main`**. SSE progresivo confirmado en producción. Registro DNS `amparo.vorluno.dev` creado en Cloudflare; dominio + SSL en CapRover. **https://amparo.vorluno.dev en vivo.**
- **16:55** — Demo reseteada. Pendiente de Jose: crear la suscripción del webhook en la integración de Notion y pasar el `verification_token` a `NOTION_WEBHOOK_SECRET`.
- **17:00** — T17: README, REGLAS, DECISIONES, esta bitácora.
- **17:05** — Selfcheck: el gris terciario daba 3,2:1 → `#6f6f6f` (4,8:1 AA). Sin voseo en producto ni docs.
- **17:10–17:30** — Notion desde el Chrome de Jose: el token `ntn_` era un *token de acceso personal* (sin webhooks) → creada la **conexión "Amparo"** con acceso a la página raíz; suscripción de webhook a `/api/webhooks/notion` (eventos `page.created`, `page.properties_updated`, API 2026-03-11); `verification_token` recibido en producción y guardado en CapRover. Página raíz **publicada** en https://sly-sovereign-37f.notion.site/3e19e19beec6819da242e6559857cc51 (subpáginas y bases accesibles sin sesión). Enlaces de la consola apuntan al sitio público (`NOTION_PUBLIC_BASE`). Redeploy.
- Pendiente inmediato: Jose pega el token en "Verificar suscripción" (regla: el asistente no ingresa tokens en formularios) y se prueba el tiempo real con PA-0003.

## Pendiente

- Casos PA-0002/0004/0005/0006 (Cristian) y PA-0007…0012 + Condiciones Generales (Levi) por PR; luego `bun run notion:seed` y sus `tests/cases/*.extraction.json`.
- Verificar la suscripción del webhook (pegar el token en Notion) y probar el tiempo real con PA-0003.
- QA de los 12 casos en la demo pública (21/09 mañana) → `docs/CASOS.md`.
- Subir el límite de OpenRouter antes de enviar; rotar clave y token después del 21.
- Correo a `hackiathon@viamatica.com` (borrador de Cristian, envía Jose).
