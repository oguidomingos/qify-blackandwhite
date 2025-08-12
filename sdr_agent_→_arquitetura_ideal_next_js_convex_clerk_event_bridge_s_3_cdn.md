# SDR Agent → Arquitetura Ideal (Next.js + Convex + Clerk + EventBridge + S3/CDN)

> Meta: migrar/encaixar o serviço FastAPI+Redis em um **app multi-tenant** com **Next.js (Vercel)** na edge/serverless, **Convex** para dados e orquestração, **Clerk** para auth/RBAC e billing, **AWS EventBridge** para eventos cross-domain e **S3+CloudFront** para mídia, mantendo o core de **IA (Gemini)** e **WhatsApp (Evolution API)**.

---

## 0) Visão de Alto Nível

**Fluxo principal (happy path)**

1. WhatsApp → **Webhook** Evolution API (Next.js serverless) → verificação de assinatura → **Convex mutation** `ingestWebhook`.
2. `ingestWebhook` persiste **contato, sessão e mensagem**; dispara **evento** `whatsapp.message.received` (EventBridge) e agenda **action** para IA.
3. **Convex action** `generateAiReply` chama **Gemini** com o prompt SPIN + contexto; salva rascunho da resposta e dispara `ai.response.generated`.
4. **Convex action** `sendWhatsAppMessage` chama Evolution API para envio; persiste mensagem enviada; dispara `whatsapp.message.sent`.
5. Sessão é atualizada (status/etapa SPIN, score de qualificação). Opcional: cria/agende **appointment** via integração de agenda.

**Domínios**

- **Messaging**: contatos, mensagens, threads, anexos.
- **Sessions**: estado conversacional por contato+canal.
- **AI**: prompts, configurações de modelo, versões.
- **Scheduling**: appointments.
- **Org/Tenant**: organização, membros, papéis (Clerk).
- **Audit**: trilha de auditoria e logs estruturados.

---

## 1) Mapeamento “Como está → Como fica”

| Item atual (FastAPI/Redis)        | Stack-alvo                                                                                |
| --------------------------------- | ----------------------------------------------------------------------------------------- |
| `POST /webhook` (Evolution API)   | **Next.js** `app/api/webhook/whatsapp/route.ts` (serverless) + **Convex** `ingestWebhook` |
| `GET/DELETE /sessions/{user_id}`  | **Convex queries/mutations** `sessions:getByUser`, `sessions:remove` com **Clerk RBAC**   |
| `session.py` (Redis)              | **Convex collections** `sessions`, `contacts`, `messages` (com índices e TTL opcional)    |
| `gemini.py` + `prompts.py`        | **Convex actions** `ai:generateAiReply`, **docs** `ai_prompts`                            |
| `whatsapp.py` (cliente Evolution) | **Convex action** `wa:sendMessage` (fetch) + **Next.js** secret store                     |
| Healthcheck                       | **Next.js** `app/api/health/route.ts`                                                     |
| Docker Compose                    | **Vercel** (Next.js) + **Convex** (cloud) + **AWS** (EventBridge/S3)                      |

---

## 2) Estrutura de Rotas (Next.js em Vercel)

```
/app
  /dashboard               # visão geral por tenant
  /inbox                   # threads/mensagens em tempo real (Convex)
  /sessions                # lista e estado das sessões
  /settings
    /organization          # dados do tenant, webhooks Evolution, chaves
    /ai                    # prompts, modelos, temperatura
    /whatsapp              # contas/canais conectados
  /api
    /health (GET)
    /webhook
      /whatsapp (POST)     # assinatura + ingestWebhook
```

**Middleware**

- `middleware.ts`: integração **Clerk** (proteger tudo exceto `/api/health` e `/api/webhook/whatsapp`).
- Rate limit básico por IP+path (edge) – opcional.

---

## 3) Modelo de Dados (Convex)

### 3.1 Coleções & Índices

