# Design de API — REST/GraphQL

## REST
- Recursos, verbos corretos, códigos HTTP, paginação e *rate limit headers*.
- **Idempotency-Key** para operações que podem repetir.
- **OpenAPI 3.1**: schemas, exemplos, *error model* consistente.

## GraphQL
- Schema versionado; diretivas; limites de profundidade/complexidade.
- **Persisted queries**; **Bounded resolvers** (timeouts, cache, batched fetch).
- **Autorização** por campo (se necessário) via *directives*.

## Contratos
- **Contract testing** (Pact/Schema) entre produtor/consumidor; build quebra se contrato quebrar.
