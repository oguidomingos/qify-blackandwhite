# Resiliência e Modos Degradados

- **Timeouts** agressivos e **retries** com *jitter*.
- **Bulkheads** (isolamento por pool/tenancy) e **circuit breakers**.
- **Read-only mode** quando dependências críticas caem.
- **DLQ** para recuperar mensagens; **replay** controlado.
