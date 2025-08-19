import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function processWhatsAppMessage(instanceName: string, messageData: any) {
  try {
    const { key, message, pushName, messageTimestamp } = messageData;
    const phoneNumber = key.remoteJid.replace('@s.whatsapp.net', '');
    const messageText = message.conversation || message.text || '';
    
    console.log(`Processing message from ${phoneNumber}: ${messageText}`);
    
    // Find organization by instance name
    const orgQuery = await convex.query("organizations.getByInstanceName" as any, { 
      instanceName 
    });
    
    if (!orgQuery) {
      console.log('Organization not found for instance:', instanceName);
      return;
    }
    
    // Find or create contact
    let contact = await convex.query("contacts.getByExternalId" as any, {
      externalId: key.remoteJid,
      orgId: orgQuery._id
    });
    
    if (!contact) {
      const contactId = await convex.mutation("contacts.create" as any, {
        orgId: orgQuery._id,
        name: pushName || 'Unknown',
        channel: 'whatsapp',
        externalId: key.remoteJid
      });
      contact = { _id: contactId };
    }
    
    console.log('Contact found/created:', contact._id);
    
    // Find or create session
    let session = await convex.query("sessions.getActiveByContact" as any, {
      contactId: contact._id
    });
    
    if (!session) {
      const sessionId = await convex.mutation("sessions.create" as any, {
        contactId: contact._id,
        orgId: orgQuery._id,
        channel: 'whatsapp',
        status: 'active'
      });
      session = { _id: sessionId };
    }
    
    console.log('Session found/created:', session._id);
    
    // Save incoming message
    const savedMessage = await convex.mutation("messages.create" as any, {
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
    
    // Trigger AI processing immediately - let AI function handle batching
    console.log('Triggering AI processing for session:', session._id);
    try {
      await convex.action("ai.generateAiReply" as any, {
        orgId: orgQuery._id,
        sessionId: session._id
      });
      console.log('AI processing triggered for session:', session._id);
    } catch (error) {
      console.error('Error triggering AI processing:', error);
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

    // Validate JSON payload
    let payload;
    try {
      payload = JSON.parse(raw);
    } catch (error) {
      console.error("Invalid JSON payload:", error);
      return NextResponse.json({ 
        error: "Invalid JSON payload" 
      }, { status: 400 });
    }

    console.log("Webhook received:", {
      instanceName,
      event: payload.event,
      hasData: !!payload.data,
      payload: payload
    });

    // Process different types of events
    switch (payload.event) {
      case "messages.upsert":
        console.log(`New message for instance ${instanceName}:`, payload.data);
        
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