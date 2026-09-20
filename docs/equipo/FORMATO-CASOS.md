# Formato de los casos demo (`cases/PA-00xx.md`)

## 1. Qué es un caso y por qué vive en el repositorio

Un caso es **una solicitud de pre-autorización completa**: la póliza del asegurado (lado aseguradora), el informe médico (lado hospital) y el veredicto que esperamos que el agente produzca. Cada caso es un archivo Markdown con un encabezado YAML (el "frontmatter") y, debajo, la prosa del informe clínico.

Viven en el repo, no en Notion, por tres razones:

- `bun run notion:seed` los sube a Notion de forma reproducible (el jurado puede levantar la demo en su propio workspace).
- `bun run notion:reset` deja la demo limpia antes de cada presentación.
- Se revisan por PR, como el código. **Nadie edita Notion a mano.**

## 2. Ejemplo completo: `cases/PA-0001.md`

Copia este archivo como punto de partida. Está en el repo; ábrelo y léelo entero antes de escribir el tuyo.

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

**Motivo de consulta:** dolor abdominal de 18 horas de evolución […]

**Diagnóstico:** apendicitis aguda no complicada (CIE-10 K35.80).

**Plan:** se indica apendicectomía laparoscópica de urgencia […] Se adjunta el presupuesto hospitalario por USD 3,800.00 […]

Dr. Andrés Villacís Mora — Cirugía general — Reg. 1712-09-4451
```

## 3. Campos del frontmatter

| Campo | Tipo | Ejemplo | Regla |
|---|---|---|---|
| `id` | texto | `PA-0007` | Igual al nombre del archivo (`PA-0007.md`) |
| `titulo` | texto | `Bypass coronario con preexistencia declarada` | Es lo que el jurado ve como "Escenario". Di qué prueba el caso, no el veredicto |
| `esperado` | uno de: `Preaprobada` · `Rechazada` · `Documentos faltantes` | `Rechazada` | El veredicto que el agente DEBE producir |
| `motivoEsperado` | texto | `Preexistencia declarada eleva la carencia a 730 días; solo han pasado 425.` | Una frase con la regla y los números |
| `poliza` | objeto o `null` | — | `null` SOLO en el caso "cédula sin póliza" (PA-0010) |
| `poliza.numero` | texto | `POL-2025-0233` | Único entre todos los casos |
| `poliza.asegurado` | texto | nombre completo | Igual a `informe.paciente` |
| `poliza.cedula` | **texto entre comillas** | `"0945612378"` | 10 dígitos, ecuatoriana; igual a `informe.cedula`; única entre casos |
| `poliza.fechaNacimiento` | **fecha entre comillas** | `"1980-02-14"` | Formato `YYYY-MM-DD` |
| `poliza.plan` | `Básico` · `Plus` · `Premium` | `Plus` | |
| `poliza.estado` | `Vigente` · `Suspendida por mora` · `Cancelada` | `Vigente` | |
| `poliza.inicioVigencia` | **fecha entre comillas** | `"2025-07-01"` | **De aquí sale toda la carencia** (ver §6) |
| `poliza.finVigencia` | **fecha entre comillas** | `"2027-06-30"` | Debe ser posterior a `informe.fecha` (salvo que el caso pruebe vigencia vencida) |
| `poliza.sumaAsegurada` | número | `35000` | USD, sin comillas ni separadores |
| `poliza.montoConsumido` | número | `4200` | USD |
| `poliza.preexistencias` | lista | `[Hipertensión, Cardiopatía isquémica]` | Solo valores de la lista cerrada (§4); `[]` si no hay |
| `poliza.red` | lista | `[Hospital Alcívar, Omni Hospital]` | Solo hospitales de la lista cerrada; mínimo uno |
| `informe.id` | texto | `INF-0007` | Mismo número que el caso |
| `informe.paciente` · `informe.cedula` | texto | — | Iguales a los de la póliza |
| `informe.hospital` | uno de la lista cerrada | `Omni Hospital` | Para "fuera de red", usa uno que NO esté en `poliza.red` |
| `informe.medico` | texto | `Dra. Paulina Sáenz Guerrero` | |
| `informe.fecha` | **fecha entre comillas** | `"2026-09-16"` | Fecha del informe; contra ella se cuentan los días de carencia |
| `informe.tipoAtencion` | `Electiva` · `Urgencia` · `Emergencia` | `Electiva` | Lo que el hospital declara. Solo `Emergencia` exime carencia (y solo si el procedimiento lo permite) |
| `informe.adjuntos` | lista | `[Informe médico, Exámenes de laboratorio]` | Lo que el hospital adjuntó. Es la verdad para "documentos faltantes" |
| `informe.presupuesto` | número | `5200` | USD |

**Errores típicos que rompen el archivo:** fechas sin comillas (YAML las convierte a otro tipo), cédula sin comillas (pierde el cero inicial), un hospital o documento escrito distinto a la lista cerrada (una tilde de más o de menos ya es otro valor).

## 4. Listas cerradas (copia y pega, no reescribas)

**Planes:** `Básico` · `Plus` · `Premium`

**Estados de póliza:** `Vigente` · `Suspendida por mora` · `Cancelada`

**Tipos de atención:** `Electiva` · `Urgencia` · `Emergencia`

**Documentos:** `Informe médico` · `Exámenes de laboratorio` · `Imagenología` · `Consentimiento informado` · `Historia clínica` · `Presupuesto hospitalario` · `Segunda opinión`

**Preexistencias:** `Hipertensión` · `Diabetes tipo 2` · `Cardiopatía isquémica` · `Obesidad` · `Asma` · `Artrosis`

**Hospitales:** `Hospital Alcívar` · `Clínica Kennedy` · `Hospital Clínica San Francisco` · `Omni Hospital` · `Hospital Luis Vernaza` · `Clínica Guayaquil` · `Hospital Metropolitano (Quito)`

## 5. La prosa del informe (lo que lee la IA)

- **150 a 400 palabras**, en español neutro (nada de voseo: ni "vos", ni "tenés", ni "acá").
- Estructura: `**Paciente:**` (nombre, edad, sexo) → `**Motivo de consulta**` o `**Enfermedad actual**` → `**Examen físico**` → `**Exámenes**` → `**Diagnóstico:**` con el código CIE-10 → `**Plan:**` con el procedimiento propuesto y el presupuesto → firma del médico con registro.
- **El procedimiento propuesto debe estar en la prosa, no en el frontmatter.** El agente lo tiene que inferir del texto; ahí vive la IA. Nómbralo como lo nombraría un cirujano ("se indica colecistectomía laparoscópica electiva").
- Menciona en la prosa qué se adjunta ("se adjunta el informe ecográfico") de forma coherente con `informe.adjuntos`. Si quieres que el agente emita una advertencia, menciona un estudio que NO esté en adjuntos (como hace PA-0003 con la ecografía).
- Nombres, cédulas y registros son ficticios pero verosímiles. No uses personas reales.
- Solo negritas con `**…**`; sin encabezados `#`, sin tablas, sin listas.

