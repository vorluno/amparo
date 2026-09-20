# Tareas de Cristian

## Contexto en cinco líneas

- **Amparo** es nuestra entrega para el Reto 1 del filtro del HackIAthon (Viamatica + ADEN): un agente que recibe el informe médico del hospital y la póliza del asegurado en Notion y emite, al instante, **Preaprobada**, **Rechazada** o **Documentos faltantes**, con la regla y la cláusula que lo sostienen.
- Evalúan "capacidad de análisis, criterio técnico y ejecución con IA". El criterio se demuestra con **casos**: informes verosímiles cuyo veredicto está calculado de antemano.
- **Entrega: 21/09/2026 al mediodía** (hora Panamá). Tu parte tiene que estar el 20/09 en la tarde para que el 21 solo hagamos QA.
- La spec completa está en `docs/DISENO.md`; el formato de los casos, en `docs/equipo/FORMATO-CASOS.md`. Léelos en ese orden.
- Repositorio: `github.com/vorluno/amparo`. Trabaja en la rama `casos/cristian`.

## Reglas

- Español neutro en todo: sin voseo (`vos`, `tenés`, `elegí`, `acá`, `dale`). Usa `tú` o formas impersonales.
- No edites nada fuera de `cases/` y `docs/` sin avisar antes.
- No toques Notion a mano: todo entra por el script de seed.
- Cualquier duda, en el chat del equipo, con el ID del caso en el mensaje.

## Tareas

### 1. Leer (20 min) — objetivo 20/09 09:30
`docs/equipo/FORMATO-CASOS.md` completo y `cases/PA-0001.md`. Luego `cases/catalogo.json`: ahí están las carencias, planes y documentos de cada procedimiento.

### 2. Cuatro casos — objetivo 20/09 13:00

| Caso | Escenario | Veredicto esperado | Cómo lograrlo |
|---|---|---|---|
| **PA-0002** | Artroscopia de rodilla, electiva, póliza con 45 días de vigencia | **Rechazada** (carencia) | Procedimiento `Artroscopia de rodilla` (carencia 90). `poliza.inicioVigencia` 45 días antes de `informe.fecha` (ej. inicio `"2026-08-05"`, informe `"2026-09-19"`). `tipoAtencion: Electiva`. Sin preexistencia `Artrosis` en la póliza (eso sería otro caso). Adjuntos completos, para que el rechazo sea solo por carencia |
| **PA-0004** | Cesárea programada, póliza de 7 meses | **Rechazada** (carencia 300 días) | `Cesárea` tiene carencia 300. Inicio de vigencia ~210 días antes del informe. Prosa obstétrica: semanas de gestación, indicación de cesárea (ej. presentación podálica), fecha programada. Adjuntos completos |
| **PA-0005** | Rinoplastia con finalidad estética | **Rechazada** (exclusión) | Procedimiento `Rinoplastia estética` (excluido). La prosa debe dejar claro que la motivación es estética (insatisfacción con la forma nasal, sin obstrucción, sin trauma). Póliza vigente, en red, con tiempo de sobra |
| **PA-0006** | Septoplastia funcional por desviación septal | **Preaprobada** | Procedimiento `Septoplastia funcional`. La prosa debe describir obstrucción nasal documentada (rinoscopia, TAC de senos paranasales), roncopatía, sin ninguna mención estética. Póliza con más de 90 días, hospital en red, adjuntos `[Informe médico, Imagenología, Presupuesto hospitalario]`, presupuesto menor que el saldo |

PA-0005 y PA-0006 son la pareja que demuestra que la IA distingue estética de funcional: escríbelos con esa intención.

Para cada caso, `motivoEsperado` con los números: "inicio 05/08/2026, informe 19/09/2026: 45 días < 90; elegible desde 03/11/2026".

Cédulas: usa `"09xxxxxxxx"` con dígitos distintos en cada caso (no repitas `0923456789` ni `0912345678`, que ya existen). Números de póliza distintos entre sí.

### 3. `docs/CASOS.md` — objetivo 20/09 16:00

Tabla con las 12 filas (los 12 casos, aunque los de Levi aún no existan; usa la matriz de `docs/DISENO.md` §3):

| ID | Escenario | Veredicto esperado | Regla que decide | Cláusula | Obtenido (21/09) | Quién / hora | Observaciones |
|---|---|---|---|---|---|---|---|

Deja las tres últimas columnas vacías: se llenan en el QA del 21.

### 4. Correo de envío — objetivo 20/09 18:00

Archivo `docs/CORREO-ENVIO.md`. Para: `hackiathon@viamatica.com`. Asunto propuesto: `HackIAthon — Reto 1 — Amparo (pre-autorización quirúrgica)`. Cuerpo de 6-8 líneas: qué es, enlace a la demo (`https://amparo.vorluno.dev`), enlace al repo, cómo probar el "tiempo real" desde Notion (una línea), nombres del equipo. Tono formal, sin adjetivos grandilocuentes. Jose lo revisa y lo envía.

### 5. QA del 21/09 (mañana)

Con la demo pública ya reseteada: abre cada uno de PA-0001 a PA-0006, pulsa **Analizar**, y anota en `docs/CASOS.md` el veredicto obtenido, la hora y cualquier cosa rara (texto con voseo, cifras mal, una regla que no cuadra). Si algo no coincide con lo esperado, avisa de inmediato con el ID.

## Cómo entregar

Rama `casos/cristian` → un commit por caso (`feat(cases): PA-0002 artroscopia con 45 días de vigencia`) → PR a `main` titulado "Casos de Cristian". Antes del PR: `bun test tests/cases` en verde.
