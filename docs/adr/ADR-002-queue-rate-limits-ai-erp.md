# ADR-002: Queue Rate Limits for AI and ERP

## Estado

Aceptado.

## Contexto

La IA externa soporta maximo 10 peticiones concurrentes y el ERP maximo 5 peticiones por segundo.

## Decision

Usar SQS como buffer y aplicar Pipes and Filters en el flujo de procesamiento. `ProcessingQueue` dispara Processor con `maxConcurrency: 10`, de modo que Processor no invoque la IA mock con mas de 10 documentos en paralelo. No se usa `reservedConcurrentExecutions` en AiMock ni en Processor porque en cuentas AWS nuevas puede fallar si reduce la concurrencia no reservada por debajo del minimo de Lambda. `ERPQueue` dispara Dispatcher con batch 5 y rate limiter de 5 req/s en aplicacion. El `ErpMock` tambien refuerza el limite con `ErpRateLimitTable`.

## Consecuencias

- Los picos se convierten en backlog controlado.
- El procesamiento total puede tardar mas durante cierres.
- Las pruebas de carga deben demostrar encolamiento y respeto de limites.
- Cada filtro del pipeline puede medirse y reemplazarse sin mezclar responsabilidades.
- Evitar reserved concurrency mejora la portabilidad del despliegue en cuentas academicas o nuevas con limites bajos.
