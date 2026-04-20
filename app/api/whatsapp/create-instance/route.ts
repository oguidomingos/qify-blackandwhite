import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { fetchMutation, fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || process.env.EVOLUTION_API_TOKEN;
const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL || process.env.EVOLUTION_API_URL;

export async function POST(request: NextRequest) {
  try {
    const { orgId: userId, orgId: clerkOrgId } = auth();
    const { instanceName, phoneNumber, orgId: clientOrgId } = await request.json();

    if (!instanceName || !phoneNumber) {
      return NextResponse.json(
        { error: "Instance name and phone number are required" },
        { status: 400 }
      );
    }

    // Resolve orgId server-side if not provided by client
    let orgId = clientOrgId;
    if (!orgId) {
      const { orgId: clerkOrg, userId: uid } = auth();
      const organization = await fetchQuery(api.organizations.getViewerOrganization, {
        clerkOrgId: clerkOrg || undefined,
        userId: uid || undefined,
      });
      if (!organization) {
        return NextResponse.json({ error: "Organization not found" }, { status: 404 });
      }
      orgId = organization._id;
    }

    if (!orgId) {
      return NextResponse.json(
        { error: "Could not resolve organization" },
        { status: 400 }
      );
    }

    if (!EVOLUTION_API_KEY || !EVOLUTION_BASE_URL) {
      return NextResponse.json(
        { error: "Evolution API credentials are not configured" },
        { status: 500 }
      );
    }

    console.log(`Creating WhatsApp instance: ${instanceName} for phone: ${phoneNumber}`);

    // Verificar se a instância já existe
    let instanceExists = false;
    const checkResponse = await fetch(`${EVOLUTION_BASE_URL}/instance/connectionState/${instanceName}`, {
      headers: {
        'apikey': EVOLUTION_API_KEY,
      },
    });

    if (checkResponse.ok) {
      console.log('Instance already exists, using existing instance');
      instanceExists = true;
    } else {
      // Criar nova instância na Evolution API
      const createResponse = await fetch(`${EVOLUTION_BASE_URL}/instance/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          instanceName,
          token: process.env.EVOLUTION_SHARED_TOKEN || EVOLUTION_API_KEY,
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
    const qrResponse = await fetch(`${EVOLUTION_BASE_URL}/instance/connect/${instanceName}`, {
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

        if (webhookResponse.ok) {
          console.log('Webhook configured automatically');
        } else {
          console.warn('Failed to configure webhook automatically');
        }
      } catch (webhookError) {
        console.warn('Error configuring webhook:', webhookError);
      }

      const qrCode = qrData.base64 || qrData.code || qrData.qrcode;
      await fetchMutation(api.wa.upsertAccount, {
        orgId,
        instanceId: instanceName,
        instanceName,
        phoneNumber,
        status: qrCode ? "qr_pending" : "connecting",
        baseUrl: EVOLUTION_BASE_URL,
        token: EVOLUTION_API_KEY,
        sharedToken: process.env.EVOLUTION_SHARED_TOKEN || EVOLUTION_API_KEY,
        qrCode,
        lastQrAt: qrCode ? Date.now() : undefined,
      });
      
      return NextResponse.json({
        success: true,
        instanceName,
        qrCode,
        message: "Instance created successfully"
      });
    } else {
      await fetchMutation(api.wa.upsertAccount, {
        orgId,
        instanceId: instanceName,
        instanceName,
        phoneNumber,
        status: instanceExists ? "disconnected" : "creating",
        baseUrl: EVOLUTION_BASE_URL,
        token: EVOLUTION_API_KEY,
        sharedToken: process.env.EVOLUTION_SHARED_TOKEN || EVOLUTION_API_KEY,
      });

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
