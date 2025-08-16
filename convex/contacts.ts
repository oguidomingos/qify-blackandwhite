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
      .withIndex("by_org_last", (q: any) => q.eq("orgId", orgId))
      .order("desc")
      .take(50);
  },
});

export const getByExternalId = query({
  args: { 
    externalId: v.string(),
    orgId: v.id("organizations")
  },
  handler: async (ctx: any, { externalId, orgId }: any) => {
    return await ctx.db
      .query("contacts")
      .withIndex("by_org_external", (q: any) => q.eq("orgId", orgId).eq("externalId", externalId))
      .first();
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    name: v.string(),
    channel: v.string(),
    externalId: v.string()
  },
  handler: async (ctx: any, args: any) => {
    return await ctx.db.insert("contacts", {
      ...args,
      createdAt: Date.now(),
      lastMessageAt: Date.now()
    });
  },
});