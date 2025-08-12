"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Shield, 
  Key, 
  Eye, 
  EyeOff, 
  RotateCcw, 
  Download,
  AlertTriangle,
  Lock,
  UserCheck,
  History
} from "lucide-react";
import { useState } from "react";

const AUDIT_LOGS = [
  {
    id: "1",
    action: "Login",
    user: "João da Silva",
    resource: "Dashboard",
    ip: "192.168.1.100",
    timestamp: "2023-06-15 14:30:22",
    status: "success"
  },
  {
    id: "2",
    action: "Atualização de Configuração",
    user: "Maria Santos",
    resource: "Configurações de WhatsApp",
    ip: "192.168.1.105",
    timestamp: "2023-06-15 13:45:17",
    status: "success"
  },
  {
    id: "3",
    action: "Tentativa de Login",
    user: "carlos@techsolutions.com.br",
    resource: "Autenticação",
    ip: "203.0.113.45",
    timestamp: "2023-06-15 12:15:33",
    status: "failed"
  },
  {
    id: "4",
    action: "Conexão com WhatsApp",
    user: "João da Silva",
    resource: "Evolution API",
    ip: "192.168.1.100",
    timestamp: "2023-06-15 11:22:45",
    status: "success"
  },
  {
    id: "5",
    action: "Atualização de Prompt",
    user: "Maria Santos",
    resource: "Configurações de IA",
    ip: "192.168.1.105",
    timestamp: "2023-06-15 10:50:12",
    status: "success"
  }
];

export default function SecuritySettings() {
  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Segurança</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie as configurações de segurança e veja os logs de auditoria
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Autenticação de Dois Fatores
            </CardTitle>
            <CardDescription>
              Adicione uma camada extra de segurança à sua conta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
              <div>
                <p className="font-medium">2FA via Autenticador</p>
                <p className="text-sm text-muted-foreground">
                  Use um aplicativo autenticador para gerar códigos
                </p>
              </div>
              <Switch />
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
              <div>
                <p className="font-medium">2FA via SMS</p>
                <p className="text-sm text-muted-foreground">
                  Receba códigos de verificação por SMS
                </p>
              </div>
              <Switch />
            </div>
            <Button variant="outline">
              <Shield className="mr-2 h-4 w-4" />
              Configurar 2FA
            </Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Chaves de API
            </CardTitle>
            <CardDescription>
              Gerencie suas chaves de API e tokens de acesso
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="geminiKey">Chave da API do Gemini</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="geminiKey"
                    type={showApiKey ? "text" : "password"}
                    defaultValue="AIzaSyB12aB34cD56eF78gH90iJ12kL34mN56oP"
                    readOnly
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowApiKey(!showApiKey)}
                  >
                    {showApiKey ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button variant="outline" size="icon">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="webhookSecret">Segredo do Webhook</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="webhookSecret"
                    type={showWebhookSecret ? "text" : "password"}
                    defaultValue="whsec_1234567890abcdef1234567890abcdef"
                    readOnly
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-2 top-1/2 transform -translate-y-1/2"
                    onClick={() => setShowWebhookSecret(!showWebhookSecret)}
                  >
                    {showWebhookSecret ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <Button variant="outline" size="icon">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Exportar Chaves
            </Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Sessões Ativas
            </CardTitle>
            <CardDescription>
              Veja e gerencie suas sessões ativas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                <div>
                  <p className="font-medium text-sm">Chrome no MacBook Pro</p>
                  <p className="text-xs text-muted-foreground">São Paulo, BR • IP: 192.168.1.100</p>
                </div>
                <Button variant="outline" size="sm">Encerrar</Button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-800/50">
                <div>
                  <p className="font-medium text-sm">Safari no iPhone</p>
                  <p className="text-xs text-muted-foreground">São Paulo, BR • IP: 192.168.1.105</p>
                </div>
                <Button variant="outline" size="sm">Encerrar</Button>
              </div>
            </div>
            <Button variant="outline" className="w-full">
              Encerrar Todas as Sessões
            </Button>
          </CardContent>
        </Card>

        <Card className="glass md:col-span-2">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Logs de Auditoria
                </CardTitle>
                <CardDescription>
                  Histórico de atividades e eventos de segurança
                </CardDescription>
              </div>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar Logs
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-sm text-muted-foreground border-b border-slate-700">
                      <th className="pb-2">Ação</th>
                      <th className="pb-2">Usuário</th>
                      <th className="pb-2">Recurso</th>
                      <th className="pb-2">IP</th>
                      <th className="pb-2">Data/Hora</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {AUDIT_LOGS.map((log) => (
                      <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-800/30">
                        <td className="py-3 text-sm">{log.action}</td>
                        <td className="py-3 text-sm">{log.user}</td>
                        <td className="py-3 text-sm">{log.resource}</td>
                        <td className="py-3 text-sm">{log.ip}</td>
                        <td className="py-3 text-sm">{log.timestamp}</td>
                        <td className="py-3">
                          {log.status === "success" ? (
                            <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                              Sucesso
                            </span>
                          ) : (
                            <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              Falha
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Mostrando 5 de 120 eventos
                </p>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" disabled>
                    Anterior
                  </Button>
                  <Button variant="outline" size="sm">
                    Próximo
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}