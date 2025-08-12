# Arquitetura de Referência — Serverless

## Camadas
- **Interface**: CDN/Edge + API Gateway + WebSockets quando necessário.
- **Compute**: Functions (Lambda/Functions/Cloud Functions) + Step Functions/Workflows.
- **Dados**: KV/NoSQL (DynamoDB/Firestore/Cosmos), blobs (S3/GCS/Blob), cache (Redis/MemoryStore).
- **Mensageria**: EventBridge/Event Grid/PubSub; filas (SQS/Queue/Tasks).
- **Identidade**: Cognito/B2C/IAP/Identity Platform; RBAC/ABAC, grupos/tenants.
- **Observabilidade**: CloudWatch/Log Analytics/Cloud Monitoring + X-Ray/OTel.

## Fluxos Típicos
- **HTTP**: API Gateway → Lambda (idempotente) → DB → eventos de domínio.
- **Assíncrono**: Evento → Regra → Função → Outbox → Downstream.
- **Orquestração**: Step Functions para fluxos de longa duração e compensação.

## Boas Práticas
- Funções **pequenas**, focadas; **tempo de execução** curto; **cold start** mitigado (runtime leve, provisioned concurrency).
- **Idempotency keys** e **deduplication** em toda escrita externa.
- **Least privilege** em IAM; **VPC somente quando necessário** (cuidado com latência).
