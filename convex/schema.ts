import { defineSchema, defineTable }: any from "convex/server";
import { v }: any from "convex/values";

export default defineSchema({
  organizations: defineTable({
    name: v.string(),
    clerkOrgId: v.string(),
    billingPlan: v.string(),
    onboardingStep: v.optional(v.string()), // "business"|"google"|"agent"|"whatsapp"|"completed"
    onboardingCompleted: v.optional(v.boolean()),
    createdAt: v.number(),
  }).index("by_clerkOrgId", ["clerkOrgId"]),

  business_profiles: defineTable({
    orgId: v.id("organizations"),
    businessName: v.string(),
    niche: v.string(),
    services: v.array(v.string()),
    targetAudience: v.string(),
    businessDescription: v.string(),
    website: v.optional(v.string()),
    logo: v.optional(v.string()),
    materials: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]),

  agent_configurations: defineTable({
    orgId: v.id("organizations"),
    agentName: v.string(),
    phoneNumber: v.optional(v.string()),
    personality: v.string(), // "professional"|"friendly"|"energetic"|"consultative"
    toneOfVoice: v.string(),
    avatar: v.optional(v.string()),
    language: v.string(), // "pt-BR"|"en-US"|"es-ES"
    responseTime: v.number(), // seconds delay for more human-like responses
    workingHours: v.object({
      start: v.string(), // "09:00"
      end: v.string(), // "18:00"
      timezone: v.string(),
      workDays: v.array(v.string()), // ["mon", "tue", "wed", "thu", "fri"]
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]),

  spin_configurations: defineTable({
    orgId: v.id("organizations"),
    stage: v.string(), // "situation"|"problem"|"implication"|"need"
    criteria: v.object({
      questions: v.array(v.string()),
      successMetrics: v.array(v.string()),
      minScore: v.number(),
      maxQuestions: v.number(),
    }),
    prompts: v.object({
      opening: v.string(),
      followUp: v.array(v.string()),
      closing: v.string(),
    }),
    customized: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_org_stage", ["orgId", "stage"]),

  evolution_instances: defineTable({
    orgId: v.id("organizations"),
    instanceName: v.string(),
    instanceId: v.string(),
    qrCode: v.optional(v.string()),
    status: v.string(), // "creating"|"qr_pending"|"connecting"|"connected"|"disconnected"|"error"
    connectionData: v.optional(v.object({
      phoneNumber: v.string(),
      profileName: v.string(),
      connectedAt: v.number(),
    })),
    webhookUrl: v.string(),
    apiCredentials: v.object({
      baseUrl: v.string(),
      apiKey: v.string(),
      sharedToken: v.string(),
    }),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastSyncAt: v.optional(v.number()),
  }).index("by_org", ["orgId"]).index("by_instance_id", ["instanceId"]),

  sync_status: defineTable({
    orgId: v.id("organizations"),
    instanceId: v.string(),
    syncType: v.string(), // "messages"|"contacts"|"full"
    status: v.string(), // "pending"|"running"|"completed"|"error"
    progress: v.object({
      current: v.number(),
      total: v.number(),
      percentage: v.number(),
    }),
    lastSyncAt: v.number(),
    nextSyncAt: v.optional(v.number()),
    errorMessage: v.optional(v.string()),
    metadata: v.optional(v.object({})),
  }).index("by_org_type", ["orgId", "syncType"]).index("by_instance", ["instanceId"]),

  whatsapp_accounts: defineTable({
    orgId: v.id("organizations"),
    provider: v.string(), // "evolution"
    instanceId: v.string(),
    phoneNumber: v.string(),
    webhookSecret: v.optional(v.string()),
    sharedToken: v.string(),
    baseUrl: v.string(),
    token: v.string(),
    createdAt: v.number(),
  })
    .index("by_instance", ["instanceId"])
    .index("by_phone", ["phoneNumber"])
    .index("by_org", ["orgId"]),

  contacts: defineTable({
    orgId: v.id("organizations"),
    channel: v.string(), // "whatsapp"
    externalId: v.string(), // WhatsApp number/ID
    name: v.optional(v.string()),
    lastMessageAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_org_external", ["orgId", "externalId"])
    .index("by_org_last", ["orgId", "lastMessageAt"]),

  sessions: defineTable({
    orgId: v.id("organizations"),
    contactId: v.id("contacts"),
    stage: v.string(), // "situation"|"problem"|"implication"|"need"|"qualified"
    status: v.string(), // "active"|"paused"|"closed"
    variables: v.object({
      spin: v.optional(
        v.object({
          situation: v.object({
            answers: v.array(v.string()),
            completed: v.boolean(),
            lastAt: v.number(),
          }),
          problem: v.object({
            answers: v.array(v.string()),
            completed: v.boolean(),
            lastAt: v.number(),
          }),
          implication: v.object({
            answers: v.array(v.string()),
            completed: v.boolean(),
            lastAt: v.number(),
          }),
          needPayoff: v.object({
            answers: v.array(v.string()),
            completed: v.boolean(),
            lastAt: v.number(),
          }),
          score: v.number(), // 0-100
          stage: v.string(),
          summary: v.optional(v.string()),
        })
      ),
    }),
    lastActivityAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_org_contact", ["orgId", "contactId"])
    .index("by_org_last", ["orgId", "lastActivityAt"]),

  messages: defineTable({
    orgId: v.id("organizations"),
    sessionId: v.id("sessions"),
    contactId: v.id("contacts"),
    direction: v.string(), // "inbound"|"outbound"
    text: v.string(),
    media: v.optional(
      v.object({
        type: v.string(),
        url: v.string(),
        s3Key: v.optional(v.string()),
      })
    ),
    providerMessageId: v.string(),
    createdAt: v.number(),
  })
    .index("by_session_time", ["sessionId", "createdAt"])
    .index("by_org_time", ["orgId", "createdAt"])
    .index("by_provider_id", ["providerMessageId"]),

  ai_prompts: defineTable({
    orgId: v.id("organizations"),
    kind: v.string(), // "spin_sdr"
    version: v.number(),
    content: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
  }).index("by_org_kind_active", ["orgId", "kind", "active"]),

  appointments: defineTable({
    orgId: v.id("organizations"),
    contactId: v.id("contacts"),
    sessionId: v.id("sessions"),
    startAt: v.number(),
    endAt: v.number(),
    source: v.string(), // "whatsapp"
    status: v.string(), // "scheduled"|"canceled"|"completed"
    googleEventId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_org_time", ["orgId", "startAt"]),

  google_credentials: defineTable({
    orgId: v.id("organizations"),
    userId: v.string(), // Clerk user ID
    provider: v.string(), // "google"
    accessToken: v.string(), // Should be encrypted
    refreshToken: v.string(),
    expiryDate: v.number(),
    scopes: v.string(),
    email: v.string(),
    createdAt: v.number(),
  })
    .index("by_org", ["orgId"])
    .index("by_org_user", ["orgId", "userId"])
    .index("by_email", ["email"]),

  organization_settings: defineTable({
    orgId: v.id("organizations"),
    defaultCalendarId: v.optional(v.string()),
    meetingDurationMin: v.number(),
    timezone: v.string(),
    updatedAt: v.number(),
  }).index("by_org", ["orgId"]),

  audit_logs: defineTable({
    orgId: v.id("organizations"),
    actorId: v.string(), // Clerk userId or "system"
    action: v.string(),
    resource: v.string(),
    meta: v.object({}),
    ts: v.number(),
    requestId: v.string(),
  }).index("by_org_ts", ["orgId", "ts"]),
});