```ts
// convex/schema.ts (resumo)
import { defineSchema, defineTable } from "convex/server";

export default defineSchema({
  organizations: defineTable({
    name: "string",
    clerkOrgId: "string",
    billingPlan: "string",
    createdAt: "number",
  }).index("by_clerkOrgId", ["clerkOrgId"]),

  whatsapp_accounts: defineTable({
    orgId: "string",          // organizations._id
    provider: "string",        // "evolution"
    phoneNumber: "string",
    webhookSecret: "string",
    baseUrl: "string",         // Evolution endpoint
    token: "string",           // API token (encrypted at rest)
  }).index("by_org", ["orgId"]).index("by_phone", ["phoneNumber"]),

  contacts: defineTable({
    orgId: "string",
    channel: "string",         // "whatsapp"
    externalId: "string",      // número/ID WhatsApp
    name: "string",
    lastMessageAt: "number",
  }).index("by_org_external", ["orgId", "externalId"]).index("by_org_last", ["orgId", "lastMessageAt"]),

  sessions: defineTable({
    orgId: "string",
    contactId: "string",
    stage: "string",           // spin: situation|problem|implication|need
    status: "string",          // active|paused|closed
    variables: "object",       // respostas capturadas
    lastActivityAt: "number",
  }).index("by_org_contact", ["orgId", "contactId"]).index("by_org_last", ["orgId", "lastActivityAt"]),

  messages: defineTable({
    orgId: "string",
    sessionId: "string",
    contactId: "string",
    direction: "string",       // inbound|outbound
    text: "string",
    media: "object",           // {type,url,s3Key?}
    providerMessageId: "string",
    createdAt: "number",
  }).index("by_session_time", ["sessionId", "createdAt"]).index("by_org_time", ["orgId", "createdAt"]),

  ai_prompts: defineTable({
    orgId: "string",
    kind: "string",            // "spin_sdr"
    version: "number",
    content: "string",
    active: "boolean",
  }).index("by_org_kind_active", ["orgId", "kind", "active"]),

  appointments: defineTable({
    orgId: "string",
    contactId: "string",
    sessionId: "string",
    startAt: "number",
    source: "string",          // "whatsapp"
    status: "string",          // scheduled|canceled
  }).index("by_org_time", ["orgId", "startAt"]),

  audit_logs: defineTable({
    orgId: "string",
    actorId: "string",         // Clerk userId ou "system"
    action: "string",
    resource: "string",
    meta: "object",
    ts: "number",
    requestId: "string",
  }).index("by_org_ts", ["orgId", "ts"]),
});
```

### 3.2 Queries/Mutations (principais)

- `contacts:getByExternalId(orgId, externalId)`
- `sessions:getByContact(orgId, contactId)`
- `sessions:upsert({ orgId, contactId, patch })`
- `messages:listBySession(sessionId)` (para inbox em tempo real)
- `webhooks:ingestWebhook(payload)` (entrypoint do WhatsApp)
- `ai:generateAiReply({ orgId, sessionId })` (action)
- `wa:sendMessage({ orgId, accountId, to, text, media? })` (action)
- `audit:log({...})`

---

## 4) Auth, RBAC e Multi-tenant (Clerk)

**Modelo**

- **Organizations** do Clerk = tenants.
- Papéis: `owner`, `admin`, `sdr`, `viewer`.
- **JWT** com `org_id`, `org_role` e `user_id` → passado às serverless functions e Convex (via `auth()` do Convex).

**Regras**

- Toda query/mutation recebe `orgId` do token e filtra por índice `by_org_*`.
- Guards utilitários: `requireRole(["admin","owner"])`, `requireMember()`.

**Billing (stub)**

- Campo `billingPlan` em `organizations` + integração posterior (Stripe via Clerk).

---

## 5) Eventos (AWS EventBridge)

**Bus**: `sdr-agent` (ou `default`).

**Detail Types**

- `whatsapp.message.received.v1`
- `ai.response.generated.v1`
- `whatsapp.message.sent.v1`
- `session.updated.v1`
- `appointment.created.v1`

**Contrato base**

```json
{
  "detailType": "whatsapp.message.received.v1",
  "source": "app.messaging",
  "detail": {
    "orgId": "org_123",
    "contactId": "ct_abc",
    "sessionId": "se_1",
    "providerMessageId": "...",
    "text": "...",
    "media": null,
    "occurredAt": "2025-01-01T12:00:00Z"
  },
  "idempotencyKey": "<providerMessageId>",
  "time": "2025-01-01T12:00:00Z"
}
```

**Regras**

- Idempotência por `providerMessageId` (inbound) e `messageId` (outbound).
- DLQ + reprocessamento para actions.

---

