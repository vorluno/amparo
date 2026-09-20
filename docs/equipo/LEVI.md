# Tareas de Levi

## Contexto en cinco líneas

- **Amparo** es nuestra entrega para el Reto 1 del filtro del HackIAthon (Viamatica + ADEN): un agente que recibe el informe médico del hospital y la póliza del asegurado en Notion y emite, al instante, **Preaprobada**, **Rechazada** o **Documentos faltantes**, con la regla y la cláusula que lo sostienen.
- Evalúan "capacidad de análisis, criterio técnico y ejecución con IA". El criterio se demuestra con **casos** (informes verosímiles con veredicto calculado) y con unas **Condiciones Generales** que las reglas citan.
- **Entrega: 21/09/2026 al mediodía** (hora Panamá). Tu parte tiene que estar el 20/09 en la tarde para que el 21 solo hagamos QA.
- La spec completa está en `docs/DISENO.md` (lee al menos §3 y §4); el formato de los casos, en `docs/equipo/FORMATO-CASOS.md`.
- Repositorio: `github.com/vorluno/amparo`. Trabaja en la rama `casos/levi`.

## Reglas

- Español neutro en todo: sin voseo (`vos`, `tenés`, `elegí`, `acá`, `dale`). Usa `tú` o formas impersonales.
- No edites nada fuera de `cases/` y `docs/` sin avisar antes.
- No toques Notion a mano: todo entra por el script de seed.
- Cualquier duda, en el chat del equipo, con el ID del caso en el mensaje.

## Tareas

### 1. Leer (30 min) — objetivo 20/09 09:30
`docs/equipo/FORMATO-CASOS.md`, `cases/PA-0001.md`, `cases/PA-0003.md`, y `docs/DISENO.md` §4 (el motor de reglas: qué comprueba cada regla y qué cláusula cita).

### 2. Condiciones Generales — objetivo 20/09 12:00

Archivo `docs/CONDICIONES-GENERALES.md` (ya existe el esqueleto con los encabezados). Para cada cláusula escribe **un párrafo de 3-6 líneas en lenguaje de póliza**, formal y claro, coherente con estos parámetros del motor:

| Cláusula | Debe decir |
|---|---|
| 2 — Vigencia y estado de la póliza | Solo se pre-autorizan prestaciones con fecha de informe dentro de la vigencia y con la póliza en estado Vigente; la mora suspende la cobertura |
| 3 — Red de prestadores | La cobertura aplica únicamente en los prestadores de la red asignada a la póliza |
| 4.1 — Carencia general | 30 días desde el inicio de vigencia para cualquier prestación |
| 4.2 — Carencia por procedimiento | Cada procedimiento del catálogo tiene su propia carencia (90, 180, 300, 365 días), que prevalece sobre la general cuando es mayor |
| 4.3 — Carencia por preexistencias declaradas | 730 días para procedimientos relacionados con una condición declarada al contratar; **no** la exime la emergencia |
| 4.4 — Emergencias | La atención de emergencia (riesgo vital o de secuela grave, no diferible) exime la carencia del procedimiento cuando el catálogo así lo indica; la urgencia diferible no |
| 5 — Exclusiones | Lista de lo no cubierto; remite al catálogo |
| 5.1 — Procedimientos estéticos | Excluidos los procedimientos con finalidad estética; cubiertos los funcionales o reconstructivos con indicación médica documentada |
| 6 — Cobertura por plan | Básico, Plus y Premium cubren distintos procedimientos según el catálogo |
| 7 — Documentación para pre-autorización | La solicitud debe acompañar los documentos que el catálogo exige para el procedimiento; si falta alguno, se solicita antes de resolver; si el informe no permite identificar el procedimiento, se pide un informe ampliado |
| 8 — Suma asegurada y topes | La cobertura se limita al saldo de la suma asegurada anual y, si existe, al monto máximo del procedimiento; el excedente es a cargo del asegurado |

Es un documento **ficticio** para la demo; dilo en la nota inicial (ya está escrita).

### 3. Seis casos — objetivo 20/09 17:00

