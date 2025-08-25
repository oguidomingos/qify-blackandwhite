import { NextResponse } from "next/server";

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "qify-5561999449983";

export async function GET() {
  try {
    console.log("🔍 Checking webhook configuration...");
    
    // Try different v2.3.1 webhook route formats
    const webhookResponse = await fetch(`${EVOLUTION_BASE_URL}/webhook/find/${INSTANCE_NAME}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      },
      timeout: 10000
    });

    if (webhookResponse.ok) {
      const webhookData = await webhookResponse.json();
      console.log("✅ Webhook config:", webhookData);
      
      return NextResponse.json({
        success: true,
        webhook: webhookData,
        message: "Webhook configuration retrieved"
      });
    }

    // If webhook fails, try fetchInstances format that worked in build
    const instanceResponse = await fetch(`${EVOLUTION_BASE_URL}/instance/fetchInstances`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      },
      timeout: 10000
    });

    if (instanceResponse.ok) {
      const instanceData = await instanceResponse.json();
      console.log("✅ Instance state:", instanceData);
      
      return NextResponse.json({
        success: true,
        webhook: null,
        instance: instanceData,
        message: "Instance state retrieved, webhook may not be configured"
      });
    }

    throw new Error(`Failed to get webhook or instance info: ${webhookResponse.status}, ${instanceResponse.status}`);

  } catch (error) {
    console.error("🚨 Error checking webhook:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to check webhook/instance status",
      possibleCauses: [
        "Evolution API is down",
        "Network connectivity issues", 
        "Instance may be disconnected",
        "Webhook not properly configured"
      ]
    }, { status: 500 });
  }
}

export async function POST() {
  try {
    console.log("🔄 Forcing webhook reconfiguration...");
    
    // Force reconfigure webhook with current deployment URL
    const webhookUrl = `https://qify-blackandwhite-h70s9bxr1-oguidomingos-projects.vercel.app/api/webhook/whatsapp/${INSTANCE_NAME}`;
    
    // Updated to Evolution API v2.3.1 format
    const response = await fetch(`${EVOLUTION_BASE_URL}/webhook/set/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhook_by_events: true,
          webhook_base64: false,
          events: [
            "APPLICATION_STARTUP",
            "QRCODE_UPDATED", 
            "CONNECTION_UPDATE",
            "MESSAGES_UPSERT",
            "MESSAGES_UPDATE",
            "SEND_MESSAGE"
          ]
        }
      }),
      timeout: 15000
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Webhook reconfigured:", data);
      
      return NextResponse.json({
        success: true,
        webhook: data,
        webhookUrl,
        message: "Webhook forcefully reconfigured"
      });
    }

    throw new Error(`Failed to reconfigure webhook: ${response.status}`);

  } catch (error) {
    console.error("🚨 Error reconfiguring webhook:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to reconfigure webhook"
    }, { status: 500 });
  }
}