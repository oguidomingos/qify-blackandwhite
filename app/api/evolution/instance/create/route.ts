import { NextRequest, NextResponse } from "next/server";

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;

export async function POST(request: NextRequest) {
  try {
    const { instanceName, phoneNumber } = await request.json();

    if (!instanceName || !phoneNumber) {
      return NextResponse.json(
        { success: false, message: "Nome da instância e telefone são obrigatórios" },
        { status: 400 }
      );
    }

    console.log(`📱 Creating Evolution instance: ${instanceName} for ${phoneNumber}`);

    // Payload para criar instância na Evolution API v2.3.1
    const createPayload = {
      instanceName: instanceName,
      token: EVOLUTION_API_KEY,
      qrcode: true,
      integration: "WHATSAPP-BAILEYS",
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhook/whatsapp/${instanceName}`,
      webhookByEvents: true,
      webhookBase64: false,
      events: [
        "APPLICATION_STARTUP",
        "QRCODE_UPDATED", 
        "CONNECTION_UPDATE",
        "MESSAGES_UPSERT",
        "MESSAGES_UPDATE",
        "MESSAGES_DELETE",
        "SEND_MESSAGE",
        "CONTACTS_SET",
        "CONTACTS_UPSERT",
        "CONTACTS_UPDATE",
        "PRESENCE_UPDATE",
        "CHATS_SET",
        "CHATS_UPSERT",
        "CHATS_UPDATE",
        "CHATS_DELETE",
        "GROUPS_UPSERT",
        "GROUP_UPDATE",
        "GROUP_PARTICIPANTS_UPDATE",
        "NEW_JWT_TOKEN"
      ]
    };

    const response = await fetch(`${EVOLUTION_BASE_URL}/instance/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': EVOLUTION_API_KEY!
      },
      body: JSON.stringify(createPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Evolution API error: ${response.status} - ${errorText}`);
      
      return NextResponse.json({
        success: false,
        message: `Erro da Evolution API: ${response.status} - ${errorText}`,
        details: { status: response.status, error: errorText }
      }, { status: response.status });
    }

    const result = await response.json();
    console.log(`✅ Instance created successfully:`, result);

    return NextResponse.json({
      success: true,
      message: "Instância criada com sucesso!",
      data: result,
      instanceName,
      webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhook/whatsapp/${instanceName}`
    });

  } catch (error) {
    console.error("🚨 Error creating instance:", error);
    
    return NextResponse.json({
      success: false,
      message: "Erro interno do servidor",
      error: error instanceof Error ? error.message : "Erro desconhecido"
    }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    info: "POST para criar uma nova instância Evolution",
    example: {
      instanceName: "qify-test-123",
      phoneNumber: "5561999999999"
    },
    webhookUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/webhook/whatsapp/{instanceName}`
  });
}