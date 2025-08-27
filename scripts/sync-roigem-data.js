const { ConvexHttpClient } = require("convex/browser");

// Initialize Convex client with environment variable  
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL || "https://wise-woodpecker-341.convex.cloud";
const convex = new ConvexHttpClient(CONVEX_URL);

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "roigem"; // Específico para roigem

async function fetchEvolutionData(endpoint, method = 'POST') {
  try {
    console.log(`🔍 Fetching: ${EVOLUTION_BASE_URL}${endpoint} (${method})`);
    
    const response = await fetch(`${EVOLUTION_BASE_URL}${endpoint}`, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY
      },
      body: method === 'POST' ? JSON.stringify({}) : undefined
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Error fetching ${endpoint}:`, error.message);
    return null;
  }
}

async function syncRoigemData() {
  try {
    console.log("🚀 Starting Roigem data sync...");

    // Get the roigem organization
    console.log("🔍 Querying for roigem organization...");
    let org;
    try {
      org = await convex.query("organizations:getByInstanceName", { 
        instanceName: "roigem" 
      });
    } catch (error) {
      console.error("❌ Error querying organization:", error);
      console.error("   Error details:", error.message);
      throw error;
    }
    
    if (!org) {
      console.error("❌ Roigem organization not found!");
      return;
    }
    
    console.log("✅ Found roigem organization:", org._id);
    console.log("📋 Organization details:", org.name, "- ClerkOrgId:", org.clerkOrgId);

    // Try different contact endpoints
    const contactEndpoints = [
      `/chat/findContacts/${INSTANCE_NAME}`,
      `/contact/findAll/${INSTANCE_NAME}`,
      `/chat/find-contacts/${INSTANCE_NAME}`,
      `/instance/fetchContacts/${INSTANCE_NAME}`,
      `/contact/fetchContacts/${INSTANCE_NAME}`
    ];
    
    console.log("👥 Fetching contacts from Evolution API...");
    let contacts = null;
    
    for (const endpoint of contactEndpoints) {
      console.log(`  Trying: ${endpoint}`);
      contacts = await fetchEvolutionData(endpoint);
      if (contacts && Array.isArray(contacts) && contacts.length > 0) {
        console.log(`  ✅ Success! Found ${contacts.length} contacts`);
        break;
      }
    }
    
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      console.log("⚠️ No contacts found, trying chat endpoints...");
      
      // Try chat endpoints
      const chatEndpoints = [
        `/chat/fetchChats/${INSTANCE_NAME}`,
        `/chat/findChats/${INSTANCE_NAME}`,
        `/instance/fetchChats/${INSTANCE_NAME}`
      ];
      
      for (const endpoint of chatEndpoints) {
        console.log(`  Trying: ${endpoint}`);
        const chats = await fetchEvolutionData(endpoint);
        if (chats && Array.isArray(chats) && chats.length > 0) {
          console.log(`  ✅ Success! Found ${chats.length} chats`);
          // Convert chats to contacts format
          contacts = chats.map(chat => ({
            id: chat.id || chat.remoteJid || chat.jid,
            remoteJid: chat.remoteJid || chat.id || chat.jid,
            pushName: chat.name || chat.pushName || chat.contactName,
            name: chat.name || chat.pushName || chat.contactName
          }));
          break;
        }
      }
    }
    
    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      console.log("❌ No real contacts found in Evolution API for roigem instance");
      console.log("   This could mean:");
      console.log("   1. Instance has no conversations yet");
      console.log("   2. API endpoints have changed"); 
      console.log("   3. Instance is not properly connected");
      return;
    }

    console.log(`📞 Processing ${contacts.length} real contacts...`);
    
    let imported = 0;
    for (const contact of contacts.slice(0, 10)) { // Limit to 10 for testing
      try {
        const remoteJid = contact.remoteJid || contact.id;
        const name = contact.pushName || contact.name || remoteJid.split('@')[0];
        
        console.log(`  📱 Processing: ${name} (${remoteJid})`);
        
        // Check if contact already exists
        const existing = await convex.query("contacts:getByExternalId", {
          externalId: remoteJid,
          orgId: org._id
        });
        
        if (existing) {
          console.log(`    ⏭️ Contact already exists, skipping`);
          continue;
        }
        
        // Create contact
        const contactId = await convex.mutation("contacts:create", {
          orgId: org._id,
          name: name,
          channel: "whatsapp",
          externalId: remoteJid
        });
        
        // Create session
        const sessionId = await convex.mutation("sessions:create", {
          orgId: org._id,
          contactId: contactId,
          status: "active"
        });
        
        console.log(`    ✅ Created contact and session`);
        imported++;
        
      } catch (error) {
        console.error(`    ❌ Failed to import ${contact.remoteJid}:`, error.message);
      }
    }
    
    console.log(`🎉 Sync completed! Imported ${imported} real contacts from roigem instance`);
    
  } catch (error) {
    console.error("❌ Sync failed:", error);
  }
}

// Run the sync
syncRoigemData();