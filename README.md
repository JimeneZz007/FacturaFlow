# FacturaFlow MVP

## 1. Descripcion general

FacturaFlow es un MVP serverless para automatizar el procesamiento de facturas PDF de clientes corporativos. El sistema permite cargar o simular una factura, responder rapidamente con un `trackingId`, procesar el documento en background, validar matematicamente los valores financieros y consultar el estado final desde una interfaz web publica.

El flujo cubierto por el MVP incluye:

- ingesta de documento PDF;
- IA simulada o mock;
- validacion matematica con centavos enteros;
- almacenamiento de documentos y resultados;
- consulta de estado por `trackingId`;
- auditoria append-only de eventos;
- frontend publico desplegable.

## 2. Contexto del problema

El caso de negocio parte de un cliente corporativo que recibe miles de facturas diarias. El proceso manual actual es lento, propenso a errores y puede generar retrasos operativos. Por eso el MVP prioriza que el usuario no espere el procesamiento completo: `POST /uploads` debe responder en menos de 2 segundos con un `trackingId`, mientras el procesamiento ocurre de forma asincrona.

El proyecto tambien considera restricciones de costo y operacion: usar servicios serverless/free tier, evitar servidores permanentes, absorber picos de cierre de mes, respetar limites de concurrencia de una IA externa simulada y no superar el limite de 5 requests/s hacia el ERP mock. La trazabilidad es obligatoria para reconstruir el ciclo de vida de cada factura.

## 3. Alcance del MVP

Incluye:

- interfaz web funcional en `apps/web`;
- API publica con API Gateway HTTP API;
- `POST /uploads` para ingestar facturas;
- `GET /jobs/{trackingId}` para consultar estado, validacion, factura y eventos;
- almacenamiento de PDFs en S3 con cifrado server-side;
- cola SQS `ProcessingQueue` para procesamiento asincrono;
- Lambda `Processor` para orquestar IA mock, validacion y persistencia;
- IA mock con latencia artificial de 3 a 5 segundos;
- validacion matematica `subtotal + taxAmount == total`;
- DynamoDB `JobsTable`, `InvoicesTable` y `AuditLogTable`;
- cola `ERPQueue` y `ErpDispatcher` para facturas aprobadas;
- ERP mock con Rate Limiting de 5 req/s;
- pruebas unitarias y de aplicacion en `pruebas`;
- prueba de carga k6 en `pruebas-carga`;
- documentacion arquitectonica en `documentacion`.

No incluye todavia:

- IA real conectada a un proveedor externo;
- integracion ERP real;
- autenticacion/autorizacion de usuarios finales;
- dominio propio;
- HTTPS para el frontend S3 Website sin CloudFront;
- carga real de PDFs masivos en produccion;
- cumplimiento completo y probado de retencion legal de 5 anos;
- flujo completo de revision humana;
- envio SMTP real.

## 4. Arquitectura implementada

FacturaFlow implementa una arquitectura Serverless / FaaS y Event-Driven Architecture sobre AWS. El backend esta separado con Hexagonal Architecture / Ports & Adapters: dominio y casos de uso viven en `src/domain` y `src/application`, mientras AWS, repositorios, colas, HTTP clients y handlers Lambda viven en `src/infrastructure`.

El procesamiento se modela como Pipes and Filters:

```text
Usuario
-> Frontend publico
-> API Gateway
-> Lambda Ingest
-> S3 DocumentsBucket
-> DynamoDB JobsTable
-> SQS ProcessingQueue
-> Lambda Processor
-> Lambda AiMock
-> ValidateInvoiceUseCase
-> DynamoDB InvoicesTable
-> DynamoDB AuditLogTable
-> GET /jobs/{trackingId}
```

La auditoria se implementa como eventos append-only en `AuditLogTable`. No es CQRS completo, pero registra los eventos clave del ciclo de vida: `DOCUMENT_INGESTED`, `AI_EXTRACTION_STARTED`, `AI_EXTRACTION_COMPLETED`, `VALIDATION_COMPLETED`, `INVOICE_APPROVED`, `INVOICE_REQUIRES_REVIEW`, `STORED`, `ERP_DISPATCHED` y `ERP_DISPATCH_FAILED`.

