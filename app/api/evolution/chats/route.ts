import { NextResponse } from "next/server";

const EVOLUTION_BASE_URL = process.env.EVOLUTION_BASE_URL;
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY;
const INSTANCE_NAME = "qify-5561999449983";

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
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      // Use the correct POST endpoint to get real chats
      const chatsResponse = await fetch(`${EVOLUTION_BASE_URL}/chat/findChats/${INSTANCE_NAME}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': EVOLUTION_API_KEY!
        },
        body: JSON.stringify({}),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (chatsResponse.ok) {
        const realChats: EvolutionChat[] = await chatsResponse.json();
        console.log('✅ Real Evolution chats fetched:', realChats.length);
        
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
                text: "Conversa ativa", // We'd need to fetch messages separately for actual text
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
                originalPushName: chat.pushName
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
          fallback: false,
          source: 'evolution_api_real',
          message: `Fetched ${realChats.length} real chats from Evolution API`
        });
      }
      
      throw new Error(`Evolution API returned ${chatsResponse.status}: ${chatsResponse.statusText}`);
      
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