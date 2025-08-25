import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function processWhatsAppMessage(instanceName: string, messageData: any) {
  try {
    const { key, message, pushName, messageTimestamp } = messageData;
    const phoneNumber = key.remoteJid.replace('@s.whatsapp.net', '');
    const messageText = message.conversation || message.text || '';
    
    console.log(`Processing message from ${phoneNumber}: ${messageText}`);
    
    // Find organization by instance name
    let orgQuery = await convex.query(api.organizations.getByInstanceName, { 
      instanceName 
    });
    
    if (!orgQuery) {
      console.log('Organization not found for instance:', instanceName, '- Creating new organization');
      
      // Create organization automatically 
      try {
        const newOrg = await convex.mutation(api.organizations.createForInstance, {
          instanceName: instanceName,
          name: `Auto-created org for ${instanceName}`,
          settings: {
            autoCreated: true,
            createdFrom: 'webhook'
          }
        });
        orgQuery = newOrg;
        console.log('Auto-created organization:', orgQuery._id);
      } catch (createError) {
        console.error('Error creating organization:', createError);
        return;
      }
    }
    
    // Find or create contact
    let contact = await convex.query(api.contacts.getByExternalId, {
      externalId: key.remoteJid,
      orgId: orgQuery._id
    });
    
    if (!contact) {
      const contactId = await convex.mutation(api.contacts.create, {
        orgId: orgQuery._id,
        name: pushName || 'Unknown',
        channel: 'whatsapp',
        externalId: key.remoteJid
      });
      contact = { _id: contactId };
    }
    
    console.log('Contact found/created:', contact._id);
    
    // Find or create session
    let session = await convex.query(api.sessions.getActiveByContact, {
      contactId: contact._id
    });
    
    if (!session) {
      const sessionId = await convex.mutation(api.sessions.create, {
        contactId: contact._id,
        orgId: orgQuery._id,
        status: 'active'
      });
      session = { _id: sessionId };
    }
    
    console.log('Session found/created:', session._id);
    
    // Save incoming message
    const savedMessage = await convex.mutation(api.messages.create, {
      sessionId: session._id,
      contactId: contact._id,
      orgId: orgQuery._id,
      direction: 'inbound',
      text: messageText,
      messageType: 'text',
      metadata: {
        whatsappId: key.id,
        timestamp: messageTimestamp,
        instanceName
      }
    });
    
    console.log('Message saved:', savedMessage._id);
    
    // Schedule AI processing with batching logic - AI function handles the delay
    console.log('Scheduling AI processing for session:', session._id);
    try {
      const aiResult = await convex.action(api.ai.generateAiReply, {
        orgId: orgQuery._id,
        sessionId: session._id
      });
      console.log('AI processing scheduled:', aiResult);
    } catch (error) {
      console.error('Error scheduling AI processing:', error);
    }
    
    return { success: true, sessionId: session._id, messageId: savedMessage._id };
    
  } catch (error) {
    console.error('Error processing WhatsApp message:', error);
    throw error;
  }
}

function verifySignature(reqBody: string, signature: string, secret: string): boolean {
  if (!signature || !secret) return false;
  
  try {
    const hmac = crypto.createHmac("sha256", secret).update(reqBody).digest("hex");
    const expectedSignature = `sha256=${hmac}`;
    return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(signature));
  } catch (error) {
    console.error("Error verifying signature:", error);
    return false;
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { instanceName: string } }
) {
  try {
    const { instanceName } = params;
    const raw = await req.text();
    const signature = req.headers.get("x-signature") || "";

    console.log(`Webhook received for instance: ${instanceName}`);

    // Optional: verify HMAC signature if provided
    const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
    if (signature && webhookSecret) {
      if (!verifySignature(raw, signature, webhookSecret)) {
        console.error("Invalid signature");
        return NextResponse.json({ 
          error: "Invalid signature" 
        }, { status: 401 });
      }
    }

    // Validate JSON payload with robust handling for special characters
    let payload;
    try {
      // Log raw data for debugging
      console.log('Raw webhook data length:', raw.length);
      console.log('Raw webhook data preview:', raw.substring(0, 200));
      
      // Try parsing the JSON
      payload = JSON.parse(raw);
      
      // Sanitize text content if present
      if (payload.data?.message?.conversation) {
        const originalText = payload.data.message.conversation;
        // Log original text for debugging
        console.log('Original message text:', originalText);
        
        // Clean up any problematic characters but preserve Portuguese
        const cleanedText = originalText
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .trim();
        
        payload.data.message.conversation = cleanedText;
        console.log('Cleaned message text:', cleanedText);
      }
    } catch (error) {
      console.error("JSON parsing error:", error);
      console.error("Raw data that failed parsing:", raw);
      
      // Try to identify the problematic character
      const match = error.message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1]);
        const surrounding = raw.substring(Math.max(0, pos - 10), pos + 10);
        console.error(`Problematic text around position ${pos}:`, surrounding);
      }
      
      return NextResponse.json({ 
        error: "Invalid JSON payload",
        details: error.message,
        position: match ? parseInt(match[1]) : null
      }, { status: 400 });
    }

    console.log("Webhook received:", {
      instanceName,
      event: payload.event,
      hasData: !!payload.data,
      messageText: payload.data?.message?.conversation || null,
      pushName: payload.data?.pushName || null
    });

    // Process different types of events
    switch (payload.event) {
      case "messages.upsert":
        console.log(`New message for instance ${instanceName}:`, {
          from: payload.data.key?.remoteJid,
          text: payload.data.message?.conversation,
          pushName: payload.data.pushName,
          timestamp: payload.data.messageTimestamp
        });
        
        // Process incoming message through agent
        try {
          const result = await processWhatsAppMessage(instanceName, payload.data);
          console.log('Message processing result:', result);
        } catch (error) {
          console.error('Error processing message:', error);
        }
        break;
      
      case "connection.update":
        console.log(`Connection update for instance ${instanceName}:`, payload.data);
        // TODO: Update instance status in Convex
        break;
      
      case "qrcode.updated":
        console.log(`QR Code updated for instance ${instanceName}:`, payload.data);
        // TODO: Update QR code in Convex
        break;
      
      default:
        console.log(`Unhandled event ${payload.event} for instance ${instanceName}`);
    }

    return NextResponse.json({ 
      success: true,
      message: "Webhook processed successfully",
      instanceName,
      event: payload.event
    });

  } catch (error) {
    console.error("Webhook processing error:", error);
    
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: { instanceName: string } }
) {
  const { instanceName } = params;
  
  // Health check endpoint for specific instance
  return NextResponse.json({ 
    status: "ok",
    service: "whatsapp-webhook",
    instanceName,
    timestamp: new Date().toISOString()
  });
}