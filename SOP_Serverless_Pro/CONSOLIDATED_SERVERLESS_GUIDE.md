# Guia Completo — Desenvolvimento Serverless de Classe Mundial

## 📋 ÍNDICE
1. [SOP e Macrofluxo](#sop-e-macrofluxo)
2. [Ideação e Descoberta](#ideação-e-descoberta)
3. [Arquitetura e Design](#arquitetura-e-design)
4. [Implementação e Código](#implementação-e-código)
5. [Governança e Compliance](#governança-e-compliance)
6. [Checklists e Templates](#checklists-e-templates)

---

## 1. SOP E MACROFLUXO

### Objetivos
- Minimizar **time-to-value** sem comprometer qualidade ou segurança
- Maximizar **elasticidade e disponibilidade** com custos proporcionais ao uso
- Garantir **reprodutibilidade** via documentação, templates, IaC e checklists

### Macrofluxo
1. **Ideação e Descoberta** → hipóteses, PRD e requisitos (funcionais/NFRs)
2. **Arquitetura** → estilo (monolito serverless, event-driven, hexagonal), diagramas C4, decisões (ADRs), riscos
3. **Planejamento Técnico** → roadmap, marcos, critérios de pronto, capacidade
4. **Implementação** → estrutura de repositório, convenções de código, testes, CI/CD, migrações
5. **Segurança e Conformidade** → threat modeling, políticas de dados, IAM de menor privilégio
6. **Observabilidade** → logs, métricas RED/USE, traços distribuídos, SLOs/SLIs
7. **Operação** → runbooks, on-call, gestão de incidentes, postmortem, custo
8. **Evolução** → versionamento, RFCs, gestão de mudanças, depreciação segura

### Princípios Arquiteturais
- **Stateless por padrão**; estado em serviços gerenciados (DynamoDB/Firestore/Cosmos, S3/Blob/GCS)
- **Event-driven** como backbone (EventBridge/Event Grid/PubSub) e **Sagas** para consistência
- **Segurança por padrão** (Zero Trust, IAM granular, *least privilege*)
- **Automação total** (CI/CD, IaC, testes, lint, scans, provisioned concurrency)
- **Medibilidade**: tudo com métricas de produto e técnicas (DORA, AARRR)

---

## 2. IDEAÇÃO E DESCOBERTA

### Template PRD (Product Requirements Document)

#### 2.1 Visão
- **Objetivo** do produto e tese de valor
- **Personas** principais (com dores e jobs)

#### 2.2 Escopo e Não-Escopo (MVP)
- Funcionalidades mínimas para capturar valor
- Itens excluídos do MVP e critérios para fases futuras

#### 2.3 Requisitos Funcionais (RF)
- RF-01 — [Descrever funcionalidade]
- RF-02 — [Descrever funcionalidade]

#### 2.4 Requisitos Não Funcionais (NFRs)
- **Desempenho**: p95 rota crítica < 300 ms; cold start < 300 ms (com provisioned concurrency)
- **Disponibilidade**: SLO 99,9% mensal; erro budget 43 min/mês
- **Segurança**: ASVS L2, MFA, chaveamento rotativo, logs auditáveis
- **Observabilidade**: logs estruturados, métricas RED/USE, tracing distribuído
- **Custo**: teto por MAU/tenant

#### 2.5 Dependências e Restrições
- Integrações externas, quotas de provedores, privacidade

#### 2.6 Métricas (North Star + AARRR)
- **North Star**: [Métrica principal]
- **KPIs** por etapa do funil

#### 2.7 Roadmap e Marcos
- Milestones, critérios de pronto, riscos e mitigação

### Template SRS (Software Requirements Specification)

#### Requisitos de Sistema
- **Capacidade**: usuários simultâneos, throughput, armazenamento
- **Integração**: APIs externas, webhooks, formatos de dados
- **Plataforma**: cloud provider, regiões, compliance

#### Casos de Uso
- Fluxos principais e alternativos
- Condições de erro e recuperação
- Validações de entrada e saída

### Guia de Pesquisa com Usuários

#### Métodos de Descoberta
- **Entrevistas**: 1:1 com personas-chave
- **Surveys**: validação quantitativa de hipóteses
- **Analytics**: comportamento atual (se existir produto)
- **Competitor Analysis**: benchmarking de funcionalidades

#### Event Storming
1. **Domain Events**: o que acontece no negócio
2. **Commands**: ações que geram eventos
3. **Aggregates**: entidades que processam commands
4. **Bounded Contexts**: limites de responsabilidade

### Priorização
- **RICE**: Reach × Impact × Confidence ÷ Effort
- **MoSCoW**: Must have, Should have, Could have, Won't have
- **Kano Model**: básico, performance, delighters

---

## 3. ARQUITETURA E DESIGN

### Playbook Arquitetural Serverless

#### Estilos e Quando Usar
- **Monolito Serverless** (API + Fila + Tabelas): simplicidade, ótimo para MVP
- **Event-Driven** (EventBridge/Event Grid/PubSub): acoplamento fraco, escala independente
- **Hexagonal/Clean**: domínio no centro, adaptadores para Cloud (DB, mensageria, auth)
- **Microserviços**: somente com limites claros, equipes por serviço e *governança* madura

#### Padrões Essenciais
- **Sagas** (orquestração/coreografia), **Outbox/Inbox**, **Idempotência**, **Circuit Breaker**
- **CQRS** com materializações (streams do DB) quando leitura difere de escrita
- **Single Table Design** (NoSQL) ou **Schema evolutivo** (SQL) com *expand/migrate/contract*

### Design de APIs

#### REST Guidelines
- **Recursos** como substantivos, **verbos HTTP** para ações
- **Versionamento** via header (`Accept: application/vnd.api+json;version=1`)
- **Paginação** cursor-based para performance
- **Rate Limiting** por tenant/usuário
- **HATEOAS** para descoberta de recursos

#### GraphQL Guidelines
- **Schema-first**: definir schema antes da implementação
- **Resolvers** eficientes com DataLoader para N+1
- **Subscriptions** para real-time quando necessário
- **Depth limiting** para prevenir ataques

### Autenticação e Autorização

#### Padrões de AuthN/AuthZ
- **OAuth 2.0 + OIDC** para federação
- **JWT** com rotação de chaves (JWK)
- **RBAC** (Role-Based) ou **ABAC** (Attribute-Based)
- **Zero Trust**: verificar sempre, nunca confiar

#### Implementação Serverless
- **API Gateway** para validação de tokens
- **Lambda Authorizers** para lógica customizada
- **Cognito/Auth0/Clerk** para gestão de usuários
- **IAM Roles** com least privilege

### Multi-tenancy

#### Estratégias de Isolamento
- **Pool Model**: recursos compartilhados, isolamento lógico
- **Bridge Model**: híbrido, alguns recursos dedicados
- **Silo Model**: recursos completamente isolados

#### Implementação
- **Tenant ID** em todos os dados
- **Row-level security** no banco
- **API Gateway** com roteamento por tenant
- **Métricas** separadas por tenant

### Modelagem de Dados

#### DynamoDB
- **Single Table Design**: GSIs para access patterns
- **Partition Key** distribuído, **Sort Key** para queries
- **TTL** para dados temporários
- **Streams** para event sourcing

#### Cosmos DB / Firestore
- **Partition Key** por tenant ou domínio
- **Subcollections** para hierarquias
- **Composite indexes** para queries complexas
- **Change feeds** para reatividade

### Event-Driven Patterns

#### Messaging Patterns
- **Pub/Sub**: desacoplamento temporal
- **Request/Reply**: comunicação síncrona via async
- **Saga**: coordenação de transações distribuídas
- **Event Sourcing**: estado como sequência de eventos

#### Implementação
- **EventBridge/Event Grid** para roteamento
- **SQS/Service Bus** para filas confiáveis
- **Dead Letter Queues** para falhas
- **Idempotency keys** para exactly-once

### Resiliência

#### Padrões de Resiliência
- **Circuit Breaker**: falha rápida quando serviço está down
- **Retry** com backoff exponencial e jitter
- **Timeout** apropriado para cada operação
- **Bulkhead**: isolamento de recursos críticos

#### Cold Start Mitigation
- **Provisioned Concurrency** para funções críticas
- **Connection pooling** para databases
- **Lazy loading** de dependências pesadas
- **Warm-up** schedules para manter funções ativas

### Observabilidade

#### Três Pilares
- **Logs**: estruturados (JSON), com correlation IDs
- **Métricas**: RED (Rate, Errors, Duration) e USE (Utilization, Saturation, Errors)
- **Traces**: distribuído com OpenTelemetry

#### SLOs/SLIs
- **Availability**: % de requests bem-sucedidos
- **Latency**: p95/p99 de tempo de resposta
- **Throughput**: requests por segundo
- **Error Budget**: tempo permitido de indisponibilidade

### Gestão de Custos

#### Otimização
- **Right-sizing** de recursos
- **Reserved capacity** para workloads previsíveis
- **Spot instances** para processamento batch
- **Lifecycle policies** para armazenamento

#### Monitoramento
- **Cost allocation tags** por projeto/ambiente
- **Budgets** com alertas automáticos
- **Usage reports** regulares
- **FinOps** practices para governança

---

## 4. IMPLEMENTAÇÃO E CÓDIGO

### Estrutura de Repositório

```
project/
├── src/
│   ├── handlers/          # Lambda functions
│   ├── services/          # Business logic
│   ├── repositories/      # Data access
│   ├── models/           # Domain entities
│   └── utils/            # Shared utilities
├── infrastructure/       # IaC (CDK/Terraform)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── docs/                 # Architecture docs
└── scripts/              # Deployment scripts
```

### Padrões de Código Python

#### Formatação e Linting
- **black** para formatação automática
- **ruff** para linting rápido
- **mypy** para type checking (strict mode)
- **pre-commit** hooks para qualidade

#### Estrutura de Código
```python
# Domain entity
@dataclass
class User:
    id: str
    email: str
    created_at: datetime

# Repository interface
class UserRepository(Protocol):
    async def save(self, user: User) -> None: ...
    async def find_by_id(self, user_id: str) -> User | None: ...

# Service with dependency injection
class UserService:
    def __init__(self, repo: UserRepository):
        self._repo = repo
    
    async def create_user(self, email: str) -> User:
        user = User(id=uuid4().hex, email=email, created_at=datetime.utcnow())
        await self._repo.save(user)
        return user

# Lambda handler
async def handler(event, context):
    # Parse input
    body = json.loads(event['body'])
    
    # Initialize dependencies
    repo = DynamoUserRepository()
    service = UserService(repo)
    
    # Execute business logic
    user = await service.create_user(body['email'])
    
    # Return response
    return {
        'statusCode': 201,
        'body': json.dumps({'id': user.id})
    }
```

### Padrões de Código TypeScript

#### Configuração
```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "target": "ES2022",
    "module": "commonjs"
  }
}
```

#### Estrutura de Código
```typescript
// Domain types
interface User {
  id: string;
  email: string;
  createdAt: Date;
}

// Repository interface
interface UserRepository {
  save(user: User): Promise<void>;
  findById(id: string): Promise<User | null>;
}

// Service implementation
class UserService {
  constructor(private repo: UserRepository) {}
  
  async createUser(email: string): Promise<User> {
    const user: User = {
      id: crypto.randomUUID(),
      email,
      createdAt: new Date()
    };
    
    await this.repo.save(user);
    return user;
  }
}

// Lambda handler
export const handler = async (event: APIGatewayProxyEvent) => {
  const body = JSON.parse(event.body!);
  
  const repo = new DynamoUserRepository();
  const service = new UserService(repo);
  
  const user = await service.createUser(body.email);
  
  return {
    statusCode: 201,
    body: JSON.stringify({ id: user.id })
  };
};
```

### Estratégia de Testes

#### Pirâmide de Testes
- **Unit Tests** (70%): lógica de negócio isolada
- **Integration Tests** (20%): componentes integrados
- **E2E Tests** (10%): fluxos completos

#### Implementação
```python
# Unit test
def test_user_service_creates_user():
    # Arrange
    mock_repo = Mock(spec=UserRepository)
    service = UserService(mock_repo)
    
    # Act
    user = await service.create_user("test@example.com")
    
    # Assert
    assert user.email == "test@example.com"
    mock_repo.save.assert_called_once_with(user)

# Integration test
@pytest.mark.integration
async def test_user_repository_saves_to_dynamodb():
    repo = DynamoUserRepository()
    user = User(id="123", email="test@example.com", created_at=datetime.utcnow())
    
    await repo.save(user)
    
    saved_user = await repo.find_by_id("123")
    assert saved_user.email == "test@example.com"
```

### Migrações de Dados

#### Estratégia Expand/Migrate/Contract
1. **Expand**: adicionar nova estrutura mantendo a antiga
2. **Migrate**: migrar dados para nova estrutura
3. **Contract**: remover estrutura antiga

#### Implementação
```python
# Migration script
async def migrate_user_schema_v2():
    # Expand: add new field
    await add_column("users", "full_name", "VARCHAR")
    
    # Migrate: populate new field
    users = await get_all_users()
    for user in users:
        full_name = f"{user.first_name} {user.last_name}"
        await update_user(user.id, full_name=full_name)
    
    # Contract: remove old fields (in next release)
    # await drop_column("users", "first_name")
    # await drop_column("users", "last_name")
```

### Feature Flags

#### Implementação
```python
from feature_flags import FeatureFlags

flags = FeatureFlags()

async def handler(event, context):
    user_id = event['user_id']
    
    if await flags.is_enabled('new_algorithm', user_id):
        result = new_algorithm(event['data'])
    else:
        result = old_algorithm(event['data'])
    
    return result
```

### Logging Standards

#### Structured Logging
```python
import structlog

logger = structlog.get_logger()

async def process_order(order_id: str):
    logger.info("Processing order", order_id=order_id)
    
    try:
        # Process order
        logger.info("Order processed successfully", order_id=order_id)
    except Exception as e:
        logger.error("Order processing failed", 
                    order_id=order_id, 
                    error=str(e))
        raise
```

### CI/CD Pipeline

#### GitHub Actions
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          pip install -r requirements.txt
          pytest
  
  deploy:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to AWS
        run: |
          aws cloudformation deploy \
            --template-file template.yaml \
            --stack-name my-app
```

---

## 5. GOVERNANÇA E COMPLIANCE

### Template ADR (Architecture Decision Record)

#### Estrutura
- **Título**: Decisão tomada
- **Status**: Proposed / Accepted / Deprecated
- **Contexto**: Situação que motivou a decisão
- **Decisão**: O que foi decidido e por quê
- **Consequências**: Impactos positivos e negativos
- **Alternativas**: Opções consideradas e descartadas

#### Exemplo
```markdown
# ADR-001: Usar DynamoDB para armazenamento principal

## Status
Accepted

## Contexto
Precisamos de um banco de dados que suporte:
- Escala automática
- Baixa latência (<10ms)
- Modelo de pagamento por uso

## Decisão
Usar Amazon DynamoDB com Single Table Design

## Consequências
**Positivas:**
- Escala automática sem gerenciamento
- Latência consistente
- Custo proporcional ao uso

**Negativas:**
- Lock-in com AWS
- Curva de aprendizado para Single Table
- Queries complexas limitadas

## Alternativas
- PostgreSQL RDS: mais flexível, mas requer gerenciamento
- MongoDB Atlas: familiar, mas mais caro
```

### Gestão de Mudanças

#### Processo de RFC (Request for Comments)
1. **Proposta**: documento com problema e solução
2. **Discussão**: feedback da equipe e stakeholders
3. **Decisão**: aprovação ou rejeição com justificativa
4. **Implementação**: plano de execução e rollback

#### Template RFC
```markdown
# RFC-XXX: [Título]

## Resumo
Breve descrição da mudança proposta

## Motivação
Por que esta mudança é necessária?

## Proposta Detalhada
Como será implementada?

## Alternativas Consideradas
Outras opções avaliadas

## Impactos
- Usuários
- Sistemas
- Equipe
- Custos

## Plano de Implementação
Fases e cronograma

## Critérios de Sucesso
Como medir se foi bem-sucedida?
```

### Compliance LGPD/GDPR

#### Princípios
- **Lawfulness**: base legal para processamento
- **Purpose limitation**: dados para finalidade específica
- **Data minimization**: coletar apenas o necessário
- **Accuracy**: manter dados atualizados
- **Storage limitation**: reter apenas pelo tempo necessário
- **Security**: proteger contra acesso não autorizado

#### Implementação Técnica
```python
# Data retention policy
@dataclass
class DataRetentionPolicy:
    retention_days: int
    deletion_method: str  # "soft" or "hard"
    
# User consent management
class ConsentManager:
    async def record_consent(self, user_id: str, purpose: str):
        await self.consent_repo.save(Consent(
            user_id=user_id,
            purpose=purpose,
            granted_at=datetime.utcnow(),
            ip_address=get_client_ip()
        ))
    
    async def withdraw_consent(self, user_id: str, purpose: str):
        await self.consent_repo.withdraw(user_id, purpose)
        await self.trigger_data_deletion(user_id, purpose)
```

### Registro de Riscos

#### Template
| ID | Risco | Probabilidade | Impacto | Mitigação | Responsável | Status |
|----|-------|---------------|---------|-----------|-------------|---------|
| R001 | Cold start > 1s | Média | Alto | Provisioned concurrency | DevOps | Ativo |
| R002 | DynamoDB throttling | Baixa | Médio | Auto-scaling + alertas | Backend | Monitorado |

#### Categorias de Risco
- **Técnico**: performance, disponibilidade, segurança
- **Negócio**: prazo, orçamento, requisitos
- **Operacional**: equipe, processos, dependências
- **Compliance**: regulamentações, auditoria

---

## 6. CHECKLISTS E TEMPLATES

### Checklist de Kickoff

#### Preparação
- [ ] PRD aprovado por stakeholders
- [ ] Arquitetura revisada por tech leads
- [ ] Estimativas validadas pela equipe
- [ ] Repositório criado com estrutura padrão
- [ ] CI/CD pipeline configurado
- [ ] Ambientes de dev/staging provisionados

#### Definições
- [ ] Definition of Ready para stories
- [ ] Definition of Done para features
- [ ] Critérios de aceitação claros
- [ ] Plano de testes definido

### Checklist de Segurança

#### Autenticação/Autorização
- [ ] Tokens JWT com expiração adequada
- [ ] Rotação de chaves implementada
- [ ] Least privilege para IAM roles
- [ ] Rate limiting configurado

#### Dados
- [ ] Criptografia em trânsito (TLS 1.2+)
- [ ] Criptografia em repouso
- [ ] Backup com criptografia
- [ ] Logs não contêm dados sensíveis

#### Infraestrutura
- [ ] WAF configurado
- [ ] VPC com subnets privadas
- [ ] Security groups restritivos
- [ ] Vulnerability scanning automatizado

### Checklist de Observabilidade

#### Logs
- [ ] Structured logging (JSON)
- [ ] Correlation IDs em requests
- [ ] Log levels apropriados
- [ ] Retention policy definida

#### Métricas
- [ ] Business metrics (conversão, uso)
- [ ] Technical metrics (latência, erros)
- [ ] Infrastructure metrics (CPU, memória)
- [ ] Dashboards para cada audiência

#### Alertas
- [ ] SLO violations
- [ ] Error rate spikes
- [ ] Latency degradation
- [ ] Cost anomalies

### Checklist de Go-Live

#### Pré-Deploy
- [ ] Smoke tests passando
- [ ] Load tests executados
- [ ] Security scan limpo
- [ ] Rollback plan testado

#### Deploy
- [ ] Blue/green deployment
- [ ] Health checks configurados
- [ ] Monitoring ativo
- [ ] Alertas funcionando

#### Pós-Deploy
- [ ] Métricas de negócio monitoradas
- [ ] Performance dentro do SLO
- [ ] Logs sem erros críticos
- [ ] Feedback dos usuários coletado

### Template de Runbook

```markdown
# Runbook: [Sistema/Serviço]

## Visão Geral
Descrição do sistema e responsabilidades

## Arquitetura
Diagrama e componentes principais

## Operações Rotineiras
### Deploy
1. Executar pipeline CI/CD
2. Verificar health checks
3. Monitorar métricas por 30min

### Backup
- Frequência: diária às 2h UTC
- Retenção: 30 dias
- Localização: S3 bucket com versionamento

## Troubleshooting
### Alta Latência
**Sintomas:** p95 > 500ms
**Investigação:**
1. Verificar métricas de DynamoDB
2. Analisar logs de cold start
3. Checar throttling de APIs externas

**Resolução:**
1. Aumentar provisioned concurrency
2. Otimizar queries de banco
3. Implementar cache

### Erros 5xx
**Sintomas:** Error rate > 1%
**Investigação:**
1. Verificar logs de aplicação
2. Checar status de dependências
3. Analisar métricas de infraestrutura

## Contatos
- On-call: [Slack channel]
- Escalation: [Manager]
- Vendor support: [Links]
```

### Template de Postmortem

```markdown
# Postmortem: [Incidente]

## Resumo
- **Data:** 2024-01-15
- **Duração:** 45 minutos
- **Impacto:** 15% dos usuários afetados
- **Severidade:** P2

## Timeline
- 14:30 - Alerta de alta latência
- 14:35 - Investigação iniciada
- 14:45 - Causa identificada (DynamoDB throttling)
- 15:00 - Mitigação aplicada (aumentar capacity)
- 15:15 - Serviço normalizado

## Causa Raiz
Pico de tráfego inesperado causou throttling no DynamoDB

## Ações Corretivas
1. [ ] Implementar auto-scaling no DynamoDB
2. [ ] Adicionar alertas de throttling
3. [ ] Criar runbook para este cenário
4. [ ] Review de capacity planning

## Lições Aprendidas
- Monitoramento de throttling é essencial
- Auto-scaling previne este tipo de incidente
- Comunicação com usuários foi efetiva
```

### Templates de Contratos

#### OpenAPI Base
```yaml
openapi: 3.0.3
info:
  title: API Example
  version: 1.0.0
  description: API para gerenciamento de usuários

servers:
  - url: https://api.example.com/v1

paths:
  /users:
    get:
      summary: Listar usuários
      parameters:
        - name: limit
          in: query
          schema:
            type: integer
            default: 20
      responses:
        '200':
          description: Lista de usuários
          content:
            application/json:
              schema:
                type: object
                properties:
                  users:
                    type: array
                    items:
                      $ref: '#/components/schemas/User'

components:
  schemas:
    User:
      type: object
      required:
        - id
        - email
      properties:
        id:
          type: string
        email:
          type: string
          format: email
        createdAt:
          type: string
          format: date-time
```

#### GraphQL Schema Base
```graphql
type Query {
  user(id: ID!): User
  users(first: Int, after: String): UserConnection
}

type Mutation {
  createUser(input: CreateUserInput!): CreateUserPayload
  updateUser(id: ID!, input: UpdateUserInput!): UpdateUserPayload
}

type User {
  id: ID!
  email: String!
  createdAt: DateTime!
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
}

type UserEdge {
  node: User!
  cursor: String!
}

input CreateUserInput {
  email: String!
}

input UpdateUserInput {
  email: String
}

type CreateUserPayload {
  user: User
  errors: [Error!]
}
```

---

## 📚 REFERÊNCIAS E RECURSOS ADICIONAIS

### Documentação Oficial
- [AWS Well-Architected Framework](https://aws.amazon.com/architecture/well-architected/)
- [Azure Architecture Center](https://docs.microsoft.com/en-us/azure/architecture/)
- [Google Cloud Architecture Framework](https://cloud.google.com/architecture/framework)

### Livros Recomendados
- "Building Microservices" - Sam Newman
- "Designing Data-Intensive Applications" - Martin Kleppmann
- "Site Reliability Engineering" - Google SRE Team
- "Accelerate" - Nicole Forsgren, Jez Humble, Gene Kim

### Ferramentas e Frameworks
- **IaC**: AWS CDK, Terraform, Pulumi
- **Observability**: DataDog, New Relic, Grafana
- **Testing**: Jest, Pytest, Postman
- **Security**: OWASP ZAP, Snyk, SonarQube

---

*Este guia é um documento vivo e deve ser atualizado conforme novas práticas e tecnologias emergem.*