# 🗺️ Roadmap de Implementação - Qify SDR Agent

**Baseado na análise:** ESTADO_ATUAL_APLICACAO.md vs sdr_agent_→_arquitetura_ideal_next_js_convex_clerk_event_bridge_s_3_cdn.md

---

## 📊 MATRIZ DE IMPLEMENTAÇÃO

| Componente | Status Atual | Arquitetura Ideal | Gap | Prioridade | Esforço |
|------------|--------------|-------------------|-----|------------|---------|
| **Frontend (Next.js)** | ✅ 100% | ✅ 100% | Nenhum | - | - |
| **Auth (Clerk)** | ✅ 100% | ✅ 100% | Nenhum | - | - |
| **Database (Convex)** | ✅ 100% | ✅ 100% | Nenhum | - | - |
| **IA (Gemini)** | ✅ 100% | ✅ 100% | Nenhum | - | - |
| **WhatsApp (Evolution)** | ✅ 90% | ✅ 100% | HMAC Webhook | Alta | 1 dia |
| **Events (EventBridge)** | ❌ 0% | ✅ 100% | Implementação completa | Alta | 3 dias |
| **Media (S3+CDN)** | ❌ 0% | ✅ 100% | Implementação completa | Média | 2 dias |
| **Calendar (Google MCP)** | 🔄 30% | ✅ 100% | OAuth + MCP Tools | Média | 4 dias |
| **Observabilidade** | 🔄 40% | ✅ 100% | Métricas RED/USE | Baixa | 3 dias |
| **Segurança** | 🔄 70% | ✅ 100% | Rate limit + Headers | Baixa | 2 dias |

---

## 🎯 FASES DE IMPLEMENTAÇÃO

### **FASE 1: CORE INFRASTRUCTURE (1 semana)**
**Objetivo:** Completar a arquitetura serverless ideal

#### **Dia 1: EventBridge Setup**
```typescript
// Implementar publisher de eventos
// lib/eventbridge.ts
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";

export async function publishEvent(detailType: string, source: string, detail: any) {
  const client = new EventBridgeClient({ region: process.env.AWS_REGION });
  
  await client.send(new PutEventsCommand({
    Entries: [{
      DetailType: detailType,
      Source: source,
      Detail: JSON.stringify(detail),
      EventBusName: process.env.EVENTBUS_NAME || "sdr-agent"
    }]
  }));
}
```

**Eventos a implementar:**
- `whatsapp.message.received.v1`
- `ai.response.generated.v1`
- `whatsapp.message.sent.v1`
- `session.updated.v1`
- `appointment.created.v1`

#### **Dia 2: S3 + CloudFront**
```typescript
// lib/s3.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export async function storeMedia(orgId: string, key: string, body: ArrayBuffer) {
  const s3 = new S3Client({ region: process.env.AWS_REGION });
  
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: `${orgId}/${key}`,
    Body: Buffer.from(body),
    ACL: "private"
  }));
  
  return { s3Key: `${orgId}/${key}` };
}
```

#### **Dia 3: HMAC Webhook Security**
```typescript
// app/api/webhook/whatsapp/route.ts
function verifySignature(reqBody: string, signature: string, secret: string) {
  const hmac = crypto.createHmac("sha256", secret).update(reqBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}
```

#### **Dias 4-5: Google Calendar OAuth + MCP**
```typescript
// Implementar fluxo OAuth completo
// app/api/oauth/google/start/route.ts
// app/api/oauth/google/callback/route.ts
// MCP Google Calendar tools integration
```

---

### **FASE 2: OBSERVABILIDADE E OPERAÇÃO (1 semana)**
**Objetivo:** Implementar monitoramento de classe mundial

#### **Métricas RED (Rate, Errors, Duration)**
```typescript
// lib/metrics.ts
interface REDMetrics {
  requestRate: number;    // requests/second
  errorRate: number;      // % of requests with errors
  duration: number;       // p95 response time
}

class MetricsCollector {
  async collectRED(): Promise<REDMetrics> {
    // Implementation for CloudWatch/DataDog
  }
}
```

#### **SLOs/SLIs Definition**
```yaml
# slos.yaml
slos:
  - name: "API Availability"
    sli: "success_rate"
    target: 99.9
    window: "30d"
  
  - name: "AI Response Latency"
    sli: "p95_latency"
    target: 5000  # 5 seconds
    window: "7d"
```

