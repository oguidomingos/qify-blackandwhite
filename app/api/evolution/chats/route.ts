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
    const chatType = searchParams.get('chatType') || 'all'; // 'all' | 'individual' | 'group'

    console.log('💬 Chats API - Starting with real Evolution data...', { period, limit, activeOnly, chatType });

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

            // Log first message to see structure
            if (messages.length > 0) {
              console.log('📨 Sample message structure:', JSON.stringify(messages[0], null, 2).substring(0, 500));
            }

            messages.forEach((msg: any, idx: number) => {
              const remoteJid = msg.key?.remoteJid || msg.remoteJid;
              if (!remoteJid) return;

              const existingChat = chatMap.get(remoteJid);
              const msgTimestamp = msg.messageTimestamp ? msg.messageTimestamp * 1000 : Date.now();
              const isGroup = remoteJid.endsWith('@g.us');

              // Get sender info for groups
              const sender = msg.key?.participant || msg.participant;

              // Extract name from message - try multiple fields
              const messageName = msg.pushName || msg.notifyName || msg.verifiedName || msg.name;
              const existingName = existingChat?.pushName;

              // Log name extraction for first few messages
              if (idx < 3) {
                console.log(`📝 Message ${idx} name extraction:`, {
                  remoteJid: remoteJid.split('@')[0],
                  pushName: msg.pushName,
                  notifyName: msg.notifyName,
                  verifiedName: msg.verifiedName,
                  name: msg.name,
                  finalName: messageName
                });
              }

              // Prefer the most complete name available
              let displayName = messageName || existingName || remoteJid.split('@')[0];

              // Don't replace a real name with a number
              if (existingName && existingName !== remoteJid.split('@')[0] && !messageName) {
                displayName = existingName;
              }

              if (!existingChat || msgTimestamp > existingChat.lastMessageTime) {
                chatMap.set(remoteJid, {
                  id: remoteJid,
                  remoteJid: remoteJid,
                  pushName: displayName,
                  updatedAt: new Date(msgTimestamp).toISOString(),
                  lastMessageTime: msgTimestamp,
                  windowActive: (Date.now() - msgTimestamp) < (24 * 60 * 60 * 1000),
                  messageCount: (existingChat?.messageCount || 0) + 1,
                  isGroup: isGroup,
                  lastSender: sender || displayName
                });
              } else {
                // Update message count and possibly name for existing chat
                existingChat.messageCount = (existingChat.messageCount || 0) + 1;

                // Update name if we found a better one
                if (messageName && messageName !== remoteJid.split('@')[0]) {
                  existingChat.pushName = messageName;
                }

                chatMap.set(remoteJid, existingChat);
              }
            });

            realChats = Array.from(chatMap.values());
            console.log(`✅ Built ${realChats.length} chats from messages (${realChats.filter(c => c.isGroup).length} groups, ${realChats.filter(c => !c.isGroup).length} individual)`);
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

      // Fetch WhatsApp profile info (push name) for each contact
      console.log('📞 Fetching WhatsApp profile names for contacts...');
      const profileNamesMap = new Map();

      // Get unique phone numbers from chats (excluding groups)
      const phoneNumbers = realChats
        .filter(chat => !chat.remoteJid.endsWith('@g.us'))
        .map(chat => chat.remoteJid)
        .slice(0, 10); // Reduced from 30 to 10 to speed up

      console.log(`📱 Fetching WhatsApp profiles for ${phoneNumbers.length} contacts (limit: 10 for speed)...`);

      // Fetch profile info for each contact in parallel (smaller batches + timeout per batch)
      const batchSize = 5; // Reduced from 10 to 5
      const profileTimeout = 3000; // 3 seconds max per batch

      for (let i = 0; i < phoneNumbers.length; i += batchSize) {
        const batch = phoneNumbers.slice(i, i + batchSize);

        // Add timeout per batch
        const batchPromise = Promise.allSettled(
          batch.map(async (remoteJid) => {
            // Try multiple profile endpoints
            const profileEndpoints = [
              `/chat/fetchProfile/${INSTANCE_NAME}`,
              `/chat/whatsappProfile/${INSTANCE_NAME}`,
              `/profile/${INSTANCE_NAME}`
            ];

            for (const endpoint of profileEndpoints) {
              try {
                const number = remoteJid.split('@')[0];

                // Add timeout per request
                const fetchPromise = fetch(
                  `${EVOLUTION_BASE_URL}${endpoint}`,
                  {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      'apikey': EVOLUTION_API_KEY!
                    },
                    body: JSON.stringify({ number: number }),
                    signal: AbortSignal.timeout(2000) // 2 second timeout per request
                  }
                );

                const profileResponse = await fetchPromise;

                if (profileResponse.ok) {
                  const profileData = await profileResponse.json();

                  // Try multiple name fields
                  const pushName = profileData?.name ||
                                   profileData?.pushName ||
                                   profileData?.notify ||
                                   profileData?.verifiedName ||
                                   profileData?.data?.name ||
                                   profileData?.data?.pushName;

                  if (pushName && pushName !== number) {
                    profileNamesMap.set(remoteJid, pushName);
                    console.log(`  ✓ WhatsApp Profile: ${number} -> "${pushName}"`);
                    return;
                  }
                }
              } catch (err) {
                // Silently continue to next endpoint
              }
            }
          })
        );

        // Add timeout for the entire batch
        const batchTimeout = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Batch timeout')), profileTimeout)
        );

        try {
          await Promise.race([batchPromise, batchTimeout]);
        } catch (err) {
          console.log(`⏱️ Batch ${i / batchSize + 1} timed out, continuing...`);
        }
      }

      console.log(`✅ Loaded ${profileNamesMap.size} profile names from WhatsApp`);

      // Also try the contacts endpoint as fallback (with timeout)
      try {
        console.log('📇 Fetching contacts list...');

        const contactsPromise = fetch(`${EVOLUTION_BASE_URL}/chat/findContacts/${INSTANCE_NAME}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': EVOLUTION_API_KEY!
          },
          body: JSON.stringify({}),
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });

        const contactsResponse = await contactsPromise;

        if (contactsResponse.ok) {
          const contactsData = await contactsResponse.json();
          const contacts = Array.isArray(contactsData) ? contactsData : contactsData?.data || [];

          console.log(`📦 Processing ${contacts.length} contacts from API (max 20)...`);

          // Limit to first 20 contacts to avoid slowdown
          contacts.slice(0, 20).forEach((contact: any) => {
            const jid = contact.id || contact.remoteJid || contact.jid;
            const name = contact.pushName || contact.name || contact.verifiedName || contact.notify;

            if (jid && name && name !== jid.split('@')[0] && !profileNamesMap.has(jid)) {
              profileNamesMap.set(jid, name);
              console.log(`  ✓ Contact API: ${jid.split('@')[0].substring(0, 15)} -> ${name}`);
            }
          });

          console.log(`✅ Total names collected: ${profileNamesMap.size}`);
        }
      } catch (err) {
        console.log('⚠️ Contacts API failed or timed out, using profile names only');
      }

      // Enrich chats with profile names
      realChats = realChats.map(chat => {
        const profileName = profileNamesMap.get(chat.remoteJid);

        // Prefer profile name (WhatsApp public name) over everything
        if (profileName && profileName !== chat.remoteJid.split('@')[0]) {
          console.log(`  🔄 Using profile name for ${chat.remoteJid.split('@')[0]}: "${profileName}"`);
          return { ...chat, pushName: profileName };
        }

        return chat;
      });

      // Apply time filter
      const timeFilter = getTimeFilter(period);
      let filteredChats = realChats;

      if (timeFilter > 0) {
        filteredChats = realChats.filter(chat => {
          const updatedTime = new Date(chat.updatedAt).getTime();
          return updatedTime >= timeFilter;
        });
      }

      // Apply chat type filter
      if (chatType === 'individual') {
        filteredChats = filteredChats.filter(chat => !chat.remoteJid.endsWith('@g.us'));
      } else if (chatType === 'group') {
        filteredChats = filteredChats.filter(chat => chat.remoteJid.endsWith('@g.us'));
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
          const isGroup = chat.remoteJid.endsWith('@g.us');

          // For groups, use the group name or ID; for individuals, use contact name or phone
          let contactName = chat.pushName || phoneNumber;

          // If still showing a phone-like number, try to make it more readable
          if (contactName === phoneNumber && phoneNumber.match(/^\d+$/)) {
            contactName = `+${phoneNumber}`;
          }

          // Add emoji indicator for groups
          if (isGroup && !contactName.startsWith('👥')) {
            contactName = `👥 ${contactName}`;
          }

          const lastActivityAt = new Date(chat.updatedAt).getTime();

          return {
            _id: chat.id,
            contactId: chat.remoteJid,
            contactName: contactName,
            channel: "whatsapp",
            isGroup: isGroup,
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
              source: workingEndpoint,
              isGroup: isGroup,
              lastSender: chat.lastSender
            }
          };
        })
        .sort((a, b) => b.lastActivityAt - a.lastActivityAt);

      // Calculate statistics
      const totalChats = transformedChats.length;
      const activeChats = transformedChats.filter(c => c.isActive).length;
      const unreadChats = transformedChats.filter(c => c.unreadCount > 0).length;
      const totalUnreadMessages = transformedChats.reduce((sum, c) => sum + c.unreadCount, 0);
      const groupChats = transformedChats.filter(c => c.isGroup).length;
      const individualChats = transformedChats.filter(c => !c.isGroup).length;

      return NextResponse.json({
        success: true,
        chats: transformedChats,
        statistics: {
          total: totalChats,
          active: activeChats,
          unread: unreadChats,
          totalUnreadMessages: totalUnreadMessages,
          groups: groupChats,
          individuals: individualChats,
          period: period,
          timeRange: {
            from: timeFilter,
            to: Date.now()
          }
        },
        fallback: workingEndpoint === 'messages-fallback',
        source: workingEndpoint || 'evolution_api',
        message: `Fetched ${totalChats} chats (${individualChats} individual, ${groupChats} groups) from Evolution API`
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
