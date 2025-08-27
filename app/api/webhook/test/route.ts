import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { v4 as uuidv4 } from 'uuid';

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: NextRequest) {
  const correlationId = uuidv4();
  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      orgId,
      sessionId,
      contactId,
      providerMessageId,
      text,
      instanceName = 'test-instance'
    } = body;

    console.log(`[${correlationId}] TEST WEBHOOK: Processing mock message`, {
      providerMessageId,
      text: text?.substring(0, 50),
      orgId,
      sessionId
    });

    // Create mock Evolution API payload
    const mockEvolutionPayload = {
      event: "messages.upsert",
      data: {
        key: {
          remoteJid: `5561999887766@s.whatsapp.net`,
          fromMe: false,
          id: providerMessageId || `test-${Date.now()}-${Math.random()}`
        },
        message: {
          conversation: text || 'Test message'
        },
        pushName: "Test User",
        messageTimestamp: Date.now()
      }
    };

    // Process through the same webhook logic but with provided orgId/sessionId
    let targetOrgId = orgId;
    let targetSessionId = sessionId;
    let targetContactId = contactId;

    // If no orgId provided, find or create test org
    if (!targetOrgId) {
      let org = await convex.query(api.organizations.getByInstanceName, { 
        instanceName 
      });
      
      if (!org) {
        const newOrgId = await convex.mutation(api.organizations.createForInstance, {
          instanceName: instanceName,
          name: `Test Organization ${instanceName}`,
          settings: {
            autoCreated: true,
            createdFrom: 'test-webhook'
          }
        });
        targetOrgId = newOrgId;
        console.log(`[${correlationId}] Created new test org:`, newOrgId);
      } else {
        targetOrgId = org._id;
      }
    }

    // If no contactId provided, find or create test contact
    if (!targetContactId) {
      let contact = await convex.query(api.contacts.getByExternalId, {
        externalId: mockEvolutionPayload.data.key.remoteJid,
        orgId: targetOrgId
      });
      
      if (!contact) {
        const newContactId = await convex.mutation(api.contacts.create, {
          orgId: targetOrgId,
          name: mockEvolutionPayload.data.pushName,
          channel: 'whatsapp',
          externalId: mockEvolutionPayload.data.key.remoteJid
        });
        contact = { _id: newContactId };
      }
      targetContactId = contact._id;
    }

    // If no sessionId provided, find or create test session
    if (!targetSessionId) {
      let session = await convex.query(api.sessions.getActiveByContact, {
        contactId: targetContactId
      });
      
      if (!session) {
        const newSessionId = await convex.mutation(api.sessions.create, {
          contactId: targetContactId,
          orgId: targetOrgId,
          status: 'active'
        });
        session = { _id: newSessionId };
      }
      targetSessionId = session._id;
    }

    // Use the upsertFromEvolution function to handle idempotency and Redis batching
    const upsertResult = await convex.mutation(api.messages.upsertFromEvolution, {
      orgId: targetOrgId,
      evolutionData: mockEvolutionPayload.data
    });

    if (!upsertResult) {
      throw new Error('Upsert failed - message may be duplicate');
    }

    // Import and use Redis batching logic
    const { SessionStateManager } = await import("@/lib/sessionState");
    const sessionManager = new SessionStateManager(upsertResult.sessionId);

    // Update last user timestamp
    await sessionManager.setLastUserTimestamp(mockEvolutionPayload.data.messageTimestamp);

    // Get AI configuration for batching
    const aiConfig = await convex.query(api.aiConfigurations.getByOrg, {
      orgId: targetOrgId
    });
    const batchingDelayMs = aiConfig?.batchingDelayMs || 120000;

    // Check batch window and potentially schedule AI processing
    const existingBatchUntil = await sessionManager.getBatchUntil();
    const now = Date.now();

    if (!existingBatchUntil || now > existingBatchUntil) {
      // Start new batch window
      const newBatchUntil = now + batchingDelayMs;
      await sessionManager.setBatchUntil(newBatchUntil);

      console.log(`[${correlationId}] Started new batch window until ${new Date(newBatchUntil).toISOString()}`);

      // Schedule AI processing (this would use Convex scheduler in real scenario)
      await convex.mutation(api.ai.scheduleReply, {
        sessionId: upsertResult.sessionId,
        orgId: targetOrgId,
        scheduledFor: newBatchUntil,
        correlationId
      });
    } else {
      console.log(`[${correlationId}] Added to existing batch window ending at ${new Date(existingBatchUntil).toISOString()}`);
    }

    // Add message to pending queue
    const messagePayload = {
      messageId: upsertResult.messageId,
      contactId: upsertResult.contactId,
      text: text,
      timestamp: mockEvolutionPayload.data.messageTimestamp,
      providerMessageId: mockEvolutionPayload.data.key.id,
      correlationId
    };

    await sessionManager.addPendingMessage(messagePayload);

    const processingTime = Date.now() - startTime;

    console.log(`[${correlationId}] Test webhook processing completed in ${processingTime}ms`);

    return NextResponse.json({
      success: true,
      correlationId,
      processingTimeMs: processingTime,
      result: {
        orgId: targetOrgId,
        sessionId: upsertResult.sessionId,
        contactId: upsertResult.contactId,
        messageId: upsertResult.messageId,
        batchWindow: existingBatchUntil || (now + batchingDelayMs),
        duplicate: false
      }
    });

  } catch (error) {
    const processingTime = Date.now() - startTime;
    console.error(`[${correlationId}] Test webhook error (${processingTime}ms):`, error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      correlationId,
      processingTimeMs: processingTime
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    service: "test-webhook",
    description: "Mock webhook endpoint for local testing",
    usage: {
      method: "POST",
      body: {
        text: "Message text (required)",
        providerMessageId: "Unique message ID (optional - auto-generated)",
        orgId: "Organization ID (optional - uses test org)",
        sessionId: "Session ID (optional - uses/creates test session)", 
        contactId: "Contact ID (optional - uses/creates test contact)",
        instanceName: "Instance name for test org (default: test-instance)"
      }
    },
    timestamp: new Date().toISOString()
  });
}