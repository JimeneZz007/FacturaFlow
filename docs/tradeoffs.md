# Trade-offs

| Decision | Beneficio | Costo / riesgo | Mitigacion |
| --- | --- | --- | --- |
| Serverless vs control | Costo bajo, escalado elastico, menor operacion. | Menos control fino de runtime y cold starts. | Timeouts ajustados, colas, logs, CDK reproducible. |
| Asincronismo vs consistencia inmediata | Respuesta rapida con `trackingId`, absorbe picos. | Estado final no disponible inmediatamente. | JobsTable y trazabilidad por `trackingId`. |
| SQS + Lambda vs orquestador central | Simple, barato, natural para backlog. | Flujos complejos podrian crecer. | Separacion de casos de uso y eventos auditables; evaluar Step Functions despues del MVP. |
| DynamoDB vs base relacional | Pay-per-request, escala y baja operacion. | Consultas ad hoc/reporting menos flexibles. | Modelar accesos del MVP y exportar/replicar para analitica futura. |
| Mock IA vs IA real | Permite validar arquitectura y limites en 12 semanas. | No mide calidad real de extraccion. | Puerto `AiClient` reemplazable y fixtures para escenarios clave. |
| Hexagonal vs capas puras | Dominio testeable y adapters reemplazables para AWS, IA y ERP. | Mas interfaces y ensamblaje manual en handlers. | Mantener puertos pequenos y alineados a casos de uso reales. |
| Pipes and Filters vs flujo monolitico | Etapas claras, medibles y con responsabilidad unica. | El contexto debe viajar entre filtros y colas. | Usar `trackingId`, JobsTable y AuditLogTable para correlacion. |
| Event sourcing parcial vs CQRS completo | Auditoria append-only sin complejidad de proyecciones/event store completo. | No permite reconstruccion completa del sistema desde eventos. | Usarlo solo para trazabilidad del ciclo de vida del MVP. |
| S3 static website vs CloudFront | URL publica simple, bajo costo y despliegue directo desde CDK. | S3 website endpoint usa HTTP y tiene menos capacidades de cache/seguridad perimetral. | Aceptable para demo MVP; agregar CloudFront si se exige HTTPS/custom domain. |
| Modo demo local vs solo API real | La interfaz puede demostrarse sin AWS ni credenciales. | El demo simula el procesamiento y no prueba servicios gestionados. | Usar modo API real con `VITE_API_BASE_URL` para evidencias productivas. |
