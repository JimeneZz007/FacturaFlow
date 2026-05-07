# Observability

FacturaFlow emite logs JSON estructurados en CloudWatch con `trackingId`, `invoiceId`, `component`, `event`, `status`, `latencyMs` y `errorCode` cuando aplica.

## Metricas clave

| Metrica | Fuente | Uso |
| --- | --- | --- |
| UploadLatencyMs | Logs/API Gateway/k6 | Validar p95 menor a 2 segundos. |
| SQS ApproximateNumberOfMessagesVisible | SQS `ProcessingQueue` y `ERPQueue` | Demostrar que las colas absorben picos y backlog en vez de saturar Lambdas. |
| ProcessingLatencyMs | Logs `ProcessorLambda` | Medir tiempo total por factura. |
| AiMockLatencyMs | Logs `AiMockLambda` | Confirmar latencia artificial de 3 a 5 segundos. |
| Lambda ConcurrentExecutions | CloudWatch Lambda por funcion | Vigilar consumo de cuota compartida, especialmente `Ingest`, `Processor` y `AiMock`. |
| Lambda Throttles | CloudWatch Lambda por funcion | Detectar saturacion de concurrencia que API Gateway puede exponer como `503`. |
| AiMockConcurrentRequests | Lambda concurrent executions | Confirmar que el camino productivo queda por debajo del limite externo de IA de 10. |
| ErpRequestsPerSecond | Logs `ErpMockLambda` y `ErpRateLimitTable` | Confirmar maximo 5 recepciones aceptadas por segundo; excedentes devuelven `429`. |
| ApprovedCount | AuditLogTable evento `INVOICE_APPROVED` | Medir aprobacion automatica. |
| RequiresReviewCount | AuditLogTable evento `INVOICE_REQUIRES_REVIEW` | Medir revision manual futura. |
| DLQMessages | SQS DLQ visible messages | Alertar fallos persistentes. |
| LambdaErrors | CloudWatch Lambda Errors | Alertar errores de ejecucion. |

## Queries sugeridas CloudWatch Logs Insights

```sql
fields @timestamp, trackingId, invoiceId, component, event, status, latencyMs, errorCode
| sort @timestamp desc
| limit 50
```

```sql
fields @timestamp, component, event
| filter component = "ErpMockLambda" and event = "ERP_RECEIVED"
| stats count(*) as requests by bin(1s)
```
