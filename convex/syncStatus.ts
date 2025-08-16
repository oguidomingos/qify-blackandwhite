import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";

export const getByOrg = query({
  args: { 
    orgId: v.id("organizations"),
    syncType: v.optional(v.string()),
  },
  handler: async (ctx, { orgId, syncType }) => {
    let q = ctx.db.query("sync_status").withIndex("by_org_type", (q: any) => q.eq("orgId", orgId));
    
    if (syncType) {
      q = q.filter((q) => q.eq(q.field("syncType"), syncType));
    }
    
    return await q.order("desc").take(10);
  },
});

export const create = internalMutation({
  args: {
    orgId: v.id("organizations"),
    instanceId: v.string(),
    syncType: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("sync_status", {
      ...args,
      progress: {
        current: 0,
        total: 0,
        percentage: 0,
      },
      lastSyncAt: Date.now(),
    });
  },
});

export const updateProgress = mutation({
  args: {
    syncId: v.id("sync_status"),
    current: v.number(),
    total: v.number(),
    status: v.optional(v.string()),
  },
  handler: async (ctx, { syncId, current, total, status }) => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
    
    const updates: any = {
      progress: {
        current,
        total,
        percentage,
      },
      lastSyncAt: Date.now(),
    };
    
    if (status) {
      updates.status = status;
    }
    
    return await ctx.db.patch(syncId, updates);
  },
});