import { v } from "convex/values";
import { action, internalAction, internalQuery, mutation, internalMutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Enhanced Evolution API validation and health check functions
export const validateEvolutionEndpoints = action({
  args: {
    baseUrl: v.optional(v.string()),
    apiKey: v.optional(v.string())
  },
  handler: async (ctx, { baseUrl, apiKey }) => {
    const EVOLUTION_BASE_URL = baseUrl || process.env.EVOLUTION_BASE_URL;
    const EVOLUTION_API_KEY = apiKey || process.env.EVOLUTION_API_KEY;
    
    if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY) {
      return {
        success: false,
        error: "Evolution API credentials not configured",
        endpoints: {}
      };
    }

    const results = {
      success: true,
      baseUrl: EVOLUTION_BASE_URL,
      endpoints: {} as any,
      summary: {
        total: 0,
        working: 0,
        failed: 0
      }
    };

    // List of critical Evolution API endpoints to validate
    const endpointsToTest = [
      { name: 'health', path: '/health', method: 'GET' },
      { name: 'fetchInstances', path: '/instance/fetchInstances', method: 'GET' },
      { name: 'webhook', path: '/webhook', method: 'GET' },
      { name: 'manager', path: '/manager', method: 'GET' }
    ];

    for (const endpoint of endpointsToTest) {
      results.summary.total++;
      
      try {
        console.log(`🔍 Testing Evolution API endpoint: ${endpoint.name}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${EVOLUTION_BASE_URL}${endpoint.path}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY
          },
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        const responseTime = Date.now();
        const status = response.status;
        const isOk = response.ok;
        
        let responseData = null;
        try {
          responseData = await response.json();
        } catch {
          responseData = await response.text();
        }
        
        results.endpoints[endpoint.name] = {
          success: isOk,
          status,
          responseTime,
          path: endpoint.path,
          method: endpoint.method,
          data: isOk ? responseData : null,
          error: !isOk ? responseData : null
        };
        
        if (isOk) {
          results.summary.working++;
          console.log(`✅ ${endpoint.name}: OK (${status})`);
        } else {
          results.summary.failed++;
          console.log(`❌ ${endpoint.name}: FAILED (${status})`);
        }
        
      } catch (error) {
        results.summary.failed++;
        results.endpoints[endpoint.name] = {
          success: false,
          status: 0,
          responseTime: 0,
          path: endpoint.path,
          method: endpoint.method,
          data: null,
          error: error.message
        };
        console.log(`🚨 ${endpoint.name}: ERROR - ${error.message}`);
      }
    }

    // Determine overall success
    results.success = results.summary.working > 0 && results.summary.failed < results.summary.total;
    
    console.log(`🏁 Evolution API validation complete: ${results.summary.working}/${results.summary.total} endpoints working`);
    
    return results;
  }
});

// Helper function to get working instances from Evolution API with enhanced error handling
async function getWorkingInstances(): Promise<string[]> {
  try {
    const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
    const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
    
    if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY) {
      console.log("Evolution API credentials not configured");
      return [];
    }

    console.log(`🔍 Fetching instances from: ${EVOLUTION_BASE_URL}/instance/fetchInstances`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // Extended timeout

    const response = await fetch(`${EVOLUTION_BASE_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const instances = await response.json();
      console.log(`📋 Found ${instances.length} total instances in Evolution API`);
      
      // Enhanced instance validation
      const workingInstances = instances
        .filter((instance: any) => {
          const name = instance.instanceName || instance.name || '';
          const state = instance.connectionStatus?.state || instance.state;
          const isQify = name.startsWith('qify-');
          const isConnected = state === 'open' || state === 'connected';
          
          console.log(`Instance ${name}: state=${state}, isQify=${isQify}, isConnected=${isConnected}`);
          
          return isQify && isConnected;
        })
        .map((instance: any) => instance.instanceName || instance.name);

      console.log(`✅ Working Qify instances: ${workingInstances.join(', ')}`);
      return workingInstances;
    } else {
      const errorText = await response.text();
      console.log(`❌ Failed to fetch instances: ${response.status} - ${errorText}`);
      return [];
    }
    
  } catch (error) {
    console.error('🚨 Error getting working instances:', error);
    return [];
  }
}

// New function to test instance health
export const testInstanceHealth = action({
  args: {
    instanceName: v.string(),
    baseUrl: v.optional(v.string()),
    apiKey: v.optional(v.string())
  },
  handler: async (ctx, { instanceName, baseUrl, apiKey }) => {
    const EVOLUTION_BASE_URL = baseUrl || process.env.EVOLUTION_BASE_URL;
    const EVOLUTION_API_KEY = apiKey || process.env.EVOLUTION_API_KEY;
    
    if (!EVOLUTION_BASE_URL || !EVOLUTION_API_KEY) {
      return { success: false, error: "Evolution API credentials not configured" };
    }

    try {
      console.log(`🩺 Testing health of instance: ${instanceName}`);
      
      // Test instance connection status
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await fetch(`${EVOLUTION_BASE_URL}/instance/connectionState/${instanceName}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ Instance ${instanceName} health check passed:`, data);
        
        return {
          success: true,
          instanceName,
          connectionState: data,
          status: data.instance?.state || data.state || 'unknown'
        };
      } else {
        const errorText = await response.text();
        console.log(`❌ Instance ${instanceName} health check failed: ${response.status} - ${errorText}`);
        
        return {
          success: false,
          instanceName,
          error: `HTTP ${response.status}: ${errorText}`
        };
      }
      
    } catch (error) {
      console.error(`🚨 Error testing instance ${instanceName} health:`, error);
      return {
        success: false,
        instanceName,
        error: error.message
      };
    }
  }
});

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
    // Get WhatsApp account for this org, create if doesn't exist
    let account = await ctx.runQuery(internal.wa.queryAccountByOrg, { orgId });
    
    if (!account) {
      console.log("No WhatsApp account found, creating one for org:", orgId);
      await ctx.runMutation(internal.wa.ensureAccountExists, { orgId });
      account = await ctx.runQuery(internal.wa.queryAccountByOrg, { orgId });
      
      if (!account) {
        throw new Error("Failed to create WhatsApp account for organization");
      }
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

    // Try sending with the primary account first, then fallback to working instances
    const maxRetries = 3;
    const retryDelay = 1000; // 1 second
    
    // First, try with the configured account
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Sending message via primary account attempt ${attempt}/${maxRetries}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
        
        const response = await fetch(`${account.baseUrl}/message/sendText/${account.instanceId}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": account.token,
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          const error = new Error(`WhatsApp API error (${response.status}): ${errorText}`);
          
          // Check if it's a retryable error
          if (response.status >= 500 || response.status === 429 || errorText.includes('Connection Closed')) {
            console.log(`Retryable error on attempt ${attempt}: ${error.message}`);
            if (attempt < maxRetries) {
              console.log(`Waiting ${retryDelay}ms before retry...`);
              await new Promise(resolve => setTimeout(resolve, retryDelay));
              continue; // Retry
            }
          }
          
          // If not retryable or final attempt, break to try fallback instances
          console.log(`Primary account failed: ${error.message}. Will try fallback instances.`);
          break;
        }

        const result = await response.json();
        
        // Log successful send
        console.log(`Message sent successfully via primary account on attempt ${attempt}:`, result);
        
        return result;
        
      } catch (error) {
        console.error(`Error sending WhatsApp message via primary account (attempt ${attempt}/${maxRetries}):`, error);
        
        // Check if it's a retryable error
        const isRetryable = error.message.includes('Connection Closed') || 
                           error.message.includes('timeout') ||
                           error.message.includes('ECONNRESET') ||
                           error.message.includes('Internal Server Error');
        
        if (isRetryable && attempt < maxRetries) {
          console.log(`Retrying in ${retryDelay}ms... (${maxRetries - attempt} attempts left)`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
          continue; // Retry
        }
        
        console.log(`Primary account ultimately failed. Will try fallback instances.`);
        break;
      }
    }

    // If primary account failed, try fallback instances
    console.log('🔄 Primary instance failed, trying fallback instances...');
    const workingInstances = await getWorkingInstances();
    
    if (workingInstances.length === 0) {
      throw new Error('No working instances available for message sending');
    }

    // Try each working instance
    for (const instanceName of workingInstances) {
      if (instanceName === account.instanceId) {
        console.log(`Skipping ${instanceName} (already tried as primary)`);
        continue; // Skip the primary instance we already tried
      }
      
      try {
        console.log(`📤 Trying fallback instance: ${instanceName}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const response = await fetch(`${account.baseUrl}/message/sendText/${instanceName}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "apikey": account.token,
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const result = await response.json();
          console.log(`✅ Message sent successfully via fallback instance ${instanceName}:`, result);
          return result;
        }

        const errorText = await response.text();
        console.log(`❌ Fallback instance ${instanceName} failed: ${response.status} - ${errorText}`);
        
      } catch (error) {
        console.error(`🚨 Error with fallback instance ${instanceName}:`, error);
      }
    }
    
    throw new Error('All instances failed to send message. Evolution API may be unstable.');
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

export const getByOrg = internalQuery({
  args: { orgId: v.id("organizations") },
  handler: async (ctx: any, { orgId }: any) => {
    return await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .collect();
  },
});

export const getByInstance = query({
  args: { instanceName: v.string() },
  handler: async (ctx: any, { instanceName }: any) => {
    return await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_instance_name", (q: any) => q.eq("instanceName", instanceName))
      .first();
  },
});

export const getByInstanceInternal = internalQuery({
  args: { instanceName: v.string() },
  handler: async (ctx: any, { instanceName }: any) => {
    return await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_instance_name", (q: any) => q.eq("instanceName", instanceName))
      .first();
  },
});

export const updateQrCode = mutation({
  args: {
    accountId: v.id("whatsapp_accounts"),
    qrCode: v.string(),
    lastQrAt: v.number(),
    status: v.string(),
  },
  handler: async (ctx: any, { accountId, qrCode, lastQrAt, status }: any) => {
    await ctx.db.patch(accountId, {
      qrCode,
      lastQrAt,
      status,
    });
    
    return { success: true };
  },
});

export const updateWebhookTest = mutation({
  args: {
    accountId: v.id("whatsapp_accounts"),
    lastWebhookTestAt: v.number(),
    webhookVerified: v.boolean(),
  },
  handler: async (ctx: any, { accountId, lastWebhookTestAt, webhookVerified }: any) => {
    await ctx.db.patch(accountId, {
      lastWebhookTestAt,
      webhookVerified,
    });
    
    return { success: true };
  },
});

export const updateStatus = mutation({
  args: {
    instanceId: v.string(),
    status: v.string(),
  },
  handler: async (ctx: any, { instanceId, status }: any) => {
    const account = await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_instance", (q: any) => q.eq("instanceId", instanceId))
      .first();
    
    if (account) {
      await ctx.db.patch(account._id, {
        status,
      });
    }
    
    return { success: true };
  },
});

export const createAccount = mutation({
  args: {
    orgId: v.id("organizations"),
    instanceId: v.string(),
    instanceName: v.string(),
    phoneNumber: v.string(),
    baseUrl: v.optional(v.string()),
    token: v.optional(v.string()),
  },
  handler: async (ctx: any, { orgId, instanceId, instanceName, phoneNumber, baseUrl, token }: any) => {
    // Check if account already exists
    const existing = await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .first();

    if (existing) {
      return existing._id;
    }

    // Create new account
    return await ctx.db.insert("whatsapp_accounts", {
      orgId,
      provider: "evolution",
      instanceId,
      instanceName,
      phoneNumber,
      status: "pending", // NEW: Initial status
      qrCode: undefined, // NEW: Will be set when QR is generated
      lastQrAt: undefined, // NEW: Will be set when QR is generated
      lastWebhookTestAt: undefined, // NEW: Will be set when webhook is tested
      webhookVerified: false, // NEW: Initially not verified
      webhookSecret: "",
      sharedToken: token || process.env.EVOLUTION_API_TOKEN || "",
      baseUrl: baseUrl || process.env.EVOLUTION_API_URL || "https://evolution-api.cloud",
      token: token || process.env.EVOLUTION_API_TOKEN || "",
      createdAt: Date.now(),
    });
  },
});

export const ensureAccountExists = internalMutation({
  args: { orgId: v.id("organizations") },
  handler: async (ctx: any, { orgId }: any) => {
    // Check if account already exists
    const existing = await ctx.db
      .query("whatsapp_accounts")
      .withIndex("by_org", (q: any) => q.eq("orgId", orgId))
      .first();

    if (existing) {
      // Update existing account with current environment variables
      await ctx.db.patch(existing._id, {
        baseUrl: process.env.EVOLUTION_API_URL || "https://evolution-api.cloud",
        token: process.env.EVOLUTION_API_TOKEN || "",
        sharedToken: process.env.EVOLUTION_API_TOKEN || "",
      });
      return existing._id;
    }

    // Create default account - we'll use the org phone number from agent config
    const agentConfig = await ctx.db
      .query("agent_configurations") 
      .filter((q: any) => q.eq(q.field("orgId"), orgId))
      .first();

    const phoneNumber = agentConfig?.phoneNumber || "5561999449983"; // fallback
    const instanceId = `qify-${phoneNumber}`;
    const instanceName = `WhatsApp ${phoneNumber}`;

    return await ctx.db.insert("whatsapp_accounts", {
      orgId,
      provider: "evolution",
      instanceId,
      instanceName,
      phoneNumber,
      status: "pending", // NEW: Initial status
      qrCode: undefined, // NEW: Will be set when QR is generated
      lastQrAt: undefined, // NEW: Will be set when QR is generated
      lastWebhookTestAt: undefined, // NEW: Will be set when webhook is tested
      webhookVerified: false, // NEW: Initially not verified
      webhookSecret: "",
      sharedToken: process.env.EVOLUTION_API_TOKEN || "",
      baseUrl: process.env.EVOLUTION_API_URL || "https://evolution-api.cloud",
      token: process.env.EVOLUTION_API_TOKEN || "",
      createdAt: Date.now(),
    });
  },
});