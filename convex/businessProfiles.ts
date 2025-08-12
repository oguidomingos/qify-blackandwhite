import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByOrg = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    return await ctx.db
      .query("business_profiles")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
  },
});

export const upsert = mutation({
  args: {
    orgId: v.id("organizations"),
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
    const { orgId, ...data } = args;
    
    const existing = await ctx.db
      .query("business_profiles")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();

    const now = Date.now();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        ...data,
        updatedAt: now,
      });
    } else {
      return await ctx.db.insert("business_profiles", {
        orgId,
        ...data,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});