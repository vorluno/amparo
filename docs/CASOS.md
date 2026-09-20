# Casos de demostración — esperado vs obtenido

Cada caso vive en `cases/PA-00xx.md`. Las columnas "Obtenido / Quién / Observaciones" se llenan en el QA del 21/09 sobre la demo pública (https://amparo.vorluno.dev), después de `bun run notion:reset`.

| ID | Escenario | Veredicto esperado | Regla que decide | Cláusula | Obtenido | Quién / hora | Observaciones |
|---|---|---|---|---|---|---|---|
| PA-0001 | Apendicectomía laparoscópica de emergencia, póliza de 4 meses | Preaprobada | R6 exenta por emergencia; R7 y R8 cumplen | 4.4 | | | |
| PA-0002 | Artroscopia de rodilla, electiva, póliza de 45 días | Rechazada | R6 carencia 90 días | 4.2 | | | |
| PA-0003 | Colecistectomía sin imagenología ni presupuesto | Documentos faltantes | R7 | 7 | | | |
| PA-0004 | Cesárea programada, póliza de 7 meses | Rechazada | R6 carencia 300 días | 4.2 | | | |
| PA-0005 | Rinoplastia con finalidad estética | Rechazada | R4 exclusión | 5 (5.1) | | | |
| PA-0006 | Septoplastia funcional por desviación septal | Preaprobada | R2 distingue funcional de estética; todo cumple | — | | | |
| PA-0007 | Bypass coronario con cardiopatía isquémica declarada, póliza de 14 meses | Rechazada | R6 carencia por preexistencia 730 días | 4.3 | | | |
| PA-0008 | Reemplazo total de cadera con plan Básico | Rechazada | R5 no cubierto por el plan | 6 | | | |
| PA-0009 | Herniorrafia con presupuesto mayor que el saldo | Preaprobada (con tope) | R8 tope = saldo | 8 | | | |
| PA-0010 | Cédula sin póliza | Rechazada | R1 sin cobertura vigente | 2 | | | |
| PA-0011 | Amigdalectomía en hospital fuera de la red | Rechazada | R3 fuera de red | 3 | | | |
| PA-0012 | Informe ambiguo sin procedimiento concreto | Documentos faltantes (informe ampliado) | R2 certeza baja / sin ID de catálogo | 7 | | | |

**Prueba del tiempo real (webhook):** con PA-0003 en `Pendiente`, editar y restaurar *Escenario* en Notion; debe pasar a `En análisis` y luego a `Documentos faltantes` sin tocar la consola. Obtenido: **funciona** (Pendiente → En análisis → Documentos faltantes en ~50 s) · Jose + Claude, 20/09 17:43 — se repite en el QA del 21
