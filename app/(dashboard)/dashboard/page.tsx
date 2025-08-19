"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Bot, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useEvolutionData } from "@/hooks/use-evolution-data";

export default function DashboardPage() {
  const { organization } = useOrganization();
  const { user } = useUser();
  
  // Use Evolution API data directly
  const evolutionData = useEvolutionData();
  
  // Show loading state while data is being fetched
  if (evolutionData.isLoading) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <h2 className="text-xl font-semibold">Carregando dados reais...</h2>
            <p className="text-muted-foreground">
              Sincronizando com Evolution API (713 mensagens, 20 contatos)
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // Show error state if there's an error
  if (evolutionData.error) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4 max-w-md">
            <div className="text-red-500 text-6xl">⚠️</div>
            <h2 className="text-xl font-semibold text-red-600">Erro ao carregar dados</h2>
            <p className="text-muted-foreground">
              {evolutionData.error}
            </p>
            <Button onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const realStats = [
    {
      title: "Mensagens Hoje",
      value: evolutionData.todayMessages.toString(),
      description: evolutionData.todayMessages > 0 ? "Mensagens processadas hoje" : "Nenhuma mensagem hoje",
      icon: MessageSquare,
    },
    {
      title: "Contatos Ativos",
      value: evolutionData.activeContacts.toString(),
      description: evolutionData.activeContacts > 0 ? "Contatos registrados" : "Nenhum contato ainda",
      icon: Users,
    },
    {
      title: "Sessões Ativas",
      value: evolutionData.activeSessions.toString(),
      description: evolutionData.activeSessions > 0 ? "Conversas em andamento" : "Nenhuma sessão ativa",
      icon: Bot,
    },
    {
      title: "Tempo Resposta",
      value: `${evolutionData.responseTime}s`,
      description: "Tempo médio de resposta",
      icon: TrendingUp,
    },
  ];

  // Get pending contacts (with recent activity)
  const pendingContacts = evolutionData.contacts?.filter(contact => {
    const hasRecentMessages = evolutionData.recentMessages?.some(msg => 
      msg.contactId === contact._id && 
      msg.direction === "inbound" &&
      Date.now() - msg.createdAt < 3600000 // Last hour
    );
    return hasRecentMessages;
  }).map(contact => {
    const latestMessage = evolutionData.recentMessages?.find(msg => 
      msg.contactId === contact._id && msg.direction === "inbound"
    );
    const messageCount = evolutionData.recentMessages?.filter(msg => msg.contactId === contact._id).length || 0;
    
    function formatTimeAgo(timestamp: number) {
      const diff = Date.now() - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      if (minutes < 1) return "Agora";
      if (minutes < 60) return `${minutes} min atrás`;
      return `${hours}h atrás`;
    }

    return {
      id: contact._id,
      name: contact.name || "Contato sem nome",
      platform: contact.channel || "whatsapp",
      messages: messageCount,
      lastMessage: latestMessage ? formatTimeAgo(latestMessage.createdAt) : "Sem mensagens",
    };
  }) || [];

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Qify Organization - 
            Visão geral do seu agente SDR
          </p>
        </div>
        <Button className="glass-hover">
          <Bot className="mr-2 h-4 w-4" />
          Configurar IA
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {realStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="glass glass-hover">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className="text-xs text-muted-foreground">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Pending Contacts */}
        <Card className="glass glass-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Contatos Pendentes
            </CardTitle>
            <CardDescription>
              Conversas aguardando resposta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!convexOrg && (
              <div className="text-center py-8">
                <div className="animate-pulse text-muted-foreground">
                  Carregando contatos...
                </div>
              </div>
            )}
            {convexOrg && pendingContacts.length === 0 && (
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhum contato pendente
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  {agentConfig?.phoneNumber 
                    ? "Aguardando mensagens do WhatsApp"
                    : "Complete a configuração do agente primeiro"
                  }
                </p>
              </div>
            )}
            {pendingContacts.map((contact) => (
              <div key={contact.id} className="flex items-center justify-between p-3 rounded-lg border border-border/30">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{contact.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {contact.platform} • {contact.messages} msg
                    </p>
                  </div>
                </div>
                <div className="text-sm text-muted-foreground">
                  {contact.lastMessage}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card className="glass glass-hover">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Atividade Recente
            </CardTitle>
            <CardDescription>
              Últimas mensagens e sessões
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!convexOrg && (
              <div className="text-center py-8">
                <div className="animate-pulse text-muted-foreground">
                  Carregando atividades...
                </div>
              </div>
            )}
            {convexOrg && (!recentMessages || recentMessages.length === 0) && (
              <div className="text-center py-8">
                <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  Nenhuma atividade recente
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  As mensagens aparecerão aqui quando chegarem
                </p>
              </div>
            )}
            {recentMessages?.slice(0, 5).map((message) => {
              const contact = contacts?.find(c => c._id === message.contactId);
              function formatTimeAgo(timestamp: number) {
                const diff = Date.now() - timestamp;
                const minutes = Math.floor(diff / 60000);
                const hours = Math.floor(diff / 3600000);
                if (minutes < 1) return "Agora";
                if (minutes < 60) return `${minutes} min atrás`;
                return `${hours}h atrás`;
              }
              
              return (
                <div key={message._id} className="flex items-start space-x-3 p-3 rounded-lg border border-border/30">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    message.direction === "inbound" ? "bg-blue-500/20" : "bg-green-500/20"
                  }`}>
                    <MessageSquare className={`w-4 h-4 ${
                      message.direction === "inbound" ? "text-blue-400" : "text-green-400"
                    }`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">
                        {contact?.name || "Contato"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatTimeAgo(message.createdAt)}
                      </p>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {message.direction === "inbound" ? "📥" : "📤"} {message.text}
                    </p>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

    </div>
  );
}