Diagramas:

- `documentacion/diagramas/c4-contexto.puml`
- `documentacion/diagramas/c4-contenedores.puml`
- `documentacion/diagramas/componentes-validacion-orquestacion.puml`
- `documentacion/diagramas/despliegue-aws.puml`

## 5. Patrones y tacticas aplicadas

| Patron / tactica | Donde aparece | Atributo favorecido | Trade-off |
| --- | --- | --- | --- |
| Serverless / FaaS | API Gateway, Lambda, S3, SQS, DynamoDB, CloudWatch, S3 Website | Costo bajo, elasticidad y menor operacion | Limites gestionados por AWS, cold starts y cuotas por cuenta |
| Event-Driven Architecture | `ProcessingQueue`, `ERPQueue`, consumidores Lambda | Escalabilidad y resiliencia ante picos | Consistencia eventual |
| Hexagonal Architecture | `src/domain`, `src/application`, `src/infrastructure`, `Ports.ts` | Testabilidad y modificabilidad | Mas interfaces y ensamblaje manual |
| Pipes and Filters | `IngestDocumentUseCase`, `ProcessInvoiceUseCase`, `DispatchToErpUseCase` | Separacion de responsabilidades | Contexto distribuido por eventos y tablas |
| Bulkhead | `PROCESSOR_MAX_CONCURRENCY = 2` en `infra/facturaflow-stack.ts` | Disponibilidad de ingesta ante limites Lambda | Menor throughput inmediato de procesamiento |
| Rate Limiting | `DistributedFixedWindowRateLimiter`, `ErpRateLimitTable`, `ErpMock` | Proteccion del ERP mock | Posibles `429` si se excede el limite |
| Asincronismo | `POST /uploads` responde `202`; procesamiento por SQS | Baja latencia percibida | Resultado final no inmediato |
| Logs estructurados | `src/infrastructure/logging/Logger.ts` | Observabilidad y soporte operativo | Requiere consultas por `trackingId` |
| Cifrado en reposo | S3 `DocumentsBucket` con SSE S3 managed | Seguridad de documentos | KMS CMK queda como mejora futura |
| Auditoria append-only | `AuditLogTable` y `DynamoAuditLogRepository` | Trazabilidad | Escrituras adicionales por evento |
| Graceful Degradation | SQS absorbe picos y backlog | Continuidad de ingesta | La cola puede crecer durante estres |

## 6. Estructura del repositorio

```text
apps/web/                         Frontend React + TypeScript + Vite
config/tax-rules/                 Reglas tributarias por pais en JSON
documentacion/                    Documentacion academica principal
documentacion/decisiones-arquitectura/ ADRs
documentacion/diagramas/          Diagramas C4, componentes y despliegue
documentacion/evidencias/         Capturas y evidencias de ejecucion
documentacion/operacion/          CI/CD, observabilidad y FinOps
infra/                            AWS CDK v2
pruebas/                          Pruebas automatizadas con Vitest
pruebas-carga/                    Script k6 de carga
scripts/                          Smoke test
src/                              Dominio, aplicacion e infraestructura Lambda
```

Carpetas tecnicas relevantes:

- `src/domain`: entidades, dinero, fixtures, reglas fiscales y resultados de validacion.
- `src/application`: casos de uso, puertos, rate limiter y orquestacion.
- `src/infrastructure`: handlers Lambda, adapters AWS, repositorios, colas, logging y HTTP clients.

## 7. Requisitos previos

- Node.js 20+
- npm
- Git
- AWS CLI
- AWS CDK v2
- k6
- Cuenta AWS
- Perfil AWS configurado, por ejemplo `facturaflow`
- Presupuesto AWS recomendado para controlar costos
- Region usada en este MVP: `us-east-1`

Comandos de verificacion:

```powershell
node -v
npm -v
git --version
aws --version
cdk --version
k6 version
```

## 8. Variables de entorno

Variables usadas:

