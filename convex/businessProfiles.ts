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

    // Find the business profile using the internal org ID
    return await ctx.db
      .query("business_profiles")
      .withIndex("by_org", (q: any) => q.eq("orgId", targetOrgId))
      .first();
  },
});

export const upsert = mutation({
  args: {
    clerkOrgId: v.string(),
    businessName: v.string(),
    niche: v.string(),
    services: v.array(v.string()),
    targetAudience: v.string(),
    businessDescription: v.string(),
    website: v.optional(v.string()),
    logo: v.optional(v.string()),
    materials: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { clerkOrgId, ...data } = args;
    
    // First find the organization by Clerk ID
    let organization = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q: any) => q.eq("clerkOrgId", clerkOrgId))
      .first();
    
    // Create organization if it doesn't exist
    if (!organization) {
      const organizationId = await ctx.db.insert("organizations", {
        name: data.businessName || "Nova Empresa",
        clerkOrgId,
        billingPlan: "starter",
        onboardingStep: "business",
        onboardingCompleted: false,
        createdAt: Date.now(),
      });
      
      organization = await ctx.db.get(organizationId);
      if (!organization) {
        throw new Error("Failed to create organization");
      }
    }

    const existing = await ctx.db
      .query("business_profiles")
      .withIndex("by_org", (q: any) => q.eq("orgId", organization._id))
      .first();

    const now = Date.now();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        ...data,
        updatedAt: now,
      });
    } else {
      return await ctx.db.insert("business_profiles", {
        orgId: organization._id,
        ...data,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});

export const listAll = query({
  handler: async (ctx: any) => {
    return await ctx.db.query("business_profiles").collect();
  },
});

// Alias used by debug route expecting `businessProfiles.list`
export const list = query({
  handler: async (ctx: any) => {
    return await ctx.db.query("business_profiles").collect();
  },
});
