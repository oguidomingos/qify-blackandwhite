import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByOrg = query({
  args: { 
    clerkOrgId: v.optional(v.string()),
    orgId: v.optional(v.id("organizations"))
  },
  handler: async (ctx, { clerkOrgId, orgId }) => {
    let targetOrgId = orgId;
    
    if (clerkOrgId && !orgId) {
      // First find the organization by Clerk ID
      const organization = await ctx.db
        .query("organizations")
        .withIndex("by_clerkOrgId", (q: any) => q.eq("clerkOrgId", clerkOrgId))
        .first();
      
      if (!organization) {
        return null;
      }
      targetOrgId = organization._id;
    }
    
    if (!targetOrgId) {
      return null;
    }

    // Find the AI configuration using the internal org ID
    const config = await ctx.db
      .query("ai_configurations")
      .withIndex("by_org", (q: any) => q.eq("orgId", targetOrgId))
      .first();

    // Return default values if no config exists
    if (!config) {
      return {
        batchingDelayMs: 3000, // 3 seconds
        cooldownMs: 5000, // 5 seconds
        processingTimeoutMs: 30000, // 30 seconds
        maxMessagesContext: 20, // 20 messages
      };
    }

    return config;
  },
});

export const upsert = mutation({
  args: {
    clerkOrgId: v.optional(v.string()),
    orgId: v.optional(v.id("organizations")),
    batchingDelayMs: v.number(),
    cooldownMs: v.number(),
    processingTimeoutMs: v.number(),
    maxMessagesContext: v.number(),
  },
  handler: async (ctx, args) => {
    const { clerkOrgId, orgId, ...data } = args;
    
    let organization;
    
    if (orgId) {
      // Use internal org ID directly
      organization = await ctx.db.get(orgId);
      if (!organization) {
        throw new Error("Organization not found");
      }
    } else if (clerkOrgId) {
      // Find the organization by Clerk ID
      organization = await ctx.db
        .query("organizations")
        .withIndex("by_clerkOrgId", (q: any) => q.eq("clerkOrgId", clerkOrgId))
        .first();
      
      // Create organization if it doesn't exist
      if (!organization) {
        const organizationId = await ctx.db.insert("organizations", {
          name: "Nova Empresa",
          clerkOrgId,
          billingPlan: "starter",
          onboardingStep: "ai",
          onboardingCompleted: false,
          createdAt: Date.now(),
        });
        
        organization = await ctx.db.get(organizationId);
        if (!organization) {
          throw new Error("Failed to create organization");
        }
      }
    } else {
      throw new Error("Either clerkOrgId or orgId must be provided");
    }
    
    const existing = await ctx.db
      .query("ai_configurations")
      .withIndex("by_org", (q: any) => q.eq("orgId", organization._id))
      .first();

    const now = Date.now();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        ...data,
        updatedAt: now,
      });
    } else {
      return await ctx.db.insert("ai_configurations", {
        orgId: organization._id,
        ...data,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const getDefaults = query({
  handler: async () => {
    return {
      batchingDelayMs: 3000, // 3 seconds
      cooldownMs: 5000, // 5 seconds
      processingTimeoutMs: 30000, // 30 seconds
      maxMessagesContext: 20, // 20 messages
    };
  },
});