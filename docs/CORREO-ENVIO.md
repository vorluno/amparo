# Correo de envío — borrador

**Para:** hackiathon@viamatica.com
**Asunto:** HackIAthon · Reto 1 · Amparo — Agente de pre-autorización quirúrgica en tiempo real

---

Estimado equipo de Viamatica y ADEN:

Adjuntamos nuestra solución al **Reto 1 (Agente de Pre-Autorización Quirúrgica en Tiempo Real)** del filtro del HackIAthon.

**Enlace público del agente:** https://amparo.vorluno.dev
**Repositorio:** https://github.com/vorluno/amparo
**Datos en Notion (públicos):** https://sly-sovereign-37f.notion.site/3e19e19beec6819da242e6559857cc51

**Qué hace.** Amparo recibe el informe médico del hospital y la póliza del asegurado desde una base de datos de Notion, verifica cobertura y carencia, y emite al instante una **preaprobación**, una **solicitud de documentos faltantes** o un **rechazo** fundamentado, citando la regla y la cláusula que lo sostienen. El resultado se escribe de vuelta en Notion junto con la carta de respuesta al hospital y la traza completa del análisis.

**Cómo probarlo en dos minutos.**
1. Abrir la demo y elegir una solicitud. Hay doce casos de demostración que cubren cada regla (emergencia, carencia, preexistencia, exclusión estética, plan, red, documentación, suma asegurada, cédula sin póliza e informe ambiguo). Cada caso muestra su veredicto esperado y si el agente coincidió.
2. Pulsar **Analizar** (o **Reanalizar**) para ver las cinco etapas en vivo: extractor clínico, auditor de póliza, adjudicador, carta al hospital y registro en Notion. Cada etapa despliega su evidencia.
3. Para el "tiempo real" desde Notion: en la base *Solicitudes de pre-autorización*, cambiar el **Estado** de cualquier solicitud a `Pendiente`. En menos de un minuto el agente la analiza solo y actualiza Notion, sin tocar la consola.

**Cómo está construido.** La IA (Gemini 2.5, vía OpenRouter) hace lo que el código no puede: leer la prosa clínica, elegir el procedimiento del catálogo y redactar la carta. Un motor de reglas determinista, probado con 85 tests que corren sin red, decide cobertura, carencia y montos; el modelo nunca aprueba ni rechaza por sí mismo. Integración con Notion (API 2025-09-03, webhooks firmados), streaming por Server-Sent Events, Next.js 16 y TypeScript, desplegado en contenedor propio. El diseño, las decisiones y las reglas con ejemplos numéricos están documentados en el repositorio (`README.md`, `docs/`).

**Equipo.** José L. González (arquitectura y desarrollo), Cristian [apellido] y Levi [apellido] (revisión de casos, QA y presentación).

Quedamos atentos a cualquier consulta.

Saludos cordiales,

José L. González
Vorluno · contacto@vorluno.dev · https://vorluno.dev

---

## Antes de enviar (lista de Jose)

- [ ] Completar apellidos de Cristian y Levi (o quitarlos si no van en el registro).
- [ ] Confirmar el correo de contacto (contacto@vorluno.dev o el usado en el registro).
- [ ] Subir el límite de OpenRouter a USD 5–10.
- [ ] Abrir https://amparo.vorluno.dev y comprobar que PA-0001 está en `Pendiente` y el resto con veredicto.
- [ ] Abrir el enlace público de Notion en una ventana de incógnito.
- [ ] Enviar desde la cuenta con la que se hizo el registro.
