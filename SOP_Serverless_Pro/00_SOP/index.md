# SOP — Desenvolvimento Serverless de Classe Mundial

Este SOP descreve, de ponta a ponta, como idear, projetar, implementar, operar e evoluir soluções **serverless** com padrões de engenharia no nível das melhores práticas globais. Serve como base replicável para qualquer domínio, com foco em **produtividade**, **segurança**, **resiliência**, **custo ótimo** e **observabilidade**.

## Objetivos
- Minimizar **time-to-value** sem comprometer qualidade ou segurança.
- Maximizar **elasticidade e disponibilidade** com custos proporcionais ao uso.
- Garantir **reprodutibilidade** via documentação, templates, infraestrutura como código e checklists.

## Macrofluxo
1. **Ideação e Descoberta** → hipóteses, PRD e requisitos (funcionais/NFRs).
2. **Arquitetura** → estilo (monolito serverless, event-driven, hexagonal), diagramas C4, decisões (ADRs), riscos.
3. **Planejamento Técnico** → roadmap, marcos, critérios de pronto, capacidade.
4. **Implementação** → estrutura de repositório, convenções de código, testes, CI/CD, migrações.
5. **Segurança e Conformidade** → threat modeling, políticas de dados, IAM de menor privilégio.
6. **Observabilidade** → logs, métricas RED/USE, traços distribuídos, SLOs/SLIs.
7. **Operação** → runbooks, on-call, gestão de incidentes, postmortem, custo.
8. **Evolução** → versionamento, RFCs, gestão de mudanças, depreciação segura.

## Princípios Arquiteturais
- **Stateless por padrão**; estado em serviços gerenciados (DynamoDB/Firestore/Cosmos, S3/Blob/GCS).
- **Event-driven** como backbone (EventBridge/Event Grid/PubSub) e **Sagas** para consistência.
- **Segurança por padrão** (Zero Trust, IAM granular, *least privilege*).
- **Automação total** (CI/CD, IaC, testes, lint, scans, provisioned concurrency).
- **Medibilidade**: tudo com métricas de produto e técnicas (DORA, AARRR).
