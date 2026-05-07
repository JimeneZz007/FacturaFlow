# FacturaFlow MVP - Instrucciones para Codex

## Objetivo
Construir un MVP desplegable en AWS Serverless para procesar facturas de forma asincrona:
ingesta de documento, paso por IA mock, validacion matematica, almacenamiento, trazabilidad,
observabilidad y pruebas de carga.

## Reglas obligatorias
- No construir un monolito.
- No usar EC2, servidores permanentes ni contenedores siempre encendidos.
- Usar infraestructura como codigo con AWS CDK.
- Usar TypeScript.
- Mantener arquitectura Event-Driven con API Gateway, Lambda, S3, SQS y DynamoDB.
- Todo PDF debe almacenarse en S3 con cifrado server-side.
- El endpoint de ingesta debe responder con trackingId en menos de 2 segundos.
- El procesamiento debe ser asincrono.
- El mock de IA debe tardar artificialmente entre 3 y 5 segundos.
- La IA mock no puede recibir mas de 10 solicitudes concurrentes.
- El ERP mock no puede recibir mas de 5 solicitudes por segundo.
- La logica matematica debe usar enteros en centavos o decimal exacto; no usar floats para dinero.
- La regla de aprobacion es:
  - confidence > 0.85
  - subtotal + taxAmount == total
  - si cumple: estado APPROVED
  - si no cumple: estado REQUIRES_REVIEW
- Las reglas tributarias por pais deben estar en archivos de configuracion, no hardcoded.
- El codigo debe separar dominio, aplicacion e infraestructura.
- No guardar secretos en el repositorio.
- Incluir README con pasos de instalacion, pruebas, despliegue y destruccion.
- Incluir pruebas unitarias, integracion basica y script k6 de carga.
- Incluir documentacion de arquitectura en documentacion/.

## Entregables que el repositorio debe contener
- documentacion/resultados-qaw.md
- documentacion/arbol-utilidad.md
- documentacion/analisis-tradeoffs.md
- documentacion/patrones-arquitectura.md
- documentacion/decisiones-arquitectura/ADR-001-arquitectura-serverless-orientada-eventos.md
- documentacion/decisiones-arquitectura/ADR-002-colas-limites-concurrencia-ia-erp.md
- documentacion/decisiones-arquitectura/ADR-003-seguridad-auditoria-almacenamiento.md
- documentacion/diagramas/c4-contexto.puml
- documentacion/diagramas/c4-contenedores.puml
- documentacion/diagramas/componentes-validacion-orquestacion.puml
- documentacion/diagramas/despliegue-aws.puml
- documentacion/operacion/cicd.md
- documentacion/operacion/observabilidad.md
- documentacion/operacion/finops.md
- infra/ con AWS CDK
- src/ con Lambdas y dominio
- pruebas/ con pruebas
- pruebas-carga/ con k6
- README.md completo

## Calidad esperada
Antes de terminar, ejecutar:
- npm install
- npm run lint
- npm test
- npm run build
- npm run cdk:synth

No finalizar con errores conocidos.
