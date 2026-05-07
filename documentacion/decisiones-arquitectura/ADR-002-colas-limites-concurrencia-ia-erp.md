# ADR-002: Colas y limites de concurrencia para IA y ERP

## Estado

Aceptado.

## Contexto

La IA externa soporta maximo 10 peticiones concurrentes y el ERP maximo 5 peticiones por segundo.

## Decision

Usar SQS como buffer y aplicar Pipes and Filters en el flujo de procesamiento. `ProcessingQueue` dispara Processor con `maxConcurrency: 2` por defecto mediante `PROCESSOR_MAX_CONCURRENCY`. Se usa 2 porque es el minimo soportado por Lambda SQS event source maximum concurrency; un valor 1 no sintetiza con CDK. Ese valor cumple el limite externo de IA de maximo 10 solicitudes concurrentes y actua como Bulkhead para cuentas AWS nuevas/free tier, donde Processor y AiMock pueden consumir concurrencia durante 3 a 5 segundos por documento y saturar la cuota compartida de Lambda. No se usa `reservedConcurrentExecutions` en AiMock ni en Processor porque en cuentas AWS nuevas puede fallar si reduce la concurrencia no reservada por debajo del minimo de Lambda. `ERPQueue` dispara Dispatcher con batch 5 y rate limiter de 5 req/s en aplicacion. El `ErpMock` tambien refuerza el limite con `ErpRateLimitTable`.

## Consecuencias

- Los picos se convierten en backlog controlado.
- El procesamiento total puede tardar mas durante cierres porque se prioriza disponibilidad de ingesta sobre throughput inmediato.
- SQS absorbe picos y permite degradacion graceful: `POST /uploads` sigue devolviendo `trackingId` mientras el procesamiento avanza mas lento.
- El Bulkhead de Processor evita que la fase lenta de IA agote la cuota Lambda que necesita Ingest.
- Las pruebas de carga deben demostrar encolamiento y respeto de limites.
- Cada filtro del pipeline puede medirse y reemplazarse sin mezclar responsabilidades.
- Evitar reserved concurrency mejora la portabilidad del despliegue en cuentas academicas o nuevas con limites bajos.
