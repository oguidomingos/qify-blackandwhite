import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

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

export async function POST(req: NextRequest) {
  try {
    const raw = await req.text();
    const instanceId = req.headers.get("x-instance-id") || 
                     new URL(req.url).searchParams.get("instanceId") || "";
    const token = req.headers.get("x-webhook-token") || 
                 new URL(req.url).searchParams.get("token") || "";
    const signature = req.headers.get("x-signature") || "";

    if (!instanceId || !token) {
      console.error("Missing instanceId or token");
      return NextResponse.json({ 
        error: "Missing instanceId or token" 
      }, { status: 400 });
    }

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
      instanceId,
      event: payload.event,
      hasData: !!payload.data,
    });

    // TODO: Process webhook through Convex
    // This would require setting up Convex HTTP API or using a different approach
    console.log("Webhook received successfully:", {
      instanceId,
      event: payload.event,
      hasData: !!payload.data,
    });

    return NextResponse.json({ 
      success: true,
      message: "Webhook processed successfully"
    });

  } catch (error) {
    console.error("Webhook processing error:", error);
    
    return NextResponse.json({ 
      error: "Internal server error",
      message: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  // Health check endpoint
  return NextResponse.json({ 
    status: "ok",
    service: "whatsapp-webhook",
    timestamp: new Date().toISOString()
  });
}