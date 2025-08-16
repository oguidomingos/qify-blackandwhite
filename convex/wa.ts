import { v } from "convex/values";
import { action, internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const sendMessage = internalAction({
  args: {
    orgId: v.id("organizations"),
    to: v.string(), // Phone number
    text: v.string(),
    media: v.optional(v.object({
      url: v.string(),
      type: v.string(),
    })),
  },
  handler: async (ctx: any, { orgId, to, text, media }: any) => {
    // Get WhatsApp account for this org
    const account = await ctx.runQuery(internal.wa.queryAccountByOrg, { orgId });
    
    if (!account) {
      throw new Error("No WhatsApp account found for organization");
    }

    // Clean phone number and ensure correct format
    const cleanNumber = to.replace('@s.whatsapp.net', '');
    const payload: any = {
      number: `${cleanNumber}@s.whatsapp.net`,
      text,
    };

    if (media) {
      payload.media = {
        mediatype: media.type,
        media: media.url,
      };
    }

    try {
      const response = await fetch(`${account.baseUrl}/message/sendText/${account.instanceId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": account.token,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`WhatsApp API error (${response.status}): ${errorText}`);
      }

      const result = await response.json();
      
      // Log successful send
      console.log("Message sent successfully:", result);
      
      return result;
      
    } catch (error) {
      console.error("Error sending WhatsApp message:", error);
      throw error;
    }
  },
});

export const queryAccountByOrg = internalQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx: any, { orgId }: any) => {
    return await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .first();
  },
});