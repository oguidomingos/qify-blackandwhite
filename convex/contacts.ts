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

export const upsertFromEvolution = mutation({
  args: {
    orgId: v.id("organizations"),
    evolutionData: v.any()
  },
  handler: async (ctx: any, { orgId, evolutionData }: any) => {
    const externalId = evolutionData.id || evolutionData.remoteJid;
    
    // Check if contact already exists
    const existing = await ctx.db
      .query("contacts")
      .withIndex("by_org_external", (q: any) => q.eq("orgId", orgId).eq("externalId", externalId))
      .first();
    
    const contactData = {
      orgId,
      name: evolutionData.pushName || evolutionData.name || externalId.split('@')[0],
      channel: "whatsapp",
      externalId,
      lastMessageAt: evolutionData.lastMessageTimestamp || Date.now(),
      createdAt: evolutionData.createdAt || Date.now()
    };
    
    if (existing) {
      // Update existing contact
      await ctx.db.patch(existing._id, {
        name: contactData.name,
        lastMessageAt: contactData.lastMessageAt
      });
      return existing._id;
    } else {
      // Create new contact
      return await ctx.db.insert("contacts", contactData);
    }
  },
});