## 6) S3 + CloudFront (mídia opcional)

- **Bucket**: `sdr-agent-media` com prefixos `orgId/channel/date/`.
- **Uso**: anexos recebidos (áudio/imagem/documento) baixados do Evolution → `putObject` → URL CloudFront salva em `messages.media.url`.
- **Headers**: `Cache-Control: public, max-age=31536000, immutable` p/ mídia.

---

## 7) Segurança, Logs e Auditoria

- **Webhook HMAC**: validar assinatura do Evolution (`X-Signature` + `webhookSecret`).
- **Rate limit**: por IP+path na edge (limite burst) + idempotência.
- **JWT/RBAC**: Clerk middleware em todas as rotas privadas.
- **Log estruturado**: `{ orgId, actorId, action, resource, requestId, ts }` em `audit_logs` + console Vercel.
- **PII**: mascarar telefone nos logs (últimos 4 dígitos).
- **Secrets**: armazenar via Vercel/Convex environment vars; nunca em DB plano.

---

## 8) Snippets (base)

### 8.1 Next.js Webhook (serverless)

```ts
// app/api/webhook/whatsapp/route.ts
import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convexServer"; // wrapper com authNone
import crypto from "crypto";

export const runtime = "nodejs"; // serverless

function verifySignature(reqBody: string, signature: string, secret: string) {
  const hmac = crypto.createHmac("sha256", secret).update(reqBody).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(signature));
}

export async function POST(req: NextRequest) {
  const raw = await req.text();
  const signature = req.headers.get("x-signature") || "";
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET!;
  if (!verifySignature(raw, signature, secret)) return NextResponse.json({ ok: false }, { status: 401 });

  const convex = getConvexClient();
  await convex.mutation(api.webhooks.ingestWebhook, { raw });
  return NextResponse.json({ ok: true });
}
```

### 8.2 Convex: ingestão do webhook

```ts
// convex/webhooks.ts
import { mutation } from "convex/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const ingestWebhook = mutation({
  args: { raw: v.string() },
  handler: async (ctx, { raw }) => {
    const payload = JSON.parse(raw);
    const orgId = await resolveOrgId(ctx, payload); // por conta/telefone

    const contact = await upsertContact(ctx, orgId, payload);
    const session = await upsertSession(ctx, orgId, contact._id);

    // Persistir mensagem inbound
    await ctx.db.insert("messages", {
      orgId, sessionId: session._id, contactId: contact._id,
      direction: "inbound", text: payload.message?.text || "",
      media: payload.message?.media || null, providerMessageId: payload.message?.id || "",
      createdAt: Date.now(),
    });

    // Disparar action de IA (assíncrona)
    await ctx.scheduler.runAfter(0, internal.ai.generateAiReply, { orgId, sessionId: session._id });
  }
});
```

### 8.3 Convex Action: chamada ao Gemini

```ts
// convex/ai.ts
import { action, internalMutation } from "convex/server";
import { v } from "convex/values";

export const generateAiReply = action({
  args: { orgId: v.string(), sessionId: v.id("sessions") },
  handler: async (ctx, { orgId, sessionId }) => {
    const msgs = await ctx.runQuery("messages:listBySession", { sessionId });
    const prompt = await ctx.runQuery("ai:getActivePrompt", { orgId, kind: "spin_sdr" });

    const text = await callGemini(prompt.content, msgs);

    // Persistir e enviar
    const { contactId } = await ctx.runQuery("sessions:getById", { sessionId });
    await ctx.runMutation("messages:insertOutbound", { orgId, sessionId, contactId, text });
    await ctx.runAction("wa:sendMessage", { orgId, to: contactId, text });
  }
});
```

### 8.4 Convex Action: envio via Evolution API

```ts
// convex/wa.ts
import { action } from "convex/server";
import { v } from "convex/values";

export const sendMessage = action({
  args: { orgId: v.string(), to: v.string(), text: v.string(), media: v.optional(v.object({ url: v.string(), type: v.string() })) },
  handler: async (ctx, args) => {
    const acc = await ctx.runQuery("wa:getAccountByOrg", { orgId: args.orgId });
    const res = await fetch(`${acc.baseUrl}/messages`, {
      method: "POST",
      headers: { Authorization: `Bearer ${acc.token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ to: args.to, text: args.text, media: args.media ?? undefined })
    });
    if (!res.ok) throw new Error(`WA send failed: ${res.status}`);
  }
});
```

### 8.5 Clerk RBAC Guard (server helper)

```ts
// lib/rbac.ts
import { auth } from "@clerk/nextjs";