## 6. Cómo lograr cada veredicto esperado

El motor aplica las reglas en este orden y decide por prioridad. Parámetros: carencia general 30 días; carencia por preexistencia declarada 730 días; solo `Emergencia` exime carencia (y solo si el procedimiento lo permite; nunca con preexistencia).

| Quieres | Haz esto |
|---|---|
| **Rechazada: sin cobertura vigente** | `poliza: null`, o `poliza.estado: Suspendida por mora`, o `informe.fecha` fuera de `inicioVigencia`–`finVigencia` |
| **Rechazada: fuera de red** | `informe.hospital` que no esté en `poliza.red` |
| **Rechazada: exclusión** | Procedimiento con `excluido: true` en `cases/catalogo.json` (hoy: `Rinoplastia estética`) y prosa claramente estética |
| **Rechazada: no cubierto por el plan** | Procedimiento cuyo `planes` no incluya `poliza.plan` (ej. `Reemplazo total de cadera` solo Plus/Premium → póliza `Básico`) |
| **Rechazada por carencia** | Días entre `poliza.inicioVigencia` e `informe.fecha` menores que la carencia del procedimiento (`carenciaDias` en el catálogo) y `tipoAtencion` distinto de `Emergencia` |
| **Rechazada por carencia de preexistencia** | `poliza.preexistencias` incluye una de `preexistenciaRelacionada` del procedimiento (ej. `Cardiopatía isquémica` para `Bypass coronario`) y han pasado menos de 730 días |
| **Documentos faltantes** | `informe.adjuntos` sin alguno de `documentosRequeridos` del procedimiento; todo lo demás en regla |
| **Documentos faltantes: informe ampliado** | Prosa que NO nombra un procedimiento concreto ("valoración quirúrgica a definir") |
| **Preaprobada** | Todo en regla: vigente, en red, plan cubre, carencia cumplida (o emergencia exenta), adjuntos completos, presupuesto ≤ saldo |
| **Preaprobada con tope** | Todo en regla pero `informe.presupuesto` mayor que `sumaAsegurada − montoConsumido` (o que `montoMaximo` del procedimiento) |

Los procedimientos disponibles, con su carencia, planes, documentos requeridos y preexistencias relacionadas, están en `cases/catalogo.json`. Léelo antes de elegir fechas.

**Cálculo de días:** `diasTranscurridos = informe.fecha − poliza.inicioVigencia` en días completos (el día de inicio cuenta como día 0). Ejemplo: inicio `2026-08-05`, informe `2026-09-19` → 45 días. Con carencia 90 → rechazada, elegible desde `2026-11-03`.

## 7. Cómo probar tu caso en local

```bash
bun install          # una sola vez
bun test tests/cases # valida frontmatter, prosa y consistencia
```

Si el frontmatter tiene un error, el test te dice el campo exacto. El test "golden" de tu caso se **salta** hasta que Jose escriba su `tests/cases/PA-00xx.extraction.json`; eso es normal.

## 8. Cómo entregar

1. Rama: `casos/cristian` o `casos/levi` (una sola rama por persona, todos tus casos ahí).
2. Un commit por caso: `feat(cases): PA-0007 bypass coronario con preexistencia`.
3. `git push` y abre un PR a `main` con el título `Casos de <nombre>`. Jose revisa y hace merge.
4. Si Jose comenta algo, corrige en la misma rama y vuelve a subir.
