import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByOrg = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    return await ctx.db
      .query("organization_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
  },
});

export const upsert = mutation({
  args: {
    orgId: v.id("organizations"),
    defaultCalendarId: v.optional(v.string()),
    meetingDurationMin: v.optional(v.number()),
    timezone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId, ...data } = args;
    
    const existing = await ctx.db
      .query("organization_settings")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();

    const now = Date.now();

    if (existing) {
      return await ctx.db.patch(existing._id, {
        ...data,
        updatedAt: now,
      });
    } else {
      return await ctx.db.insert("organization_settings", {
        orgId,
        defaultCalendarId: data.defaultCalendarId,
        meetingDurationMin: data.meetingDurationMin || 30,
        timezone: data.timezone || "America/Sao_Paulo",
        updatedAt: now,
      });
    }
  },
});