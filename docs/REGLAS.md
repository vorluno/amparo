# Reglas del adjudicador

El adjudicador es `src/lib/rules/engine.ts`: una función pura `adjudicate(input)` que recibe la extracción del informe, los metadatos del informe, la póliza (o `null`), la entrada del catálogo (o `null`) y la configuración, y devuelve un `Adjudication` con el veredicto, el motivo, las cláusulas, la traza de las ocho reglas y las advertencias. No accede a la red ni al reloj: cualquier resultado se reproduce con los mismos datos.

Parámetros (`src/lib/rules/config.ts`): carencia general **30** días · carencia por preexistencia declarada **730** días · certeza mínima de extracción **70 %** · tipos de atención que eximen carencia: solo **Emergencia** · lock de análisis **2** minutos.

## Definiciones

- **Días transcurridos** = días completos entre el inicio de vigencia y la fecha del informe (el día de inicio cuenta como día 0). Inicio `2026-05-15`, informe `2026-09-18` → 126.
- **Elegible desde** = inicio de vigencia + carencia aplicable. Inicio `2026-05-15` + 90 → `2026-08-13`. Ese día ya cumple (126 ≥ 90 no aplica aquí; con informe el `2026-08-13`, 90 ≥ 90 cumple).
- **Saldo** = suma asegurada anual − monto consumido. **Tope** = mínimo entre el saldo y el monto máximo del procedimiento (si existe).

## Las reglas, en orden

### R1 — Póliza vigente en la fecha del informe (cláusula 2)
Busca la póliza por la cédula del informe. No cumple si no existe, si su estado no es `Vigente` (mora o cancelación) o si la fecha del informe cae fuera de `inicio`–`fin`. El último día de vigencia cumple.
*Ejemplo (PA-0010):* cédula sin póliza → "Rechazada: sin cobertura vigente". Las reglas R3–R8 quedan "no aplica"; R2 sí se evalúa para que la traza muestre si el informe era legible.

### R2 — Procedimiento identificado con certeza (sin cláusula: criterio del agente)
Cumple si el extractor eligió un ID del catálogo **y** su certeza es ≥ 70 %. Si no, el agente no adivina: "Documentos faltantes: informe médico ampliado", citando la cláusula 7. R4–R8 quedan "no aplica"; R3 se evalúa.
*Ejemplo (PA-0012):* prosa que pide "valoración por neurocirugía para definir conducta" sin nombrar procedimiento → `catalogoId: null`, certeza 30 % → informe ampliado.

### R3 — Hospital dentro de la red (cláusula 3)
El hospital del informe debe estar en `Red de hospitales` de la póliza.
*Ejemplo (PA-0011):* Hospital Metropolitano (Quito) con red de Guayaquil → "Rechazada: hospital fuera de la red".

### R4 — Procedimiento no excluido (cláusula 5)
`Excluido = false` en el catálogo. Si está excluido, el motivo del catálogo va en la evidencia.
*Ejemplo (PA-0005):* Rinoplastia estética → "Rechazada: Rinoplastia estética es un procedimiento excluido" (cláusula 5.1 en el motivo). Su pareja PA-0006, Septoplastia funcional, no está excluida y se preaprueba: el extractor distingue la finalidad.

### R5 — Cubierto por el plan contratado (cláusula 6)
El plan de la póliza debe figurar en `Cubierto en planes` del procedimiento.
*Ejemplo (PA-0008):* Reemplazo total de cadera (Plus, Premium) con póliza Básico → "Rechazada: … no está cubierto por el plan Básico".

