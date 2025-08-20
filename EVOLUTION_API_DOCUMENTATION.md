# 📋 Evolution API - Documentação Técnica Completa

## 🎯 **Visão Geral**

Sistema Qify integrado com Evolution API para WhatsApp Business. **Zero dados mock** - apenas dados reais ou erros transparentes.

### **Status Atual**
- ✅ **30+ contatos reais** do WhatsApp Business
- ✅ **Conversas reais** com Tárik Sedenho, Felipe, Guigodomingos Iceberg Marketing
- ✅ **713 mensagens reais** processadas e analisadas
- ✅ **Análise SPIN** baseada em conversações verdadeiras
- ✅ **Webhook funcional** para processamento automático

---

## 🔗 **APIs Evolution Implementadas**

### **1. `/api/evolution/contacts` - Contatos WhatsApp**

**Função:** Lista todos os contatos reais da Evolution API  
**Método:** `GET`  
**Parâmetros:** `?limit=50`

**Resposta de Sucesso:**
```json
{
  "success": true,
  "contacts": [
    {
      "_id": "cmedt3y9i0iaro85htcm6o0ly",
      "name": "Guigodomingos Iceberg Marketing",
      "channel": "whatsapp",
      "externalId": "5561936180578@s.whatsapp.net",
      "phoneNumber": "5561936180578",
      "profilePicUrl": "https://pps.whatsapp.net/...",
      "lastMessageAt": 1755652082052,
      "createdAt": 1755321516339,
      "isActive": true
    }
  ],
  "total": 30,
  "fallback": false,
  "source": "evolution_api_real"
}
```

**Resposta de Erro:**
```json
{
  "success": false,
  "contacts": [],
  "total": 0,
  "error": "Evolution API indisponível",
  "message": "Evolution API indisponível - Verifique conexão com o WhatsApp"
}
```

---

### **2. `/api/evolution/chats` - Conversas Ativas**

**Função:** Busca conversas/chats ativos do WhatsApp  
**Método:** `GET`  
**Parâmetros:** `?period=week&activeOnly=true&limit=50`

**Resposta de Sucesso:**
```json
{
  "success": true,
  "chats": [
    {
      "_id": "cmehhwnwk0m3wo85h259oja22",
      "contactId": "556181501115@s.whatsapp.net",
      "contactName": "Tárik Sedenho",
      "channel": "whatsapp",
      "unreadCount": 0,
      "lastMessage": {
        "text": "A estratégia correta pra criar as coisas certas...",
        "timestamp": 1755551223000,
        "direction": "inbound"
      },
      "isActive": false,
      "lastActivityAt": 1755551223000
    }
  ],
  "statistics": {
    "total": 3,
    "active": 0,
    "unread": 0,
    "totalUnreadMessages": 0
  },
  "fallback": false
}
```

---

### **3. `/api/evolution/messages` - Mensagens Reais**

**Função:** Busca mensagens com parsing correto da Evolution API  
**Método:** `GET`  
**Parâmetros:** `?period=week&limit=200&contactId=opcional`

**⚡ Correção Crítica:** Evolution API retorna formato `{messages: {records: [...]}}` - sistema detecta automaticamente.

**Resposta de Sucesso:**
```json
{
  "success": true,
  "messages": [
    {
      "_id": "3EB09EDEDB11507660EDD14E51E024F0B59D9C18",
      "contactId": "556181501115@s.whatsapp.net",
      "direction": "outbound",
      "text": "Entendi, Tárik. Se você já tem essa visão de replicar o que funciona...",
      "messageType": "text",
      "createdAt": 1755551223000,
      "senderName": "556181501115"
    }
  ],
  "statistics": {
    "total": 2,
    "inbound": 1,
    "outbound": 1,
    "uniqueContacts": 1
  },
  "fallback": false
}
```

---

### **4. `/api/evolution/spin-analysis` - Análise SPIN Real**

**Função:** Análise de vendas SPIN baseada em mensagens reais  
**Método:** `GET`  
**Parâmetros:** `?period=week&contactId=opcional`

**Metodologia SPIN:**
- **S (Situation):** Perguntas sobre situação atual - "olá", "trabalham com", "empresa"
- **P (Problem):** Identificação de problemas - "problema", "dificuldade", "não funciona"  
- **I (Implication):** Consequências dos problemas - "se não resolver", "impacto", "prejuízo"
- **N (Need-Payoff):** Interesse em soluções - "quanto custa", "como funciona", "benefício"

**Resposta de Sucesso:**
```json
{
  "success": true,
  "sessions": [
    {
      "contactId": "556181501115@s.whatsapp.net",
      "contactName": "556181501115",
      "currentStage": "S",
      "score": 50,
      "stageProgression": [],
      "lastActivity": 1755551223000,
      "totalMessages": 20,
      "qualified": false,
      "summary": "Contato em estágio S"
    }
  ],
  "statistics": {
    "totalSessions": 3,
    "qualified": 0,
    "stageDistribution": {"S": 3, "P": 0, "I": 0, "N": 0},
    "averageScore": 45
  }
}
```

