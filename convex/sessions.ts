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
      .withIndex("by_org_last", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(50);
  },
});