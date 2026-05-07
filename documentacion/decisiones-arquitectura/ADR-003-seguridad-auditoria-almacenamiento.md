# ADR-003: Seguridad, auditoria y almacenamiento

## Estado

Aceptado.

## Contexto

Todo PDF debe almacenarse cifrado y las acciones relevantes deben ser trazables.

## Decision

Usar S3 con cifrado server-side, bloqueo publico y SSL. Registrar eventos importantes con Event Sourcing parcial en DynamoDB `AuditLogTable` mediante inserts append-only desde la aplicacion: `DOCUMENT_INGESTED`, `AI_EXTRACTION_STARTED`, `AI_EXTRACTION_COMPLETED`, `VALIDATION_COMPLETED`, `INVOICE_APPROVED`, `INVOICE_REQUIRES_REVIEW`, `STORED`, `ERP_DISPATCHED` y `ERP_DISPATCH_FAILED`. Emitir logs JSON en CloudWatch.

## Consecuencias

- Buena base de auditoria y seguridad para MVP.
- Falta incorporar KMS customer-managed keys y controles WORM si compliance futuro lo exige.
- No se implementa CQRS completo; la tabla de auditoria no sustituye el estado operacional de JobsTable o InvoicesTable.
