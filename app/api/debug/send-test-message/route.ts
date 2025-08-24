import { NextResponse } from "next/server";

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "qify-5561999449983";

export async function POST(request: Request) {
  try {
    const { to, message } = await request.json();
    
    const targetNumber = to || "5561999449983"; // Default to self
    const testMessage = message || "🤖 Teste de webhook do Qify - " + new Date().toISOString();
    
    console.log(`📤 Sending test message to ${targetNumber}: ${testMessage}`);
    
    // Updated to Evolution API v2.3.1 format
    const response = await fetch(`${EVOLUTION_BASE_URL}/message/send-text/${INSTANCE_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      },
      body: JSON.stringify({
        number: targetNumber,
        text: testMessage,
        delay: 0
      }),
      timeout: 15000
    });

    if (response.ok) {
      const data = await response.json();
      console.log("✅ Message sent via Evolution:", data);
      
      return NextResponse.json({
        success: true,
        message: "Test message sent via Evolution API",
        data: data,
        sentTo: targetNumber,
        sentMessage: testMessage
      });
    }

    const errorText = await response.text();
    throw new Error(`Failed to send message: ${response.status} - ${errorText}`);

  } catch (error) {
    console.error("🚨 Error sending test message:", error);
    
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Failed to send test message via Evolution API"
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    info: "POST to this endpoint with {to: 'number', message: 'text'} to send test message",
    example: {
      to: "5561999449983",
      message: "Test message from Qify"
    }
  });
}