---

### **5. `/api/evolution/instance-stats` - Status da Instância**

**Função:** Estatísticas gerais da instância WhatsApp  
**Método:** `GET`  

**Resposta de Sucesso:**
```json
{
  "totalMessages": 713,
  "totalContacts": 22,
  "totalChats": 10,
  "instanceStatus": "open",
  "instanceName": "qify-5561999449983",
  "phoneNumber": "556199449983@s.whatsapp.net",
  "profileName": "RoiGem",
  "lastUpdate": "2025-08-20T13:54:20.256Z",
  "fallback": false
}
```

---

## 🎯 **Lógica de Negócio - Dashboard**

### **Contatos Pendentes (Atividade Recente)**

**Condicionais para aparecer:**
```typescript
// Contato aparece como "pendente" quando:
1. Teve atividade nas últimas 24h (lastActivityAt)
2. OU tem mensagens não lidas (unreadCount > 0)  
3. OU está em sessão SPIN ativa (currentStage !== 'completed')

// Ordem de prioridade:
1. Não lidas primeiro (unreadCount DESC)
2. Atividade mais recente (lastActivityAt DESC)
3. Score SPIN mais alto (score DESC)
```

**Código de Exemplo:**
```typescript
const pendingContacts = chats
  .filter(chat => {
    const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
    return chat.lastActivityAt >= dayAgo || 
           chat.unreadCount > 0 ||
           chat.isActive;
  })
  .sort((a, b) => {
    // Prioridade: não lidas > atividade recente > score
    if (a.unreadCount !== b.unreadCount) 
      return b.unreadCount - a.unreadCount;
    return b.lastActivityAt - a.lastActivityAt;
  });
```

### **Classificação SPIN**

**Algoritmo de Classificação:**
```typescript
// Análise de cada mensagem por palavras-chave:
const SPIN_PATTERNS = {
  S: ['olá', 'empresa', 'trabalho', 'somos da'],
  P: ['problema', 'dificuldade', 'não funciona', 'não consegue'],
  I: ['se não resolver', 'impacto', 'prejudica', 'vai piorar'],
  N: ['quanto custa', 'como funciona', 'benefício', 'solução']
};

// Progressão: S → P → I → N (apenas progressões válidas)
// Score calculation:
let score = 30; // Base score
if (stageReached.S) score += 10;
if (stageReached.P) score += 20; 
if (stageReached.I) score += 25;
if (stageReached.N) score += 35;

// Qualificado quando: score >= 70 && currentStage === 'N'
```

**Estados de Qualificação:**
- **0-40:** Inicial (badge cinza)
- **41-69:** Em Progresso (badge azul) 
- **70-100 + Stage N:** Qualificado (badge verde)

---

## 🔔 **Sistema de Webhook**

### **Endpoint Principal: `/api/webhook/whatsapp/[instanceName]`**

**Eventos Suportados:**
```typescript
switch (payload.event) {
  case "messages.upsert":    // Nova mensagem recebida
  case "connection.update":  // Status da conexão WhatsApp  
  case "qrcode.updated":     // QR Code atualizado
}
```

### **Fluxo de Processamento Completo**

```mermaid
graph TD
    A[WhatsApp Message] --> B[Evolution API Webhook]
    B --> C[/api/webhook/whatsapp/instanceName]
    C --> D[Verify HMAC Signature]
    D --> E[Find Organization by Instance]
    E --> F[Find/Create Contact in Convex]
    F --> G[Find/Create Session]
    G --> H[Save Message to DB]
    H --> I[Trigger AI Processing]
    I --> J[AI Generates Reply]
    J --> K[Send via Evolution API]
    K --> L[Save AI Reply to DB]
```

**Código do Processamento:**
```typescript
async function processWhatsAppMessage(instanceName: string, messageData: any) {
  // 1. Extract message data
  const { key, message, pushName, messageTimestamp } = messageData;
  const phoneNumber = key.remoteJid.replace('@s.whatsapp.net', '');
  const messageText = message.conversation || message.text || '';
  
  // 2. Find organization by instance name
  const orgQuery = await convex.query("organizations.getByInstanceName", { 
    instanceName 
  });
  
  // 3. Find or create contact
  let contact = await convex.query("contacts.getByExternalId", {
    externalId: key.remoteJid,
    orgId: orgQuery._id
  });
  
  if (!contact) {
    const contactId = await convex.mutation("contacts.create", {
      orgId: orgQuery._id,
      name: pushName || 'Unknown',
      channel: 'whatsapp',
      externalId: key.remoteJid
    });
    contact = { _id: contactId };
  }
  
  // 4. Find or create session
  let session = await convex.query("sessions.getActiveByContact", {
    contactId: contact._id
  });
  
  if (!session) {
    const sessionId = await convex.mutation("sessions.create", {
      contactId: contact._id,
      orgId: orgQuery._id,
      channel: 'whatsapp',
      status: 'active'
    });
    session = { _id: sessionId };
  }
  
  // 5. Save incoming message
  const savedMessage = await convex.mutation("messages.create", {
    sessionId: session._id,
    contactId: contact._id,
    orgId: orgQuery._id,
    direction: 'inbound',
    text: messageText,
    messageType: 'text',
    metadata: {
      whatsappId: key.id,
      timestamp: messageTimestamp,
      instanceName
    }
  });
  
  // 6. Trigger AI processing (batching handled internally)
  await convex.action("ai.generateAiReply", {
    orgId: orgQuery._id,
    sessionId: session._id
  });
  
  return { success: true, sessionId: session._id, messageId: savedMessage._id };
}
```

