# FacturaFlow MVP

FacturaFlow es un MVP B2B serverless para ingestar facturas PDF, responder con un `trackingId` en menos de 2 segundos y procesar la extraccion/validacion en background.

## Arquitectura resumida

`POST /uploads` entra por API Gateway HTTP API y dispara una Lambda de ingesta. La Lambda guarda el PDF cifrado en S3, crea un job en DynamoDB y publica en SQS. Una Lambda Processor consume la cola con concurrencia maxima 10 para respetar el limite de IA, invoca `AiMock`, valida dinero con centavos enteros y guarda la factura. Si queda `APPROVED`, publica en `ERPQueue`. `ErpDispatcher` consume con concurrencia 1 y batch 5, aplicando rate limit de 5 req/s antes de invocar `ErpMock`. El propio `ErpMock` refuerza el limite con un contador atomico en DynamoDB y responde `429` si se supera.

## Patrones de arquitectura

El MVP aplica explicitamente:

- Event-Driven Architecture: SQS desacopla ingesta, procesamiento y despacho ERP.
- Serverless / FaaS: API Gateway, Lambda, S3, SQS, DynamoDB y CloudWatch operan bajo demanda.
- Hexagonal Architecture / Ports & Adapters: dominio y casos de uso dependen de puertos, no de AWS.
- Pipes and Filters: el procesamiento sigue el pipeline ingesta -> almacenamiento -> IA mock -> validacion -> persistencia -> ERP.
- Event Sourcing parcial: `AuditLogTable` registra eventos append-only del ciclo de vida de la factura.

El detalle y los patrones descartados estan en [docs/architecture-patterns.md](docs/architecture-patterns.md).

## Prerequisitos

- Node.js 20+
- AWS CLI configurado
- AWS CDK v2
- k6 para pruebas de carga

No hay secretos hardcoded. Credenciales y secretos deben manejarse con variables de entorno locales, perfiles de AWS, IAM roles o AWS Secrets Manager cuando se conecte una IA/ERP real.

## Comandos

```bash
npm install
npm run lint
npm test
npm run build
npm run cdk:synth
```

## Despliegue

```bash
npm run deploy
```

El output `ApiUrl` entrega la URL publica de API Gateway.

## Pruebas

Unitarias:

```bash
npm test
```

Smoke test contra nube:

```bash
API_BASE_URL=https://... npm run smoke:test
```

Carga:

```bash
API_BASE_URL=https://... VUS=50 DURATION=3m npm run load:test
```

## Limpieza

```bash
npm run destroy
```

Si el bucket contiene PDFs, vaciarlo primero o aplicar una politica de lifecycle/retencion definida por negocio antes de destruir el stack.

## Evidencias para entrega

- Captura del output `ApiUrl`.
- Salida de `npm run lint`, `npm test`, `npm run build`, `npm run cdk:synth`.
- Respuesta `202` de `POST /uploads` con `trackingId`.
- CloudWatch Logs JSON con `trackingId`, `component`, `event`, `status`, `latencyMs`.
- Metricas de SQS mostrando `QueueDepth` durante carga.
- Logs de `AiMockLambda` mostrando latencias de 3 a 5 segundos.
- Logs de `ErpMockLambda` agregados por segundo mostrando maximo 5 req/s.
- Conteo de `APPROVED` y `REQUIRES_REVIEW` en DynamoDB/AuditLogTable.

## Grupo de Arquitectura

Valentina Calderon, Sebastian Nova & Santiago Jimenez

