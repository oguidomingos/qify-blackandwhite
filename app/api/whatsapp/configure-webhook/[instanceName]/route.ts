import { NextRequest, NextResponse } from "next/server";

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_API_TOKEN;
const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || process.env.EVOLUTION_API_URL;

export async function POST(
  request: NextRequest,
  { params }: { params: { instanceName: string } }
) {
  try {
    const { instanceName } = params;

    if (!instanceName) {
      return NextResponse.json(
        { error: "Instance name is required" },
        { status: 400 }
      );
    }

    // URL do webhook do Qify (deve ser uma URL pública acessível)
    // Para desenvolvimento local, use ngrok ou similar
    // Incluindo o instanceName na URL para clusterização
    const baseUrl = process.env.WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'https://qify-blackandwhite.vercel.app'}`;
    const webhookUrl = `${baseUrl}/api/webhook/whatsapp/${instanceName}`;
    
    console.log(`Configuring webhook for ${instanceName} to ${webhookUrl}`);

    // Configurar webhook na Evolution API
    const webhookResponse = await fetch(`${EVOLUTION_BASE_URL}/webhook/set/${instanceName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY,
      },
      body: JSON.stringify({
        webhook: {
          enabled: true,
          url: webhookUrl,
          webhook_by_events: true,
          webhook_base64: true,
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
    });

    console.log(`Webhook response status: ${webhookResponse.status}`);

    if (!webhookResponse.ok) {
      const errorText = await webhookResponse.text();
      console.error(`Webhook API error: ${webhookResponse.status} - ${errorText}`);
      throw new Error(`Webhook API error: ${webhookResponse.status} ${errorText}`);
    }

    const webhookData = await webhookResponse.json();
    console.log('Webhook configured:', webhookData);

    return NextResponse.json({
      success: true,
      webhookUrl,
      message: "Webhook configured successfully"
    });

  } catch (error) {
    console.error('Error configuring webhook:', error);
    return NextResponse.json(
      { error: `Failed to configure webhook: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}
    if (!EVOLUTION_API_KEY || !EVOLUTION_BASE_URL) {
      throw new Error("Evolution API credentials not configured");
    }
