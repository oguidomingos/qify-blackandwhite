import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "qify-5561999449983";

interface EvolutionContact {
  id: string;
  remoteJid: string;
  pushName?: string;
  profilePicUrl?: string;
  createdAt: string;
  updatedAt: string;
  instanceId: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50');

    console.log('📞 Contacts API - Starting with real Evolution data...', { limit });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Use the correct POST endpoint with empty body to get all contacts
      const contactsResponse = await fetch(`${EVOLUTION_BASE_URL}/chat/findContacts/${INSTANCE_NAME}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY!
        },
        body: JSON.stringify({}),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (contactsResponse.ok) {
        const realContacts: EvolutionContact[] = await contactsResponse.json();
        console.log('✅ Real Evolution contacts fetched:', realContacts.length);
        
        // Transform real Evolution contacts to our format
        const transformedContacts = realContacts
          .slice(0, limit)
          .map((contact, index) => {
            const phoneNumber = contact.remoteJid.split('@')[0];
            const contactName = contact.pushName || phoneNumber;
            
            return {
              _id: contact.id,
              name: contactName,
              channel: "whatsapp",
              externalId: contact.remoteJid,
              phoneNumber: phoneNumber,
              profilePicUrl: contact.profilePicUrl || null,
              lastMessageAt: new Date(contact.updatedAt).getTime(),
              createdAt: new Date(contact.createdAt).getTime(),
              isActive: true,
              metadata: {
                evolutionContactId: contact.id,
                remoteJid: contact.remoteJid,
                instanceId: contact.instanceId,
                originalPushName: contact.pushName
              }
            };
          });

        return NextResponse.json({
          success: true,
          contacts: transformedContacts,
          total: realContacts.length,
          retrieved: transformedContacts.length,
          fallback: false,
          source: 'evolution_api_real',
          message: `Fetched ${realContacts.length} real contacts from Evolution API`
        });
      }
      
      throw new Error(`Evolution API returned ${contactsResponse.status}: ${contactsResponse.statusText}`);
      
    } catch (apiError) {
      console.log('🚨 Evolution API failed:', apiError);
      
      // Return clear error instead of empty data
      const errorMessage = apiError instanceof Error ? apiError.message : "Unknown API error";
      
      return NextResponse.json({
        success: false,
        contacts: [],
        total: 0,
        retrieved: 0,
        fallback: false,
        error: errorMessage,
        message: 'Evolution API indisponível - Verifique conexão com o WhatsApp'
      }, { status: 503 });
    }

  } catch (error) {
    console.error("🚨 Contacts API critical error:", error);
    
    // Return clear system error
    return NextResponse.json({
      success: false,
      contacts: [],
      total: 0,
      retrieved: 0,
      fallback: false,
      error: error instanceof Error ? error.message : "Sistema indisponível",
      message: 'Erro crítico no sistema - Entre em contato com suporte'
    }, { status: 500 });
  }
}