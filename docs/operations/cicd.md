# CI/CD

## Estrategia

GitHub Actions valida cada pull request y push a `main` sin desplegar automaticamente. El despliegue queda manual/aprobado para evitar uso accidental de credenciales reales.

## Pipeline

1. Checkout.
2. Setup Node.js 20.
3. `npm ci`.
4. `npm run lint`.
5. `npm test`.
6. `npm run build`.
7. `npm run cdk:synth`.

## Deploy manual

Un operador con permisos AWS ejecuta:

```bash
npm run deploy
```

## DevSecOps

- Sin secretos hardcoded.
- Credenciales mediante IAM/OIDC, perfiles locales o Secrets Manager.
- IaC revisable en pull request.
- Validaciones automatizadas antes de aprobar despliegues.
- Logs y audit trail desde el primer MVP.
