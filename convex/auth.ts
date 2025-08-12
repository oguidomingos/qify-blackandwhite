import { v }: any from "convex/values";
import { query, mutation }: any from "./_generated/server";

export const getOrganization = query({
  args: { clerkOrgId: v.string() }: any,
  handler: async (ctx: any, { clerkOrgId }: any) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", clerkOrgId))
      .first();
  },
});

export const createOrganization = mutation({
  args: {
    name: v.string(),
    clerkOrgId: v.string(),
    billingPlan: v.optional(v.string()),
  },
  handler: async (ctx: any, { name, clerkOrgId, billingPlan = "trial" }: any) => {
    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", clerkOrgId))
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("organizations", {
      name,
      clerkOrgId,
      billingPlan,
      createdAt: Date.now(),
    });
  },
});

export const getOrganizationByClerkId = query({
  args: { clerkOrgId: v.string() }: any,
  handler: async (ctx: any, { clerkOrgId }: any) => {
    return await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", clerkOrgId))
      .first();
  },
});