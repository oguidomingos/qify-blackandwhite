# Estrutura de Repositório (Serverless)

```
/docs/                  # Diátaxis: tutoriais, how-to, explicações, referência
/infra/                 # IaC (Terraform, SAM/CDK, Serverless Framework)
/src/
  app/                  # UI/edge/BFF
  domain/               # casos de uso e entidades (puro)
  adapters/             # DB, fila, cache, auth (ports/adapters)
  interfaces/           # handlers (HTTP/event), resolvers, workers
  shared/               # tipos, validações, utilitários
/tests/
  unit/ integration/ contract/ e2e/
```

- **Domínio** independente; **adapters** finos para provedores.
- **Handlers** magros: validação → caso de uso → resposta.
