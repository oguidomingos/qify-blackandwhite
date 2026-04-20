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
    const messageId = await ctx.db.insert("messages", {
      orgId: args.orgId,
      sessionId: args.sessionId,
      contactId: args.contactId,
      direction: args.direction,
      text: args.text,
      providerMessageId: args.metadata?.whatsappId || `generated-${Date.now()}-${Math.random()}`,
      createdAt: Date.now()
    });

    await ctx.db.patch(args.sessionId, {
      lastActivityAt: Date.now(),
    });

    await ctx.db.patch(args.contactId, {
      lastMessageAt: Date.now(),
    });

    return messageId;
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
    const now = Date.now();
    const messageId = await ctx.db.insert("messages", {
      orgId,
      sessionId,
      contactId,
      direction: "outbound",
      text,
      providerMessageId: `ai-${Date.now()}-${Math.random()}`,
      createdAt: now,
    });

    await ctx.db.patch(sessionId, {
      lastActivityAt: now,
    });

    await ctx.db.patch(contactId, {
      lastMessageAt: now,
    });

    return messageId;
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

export const listForOrg = query({
  args: {
    orgId: v.id("organizations"),
    limit: v.optional(v.number()),
    period: v.optional(v.string()),
    contactExternalId: v.optional(v.string()),
  },
  handler: async (ctx, { orgId, limit = 50, period = "all", contactExternalId }) => {
    let cutoffTime = 0;
    const now = Date.now();

    if (period === "today") cutoffTime = now - 24 * 60 * 60 * 1000;
    if (period === "week") cutoffTime = now - 7 * 24 * 60 * 60 * 1000;
    if (period === "month") cutoffTime = now - 30 * 24 * 60 * 60 * 1000;

    let contactId = null;

    if (contactExternalId) {
      const contact = await ctx.db
        .query("contacts")
        .withIndex("by_org_external", (q: any) => q.eq("orgId", orgId).eq("externalId", contactExternalId))
        .first();
      if (!contact) {
        return [];
      }
      contactId = contact._id;
    }

    let messages = await ctx.db
      .query("messages")
      .withIndex("by_org_time", (q: any) => q.eq("orgId", orgId))
      .order("desc")
      .take(Math.max(limit * 3, 100));

    messages = messages.filter((message: any) => {
      if (cutoffTime && message.createdAt < cutoffTime) return false;
      if (contactId && message.contactId !== contactId) return false;
      return true;
    }).slice(0, limit);

    const contactIds = [...new Set(messages.map((message: any) => message.contactId))];
    const contacts = await Promise.all(contactIds.map((id: any) => ctx.db.get(id)));
    const contactsById = new Map(
      contacts.filter(Boolean).map((contact: any) => [contact._id, contact])
    );

    return messages.map((message: any) => {
      const contact = contactsById.get(message.contactId);
      return {
        _id: message._id,
        contactId: message.contactId,
        externalId: contact?.externalId || null,
        direction: message.direction,
        text: message.text,
        createdAt: message.createdAt,
        senderName: contact?.name || contact?.externalId?.split("@")[0] || "Contato",
        fromMe: message.direction === "outbound",
      };
    });
  },
});

