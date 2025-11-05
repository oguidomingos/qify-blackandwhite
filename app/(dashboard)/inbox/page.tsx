"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Mic, Users, Clock, Loader2 } from "lucide-react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { VoiceConversationModal } from "@/components/voice-conversation-modal";

interface Contact {
  _id: string;
  name: string;
  phoneNumber: string;
  channel: string;
  lastMessageAt: number;
  isActive: boolean;
}

interface Chat {
  _id: string;
  contactId: string;
  contactName: string;
  unreadCount: number;
  lastMessage: {
    text: string;
    timestamp: number;
    direction: "inbound" | "outbound";
  };
  isActive: boolean;
  lastActivityAt: number;
}

interface Message {
  _id: string;
  contactId: string;
  direction: "inbound" | "outbound";
  text: string;
  messageType: string;
  timestamp: number;
  senderName: string;
  fromMe: boolean;
}

interface Conversation {
  contactId: string;
  contactName: string;
  phoneNumber: string;
  totalMessages: number;
  messages: Message[];
  recentMessages: Message[];
  statistics: {
    total: number;
    inbound: number;
    outbound: number;
    lastMessageAt: number;
    lastMessageDirection: "inbound" | "outbound";
  };
  lastMessage: Message | null;
}

interface InboxData {
  chats: Chat[];
  statistics: {
    total: number;
    active: number;
    unread: number;
    totalUnreadMessages: number;
    groups?: number;
    individuals?: number;
  };
}

