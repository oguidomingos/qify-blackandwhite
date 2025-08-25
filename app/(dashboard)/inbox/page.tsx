"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Mic, Check, Edit, Users, Clock, Loader2 } from "lucide-react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useEvolutionData } from "@/hooks/use-evolution-data";

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

interface InboxData {
  chats: Chat[];
  statistics: {
    total: number;
    active: number;
    unread: number;
    totalUnreadMessages: number;
  };
}

export default function InboxPage() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  // Use real data from Convex
  const evolutionData = useEvolutionData();

  // Transform real data for display
  const pendingContacts = evolutionData.contacts
    .filter(contact => {
      // Show contacts with recent messages (last 24h)
      const yesterday = Date.now() - (24 * 60 * 60 * 1000);
      return evolutionData.recentMessages.some(msg => 
        msg.contactId === contact._id && 
        msg.createdAt >= yesterday
      );
    })
    .map(contact => {
      // Get last message for this contact
      const lastMessage = evolutionData.recentMessages
        .filter(msg => msg.contactId === contact._id)
        .sort((a, b) => b.createdAt - a.createdAt)[0];
      
      // Count unread messages (inbound messages newer than last outbound)
      const lastOutbound = evolutionData.recentMessages
        .filter(msg => msg.contactId === contact._id && msg.direction === "outbound")
        .sort((a, b) => b.createdAt - a.createdAt)[0];
      
      const unreadMessages = evolutionData.recentMessages.filter(msg => 
        msg.contactId === contact._id && 
        msg.direction === "inbound" &&
        (!lastOutbound || msg.createdAt > lastOutbound.createdAt)
      );

      return {
        id: contact._id,
        name: contact.name || "Contato sem nome",
        platform: contact.channel || "whatsapp",
        messages: evolutionData.recentMessages.filter(msg => msg.contactId === contact._id).length,
        lastMessage: lastMessage?.text || "Sem mensagens",
        time: lastMessage ? formatTimeAgo(lastMessage.createdAt) : "Nunca",
        contact: contact,
        unreadCount: unreadMessages.length,
        isActive: unreadMessages.length > 0
      };
    })
    .sort((a, b) => b.unreadCount - a.unreadCount); // Sort by unread count

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

  const handleContactClick = (contactId: string, contactName: string) => {
    setSelectedContact(contactName);
    setIsSpeaking(true);
    
    // Simulate AI speaking
    setTimeout(() => {
      setIsSpeaking(false);
    }, 3000);
  };

  const toggleRecording = () => {
    setIsRecording(!isRecording);
  };

  return (
    <div className="flex h-screen">
      {/* Voice Visualization Center */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center py-12">
          <div className="text-center">
            {/* Voice Circle */}
            <div className="w-48 h-48 rounded-full mx-auto mb-8 relative glass glass-hover">
              <div className="absolute inset-4 rounded-full bg-primary/10 flex items-center justify-center">
                {isSpeaking ? (
                  <div className="w-24 h-24 rounded-full bg-primary/20 animate-voice-wave"></div>
                ) : (
                  <div className="speaking-dots">
                    <div></div>
                    <div></div>
                    <div></div>
                  </div>
                )}
              </div>
            </div>
            
            <div className="mt-8 space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">
                {selectedContact ? `Falando sobre ${selectedContact}` : "Voice Assistant"}
              </h2>
              <div className="flex items-center justify-center space-x-2">
                <div className="flex items-center justify-center space-x-2">
                  {isSpeaking ? (
                    <>
                      <div className="speaking-dots">
                        <div></div>
                        <div></div>
                        <div></div>
                      </div>
                      <span className="text-muted-foreground ml-2">IA está falando...</span>
                    </>
                  ) : isRecording ? (
                    <>
                      <div className="speaking-dots">
                        <div></div>
                        <div></div>
                        <div></div>
                      </div>
                      <span className="text-muted-foreground ml-2">Fale sua mensagem</span>
                    </>
                  ) : (
                    <>
                      <div className="w-1 h-1 rounded-full bg-primary animate-pulse"></div>
                      <div className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{animationDelay: '0.2s'}}></div>
                      <div className="w-1 h-1 rounded-full bg-primary animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      <span className="text-muted-foreground ml-2">Ready to assist</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Actions */}
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-20">
          <div className="flex items-center space-x-4">
            <Button
              onClick={toggleRecording}
              size="lg"
              className={`glass glass-hover p-4 rounded-full transition-all duration-300 ${
                isRecording ? 'ring-2 ring-red-500' : ''
              }`}
            >
              <Mic className={`w-6 h-6 ${isRecording ? 'text-red-500' : 'text-primary'}`} />
            </Button>

            <Button 
              size="lg"
              className="glass glass-hover p-4 rounded-full transition-all duration-300 opacity-50 cursor-not-allowed"
            >
              <Check className="w-6 h-6 text-primary" />
            </Button>

            <Button
              size="lg" 
              className="glass glass-hover p-4 rounded-full transition-all duration-300 opacity-50 cursor-not-allowed"
            >
              <Edit className="w-6 h-6 text-primary" />
            </Button>
          </div>
        </div>
      </div>

      {/* Pending Contacts - Right Column */}
      <div className="w-96 px-6 py-8 border-l border-border/30 overflow-y-auto">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">
              Contatos Pendentes
            </h2>
            <Badge variant="secondary" className="glass">
              {pendingContacts.length}
            </Badge>
          </div>

          <div className="space-y-3">
            {evolutionData.isLoading && (
              <div className="text-center p-4 text-muted-foreground">
                <div className="flex items-center justify-center space-x-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Carregando conversas...</span>
                </div>
              </div>
            )}
            {evolutionData.error && (
              <div className="text-center p-4 space-y-3">
                <div className="text-red-500 text-4xl">⚠️</div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-red-600">Dados Indisponíveis</p>
                  <p className="text-xs text-muted-foreground">{evolutionData.error}</p>
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
            {!evolutionData.isLoading && !evolutionData.error && pendingContacts.length === 0 && (
              <div className="text-center p-4 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma conversa ativa</p>
              </div>
            )}
            {pendingContacts.map((contact) => (
              <div
                key={contact.id}
                className="glass glass-hover p-4 cursor-pointer transition-all duration-200"
                onClick={() => handleContactClick(contact.id, contact.name)}
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
                    {selectedContact === contact.name && isSpeaking && (
                      <div className="speaking-dots">
                        <div></div>
                        <div></div>
                        <div></div>
                      </div>
                    )}
                    <Clock className="w-4 h-4 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{contact.time}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Contextual Info Panel */}
      <div className="w-80 border-l border-border/30 p-6 overflow-y-auto">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Informações Contextuais</h2>
          </div>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm">Contato Atual</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                {selectedContact || "Nenhum contato selecionado"}
              </p>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm">Personalidade do Agente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-muted-foreground text-sm">Profissional e Prestativo</p>
              <div className="text-xs text-muted-foreground">
                Responde de forma cordial e eficiente, mantendo tom profissional em todas as interações.
              </div>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-sm">Estatísticas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Conversas ativas</span>
                <span className="text-foreground">{pendingContacts.filter(c => c.isActive).length}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Não lidas</span>
                <span className="text-foreground">{pendingContacts.reduce((sum, c) => sum + c.unreadCount, 0)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total contatos</span>
                <span className="text-foreground">{evolutionData.contacts.length}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Bar */}
      <div className="fixed bottom-0 left-0 right-0 glass border-t border-border/30 p-4 z-20">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span>Connected</span>
            </div>
            <span>•</span>
            <span>Voice Profile: vale</span>
            <span>•</span>
            <span>Ready</span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Powered by Advanced AI
          </div>
        </div>
      </div>
    </div>
  );
}