| Caso | Escenario | Veredicto esperado | Cómo lograrlo |
|---|---|---|---|
| **PA-0007** | Bypass coronario con preexistencia declarada | **Rechazada** (carencia por preexistencia, 730 días) | Procedimiento `Bypass coronario (revascularización miocárdica)`. Póliza **Plus** (Básico no lo cubre y el rechazo debe ser por preexistencia, no por plan), `preexistencias: [Cardiopatía isquémica]`, inicio de vigencia ~14 meses antes del informe (≈425 días < 730). `tipoAtencion: Urgencia`. Prosa cardiológica: angina, cateterismo con lesiones de tres vasos, indicación de revascularización. Adjuntos completos (5 documentos) |
| **PA-0008** | Reemplazo total de cadera con plan Básico | **Rechazada** (no cubierto por el plan) | Procedimiento `Reemplazo total de cadera` (solo Plus/Premium). Póliza `Básico`, vigente hace más de 180 días, sin `Artrosis` declarada (para que el rechazo sea solo por plan). Adjuntos completos |
| **PA-0009** | Herniorrafia inguinal con presupuesto mayor que el saldo | **Preaprobada** (con tope) | Procedimiento `Herniorrafia inguinal` (máximo del procedimiento 4,000). `sumaAsegurada: 8000`, `montoConsumido: 5100` (saldo 2,900), `presupuesto: 5600`. Todo lo demás en regla (vigente > 90 días, en red, adjuntos `[Informe médico, Exámenes de laboratorio, Presupuesto hospitalario]`). Esperamos "Preaprobada hasta USD 2,900.00" |
| **PA-0010** | Cédula sin póliza | **Rechazada** (sin cobertura vigente) | `poliza: null`. Cédula que no exista en ningún otro caso. Prosa normal (ej. amigdalectomía). El agente no encontrará póliza |
| **PA-0011** | Amigdalectomía en hospital fuera de la red | **Rechazada** (fuera de red) | Procedimiento `Amigdalectomía`. `informe.hospital: Hospital Metropolitano (Quito)` y `poliza.red` sin ese hospital. Todo lo demás en regla |
| **PA-0012** | Informe ambiguo, sin procedimiento concreto | **Documentos faltantes** (informe ampliado) | Prosa de dolor lumbar crónico con hallazgos en resonancia y cierre tipo "se solicita valoración por neurocirugía para definir conducta quirúrgica"; **sin nombrar ningún procedimiento**. Póliza en regla. El agente no debe adivinar: debe pedir informe ampliado |

Para cada caso, `motivoEsperado` con los números concretos (fechas, días, montos).

Cédulas: `"09xxxxxxxx"` con dígitos distintos por caso; no repitas las de PA-0001 a PA-0006 (coordina con Cristian: él usa 0923456789, 0912345678 y las que elija para sus cuatro casos). Números de póliza únicos.

### 4. Guion del GIF — objetivo 20/09 19:00

Archivo `docs/DEMO-GUION.md`: 20 segundos, qué se clickea y qué se ve, en 6-8 pasos (lista → abrir PA-0001 → Analizar → etapas encendiéndose → carta llegando → veredicto Preaprobada → "Ver en Notion" con la carta escrita). Sin narración, solo acciones.

### 5. QA del 21/09 (mañana)

1. Con la demo pública reseteada, abre PA-0007 a PA-0012, pulsa **Analizar** y anota en `docs/CASOS.md` el veredicto obtenido, hora y observaciones.
2. Prueba del webhook: Jose deja PA-0003 en `Pendiente`; en Notion, cambia cualquier propiedad de esa solicitud (por ejemplo edita y restaura `Escenario`). En menos de un minuto debe pasar a `En análisis` y luego a `Documentos faltantes`, sin tocar la consola. Anótalo.
3. Graba el GIF según el guion y toma 4 capturas (lista; detalle en curso; veredicto Preaprobada; veredicto Rechazada). Guárdalas en `docs/media/` con nombres `01-lista.png`, `02-en-curso.png`, `03-preaprobada.png`, `04-rechazada.png`, `demo.gif`.

## Cómo entregar

Rama `casos/levi` → un commit por caso y uno por documento → PR a `main` titulado "Casos y Condiciones Generales de Levi". Antes del PR: `bun test tests/cases` en verde.
