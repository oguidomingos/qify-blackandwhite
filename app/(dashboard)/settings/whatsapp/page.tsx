"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  MessageCircle, 
  QrCode, 
  RefreshCw, 
  CheckCircle, 
  XCircle,
  AlertCircle
} from "lucide-react";
import { useState } from "react";

export default function WhatsAppSettings() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected"); // disconnected, connecting, connected, error
  const [qrCode, setQrCode] = useState<string | null>(null);
  
  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectionStatus("connecting");
    
    // Simulate connection process
    setTimeout(() => {
      // In a real implementation, this would connect to Evolution API
      setConnectionStatus("connected");
      setQrCode("https://placehold.co/200x200/000000/FFFFFF/png?text=QR+Code");
      setIsConnecting(false);
    }, 2000);
  };
  
  const handleDisconnect = () => {
    setConnectionStatus("disconnected");
    setQrCode(null);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Configurações do WhatsApp</h3>
        <p className="text-sm text-muted-foreground">
          Configure sua conexão com o WhatsApp via Evolution API
        </p>
      </div>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conexão WhatsApp
          </CardTitle>
          <CardDescription>
            Conecte sua conta do WhatsApp para começar a enviar e receber mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
            <div className="flex items-center gap-3">
              {connectionStatus === "connected" ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : connectionStatus === "connecting" ? (
                <RefreshCw className="h-5 w-5 text-yellow-500 animate-spin" />
              ) : connectionStatus === "error" ? (
                <XCircle className="h-5 w-5 text-red-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-slate-500" />
              )}
              <div>
                <p className="font-medium">
                  {connectionStatus === "connected" 
                    ? "Conectado" 
                    : connectionStatus === "connecting" 
                    ? "Conectando..." 
                    : connectionStatus === "error" 
                    ? "Erro na conexão" 
                    : "Desconectado"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {connectionStatus === "connected" 
                    ? "Sua conta do WhatsApp está conectada" 
                    : connectionStatus === "connecting" 
                    ? "Aguardando autenticação..." 
                    : connectionStatus === "error" 
                    ? "Falha ao conectar. Tente novamente." 
                    : "Nenhuma conta conectada"}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              {connectionStatus === "connected" ? (
                <Button variant="outline" onClick={handleDisconnect}>
                  Desconectar
                </Button>
              ) : (
                <Button onClick={handleConnect} disabled={isConnecting}>
                  {isConnecting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Conectando...
                    </>
                  ) : (
                    "Conectar WhatsApp"
                  )}
                </Button>
              )}
            </div>
          </div>

          {qrCode && (
            <div className="flex flex-col items-center gap-4 p-6 rounded-lg bg-slate-800/50">
              <p className="text-sm text-muted-foreground">
                Escaneie o QR Code abaixo com o WhatsApp do seu celular
              </p>
              <div className="p-4 bg-white rounded-lg">
                {/* In a real implementation, this would be the actual QR code from Evolution API */}
                <img 
                  src={qrCode} 
                  alt="QR Code para conexão do WhatsApp" 
                  className="w-48 h-48"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center">
                O QR Code expira em 2 minutos. Se expirar, clique em "Conectar WhatsApp" novamente.
              </p>
            </div>
          )}

          <div className="space-y-4">
            <h4 className="font-medium">Configurações Avançadas</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Receber Mensagens</Label>
                  <p className="text-sm text-muted-foreground">
                    Processar mensagens recebidas automaticamente
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enviar Mensagens</Label>
                  <p className="text-sm text-muted-foreground">
                    Permitir envio de mensagens através do agente
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sincronizar Contatos</Label>
                  <p className="text-sm text-muted-foreground">
                    Importar contatos do WhatsApp periodicamente
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Evolution API</CardTitle>
          <CardDescription>
            Configurações da API de integração com o WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseUrl">URL Base da API</Label>
            <Input 
              id="baseUrl" 
              defaultValue="https://evolutionapi.centralsupernova.com.br" 
              placeholder="https://evolutionapi.centralsupernova.com.br"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">Chave da API</Label>
            <Input 
              id="apiKey" 
              type="password" 
              placeholder="Sua chave da API"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instanceId">ID da Instância</Label>
            <Input 
              id="instanceId" 
              defaultValue="wa-0001" 
              placeholder="ID da instância"
            />
          </div>
          <Button>Salvar Configurações</Button>
        </CardContent>
      </Card>
    </div>
  );
}