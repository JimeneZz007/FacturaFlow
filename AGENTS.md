# FacturaFlow MVP - Instrucciones para Codex

## Objetivo
Construir un MVP desplegable en AWS Serverless para procesar facturas de forma asíncrona:
ingesta de documento, paso por IA mock, validación matemática, almacenamiento, trazabilidad,
observabilidad y pruebas de carga.

## Reglas obligatorias
- No construir un monolito.
- No usar EC2, servidores permanentes ni contenedores siempre encendidos.
- Usar infraestructura como código con AWS CDK.
- Usar TypeScript.
- Mantener arquitectura event-driven con API Gateway, Lambda, S3, SQS y DynamoDB.
- Todo PDF debe almacenarse en S3 con cifrado server-side.
- El endpoint de ingesta debe responder con trackingId en menos de 2 segundos.
- El procesamiento debe ser asíncrono.
- El mock de IA debe tardar artificialmente entre 3 y 5 segundos.
- La IA mock no puede recibir más de 10 solicitudes concurrentes.
- El ERP mock no puede recibir más de 5 solicitudes por segundo.
- La lógica matemática debe usar enteros en centavos o decimal exacto; no usar floats para dinero.
- La regla de aprobación es:
  - confidence > 0.85
  - subtotal + taxAmount == total
  - si cumple: estado APPROVED
  - si no cumple: estado REQUIRES_REVIEW
- Las reglas tributarias por país deben estar en archivos de configuración, no hardcoded.
- El código debe separar dominio, aplicación e infraestructura.
- No guardar secretos en el repositorio.
- Incluir README con pasos de instalación, pruebas, despliegue y destrucción.
- Incluir pruebas unitarias, integración básica y script k6 de carga.
- Incluir documentación de arquitectura en docs/.

## Entregables que el repositorio debe contener
- docs/qaw-results.md
- docs/utility-tree.md
- docs/tradeoffs.md
- docs/adr/ADR-001-serverless-event-driven.md
- docs/adr/ADR-002-queue-rate-limits-ai-erp.md
- docs/adr/ADR-003-security-audit-storage.md
- docs/diagrams/c4-context.puml
- docs/diagrams/c4-container.puml
- docs/diagrams/components-validation-orchestration.puml
- docs/diagrams/deployment-aws.puml
- docs/operations/cicd.md
- docs/operations/observability.md
- docs/operations/finops.md
- infra/ con AWS CDK
- src/ con Lambdas y dominio
- test/ con pruebas
- load-tests/ con k6
- README.md completo

## Calidad esperada
Antes de terminar, ejecutar:
- npm install
- npm run lint
- npm test
- npm run build
- npm run cdk:synth

No finalizar con errores conocidos.