- `API_BASE_URL`: URL base de API Gateway para smoke test y k6.
- `VITE_API_BASE_URL`: URL base de API Gateway embebida en el build del frontend.
- `AWS_PROFILE`: perfil local de AWS CLI.
- `AWS_REGION`: region AWS preferida para CLI.
- `CDK_DEFAULT_ACCOUNT`: cuenta AWS usada por CDK.
- `CDK_DEFAULT_REGION`: region AWS usada por CDK.

Ejemplo PowerShell:

```powershell
$env:AWS_PROFILE="facturaflow"
$env:AWS_REGION="us-east-1"
$env:CDK_DEFAULT_REGION="us-east-1"
$env:CDK_DEFAULT_ACCOUNT = aws sts get-caller-identity --profile facturaflow --query Account --output text

$env:API_BASE_URL="https://uj49gx2rwi.execute-api.us-east-1.amazonaws.com"
$env:VITE_API_BASE_URL="https://uj49gx2rwi.execute-api.us-east-1.amazonaws.com"
```

No se deben guardar access keys, secret keys ni credenciales en el repositorio.

## 9. Instalacion

```powershell
npm install
```

## 10. Ejecucion local del frontend

Modo demo local sin AWS:

```powershell
npm run web:dev
```

Si `VITE_API_BASE_URL` no existe, la interfaz usa modo demo local y simula el flujo completo en memoria.

Modo API real local contra API Gateway:

```powershell
$env:VITE_API_BASE_URL="https://uj49gx2rwi.execute-api.us-east-1.amazonaws.com"
npm run web:dev
```

## 11. Build del frontend

```powershell
$env:VITE_API_BASE_URL="https://uj49gx2rwi.execute-api.us-east-1.amazonaws.com"
npm run web:build
```

El build se genera en `apps/web/dist` y CDK lo publica en el bucket S3 Website mediante `BucketDeployment`.

## 12. Validaciones locales

Comandos principales:

```powershell
npm run lint
npm test
npm run build
npm run web:build
npm run cdk:synth
```

Smoke test contra nube:

```powershell
$env:API_BASE_URL="https://uj49gx2rwi.execute-api.us-east-1.amazonaws.com"
npm run smoke:test
```

Prueba de carga controlada:

```powershell
$env:API_BASE_URL="https://uj49gx2rwi.execute-api.us-east-1.amazonaws.com"
$env:K6_VUS="5"
$env:K6_DURATION="30s"
npm run load:test
```

## 13. Despliegue en AWS

1. Configurar AWS CLI:

```powershell
aws configure --profile facturaflow
```

2. Definir variables:

```powershell
$env:AWS_PROFILE="facturaflow"
$env:AWS_REGION="us-east-1"
$env:CDK_DEFAULT_REGION="us-east-1"
$env:CDK_DEFAULT_ACCOUNT = aws sts get-caller-identity --profile facturaflow --query Account --output text
```

3. Ejecutar bootstrap CDK si la cuenta no esta bootstrappeada:

```powershell
npx cdk bootstrap aws://$env:CDK_DEFAULT_ACCOUNT/$env:CDK_DEFAULT_REGION --profile facturaflow
```

4. Construir frontend. En el primer despliegue todavia no existe `ApiUrl`; despues de obtenerla, reconstruir con `VITE_API_BASE_URL` para que la web quede conectada a la API real:

```powershell
$env:VITE_API_BASE_URL="https://uj49gx2rwi.execute-api.us-east-1.amazonaws.com"
npm run web:build
```

5. Desplegar:

```powershell
npx cdk deploy --profile facturaflow
```

En terminales no interactivas, CDK puede requerir confirmacion por cambios IAM. En ese caso se uso:

```powershell
npx cdk deploy --profile facturaflow --require-approval never
```

No ejecutar deploy si solo se esta revisando documentacion o pruebas locales.

## 14. URLs publicas del despliegue actual

`ApiUrl`:

```text
https://uj49gx2rwi.execute-api.us-east-1.amazonaws.com/
```

`WebUrl`:

```text
http://facturaflowstack-webbucket12880f5b-jkazxdsb00wx.s3-website-us-east-1.amazonaws.com
```

