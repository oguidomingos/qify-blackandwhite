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
      .order("desc") // Most recent first - CRITICAL FIX
      .take(limit);
  },
});

export const listBySessionPublic = query({
  args: {
    sessionId: v.id("sessions"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx: any, { sessionId, limit = 50 }: any) => {
    return await ctx.db
      .query("messages")
      .withIndex("by_session_time", (q: any) => q.eq("sessionId", sessionId))
      .order("desc") // Most recent first for batching check
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

export const listRecent = query({
  args: { 
    orgId: v.id("organizations"),
    limit: v.optional(v.number()),
    cursor: v.optional(v.string()) // For pagination
  },
  handler: async (ctx, { orgId, limit = 50, cursor }) => {
    let query = ctx.db
      .query("messages")
      .withIndex("by_org_time", (q: any) => q.eq("orgId", orgId))
      .order("desc");

    if (cursor) {
      // Simple cursor implementation based on timestamp
      const cursorTime = parseInt(cursor);
      query = query.filter((q: any) => q.lt(q.field("createdAt"), cursorTime));
    }

    const messages = await query.take(limit + 1); // Get one extra to check if there are more

    const hasMore = messages.length > limit;
    const items = hasMore ? messages.slice(0, limit) : messages;
    const nextCursor = hasMore ? items[items.length - 1].createdAt.toString() : null;

    return {
      messages: items,
      nextCursor,
      hasMore,
    };
  },
});

export const getByInstance = query({
  args: { 
    instanceName: v.string(),
    limit: v.optional(v.number())
  },
  handler: async (ctx, { instanceName, limit = 10 }) => {
    // First get the WhatsApp account by instance name
    const account = await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_instance_name", (q: any) => q.eq("instanceName", instanceName))
      .first();

    if (!account) {
      return [];
    }

    // Then get recent messages for this organization
    return await ctx.db
      .query("messages")
      .withIndex("by_org_time", (q: any) => q.eq("orgId", account.orgId))
      .order("desc")
      .take(limit);
  },
});