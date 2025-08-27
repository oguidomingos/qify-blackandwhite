import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";

export const getByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q: any) => q.eq("clerkOrgId", clerkId))
      .first();
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    clerkOrgId: v.string(),
    billingPlan: v.optional(v.string()),
  },
  handler: async (ctx, { name, clerkOrgId, billingPlan = "starter" }) => {
    return await ctx.db.insert("organizations", {
      name,
      clerkOrgId,
      billingPlan,
      onboardingStep: "business",
      onboardingCompleted: false,
      createdAt: Date.now(),
    });
  },
});

export const updateOnboardingStep = mutation({
  args: {
    orgId: v.id("organizations"),
    step: v.string(),
    completed: v.optional(v.boolean()),
  },
  handler: async (ctx, { orgId, step, completed }) => {
    const updates: any = {
      onboardingStep: step,
    };
    
    if (completed !== undefined) {
      updates.onboardingCompleted = completed;
    }
    
    return await ctx.db.patch(orgId, updates);
  },
});

export const getById = internalQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    return await ctx.db.get(orgId);
  },
});

export const getByInstanceName = query({
  args: { instanceName: v.string() },
  handler: async (ctx, { instanceName }) => {
    // instanceName can be either:
    // 1. qify-{phoneNumber} format (legacy)
    // 2. Direct instance name (new approach)
    let phoneNumber = instanceName;
    
    // If it starts with qify-, extract the phone number part
    if (instanceName.startsWith('qify-')) {
      phoneNumber = instanceName.replace('qify-', '');
    }
    
    console.log('Looking for phone number:', phoneNumber);
    
    // Try to find organization by phone number in agent configurations
    const agentConfigs = await ctx.db
      .query("agent_configurations")
      .collect();
    
    console.log('Found agent configs:', agentConfigs.length);
    
    for (const config of agentConfigs) {
      // Compare phoneNumber directly without removing non-digits
      // This allows matching both numeric phone numbers and instance names like "roigem"
      console.log(`Comparing ${config.phoneNumber} with ${phoneNumber}`);
      
      if (config.phoneNumber === phoneNumber) {
        console.log('Found matching config, getting org:', config.orgId);
        const org = await ctx.db.get(config.orgId);
        return org;
      }
    }
    
    return null;
  },
});

export const createDemo = mutation({
  args: {},
  handler: async (ctx) => {
    // Create demo organization
    const orgId = await ctx.db.insert("organizations", {
      name: "Demo Organization",
      clerkOrgId: "demo-org-qify-5561999449983",
      billingPlan: "starter",
      onboardingStep: "completed",
      onboardingCompleted: true,
      createdAt: Date.now(),
    });
    
    // Create agent configuration
    await ctx.db.insert("agent_configurations", {
      orgId: orgId,
      agentName: "SDR Agent",
      phoneNumber: "5561999449983",
      personality: "professional",
      toneOfVoice: "Profissional e consultivo",
      language: "pt-BR",
      responseTime: 3,
      workingHours: {
        start: "09:00",
        end: "18:00",
        timezone: "America/Sao_Paulo",
        workDays: ["mon", "tue", "wed", "thu", "fri"]
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Create WhatsApp account
    await ctx.db.insert("whatsapp_accounts", {
      orgId: orgId,
      provider: "evolution",
      instanceId: "qify-5561999449983",
      phoneNumber: "5561999449983",
      sharedToken: "shared_token_32_characters_long",
      baseUrl: "https://evolutionapi.centralsupernova.com.br",
      token: "509dbd54-c20c-4a5b-b889-a0494a861f5a",
      createdAt: Date.now(),
    });
    
    return { orgId, status: "success" };
  },
});

export const addWhatsAppAccount = mutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    // Create WhatsApp account for existing organization
    await ctx.db.insert("whatsapp_accounts", {
      orgId: orgId,
      provider: "evolution",
      instanceId: "qify-5561999449983",
      phoneNumber: "5561999449983",
      sharedToken: "shared_token_32_characters_long",
      baseUrl: "https://evolutionapi.centralsupernova.com.br",
      token: "509dbd54-c20c-4a5b-b889-a0494a861f5a",
      createdAt: Date.now(),
    });
    
    return { status: "success" };
  },
});

export const createForInstance = mutation({
  args: {
    instanceName: v.string(),
    name: v.string(),
    settings: v.optional(v.any())
  },
  handler: async (ctx, { instanceName, name, settings }) => {
    // Extract phone number from instance name
    const phoneNumber = instanceName.replace('qify-', '');
    
    // Create organization
    const orgId = await ctx.db.insert("organizations", {
      name: name,
      clerkOrgId: `auto-${instanceName}`,
      billingPlan: "starter",
      onboardingStep: "completed",
      onboardingCompleted: true,
      createdAt: Date.now(),
    });
    
    // Create agent configuration
    await ctx.db.insert("agent_configurations", {
      orgId: orgId,
      agentName: "SDR Agent",
      phoneNumber: phoneNumber,
      personality: "professional",
      toneOfVoice: "Profissional e consultivo",
      language: "pt-BR",
      responseTime: 3,
      workingHours: {
        start: "09:00",
        end: "18:00",
        timezone: "America/Sao_Paulo",
        workDays: ["mon", "tue", "wed", "thu", "fri"]
      },
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Create WhatsApp account
    await ctx.db.insert("whatsapp_accounts", {
      orgId: orgId,
      provider: "evolution",
      instanceId: instanceName,
      instanceName: instanceName,
      phoneNumber: phoneNumber,
      status: "connected",
      sharedToken: "shared_token_32_characters_long",
      baseUrl: "https://evolutionapi.centralsupernova.com.br",
      token: "509dbd54-c20c-4a5b-b889-a0494a861f5a",
      createdAt: Date.now(),
    });
    
    return await ctx.db.get(orgId);
  },
});

export const updateClerkAssociation = mutation({
  args: {
    orgId: v.id("organizations"),
    clerkOrgId: v.string()
  },
  handler: async (ctx, { orgId, clerkOrgId }) => {
    await ctx.db.patch(orgId, {
      clerkOrgId: clerkOrgId
    });
    
    return await ctx.db.get(orgId);
  },
});