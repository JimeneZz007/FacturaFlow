# FinOps

## Estrategia de costo

- Usar servicios serverless y pay-per-use.
- DynamoDB en `PAY_PER_REQUEST` para evitar capacidad provisionada ociosa.
- SQS como buffer barato para absorber picos.
- Lambda con memoria inicial 256 MB y timeouts acotados.
- Retencion de logs de una semana para MVP.

## Controles

- Revisar costo por invocacion y duracion de Lambda.
- Monitorear crecimiento de S3 por PDFs de 2 a 5 MB.
- Configurar lifecycle de S3 para archival/retencion cuando negocio defina politica.
- Alertar si DLQ crece, porque puede representar reprocesamiento costoso.
- Evaluar KMS CMK solo si compliance lo exige, porque puede incrementar costo por request.
