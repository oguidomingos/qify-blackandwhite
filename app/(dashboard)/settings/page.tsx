"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  MessageCircle, 
  Bot, 
  Calendar, 
  Building, 
  Users,
  Shield,
  Settings as SettingsIcon,
  ArrowRight
} from "lucide-react";

const settingsCategories = [
  {
    title: "WhatsApp",
    description: "Gerencie contas e configurações do WhatsApp",
    icon: MessageCircle,
    href: "/settings/whatsapp",
    status: "connected",
    items: ["Evolution API", "Webhook", "Números"],
  },
  {
    title: "IA e Prompts",
    description: "Configure prompts e parâmetros da IA",
    icon: Bot,
    href: "/settings/ai",
    status: "active",
    items: ["Prompts SPIN", "Gemini 2.0", "Personalidade"],
  },
  {
    title: "Organização",
    description: "Configurações da organização e integração Google",
    icon: Building,
    href: "/settings/organization",
    status: "partial",
    items: ["Google Calendar", "Timezone", "Membros"],
  },
  {
    title: "Membros e Papéis",
    description: "Gerencie membros da equipe e permissões",
    icon: Users,
    href: "/settings/members",
    status: "active",
    items: ["Convites", "Papéis", "Permissões"],
  },
  {
    title: "Segurança",
    description: "Configurações de segurança e auditoria",
    icon: Shield,
    href: "/settings/security",
    status: "enabled",
    items: ["Logs de auditoria", "2FA", "API Keys"],
  },
];

const getStatusBadge = (status: string) => {
  switch (status) {
    case "connected":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Conectado</Badge>;
    case "active":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Ativo</Badge>;
    case "partial":
      return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Parcial</Badge>;
    case "enabled":
      return <Badge className="bg-primary/20 text-primary border-primary/30">Habilitado</Badge>;
    default:
      return <Badge variant="secondary">Inativo</Badge>;
  }
};

export default function SettingsPage() {
  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações</h1>
          <p className="text-muted-foreground">
            Gerencie as configurações do seu agente SDR
          </p>
        </div>
        <Button variant="outline" className="glass-hover">
          <SettingsIcon className="mr-2 h-4 w-4" />
          Configurações Avançadas
        </Button>
      </div>

      {/* Settings Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {settingsCategories.map((category) => {
          const Icon = category.icon;
          return (
            <Card key={category.title} className="glass glass-hover transition-all duration-200 hover:scale-[1.02]">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">{category.title}</CardTitle>
                    </div>
                  </div>
                  {getStatusBadge(category.status)}
                </div>
                <CardDescription className="text-sm">
                  {category.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  {category.items.map((item, index) => (
                    <div key={index} className="flex items-center text-sm text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mr-2"></div>
                      {item}
                    </div>
                  ))}
                </div>
                <Button asChild className="w-full glass-hover">
                  <Link href={category.href}>
                    Configurar
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Quick Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Status do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              <span className="text-sm text-foreground">Todos os serviços operacionais</span>
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Última Sincronização</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              2 minutos atrás
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Armazenamento</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              2.1 GB / 10 GB utilizados
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}