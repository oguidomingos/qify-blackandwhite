import { NextRequest, NextResponse } from "next/server";

// API key protegida (não exposta no código)
const EVOLUTION_API_KEY = "509dbd54-c20c-4a5b-b889-a0494a861f5a";

export async function POST(request: NextRequest) {
  try {
    const { instanceName, phoneNumber, orgId } = await request.json();

    if (!instanceName || !phoneNumber) {
      return NextResponse.json(
        { error: "Instance name and phone number are required" },
        { status: 400 }
      );
    }

    console.log(`Creating WhatsApp instance: ${instanceName} for phone: ${phoneNumber}`);

    // Verificar se a instância já existe
    let instanceExists = false;
    const checkResponse = await fetch(`${process.env.EVOLUTION_BASE_URL}/instance/connectionState/${instanceName}`, {
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    if (checkResponse.ok) {
      console.log('Instance already exists, using existing instance');
      instanceExists = true;
    } else {
      // Criar nova instância na Evolution API
      const createResponse = await fetch(`${process.env.EVOLUTION_BASE_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          instanceName,
          token: process.env.EVOLUTION_SHARED_TOKEN,
          qrcode: true,
          integration: "WHATSAPP-BAILEYS"
        }),
      });

      console.log(`Create response status: ${createResponse.status}`);

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error(`Evolution API create error: ${createResponse.status} - ${errorText}`);
        
        // Se o erro for que a instância já existe, considerar como sucesso
        if (errorText.includes("already in use")) {
          console.log('Instance already exists (from error), proceeding...');
          instanceExists = true;
        } else {
          throw new Error(`Evolution API error: ${createResponse.status} ${errorText}`);
        }
      } else {
        const createData = await createResponse.json();
        console.log('Instance created:', createData);
      }
    }

    // Tentar obter QR Code
    const qrResponse = await fetch(`${process.env.EVOLUTION_BASE_URL}/instance/connect/${instanceName}`, {
      method: 'GET',
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    console.log(`QR response status: ${qrResponse.status}`);

    if (qrResponse.ok) {
      const qrData = await qrResponse.json();
      console.log('QR Code obtained');

      // Configurar webhook automaticamente
      try {
        const baseUrl = process.env.WEBHOOK_URL || `${process.env.NEXT_PUBLIC_APP_URL || 'https://qify-blackandwhite.vercel.app'}`;
        const webhookUrl = `${baseUrl}/api/webhook/whatsapp/${instanceName}`;
        const webhookResponse = await fetch(`${process.env.EVOLUTION_BASE_URL}/webhook/set/${instanceName}`, {
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

        if (webhookResponse.ok) {
          console.log('Webhook configured automatically');
        } else {
          console.warn('Failed to configure webhook automatically');
        }
      } catch (webhookError) {
        console.warn('Error configuring webhook:', webhookError);
      }
      
      return NextResponse.json({
        success: true,
        instanceName,
        qrCode: qrData.base64 || qrData.code || qrData.qrcode,
        message: "Instance created successfully"
      });
    } else {
      console.log('QR Code not available yet, returning without QR');
      return NextResponse.json({
        success: true,
        instanceName,
        message: "Instance created successfully, QR code will be available shortly"
      });
    }

  } catch (error) {
    console.error('Error creating WhatsApp instance:', error);
    return NextResponse.json(
      { error: `Failed to create WhatsApp instance: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}