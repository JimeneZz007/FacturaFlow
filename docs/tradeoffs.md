# Trade-offs

| Decision | Beneficio | Costo / riesgo | Mitigacion |
| --- | --- | --- | --- |
| Serverless vs control | Costo bajo, escalado elastico, menor operacion. | Menos control fino de runtime y cold starts. | Timeouts ajustados, colas, logs, CDK reproducible. |
| Asincronismo vs consistencia inmediata | Respuesta rapida con `trackingId`, absorbe picos. | Estado final no disponible inmediatamente. | JobsTable y trazabilidad por `trackingId`. |
| SQS + Lambda vs orquestador central | Simple, barato, natural para backlog. | Flujos complejos podrian crecer. | Separacion de casos de uso y eventos auditables; evaluar Step Functions despues del MVP. |
| DynamoDB vs base relacional | Pay-per-request, escala y baja operacion. | Consultas ad hoc/reporting menos flexibles. | Modelar accesos del MVP y exportar/replicar para analitica futura. |
| Mock IA vs IA real | Permite validar arquitectura y limites en 12 semanas. | No mide calidad real de extraccion. | Puerto `AiClient` reemplazable y fixtures para escenarios clave. |
