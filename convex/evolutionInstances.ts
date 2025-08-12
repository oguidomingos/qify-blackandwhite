import { v } from "convex/values";
import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";

export const getByOrg = query({
  args: { orgId: v.id("organizations") },
  handler: async (ctx, { orgId }) => {
    return await ctx.db
      .query("evolution_instances")
      .withIndex("by_org", (q) => q.eq("orgId", orgId))
      .first();
  },
});

export const create = action({
  args: {
    orgId: v.id("organizations"),
    instanceName: v.string(),
  },
  handler: async (ctx, { orgId, instanceName }) => {
    // Generate unique instance ID
    const instanceId = `${instanceName}-${Date.now()}`;
    
    // Get Evolution API credentials from environment
    const baseUrl = process.env.EVOLUTION_BASE_URL;
    const apiKey = process.env.EVOLUTION_API_KEY;
    const sharedToken = process.env.EVOLUTION_SHARED_TOKEN;
    
    if (!baseUrl || !apiKey || !sharedToken) {
      throw new Error("Evolution API credentials not configured");
    }

    try {
      // Create instance via Evolution API
      const response = await fetch(`${baseUrl}/instance/create`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": apiKey,
        },
        body: JSON.stringify({
          instanceName: instanceId,
          token: sharedToken,
          qrcode: true,
          number: "",
          webhook: `${process.env.CONVEX_SITE_URL}/api/webhook/whatsapp`,
          webhook_by_events: false,
          events: ["MESSAGES_UPSERT", "CONNECTION_UPDATE"],
        }),
      });

      if (!response.ok) {
        throw new Error(`Evolution API error: ${response.status}`);
      }

      const result = await response.json();

      // Store instance in database
      const instanceDbId = await ctx.runMutation(internal.evolutionInstances.createInDb, {
        orgId,
        instanceName,
        instanceId,
        status: "creating",
        webhookUrl: `${process.env.CONVEX_SITE_URL}/api/webhook/whatsapp`,
        apiCredentials: {
          baseUrl,
          apiKey,
          sharedToken,
        },
      });

      return instanceDbId;
    } catch (error) {
      console.error("Error creating Evolution instance:", error);
      throw error;
    }
  },
});

export const createInDb = internalMutation({
  args: {
    orgId: v.id("organizations"),
    instanceName: v.string(),
    instanceId: v.string(),
    status: v.string(),
    webhookUrl: v.string(),
    apiCredentials: v.object({
      baseUrl: v.string(),
      apiKey: v.string(),
      sharedToken: v.string(),
    }),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db.insert("evolution_instances", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getQRCode = action({
  args: { instanceId: v.id("evolution_instances") },
  handler: async (ctx, { instanceId }) => {
    const instance = await ctx.runQuery(internal.evolutionInstances.getById, { instanceId });
    
    if (!instance) {
      throw new Error("Instance not found");
    }

    try {
      const response = await fetch(
        `${instance.apiCredentials.baseUrl}/instance/connect/${instance.instanceId}`,
        {
          method: "GET",
          headers: {
            "apikey": instance.apiCredentials.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Evolution API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.base64) {
        // Update instance with QR code
        await ctx.runMutation(internal.evolutionInstances.updateQRCode, {
          instanceId,
          qrCode: `data:image/png;base64,${result.base64}`,
          status: "qr_pending",
        });

        return {
          qrCode: `data:image/png;base64,${result.base64}`,
        };
      }

      return { qrCode: null };
    } catch (error) {
      console.error("Error getting QR code:", error);
      throw error;
    }
  },
});

export const updateQRCode = internalMutation({
  args: {
    instanceId: v.id("evolution_instances"),
    qrCode: v.string(),
    status: v.string(),
  },
  handler: async (ctx, { instanceId, qrCode, status }) => {
    return await ctx.db.patch(instanceId, {
      qrCode,
      status,
      updatedAt: Date.now(),
    });
  },
});

export const checkConnection = action({
  args: { instanceId: v.id("evolution_instances") },
  handler: async (ctx, { instanceId }) => {
    const instance = await ctx.runQuery(internal.evolutionInstances.getById, { instanceId });
    
    if (!instance) {
      throw new Error("Instance not found");
    }

    try {
      const response = await fetch(
        `${instance.apiCredentials.baseUrl}/instance/connectionState/${instance.instanceId}`,
        {
          method: "GET",
          headers: {
            "apikey": instance.apiCredentials.apiKey,
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Evolution API error: ${response.status}`);
      }

      const result = await response.json();
      
      if (result.instance?.state === "open") {
        // Update instance as connected
        await ctx.runMutation(internal.evolutionInstances.updateConnection, {
          instanceId,
          status: "connected",
          connectionData: {
            phoneNumber: result.instance.number || "",
            profileName: result.instance.profileName || "",
            connectedAt: Date.now(),
          },
        });

        return { status: "connected" };
      }

      return { status: instance.status };
    } catch (error) {
      console.error("Error checking connection:", error);
      throw error;
    }
  },
});

export const updateConnection = internalMutation({
  args: {
    instanceId: v.id("evolution_instances"),
    status: v.string(),
    connectionData: v.optional(v.object({
      phoneNumber: v.string(),
      profileName: v.string(),
      connectedAt: v.number(),
    })),
  },
  handler: async (ctx, { instanceId, status, connectionData }) => {
    const updates: any = {
      status,
      updatedAt: Date.now(),
    };
    
    if (connectionData) {
      updates.connectionData = connectionData;
    }
    
    return await ctx.db.patch(instanceId, updates);
  },
});

export const startSync = action({
  args: { instanceId: v.id("evolution_instances") },
  handler: async (ctx, { instanceId }) => {
    const instance = await ctx.runQuery(internal.evolutionInstances.getById, { instanceId });
    
    if (!instance) {
      throw new Error("Instance not found");
    }

    try {
      // Start message sync process
      await ctx.runMutation(internal.syncStatus.create, {
        orgId: instance.orgId,
        instanceId: instance.instanceId,
        syncType: "full",
        status: "pending",
      });

      // Update instance last sync
      await ctx.runMutation(internal.evolutionInstances.updateLastSync, {
        instanceId,
      });

      return { success: true };
    } catch (error) {
      console.error("Error starting sync:", error);
      throw error;
    }
  },
});

export const updateLastSync = internalMutation({
  args: { instanceId: v.id("evolution_instances") },
  handler: async (ctx, { instanceId }) => {
    return await ctx.db.patch(instanceId, {
      lastSyncAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const getById = internalQuery({
  args: { instanceId: v.id("evolution_instances") },
  handler: async (ctx, { instanceId }) => {
    return await ctx.db.get(instanceId);
  },
});