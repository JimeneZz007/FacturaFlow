# ADR-003: Security, Audit and Storage

## Estado

Aceptado.

## Contexto

Todo PDF debe almacenarse cifrado y las acciones relevantes deben ser trazables.

## Decision

Usar S3 con cifrado server-side, bloqueo publico y SSL. Registrar eventos importantes en DynamoDB `AuditLogTable` mediante inserts append-only desde la aplicacion. Emitir logs JSON en CloudWatch.

## Consecuencias

- Buena base de auditoria y seguridad para MVP.
- Falta incorporar KMS customer-managed keys y controles WORM si compliance futuro lo exige.
