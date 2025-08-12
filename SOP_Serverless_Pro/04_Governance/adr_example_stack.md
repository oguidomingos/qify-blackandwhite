# ADR-0001 — Stack Serverless Base
**Status**: Accepted
**Contexto**: Time pequeno, necessidade de real-time, custo proporcional ao uso.
**Decisão**: Front Next.js em edge; API serverless; NoSQL; event bus; identidade gerenciada.
**Consequências**: Time-to-market alto; lock-in mitigado por portas/adapters; custos elásticos.
