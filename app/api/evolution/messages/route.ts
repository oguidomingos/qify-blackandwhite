import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "roigem";

interface EvolutionMessage {
  key: {
    id: string;
    remoteJid: string;
    fromMe: boolean;
  };
  message: {
    conversation?: string;
    extendedTextMessage?: { text: string };
    imageMessage?: { caption?: string };
    videoMessage?: { caption?: string };
  };
  messageTimestamp: number;
  pushName?: string;
}

function getTimeFilter(period: string) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const oneWeek = 7 * oneDay;
  const oneMonth = 30 * oneDay;

  switch (period) {
    case 'today':
      return now - oneDay;
    case 'week':
      return now - oneWeek;
    case 'month':
      return now - oneMonth;
    default:
      return 0; // All time
  }
}

function extractMessageText(message: any): string {
  return message.conversation || 
         message.extendedTextMessage?.text || 
         message.imageMessage?.caption || 
         message.videoMessage?.caption ||
         "Mídia recebida";
}


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    const limit = parseInt(searchParams.get('limit') || '100');
    const contactId = searchParams.get('contactId');

    console.log('💬 Messages API - Starting with real Evolution data...', { period, limit, contactId });

    try {
      // Fetch messages from Evolution API with increased timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const requestBody = contactId ? 
        { where: { key: { remoteJid: contactId } } } : 
        { where: {} };
      
      // Try multiple Evolution API endpoint formats (v2.3.1 compatibility)
      const endpoints = [
        `/chat/findMessages/${INSTANCE_NAME}`,
        `/message/findMany/${INSTANCE_NAME}`,
        `/chat/fetchMessages/${INSTANCE_NAME}`,
        `/instance/fetchMessages/${INSTANCE_NAME}`
      ];
      
      let response: Response | null = null;
      let lastError: Error | null = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying messages endpoint: ${endpoint}`);
          
          response = await fetch(`${EVOLUTION_BASE_URL}${endpoint}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY!
            },
            body: JSON.stringify(requestBody),
            signal: controller.signal
          });
          
          if (response.ok) {
            console.log(`✅ Messages endpoint working: ${endpoint}`);
            break;
          } else {
            console.log(`❌ Endpoint ${endpoint} returned: ${response.status}`);
            lastError = new Error(`${endpoint}: ${response.status}`);
          }
        } catch (error) {
          console.log(`🚨 Error with endpoint ${endpoint}:`, error);
          lastError = error instanceof Error ? error : new Error(`Failed: ${endpoint}`);
        }
      }
      
      if (!response || !response.ok) {
        throw lastError || new Error('All message endpoints failed');
      }

      clearTimeout(timeoutId);
      console.log('📊 Evolution API response:', response.status);

      if (!response.ok) {
        throw new Error(`Failed to fetch messages: ${response.status}`);
      }

    const rawData = await response.json();
    console.log('🔍 Raw Evolution API response:', JSON.stringify(rawData, null, 2).substring(0, 500));
    console.log('🔍 Response type:', typeof rawData, 'isArray:', Array.isArray(rawData));
    
    // Handle different response formats
    let rawMessages: EvolutionMessage[] = [];
    if (Array.isArray(rawData)) {
      rawMessages = rawData;
      console.log('📦 Direct array response:', rawMessages.length, 'messages');
    } else if (rawData && typeof rawData === 'object') {
      // Try different possible response structures
      const possibleArrays = [
        rawData.data,
        rawData.messages?.records,  // Evolution API format: { messages: { records: [...] } }
        rawData.messages, 
        rawData.results,
        rawData.items,
        rawData.records
      ];
      
      for (const arr of possibleArrays) {
        if (Array.isArray(arr)) {
          rawMessages = arr;
          console.log('📦 Found messages in wrapped response:', rawMessages.length, 'messages');
          break;
        }
      }
      
      if (rawMessages.length === 0) {
        console.log('📊 Object keys in response:', Object.keys(rawData));
        console.log('⚠️ Could not find message array in response structure');
      }
    }
    
    if (!Array.isArray(rawMessages) || rawMessages.length === 0) {
      throw new Error('Evolution API: No messages found in response or invalid format');
    }
    
    // Apply time filter
    const timeFilter = getTimeFilter(period);
    let filteredMessages = rawMessages.filter(msg => {
      const messageTime = msg.messageTimestamp * 1000; // Convert to milliseconds
      return messageTime >= timeFilter;
    });

    // Filter by contact if specified
    if (contactId) {
      filteredMessages = filteredMessages.filter(msg => 
        msg.key.remoteJid === contactId
      );
    }

    // Transform to our format
    const transformedMessages = filteredMessages
      .slice(0, limit)
      .map((msg, index) => ({
        _id: msg.key.id,
        contactId: msg.key.remoteJid,
        externalId: msg.key.remoteJid,
        direction: msg.key.fromMe ? "outbound" : "inbound" as "inbound" | "outbound",
        text: extractMessageText(msg.message),
        messageType: "text",
        createdAt: msg.messageTimestamp * 1000, // Convert to milliseconds
        senderName: msg.pushName || msg.key.remoteJid.split('@')[0],
        metadata: {
          whatsappId: msg.key.id,
          timestamp: msg.messageTimestamp,
          fromMe: msg.key.fromMe
        }
      }))
      .sort((a, b) => b.createdAt - a.createdAt); // Most recent first

    // Calculate statistics
    const totalMessages = transformedMessages.length;
    const inboundCount = transformedMessages.filter(m => m.direction === "inbound").length;
    const outboundCount = transformedMessages.filter(m => m.direction === "outbound").length;
    const uniqueContacts = new Set(transformedMessages.map(m => m.contactId)).size;

      console.log('✅ Real messages fetched:', transformedMessages.length);
      
      return NextResponse.json({
        success: true,
        messages: transformedMessages,
        statistics: {
          total: totalMessages,
          inbound: inboundCount,
          outbound: outboundCount,
          uniqueContacts: uniqueContacts,
          period: period,
          timeRange: {
            from: timeFilter,
            to: Date.now()
          }
        },
        fallback: false
      });

    } catch (apiError) {
      console.log('🚨 Evolution API failed:', apiError);
      
      // Return clear error instead of mock data
      const errorMessage = apiError instanceof Error ? apiError.message : "Unknown API error";
      
      return NextResponse.json({
        success: false,
        messages: [],
        statistics: {
          total: 0,
          inbound: 0,
          outbound: 0,
          uniqueContacts: 0,
          period: period,
          timeRange: {
            from: getTimeFilter(period),
            to: Date.now()
          }
        },
        fallback: false,
        error: errorMessage,
        message: "Evolution API indisponível - Verifique conexão com o WhatsApp"
      }, { status: 503 });
    }

  } catch (error) {
    console.error("🚨 Messages API critical error:", error);
    
    // Return clear system error
    return NextResponse.json({
      success: false,
      messages: [],
      statistics: {
        total: 0,
        inbound: 0,
        outbound: 0,
        uniqueContacts: 0,
        period: searchParams.get('period') || 'all',
        timeRange: {
          from: 0,
          to: Date.now()
        }
      },
      fallback: false,
      error: error instanceof Error ? error.message : "Sistema indisponível",
      message: "Erro crítico no sistema - Entre em contato com suporte"
    }, { status: 500 });
  }
}