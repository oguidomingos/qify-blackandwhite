import { v } from "convex/values";
import { query } from "./_generated/server";

export const getTodayMessages = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfDay = today.getTime();
    
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_org_time", (q) => 
        q.eq("orgId", orgId).gte("createdAt", startOfDay)
      )
      .collect();

    const inbound = messages.filter(m => m.direction === "inbound").length;
    const outbound = messages.filter(m => m.direction === "outbound").length;

    return {
      total: messages.length,
      inbound,
      outbound,
      date: today.toISOString(),
    };
  },
});

export const getActiveContacts = query({
  args: { 
    orgId: v.id("organizations"), 
    days: v.optional(v.number()) // Default to 7 days
  },
  handler: async (ctx, { orgId, days = 7 }) => {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const contacts = await ctx.db
      .query("contacts")
      .withIndex("by_org_last", (q) => 
        q.eq("orgId", orgId).gte("lastMessageAt", cutoffTime)
      )
      .collect();

    return {
      count: contacts.length,
      days,
      cutoffTime,
      contacts: contacts.map(c => ({
        id: c._id,
        name: c.name,
        lastMessageAt: c.lastMessageAt,
        externalId: c.externalId,
      })),
    };
  },
});

export const getActiveSessions = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_org_last", (q) => q.eq("orgId", orgId))
      .filter((q) => q.eq(q.field("status"), "active"))
      .collect();

    return {
      count: sessions.length,
      sessions: sessions.map(s => ({
        id: s._id,
        contactId: s.contactId,
        stage: s.stage,
        lastActivityAt: s.lastActivityAt,
        spinScore: s.variables.spin?.score || 0,
      })),
    };
  },
});

export const getConfiguredResponseTime = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    const config = await ctx.db
      .query("ai_configurations")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();

    if (!config) {
      return {
        batchingDelayMs: 60000, // Default 60 seconds
        cooldownMs: 20000, // Default 20 seconds
        processingTimeoutMs: 30000, // Default 30 seconds
        maxMessagesContext: 20, // Default 20 messages
        configured: false,
      };
    }

    return {
      batchingDelayMs: config.batchingDelayMs,
      cooldownMs: config.cooldownMs,
      processingTimeoutMs: config.processingTimeoutMs,
      maxMessagesContext: config.maxMessagesContext,
      configured: true,
      updatedAt: config.updatedAt,
    };
  },
});

export const getDashboardOverview = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    // Get all metrics in parallel for faster loading
    const [todayMessages, activeContacts, activeSessions, responseConfig] = await Promise.all([
      ctx.runQuery("metrics:getTodayMessages", { orgId }) as any,
      ctx.runQuery("metrics:getActiveContacts", { orgId }) as any,
      ctx.runQuery("metrics:getActiveSessions", { orgId }) as any,
      ctx.runQuery("metrics:getConfiguredResponseTime", { orgId }) as any,
    ]);

    return {
      todayMessages,
      activeContacts,
      activeSessions,
      responseConfig,
      lastUpdated: Date.now(),
    };
  },
});

export const getMessageStats = query({
  args: { 
    orgId: v.id("organizations"),
    days: v.optional(v.number()) // Default to 7 days
  },
  handler: async (ctx, { orgId, days = 7 }) => {
    const cutoffTime = Date.now() - (days * 24 * 60 * 60 * 1000);
    
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_org_time", (q) => 
        q.eq("orgId", orgId).gte("createdAt", cutoffTime)
      )
      .collect();

    // Group by day
    const dailyStats = new Map();
    
    messages.forEach(message => {
      const day = new Date(message.createdAt).toISOString().split('T')[0];
      if (!dailyStats.has(day)) {
        dailyStats.set(day, { inbound: 0, outbound: 0, total: 0 });
      }
      
      const stats = dailyStats.get(day);
      stats.total++;
      if (message.direction === "inbound") {
        stats.inbound++;
      } else {
        stats.outbound++;
      }
    });

    return {
      totalMessages: messages.length,
      days,
      dailyBreakdown: Array.from(dailyStats.entries()).map(([date, stats]) => ({
        date,
        ...stats,
      })).sort((a, b) => a.date.localeCompare(b.date)),
    };
  },
});

export const getSpinMetrics = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_org_last", (q) => q.eq("orgId", orgId))
      .collect();

    const spinSessions = sessions.filter(s => s.variables.spin);
    
    const stages = {
      situation: 0,
      problem: 0,
      implication: 0,
      need: 0,
      qualified: 0,
    };

    let totalScore = 0;
    let scoredSessions = 0;
    let qualifiedCount = 0;
    const qualificationThreshold = 70;

    spinSessions.forEach(session => {
      const spin = session.variables.spin;
      if (spin) {
        if (spin.stage && stages.hasOwnProperty(spin.stage)) {
          stages[spin.stage as keyof typeof stages]++;
        }
        
        if (typeof spin.score === 'number') {
          totalScore += spin.score;
          scoredSessions++;
          
          if (spin.score >= qualificationThreshold) {
            qualifiedCount++;
          }
        }
      }
    });

    const averageScore = scoredSessions > 0 ? totalScore / scoredSessions : 0;
    const conversionRate = spinSessions.length > 0 ? (qualifiedCount / spinSessions.length) * 100 : 0;

    return {
      totalSessions: spinSessions.length,
      stageBreakdown: stages,
      averageScore: Math.round(averageScore * 100) / 100,
      qualifiedCount,
      conversionRate: Math.round(conversionRate * 100) / 100,
      qualificationThreshold,
    };
  },
});