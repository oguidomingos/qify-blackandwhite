import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";

export const getByOrg = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx: QueryCtx, { clerkOrgId }: { clerkOrgId: string }) => {
    // First find the organization by Clerk ID
    const organization = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q: any) => q.eq("clerkOrgId", clerkOrgId))
      .first();
    
    if (!organization) {
      return null;
    }

    // Then find the agent configuration using the internal org ID
    return await ctx.db
      .query("agent_configurations")
      .withIndex("by_org", (q: any) => q.eq("orgId", organization._id))
      .first();
  },
});

export const upsert = mutation({
  args: {
    clerkOrgId: v.string(),
    agentName: v.string(),
    phoneNumber: v.string(),
    personality: v.optional(v.string()),
    toneOfVoice: v.string(),
    language: v.string(),
    responseTime: v.number(),
    workingHours: v.object({
      start: v.string(),
      end: v.string(),
      timezone: v.string(),
      workDays: v.array(v.string()),
    }),
  },
  handler: async (ctx: MutationCtx, args: any) => {
    const { clerkOrgId, ...data } = args;
    
    // First find the organization by Clerk ID
    let organization = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q: any) => q.eq("clerkOrgId", clerkOrgId))
      .first();
    
    // Create organization if it doesn't exist
    if (!organization) {
      const organizationId = await ctx.db.insert("organizations", {
        name: data.agentName ? `Empresa do ${data.agentName}` : "Nova Empresa",
        clerkOrgId,
        billingPlan: "starter",
        onboardingStep: "agent",
        onboardingCompleted: false,
        createdAt: Date.now(),
      });
      
      organization = await ctx.db.get(organizationId);
      if (!organization) {
        throw new Error("Failed to create organization");
      }
    }
    
    const existing = await ctx.db
      .query("agent_configurations")
      .withIndex("by_org", (q: any) => q.eq("orgId", organization._id))
      .first();

    const now = Date.now();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        agentName: data.agentName,
        phoneNumber: data.phoneNumber || existing.phoneNumber || "",
        personality: data.personality,
        toneOfVoice: data.toneOfVoice,
        language: data.language,
        responseTime: data.responseTime,
        workingHours: data.workingHours,
        updatedAt: now,
      });
    } else {
      return await ctx.db.insert("agent_configurations", {
        orgId: organization._id,
        agentName: data.agentName,
        phoneNumber: data.phoneNumber || "",
        personality: data.personality,
        toneOfVoice: data.toneOfVoice,
        language: data.language,
        responseTime: data.responseTime,
        workingHours: data.workingHours,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const listAll = query({
  handler: async (ctx: any) => {
    return await ctx.db.query("agent_configurations").collect();
  },
});

export const updateSettings = mutation({
  args: {
    orgId: v.id("organizations"),
    responseTime: v.optional(v.number()),
    personality: v.optional(v.string()),
    language: v.optional(v.string()),
    toneOfVoice: v.optional(v.string()),
  },
  handler: async (ctx, { orgId, responseTime, personality, language, toneOfVoice }) => {
    const config = await ctx.db
      .query("agent_configurations")
      .filter((q) => q.eq(q.field("orgId"), orgId))
      .first();
    
    if (!config) {
      throw new Error("Agent configuration not found");
    }
    
    const updates: any = {
      updatedAt: Date.now(),
    };
    
    if (responseTime !== undefined) updates.responseTime = responseTime;
    if (personality !== undefined) updates.personality = personality;
    if (language !== undefined) updates.language = language;
    if (toneOfVoice !== undefined) updates.toneOfVoice = toneOfVoice;
    
    return await ctx.db.patch(config._id, updates);
  },
});