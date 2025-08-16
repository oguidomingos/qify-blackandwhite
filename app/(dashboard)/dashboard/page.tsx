"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Bot, TrendingUp, Clock, CheckCircle } from "lucide-react";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

const stats = [
  {
    title: "Mensagens Hoje",
    value: "12",
    description: "↗️ +2 desde ontem",
    icon: MessageSquare,
  },
  {
    title: "Contatos Ativos",
    value: "8",
    description: "3 novos esta semana",
    icon: Users,
  },
  {
    title: "Taxa de Resposta IA",
    value: "2.3s",
    description: "Tempo médio",
    icon: Bot,
  },
  {
    title: "Taxa de Conversão",
    value: "94%",
    description: "↗️ +5% este mês",
    icon: TrendingUp,
  },
];

const pendingContacts = [
  {
    id: "1",
    name: "Sarah Chen",
    platform: "whatsapp",
    messages: 2,
    lastMessage: "2 min atrás",
  },
  {
    id: "2", 
    name: "Marcus Silva",
    platform: "whatsapp",
    messages: 1,
    lastMessage: "5 min atrás",
  },
  {
    id: "3",
    name: "Ana Costa",
    platform: "telegram",
    messages: 3,
    lastMessage: "12 min atrás",
  },
];

export default function DashboardPage() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const orgId = organization?.id || user?.id;

  // Get real data from Convex
  const businessProfile = useQuery(
    api.businessProfiles.getByOrg,
    orgId ? { clerkOrgId: orgId } : "skip"
  );

  const agentConfig = useQuery(
    api.agentConfigurations.getByOrg,
    orgId ? { clerkOrgId: orgId } : "skip"
  );

  // TODO: Add queries for real message and contact data when those schemas are implemented
  const realStats = [
    {
      title: "Mensagens Hoje",
      value: "0", // Will be real data from messages table
      description: "Nenhuma mensagem ainda",
      icon: MessageSquare,
    },
    {
      title: "Contatos Ativos",
      value: "0", // Will be real data from contacts table
      description: "Aguardando primeiros contatos",
      icon: Users,
    },
    {
      title: "Agente Configurado",
      value: agentConfig ? "✓" : "✗",
      description: agentConfig ? `${agentConfig.agentName}` : "Configure seu agente",
      icon: Bot,
    },
    {
      title: "Negócio Configurado",
      value: businessProfile ? "✓" : "✗", 
      description: businessProfile ? `${businessProfile.businessName}` : "Configure seu negócio",
      icon: TrendingUp,
    },
  ];

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            {businessProfile ? `${businessProfile.businessName} - ` : ""}
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
            {/* TODO: Replace with real contacts data when available */}
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum contato pendente
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {agentConfig?.phoneNumber 
                  ? "Conecte seu WhatsApp nas configurações para receber mensagens"
                  : "Complete a configuração do agente primeiro"
                }
              </p>
            </div>
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
              Últimas ações do sistema
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* TODO: Replace with real activity data when available */}
            <div className="text-center py-8">
              <Clock className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma atividade recente
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                As atividades do sistema aparecerão aqui
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}