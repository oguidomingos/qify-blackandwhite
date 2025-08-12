"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Building, 
  Calendar, 
  Clock, 
  Globe, 
  Save,
  Link,
  Key,
  Users
} from "lucide-react";
import { useState } from "react";

export default function OrganizationSettings() {
  const [isConnectingCalendar, setIsConnectingCalendar] = useState(false);
  
  const handleConnectCalendar = () => {
    setIsConnectingCalendar(true);
    // Simulate calendar connection
    setTimeout(() => {
      setIsConnectingCalendar(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Configurações da Organização</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie as configurações gerais da sua organização
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="glass md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Perfil da Organização
            </CardTitle>
            <CardDescription>
              Informações básicas sobre sua empresa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orgName">Nome da Organização</Label>
              <Input 
                id="orgName" 
                defaultValue="TechSolutions Ltda" 
                placeholder="Nome da sua organização"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgWebsite">Website</Label>
              <Input 
                id="orgWebsite" 
                defaultValue="https://techsolutions.com.br" 
                placeholder="https://seusite.com.br"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="orgDescription">Descrição</Label>
              <Textarea
                id="orgDescription"
                defaultValue="Empresa especializada em soluções tecnológicas para pequenas e médias empresas."
                placeholder="Descreva sua organização"
                className="min-h-[100px]"
              />
            </div>
            <Button>
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </Button>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Google Calendar
            </CardTitle>
            <CardDescription>
              Conecte sua agenda para agendamentos automáticos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
              <div>
                <p className="font-medium">Agenda não conectada</p>
                <p className="text-sm text-muted-foreground">
                  Conecte sua conta do Google Calendar
                </p>
              </div>
              <Button onClick={handleConnectCalendar} disabled={isConnectingCalendar}>
                {isConnectingCalendar ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  "Conectar"
                )}
              </Button>
            </div>
            <div className="space-y-2">
              <Label htmlFor="defaultCalendar">Agenda Padrão</Label>
              <select 
                id="defaultCalendar" 
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2"
                disabled
              >
                <option>Nenhuma agenda conectada</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="meetingDuration">Duração Padrão da Reunião (min)</Label>
              <Input 
                id="meetingDuration" 
                type="number" 
                defaultValue="30" 
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Configurações Regionais
            </CardTitle>
            <CardDescription>
              Definições de localização e idioma
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="timezone">Fuso Horário</Label>
              <select 
                id="timezone" 
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2"
              >
                <option>America/Sao_Paulo</option>
                <option>America/New_York</option>
                <option>Europe/London</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="language">Idioma</Label>
              <select 
                id="language" 
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2"
              >
                <option>Português (Brasil)</option>
                <option>English (US)</option>
                <option>Español</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Moeda</Label>
              <select 
                id="currency" 
                className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2"
              >
                <option>BRL - Real Brasileiro</option>
                <option>USD - Dólar Americano</option>
                <option>EUR - Euro</option>
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="glass md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Membros da Equipe
            </CardTitle>
            <CardDescription>
              Gerencie os membros da sua organização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">JD</span>
                  </div>
                  <div>
                    <p className="font-medium">João da Silva</p>
                    <p className="text-sm text-muted-foreground">Administrador</p>
                  </div>
                </div>
                <Button variant="outline">Gerenciar</Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-primary font-bold">MS</span>
                  </div>
                  <div>
                    <p className="font-medium">Maria Santos</p>
                    <p className="text-sm text-muted-foreground">Membro</p>
                  </div>
                </div>
                <Button variant="outline">Gerenciar</Button>
              </div>
              <Button variant="outline" className="border-dashed">
                <Users className="mr-2 h-4 w-4" />
                Convidar Novo Membro
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}