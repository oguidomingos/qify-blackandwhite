import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "oguidomingos";

interface EvolutionMessage {
  key: {
    id: string;
    remoteJid: string;
    fromMe: boolean;
  };
  message: {
    conversation?: string;
    extendedTextMessage?: { text: string };
    imageMessage?: { caption?: string; url?: string };
    videoMessage?: { caption?: string; url?: string };
    audioMessage?: { url?: string };
    documentMessage?: { caption?: string; url?: string };
  };
  messageTimestamp: number;
  pushName?: string;
}

function extractMessageText(message: any): string {
  if (message.conversation) return message.conversation;
  if (message.extendedTextMessage?.text) return message.extendedTextMessage.text;
  if (message.imageMessage?.caption) return message.imageMessage.caption || "📷 Imagem";
  if (message.videoMessage?.caption) return message.videoMessage.caption || "🎥 Vídeo";
  if (message.audioMessage) return "🎤 Áudio";
  if (message.documentMessage) return message.documentMessage.caption || "📄 Documento";
  return "Mensagem";
}

function getMessageType(message: any): string {
  if (message.conversation || message.extendedTextMessage) return "text";
  if (message.imageMessage) return "image";
  if (message.videoMessage) return "video";
  if (message.audioMessage) return "audio";
  if (message.documentMessage) return "document";
  return "unknown";
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const contactId = searchParams.get('contactId');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!contactId) {
      return NextResponse.json({
        success: false,
        error: "contactId is required",
        message: "Por favor forneça o ID do contato"
      }, { status: 400 });
    }

    console.log('💬 Conversation API - Fetching messages for contact:', contactId);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      // Fetch messages for specific contact
      const requestBody = {
        where: {
          key: {
            remoteJid: contactId
          }
        },
        limit: limit
      };

      // Try multiple Evolution API endpoint formats
      const endpoints = [
        `/chat/findMessages/${INSTANCE_NAME}`,
        `/message/findMany/${INSTANCE_NAME}`,
        `/chat/fetchMessages/${INSTANCE_NAME}`
      ];

      let response: Response | null = null;
      let lastError: Error | null = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying endpoint: ${endpoint}`);

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
            console.log(`✅ Endpoint working: ${endpoint}`);
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

      clearTimeout(timeoutId);

      if (!response || !response.ok) {
        throw lastError || new Error('All message endpoints failed');
      }

      const rawData = await response.json();
      console.log('📦 Raw response type:', typeof rawData, 'isArray:', Array.isArray(rawData));

      // Handle different response formats
      let rawMessages: EvolutionMessage[] = [];
      if (Array.isArray(rawData)) {
        rawMessages = rawData;
      } else if (rawData && typeof rawData === 'object') {
        const possibleArrays = [
          rawData.data,
          rawData.messages?.records,
          rawData.messages,
          rawData.results,
          rawData.items,
          rawData.records
        ];

        for (const arr of possibleArrays) {
          if (Array.isArray(arr)) {
            rawMessages = arr;
            break;
          }
        }
      }

      if (!Array.isArray(rawMessages)) {
        throw new Error('Invalid response format from Evolution API');
      }

      console.log(`✅ Found ${rawMessages.length} messages for contact ${contactId}`);

      // Transform and sort messages (oldest first for conversation view)
      const transformedMessages = rawMessages
        .map((msg) => ({
          _id: msg.key.id,
          contactId: msg.key.remoteJid,
          direction: msg.key.fromMe ? "outbound" : "inbound" as "inbound" | "outbound",
          text: extractMessageText(msg.message),
          messageType: getMessageType(msg.message),
          timestamp: msg.messageTimestamp * 1000,
          senderName: msg.pushName || msg.key.remoteJid.split('@')[0],
          fromMe: msg.key.fromMe,
          metadata: {
            whatsappId: msg.key.id,
            timestamp: msg.messageTimestamp,
            rawMessage: msg.message
          }
        }))
        .sort((a, b) => a.timestamp - b.timestamp); // Oldest first

      // Get contact info from first message
      const contactName = transformedMessages[0]?.senderName || contactId.split('@')[0];
      const phoneNumber = contactId.split('@')[0];

      // Calculate conversation statistics
      const totalMessages = transformedMessages.length;
      const inboundCount = transformedMessages.filter(m => m.direction === "inbound").length;
      const outboundCount = transformedMessages.filter(m => m.direction === "outbound").length;
      const lastMessage = transformedMessages[transformedMessages.length - 1];

      // Get last 20 messages for context
      const recentMessages = transformedMessages.slice(-20);

      return NextResponse.json({
        success: true,
        conversation: {
          contactId: contactId,
          contactName: contactName,
          phoneNumber: phoneNumber,
          totalMessages: totalMessages,
          messages: transformedMessages,
          recentMessages: recentMessages, // Last 20 for AI context
          statistics: {
            total: totalMessages,
            inbound: inboundCount,
            outbound: outboundCount,
            lastMessageAt: lastMessage?.timestamp || Date.now(),
            lastMessageDirection: lastMessage?.direction || "inbound"
          },
          lastMessage: lastMessage || null
        },
        source: 'evolution_api'
      });

    } catch (apiError) {
      console.log('🚨 Evolution API failed:', apiError);

      const errorMessage = apiError instanceof Error ? apiError.message : "Unknown API error";

      return NextResponse.json({
        success: false,
        error: errorMessage,
        message: 'Evolution API indisponível - Verifique conexão com o WhatsApp'
      }, { status: 503 });
    }

  } catch (error) {
    console.error("🚨 Conversation API critical error:", error);

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Sistema indisponível",
      message: 'Erro crítico no sistema - Entre em contato com suporte'
    }, { status: 500 });
  }
}
