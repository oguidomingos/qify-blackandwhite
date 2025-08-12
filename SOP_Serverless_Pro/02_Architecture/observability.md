# Observabilidade (Logs, Métricas, Tracing)

- **Logs**: JSON com `trace_id`, `span_id`, `tenantId`, `actorId`; sem PII em claro.
- **Métricas**: RED (Rate, Errors, Duration) + USE (Utilization, Saturation, Errors).
- **Tracing**: OpenTelemetry do front ao DB; amostragem adaptativa.
- **SLOs/SLIs**: negociação explícita e alertas calibrados por erro budget.