export function requireRole(roles: Array<"owner"|"admin"|"sdr"|"viewer">) {
  const { orgId, orgRole, userId } = auth();
  if (!userId || !orgId || !roles.includes(orgRole as any)) {
    throw new Error("NOT_AUTHORIZED");
  }
  return { orgId, userId, role: orgRole };
}
```

### 8.6 EventBridge Publisher (utilitário)

```ts
// lib/eventbridge.ts
import { EventBridgeClient, PutEventsCommand } from "@aws-sdk/client-eventbridge";
const client = new EventBridgeClient({ region: process.env.AWS_REGION });

export async function publish(detailType: string, source: string, detail: any, idempotencyKey?: string) {
  await client.send(new PutEventsCommand({
    Entries: [{
      DetailType: detailType,
      Source: source,
      Detail: JSON.stringify(detail),
      EventBusName: process.env.EVENTBUS_NAME || "default",
      Time: new Date()
    }]
  }));
}
```

### 8.7 S3 Upload (para anexos do WhatsApp)

```ts
// lib/s3.ts
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
const s3 = new S3Client({ region: process.env.AWS_REGION });

export async function storeMedia(orgId: string, key: string, body: ArrayBuffer, contentType: string) {
  await s3.send(new PutObjectCommand({
    Bucket: process.env.S3_BUCKET!,
    Key: `${orgId}/${key}`,
    Body: Buffer.from(body),
    ContentType: contentType,
    ACL: "private"
  }));
  return { s3Key: `${orgId}/${key}` };
}
```

---

## 9) Observabilidade e Operação

- **Logs**: Vercel (app), Convex logs, trilha `audit_logs` (consultas por `orgId` e janela de tempo).
- **Métricas**: contadores por evento (recebidos, gerados, enviados), latência IA.
- **Alertas**: erro de envio WA, falha de IA, taxa de 5xx no webhook.
- **SLO**: p95 resposta IA < 5s; ingestão webhook < 200ms.

---

## 10) Plano de Execução (Roadmap)

**Fase 1 – Fundacional (D0–D3)**

1. Projetar `schema.ts` no Convex e subir projeto (dev).
2. Implementar `ingestWebhook`, `generateAiReply`, `sendMessage`.
3. Middleware Clerk + RBAC; páginas mínimas `/dashboard` e `/inbox`.
4. Healthcheck e logs de auditoria.

**Fase 2 – Integrações (D4–D7)**

1. EventBridge (publisher + DLQ).
2. S3 para anexos (download de mídia do Evolution e persistência).
3. Configurações por tenant (prompts, modelo, temperatura).

**Fase 3 – Produto (D8–D14)**

1. Inbox em tempo real (messages subscription).
2. Sessões com etapas SPIN e score.
3. Agendamento (appointments) + notificação.
4. Painéis e exportações.

**Fase 4 – Hardening**

- Rate limiting, idempotência forte, testes E2E, runbooks de incidente.

---

## 11) Decisões incorporadas + pendências mínimas

### Decisões que você trouxe

- **Multi‑tenant**: sim — tenants = **Clerk Organizations**; roteamento também por **conta WhatsApp** (phone → orgId).
- **Gemini**: modelo `` (uso em actions Convex).
- **SPIN Selling**: persistir **todos os pontos principais** (detalhe abaixo no schema + variáveis por sessão).
- **Google via MCP**: integração para calendário (criar/consultar eventos/slots) usando um **MCP server** "google" rodando como ferramenta do agente.
- **Webhook**: ainda sem assinatura do provedor; adotaremos *fallback* com **shared secret + instanceId** e idempotência. Se a Evolution expuser HMAC, plugamos sem quebrar contrato.
- **Orquestração com n8n**: avaliar caso a caso; definimos **arquitetura híbrida** (detalhe no §13) com EventBridge como bus e n8n para fluxos não críticos de latência.

### Pendências mínimas

1. **Payloads Evolution**: confirmar campos definitivos (IDs de mensagem, mídia) e se há header de assinatura; se houver, qual algoritmo?
2. **Mapa phone→org**: qual chave usaremos (número completo no E.164?) e como você quer cadastrar as contas inicialmente (seed/manual UI/API)?
3. **Calendário Google**: escopo mínimo (Calendar v3: `events.insert`, `freebusy.query`); qual calendário padrão por org?

---

## 12) SPIN Selling — modelo de dados e estado

### 12.1 Campos persistidos por sessão (`sessions.variables`)

```ts
// Exemplo de shape salvo em sessions.variables
{
  spin: {
    situation: { answers: string[], completed: boolean, lastAt: number },
    problem:   { answers: string[], completed: boolean, lastAt: number },
    implication:{ answers: string[], completed: boolean, lastAt: number },
    needPayoff:{ answers: string[], completed: boolean, lastAt: number },
    score: number,              // 0..100, heurística de fit/urgência
    stage: "situation"|"problem"|"implication"|"needPayoff"|"qualified",
    summary: string             // TL;DR gerado pela IA
  }
}
```

### 12.2 Regras

- Avanço de etapa ocorre quando `completed=true` para a etapa corrente.
- `score` atualizado a cada resposta (weights por palavras‑chave, orçamento, janela de compra).
- Ao entrar em `qualified`, disparamos `appointment.suggested` (MCP Calendar para proposta de horários).

---

## 13) Webhook Evolution — validação e roteamento

**Contrato de entrada (compatível)**

- Body **raw** (string) preservado para verificação futura de HMAC.
- Header opcional `x-instance-id` → identifica a instância/canal do WhatsApp.
- Header/Query `token` (shared secret).

**Camadas**

1. **Gate** (Next.js API):
   - Verifica `token` constante por **conta** (consulta Convex `whatsapp_accounts` via `instanceId`).
   - Se a Evolution suportar **HMAC**, ativa verificação: `X-Signature` vs `webhookSecret` (schema já prevê campo).
   - Enfileira ingestão: `convex.mutation(api.webhooks.ingestWebhook, { raw, instanceId })`.
2. **Ingestão** (Convex):
   - `instanceId → account → orgId`.
   - Idempotência por `providerMessageId` (index único lógico em `messages`).
   - Persistência de `contacts/sessions/messages` e *schedule* de `ai.generateAiReply`.

> Se mais tarde adotarmos a assinatura oficial, só ativamos o *flag* na conta — sem alterar o shape do payload.

**Snippet Gate (atualizado)**

```ts
export async function POST(req: NextRequest) {
  const raw = await req.text();
  const instanceId = req.headers.get("x-instance-id") || new URL(req.url).searchParams.get("instanceId") || "";
  const token = req.headers.get("x-webhook-token") || new URL(req.url).searchParams.get("token");
  if (!instanceId || !token) return NextResponse.json({ ok:false }, { status: 400 });

  // opcional: verificação HMAC quando disponível
  // const signature = req.headers.get("x-signature");

  const convex = getConvexClient();
  await convex.mutation(api.webhooks.ingestWebhook, { raw, instanceId, token });
  return NextResponse.json({ ok: true });
}
```

---

## 14) Google (Calendar) via MCP

**Abordagem**: um **MCP Server** `@agent/google` expõe ferramentas:

- `calendar.freebusy({ timeMin, timeMax, attendees[] })`
- `calendar.createEvent({ start, end, attendees[], summary, description, conference: boolean })`
- `calendar.listCalendars()`

**Wire**

- O **agente de IA** dentro da Action `ai.generateAiReply` pode invocar as ferramentas MCP (através de um *tool router*).
- Os *tokens OAuth* por **org** ficam em `google_credentials` (coleção Convex, criptografado) e são injetados no MCP server no runtime.

**Fluxo**

1. Sessão entra em `needPayoff` com `score>threshold` → `ai.suggestTimes`.
2. `MCP:calendar.freebusy` retorna janelas livres; o agente sugere 2‑3 slots.
3. Usuário confirma → `appointments:create` + `MCP:calendar.createEvent` e mensagem de confirmação no WhatsApp.

---

## 15) n8n vs Convex/EventBridge — decisão prática

**Quando usar Convex + EventBridge (recomendado como *****default*****)**

- Passos **latência‑crítica** (responder no WhatsApp; SLA de segundos).
- Fluxos **com estado transacional** (atualizar sessão/mensagens/score de forma atômica).
- **Versionamento** e **idempotência** centralizados.

**Quando usar n8n (acoplado via eventos/webhooks)**

- Integrações **não críticas** e de **longa duração** (CRM sync, enrichment, notificações e relatórios).
- **Orquestrações visuais** que mudam muito (time de negócio mexe sem deploy).

**Arquitetura híbrida sugerida**

- Convex emite `session.updated.v1` / `ai.response.generated.v1` no **EventBridge**.
- **Regra** → **API Destination** para um `Webhook n8n` (com HMAC).
- n8n executa automações (ex.: criar oportunidade no CRM).
- Se n8n precisar **voltar** algo ao core (ex.: marcar *qualified*), chama uma **API protegida** nossa (`/api/internal/...`) ou mutation Convex via **Service Token**.

---

## 16) Schemas e Snippets atualizados

### 16.1 `whatsapp_accounts` (suporte a instanceId e token)

```ts
whatsapp_accounts: defineTable({
  orgId: "string",
  provider: "string",         // "evolution"
  instanceId: "string",        // identifica a instância/canal
  phoneNumber: "string",
  webhookSecret: "string",     // para HMAC (quando disponível)
  sharedToken: "string",       // fallback token simples (Gate)
  baseUrl: "string",
  token: "string",
}).index("by_instance", ["instanceId"]).index("by_phone", ["phoneNumber"]).index("by_org", ["orgId"])
```

### 16.2 Mutation `webhooks.ingestWebhook` (args estendidos)

```ts
args: { raw: v.string(), instanceId: v.string(), token: v.string() }
```

- Dentro do handler: valida `sharedToken` consultando `whatsapp_accounts.by_instance`.

### 16.3 `ai.generateAiReply` usando `gemini-2.0-flash`

```ts
const res = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key="+process.env.GEMINI_API_KEY,{
  method:"POST",
  headers:{"Content-Type":"application/json"},
  body: JSON.stringify({ contents: buildSpinConversation(msgs, prompt) })
});
```

---

## 17) Próximos passos (técnicos)

1. Criar coleções novas/índices (schema §3 + §16).
2. Implementar **ingestWebhook** com `instanceId` + `sharedToken` e idempotência.
3. Implementar actions `ai.generateAiReply` (Gemini 2.0 Flash) e `wa.sendMessage`.
4. Subir **MCP Google** (Calendar) e guardar credenciais por org.
5. Configurar EventBridge + regra → n8n (se adotarmos híbrido).
6. UI: `/inbox`, `/sessions`, `/settings/{whatsapp,ai,organization}`.

---

## 18) Pacote de *defaults* para você não precisar decidir nada agora

> Se você disser “pode seguir com os defaults”, eu já gero o boilerplate com tudo abaixo.

### 18.1 Mapeamento multi-tenant (default)

- Cada **conta WhatsApp** (Evolution) vira um `` com:
  - `instanceId`: `wa-<nnnn>` (string simples que você configura no Evolution e repete no nosso webhook).
  - `phoneNumber`: no formato **E.164** (ex.: `+5511999999999`).
  - `sharedToken`: gerado por nós (32 chars) e colocado **tanto** no Evolution **quanto** no nosso `.env`.
- **Roteamento**: `instanceId` → `whatsapp_accounts.by_instance` → `orgId`.

### 18.2 Webhook Evolution (default)

- Endpoint: `POST /api/webhook/whatsapp?instanceId=<id>&token=<sharedToken>`
- Se a Evolution suportar assinatura HMAC no futuro: ativamos `webhookSecret` por conta, sem mudar o endpoint.

### 18.3 Google Calendar via MCP (default)

- Escopos: `https://www.googleapis.com/auth/calendar`.
- Guardamos as credenciais OAuth por **org** (Convex `google_credentials`).
- Calendário padrão: o **primeiro** com permissão de escrita; pode ser alterado em `/settings/organization`.

