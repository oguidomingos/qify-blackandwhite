import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";

export const listBySession = internalQuery({
  args: {
    sessionId: v.id("sessions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx: any, { sessionId, limit = 50 }: any) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_session_time", (q) => q.eq("sessionId", sessionId))
      .order("asc")
      .take(limit);
  },
});

export const insertOutbound = internalMutation({
  args: {
    orgId: v.id("organizations"),
    sessionId: v.id("sessions"),
    contactId: v.id("contacts"),
    text: v.string(),
  },
  handler: async (ctx: any, { orgId, sessionId, contactId, text }: any) => {
    return await ctx.db.insert("messages", {
      orgId,
      sessionId,
      contactId,
      direction: "outbound",
      text,
      providerMessageId: `ai-${Date.now()}-${Math.random()}`,
      createdAt: Date.now(),
    });
  },
});

export const listByOrgRecent = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx: any, { orgId }: any) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_org_time", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(100);
  },
});