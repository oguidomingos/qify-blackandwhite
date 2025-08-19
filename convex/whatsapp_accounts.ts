import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getByOrg = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx: any, { orgId }: any) => {
    return await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();
  },
});

export const create = mutation({
  args: {
    orgId: v.id("organizations"),
    provider: v.string(),
    instanceId: v.string(),
    instanceName: v.optional(v.string()),
    phoneNumber: v.string(),
    status: v.optional(v.string()),
    sharedToken: v.optional(v.string()),
    baseUrl: v.optional(v.string()),
    token: v.optional(v.string()),
    createdAt: v.number()
  },
  handler: async (ctx: any, args: any) => {
    return await ctx.db.insert("whatsapp_accounts", args);
  },
});

export const updateInstanceStatus = mutation({
  args: {
    orgId: v.id("organizations"),
    instanceName: v.string(),
    status: v.string(),
    lastSyncAt: v.optional(v.number())
  },
  handler: async (ctx: any, { orgId, instanceName, status, lastSyncAt }: any) => {
    // Find WhatsApp account by orgId and instanceName
    const account = await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .filter((q: any) => q.eq(q.field("instanceName"), instanceName))
      .first();
    
    if (account) {
      const updates: any = { status };
      if (lastSyncAt) {
        updates.lastSyncAt = lastSyncAt;
      }
      await ctx.db.patch(account._id, updates);
      return account._id;
    }
    
    return null;
  },
});