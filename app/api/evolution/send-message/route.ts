import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "oguidomingos";

export async function POST(request: Request) {
  try {
    const { contactId, message } = await request.json();

    if (!contactId || !message) {
      return NextResponse.json({
        success: false,
        error: "contactId and message are required"
      }, { status: 400 });
    }

    console.log(`📤 Sending message to ${contactId}...`);

    // Try multiple send message endpoints
    const sendEndpoints = [
      {
        url: `/message/sendText/${INSTANCE_NAME}`,
        method: 'POST',
        body: {
          number: contactId,
          text: message
        }
      },
      {
        url: `/message/sendText/${INSTANCE_NAME}`,
        method: 'POST',
        body: {
          number: contactId.split('@')[0],
          textMessage: {
            text: message
          }
        }
      },
      {
        url: `/send/text/${INSTANCE_NAME}`,
        method: 'POST',
        body: {
          number: contactId,
          message: message
        }
      }
    ];

    let sendResponse: Response | null = null;
    let lastError: Error | null = null;

    for (const endpoint of sendEndpoints) {
      try {
        console.log(`🔍 Trying send endpoint: ${endpoint.url}`);

        sendResponse = await fetch(`${EVOLUTION_BASE_URL}${endpoint.url}`, {
          method: endpoint.method,
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY!
          },
          body: JSON.stringify(endpoint.body)
        });

        if (sendResponse.ok) {
          console.log(`✅ Message sent via: ${endpoint.url}`);
          const data = await sendResponse.json();

          return NextResponse.json({
            success: true,
            message: "Mensagem enviada com sucesso",
            data: data,
            endpoint: endpoint.url
          });
        } else {
          const errorText = await sendResponse.text();
          console.log(`❌ Endpoint ${endpoint.url} failed: ${sendResponse.status} - ${errorText}`);
          lastError = new Error(`${endpoint.url}: ${sendResponse.status}`);
        }
      } catch (error) {
        console.error(`🚨 Error with endpoint ${endpoint.url}:`, error);
        lastError = error instanceof Error ? error : new Error(`Failed: ${endpoint.url}`);
      }
    }

    throw lastError || new Error('All send message endpoints failed');

  } catch (error) {
    console.error("Send message error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      message: "Falha ao enviar mensagem"
    }, { status: 500 });
  }
}
