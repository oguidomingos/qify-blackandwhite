#!/usr/bin/env node

/**
 * Script to configure Evolution API webhook for production
 */

require("dotenv").config({ path: ".env.local" });

async function configureWebhook() {
  console.log("🔧 Configuring Evolution API webhook for production...\n");
  
  const baseUrl = process.env.EVOLUTION_BASE_URL;
  const token = process.env.EVOLUTION_API_KEY;
  const instanceName = "qify-5561999449983";
  
  // Use production URL directly
  const webhookUrl = "https://qify-blackandwhite.vercel.app/api/webhook/whatsapp/" + instanceName;
  
  console.log(`🌐 Base URL: ${baseUrl}`);
  console.log(`🔑 Token: ${token ? 'Set' : 'Missing'}`);
  console.log(`📱 Instance: ${instanceName}`);
  console.log(`🎣 Webhook URL: ${webhookUrl}\n`);
  
  if (!baseUrl || !token) {
    console.log("❌ Missing Evolution API credentials");
    return false;
  }
  
  try {
    // Check current webhook
    console.log("🔍 Checking current webhook configuration...");
    const checkResponse = await fetch(`${baseUrl}/webhook/find/${instanceName}`, {
      headers: {
        'apikey': token,
        'Content-Type': 'application/json'
      }
    });
    
    if (checkResponse.ok) {
      const currentConfig = await checkResponse.json();
      console.log("📋 Current config:", currentConfig);
    }
    
    // Update webhook configuration
    console.log("\n🔧 Updating webhook configuration...");
    const updateResponse = await fetch(`${baseUrl}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        url: webhookUrl,
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
    
    if (updateResponse.ok) {
      const result = await updateResponse.json();
      console.log("✅ Webhook configured successfully:");
      console.log(result);
      
      // Test webhook endpoint
      console.log("\n🧪 Testing webhook endpoint...");
      const testResponse = await fetch(webhookUrl, {
        method: 'GET'
      });
      
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log("✅ Webhook endpoint is working:", testData);
      } else {
        console.log("⚠️ Webhook endpoint test failed");
      }
      
      return true;
    } else {
      const errorText = await updateResponse.text();
      console.log("❌ Failed to update webhook:", errorText);
      return false;
    }
    
  } catch (error) {
    console.error("❌ Error configuring webhook:", error.message);
    return false;
  }
}

async function checkInstanceStatus() {
  console.log("📱 Checking instance status...\n");
  
  const baseUrl = process.env.EVOLUTION_BASE_URL;
  const token = process.env.EVOLUTION_API_KEY;
  const instanceName = "qify-5561999449983";
  
  try {
    const response = await fetch(`${baseUrl}/instance/connect/${instanceName}`, {
      headers: {
        'apikey': token,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log("📱 Instance status:", data);
      
      if (data.instance) {
        console.log(`🔌 Connection state: ${data.instance.state || 'unknown'}`);
        console.log(`📱 Instance name: ${data.instance.instanceName || 'unknown'}`);
      }
      
      return data;
    } else {
      console.log("❌ Failed to check instance status");
      return null;
    }
    
  } catch (error) {
    console.error("❌ Error checking instance:", error.message);
    return null;
  }
}

async function testMessagesAPI() {
  console.log("💬 Testing messages API...\n");
  
  const baseUrl = process.env.EVOLUTION_BASE_URL;
  const token = process.env.EVOLUTION_API_KEY;
  const instanceName = "qify-5561999449983";
  
  try {
    const response = await fetch(`${baseUrl}/message/findMessages/${instanceName}`, {
      method: 'POST',
      headers: {
        'apikey': token,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        limit: 10,
        where: {}
      })
    });
    
    if (response.ok) {
      const messages = await response.json();
      console.log(`💬 Found ${messages.length} messages in Evolution API`);
      
      if (messages.length > 0) {
        console.log("📋 Recent messages:");
        messages.slice(0, 3).forEach((msg, i) => {
          const from = msg.key?.remoteJid?.replace('@s.whatsapp.net', '') || 'unknown';
          const text = msg.message?.conversation || msg.message?.extendedTextMessage?.text || 'media';
          const timestamp = new Date(msg.messageTimestamp * 1000).toLocaleString();
          console.log(`  ${i+1}. ${from} (${timestamp}): ${text.substring(0, 50)}...`);
        });
      }
      
      return messages;
    } else {
      console.log("❌ Failed to fetch messages");
      return [];
    }
    
  } catch (error) {
    console.error("❌ Error fetching messages:", error.message);
    return [];
  }
}

async function main() {
  try {
    console.log("🚀 Evolution API Configuration Script\n");
    console.log("=" + "=".repeat(50) + "\n");
    
    // 1. Check instance status
    const instanceStatus = await checkInstanceStatus();
    
    // 2. Configure webhook
    const webhookConfigured = await configureWebhook();
    
    // 3. Test messages API
    const messages = await testMessagesAPI();
    
    console.log("\n" + "=".repeat(50));
    console.log("📊 CONFIGURATION SUMMARY");
    console.log("=" + "=".repeat(50));
    
    console.log(`📱 Instance accessible: ${instanceStatus ? '✅' : '❌'}`);
    console.log(`🎣 Webhook configured: ${webhookConfigured ? '✅' : '❌'}`);
    console.log(`💬 Messages API working: ${messages ? '✅' : '❌'}`);
    console.log(`📨 Messages found: ${messages ? messages.length : 0}`);
    
    if (webhookConfigured) {
      console.log("\n🎉 SUCCESS! Configuration completed.");
      console.log("\n📱 Next steps:");
      console.log("1. Send a WhatsApp message to your instance");
      console.log("2. Check dashboard at: https://qify-blackandwhite.vercel.app/dashboard");
      console.log("3. Data should appear automatically");
    } else {
      console.log("\n❌ Configuration failed. Check credentials and try again.");
    }
    
  } catch (error) {
    console.error("❌ Configuration script failed:", error);
    process.exit(1);
  }
}

main();