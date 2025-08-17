import { v } from "convex/values";
import { query, mutation, internalQuery, internalMutation } from "./_generated/server";

export const getById = internalQuery({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx: any, { sessionId }: any) => {
    return await ctx.db.get(sessionId);
  },
});

export const updateVariables = internalMutation({
  args: {
    sessionId: v.id("sessions"),
    variables: v.object({
      spin: v.optional(
        v.object({
          situation: v.object({
            answers: v.array(v.string()),
            completed: v.boolean(),
            lastAt: v.number(),
          }),
          problem: v.object({
            answers: v.array(v.string()),
            completed: v.boolean(),
            lastAt: v.number(),
          }),
          implication: v.object({
            answers: v.array(v.string()),
            completed: v.boolean(),
            lastAt: v.number(),
          }),
          needPayoff: v.object({
            answers: v.array(v.string()),
            completed: v.boolean(),
            lastAt: v.number(),
          }),
          score: v.number(),
          stage: v.string(),
          summary: v.optional(v.string()),
        })
      ),
      collectedData: v.optional(
        v.object({
          name: v.array(v.string()),
          personType: v.array(v.string()),
          business: v.array(v.string()),
          contact: v.array(v.string()),
          lastUpdated: v.number(),
        })
      ),
    }),
  },
  handler: async (ctx: any, { sessionId, variables }: any) => {
    await ctx.db.patch(sessionId, { variables });
  },
});

export const listByOrg = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx: any, { orgId }: any) => {
    return await ctx.db
      .query("sessions")
      .withIndex("by_org_last", (q: any) => q.eq("orgId", orgId))
      .order("desc")
      .take(50);
  },
});

export const getActiveByContact = query({
  args: { contactId: v.id("contacts") },
  handler: async (ctx: any, { contactId }: any) => {
    return await ctx.db
      .query("sessions")
      .filter((q: any) => q.and(
        q.eq(q.field("contactId"), contactId),
        q.eq(q.field("status"), "active")
      ))
      .first();
  },
});

export const create = mutation({
  args: {
    contactId: v.id("contacts"),
    orgId: v.id("organizations"),
    channel: v.string(),
    status: v.string()
  },
  handler: async (ctx: any, args: any) => {
    const now = Date.now();
    return await ctx.db.insert("sessions", {
      orgId: args.orgId,
      contactId: args.contactId,
      stage: "situation", // Default SPIN stage
      status: args.status,
      variables: {},
      lastActivityAt: now,
      createdAt: now,
      processingLock: false,
      lastProcessedAt: 0
    });
  },
});

export const checkAndSetProcessing = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx: any, { sessionId }: any) => {
    const session = await ctx.db.get(sessionId);
    if (!session) return false;
    
    // Get AI configuration for dynamic timeout and cooldown values
    const aiConfig = await ctx.db
      .query("ai_configurations")
      .withIndex("by_org", (q: any) => q.eq("orgId", session.orgId))
      .first();
    
    // Use dynamic values or fallback to defaults
    const PROCESSING_TIMEOUT = aiConfig?.processingTimeoutMs || 30000; // 30 seconds default
    const COOLDOWN_MS = aiConfig?.cooldownMs || 5000; // 5 seconds default
    
    const now = Date.now();
    
    // Check if already processing and not timed out
    if (session.processingLock && 
        session.lastProcessedAt && 
        (now - session.lastProcessedAt) < PROCESSING_TIMEOUT) {
      console.log('Session already being processed');
      return false;
    }
    
    // Check cooldown period
    if (session.lastProcessedAt && (now - session.lastProcessedAt) < COOLDOWN_MS) {
      console.log(`Session in cooldown period: ${Math.round((now - session.lastProcessedAt)/1000)}s`);
      return false;
    }
    
    // Set processing lock
    await ctx.db.patch(sessionId, {
      processingLock: true,
      lastProcessedAt: now
    });
    
    return true;
  },
});

export const resetProcessing = mutation({
  args: { sessionId: v.id("sessions") },
  handler: async (ctx: any, { sessionId }: any) => {
    await ctx.db.patch(sessionId, {
      processingLock: false
    });
  },
});