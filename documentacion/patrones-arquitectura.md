# Patrones de arquitectura

FacturaFlow usa un conjunto pequeno de patrones para resolver el MVP sin convertirlo en una plataforma distribuida compleja. La prioridad es responder rapido al usuario, absorber picos de cierre de mes, mantener costo bajo y conservar separacion clara entre dominio e infraestructura.

## Patrones aplicados

| Patron usado | Donde aparece en codigo o infraestructura | Atributo de calidad que mejora | Trade-off que introduce | Justificacion para FacturaFlow |
| --- | --- | --- | --- | --- |
| Event-Driven Architecture / EDA | `infra/facturaflow-stack.ts` define `ProcessingQueue`, `ERPQueue`, DLQs y consumidores Lambda. `IngestDocumentUseCase` publica mensajes y `processorHandler` / `erpDispatcherHandler` los consumen. | Rendimiento, escalabilidad y resiliencia ante picos. | Consistencia eventual; el usuario recibe `trackingId` antes del resultado final. | El piloto maneja miles de PDFs diarios y picos de cierre. EDA permite responder `202` rapido y procesar en background sin bloquear al usuario. |
| Serverless / FaaS | CDK crea API Gateway HTTP API, Lambda, S3, SQS, DynamoDB, CloudWatch Logs y hosting web estatico en S3. No hay EC2, VMs, Kubernetes ni contenedores permanentes. | Costo, operabilidad y elasticidad. | Menor control del runtime, cold starts y limites propios de servicios gestionados; S3 website no entrega HTTPS propio sin CloudFront. | El MVP debe operar con costo bajo/free tier y no puede usar servidores siempre encendidos. Lambda escala bajo demanda, SQS amortigua picos y S3 permite una URL publica simple para la demo. |
| Hexagonal Architecture / Ports & Adapters | `src/domain`, `src/application` y `src/infrastructure`. `src/application/Ports.ts` define `DocumentStorage`, repositorios, colas, `AiClient`, `ErpClient` y auditoria. Adapters AWS implementan esos puertos. | Modificabilidad, testabilidad y separacion de responsabilidades. | Mas interfaces y ensamblaje de dependencias en handlers. | La validacion matematica y las reglas de negocio no dependen de AWS ni de Lambda. Se puede cambiar IA/ERP/S3/DynamoDB sin tocar el core. |
| Pipes and Filters | Flujo logico: ingesta -> almacenamiento -> job/auditoria -> cola -> IA mock -> validacion -> persistencia -> ERP. Esta secuencia esta repartida entre `IngestDocumentUseCase`, etapas privadas nombradas en `ProcessInvoiceUseCase` y `DispatchToErpUseCase`. | Comprensibilidad, mantenibilidad y aislamiento de fallos. | El pipeline es mas explicito pero requiere pasar contexto entre etapas asincronas. | Cada etapa tiene una responsabilidad unica y puede medirse, probarse o reemplazarse sin mezclar reglas fiscales con IO de AWS. |
| Event Sourcing parcial para auditoria | `AuditLogTable` en CDK, puerto `AuditLogRepository` y adapter `DynamoAuditLogRepository`. Los casos de uso registran `DOCUMENT_INGESTED`, `AI_EXTRACTION_STARTED`, `AI_EXTRACTION_COMPLETED`, `VALIDATION_COMPLETED`, `INVOICE_APPROVED`, `INVOICE_REQUIRES_REVIEW`, `STORED`, `ERP_DISPATCHED` y `ERP_DISPATCH_FAILED`. | Auditabilidad, trazabilidad y soporte operativo. | No reconstruye todo el estado ni implementa CQRS; agrega escrituras por evento. | El MVP necesita evidencia del ciclo de vida de cada factura, pero CQRS completo seria excesivo para 12 semanas. |

## Patrones descartados

| Patron descartado | Por que no se eligio como base |
| --- | --- |
| Arquitectura en capas pura | Separar solo por capas tiende a acoplar casos de uso a frameworks/repositorios concretos. Hexagonal expresa mejor los puertos para IA, ERP, S3, SQS y DynamoDB. |
| Microservicios completos | Introducir servicios independientes, despliegues separados y contratos remotos aumentaria complejidad operacional para un MVP. Lambda + colas ya da desacople suficiente sin partir el dominio prematuramente. |
| SOA | SOA encaja mejor con integraciones empresariales pesadas y buses corporativos. FacturaFlow necesita un flujo serverless ligero, medible y barato. |
| Space-Based Architecture | Esta orientada a eliminar cuellos de botella con memoria distribuida/data grids. El problema del MVP se resuelve con colas, Lambda y DynamoDB sin introducir infraestructura especializada. |
| Microkernel | Seria util si el producto requiriera plugins instalables o extensiones dinamicas. En este MVP las variaciones principales son reglas fiscales por pais y adapters externos, cubiertas por JSON y puertos. |
