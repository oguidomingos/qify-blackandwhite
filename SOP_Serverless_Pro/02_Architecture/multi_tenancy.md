# Multi-Tenancy

- **Modelos**: 
  - **Silo** (recursos por tenant): isolamento forte, custo maior.
  - **Pool** (compartilhado com partição lógica): custo menor, requer isolamento por chave.
  - **Bridge** (híbrido): dados compartilhados e dados isolados por criticidade.
- **Isolamento**: por `tenantId` em chave de partição; criptografia por tenant opcional.
- **Limites e Quotas**: limites por tenant no gateway e nas funções, com *throttling* e billing interno.
- **Auditoria**: `tenantId` e `actorId` em cada log/evento.