Notas:

- `ApiUrl` usa HTTPS porque lo entrega API Gateway.
- `WebUrl` usa HTTP porque el frontend esta publicado como S3 Static Website.
- CloudFront con HTTPS/custom domain queda como mejora recomendada; no esta implementado en este MVP.

## 15. Pruebas funcionales manuales

Payload base PowerShell:

```powershell
$env:API_BASE_URL="https://uj49gx2rwi.execute-api.us-east-1.amazonaws.com"
$pdf="JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwvVHlwZSAvQ2F0YWxvZz4+CmVuZG9iago="
```

`approved`:

```powershell
$body = @{
  fileName = "manual-approved.pdf"
  contentType = "application/pdf"
  contentBase64 = $pdf
  country = "CO"
  fixture = "approved"
} | ConvertTo-Json
Invoke-WebRequest -Method POST "$env:API_BASE_URL/uploads" -ContentType "application/json" -Body $body
```

`requires_review`:

```powershell
$body = @{
  fileName = "manual-requires-review.pdf"
  contentType = "application/pdf"
  contentBase64 = $pdf
  country = "CO"
  fixture = "requires_review"
} | ConvertTo-Json
Invoke-WebRequest -Method POST "$env:API_BASE_URL/uploads" -ContentType "application/json" -Body $body
```

`low_confidence`:

```powershell
$body = @{
  fileName = "manual-low-confidence.pdf"
  contentType = "application/pdf"
  contentBase64 = $pdf
  country = "CO"
  fixture = "low_confidence"
} | ConvertTo-Json
Invoke-WebRequest -Method POST "$env:API_BASE_URL/uploads" -ContentType "application/json" -Body $body
```

`math_error`:

```powershell
$body = @{
  fileName = "manual-math-error.pdf"
  contentType = "application/pdf"
  contentBase64 = $pdf
  country = "CO"
  fixture = "math_error"
} | ConvertTo-Json
Invoke-WebRequest -Method POST "$env:API_BASE_URL/uploads" -ContentType "application/json" -Body $body
```

`total_mismatch`:

```powershell
$body = @{
  fileName = "manual-total-mismatch.pdf"
  contentType = "application/pdf"
  contentBase64 = $pdf
  country = "CO"
  fixture = "total_mismatch"
} | ConvertTo-Json
Invoke-WebRequest -Method POST "$env:API_BASE_URL/uploads" -ContentType "application/json" -Body $body
```

Consultar estado:

```powershell
$trackingId="PEGAR_TRACKING_ID"
Invoke-WebRequest -Method GET "$env:API_BASE_URL/jobs/$trackingId"
```

Resultados esperados:

| Fixture | Resultado esperado |
| --- | --- |
| `approved` | `APPROVED` |
| `requires_review` | `REQUIRES_REVIEW` por baja confianza |
| `low_confidence` | `REQUIRES_REVIEW` por baja confianza |
| `math_error` | `REQUIRES_REVIEW` por `TOTAL_MISMATCH` |
| `total_mismatch` | `REQUIRES_REVIEW` por `TOTAL_MISMATCH` |

## 16. Pruebas de carga con k6

Prueba controlada recomendada:

```powershell
$env:API_BASE_URL="https://uj49gx2rwi.execute-api.us-east-1.amazonaws.com"
$env:DEBUG_FAILURES="false"
$env:K6_VUS="5"
$env:K6_DURATION="30s"
npm run load:test
```

Resultado observado documentado:

- 0% errores;
- 118 respuestas `202`;
- p95 menor a 2 segundos.

Prueba de estres:

```powershell
$env:API_BASE_URL="https://uj49gx2rwi.execute-api.us-east-1.amazonaws.com"
$env:DEBUG_FAILURES="true"
$env:K6_VUS="25"
$env:K6_DURATION="1m"
npm run load:test
```

Resultado observado documentado:

- 1,210 respuestas `202`;
- 43 respuestas `503`;
- 3.43% error;
- p95 menor a 2 segundos;
- causa: throttling de Lambda por limite de concurrencia de cuenta/free tier.

