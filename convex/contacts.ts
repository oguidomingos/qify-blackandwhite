import { v } from "convex/values";
import { query, mutation, internalQuery } from "./_generated/server";

export const getById = internalQuery({
  args: { contactId: v.id("contacts") },
  handler: async (ctx: any, { contactId }: any) => {
    return await ctx.db.get(contactId);
  },
});

export const listByOrg = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx: any, { orgId }: any) => {
    return await ctx.db
      .query("contacts")
      .withIndex("by_org_last", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(50);
  },
});