import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByOrg = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    return await ctx.db
      .query("agent_configurations")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
  },
});

export const upsert = mutation({
  args: {
    orgId: v.id("organizations"),
    agentName: v.string(),
    phoneNumber: v.optional(v.string()),
    personality: v.string(),
    toneOfVoice: v.string(),
    language: v.string(),
    responseTime: v.number(),
    workingHours: v.object({
      start: v.string(),
      end: v.string(),
      timezone: v.string(),
      workDays: v.array(v.string()),
    }),
    avatar: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId, ...data } = args;
    
    const existing = await ctx.db
      .query("agent_configurations")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();

    const now = Date.now();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        ...data,
        updatedAt: now,
      });
    } else {
      return await ctx.db.insert("agent_configurations", {
        orgId,
        ...data,
        createdAt: now,
        updatedAt: now,
      });
    }
  },
});