La prueba de 25 VUs se interpreta como prueba de estres para evidenciar limites operativos de la cuenta AWS, no como incumplimiento del MVP. Para estabilizar el camino productivo se configuro `PROCESSOR_MAX_CONCURRENCY = 2` en el event source mapping de `ProcessingQueue`.

## 17. Observabilidad

Donde revisar:

- CloudWatch Logs de Lambdas;
- metricas Lambda `Throttles`, `Errors` y `ConcurrentExecutions`;
- profundidad de SQS con `ApproximateNumberOfMessagesVisible`;
- tablas DynamoDB `JobsTable`, `InvoicesTable`, `AuditLogTable`;
- DLQs `ProcessingDlq` y `ErpDlq`.

Comandos utiles:

```powershell
aws logs describe-log-groups --profile facturaflow --region us-east-1
aws sqs list-queues --profile facturaflow --region us-east-1
```

Consultar atributos de una cola:

```powershell
$queueUrl="PEGAR_QUEUE_URL"
aws sqs get-queue-attributes `
  --queue-url $queueUrl `
  --attribute-names ApproximateNumberOfMessagesVisible ApproximateNumberOfMessagesNotVisible ApproximateNumberOfMessagesDelayed `
  --profile facturaflow `
  --region us-east-1
```

Consultar metricas CloudWatch:

```powershell
aws cloudwatch get-metric-statistics `
  --namespace AWS/Lambda `
  --metric-name Throttles `
  --dimensions Name=FunctionName,Value=PEGAR_NOMBRE_FISICO_DE_LAMBDA `
  --statistics Sum `
  --start-time 2026-05-06T00:00:00Z `
  --end-time 2026-05-07T00:00:00Z `
  --period 300 `
  --profile facturaflow `
  --region us-east-1
```

El nombre fisico exacto de las funciones puede incluir sufijos generados por CloudFormation; verificarlo en CloudWatch o con AWS CLI antes de ejecutar consultas especificas.

## 18. Limpieza de colas para demo

Despues de pruebas k6 puede quedar backlog en SQS. Revisar primero:

```powershell
$processingQueueUrl="PEGAR_PROCESSING_QUEUE_URL"
aws sqs get-queue-attributes `
  --queue-url $processingQueueUrl `
  --attribute-names ApproximateNumberOfMessagesVisible ApproximateNumberOfMessagesNotVisible `
  --profile facturaflow `
  --region us-east-1
```

Purgar `ProcessingQueue` antes de una demo:

```powershell
aws sqs purge-queue `
  --queue-url $processingQueueUrl `
  --profile facturaflow `
  --region us-east-1
```

Purgar una cola elimina trabajos pendientes de prueba. No debe hacerse en produccion real sin autorizacion operativa.

## 19. Evidencias del MVP

Carpeta real de evidencias:

```text
documentacion/evidencias/
```

| Evidencia | Archivo |
| --- | --- |
| Frontend publico | `documentacion/evidencias/01-web-publica.png.jpeg` |
| Frontend publico API real APPROVED | `documentacion/evidencias/01.5-frontend-publico-api-real-approved.png.jpeg` |
| Smoke test | `documentacion/evidencias/02-api-smoke-test.png.jpeg` |
| GET /jobs APPROVED | `documentacion/evidencias/03-get-job-approved.png.jpeg` |
| GET /jobs REQUIRES_REVIEW | `documentacion/evidencias/04-get-job-requires-review.png.jpeg` |
| DynamoDB Jobs | `documentacion/evidencias/05-dynamodb-jobs.png.jpeg` |
| DynamoDB Invoices | `documentacion/evidencias/06-dynamodb-invoices.png.jpeg` |
| DynamoDB AuditLog | `documentacion/evidencias/07-dynamodb-auditlog.png.jpeg` |
| CloudWatch DOCUMENT_INGESTED | `documentacion/evidencias/08-cloudwatch-document-ingested.png.jpeg` |
| k6 5 VUs exitoso | `documentacion/evidencias/09-k6-carga-5vus-exitosa.png.jpeg` |
| k6 25 VUs estres | `documentacion/evidencias/10-k6-estres-25vus-throttling.png.jpeg` |
| Outputs ApiUrl/WebUrl | `documentacion/evidencias/11-api-url-web-url-cdk-output.png.jpeg` |