### 18.4 SPIN Selling (default)

- Começa em `situation` → avança quando coletar **2 respostas** válidas por etapa.
- `score` = 25 por etapa concluída + bônus por *keywords* (orçamento, urgência, decisor).
- `qualified` quando `score ≥ 70` → agente sugere **3 horários** (MCP).

### 18.5 n8n (default)

- Criamos um **Webhook n8n** `POST /webhooks/crm-sync`.
- Regra no EventBridge: `detailType in ["session.updated.v1","ai.response.generated.v1"]` → envia para esse webhook com HMAC (`X-Signature` + secret).

---

## 19) Arquivos que vou gerar (boilerplate)

- `apps/web` (Next.js + Clerk) com rotas `/inbox`, `/sessions`, `/settings/*`, `/api/webhook/whatsapp` e `/api/health`.
- `convex/` com `schema.ts`, `webhooks.ts`, `ai.ts`, `wa.ts`, `audit.ts`.
- `packages/agent` com **cliente Gemini 2.0 Flash** e **tool router** para MCP Google.
- `packages/infra` com **EventBridge** e **S3** utils.
- `n8n/` com blueprint do fluxo padrão (CRM sync stub).

### 19.1 `.env.example` (default)

```
# Next/Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
CLERK_SECRET_KEY=sk_test_xxx

# Convex
CONVEX_DEPLOYMENT=dev
CONVEX_AUTH_SITE_URL=http://localhost:3000

# Evolution (WhatsApp)
EVOLUTION_BASE_URL=https://api.evolution.example
EVOLUTION_SHARED_TOKEN=change_me_32chars
EVOLUTION_INSTANCE_ID=wa-0001

# Gemini
GEMINI_API_KEY=AIzaSy...
GEMINI_MODEL=gemini-2.0-flash

# AWS
AWS_REGION=us-east-1
EVENTBUS_NAME=sdr-agent
S3_BUCKET=sdr-agent-media

# Google OAuth (MCP)
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
GOOGLE_REDIRECT_URI=http://localhost:3000/api/oauth/google/callback

# n8n
N8N_WEBHOOK_URL=https://n8n.example/webhook/crm-sync
N8N_WEBHOOK_SECRET=supersecret
```