#### **Alerting Strategy**
```typescript
// lib/alerts.ts
const alerts = [
  {
    name: "High Error Rate",
    condition: "error_rate > 5%",
    severity: "critical",
    channels: ["slack", "email"]
  },
  {
    name: "AI Latency Degradation", 
    condition: "p95_ai_latency > 10s",
    severity: "warning",
    channels: ["slack"]
  }
];
```

---

### **FASE 3: PRODUTO E NEGÓCIO (2 semanas)**
**Objetivo:** Funcionalidades de monetização e crescimento

#### **Billing Integration (Stripe)**
```typescript
// lib/billing.ts
import Stripe from 'stripe';

export class BillingManager {
  async createSubscription(orgId: string, priceId: string) {
    // Stripe subscription logic
  }
  
  async handleWebhook(event: Stripe.Event) {
    // Process billing events
  }
}
```

#### **Advanced Analytics**
```typescript
// Métricas de produto (AARRR)
interface ProductMetrics {
  acquisition: number;    // New signups
  activation: number;     // Completed onboarding
  retention: number;      // Active users D7/D30
  revenue: number;        // MRR/ARR
  referral: number;       // Referral rate
}
```

#### **CRM Integrations**
```typescript
// lib/integrations/hubspot.ts
export class HubSpotIntegration {
  async syncContact(contact: Contact) {
    // Sync qualified leads to HubSpot
  }
}
```

---

## 🔧 IMPLEMENTAÇÃO DETALHADA

### **1. EventBridge Implementation**

#### **Publisher (Convex Actions)**
```typescript
// convex/events.ts
import { action } from "./_generated/server";
import { publishEvent } from "../lib/eventbridge";

export const publishWhatsAppMessage = action({
  args: { orgId: v.string(), messageId: v.string() },
  handler: async (ctx, { orgId, messageId }) => {
    const message = await ctx.runQuery("messages:getById", { messageId });
    
    await publishEvent(
      "whatsapp.message.received.v1",
      "app.messaging",
      {
        orgId,
        messageId,
        contactId: message.contactId,
        text: message.text,
        occurredAt: new Date().toISOString()
      }
    );
  }
});
```

#### **Event Handlers (AWS Lambda)**
```typescript
// infrastructure/handlers/session-updated.ts
export const handler = async (event: EventBridgeEvent) => {
  const { orgId, sessionId, stage, score } = event.detail;
  
  if (stage === "qualified" && score > 70) {
    // Trigger appointment scheduling
    await scheduleAppointment(orgId, sessionId);
  }
  
  // Sync to CRM
  await syncToCRM(orgId, sessionId);
};
```

### **2. S3 + CloudFront Setup**

#### **CDK Infrastructure**
```typescript
// infrastructure/media-stack.ts
export class MediaStack extends Stack {
  constructor(scope: Construct, id: string) {
    super(scope, id);
    
    const bucket = new s3.Bucket(this, 'MediaBucket', {
      bucketName: 'sdr-agent-media',
      cors: [{
        allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.PUT],
        allowedOrigins: ['*'],
        allowedHeaders: ['*']
      }]
    });
    
    const distribution = new cloudfront.Distribution(this, 'CDN', {
      defaultBehavior: {
        origin: new origins.S3Origin(bucket),
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED
      }
    });
  }
}
```

### **3. Google Calendar MCP Integration**

#### **MCP Server Configuration**
```json
// .kiro/settings/mcp.json
{
  "mcpServers": {
    "google-calendar": {
      "command": "uvx",
      "args": ["google-calendar-mcp@latest"],
      "env": {
        "GOOGLE_CLIENT_ID": "...",
        "GOOGLE_CLIENT_SECRET": "...",
        "GOOGLE_REDIRECT_URI": "..."
      },
      "disabled": false,
      "autoApprove": ["calendar.freebusy", "calendar.createEvent"]
    }
  }
}
```

#### **Calendar Integration**
```typescript
// convex/calendar.ts
export const suggestMeetingTimes = action({
  args: { orgId: v.string(), contactId: v.string() },
  handler: async (ctx, { orgId, contactId }) => {
    // Get Google credentials
    const creds = await ctx.runQuery("google:getCredentials", { orgId });
    
    // Call MCP tool for free/busy
    const freeSlots = await ctx.runAction("mcp:calendar.freebusy", {
      timeMin: new Date().toISOString(),
      timeMax: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      credentials: creds
    });
    
    // Suggest 3 best slots
    return freeSlots.slice(0, 3);
  }
});
```

