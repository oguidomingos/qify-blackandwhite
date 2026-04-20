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
import { useState, useEffect } from "react";

export default function WhatsAppSettings() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [instanceName, setInstanceName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/agent-info")
      .then((res) => res.json())
      .then((data) => {
        if (data.phoneNumber) {
          const generated = `qify-${data.phoneNumber.replace(/[^\d]/g, '')}`;
          setPhoneNumber(data.phoneNumber);
          setInstanceName(generated);
          checkExistingInstanceStatus(generated);
        }
      })
      .catch(console.error);
  }, []);

  const checkExistingInstanceStatus = async (name: string) => {
    try {
      const statusResponse = await fetch(`/api/whatsapp/status/${name}`);
      if (statusResponse.ok) {
        const statusData = await statusResponse.json();
        setConnectionStatus(statusData.connected ? "connected" : "disconnected");
      } else {
        setConnectionStatus("disconnected");
      }
    } catch {
      setConnectionStatus("disconnected");
    }
  };

  const handleConnect = async () => {
    if (!phoneNumber) {
      alert("Número de telefone não encontrado. Complete o onboarding primeiro.");
      return;
    }

    setIsConnecting(true);
    setConnectionStatus("connecting");

    try {
      const response = await fetch('/api/whatsapp/create-instance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName, phoneNumber }),
      });

      if (!response.ok) throw new Error('Failed to create instance');

      const data = await response.json();

      if (data.qrCode) {
        setQrCode(data.qrCode);
        setConnectionStatus("connecting");

        const pollStatus = setInterval(async () => {
          try {
            const statusResponse = await fetch(`/api/whatsapp/status/${instanceName}`);
            const statusData = await statusResponse.json();
            if (statusData.connected) {
              setConnectionStatus("connected");
              setQrCode(null);
              clearInterval(pollStatus);
            }
          } catch { /* continue polling */ }
        }, 3000);

        setTimeout(() => {
          clearInterval(pollStatus);
          if (connectionStatus === "connecting") {
            setConnectionStatus("error");
          }
        }, 120000);
      }
    } catch {
      setConnectionStatus("error");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await fetch(`/api/whatsapp/disconnect/${instanceName}`, { method: 'POST' });
      setConnectionStatus("disconnected");
      setQrCode(null);
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  };

  const handleConfigureWebhook = async () => {
    try {
      const response = await fetch(`/api/whatsapp/configure-webhook/${instanceName}`, { method: 'POST' });
      if (response.ok) {
        alert('Webhook configurado com sucesso!');
      } else {
        alert('Erro ao configurar webhook');
      }
    } catch {
      alert('Erro ao configurar webhook');
    }
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
                <>
                  <Button variant="outline" onClick={handleConfigureWebhook}>
                    Configurar Webhook
                  </Button>
                  <Button variant="outline" onClick={handleDisconnect}>
                    Desconectar
                  </Button>
                </>
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
                <img src={qrCode} alt="QR Code para conexão do WhatsApp" className="w-48 h-48" />
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
                  <p className="text-sm text-muted-foreground">Processar mensagens recebidas automaticamente</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Enviar Mensagens</Label>
                  <p className="text-sm text-muted-foreground">Permitir envio de mensagens através do agente</p>
                </div>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sincronizar Contatos</Label>
                  <p className="text-sm text-muted-foreground">Importar contatos do WhatsApp periodicamente</p>
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
          <CardDescription>Configurações da API de integração com o WhatsApp</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="baseUrl">URL Base da API</Label>
            <Input id="baseUrl" defaultValue="https://evolutionapi.centralsupernova.com.br" placeholder="https://evolutionapi.centralsupernova.com.br" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey">Chave da API</Label>
            <Input id="apiKey" type="password" placeholder="Sua chave da API" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="instanceId">ID da Instância</Label>
            <Input id="instanceId" defaultValue="wa-0001" placeholder="ID da instância" />
          </div>
          <Button>Salvar Configurações</Button>
        </CardContent>
      </Card>
    </div>
  );
}
