# ADR-001: Serverless Event-driven

## Estado

Aceptado.

## Contexto

FacturaFlow debe procesar alto volumen diario con picos de cierre, bajo costo de MVP y respuesta rapida al usuario.

## Decision

Usar API Gateway HTTP API, Lambda, S3, DynamoDB y SQS. La ingesta responde rapido y el procesamiento ocurre en background.

## Consecuencias

- Mejora latencia percibida y resiliencia ante picos.
- Introduce consistencia eventual.
- Requiere observabilidad por `trackingId` y estados de job.
