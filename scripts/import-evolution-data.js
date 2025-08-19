#!/usr/bin/env node

const { ConvexHttpClient } = require("convex/browser");

const CONVEX_URL = "https://frugal-marten-515.convex.cloud";
const EVOLUTION_BASE_URL = "https://evolutionapi.centralsupernova.com.br";
const EVOLUTION_API_KEY = "509dbd54-c20c-4a5b-b889-a0494a861f5a";
const INSTANCE_NAME = "qify-5561999449983";

const convex = new ConvexHttpClient(CONVEX_URL);

async function fetchEvolutionData(endpoint) {
  try {
    const response = await fetch(`${EVOLUTION_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error.message);
    return null;
  }
}

async function importData() {
  console.log("🚀 Starting Evolution API data import...");
  
  try {
    // 1. Create demo organization first
    console.log("📁 Creating demo organization...");
    const orgResult = await convex.mutation("organizations.createDemo", {});
    console.log("✅ Organization created:", orgResult.orgId);
    
    // 2. Fetch contacts from Evolution API
    console.log("👥 Fetching contacts from Evolution API...");
    const contacts = await fetchEvolutionData(`/chat/findContacts/${INSTANCE_NAME}`);
    
    if (contacts && Array.isArray(contacts)) {
      console.log(`📞 Found ${contacts.length} contacts, importing...`);
      for (const contact of contacts.slice(0, 10)) { // Limit to first 10 for testing
        try {
          await convex.mutation("contacts.upsertFromEvolution", {
            orgId: orgResult.orgId,
            evolutionData: contact
          });
          console.log(`  ✅ Imported contact: ${contact.pushName || contact.id}`);
        } catch (error) {
          console.log(`  ❌ Failed to import contact: ${error.message}`);
        }
      }
    }
    
    // 3. Fetch messages from Evolution API
    console.log("💬 Fetching messages from Evolution API...");
    const messages = await fetchEvolutionData(`/chat/findMessages/${INSTANCE_NAME}`);
    
    if (messages && Array.isArray(messages)) {
      console.log(`📨 Found ${messages.length} messages, importing...`);
      for (const message of messages.slice(0, 20)) { // Limit to first 20 for testing
        try {
          await convex.mutation("messages.upsertFromEvolution", {
            orgId: orgResult.orgId,
            evolutionData: message
          });
          console.log(`  ✅ Imported message: ${message.key?.id || message.id}`);
        } catch (error) {
          console.log(`  ❌ Failed to import message: ${error.message}`);
        }
      }
    }
    
    // 4. Update WhatsApp account status
    console.log("📱 Updating WhatsApp account status...");
    await convex.mutation("whatsapp_accounts.updateInstanceStatus", {
      orgId: orgResult.orgId,
      instanceName: INSTANCE_NAME,
      status: "connected",
      lastSyncAt: Date.now()
    });
    
    console.log("🎉 Data import completed successfully!");
    console.log("🔗 You can now check the dashboard with real data");
    
  } catch (error) {
    console.error("❌ Import failed:", error);
  }
}

// Run the import
importData();