## 20. Seguridad

- No se guardan secretos en el repositorio.
- Las credenciales deben manejarse con perfiles AWS, variables de entorno locales, IAM roles u OIDC en CI/CD.
- `DocumentsBucket` usa cifrado server-side gestionado por S3.
- API Gateway entrega HTTPS.
- El frontend S3 Static Website usa HTTP como limitacion conocida.
- La ingesta valida input con `zod`.
- Los logs son JSON estructurados.
- La auditoria es append-only a nivel de aplicacion en DynamoDB.

## 21. Costos y Free Tier

El MVP usa servicios serverless y pay-per-use:

- Lambda;
- API Gateway HTTP API;
- S3;
- SQS;
- DynamoDB `PAY_PER_REQUEST`;
- CloudWatch Logs.

Puede haber costos si se exceden limites free tier o si se dejan pruebas ejecutandose. Se recomienda crear AWS Budget, revisar CloudWatch Logs, limpiar colas de prueba, monitorear crecimiento de S3 y destruir el stack cuando ya no se necesite.

## 22. Destruccion de recursos

```powershell
npx cdk destroy --profile facturaflow
```

No destruir el stack antes de la sustentacion si el profesor debe abrir la URL publica.

## 23. Limitaciones conocidas

- La IA es mock, no IA real.
- El ERP es mock y tiene Rate Limiting simulado con DynamoDB.
- El frontend en S3 Static Website usa HTTP porque no hay CloudFront.
- No hay autenticacion/autorizacion para usuarios finales.
- No hay dominio propio.
- No hay multi-tenant real completo.
- El procesamiento puede quedar en cola si se ejecutan pruebas k6 masivas.
- La cuenta AWS puede presentar throttling por limites de concurrencia.
- La retencion legal de 5 anos esta disenada/documentada como necesidad futura, pero no validada por paso del tiempo.
- El envio SMTP no esta implementado.
- La prueba de 25 VUs fue una prueba de estres y mostro un limite operativo de la cuenta/free tier.

## 24. Decisiones arquitectonicas y documentacion

- Resultados QAW: `documentacion/resultados-qaw.md`
- Arbol de utilidad: `documentacion/arbol-utilidad.md`
- Patrones de arquitectura: `documentacion/patrones-arquitectura.md`
- Trade-offs: `documentacion/analisis-tradeoffs.md`
- ADR-001 Serverless/Event-Driven: `documentacion/decisiones-arquitectura/ADR-001-arquitectura-serverless-orientada-eventos.md`
- ADR-002 Colas y limites IA/ERP: `documentacion/decisiones-arquitectura/ADR-002-colas-limites-concurrencia-ia-erp.md`
- ADR-003 Seguridad/auditoria/almacenamiento: `documentacion/decisiones-arquitectura/ADR-003-seguridad-auditoria-almacenamiento.md`
- C4 Contexto: `documentacion/diagramas/c4-contexto.puml`
- C4 Contenedores: `documentacion/diagramas/c4-contenedores.puml`
- Componentes de validacion/orquestacion: `documentacion/diagramas/componentes-validacion-orquestacion.puml`
- Despliegue AWS: `documentacion/diagramas/despliegue-aws.puml`
- CI/CD: `documentacion/operacion/cicd.md`
- Observabilidad: `documentacion/operacion/observabilidad.md`
- FinOps: `documentacion/operacion/finops.md`
- Evidencias: `documentacion/evidencias/`

## 25. Estado final del proyecto

El proyecto demuestra:

- MVP desplegado en nube;
- frontend publico funcional;
- flujo asincrono basico funcional;
- IA mock con latencia artificial;
- validacion matematica exacta sin floats para dinero;
- almacenamiento en S3 y DynamoDB;
- auditoria append-only;
- pruebas automatizadas;
- pruebas de carga k6;
- observabilidad con CloudWatch, SQS y DynamoDB;
- documentacion arquitectonica para entrega academica.
