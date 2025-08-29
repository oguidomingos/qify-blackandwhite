import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "roigem";

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
      
      // Use documented Evolution API endpoint (v2.3.1) 
      const endpoint = `/chat/findContacts/${INSTANCE_NAME}`;
      console.log(`🔍 Using official contacts endpoint: ${endpoint}`);
      
      const contactsResponse = await fetch(`${EVOLUTION_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY!
        },
        body: JSON.stringify({}),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!contactsResponse.ok) {
        throw new Error(`Evolution API returned ${contactsResponse.status}: ${contactsResponse.statusText}`);
      }

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
      
    } catch (apiError) {
      console.log('🚨 Evolution API failed, falling back to Convex data:', apiError);
      
      // Fallback to Convex data when Evolution API is unavailable
      try {
        const { ConvexHttpClient } = require("convex/browser");
        const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);
        
        // Get roigem organization
        const orgs = await convex.query("organizations:list");
        const roigemOrg = orgs.find((org: any) => 
          org.name?.toLowerCase().includes("roigem") || 
          org.instanceName === "roigem"
        );
        
        if (roigemOrg) {
          const convexContacts = await convex.query("contacts:listByOrg", { 
            orgId: roigemOrg._id 
          });
          
          console.log(`✅ Fallback: Found ${convexContacts?.length || 0} contacts in Convex`);
          
          const formattedContacts = (convexContacts || [])
            .slice(0, limit)
            .map((contact: any) => ({
              _id: contact._id,
              name: contact.name,
              channel: contact.channel,
              externalId: contact.externalId,
              phoneNumber: contact.externalId?.replace('@s.whatsapp.net', '') || '',
              profilePicUrl: null,
              lastMessageAt: Date.now(),
              createdAt: contact.createdAt || Date.now(),
              isActive: true,
              metadata: {
                source: 'convex_fallback',
                contactId: contact._id
              }
            }));
          
          return NextResponse.json({
            success: true,
            contacts: formattedContacts,
            total: convexContacts?.length || 0,
            retrieved: formattedContacts.length,
            fallback: true,
            source: 'convex_database',
            message: `Exibindo ${formattedContacts.length} contatos do banco de dados (Evolution API indisponível)`
          });
        }
      } catch (convexError) {
        console.error('❌ Convex fallback also failed:', convexError);
      }
      
      // Final fallback - return error
      const errorMessage = apiError instanceof Error ? apiError.message : "Unknown API error";
      
      return NextResponse.json({
        success: false,
        contacts: [],
        total: 0,
        retrieved: 0,
        fallback: false,
        error: errorMessage,
        message: 'Evolution API e Convex indisponíveis - Tente novamente em alguns minutos'
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