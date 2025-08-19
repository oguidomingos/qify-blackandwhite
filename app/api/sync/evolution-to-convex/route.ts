import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "qify-5561999449983";

interface EvolutionMessage {
  key: {
    id: string;
    remoteJid: string;
    fromMe: boolean;
  };
  message: {
    conversation?: string;
    extendedTextMessage?: { text: string };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
  };
  messageTimestamp: number;
  pushName?: string;
}

interface EvolutionContact {
  id: string;
  pushName?: string;
  name?: string;
  profilePicUrl?: string;
}

async function fetchEvolutionData(endpoint: string) {
  try {
    const response = await fetch(`${EVOLUTION_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error(`Error fetching ${endpoint}:`, error);
    return null;
  }
}

export async function POST() {
  try {
    console.log("🚀 Starting Evolution → Convex sync...");

    // Step 1: Create or get organization
    console.log("📁 Creating/finding organization...");
    
    let orgId;
    try {
      // Try to create organization
      orgId = await convex.mutation("organizations.create", {
        name: "Qify Organization",
        clerkOrgId: "qify-evolution-sync",
        billingPlan: "starter"
      });
      console.log("✅ Created new organization:", orgId);
    } catch (error) {
      // If organization already exists, try to find it by clerkOrgId
      try {
        const existingOrg = await convex.query("organizations.getByClerkId", {
          clerkId: "qify-evolution-sync"
        });
        if (existingOrg) {
          orgId = existingOrg._id;
          console.log("✅ Found existing organization:", orgId);
        } else {
          throw new Error("Could not create or find organization");
        }
      } catch (findError) {
        throw new Error(`Organization creation failed: ${error}`);
      }
    }

    // Step 2: Create WhatsApp account record
    console.log("📱 Setting up WhatsApp account...");
    try {
      await convex.mutation("whatsapp_accounts.create" as any, {
        orgId: orgId,
        provider: "evolution",
        instanceId: INSTANCE_NAME,
        instanceName: INSTANCE_NAME,
        phoneNumber: "5561999449983",
        status: "connected",
        sharedToken: "shared_token_32_characters_long",
        baseUrl: EVOLUTION_BASE_URL,
        token: EVOLUTION_API_KEY,
        createdAt: Date.now(),
      });
      console.log("✅ WhatsApp account configured");
    } catch (error) {
      console.log("⚠️ WhatsApp account may already exist:", error);
    }

    // Step 3: Fetch and import contacts
    console.log("👥 Fetching contacts from Evolution API...");
    const contacts = await fetchEvolutionData(`/chat/findContacts/${INSTANCE_NAME}`);
    
    let contactsImported = 0;
    const contactMap: { [key: string]: string } = {}; // remoteJid -> convex contactId

    if (contacts && Array.isArray(contacts)) {
      console.log(`📞 Found ${contacts.length} contacts, importing...`);
      
      for (const contact of contacts.slice(0, 20)) { // Limit to first 20
        try {
          const contactData = {
            orgId: orgId,
            name: contact.pushName || contact.name || contact.id.split('@')[0],
            channel: "whatsapp",
            externalId: contact.id,
            createdAt: Date.now(),
            lastMessageAt: Date.now()
          };

          const contactId = await convex.mutation("contacts.create", contactData);
          contactMap[contact.id] = contactId;
          contactsImported++;
          
          console.log(`  ✅ Imported contact: ${contactData.name}`);
        } catch (error) {
          console.log(`  ❌ Failed to import contact ${contact.id}:`, error);
        }
      }
    }

    // Step 4: Fetch and import messages
    console.log("💬 Fetching messages from Evolution API...");
    const messages = await fetchEvolutionData(`/chat/findMessages/${INSTANCE_NAME}`);
    
    let messagesImported = 0;
    const sessionMap: { [key: string]: string } = {}; // remoteJid -> convex sessionId

    if (messages && Array.isArray(messages)) {
      console.log(`📨 Found ${messages.length} messages, importing first 50...`);
      
      for (const message of messages.slice(0, 50)) { // Limit to first 50
        try {
          const remoteJid = message.key.remoteJid;
          const messageId = message.key.id;
          
          // Get or create contact
          let contactId = contactMap[remoteJid];
          if (!contactId) {
            // Create contact if not exists
            const contactData = {
              orgId: orgId,
              name: message.pushName || remoteJid.split('@')[0],
              channel: "whatsapp",
              externalId: remoteJid,
              createdAt: Date.now(),
              lastMessageAt: Date.now()
            };
            contactId = await convex.mutation("contacts.create", contactData);
            contactMap[remoteJid] = contactId;
          }

          // Get or create session
          let sessionId = sessionMap[remoteJid];
          if (!sessionId) {
            const sessionData = {
              orgId: orgId,
              contactId: contactId,
              status: "active",
              spinStage: "S", // Default SPIN stage
              totalMessages: 0,
              lastMessageAt: Date.now(),
              createdAt: Date.now()
            };
            sessionId = await convex.mutation("sessions.create", sessionData);
            sessionMap[remoteJid] = sessionId;
          }

          // Extract message text
          const messageContent = message.message.conversation || 
                                message.message.extendedTextMessage?.text || 
                                message.message.imageMessage?.caption || 
                                message.message.videoMessage?.caption ||
                                "Mídia recebida";

          // Create message
          const messageData = {
            sessionId: sessionId,
            contactId: contactId,
            orgId: orgId,
            direction: message.key.fromMe ? "outbound" : "inbound",
            text: messageContent,
            messageType: "text",
            metadata: {
              whatsappId: messageId,
              timestamp: message.messageTimestamp
            }
          };

          await convex.mutation("messages.create", messageData);
          messagesImported++;

          if (messagesImported % 10 === 0) {
            console.log(`  📈 Imported ${messagesImported} messages...`);
          }
        } catch (error) {
          console.log(`  ❌ Failed to import message:`, error);
        }
      }
    }

    // Step 5: Update session counts
    console.log("📊 Updating session counts...");
    for (const remoteJid of Object.keys(sessionMap)) {
      try {
        const sessionId = sessionMap[remoteJid];
        
        // Count messages in this session
        const sessionMessages = await convex.query("messages.listBySessionPublic", {
          sessionId: sessionId
        });
        
        await convex.mutation("sessions.update" as any, {
          sessionId: sessionId,
          updates: {
            totalMessages: sessionMessages.length,
            lastMessageAt: Date.now()
          }
        });
      } catch (error) {
        console.log(`  ⚠️ Failed to update session ${remoteJid}:`, error);
      }
    }

    console.log("🎉 Sync completed successfully!");

    return NextResponse.json({
      success: true,
      message: "Evolution data synced to Convex successfully",
      stats: {
        organization: orgId,
        contactsImported: contactsImported,
        messagesImported: messagesImported,
        sessionsCreated: Object.keys(sessionMap).length
      }
    });

  } catch (error) {
    console.error("❌ Sync failed:", error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : "Unknown error occurred",
      error: error
    }, { status: 500 });
  }
}