#!/usr/bin/env node

/**
 * Script to check Evolution API integration and sync real data
 */

require("dotenv").config({ path: ".env.local" });

async function checkConvexData() {
  console.log("🔍 Checking current Convex data...\n");
  
  try {
    // We'll skip Convex check for now and focus on Evolution API
    console.log("⏭️ Skipping Convex check - focusing on Evolution API integration");
    return { organization: null, needsSync: true };
    
  } catch (error) {
    console.error("Error checking Convex data:", error);
    throw error;
  }
}

async function fetchEvolutionData() {
  console.log("\n📡 Fetching data from Evolution API...\n");
  
  const baseUrl = process.env.EVOLUTION_BASE_URL;
  const token = process.env.EVOLUTION_API_KEY;
  const instanceName = "qify-5561999449983"; // Your instance
  
  if (!baseUrl || !token) {
    console.log("❌ Evolution API credentials not found in .env.local");
    return null;
  }
  
  try {
    console.log(`🔗 Connecting to: ${baseUrl}`);
    
    // Check instance status
    const instanceResponse = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      headers: {
        'apikey': token,
        'Content-Type': 'application/json'
      }
    });
    
    if (instanceResponse.ok) {
      const instanceData = await instanceResponse.json();
      console.log("📱 Instance status:", instanceData.instance?.state || "unknown");
    }
    
    // Fetch recent messages
    const messagesResponse = await fetch(`${baseUrl}/message/findMessages/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        limit: 50,
        where: {}
      })
    });
    
    if (messagesResponse.ok) {
      const messagesData = await messagesResponse.json();
      console.log(`💬 Messages in Evolution: ${messagesData.length || 0}`);
      
      if (messagesData.length > 0) {
        console.log("📋 Recent messages:");
        messagesData.slice(0, 5).forEach((msg, i) => {
          const from = msg.key?.remoteJid?.replace('@s.whatsapp.net', '') || 'unknown';
          const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || 'media';
          console.log(`  ${i+1}. ${from}: ${text.substring(0, 50)}...`);
        });
        
        return messagesData;
      } else {
        console.log("📭 No messages found in Evolution API");
        return [];
      }
    } else {
      console.log("❌ Failed to fetch messages from Evolution API");
      return null;
    }
    
  } catch (error) {
    console.error("Error fetching Evolution data:", error);
    return null;
  }
}

async function checkWebhookConfig() {
  console.log("\n🔗 Checking webhook configuration...\n");
  
  const baseUrl = process.env.EVOLUTION_BASE_URL;
  const token = process.env.EVOLUTION_API_KEY;
  const instanceName = "qify-5561999449983";
  
  try {
    // Check current webhook
    const webhookResponse = await fetch(`${baseUrl}/webhook/find/${instanceName}`, {
      headers: {
        'apikey': token,
        'Content-Type': 'application/json'
      }
    });
    
    if (webhookResponse.ok) {
      const webhookData = await webhookResponse.json();
      console.log("🎣 Current webhook config:", webhookData);
      
      const currentUrl = webhookData.webhook?.url;
      const expectedUrl = `https://qify-blackandwhite-c9vcljr0h-oguidomingos-projects.vercel.app/api/webhook/whatsapp/${instanceName}`;
      
      console.log(`\n📍 Current webhook URL: ${currentUrl || 'Not set'}`);
      console.log(`📍 Expected webhook URL: ${expectedUrl}`);
      
      if (currentUrl !== expectedUrl) {
        console.log("\n⚠️ Webhook URL mismatch - this might be the problem!");
        return { needsUpdate: true, expectedUrl };
      } else {
        console.log("\n✅ Webhook URL is correct");
        return { needsUpdate: false };
      }
    } else {
      console.log("❌ Failed to check webhook config");
      return { needsUpdate: true };
    }
    
  } catch (error) {
    console.error("Error checking webhook:", error);
    return { needsUpdate: true };
  }
}

async function updateWebhookConfig(expectedUrl) {
  console.log("\n🔧 Updating webhook configuration...\n");
  
  const baseUrl = process.env.EVOLUTION_BASE_URL;
  const token = process.env.EVOLUTION_API_KEY;
  const instanceName = "qify-5561999449983";
  
  try {
    const response = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: expectedUrl,
        enabled: true,
        events: [
          "APPLICATION_STARTUP",
          "QRCODE_UPDATED", 
          "CONNECTION_UPDATE",
          "STATUS_INSTANCE",
          "MESSAGES_UPSERT",
          "MESSAGES_UPDATE",
          "SEND_MESSAGE"
        ]
      })
    });
    
    if (response.ok) {
      const result = await response.json();
      console.log("✅ Webhook updated successfully:", result);
      return true;
    } else {
      console.log("❌ Failed to update webhook");
      return false;
    }
    
  } catch (error) {
    console.error("Error updating webhook:", error);
    return false;
  }
}

async function testWebhook() {
  console.log("\n🧪 Testing webhook endpoint...\n");
  
  const webhookUrl = `http://localhost:3000/api/webhook/whatsapp/qify-5561999449983`;
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'GET'
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("✅ Local webhook endpoint is working:", data);
      return true;
    } else {
      console.log("❌ Local webhook endpoint failed");
      return false;
    }
    
  } catch (error) {
    console.error("Error testing webhook:", error);
    return false;
  }
}

async function main() {
  try {
    console.log("🚀 Starting Evolution API integration check...\n");
    
    // 1. Check current data in Convex
    const { organization, needsSync } = await checkConvexData();
    
    // 2. Check Evolution API data
    const evolutionMessages = await fetchEvolutionData();
    
    // 3. Check webhook configuration
    const webhookStatus = await checkWebhookConfig();
    
    // 4. Test local webhook endpoint
    const webhookWorking = await testWebhook();
    
    console.log("\n" + "=".repeat(50));
    console.log("📊 INTEGRATION STATUS SUMMARY");
    console.log("=".repeat(50));
    
    console.log(`🏢 Organization in Convex: ${organization ? '✅' : '❌'}`);
    console.log(`📡 Evolution API accessible: ${evolutionMessages !== null ? '✅' : '❌'}`);
    console.log(`💬 Messages in Evolution: ${evolutionMessages?.length || 0}`);
    console.log(`🔗 Webhook config correct: ${webhookStatus.needsUpdate ? '❌' : '✅'}`);
    console.log(`🌐 Local webhook working: ${webhookWorking ? '✅' : '❌'}`);
    
    console.log("\n🔧 RECOMMENDED ACTIONS:");
    
    if (webhookStatus.needsUpdate) {
      console.log("1. Update webhook URL in Evolution API");
      const updated = await updateWebhookConfig(webhookStatus.expectedUrl);
      if (updated) {
        console.log("   ✅ Webhook URL updated successfully");
      }
    }
    
    if (evolutionMessages && evolutionMessages.length > 0 && needsSync) {
      console.log("2. Messages exist in Evolution but not in Convex");
      console.log("   💡 Send a test message to trigger webhook sync");
    }
    
    if (!webhookWorking) {
      console.log("3. Local webhook endpoint not working");
      console.log("   💡 Make sure 'npm run dev' is running");
    }
    
    console.log("\n🧪 NEXT STEPS:");
    console.log("1. Send a WhatsApp message to your instance");
    console.log("2. Check dashboard for new data");
    console.log("3. Monitor webhook logs in terminal");
    
  } catch (error) {
    console.error("❌ Integration check failed:", error);
    process.exit(1);
  }
}

main();