---

## 📋 CHECKLIST DE IMPLEMENTAÇÃO

### **Fase 1: Core Infrastructure**
- [ ] **EventBridge** - Setup AWS EventBridge bus
- [ ] **Event Publisher** - Implement in Convex actions
- [ ] **Event Handlers** - Create Lambda handlers
- [ ] **S3 Bucket** - Create with proper CORS
- [ ] **CloudFront** - Setup CDN distribution
- [ ] **Media Upload** - Implement S3 upload logic
- [ ] **HMAC Webhook** - Secure webhook validation
- [ ] **Google OAuth** - Complete OAuth flow
- [ ] **MCP Setup** - Configure Google Calendar MCP
- [ ] **Calendar Tools** - Implement MCP tools

### **Fase 2: Observabilidade**
- [ ] **CloudWatch** - Setup metrics collection
- [ ] **RED Metrics** - Implement Rate/Errors/Duration
- [ ] **SLOs Definition** - Define service level objectives
- [ ] **Alerting** - Configure alerts and notifications
- [ ] **Dashboards** - Create monitoring dashboards
- [ ] **Logs** - Structured logging with correlation IDs
- [ ] **Tracing** - Distributed tracing setup

### **Fase 3: Produto**
- [ ] **Stripe Integration** - Billing and subscriptions
- [ ] **Usage Tracking** - Track API usage per org
- [ ] **Plan Limits** - Enforce plan limitations
- [ ] **Analytics** - Advanced product analytics
- [ ] **CRM Sync** - HubSpot/Salesforce integration
- [ ] **Reporting** - Advanced reporting features

---

## 🎯 CRITÉRIOS DE SUCESSO

### **Técnicos**
- ✅ **Latência p95 < 5s** para respostas de IA
- ✅ **Uptime > 99.9%** mensal
- ✅ **Cold start < 300ms** para funções críticas
- ✅ **Error rate < 1%** para todas as APIs

### **Produto**
- ✅ **Time to first response < 60s** configurável
- ✅ **SPIN completion rate > 80%** 
- ✅ **Lead qualification accuracy > 85%**
- ✅ **Customer satisfaction > 4.5/5**

### **Negócio**
- ✅ **Monthly recurring revenue** growth
- ✅ **Customer acquisition cost** optimization
- ✅ **Churn rate < 5%** monthly
- ✅ **Net promoter score > 50**

---

## 🚀 DEPLOY STRATEGY

### **Environment Progression**
```
Development → Staging → Production
     ↓           ↓         ↓
   Convex     Convex    Convex
    Dev      Staging     Prod
```

### **Feature Flags**
```typescript
// lib/features.ts
const features = {
  eventBridge: process.env.FEATURE_EVENTBRIDGE === 'true',
  s3Media: process.env.FEATURE_S3_MEDIA === 'true',
  googleCalendar: process.env.FEATURE_GOOGLE_CALENDAR === 'true',
  advancedAnalytics: process.env.FEATURE_ANALYTICS === 'true'
};
```

### **Rollback Plan**
1. **Database**: Convex handles schema evolution automatically
2. **Features**: Disable via feature flags
3. **Infrastructure**: CDK rollback to previous version
4. **Monitoring**: Automated rollback triggers on SLO violations

---

## 📊 ESTIMATIVAS DE ESFORÇO

| Fase | Duração | Recursos | Complexidade |
|------|---------|----------|--------------|
| **Fase 1** | 1 semana | 1 dev senior | Média |
| **Fase 2** | 1 semana | 1 dev + 1 devops | Alta |
| **Fase 3** | 2 semanas | 2 devs + 1 product | Média |
| **Total** | 4 semanas | 2-3 pessoas | - |

---

## 🎉 RESULTADO FINAL

Após a implementação completa do roadmap, a aplicação terá:

✅ **Arquitetura serverless de classe mundial**  
✅ **Observabilidade completa** com SLOs/SLIs  
✅ **Segurança enterprise-grade**  
✅ **Escalabilidade automática**  
✅ **Monetização integrada**  
✅ **Integrações robustas**  

**Status projetado: ENTERPRISE READY! 🚀**

---

*Roadmap baseado na análise comparativa entre estado atual e arquitetura ideal, seguindo as melhores práticas do SOP_Serverless_Pro.*