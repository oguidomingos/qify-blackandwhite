import { v } from "convex/values";
import { mutation, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

export const ingestWebhook = mutation({
  args: {
    raw: v.string(),
    instanceId: v.string(),
    token: v.string(),
  },
  handler: async (ctx: any, { raw, instanceId, token }: any) => {
    // Find WhatsApp account by instanceId
    const account = await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_instance", (q) => q.eq("instanceId", instanceId))
      .first();

    if (!account) {
      throw new Error(`WhatsApp account not found for instanceId: ${instanceId}`);
    }

    // Verify token
    if (account.sharedToken !== token) {
      throw new Error("Invalid webhook token");
    }

    try {
      const payload = JSON.parse(raw);
      
      // Extract message data from Evolution API webhook
      const messageData = payload.data;
      if (!messageData || !messageData.key) {
        console.log("No message data in webhook payload");
        return;
      }

      // Check for idempotency
      const existingMessage = await ctx.db
        .query("messages")
        .withIndex("by_provider_id", (q) => 
          q.eq("providerMessageId", messageData.key.id)
        )
        .first();

      if (existingMessage) {
        console.log("Message already processed:", messageData.key.id);
        return;
      }

      // Upsert contact
      const contact = await upsertContact(ctx, account.orgId, messageData);
      
      // Upsert session
      const session = await upsertSession(ctx, account.orgId, contact._id);

      // Insert message
      await ctx.db.insert("messages", {
        orgId: account.orgId,
        sessionId: session._id,
        contactId: contact._id,
        direction: "inbound",
        text: messageData.message?.conversation || messageData.message?.extendedTextMessage?.text || "",
        media: messageData.message?.imageMessage || messageData.message?.documentMessage 
          ? {
              type: messageData.message?.imageMessage ? "image" : "document",
              url: messageData.message?.imageMessage?.url || messageData.message?.documentMessage?.url || "",
            }
          : undefined,
        providerMessageId: messageData.key.id,
        createdAt: Date.now(),
      });

      // Schedule AI response generation
      await ctx.scheduler.runAfter(0, internal.ai.generateAiReply, {
        orgId: account.orgId,
        sessionId: session._id,
      });

    } catch (error) {
      console.error("Error processing webhook:", error);
      throw error;
    }
  },
});

async function upsertContact(ctx: any, orgId: any, messageData: any) {
  const phoneNumber = messageData.key.remoteJid.replace("@s.whatsapp.net", "");
  
  const existing = await ctx.db
    .query("contacts")
    .withIndex("by_org_external", (q) => 
      q.eq("orgId", orgId).eq("externalId", phoneNumber)
    )
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      lastMessageAt: Date.now(),
    });
    return existing;
  }

  const contactId = await ctx.db.insert("contacts", {
    orgId,
    channel: "whatsapp",
    externalId: phoneNumber,
    name: messageData.pushName || phoneNumber,
    lastMessageAt: Date.now(),
    createdAt: Date.now(),
  });

  return { _id: contactId, orgId, externalId: phoneNumber };
}

async function upsertSession(ctx: any, orgId: any, contactId: any) {
  const existing = await ctx.db
    .query("sessions")
    .withIndex("by_org_contact", (q) => 
      q.eq("orgId", orgId).eq("contactId", contactId)
    )
    .first();

  if (existing) {
    await ctx.db.patch(existing._id, {
      lastActivityAt: Date.now(),
    });
    return existing;
  }

  const sessionId = await ctx.db.insert("sessions", {
    orgId,
    contactId,
    stage: "situation",
    status: "active",
    variables: {
      spin: {
        situation: { answers: [], completed: false, lastAt: Date.now() },
        problem: { answers: [], completed: false, lastAt: Date.now() },
        implication: { answers: [], completed: false, lastAt: Date.now() },
        needPayoff: { answers: [], completed: false, lastAt: Date.now() },
        score: 0,
        stage: "situation",
      },
    },
    lastActivityAt: Date.now(),
    createdAt: Date.now(),
  });

  return { _id: sessionId, orgId, contactId };
}