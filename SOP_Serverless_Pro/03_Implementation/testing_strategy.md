# Testes — Estratégia Completa

- **Unitários**: domínio puro (rápidos, determinísticos).
- **Integração**: adapters com dependências reais (Docker compose para DBs).
- **Contrato**: Pact/Schema para APIs e eventos.
- **E2E**: fluxos críticos (login, compra, CRUD principal).
- **Não Funcionais**: desempenho (k6/Artillery), segurança (ZAP), acessibilidade.
- **Cobertura**: enfoque por **risco** e **valor**; métricas não substituem julgamento.
