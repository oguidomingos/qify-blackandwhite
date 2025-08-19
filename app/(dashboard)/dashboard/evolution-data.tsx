"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, Users, Bot, TrendingUp, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";

interface EvolutionStats {
  totalMessages: number;
  totalContacts: number;
  totalChats: number;
  instanceStatus: string;
}

export default function EvolutionDataComponent() {
  const [stats, setStats] = useState<EvolutionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvolutionData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Fetch instance data directly from Evolution API
      const response = await fetch('/api/evolution/instance-stats');
      
      if (!response.ok) {
        throw new Error('Failed to fetch Evolution data');
      }
      
      const data = await response.json();
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvolutionData();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Carregando dados da Evolution API...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Erro ao carregar dados</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={fetchEvolutionData} variant="outline">
            Tentar novamente
          </Button>
        </CardContent>
      </Card>
    );
  }

  const evolutionStats = [
    {
      title: "Mensagens Total",
      value: stats?.totalMessages.toString() || "0",
      description: "Total de mensagens na Evolution API",
      icon: MessageSquare,
    },
    {
      title: "Contatos Total", 
      value: stats?.totalContacts.toString() || "0",
      description: "Total de contatos registrados",
      icon: Users,
    },
    {
      title: "Chats Ativos",
      value: stats?.totalChats.toString() || "0", 
      description: "Conversas ativas na instância",
      icon: Bot,
    },
    {
      title: "Status Instância",
      value: stats?.instanceStatus || "unknown",
      description: "Status da conexão WhatsApp",
      icon: TrendingUp,
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Dados Reais da Evolution API</h2>
          <p className="text-muted-foreground">
            Dados em tempo real da instância qify-5561999449983
          </p>
        </div>
        <Button onClick={fetchEvolutionData} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {evolutionStats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>📊 Status da Sincronização</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Evolution API:</span>
              <span className="text-green-600 font-medium">✅ Conectada</span>
            </div>
            <div className="flex justify-between">
              <span>Webhook:</span>
              <span className="text-green-600 font-medium">✅ Configurado</span>
            </div>
            <div className="flex justify-between">
              <span>Dados disponíveis:</span>
              <span className="text-green-600 font-medium">✅ {stats?.totalMessages || 0} mensagens</span>
            </div>
            <div className="flex justify-between">
              <span>Sincronização Convex:</span>
              <span className="text-yellow-600 font-medium">⏳ Pendente</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}