### 19.2 *Seed* inicial (org + conta WhatsApp)

```ts
// scripts/seed.ts
await db.insert("organizations", { name: "Org Demo", clerkOrgId: "org_demo", billingPlan: "trial", createdAt: Date.now() });
await db.insert("whatsapp_accounts", { orgId: org._id, provider: "evolution", instanceId: process.env.EVOLUTION_INSTANCE_ID!, phoneNumber: "+5511999999999", sharedToken: process.env.EVOLUTION_SHARED_TOKEN!, baseUrl: process.env.EVOLUTION_BASE_URL!, token: "evo_api_token" });
```

---

## 20) Como você pode me destravar com o mínimo esforço

- Diga apenas: **“pode seguir com os defaults e gerar o repo base”**.
- Se já tiver um **número/instância** de WhatsApp, me passe **(a)** `phoneNumber` e **(b)** um nome para `instanceId` (ex.: `wa-0001`).
- Se já tiver a conta Google para agenda, me diga só **o e‑mail**; eu já preparo o fluxo OAuth.

> Com isso, eu te devolvo: **repo inicial** + **checklist de deploy** (Vercel + Convex + AWS) e você já consegue testar o webhook end‑to‑end.

---

## 21) Google OAuth por usuário (escolher agenda/conta) — fluxo completo

