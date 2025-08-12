# Qify - SDR Agent

Uma aplicação moderna de agente SDR (Sales Development Representative) que utiliza IA para automatizar conversas no WhatsApp seguindo a metodologia SPIN Selling.

## 🚀 Tecnologias

- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **UI**: shadcn/ui components com tema dark e glass morphism
- **Backend**: Convex para dados em tempo real e funções serverless
- **Autenticação**: Clerk com multi-tenancy baseado em organizações
- **IA**: Gemini 2.0 Flash para geração de respostas
- **WhatsApp**: Integration via Evolution API
- **Calendário**: Google Calendar OAuth para agendamento

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   WhatsApp      │────│   Evolution API  │────│   Webhook       │
│   Messages      │    │                  │    │   Handler       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                                         │
                                                         ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Dashboard     │────│   Next.js App   │────│   Convex DB     │
│   Interface     │    │                  │    │   & Functions   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
                                │                        │
                                ▼                        ▼
                       ┌──────────────────┐    ┌─────────────────┐
                       │   Clerk Auth     │    │   Gemini AI     │
                       │   (Multi-tenant) │    │   (SPIN Selling)│
                       └──────────────────┘    └─────────────────┘
```

## 🎯 Funcionalidades

### ✅ Implementado

- **Dashboard**: Visão geral com métricas e atividade recente
- **Inbox**: Interface de voz inspirada no JARVIS para resposta rápida
- **Sessões SPIN**: Acompanhamento do progresso nas 4 etapas (Situação, Problema, Implicação, Necessidade)
- **Webhook WhatsApp**: Processamento automático de mensagens via Evolution API
- **IA Integrada**: Geração de respostas usando Gemini 2.0 Flash
- **Multi-tenancy**: Organizações separadas com Clerk
- **Google Calendar**: OAuth e integração para agendamento
- **Interface Moderna**: Glass morphism, animações e tema dark

### 🚧 Em Desenvolvimento

- Configurações de prompts personalizados
- Analytics avançados e relatórios
- Integrações CRM (via n8n)
- Notificações em tempo real
- Sistema de aprovação de mensagens

## 🛠️ Setup

### 1. Pré-requisitos

```bash
Node.js 18+
npm ou yarn
Conta Clerk
Conta Convex
API Key do Gemini
Instância Evolution API
```

### 2. Instalação

```bash
# Clone o repositório
git clone <repo-url>
cd qify

# Instale dependências
npm install

# Configure variáveis de ambiente
cp .env.example .env.local
# Edite .env.local com suas credenciais
```

### 3. Configuração do Convex

```bash
# Faça login no Convex
npx convex login

# Crie um novo projeto ou use existente
npx convex init

# Deploy do schema e functions
npx convex dev
```

### 4. Configuração do Clerk

1. Crie uma aplicação no [Clerk Dashboard](https://dashboard.clerk.com)
2. Configure organizações (Organizations)
3. Adicione as chaves em `.env.local`

### 5. Evolution API

Configure sua instância Evolution API:

```bash
# Webhook URL para configurar na Evolution
http://localhost:3000/api/webhook/whatsapp?instanceId=wa-0001&token=your_shared_token

# Headers necessários (opcional)
X-Instance-Id: wa-0001
X-Webhook-Token: your_shared_token
```

### 6. Executar

```bash
# Desenvolvimento
npm run dev

# Acesse http://localhost:3000
```

## 🔧 Configuração Avançada

### WhatsApp (Evolution API)

1. Configure o webhook na Evolution API:
   - URL: `{your-domain}/api/webhook/whatsapp`
   - Method: POST
   - Events: message

2. Adicione uma conta WhatsApp no Convex:
```javascript
// No Convex dashboard, execute:
await db.insert("whatsapp_accounts", {
  orgId: "your_org_id",
  provider: "evolution",
  instanceId: "wa-0001",
  phoneNumber: "+5511999999999",
  sharedToken: "your_shared_token",
  baseUrl: "https://evolutionapi.centralsupernova.com.br",
  token: "509dbd54-c20c-4a5b-b889-a0494a861f5a",
  createdAt: Date.now()
});
```

### Google Calendar

1. Crie projeto no Google Cloud Console
2. Ative Calendar API
3. Configure OAuth 2.0 credentials
4. Adicione redirect URI: `{your-domain}/api/oauth/google/callback`

### Prompts SPIN

Os prompts seguem a metodologia SPIN Selling:

- **S**ituation: Entender a situação atual do prospect
- **P**roblem: Identificar problemas e dores
- **I**mplication: Explorar consequências dos problemas
- **N**eed-payoff: Ajudar o prospect a perceber o valor da solução

## 📊 Monitoramento

### Health Check

```bash
# Verificar saúde da aplicação
curl http://localhost:3000/api/health
```

### Logs

- Logs da aplicação: Console do Vercel/Next.js
- Logs do Convex: Dashboard do Convex
- Auditoria: Tabela `audit_logs` no Convex

## 🚀 Deploy

### Vercel (Recomendado)

```bash
# Conecte com Vercel
npx vercel

# Configure environment variables no dashboard
# Deploy
npx vercel --prod
```

### Variáveis de Ambiente (Produção)

Configure no Vercel dashboard:
- NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
- CLERK_SECRET_KEY
- NEXT_PUBLIC_CONVEX_URL
- GEMINI_API_KEY
- EVOLUTION_API_KEY
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET

## 📝 API

### Webhook Evolution

```bash
POST /api/webhook/whatsapp
Content-Type: application/json
X-Instance-Id: wa-0001
X-Webhook-Token: your_shared_token

{
  "event": "message",
  "data": {
    "key": { "id": "msg_id", "remoteJid": "5511999999999@s.whatsapp.net" },
    "message": { "conversation": "Olá, preciso de ajuda" },
    "pushName": "Cliente"
  }
}
```

### Health Check

```bash
GET /api/health

Response:
{
  "status": "healthy",
  "timestamp": "2025-01-01T12:00:00Z",
  "checks": {
    "convex": true,
    "clerk": true,
    "evolution": true,
    "gemini": true
  }
}
```

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

- 📧 Email: suporte@qify.com
- 💬 Discord: [Comunidade Qify](discord-link)
- 📖 Docs: [docs.qify.com](docs-link)

---

**Desenvolvido com ❤️ usando Next.js, Convex e Gemini AI**# qify-blackandwhite