export default function InboxPage() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [selectedContactId, setSelectedContactId] = useState<string | null>(null);
  const [inboxData, setInboxData] = useState<InboxData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [loadingConversation, setLoadingConversation] = useState(false);
  const [chatType, setChatType] = useState<'all' | 'individual' | 'group'>('individual');

  useEffect(() => {
    const fetchInboxData = async () => {
      try {
        console.log('📥 Fetching inbox data...');
        setIsLoading(true);
        setError(null);

        // Add timeout to prevent infinite loading
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.error('⏱️ Request timeout after 30 seconds');
          controller.abort();
        }, 30000); // 30 second timeout

        // Fetch active chats from Evolution API with chat type filter
        const response = await fetch(
          `/api/evolution/chats?period=week&activeOnly=true&limit=50&chatType=${chatType}`,
          { signal: controller.signal }
        );

        clearTimeout(timeoutId);

        console.log('📡 Response status:', response.status, response.ok);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Response not OK:', response.status, errorText);
          throw new Error('Falha ao carregar chats');
        }

        const data = await response.json();
        console.log('📦 Data received:', {
          success: data.success,
          chatsCount: data.chats?.length,
          statistics: data.statistics
        });

        if (data.success) {
          setInboxData(data);
          console.log('✅ Inbox data loaded successfully');
        } else {
          // Show specific error message from API
          const errorMsg = data.message || 'Erro ao processar dados do inbox';
          console.error('❌ API returned success:false -', errorMsg);
          throw new Error(errorMsg);
        }
      } catch (err) {
        console.error('❌ Erro ao buscar dados do inbox:', err);

        if (err instanceof Error && err.name === 'AbortError') {
          setError('Requisição muito lenta. Tente novamente.');
        } else {
          setError(err instanceof Error ? err.message : 'Erro desconhecido');
        }
      } finally {
        console.log('🏁 Fetch completed, setting isLoading=false');
        setIsLoading(false);
      }
    };

    fetchInboxData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchInboxData, 30000);
    return () => clearInterval(interval);
  }, [chatType]);

  // Transform chats data for display
  const pendingContacts = inboxData?.chats?.map(chat => {
    return {
      id: chat._id,
      name: chat.contactName || "Contato sem nome",
      platform: "whatsapp",
      messages: chat.unreadCount || 1,
      lastMessage: chat.lastMessage.text || "Sem mensagens",
      time: formatTimeAgo(chat.lastMessage.timestamp),
      contact: chat,
      unreadCount: chat.unreadCount,
      isActive: chat.isActive
    };
  }) || [];

  // Helper function to format time ago
  function formatTimeAgo(timestamp: number) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Agora";
    if (minutes < 60) return `${minutes} min`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  }

  const handleContactClick = async (contactId: string, contactName: string, remoteJid: string) => {
    setSelectedContact(contactName);
    setSelectedContactId(remoteJid);
    setLoadingConversation(true);

    try {
      // Fetch conversation messages from Evolution API
      const response = await fetch(`/api/evolution/conversation?contactId=${encodeURIComponent(remoteJid)}&limit=100`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConversation(data.conversation);
          console.log('✅ Conversation loaded:', data.conversation.totalMessages, 'messages');
        }
      }
    } catch (err) {
      console.error('Error loading conversation:', err);
    } finally {
      setLoadingConversation(false);
    }
  };

  const handleMessageSent = () => {
    // Refresh conversation after sending
    if (selectedContactId) {
      handleContactClick('temp', selectedContact || '', selectedContactId);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Main Content Area */}
      <div className="flex-1 flex items-center justify-center p-12">
        <div className="text-center max-w-2xl">
          <h1 className="text-4xl font-bold mb-4 text-foreground">Inbox WhatsApp</h1>
          <p className="text-muted-foreground mb-6">
            Selecione uma conversa para visualizar o histórico completo e usar o assistente de voz
          </p>

          {inboxData && (
            <div className="grid grid-cols-3 gap-4 mt-8">
              <Card className="glass">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">{inboxData.statistics.individuals || 0}</div>
                  <p className="text-sm text-muted-foreground">Conversas Individuais</p>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">{inboxData.statistics.groups || 0}</div>
                  <p className="text-sm text-muted-foreground">Grupos</p>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">{inboxData.statistics.total || 0}</div>
                  <p className="text-sm text-muted-foreground">Total de Conversas</p>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Pending Contacts - Right Column */}
      <div className="w-96 px-6 py-8 border-l border-border/30 overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Conversas
            </h2>
            <Badge variant="secondary" className="glass">
              {pendingContacts.length}
            </Badge>
          </div>

          {/* Chat Type Filter */}
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={chatType === 'individual' ? 'default' : 'outline'}
              onClick={() => setChatType('individual')}
              className="flex-1"
            >
              Individuais
            </Button>
            <Button
              size="sm"
              variant={chatType === 'group' ? 'default' : 'outline'}
              onClick={() => setChatType('group')}
              className="flex-1"
            >
              Grupos
            </Button>
            <Button
              size="sm"
              variant={chatType === 'all' ? 'default' : 'outline'}
              onClick={() => setChatType('all')}
              className="flex-1"
            >
              Todos
            </Button>
          </div>

          <div className="space-y-3">
            {isLoading && (
              <div className="text-center p-4 text-muted-foreground">
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Carregando conversas...</span>
                </div>
              </div>
            )}
            {error && (
              <div className="text-center p-4 space-y-3">
                <div className="text-red-500 text-4xl">⚠️</div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-600">Evolution API Indisponível</p>
                  <p className="text-xs text-muted-foreground">{error}</p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="mt-2"
                  onClick={() => window.location.reload()}
                >
                  Tentar novamente
                </Button>
              </div>
            )}
            {!isLoading && !error && pendingContacts.length === 0 && (
              <div className="text-center p-4 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {chatType === 'individual' && 'Nenhuma conversa individual'}
                  {chatType === 'group' && 'Nenhum grupo'}
                  {chatType === 'all' && 'Nenhuma conversa ativa'}
                </p>
              </div>
            )}
            {pendingContacts.map((contact) => (
              <div
                key={contact.id}
                className="glass glass-hover p-4 cursor-pointer transition-all duration-200"
                onClick={() => handleContactClick(contact.id, contact.name, contact.contact.contactId)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground">{contact.name}</h3>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-primary/20"></div>
                        <span>{contact.platform}</span>
                        <span>•</span>
                        <span>{contact.messages} mensagens</span>
                        {contact.unreadCount > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {contact.unreadCount} não lidas
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {contact.lastMessage}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{contact.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contextual Info Panel - Messages View */}
      <div className="w-96 border-l border-border/30 p-6 overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {selectedContact ? "Histórico da Conversa" : "Informações Contextuais"}
            </h2>
          </div>

          {selectedContact ? (
            <>
              {/* Contact Info Card */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm">Contato</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="font-semibold text-foreground">{selectedContact}</p>
                  {conversation && (
                    <p className="text-xs text-muted-foreground">{conversation.phoneNumber}</p>
                  )}
                </CardContent>
              </Card>

              {/* Conversation Statistics */}
              {conversation && (
                <Card className="glass">
                  <CardHeader>
                    <CardTitle className="text-sm">Estatísticas da Conversa</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total de mensagens</span>
                      <span className="text-foreground">{conversation.totalMessages}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Recebidas</span>
                      <span className="text-foreground">{conversation.statistics.inbound}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Enviadas</span>
                      <span className="text-foreground">{conversation.statistics.outbound}</span>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Voice AI Assistant */}
              {conversation && selectedContactId && (
                <Card className="glass border-primary/20">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Mic className="h-4 w-4" />
                      Assistente de Voz IA
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <VoiceConversationModal
                      conversation={conversation}
                      contactName={selectedContact || ''}
                      contactId={selectedContactId}
                      onMessageSent={handleMessageSent}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Messages List */}
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm">
                    Últimas Mensagens {loadingConversation && <Loader2 className="inline h-3 w-3 animate-spin ml-2" />}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {loadingConversation && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Carregando mensagens...
                      </div>
                    )}
                    {!loadingConversation && conversation?.recentMessages.map((msg, idx) => (
                      <div
                        key={msg._id}
                        className={`p-2 rounded-lg text-xs ${
                          msg.fromMe
                            ? 'bg-primary/10 text-foreground ml-4'
                            : 'bg-secondary/50 text-foreground mr-4'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs">
                            {msg.fromMe ? 'Você' : msg.senderName}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed">{msg.text}</p>
                      </div>
                    ))}
                    {!loadingConversation && (!conversation || conversation.recentMessages.length === 0) && (
                      <div className="text-center py-4 text-muted-foreground text-sm">
                        Nenhuma mensagem encontrada
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm">Contato Atual</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm">
                    Nenhum contato selecionado
                  </p>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle className="text-sm">Estatísticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Conversas ativas</span>
                    <span className="text-foreground">{inboxData?.statistics.active || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Individuais</span>
                    <span className="text-foreground">{inboxData?.statistics.individuals || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Grupos</span>
                    <span className="text-foreground">{inboxData?.statistics.groups || 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total</span>
                    <span className="text-foreground">{inboxData?.statistics.total || 0}</span>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}