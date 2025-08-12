# Playbook Arquitetural Serverless

## Estilos e Quando Usar
- **Monolito Serverless** (API + Fila + Tabelas): simplicidade, ótimo para MVP.
- **Event-Driven** (EventBridge/Event Grid/PubSub): acoplamento fraco, escala independente.
- **Hexagonal/Clean**: domínio no centro, adaptadores para Cloud (DB, mensageria, auth).
- **Microserviços**: somente com limites claros, equipes por serviço e *governança* madura.

## Padrões Essenciais
- **Sagas** (orquestração/coreografia), **Outbox/Inbox**, **Idempotência**, **Circuit Breaker**.
- **CQRS** com materializações (streams do DB) quando leitura difere de escrita.
- **Single Table Design** (NoSQL) ou **Schema evolutivo** (SQL) com *expand/migrate/contract*.

## Decisões (ADRs)
- Registre trade-offs (latência × custo × lock-in), plano de mitigação e reversibilidade.
