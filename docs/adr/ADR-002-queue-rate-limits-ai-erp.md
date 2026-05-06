# ADR-002: Queue Rate Limits for AI and ERP

## Estado

Aceptado.

## Contexto

La IA externa soporta maximo 10 peticiones concurrentes y el ERP maximo 5 peticiones por segundo.

## Decision

Usar SQS como buffer. `ProcessingQueue` dispara Processor con `maxConcurrency: 10`. `ERPQueue` dispara Dispatcher con concurrencia 1, batch 5 y rate limiter de 5 req/s en aplicacion.

## Consecuencias

- Los picos se convierten en backlog controlado.
- El procesamiento total puede tardar mas durante cierres.
- Las pruebas de carga deben demostrar encolamiento y respeto de limites.
