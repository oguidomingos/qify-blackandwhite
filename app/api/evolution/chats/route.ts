import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = process.env.EVOLUTION_INSTANCE_NAME || "oguidomingos";

interface EvolutionChat {
  id: string;
  remoteJid: string;
  pushName?: string;
  profilePicUrl?: string;
  updatedAt: string;
  windowStart?: string;
  windowExpires?: string;
  windowActive: boolean;
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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');
    const activeOnly = searchParams.get('activeOnly') === 'true';

    console.log('💬 Chats API - Starting with real Evolution data...', { period, limit, activeOnly });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000);

      let realChats: any[] = [];
      let workingEndpoint = '';

      // Try multiple Evolution API endpoint formats for chats
      const endpoints = [
        { url: `/chat/findChats/${INSTANCE_NAME}`, method: 'POST', body: {} },
        { url: `/chat/find/${INSTANCE_NAME}`, method: 'POST', body: {} },
        { url: `/chat/fetchChats/${INSTANCE_NAME}`, method: 'GET', body: null },
      ];

      let chatsResponse: Response | null = null;
      let lastError: Error | null = null;

      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Trying chats endpoint: ${endpoint.url} (${endpoint.method})`);

          const fetchOptions: any = {
            method: endpoint.method,
            headers: {
              'Content-Type': 'application/json',
              'apikey': EVOLUTION_API_KEY!
            },
            signal: controller.signal
          };

          if (endpoint.body && endpoint.method === 'POST') {
            fetchOptions.body = JSON.stringify(endpoint.body);
          }

          chatsResponse = await fetch(`${EVOLUTION_BASE_URL}${endpoint.url}`, fetchOptions);

          if (chatsResponse.ok) {
            workingEndpoint = endpoint.url;
            console.log(`✅ Chats endpoint working: ${endpoint.url}`);
            break;
          } else {
            const errorText = await chatsResponse.text();
            console.log(`❌ Endpoint ${endpoint.url} returned: ${chatsResponse.status} - ${errorText.substring(0, 200)}`);
            lastError = new Error(`${endpoint.url}: ${chatsResponse.status} ${chatsResponse.statusText}`);
          }
        } catch (error) {
          console.log(`🚨 Error with endpoint ${endpoint.url}:`, error);
          lastError = error instanceof Error ? error : new Error(`Failed: ${endpoint.url}`);
        }
      }

      clearTimeout(timeoutId);

      if (!chatsResponse || !chatsResponse.ok) {
        // If all chat endpoints fail, try to build chats from messages
        console.log('⚠️ All chat endpoints failed, trying to build from messages...');

        try {
          const messagesEndpoints = [
            `/chat/findMessages/${INSTANCE_NAME}`,
            `/message/findMany/${INSTANCE_NAME}`,
          ];

          let messagesResponse: Response | null = null;

          for (const endpoint of messagesEndpoints) {
            try {
              console.log(`🔍 Trying messages endpoint: ${endpoint}`);
              messagesResponse = await fetch(`${EVOLUTION_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'apikey': EVOLUTION_API_KEY!
                },
                body: JSON.stringify({ limit: 200 }),
                signal: controller.signal
              });

              if (messagesResponse.ok) {
                console.log(`✅ Messages endpoint working: ${endpoint}`);
                break;
              }
            } catch (err) {
              console.log(`❌ Messages endpoint ${endpoint} failed:`, err);
            }
          }

          if (messagesResponse && messagesResponse.ok) {
            const messagesData = await messagesResponse.json();
            let messages: any[] = [];

            if (Array.isArray(messagesData)) {
              messages = messagesData;
            } else if (messagesData?.messages?.records) {
              messages = messagesData.messages.records;
            } else if (messagesData?.data) {
              messages = messagesData.data;
            }

            console.log(`📦 Building chats from ${messages.length} messages...`);

            // Group messages by remoteJid to create chats
            const chatMap = new Map();

            messages.forEach((msg: any) => {
              const remoteJid = msg.key?.remoteJid || msg.remoteJid;
              if (!remoteJid) return;

              const existingChat = chatMap.get(remoteJid);
              const msgTimestamp = msg.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now();

              if (!existingChat || msgTimestamp > existingChat.lastMessageTime) {
                chatMap.set(remoteJid, {
                  id: remoteJid,
                  remoteJid: remoteJid,
                  pushName: msg.pushName || existingChat?.pushName || remoteJid.split('@')[0],
                  updatedAt: new Date(msgTimestamp).toISOString(),
                  lastMessageTime: msgTimestamp,
                  windowActive: (Date.now() - msgTimestamp) < (24 * 60 * 60 * 1000),
                  messageCount: (existingChat?.messageCount || 0) + 1
                });
              }
            });

            realChats = Array.from(chatMap.values());
            console.log(`✅ Built ${realChats.length} chats from messages`);
            workingEndpoint = 'messages-fallback';
          } else {
            throw lastError || new Error('All chat and message endpoints failed');
          }
        } catch (fallbackError) {
          console.error('🚨 Fallback strategy also failed:', fallbackError);
          throw lastError || fallbackError;
        }
      } else {
        const rawData = await chatsResponse.json();
        console.log('📦 Raw chats response type:', typeof rawData, 'isArray:', Array.isArray(rawData));

        // Handle different response formats
        if (Array.isArray(rawData)) {
          realChats = rawData;
        } else if (rawData && typeof rawData === 'object') {
          const possibleArrays = [
            rawData.data,
            rawData.chats,
            rawData.messages,
            rawData.results,
            rawData.items
          ];

          for (const arr of possibleArrays) {
            if (Array.isArray(arr)) {
              realChats = arr;
              break;
            }
          }
        }

        console.log('✅ Real Evolution chats fetched:', realChats.length);
      }

      // Apply time filter
      const timeFilter = getTimeFilter(period);
      let filteredChats = realChats;

      if (timeFilter > 0) {
        filteredChats = realChats.filter(chat => {
          const updatedTime = new Date(chat.updatedAt).getTime();
          return updatedTime >= timeFilter;
        });
      }

      // Apply active filter
      if (activeOnly) {
        filteredChats = filteredChats.filter(chat => {
          const updatedTime = new Date(chat.updatedAt).getTime();
          const dayAgo = Date.now() - (24 * 60 * 60 * 1000);
          return updatedTime >= dayAgo || chat.windowActive;
        });
      }

      // Transform to our format
      const transformedChats = filteredChats
        .slice(0, limit)
        .map((chat, index) => {
          const phoneNumber = chat.remoteJid.split('@')[0];
          const contactName = chat.pushName || phoneNumber;
          const lastActivityAt = new Date(chat.updatedAt).getTime();

          return {
            _id: chat.id,
            contactId: chat.remoteJid,
            contactName: contactName,
            channel: "whatsapp",
            unreadCount: chat.windowActive ? 1 : 0, // Estimate based on window activity
            lastMessage: {
              text: chat.messageCount ? `${chat.messageCount} mensagens` : "Conversa ativa",
              timestamp: lastActivityAt,
              fromMe: false,
              direction: "inbound" as "inbound" | "outbound"
            },
            isActive: chat.windowActive || (Date.now() - lastActivityAt) < (24 * 60 * 60 * 1000),
            lastActivityAt: lastActivityAt,
            createdAt: lastActivityAt - (24 * 60 * 60 * 1000), // Estimate creation
            metadata: {
              evolutionChatId: chat.id,
              remoteJid: chat.remoteJid,
              windowActive: chat.windowActive,
              windowStart: chat.windowStart,
              windowExpires: chat.windowExpires,
              originalPushName: chat.pushName,
              source: workingEndpoint
            }
          };
        })
        .sort((a, b) => b.lastActivityAt - a.lastActivityAt);

      // Calculate statistics
      const totalChats = transformedChats.length;
      const activeChats = transformedChats.filter(c => c.isActive).length;
      const unreadChats = transformedChats.filter(c => c.unreadCount > 0).length;
      const totalUnreadMessages = transformedChats.reduce((sum, c) => sum + c.unreadCount, 0);

      return NextResponse.json({
        success: true,
        chats: transformedChats,
        statistics: {
          total: totalChats,
          active: activeChats,
          unread: unreadChats,
          totalUnreadMessages: totalUnreadMessages,
          period: period,
          timeRange: {
            from: timeFilter,
            to: Date.now()
          }
        },
        fallback: workingEndpoint === 'messages-fallback',
        source: workingEndpoint || 'evolution_api',
        message: `Fetched ${totalChats} chats from Evolution API`
      });

    } catch (apiError) {
      console.log('🚨 Evolution API failed:', apiError);

      // Return clear error instead of empty data
      const errorMessage = apiError instanceof Error ? apiError.message : "Unknown API error";

      return NextResponse.json({
        success: false,
        chats: [],
        statistics: {
          total: 0,
          active: 0,
          unread: 0,
          totalUnreadMessages: 0,
          period: period,
          timeRange: {
            from: getTimeFilter(period),
            to: Date.now()
          }
        },
        fallback: false,
        error: errorMessage,
        message: 'Evolution API indisponível - Verifique conexão com o WhatsApp'
      }, { status: 503 });
    }

  } catch (error) {
    console.error("🚨 Chats API critical error:", error);

    const { searchParams } = new URL(request.url);

    // Return clear system error
    return NextResponse.json({
      success: false,
      chats: [],
      statistics: {
        total: 0,
        active: 0,
        unread: 0,
        totalUnreadMessages: 0,
        period: searchParams.get('period') || 'all',
        timeRange: {
          from: 0,
          to: Date.now()
        }
      },
      fallback: false,
      error: error instanceof Error ? error.message : "Sistema indisponível",
      message: 'Erro crítico no sistema - Entre em contato com suporte'
    }, { status: 500 });
  }
}
