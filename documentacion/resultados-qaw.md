# Resultados QAW

## Requerimientos funcionales

- Ingestar facturas PDF mediante `POST /uploads`.
- Responder `202` con `trackingId` en menos de 2 segundos.
- Procesar extraccion IA simulada en background.
- Validar matematicamente `subtotal + taxAmount == total`.
- Guardar facturas como `APPROVED` o `REQUIRES_REVIEW`.
- Despachar al ERP mock solo facturas aprobadas.
- Registrar eventos importantes en audit log append-only.

## Restricciones tecnicas

- Node.js + TypeScript.
- AWS CDK v2.
- Lambda, API Gateway HTTP API, S3, SQS, DynamoDB, CloudWatch Logs.
- Arquitectura serverless/free tier; sin EC2, VMs, Kubernetes ni contenedores siempre encendidos.
- IA mock con 3 a 5 segundos de latencia.
- Maximo 10 peticiones concurrentes a IA.
- Maximo 5 peticiones por segundo a ERP.

## Restricciones de negocio

- MVP productivo en 12 semanas.
- Cliente piloto con cerca de 3,300 facturas diarias.
- PDFs de 2 a 5 MB.
- Debe absorber picos de cierre de mes y cargas por lote.
- Debe reducir espera manual, errores humanos y retrasos operativos.

## Interesados

- Operaciones del cliente piloto.
- Equipo financiero/contable.
- Equipo de producto FacturaFlow.
- Equipo cloud/platform.
- Seguridad/compliance.
- Integradores ERP.

## Drivers arquitectonicos

- Latencia baja de ingesta.
- Escalabilidad elastica con control de concurrencia.
- Seguridad de documentos.
- Trazabilidad end-to-end.
- Costo bajo de MVP.
- Separacion de dominio para evolucionar reglas tributarias por pais.
