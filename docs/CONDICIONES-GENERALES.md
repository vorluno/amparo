# Condiciones Generales — Plan de Salud Amparo (documento demo)

> Documento **ficticio**, redactado para el HackIAthon (Viamatica + ADEN, Reto 1). No corresponde a ninguna aseguradora real ni constituye una póliza. Las reglas del agente citan estas cláusulas por número; los parámetros (30 días de carencia general, 730 por preexistencia, etc.) viven en `src/lib/rules/config.ts` y en `cases/catalogo.json`.

## Cláusula 2 — Vigencia y estado de la póliza

La cobertura ampara únicamente las prestaciones cuya fecha de informe médico esté comprendida entre el inicio y el fin de la vigencia contratada, ambos inclusive. Solo se tramitan solicitudes de pre-autorización de pólizas en estado **Vigente**. La falta de pago de la prima suspende la cobertura desde la fecha de mora (estado *Suspendida por mora*) hasta su regularización; la cancelación de la póliza extingue toda obligación de la aseguradora respecto de prestaciones posteriores a la fecha de cancelación. La identificación del asegurado se realiza por el número de cédula registrado en la póliza; si no existe póliza asociada a la cédula del informe, la solicitud se rechaza por ausencia de cobertura vigente.

## Cláusula 3 — Red de prestadores

Las prestaciones cubiertas deben realizarse en los hospitales y clínicas que integran la **red de prestadores asignada a la póliza**, detallada en las condiciones particulares. Las solicitudes de pre-autorización originadas en un prestador ajeno a la red se rechazan, salvo acuerdo expreso y previo de la aseguradora. Esta cláusula no limita la atención de emergencia vital en el prestador más cercano, que se regula por la cláusula 4.4 y se liquida por reembolso conforme a las condiciones particulares.

## Cláusula 4.1 — Carencia general

Toda prestación queda sujeta a un período de carencia general de **treinta (30) días** contados desde el inicio de vigencia de la póliza. Durante ese período la aseguradora no asume la cobertura de procedimientos quirúrgicos ni hospitalizaciones programadas. El cómputo se realiza en días completos, contando el día de inicio de vigencia como día cero.

## Cláusula 4.2 — Carencia por procedimiento

Sin perjuicio de la carencia general, cada procedimiento del **Catálogo de procedimientos** tiene asignado un período de carencia propio (noventa, ciento ochenta, trescientos o trescientos sesenta y cinco días, según el procedimiento), que prevalece sobre la carencia general cuando es mayor. La solicitud de un procedimiento cuya carencia no se ha cumplido se rechaza, indicando la fecha a partir de la cual el asegurado será elegible.

## Cláusula 4.3 — Carencia por preexistencias declaradas

Los procedimientos relacionados con una condición de salud **declarada por el asegurado al contratar** (preexistencia) quedan sujetos a un período de carencia de **setecientos treinta (730) días** desde el inicio de vigencia. La relación entre condición y procedimiento es la establecida en el Catálogo de procedimientos. Esta carencia **no se exime por atención de emergencia**: la aseguradora reconoce el carácter previo de la condición y su cobertura se difiere al cumplimiento del plazo.

## Cláusula 4.4 — Emergencias

Se entiende por emergencia la atención por riesgo vital o de secuela grave que no admite diferimiento, ingresada por el servicio de emergencia del prestador o resuelta quirúrgicamente en un plazo de horas. En tales casos, y únicamente para los procedimientos que el Catálogo señala como **exentos de carencia en emergencia**, no aplican las carencias de las cláusulas 4.1 y 4.2. La atención de urgencia diferible (que admite programación en días) no constituye emergencia a estos efectos. La exención no alcanza a la carencia por preexistencias de la cláusula 4.3.

## Cláusula 5 — Exclusiones

Quedan excluidos de cobertura los procedimientos señalados como tales en el Catálogo de procedimientos, así como sus complicaciones y tratamientos derivados. La exclusión se aplica con independencia de la vigencia, el plan y la red, y se comunica al prestador indicando el motivo registrado en el Catálogo.

## Cláusula 5.1 — Procedimientos estéticos

Están excluidos los procedimientos cuya finalidad es **estética o cosmética**, es decir, la modificación de la apariencia sin indicación médica funcional. Sí están cubiertos, con sujeción a las demás cláusulas, los procedimientos **funcionales o reconstructivos** con indicación médica documentada (por ejemplo, la corrección de una obstrucción nasal por desviación del tabique), aunque incidan sobre la misma región anatómica que un procedimiento estético.

## Cláusula 6 — Cobertura por plan

La aseguradora ofrece los planes **Básico, Plus y Premium**. Cada procedimiento del Catálogo indica en qué planes está cubierto. La solicitud de un procedimiento no incluido en el plan contratado se rechaza, sin perjuicio del derecho del asegurado a solicitar el cambio de plan conforme a las condiciones particulares, con las carencias que correspondan al nuevo plan.

## Cláusula 7 — Documentación para pre-autorización

La solicitud de pre-autorización debe acompañarse de los **documentos que el Catálogo exige para el procedimiento** (informe médico, exámenes de laboratorio, imagenología, consentimiento informado, historia clínica, presupuesto hospitalario o segunda opinión, según corresponda). Si falta alguno, la aseguradora lo solicita al prestador antes de resolver, y el plazo de respuesta se suspende hasta su recepción. Si el informe médico no permite identificar con certeza el procedimiento propuesto, se solicita un **informe médico ampliado** que lo especifique; la aseguradora no presume el procedimiento.

## Cláusula 8 — Suma asegurada y topes

La cobertura anual se limita a la **suma asegurada** contratada, de la que se descuentan las prestaciones ya liquidadas en el período. Cuando el Catálogo fija un **monto máximo** para un procedimiento, la cobertura se limita además a ese monto. Si el presupuesto del prestador supera el saldo disponible o el monto máximo, la pre-autorización se concede **hasta el tope** resultante y el excedente queda a cargo del asegurado. Agotada la suma asegurada, no procede nueva cobertura hasta la renovación de la póliza.
