import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "roigem"; // Specific to roigem instance

async function fetchEvolutionData(endpoint: string, method = 'POST') {
  try {
    console.log(`🔍 Fetching: ${EVOLUTION_BASE_URL}${endpoint} (${method})`);
    
    const response = await fetch(`${EVOLUTION_BASE_URL}${endpoint}`, {
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      },
      body: method === 'POST' ? JSON.stringify({}) : undefined
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`❌ Error fetching ${endpoint}:`, error);
    return null;
  }
}

export async function POST() {
  try {
    console.log("🚀 Starting Roigem Evolution → Convex sync...");

    // Step 1: Get the existing roigem organization
    const org = await convex.query("organizations:getByInstanceName", { 
      instanceName: INSTANCE_NAME 
    });
    
    if (!org) {
      return NextResponse.json({
        success: false,
        message: "Roigem organization not found",
        error: "Organization with instance name 'roigem' does not exist"
      }, { status: 404 });
    }
    
    console.log("✅ Found roigem organization:", org._id);
    console.log("📋 Organization:", org.name, "- ClerkOrgId:", org.clerkOrgId);

    // Step 2: Fetch contacts from Evolution API
    console.log("👥 Fetching contacts from Evolution API...");
    
    const contactEndpoints = [
      `/chat/findContacts/${INSTANCE_NAME}`,
      `/contact/findAll/${INSTANCE_NAME}`,
      `/chat/find-contacts/${INSTANCE_NAME}`,
      `/instance/fetchContacts/${INSTANCE_NAME}`,
      `/contact/fetchContacts/${INSTANCE_NAME}`
    ];
    
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
      
      // Try chat endpoints as fallback
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
      return NextResponse.json({
        success: false,
        message: "No real contacts found in Evolution API for roigem instance",
        details: [
          "This could mean:",
          "1. Instance has no conversations yet",
          "2. API endpoints have changed", 
          "3. Instance is not properly connected"
        ]
      }, { status: 404 });
    }

    console.log(`📞 Processing ${contacts.length} real contacts...`);
    
    // Step 3: Import contacts to Convex
    let imported = 0;
    let updated = 0;
    
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
          console.log(`    ⏭️ Contact already exists, updating...`);
          // Update existing contact
          await convex.mutation("contacts:upsertFromEvolution", {
            orgId: org._id,
            externalId: remoteJid,
            name: name,
            channel: "whatsapp",
            lastMessageAt: Date.now()
          });
          updated++;
        } else {
          // Create new contact
          const contactId = await convex.mutation("contacts:create", {
            orgId: org._id,
            name: name,
            channel: "whatsapp",
            externalId: remoteJid
          });
          
          // Create session for new contact
          const sessionId = await convex.mutation("sessions:create", {
            orgId: org._id,
            contactId: contactId,
            status: "active"
          });
          
          console.log(`    ✅ Created contact and session`);
          imported++;
        }
        
      } catch (error) {
        console.error(`    ❌ Failed to import ${contact.remoteJid || contact.id}:`, error);
      }
    }
    
    // Step 4: Fetch and import messages (optional)
    console.log("💬 Fetching recent messages from Evolution API...");
    const messageEndpoints = [
      `/chat/findMessages/${INSTANCE_NAME}`,
      `/message/findAll/${INSTANCE_NAME}`,
      `/instance/fetchMessages/${INSTANCE_NAME}`
    ];
    
    let messages = null;
    for (const endpoint of messageEndpoints) {
      console.log(`  Trying: ${endpoint}`);
      messages = await fetchEvolutionData(endpoint);
      if (messages && Array.isArray(messages) && messages.length > 0) {
        console.log(`  ✅ Success! Found ${messages.length} messages`);
        break;
      }
    }
    
    let messagesImported = 0;
    if (messages && Array.isArray(messages) && messages.length > 0) {
      console.log(`📨 Processing ${messages.length} messages...`);
      
      // Import recent messages (last 20)
      for (const message of messages.slice(-20)) {
        try {
          const remoteJid = message.key?.remoteJid || message.remoteJid;
          if (!remoteJid) continue;
          
          // Find corresponding contact
          const contact = await convex.query("contacts:getByExternalId", {
            externalId: remoteJid,
            orgId: org._id
          });
          
          if (contact) {
            // Find active session
            const session = await convex.query("sessions:getActiveByContact", {
              contactId: contact._id
            });
            
            if (session) {
              const messageText = message.message?.conversation || 
                                 message.message?.extendedTextMessage?.text || 
                                 message.text || "Mídia recebida";
              
              // Create message
              await convex.mutation("messages:create", {
                sessionId: session._id,
                contactId: contact._id,
                orgId: org._id,
                direction: message.key?.fromMe ? "outbound" : "inbound",
                text: messageText,
                messageType: "text",
                metadata: {
                  whatsappId: message.key?.id || message.id,
                  timestamp: message.messageTimestamp || message.timestamp || Date.now()
                }
              });
              messagesImported++;
            }
          }
        } catch (error) {
          console.error(`    ❌ Failed to import message:`, error);
        }
      }
    }
    
    console.log("🎉 Roigem sync completed!");

    return NextResponse.json({
      success: true,
      message: "Roigem Evolution data synced successfully",
      stats: {
        organization: org._id,
        organizationName: org.name,
        contactsImported: imported,
        contactsUpdated: updated,
        messagesImported: messagesImported,
        totalContactsProcessed: imported + updated
      }
    });

  } catch (error) {
    console.error("❌ Roigem sync failed:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
      error: error
    }, { status: 500 });
  }
}