---

## ⚙️ **Configuração de Deploy**

### **Variáveis de Ambiente Necessárias:**
```bash
# Evolution API
EVOLUTION_BASE_URL=https://evolutionapi.centralsupernova.com.br
EVOLUTION_API_KEY=your_evolution_api_key
EVOLUTION_WEBHOOK_SECRET=your_webhook_secret

# Convex Database  
NEXT_PUBLIC_CONVEX_URL=https://your_convex_deployment.convex.cloud
CONVEX_DEPLOYMENT=your_convex_deployment

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...

# Next.js
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding
```

### **vercel.json Configuration:**
```json
{
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "framework": "nextjs",
  "headers": [
    {
      "source": "/api/webhook/(.*)",
      "headers": [
        {
          "key": "Access-Control-Allow-Origin",
          "value": "*"
        },
        {
          "key": "Access-Control-Allow-Methods", 
          "value": "POST, OPTIONS"
        }
      ]
    }
  ]
}
```

---

## 🔍 **Monitoramento e Logs**

### **Logs Importantes para Monitorar:**

**Evolution API Connection:**
```
✅ Real Evolution contacts fetched: 30
✅ Real Evolution chats fetched: 3  
✅ Real messages fetched: 2
🚨 Evolution API failed: Error message
```

**Webhook Processing:**
```
Webhook received for instance: qify-5561999449983
Processing message from 556181501115: Entendi, Tárik...
Contact found/created: contact_id
Session found/created: session_id
Message saved: message_id
AI processing triggered for session: session_id
```

**SPIN Analysis:**
```
🎯 SPIN Analysis - Starting... { contactId: null, period: 'week' }
✅ Real SPIN analysis completed: 3 sessions
📊 Stage distribution: {"S": 3, "P": 0, "I": 0, "N": 0}
```

### **Comandos de Debug:**
```bash
# Testar APIs localmente
curl -X GET "https://your-domain.vercel.app/api/evolution/contacts?limit=5"
curl -X GET "https://your-domain.vercel.app/api/evolution/messages?period=today&limit=10"

# Testar webhook  
curl -X GET "https://your-domain.vercel.app/api/webhook/whatsapp/qify-5561999449983"

# Monitorar logs Vercel
vercel logs --app qify-blackandwhite --follow
```

---

## 🚨 **Troubleshooting**

### **Problema: "Evolution API indisponível"**
```
✅ Verificar se EVOLUTION_BASE_URL está correto
✅ Verificar se EVOLUTION_API_KEY é válido  
✅ Testar conectividade: curl -H "apikey: $KEY" $BASE_URL/instance/fetchInstances
✅ Verificar timeout (15s configurado)
```

### **Problema: Webhook não recebe mensagens**
```
✅ Verificar URL do webhook na Evolution API
✅ URL deve ser: https://your-domain.vercel.app/api/webhook/whatsapp/qify-5561999449983
✅ Verificar EVOLUTION_WEBHOOK_SECRET
✅ Verificar logs: vercel logs --follow
```

### **Problema: SPIN Analysis sempre vazio**  
```
✅ Verificar se Messages API está funcionando
✅ SPIN depende 100% de mensagens reais
✅ Verificar se há mensagens no período solicitado
✅ Logs: "✅ Real SPIN analysis completed: X sessions"
```

---

## 📊 **Status de Funcionamento Atual**

### **✅ Funcionando:**
- Contacts API: 30+ contatos reais
- Chats API: Conversas com Tárik Sedenho, Felipe  
- Messages API: Parsing correto das mensagens Evolution
- Instance Stats: 713 mensagens, status "open"
- Webhook: Processamento automático funcionando
- SPIN Analysis: Análise baseada em dados reais

### **⚠️ Em Desenvolvimento:**
- SPIN pattern matching pode ser refinado
- UI/UX dos erros pode ser melhorada
- Métricas de performance podem ser adicionadas

### **❌ Removido:**
- Mock/fake data completamente eliminado
- Fallbacks que mascaravam problemas de API
- Dados simulados nas análises SPIN

---

**🎯 Sistema 100% baseado em dados reais da Evolution API ou erros transparentes. Zero simulação.**