**Requisito que você confirmou:** a autenticação deve ocorrer para que **o usuário escolha a conta/agenda correta**. Suportaremos **multi-tenant** e **multi-conta** por tenant.

### 21.1 Objetos/coleções adicionais

- `google_credentials`

```ts
// convex/schema.ts (add)
google_credentials: defineTable({
  orgId: "string",      // tenant
  userId: "string",     // Clerk user (quem conectou)
  provider: "string",   // "google"
  accessToken: "string", // criptografado (KMS/Vercel)
  refreshToken: "string",
  expiryDate: "number",
  scopes: "string",
  email: "string",      // conta Google autenticada
  createdAt: "number",
}).index("by_org", ["orgId"]).index("by_org_user", ["orgId", "userId"]).index("by_email", ["email"]) 
```

- `organization_settings` (separação de preferências)

```ts
organization_settings: defineTable({
  orgId: "string",
  defaultCalendarId: "string", // o escolhido pelo admin
  meetingDurationMin: "number", // 15/30/etc
  timezone: "string",
}).index("by_org", ["orgId"]) 
```

### 21.2 Rotas Next.js para OAuth

- `GET /api/oauth/google/start` → inicia OAuth (state = `{ orgId, userId }`).
- `GET /api/oauth/google/callback` → troca *code* por tokens, salva em `google_credentials` e redireciona para `/settings/organization/google?connected=1`.

