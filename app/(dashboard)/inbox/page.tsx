"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Mic, Check, Edit, Users, Clock } from "lucide-react";

const pendingContacts = [
  {
    id: "1",
    name: "Sarah Chen",
    platform: "whatsapp",
    messages: 2,
    lastMessage: "Gostaria de saber mais sobre seus serviços",
    time: "2 min",
  },
  {
    id: "2",
    name: "Marcus Silva", 
    platform: "whatsapp",
    messages: 1,
    lastMessage: "Qual o preço do seu produto?",
    time: "5 min",
  },
  {
    id: "3",
    name: "Ana Costa",
    platform: "telegram",
    messages: 3,
    lastMessage: "Preciso de uma solução urgente",
    time: "12 min",
  },
];

export default function InboxPage() {
  const [selectedContact, setSelectedContact] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

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
                <span className="text-muted-foreground">Mensagens hoje</span>
                <span className="text-foreground">12</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tempo de resposta médio</span>
                <span className="text-foreground">2.3s</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Taxa de aprovação</span>
                <span className="text-foreground">94%</span>
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