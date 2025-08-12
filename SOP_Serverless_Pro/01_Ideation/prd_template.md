# Template — PRD (Product Requirements Document)

## 1. Visão
- **Objetivo** do produto e tese de valor.
- **Personas** principais (com dores e jobs).

## 2. Escopo e Não-Escopo (MVP)
- Funcionalidades mínimas para capturar valor.
- Itens excluídos do MVP e critérios para fases futuras.

## 3. Requisitos Funcionais (RF)
- RF-01 — ...
- RF-02 — ...

## 4. Requisitos Não Funcionais (NFRs)
- Desempenho: p95 rota crítica < 300 ms; cold start < 300 ms (com provisioned concurrency).
- Disponibilidade: SLO 99,9% mensal; erro budget 43 min/mês.
- Segurança: ASVS L2, MFA, chaveamento rotativo, logs auditáveis.
- Observabilidade: logs estruturados, métricas RED/USE, tracing distribuído.
- Custo: teto por MAU/tenant.

## 5. Dependências e Restrições
- Integrações externas, quotas de provedores, privacidade.

## 6. Métricas (North Star + AARRR)
- North Star: ...
- KPIs por etapa do funil.

## 7. Roadmap e Marcos
- Milestones, critérios de pronto, riscos e mitigação.