**Snippets**

```ts
// app/api/oauth/google/start/route.ts
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs";

export async function GET(req: NextRequest) {
  const { orgId, userId } = auth();
  if (!orgId || !userId) return NextResponse.redirect(new URL("/sign-in", req.url));

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: "https://www.googleapis.com/auth/calendar",
    state: Buffer.from(JSON.stringify({ orgId, userId })).toString("base64")
  });
  return NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}
```

```ts
// app/api/oauth/google/callback/route.ts
import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { getConvexClient } from "@/lib/convexServer";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = JSON.parse(Buffer.from(url.searchParams.get("state")||"", "base64").toString());
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });

  const tokenRes = await fetch("https://oauth2.googleapis.com/token",{
    method:"POST",
    headers:{"Content-Type":"application/x-www-form-urlencoded"},
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: process.env.GOOGLE_REDIRECT_URI!,
      grant_type: "authorization_code"
    })
  });
  const tokens = await tokenRes.json();

  const userinfoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo",{
    headers:{ Authorization: `Bearer ${tokens.access_token}` }
  });
  const userinfo = await userinfoRes.json();

  const convex = getConvexClient();
  await convex.mutation(api.google.saveCredentials, {
    orgId: state.orgId,
    userId: state.userId,
    email: userinfo.email,
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiryDate: Date.now() + (tokens.expires_in*1000),
    scopes: "calendar"
  });

  return NextResponse.redirect(new URL("/settings/organization/google?connected=1", req.url));
}
```

**Mutation**

```ts
// convex/google.ts
import { mutation } from "convex/server"; import { v } from "convex/values";
export const saveCredentials = mutation({
  args: { orgId: v.string(), userId: v.string(), email: v.string(), accessToken: v.string(), refreshToken: v.string(), expiryDate: v.number(), scopes: v.string() },
  handler: async (ctx, a) => {
    // TODO: criptografar tokens antes de salvar
    await ctx.db.insert("google_credentials", { ...a, provider: "google", createdAt: Date.now() });
  }
});
```

### 21.3 Escolha da agenda (UI)

- Página `/settings/organization/google`:
  1. Botão **“Conectar Google”** → `/api/oauth/google/start`.
  2. Após conectar, **listar agendas** (via MCP `calendar.listCalendars()`).
  3. Usuário escolhe uma → salvamos em `organization_settings.defaultCalendarId`.

**Query/mutation**

```ts
// convex/organization.ts
export const setDefaultCalendar = mutation({
  args: { orgId: v.string(), calendarId: v.string() },
  handler: async (ctx, { orgId, calendarId }) => {
    const existing = await ctx.db.query("organization_settings").withIndex("by_org", q=>q.eq("orgId", orgId)).first();
    if (existing) await ctx.db.patch(existing._id, { defaultCalendarId: calendarId });
    else await ctx.db.insert("organization_settings", { orgId, defaultCalendarId: calendarId, meetingDurationMin: 30, timezone: "UTC" });
  }
});
```

### 21.4 Uso em runtime (agendamento)

- Actions chamam **MCP Google** com os **tokens do usuário conector** (ou o primeiro válido do org).
- Preferência: usar `organization_settings.defaultCalendarId`.

---

## 22) InstanceId: padrão aceito

- Vamos usar o padrão que você sugeriu: ``, `wa-0002`, …
- Você configura esse `instanceId` no Evolution e no **seed** do nosso `whatsapp_accounts`.
- O webhook aceita `?instanceId=wa-0001&token=<sharedToken>` ou `X-Instance-Id` e `X-Webhook-Token` no header.

---

## 23) Checklist para eu gerar o repo já funcional

- ✅ Padrão de **instanceId** aprovado
- ✅ Google OAuth deve permitir **escolha de agenda/conta** por usuário (UI pronta)
- ✅ Gemini `gemini-2.0-flash`

Se estiver ok, responda **“pode seguir e gerar o repo base”** que eu preparo tudo no canvas (estrutura, arquivos e `.env.example`) pra você copiar/colar e subir.

