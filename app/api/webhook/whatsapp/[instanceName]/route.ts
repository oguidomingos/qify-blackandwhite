import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { SessionStateManager, isDuplicateMessage } from "@/lib/sessionState";
import { v4 as uuidv4 } from 'uuid';

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

async function processWhatsAppMessage(instanceName: string, messageData: any, correlationId: string) {
  const startTime = Date.now();
  const context = { correlationId, instanceName, startTime };
  
  try {
    const { key, message, pushName, messageTimestamp } = messageData;
    const phoneNumber = key.remoteJid.replace('@s.whatsapp.net', '');
    const messageText = message.conversation || message.text || '';
    const providerMessageId = key.id;
    
    console.log(`[${correlationId}] Processing message from ${phoneNumber}: ${messageText}`, context);
    
    // DUAL IDEMPOTENCY CHECK
    // 1. Fast Redis check first
    const isDupeRedis = await isDuplicateMessage(providerMessageId);
    if (isDupeRedis) {
      console.log(`[${correlationId}] Message ${providerMessageId} is duplicate (Redis)`);
      return { success: true, duplicate: true, source: 'redis' };
    }
    
    // 2. Authoritative Convex check
    const existingMessage = await convex.query(api.messages.getByProviderId, {
      providerMessageId
    });
    
    if (existingMessage) {
      console.log(`[${correlationId}] Message ${providerMessageId} is duplicate (Convex)`);
      return { success: true, duplicate: true, source: 'convex' };
    }
    
    console.log(`[${correlationId}] Message ${providerMessageId} is new, proceeding with ingest`);
    
    // Find organization by instance name
    let orgQuery = await convex.query(api.organizations.getByInstanceName, { 
      instanceName 
    });
    
    if (!orgQuery) {
      console.log(`[${correlationId}] Organization not found for instance: ${instanceName} - Creating new organization`);
      
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
        console.log(`[${correlationId}] Auto-created organization:`, orgQuery._id);
      } catch (createError) {
        console.error(`[${correlationId}] Error creating organization:`, createError);
        return;
      }
    }
    
    // Use Convex upsertFromEvolution for atomic contact/session/message creation
    console.log(`[${correlationId}] Upserting message via Convex...`);
    const upsertResult = await convex.mutation(api.messages.upsertFromEvolution, {
      orgId: orgQuery._id,
      evolutionData: messageData
    });
    
    if (!upsertResult) {
      console.error(`[${correlationId}] Upsert failed - missing data`);
      return { success: false, error: 'Upsert failed' };
    }
    
    const { sessionId, contactId, messageId } = upsertResult;
    console.log(`[${correlationId}] Upsert successful:`, { sessionId, contactId, messageId });
    
    // Initialize session state manager for batching
    const sessionManager = new SessionStateManager(sessionId);
    
    // Update last user timestamp for this session
    await sessionManager.setLastUserTimestamp(messageTimestamp || Date.now());
    
    // Get AI configuration for dynamic batching delay
    const aiConfig = await convex.query(api.aiConfigurations.getByOrg, {
      orgId: orgQuery._id
    });
    const batchingDelayMs = aiConfig?.batchingDelayMs || 120000; // 120 seconds default
    
    // Check if we should start a new batch window or add to existing
    const existingBatchUntil = await sessionManager.getBatchUntil();
    const now = Date.now();
    
    if (!existingBatchUntil || now > existingBatchUntil) {
      // Start new batch window
      const newBatchUntil = now + batchingDelayMs;
      await sessionManager.setBatchUntil(newBatchUntil);
      
      console.log(`[${correlationId}] Started new batch window until ${new Date(newBatchUntil).toISOString()}`);
      
      // Schedule processing at the end of the batch window using Convex scheduler
      await convex.mutation(api.ai.scheduleReply, {
        sessionId,
        orgId: orgQuery._id,
        scheduledFor: newBatchUntil,
        correlationId
      });
    } else {
      console.log(`[${correlationId}] Added to existing batch window ending at ${new Date(existingBatchUntil).toISOString()}`);
    }
    
    // Add message to pending queue
    const messagePayload = {
      messageId,
      contactId,
      text: messageText,
      timestamp: messageTimestamp || Date.now(),
      providerMessageId,
      correlationId
    };
    
    await sessionManager.addPendingMessage(messagePayload);
    
    const processingTime = Date.now() - startTime;
    console.log(`[${correlationId}] Message processing completed in ${processingTime}ms`);
    
    return { 
      success: true, 
      sessionId, 
      messageId, 
      contactId,
      batchWindow: existingBatchUntil || (now + batchingDelayMs),
      processingTimeMs: processingTime
    };
    
  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${correlationId}] Error processing WhatsApp message (${processingTime}ms):`, error);
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
  const startTime = Date.now();
  const correlationId = uuidv4();
  
  try {
    const { instanceName } = params;
    const context = { correlationId, instanceName, startTime };
    const raw = await req.text();
    const signature = req.headers.get("x-signature") || "";

    console.log(`[${correlationId}] Webhook received for instance: ${instanceName}`, {
      ...context,
      payloadSize: raw.length,
      hasSignature: !!signature
    });

    // Optional: verify HMAC signature if provided
    const webhookSecret = process.env.EVOLUTION_WEBHOOK_SECRET;
    if (signature && webhookSecret) {
      if (!verifySignature(raw, signature, webhookSecret)) {
        console.error(`[${correlationId}] Invalid signature`, context);
        return NextResponse.json({ 
          error: "Invalid signature",
          correlationId
        }, { status: 401 });
      }
      console.log(`[${correlationId}] Signature verified successfully`);
    }

    // Validate JSON payload with robust handling for special characters
    let payload;
    try {
      console.log(`[${correlationId}] Parsing JSON payload (${raw.length} bytes)`);
      
      // Try parsing the JSON
      payload = JSON.parse(raw);
      
      // Sanitize text content if present
      if (payload.data?.message?.conversation) {
        const originalText = payload.data.message.conversation;
        
        // Clean up any problematic characters but preserve Portuguese
        const cleanedText = originalText
          .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, '') // Remove control characters
          .trim();
        
        payload.data.message.conversation = cleanedText;
        
        if (originalText !== cleanedText) {
          console.log(`[${correlationId}] Sanitized message text`, {
            originalLength: originalText.length,
            cleanedLength: cleanedText.length
          });
        }
      }
    } catch (error) {
      console.error(`[${correlationId}] JSON parsing error:`, error);
      
      // Try to identify the problematic character
      const match = error.message.match(/position (\d+)/);
      if (match) {
        const pos = parseInt(match[1]);
        const surrounding = raw.substring(Math.max(0, pos - 10), pos + 10);
        console.error(`[${correlationId}] Problematic text around position ${pos}:`, surrounding);
      }
      
      return NextResponse.json({ 
        error: "Invalid JSON payload",
        details: error.message,
        position: match ? parseInt(match[1]) : null,
        correlationId
      }, { status: 400 });
    }

    console.log(`[${correlationId}] Webhook parsed successfully:`, {
      ...context,
      event: payload.event,
      hasData: !!payload.data,
      messageText: payload.data?.message?.conversation || null,
      pushName: payload.data?.pushName || null,
      messageId: payload.data?.key?.id || null
    });

    let processingResult = null;

    // Process different types of events
    switch (payload.event) {
      case "messages.upsert":
        console.log(`[${correlationId}] Processing message upsert for ${instanceName}:`, {
          from: payload.data.key?.remoteJid,
          text: payload.data.message?.conversation,
          pushName: payload.data.pushName,
          timestamp: payload.data.messageTimestamp,
          messageId: payload.data.key?.id
        });
        
        // Process incoming message with Redis batching
        try {
          processingResult = await processWhatsAppMessage(instanceName, payload.data, correlationId);
          console.log(`[${correlationId}] Message processing completed:`, processingResult);
        } catch (error) {
          console.error(`[${correlationId}] Error processing message:`, error);
          return NextResponse.json({
            error: "Message processing failed",
            details: error instanceof Error ? error.message : "Unknown error",
            correlationId
          }, { status: 500 });
        }
        break;
      
      case "connection.update":
        console.log(`[${correlationId}] Connection update for instance ${instanceName}:`, payload.data);
        // TODO: Update instance status in Convex
        break;
      
      case "qrcode.updated":
        console.log(`[${correlationId}] QR Code updated for instance ${instanceName}:`, payload.data);
        // TODO: Update QR code in Convex
        break;
      
      default:
        console.log(`[${correlationId}] Unhandled event ${payload.event} for instance ${instanceName}`);
    }

    const processingTime = Date.now() - startTime;
    
    console.log(`[${correlationId}] Webhook processing completed in ${processingTime}ms`);

    return NextResponse.json({ 
      success: true,
      message: "Webhook processed successfully",
      instanceName,
      event: payload.event,
      correlationId,
      processingTimeMs: processingTime,
      result: processingResult
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${correlationId}] Webhook processing error (${processingTime}ms):`, error);
    
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error",
      correlationId,
      processingTimeMs: processingTime
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