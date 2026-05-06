# Utility Tree

## Escenarios priorizados

| Prioridad | Atributo | Escenario SEI |
| --- | --- | --- |
| Alta riesgo / alto valor | Performance | Fuente: cliente corporativo. Estimulo: carga 3,300 PDFs/dia con picos de cierre. Artefacto: API de ingesta y SQS. Entorno: produccion con carga por lote. Respuesta: API responde asincronicamente y encola. Medida: p95 de `POST /uploads` menor a 2 segundos y sin perdida de mensajes. |
| Alta riesgo / alto valor | Modificabilidad | Fuente: equipo fiscal. Estimulo: cambio de tasas tributarias por pais. Artefacto: reglas fiscales. Entorno: mantenimiento normal. Respuesta: cambiar JSON de pais sin modificar core de validacion. Medida: prueba unitaria demuestra carga desde `config/tax-rules/*.json`. |
| Alta riesgo / medio valor | Interoperabilidad | Fuente: ERP. Estimulo: limite de 5 requests/s. Artefacto: ERP Dispatcher. Entorno: backlog de facturas aprobadas. Respuesta: dispatcher regula llamadas. Medida: logs del ERP mock no superan 5 recepciones por segundo. |
| Media riesgo / alto valor | Seguridad | Fuente: auditoria. Estimulo: revision de documentos y trazabilidad. Artefacto: S3, DynamoDB AuditLogTable, CloudWatch Logs. Entorno: produccion. Respuesta: PDFs cifrados, eventos append-only y logs estructurados. Medida: bucket con SSE habilitado y eventos `DOCUMENT_INGESTED`, `VALIDATION_COMPLETED`, `ERP_DISPATCHED`. |
| Media riesgo / medio valor | Resiliencia | Fuente: dependencia IA/ERP. Estimulo: fallo temporal. Artefacto: SQS y DLQ. Entorno: produccion degradada. Respuesta: reintentos controlados y DLQ tras fallos repetidos. Medida: mensajes fallidos aparecen en DLQ despues de 3 intentos. |