export const getConversationByExternalId = query({
  args: {
    orgId: v.id("organizations"),
    externalId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { orgId, externalId, limit = 100 }) => {
    const contact = await ctx.db
      .query("contacts")
      .withIndex("by_org_external", (q: any) => q.eq("orgId", orgId).eq("externalId", externalId))
      .first();

    if (!contact) {
      return null;
    }

    const session = await ctx.db
      .query("sessions")
      .withIndex("by_org_contact", (q: any) => q.eq("orgId", orgId).eq("contactId", contact._id))
      .first();

    if (!session) {
      return null;
    }

    const messagesDesc = await ctx.db
      .query("messages")
      .withIndex("by_session_time", (q: any) => q.eq("sessionId", session._id))
      .order("desc")
      .take(limit);

    const messages = messagesDesc.reverse().map((message: any) => ({
      _id: message._id,
      contactId: contact.externalId,
      direction: message.direction,
      text: message.text,
      messageType: "text",
      timestamp: message.createdAt,
      senderName: message.direction === "outbound" ? "Você" : (contact.name || contact.externalId.split("@")[0]),
      fromMe: message.direction === "outbound",
    }));

    const recentMessages = [...messages].slice(-20).reverse();

    return {
      contactId: contact.externalId,
      contactName: contact.name || contact.externalId.split("@")[0],
      phoneNumber: contact.externalId.split("@")[0],
      totalMessages: messages.length,
      messages,
      recentMessages,
      statistics: {
        total: messages.length,
        inbound: messages.filter((message: any) => !message.fromMe).length,
        outbound: messages.filter((message: any) => message.fromMe).length,
        lastMessageAt: messages[messages.length - 1]?.timestamp || contact.lastMessageAt,
        lastMessageDirection: messages[messages.length - 1]?.direction || "inbound",
      },
      lastMessage: messages[messages.length - 1] || null,
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

export const upsertFromEvolution = mutation({
  args: {
    orgId: v.id("organizations"),
    evolutionData: v.any()
  },
  handler: async (ctx: any, { orgId, evolutionData }: any) => {
    const messageId = evolutionData.id || evolutionData.key?.id;
    const remoteJid = evolutionData.key?.remoteJid || evolutionData.remoteJid;
    
    if (!messageId || !remoteJid) {
      console.log("Missing message ID or remoteJid, skipping...");
      return null;
    }
    
    // Check if message already exists
    const existing = await ctx.db
      .query("messages")
      .withIndex("by_provider_id", (q: any) => q.eq("providerMessageId", messageId))
      .first();
    
    if (existing) {
      console.log("Message already exists:", messageId);
      return existing._id;
    }
    
    // Find or create contact
    let contact = await ctx.db
      .query("contacts")
      .withIndex("by_org_external", (q: any) => q.eq("orgId", orgId).eq("externalId", remoteJid))
      .first();
    
    if (!contact) {
      // Create contact
      const contactId = await ctx.db.insert("contacts", {
        orgId,
        name: evolutionData.pushName || remoteJid.split('@')[0],
        channel: "whatsapp",
        externalId: remoteJid,
        createdAt: Date.now(),
        lastMessageAt: Date.now()
      });
      contact = await ctx.db.get(contactId);
    }
    
    // Find or create session
    let session = await ctx.db
      .query("sessions")
      .withIndex("by_org_contact", (q: any) => q.eq("orgId", orgId).eq("contactId", contact._id))
      .first();
    
    if (!session) {
      // Create session
      const sessionId = await ctx.db.insert("sessions", {
        orgId,
        contactId: contact._id,
        status: "active",
        stage: "S", // Default SPIN stage  
        variables: {},
        lastActivityAt: Date.now(),
        createdAt: Date.now(),
        processingLock: false,
        lastProcessedAt: 0
      });
      session = await ctx.db.get(sessionId);
    }
    
    // Determine message direction and text
    const message = evolutionData.message || evolutionData;
    const text = message.conversation || 
                 message.extendedTextMessage?.text || 
                 message.imageMessage?.caption || 
                 message.videoMessage?.caption ||
                 "Mídia recebida";
    
    const direction = evolutionData.fromMe ? "outbound" : "inbound";
    
    // Create message
    const messageData = {
      orgId,
      sessionId: session._id,
      contactId: contact._id,
      direction,
      text,
      providerMessageId: messageId,
      createdAt: evolutionData.messageTimestamp || Date.now()
    };
    
    const newMessageId = await ctx.db.insert("messages", messageData);
    
    // Update session
    const sessionMessages = await ctx.db
      .query("messages")
      .withIndex("by_session_time", (q: any) => q.eq("sessionId", session._id))
      .collect();
    
    await ctx.db.patch(session._id, {
      lastActivityAt: messageData.createdAt
    });
    
    // Update contact
    await ctx.db.patch(contact._id, {
      lastMessageAt: messageData.createdAt
    });
    
    return newMessageId;
  },
});
