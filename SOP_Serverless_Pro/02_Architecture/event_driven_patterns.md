# Padrões Event-Driven

- **Sagas**: 
  - *Orquestradas* por Step Functions/Workflows (maior controle).
  - *Coreografadas* por eventos (menor acoplamento, maior complexidade emergente).
- **Outbox Pattern**: escrita atômica de evento + dado, com publicação assíncrona garantida.
- **Inbox/Idempotência**: dedup por chave e janela de tempo.
- **DLQ/Retries**: políticas de reentrega com *exponential backoff* e DLQ isolada.
- **Versionamento de eventos**: esquemas compatíveis (Avro/JSON Schema), *schema registry*.
