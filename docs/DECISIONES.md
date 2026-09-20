# Decisiones

Registro breve de cada decisión con su porqué. Las de diseño (D1–D13) se tomaron el 19/09/2026 antes de escribir código; las siguientes surgieron durante la ejecución.

| # | Decisión | Por qué |
|---|---|---|
| D1 | Solo el Reto 1 | 48 horas hasta la entrega. |
| D2 | Sin 3D/WebGL (se descartó el "gemelo digital anatómico" de la propuesta inicial) | Costaba 2–4 días, no demuestra criterio ante un jurado de seguros y competía con el motor de reglas, que es lo que califica. |
| D3 | Consola de adjudicación (lista → analizar → streaming → veredicto → Notion) en vez de un chat | El evaluador ve el razonamiento paso a paso, no un texto. |
| D4 | Botón **y** webhook de Notion | El título del reto dice "tiempo real"; el webhook costó ~2 h. |
| D5 | Pipeline fijo con el modelo en los bordes; el código decide | Testeable sin red; imposible "alucinar" una aprobación. |
| D6 | OpenRouter como proveedor (Gemini 2.5 Flash; Pro de respaldo) | Decisión del equipo; Flash extrae un informe en 1,5–3 s por menos de USD 0,01. |
| D7 | CapRover (Docker, Next.js standalone) | Infraestructura ya operativa del equipo. |
| D8 | Repositorio público `vorluno/amparo` | Entregable del reto. |
| D9 | Interfaz y documentación en español neutro | Jurado ecuatoriano. Sin voseo en ningún texto. |
| D10 | Datos demo como archivos en el repo (`cases/*.md`) + seed reproducible | Reseteable, revisable por PR, y el jurado puede levantarlo en su propio workspace. |
| D11 | "Hospital fuera de red" = rechazo (no reembolso reducido) | Tres veredictos limpios; el matiz no aporta en 48 h. |
| D12 | Nombre **Amparo** | En seguros, "amparar" es cubrir. Corto y neutro. |
| D13 | Next.js 16 · React 19 · Tailwind v4 · bun · zod · Notion SDK v5 · AI SDK | Stack habitual del equipo. |
| D14 | `Escenario` y `Veredicto esperado` visibles en cada solicitud (y "coincide / no coincide" en la consola) | El jurado ve qué prueba cada caso y si el agente acertó, sin leer el repo. |
| D15 | `Paciente` y `Hospital` denormalizados en Solicitudes | La lista se lee de una sola consulta a Notion; sin rollups (la API no los crea con fiabilidad). |
| D16 | Estado como `select`, no `status` | La API de Notion no permite crear propiedades `status`. |
| D17 | El extractor **elige un ID del catálogo**; nunca inventa códigos | Puente determinista entre prosa y reglas; un ID inexistente se anula y baja a "informe ampliado". |
| D18 | Definición explícita de Emergencia / Urgencia / Electiva en el prompt | En la primera prueba real el modelo leyó "de urgencia en las próximas 6 horas" como Urgencia; con la definición (horas = Emergencia) acierta. |
| D19 | La carta empieza siempre con `Estado: <veredicto>`; el sistema lo antepone si el modelo lo omite | Garantía determinista de que la carta no contradice al adjudicador. |
| D20 | Reanalizar añade bloques, nunca borra; solo `notion:reset` elimina, y solo lo que escribió el agente | Historial auditable; regla de la casa: nunca borrar datos. |
| D21 | Lock de 2 minutos por solicitud (`Estado = En análisis` + `Analizado el`) | Dos clics o un webhook reintentado no duplican el análisis. Notion guarda la hora sin segundos, así que el lock efectivo es de 1 a 2 minutos. |
| D22 | Webhook: filtro por autor `bot`, por base y por estado `Pendiente`, y ejecución en `after()` | Evita el bucle con nuestras propias escrituras y responde a Notion antes de analizar. |
| D23 | En la consola no se muestran identificadores del motor ("confianza 1.00", IDs de modelo) sino palabras del producto ("certeza 100 %", "Gemini 2.5 Flash") | Regla de integración de UI del equipo. |
| D24 | Un solo verde vivo por pantalla: el paso en curso o el veredicto Preaprobada; la lista es monocroma | Jerarquía visual: lo vivo manda. |
| D25 | En móvil la consola va arriba del informe | La acción y el veredicto primero. |
| D26 | Fecha "analizado el" formateada con zona `America/Guayaquil` fija | Evita el desajuste de hidratación servidor/cliente. |
| D27 | Puerto de desarrollo 3947 | Los puertos 3000 y 3010 estaban en uso en la máquina del equipo. |
| D28 | DNS `amparo.vorluno.dev` sin proxy de Cloudflare (igual que `apps.vorluno.dev`) | Let's Encrypt desde CapRover y SSE sin intermediarios. |
