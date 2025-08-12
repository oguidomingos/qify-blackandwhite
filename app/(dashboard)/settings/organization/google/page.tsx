"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Calendar, CheckCircle, XCircle, AlertTriangle, ExternalLink } from "lucide-react";

export default function GoogleSettingsPage() {
  const searchParams = useSearchParams();
  const [connectionStatus, setConnectionStatus] = useState<"loading" | "connected" | "disconnected">("loading");
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const connected = searchParams.get("connected");
    const errorParam = searchParams.get("error");
    
    if (connected) {
      setConnectionStatus("connected");
    } else if (errorParam) {
      setError(errorParam);
      setConnectionStatus("disconnected");
    } else {
      // Check existing connection status
      setConnectionStatus("disconnected");
    }
  }, [searchParams]);

  const handleConnectGoogle = () => {
    window.location.href = "/api/oauth/google/start";
  };

  const getStatusBadge = () => {
    switch (connectionStatus) {
      case "connected":
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle className="w-3 h-3 mr-1" />
            Conectado
          </Badge>
        );
      case "disconnected":
        return (
          <Badge variant="secondary">
            <XCircle className="w-3 h-3 mr-1" />
            Desconectado
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            Verificando...
          </Badge>
        );
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Integração Google</h1>
          <p className="text-muted-foreground">
            Configure a integração com Google Calendar
          </p>
        </div>
        {getStatusBadge()}
      </div>

      {/* Error Alert */}
      {error && (
        <Alert className="glass border-destructive/50">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Erro na conexão: {error}. Tente novamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Success Alert */}
      {connectionStatus === "connected" && (
        <Alert className="glass border-green-500/50">
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Google Calendar conectado com sucesso! Agora você pode agendar reuniões automaticamente.
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Card */}
      <Card className="glass">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <CardTitle>Google Calendar</CardTitle>
              <CardDescription>
                Integre com o Google Calendar para agendamento automático
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {connectionStatus === "disconnected" ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <h3 className="font-medium">Benefícios da integração:</h3>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li className="flex items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2"></div>
                    Agendamento automático de reuniões
                  </li>
                  <li className="flex items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2"></div>
                    Sincronização de disponibilidade
                  </li>
                  <li className="flex items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2"></div>
                    Links automáticos do Google Meet
                  </li>
                  <li className="flex items-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2"></div>
                    Notificações automáticas
                  </li>
                </ul>
              </div>
              <Button onClick={handleConnectGoogle} className="glass-hover">
                <Calendar className="mr-2 h-4 w-4" />
                Conectar Google Calendar
              </Button>
            </div>
          ) : connectionStatus === "connected" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 glass rounded-lg">
                <div className="flex items-center space-x-3">
                  <CheckCircle className="w-5 h-5 text-green-400" />
                  <div>
                    <p className="font-medium">Conta conectada</p>
                    <p className="text-sm text-muted-foreground">
                      Google Calendar integrado com sucesso
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" className="glass-hover">
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Gerenciar
                </Button>
              </div>
              
              <div className="space-y-3">
                <h3 className="font-medium">Configurações</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Duração padrão das reuniões</span>
                    <Badge variant="outline">30 minutos</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Fuso horário</span>
                    <Badge variant="outline">America/Sao_Paulo</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Calendario padrão</span>
                    <Badge variant="outline">Primário</Badge>
                  </div>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" className="glass-hover">
                  Configurar Calendário
                </Button>
                <Button variant="outline" className="glass-hover text-destructive border-destructive/20">
                  Desconectar
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center p-8">
              <div className="animate-pulse">Verificando status da conexão...</div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions Card */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="text-lg">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium mt-0.5">
                1
              </div>
              <div>
                <h4 className="font-medium">Autorização</h4>
                <p className="text-sm text-muted-foreground">
                  Autorize o acesso à sua conta Google Calendar
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium mt-0.5">
                2
              </div>
              <div>
                <h4 className="font-medium">Configuração</h4>
                <p className="text-sm text-muted-foreground">
                  Selecione o calendário e configure preferências
                </p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-medium mt-0.5">
                3
              </div>
              <div>
                <h4 className="font-medium">Agendamento</h4>
                <p className="text-sm text-muted-foreground">
                  O agente IA agenda reuniões automaticamente quando qualificar leads
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}