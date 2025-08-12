"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Bot, TrendingUp, Clock, CheckCircle } from "lucide-react";

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
  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
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
        {stats.map((stat) => {
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
            {pendingContacts.map((contact) => (
              <div
                key={contact.id}
                className="flex items-center justify-between p-3 glass rounded-lg glass-hover cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{contact.name}</p>
                    <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                      <span>{contact.platform}</span>
                      <span>•</span>
                      <span>{contact.messages} mensagens</span>
                    </div>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground">
                  {contact.lastMessage}
                </div>
              </div>
            ))}
            <Button variant="outline" className="w-full glass-hover">
              Ver todos os contatos
            </Button>
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
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    Mensagem enviada para Sarah Chen
                  </p>
                  <p className="text-xs text-muted-foreground">2 min atrás</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    Nova mensagem recebida de Marcus Silva
                  </p>
                  <p className="text-xs text-muted-foreground">5 min atrás</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    IA processou 3 conversas
                  </p>
                  <p className="text-xs text-muted-foreground">12 min atrás</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <div className="flex-1">
                  <p className="text-sm text-foreground">
                    Lead qualificado: Ana Costa
                  </p>
                  <p className="text-xs text-muted-foreground">1h atrás</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}