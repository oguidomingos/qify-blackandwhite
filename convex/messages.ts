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
      .withIndex("by_session_time", (q: any) => q.eq("sessionId", sessionId))
      .order("asc")
      .take(limit);
  },
});

export const create = mutation({
  args: {
    sessionId: v.id("sessions"),
    contactId: v.id("contacts"),
    orgId: v.id("organizations"),
    direction: v.string(),
    text: v.string(),
    messageType: v.optional(v.string()),
    metadata: v.optional(v.any())
  },
  handler: async (ctx: any, args: any) => {
    return await ctx.db.insert("messages", {
      orgId: args.orgId,
      sessionId: args.sessionId,
      contactId: args.contactId,
      direction: args.direction,
      text: args.text,
      providerMessageId: args.metadata?.whatsappId || `generated-${Date.now()}-${Math.random()}`,
      createdAt: Date.now()
    });
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
      .withIndex("by_org_time", (q: any) => q.eq("orgId", orgId))
      .order("desc")
      .take(100);
  },
});