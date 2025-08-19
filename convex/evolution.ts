import { v } from "convex/values";
import { action } from "./_generated/server";

// Sync data from Evolution API to Convex
export const syncFromEvolution = action({
  args: {
    instanceName: v.string(),
  },
  handler: async (ctx, { instanceName }) => {
    const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

    if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY) {
      throw new Error("Evolution API credentials not configured");
    }

    console.log("Starting sync for instance:", instanceName);

    try {
      // 1. Find or create organization for this instance
      let organization = await ctx.runQuery("organizations.getByInstanceName", { instanceName });
      
      if (!organization) {
        // Create organization if it doesn't exist
        organization = await ctx.runMutation("organizations.createForInstance", {
          instanceName,
          name: `Organization for ${instanceName}`,
          settings: {}
        });
      }

      console.log("Organization found/created:", organization._id);

      // 2. Fetch contacts from Evolution API
      const contactsResponse = await fetch(`${EVOLUTION_BASE_URL}/chat/findContacts/${instanceName}`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      });

      if (contactsResponse.ok) {
        const contacts = await contactsResponse.json();
        console.log(`Found ${contacts.length} contacts in Evolution API`);

        // Import contacts
        for (const contact of contacts) {
          await ctx.runMutation("contacts.upsertFromEvolution", {
            orgId: organization._id,
            evolutionData: contact
          });
        }
      }

      // 3. Fetch messages from Evolution API
      const messagesResponse = await fetch(`${EVOLUTION_BASE_URL}/chat/findMessages/${instanceName}`, {
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        }
      });

      if (messagesResponse.ok) {
        const messages = await messagesResponse.json();
        console.log(`Found ${messages.length} messages in Evolution API`);

        // Import messages
        for (const message of messages) {
          await ctx.runMutation("messages.upsertFromEvolution", {
            orgId: organization._id,
            evolutionData: message
          });
        }
      }

      // 4. Update instance status
      await ctx.runMutation("whatsapp_accounts.updateInstanceStatus", {
        orgId: organization._id,
        instanceName,
        status: "connected",
        lastSyncAt: Date.now()
      });

      return {
        success: true,
        message: "Data synced successfully",
        instanceName
      };

    } catch (error) {
      console.error("Sync error:", error);
      throw new Error(`Failed to sync data: ${error}`);
    }
  },
});