# SOP para Agente/LLM — Criação Determinística

1. **Coletar contexto** (JTBD, restrições, métricas).
2. **Gerar PRD draft** a partir do template, com NFRs quantificáveis.
3. **Produzir Event Storming textual** (eventos, comandos, políticas, agregados).
4. **Criar C4 (Mermaid)** para Context/Container/Component.
5. **Propor stack** via matriz (requisitos → stack) e emitir ADR-0001.
6. **Definir NFRs** finais, riscos e plano de mitigação.
7. **Instanciar repositório** conforme estrutura padrão.
8. **Gerar pipeline CI** (lint, test, build) e esqueleto IaC.
9. **Aplicar segurança**: IAM mínimo, secrets, WAF, rate limit.
10. **Observabilidade**: logs, métricas, tracing, SLOs e alertas.
11. **Runbooks** e **checklists** preenchidos.
12. **Go-live** com canário e rollback testado.