### R6 — Período de carencia cumplido (cláusulas 4.1, 4.2, 4.3, 4.4)
```
base       = max(30, carencia del procedimiento)           → cláusula 4.1 si manda la general, 4.2 si manda la del procedimiento
preexiste  = preexistencia relacionada del procedimiento ∩ preexistencias declaradas de la póliza ≠ ∅
aplicable  = preexiste ? max(base, 730) : base             → cláusula 4.3 si preexiste
exento     = tipo de atención = Emergencia ∧ el catálogo marca "exento en emergencia" ∧ ¬preexiste   → cláusula 4.4
cumple     = exento ∨ días transcurridos ≥ aplicable
```
*Ejemplo (PA-0001):* Apendicectomía, Emergencia, exenta en emergencia, sin preexistencia → cumple por 4.4 aunque solo hubiera 20 días.
*Ejemplo (PA-0002):* Artroscopia (90 días), electiva, 45 días transcurridos → "Rechazada por carencia: elegible desde …" (4.2).
*Ejemplo (PA-0007):* Bypass coronario con Cardiopatía isquémica declarada, 425 días transcurridos → aplicable 730 → rechazada (4.3); la evidencia aclara que la emergencia no exime la carencia por preexistencia.
*Borde:* con carencia del procedimiento 0 y 15 días transcurridos, manda la general (30) → rechazada por 4.1, elegible el día 30.

### R7 — Documentación completa (cláusula 7)
`Documentos requeridos` del procedimiento ⊆ `Documentos adjuntos` del informe. Si faltan, la lista exacta va al veredicto y a la propiedad `Documentos faltantes`.
*Ejemplo (PA-0003):* Colecistectomía requiere informe, laboratorio, imagenología y presupuesto; adjuntos solo informe y laboratorio → "Documentos faltantes: Imagenología, Presupuesto hospitalario".

### R8 — Presupuesto dentro de la suma asegurada (cláusula 8)
Si el saldo es ≤ 0 → "Rechazada: suma asegurada agotada". Si el presupuesto supera el tope → "Preaprobada hasta USD X" con `Tope aprobado = X` y el excedente a cargo del paciente. Si cabe → preaprobada sin tope.
*Ejemplo (PA-0009):* suma 8,000, consumido 5,100 (saldo 2,900), máximo del procedimiento 4,000, presupuesto 5,600 → "Preaprobada hasta USD 2,900.00".

## Prioridad del veredicto

1. R1 no cumple → Rechazada (sin cobertura vigente).
2. R2 no cumple → Documentos faltantes (informe ampliado).
3. R3, R4, R5, R6 no cumplen (en ese orden) → Rechazada por la primera que falle.
4. R8 con saldo agotado → Rechazada.
5. R7 no cumple → Documentos faltantes.
6. R8 con presupuesto mayor que el tope → Preaprobada con tope.
7. Todo cumple → Preaprobada.

Un rechazo tiene prioridad sobre "documentos faltantes": no se piden documentos para algo que no está cubierto. Todas las reglas que aplican se evalúan igual y quedan en la traza.

## Advertencias (no cambian el veredicto)

- **Inconsistencia de urgencia:** el hospital declara un tipo de atención y la prosa describe otro (por ejemplo, "Emergencia" en el encabezado y una cirugía programada en el texto).
- **Documento mencionado pero no adjunto:** la prosa dice que se realizó o se entregará un estudio que no figura en los adjuntos (PA-0003 menciona la ecografía y el presupuesto "en elaboración").

Son material para el auditor humano; aparecen en la traza de la consola y en la página de Notion.

## Cómo se prueba

- `tests/rules/engine.test.ts`: cada regla en "cumple" y "no cumple" más los bordes (último día de vigencia, día exacto de fin de carencia, emergencia con y sin exención, urgencia, preexistencia en emergencia, carencia general mayor que la del procedimiento, saldo exacto, suma agotada, advertencias).
- `tests/cases/golden.test.ts`: por cada `cases/PA-00xx.md` con su `tests/cases/PA-00xx.extraction.json` (la extracción que se espera del modelo), `adjudicate()` debe devolver el veredicto esperado. Corre sin red.
- `tests/pipeline/fixtures.test.ts`: salidas reales del modelo grabadas, validadas contra el esquema (detección de deriva).
