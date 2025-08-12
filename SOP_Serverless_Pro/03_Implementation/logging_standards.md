# Padrões de Logging

- JSON estruturado; campos obrigatórios: `ts`, `level`, `service`, `trace_id`, `span_id`, `tenantId`, `actorId`.
- **Sem PII em claro**; mascaramento; *data minimization*.
- Níveis consistentes (info/warn/error) e códigos de erro.
