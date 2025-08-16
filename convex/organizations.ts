import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";

export const getByClerkId = query({
  args: { clerkOrgId: v.string() },
  handler: async (ctx, { clerkOrgId }) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q: any) => q.eq("clerkOrgId", clerkOrgId))
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
    // For now, we'll find organization by matching the instance name pattern
    // instanceName format: qify-{phoneNumber}
    const phoneNumber = instanceName.replace('qify-', '');
    
    console.log('Looking for phone number:', phoneNumber);
    
    // Try to find organization by phone number in agent configurations
    const agentConfigs = await ctx.db
      .query("agent_configurations")
      .collect();
    
    console.log('Found agent configs:', agentConfigs.length);
    
    for (const config of agentConfigs) {
      const configPhone = config.phoneNumber?.replace(/[^\d]/g, '');
      console.log(`Comparing ${configPhone} with ${phoneNumber}`);
      
      if (configPhone === phoneNumber) {
        console.log('Found matching config, getting org:', config.orgId);
        const org = await ctx.db.get(config.orgId);
        return org;
      }
    }
    
    return null;
  },
});