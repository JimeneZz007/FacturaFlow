# ADR-001: Arquitectura serverless orientada a eventos

## Estado

Aceptado.

## Contexto

FacturaFlow debe procesar alto volumen diario con picos de cierre, bajo costo de MVP y respuesta rapida al usuario. El usuario no debe esperar la extraccion de IA ni el despacho al ERP.

## Decision

Usar Event-Driven Architecture sobre servicios serverless: API Gateway HTTP API, Lambda, S3, DynamoDB y SQS. La ingesta responde `202` con `trackingId`; el procesamiento y despacho se ejecutan en consumidores desacoplados.

## Consecuencias

- Mejora latencia percibida y resiliencia ante picos.
- Introduce consistencia eventual.
- Requiere observabilidad por `trackingId` y estados de job.
- Evita servidores siempre encendidos y mantiene el MVP alineado con costo/free tier.
