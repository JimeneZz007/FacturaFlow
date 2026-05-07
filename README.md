# FacturaFlow MVP

FacturaFlow es un MVP B2B serverless para ingestar facturas PDF, responder con un `trackingId` en menos de 2 segundos y procesar la extraccion/validacion en background.

## Arquitectura resumida

`POST /uploads` entra por API Gateway HTTP API y dispara una Lambda de ingesta. La Lambda guarda el PDF cifrado en S3, crea un job en DynamoDB y publica en SQS. Una Lambda Processor consume la cola con `PROCESSOR_MAX_CONCURRENCY = 2` desde el event source mapping para respetar el limite de IA y proteger la cuota Lambda de cuentas nuevas/free tier. Processor invoca `AiMock`, valida dinero con centavos enteros y guarda la factura. Si queda `APPROVED`, publica en `ERPQueue`. `ErpDispatcher` consume lotes de hasta 5 mensajes y aplica rate limit de 5 req/s antes de invocar `ErpMock`. El propio `ErpMock` refuerza el limite con un contador atomico en DynamoDB y responde `429` si se supera.

La interfaz web vive en `apps/web` y se despliega como sitio estatico en S3. Puede operar en modo demo local sin AWS o en modo API real usando `VITE_API_BASE_URL`.

El limite academico de IA es 10 documentos concurrentes, pero el MVP usa `maxConcurrency: 2` en `ProcessingQueue` -> Processor como Bulkhead operativo porque es el minimo soportado por Lambda SQS event source maximum concurrency. Ese valor sigue estando por debajo del limite de IA, evita saturar la cuota compartida de Lambda durante los 3 a 5 segundos de AiMock y deja que SQS absorba picos con degradacion graceful. No se reserva concurrencia directamente en Lambda porque `reservedConcurrentExecutions` puede fallar en cuentas AWS nuevas si reduce la concurrencia no reservada por debajo del minimo permitido.

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
npm run web:build
npm run cdk:synth
```

## Web local

Modo demo local sin AWS:

```bash
npm run web:dev
```

Abre la URL local que imprime Vite y procesa una factura demo. Si no existe `VITE_API_BASE_URL`, la interfaz simula en memoria la ingesta, IA mock, validacion, almacenamiento y timeline.

Modo API real contra API Gateway:

```bash
VITE_API_BASE_URL=https://... npm run web:dev
```

En Windows PowerShell:

```powershell
$env:VITE_API_BASE_URL="https://..."
npm run web:dev
```

Para generar el build estatico:

```bash
npm run web:build
```

## Despliegue

Primer despliegue para crear API y hosting web:

```bash
npm run web:build
npm run deploy
```

Los outputs entregan:

- `ApiUrl`: URL publica de API Gateway.
- `WebUrl`: URL publica del sitio estatico S3.

Para que la web desplegada use la API real, reconstruye el frontend con el `ApiUrl` y vuelve a desplegar los assets:

```bash
VITE_API_BASE_URL=https://... npm run web:build
npm run deploy
```

En Windows PowerShell:

```powershell
$env:VITE_API_BASE_URL="https://..."
npm run web:build
npm run deploy
```

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
- Captura del output `WebUrl`.
- Carga de factura desde navegador.
- `trackingId` visible en la interfaz.
- Timeline con `DOCUMENT_INGESTED`, `AI_EXTRACTION_STARTED`, `AI_EXTRACTION_COMPLETED`, `VALIDATION_COMPLETED`, `INVOICE_APPROVED` o `INVOICE_REQUIRES_REVIEW`, y `STORED`.
- Estado final visual `APPROVED` o `REQUIRES_REVIEW`.
- Salida de `npm run lint`, `npm test`, `npm run build`, `npm run cdk:synth`.
- Respuesta `202` de `POST /uploads` con `trackingId`.
- Consulta `GET /jobs/{trackingId}` con estado, factura, validacion y eventos.
- CloudWatch Logs JSON con `trackingId`, `component`, `event`, `status`, `latencyMs`.
- Metricas de SQS mostrando `ApproximateNumberOfMessagesVisible` durante carga.
- Metricas Lambda `Throttles` y `ConcurrentExecutions` para `Ingest`, `Processor` y `AiMock`.
- Logs de `AiMockLambda` mostrando latencias de 3 a 5 segundos.
- Logs de `ErpMockLambda` agregados por segundo mostrando maximo 5 req/s.
- Conteo de `APPROVED` y `REQUIRES_REVIEW` en DynamoDB/AuditLogTable.

## Grupo de Arquitectura

Valentina Calderon, Sebastian Nova & Santiago Jimenez
