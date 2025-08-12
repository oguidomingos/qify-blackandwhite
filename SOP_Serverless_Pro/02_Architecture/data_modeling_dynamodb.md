# Modelagem de Dados — DynamoDB (Single Table Design)

## Princípios
- Modelar **pelos acessos** (queries), não pelas entidades.
- **PK/SK** compostas com padrões de sufixo/prefixo (ex.: `ORG#{id}`, `USER#{id}`).
- **GSI** para acessos alternativos e agregações limitadas.
- **Streams** para materializações e integrações assíncronas.

## Exemplo de Itens
- `PK=ORG#123 | SK=PROFILE` → metadados da org.
- `PK=ORG#123 | SK=USER#777` → membro.
- `PK=ORG#123 | SK=SUBSCRIPTION` → plano e status.
- `GSI1PK=USER#777 | GSI1SK=ORG#123` → acesso por usuário.

## Anti-padrões
- *Hot partitions* (escolha ruim de chave), **scans** frequentes, campos altamente mutáveis em chaves.
