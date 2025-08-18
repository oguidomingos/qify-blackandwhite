import { v } from "convex/values";
import { action, internalAction, internalQuery, mutation, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

export const sendMessage = internalAction({
  args: {
    orgId: v.id("organizations"),
    to: v.string(), // Phone number
    text: v.string(),
    media: v.optional(v.object({
      url: v.string(),
      type: v.string(),
    })),
  },
  handler: async (ctx: any, { orgId, to, text, media }: any) => {
    // Get WhatsApp account for this org, create if doesn't exist
    let account = await ctx.runQuery(internal.wa.queryAccountByOrg, { orgId });
    
    if (!account) {
      console.log("No WhatsApp account found, creating one for org:", orgId);
      await ctx.runMutation(internal.wa.ensureAccountExists, { orgId });
      account = await ctx.runQuery(internal.wa.queryAccountByOrg, { orgId });
      
      if (!account) {
        throw new Error("Failed to create WhatsApp account for organization");
      }
    }

    // Clean phone number and ensure correct format
    const cleanNumber = to.replace('@s.whatsapp.net', '');
    const payload: any = {
      number: `${cleanNumber}@s.whatsapp.net`,
      text,
    };

    if (media) {
      payload.media = {
        mediatype: media.type,
        media: media.url,
      };
    }

    try {
      const response = await fetch(`${account.baseUrl}/message/sendText/${account.instanceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": account.token,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WhatsApp API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      
      // Log successful send
      console.log("Message sent successfully:", result);
      
      return result;
      
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      throw error;
    }
  },
});

export const queryAccountByOrg = internalQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx: any, { orgId }: any) => {
    return await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .first();
  },
});

export const getByOrg = internalQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx: any, { orgId }: any) => {
    return await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();
  },
});

export const getByInstance = query({
  args: { instanceName: v.string() },
  handler: async (ctx: any, { instanceName }: any) => {
    return await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_instance_name", (q: any) => q.eq("instanceName", instanceName))
      .first();
  },
});

export const getByInstanceInternal = internalQuery({
  args: { instanceName: v.string() },
  handler: async (ctx: any, { instanceName }: any) => {
    return await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_instance_name", (q: any) => q.eq("instanceName", instanceName))
      .first();
  },
});

export const updateQrCode = mutation({
  args: {
    accountId: v.id("whatsapp_accounts"),
    qrCode: v.string(),
    lastQrAt: v.number(),
    status: v.string(),
  },
  handler: async (ctx: any, { accountId, qrCode, lastQrAt, status }: any) => {
    await ctx.db.patch(accountId, {
      qrCode,
      lastQrAt,
      status,
    });
    
    return { success: true };
  },
});

export const updateWebhookTest = mutation({
  args: {
    accountId: v.id("whatsapp_accounts"),
    lastWebhookTestAt: v.number(),
    webhookVerified: v.boolean(),
  },
  handler: async (ctx: any, { accountId, lastWebhookTestAt, webhookVerified }: any) => {
    await ctx.db.patch(accountId, {
      lastWebhookTestAt,
      webhookVerified,
    });
    
    return { success: true };
  },
});

export const updateStatus = mutation({
  args: {
    instanceId: v.string(),
    status: v.string(),
  },
  handler: async (ctx: any, { instanceId, status }: any) => {
    const account = await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_instance", (q: any) => q.eq("instanceId", instanceId))
      .first();
    
    if (account) {
      await ctx.db.patch(account._id, {
        status,
      });
    }
    
    return { success: true };
  },
});

export const createAccount = mutation({
  args: {
    orgId: v.id("organizations"),
    instanceId: v.string(),
    instanceName: v.string(),
    phoneNumber: v.string(),
    baseUrl: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx: any, { orgId, instanceId, instanceName, phoneNumber, baseUrl, token }: any) => {
    // Check if account already exists
    const existing = await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new account
    return await ctx.db.insert("whatsapp_accounts", {
      orgId,
      provider: "evolution",
      instanceId,
      instanceName,
      phoneNumber,
      status: "pending", // NEW: Initial status
      qrCode: undefined, // NEW: Will be set when QR is generated
      lastQrAt: undefined, // NEW: Will be set when QR is generated
      lastWebhookTestAt: undefined, // NEW: Will be set when webhook is tested
      webhookVerified: false, // NEW: Initially not verified
      webhookSecret: "",
      sharedToken: token || process.env.EVOLUTION_API_TOKEN || "",
      baseUrl: baseUrl || process.env.EVOLUTION_API_URL || "https://evolution-api.cloud",
      token: token || process.env.EVOLUTION_API_TOKEN || "",
      createdAt: Date.now(),
    });
  },
});

export const ensureAccountExists = internalMutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx: any, { orgId }: any) => {
    // Check if account already exists
    const existing = await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .first();

    if (existing) {
      // Update existing account with current environment variables
      await ctx.db.patch(existing._id, {
        baseUrl: process.env.EVOLUTION_API_URL || "https://evolution-api.cloud",
        token: process.env.EVOLUTION_API_TOKEN || "",
        sharedToken: process.env.EVOLUTION_API_TOKEN || "",
      });
      return existing._id;
    }

    // Create default account - we'll use the org phone number from agent config
    const agentConfig = await ctx.db
      .query("agent_configurations") 
      .filter((q: any) => q.eq(q.field("orgId"), orgId))
      .first();

    const phoneNumber = agentConfig?.phoneNumber || "5561999449983"; // fallback
    const instanceId = `qify-${phoneNumber}`;
    const instanceName = `WhatsApp ${phoneNumber}`;

    return await ctx.db.insert("whatsapp_accounts", {
      orgId,
      provider: "evolution",
      instanceId,
      instanceName,
      phoneNumber,
      status: "pending", // NEW: Initial status
      qrCode: undefined, // NEW: Will be set when QR is generated
      lastQrAt: undefined, // NEW: Will be set when QR is generated
      lastWebhookTestAt: undefined, // NEW: Will be set when webhook is tested
      webhookVerified: false, // NEW: Initially not verified
      webhookSecret: "",
      sharedToken: process.env.EVOLUTION_API_TOKEN || "",
      baseUrl: process.env.EVOLUTION_API_URL || "https://evolution-api.cloud",
      token: process.env.EVOLUTION_API_TOKEN || "",
      createdAt: Date.now(),
    });
  },
});