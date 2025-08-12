"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  UserPlus, 
  MoreHorizontal, 
  Mail, 
  Shield,
  Calendar,
  MessageCircle
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const MEMBERS = [
  {
    id: "1",
    name: "João da Silva",
    email: "joao@techsolutions.com.br",
    role: "Administrador",
    status: "Ativo",
    lastActive: "2023-06-15",
    permissions: ["admin", "billing", "members"]
  },
  {
    id: "2",
    name: "Maria Santos",
    email: "maria@techsolutions.com.br",
    role: "Membro",
    status: "Ativo",
    lastActive: "2023-06-14",
    permissions: ["sessions", "contacts"]
  },
  {
    id: "3",
    name: "Carlos Oliveira",
    email: "carlos@techsolutions.com.br",
    role: "Membro",
    status: "Inativo",
    lastActive: "2023-05-20",
    permissions: ["sessions"]
  },
  {
    id: "4",
    name: "Ana Costa",
    email: "ana@techsolutions.com.br",
    role: "Convidado",
    status: "Pendente",
    lastActive: "Nunca",
    permissions: []
  }
];

const ROLES = [
  { id: "admin", name: "Administrador", description: "Acesso total a todas as funcionalidades" },
  { id: "member", name: "Membro", description: "Acesso às funcionalidades básicas" },
  { id: "guest", name: "Convidado", description: "Acesso limitado às funcionalidades" }
];

export default function MembersSettings() {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Membros e Papéis</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie os membros da sua equipe e suas permissões
        </p>
      </div>

      <Card className="glass">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Membros da Equipe
              </CardTitle>
              <CardDescription>
                Gerencie quem tem acesso à sua organização
              </CardDescription>
            </div>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Convidar Membro
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {MEMBERS.map((member) => (
                <Card key={member.id} className="glass-hover">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-primary font-bold">
                            {member.name.split(" ").map(n => n[0]).join("")}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{member.name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">{member.email}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <Shield className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">{member.role}</span>
                          </div>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Editar Permissões</DropdownMenuItem>
                          <DropdownMenuItem>Ver Atividade</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">Remover</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      {member.status === "Ativo" && (
                        <span className="px-2 py-1 text-xs rounded-full bg-green-500/20 text-green-400">
                          Ativo
                        </span>
                      )}
                      {member.status === "Inativo" && (
                        <span className="px-2 py-1 text-xs rounded-full bg-red-500/20 text-red-400">
                          Inativo
                        </span>
                      )}
                      {member.status === "Pendente" && (
                        <span className="px-2 py-1 text-xs rounded-full bg-yellow-500/20 text-yellow-400">
                          Pendente
                        </span>
                      )}
                      <span className="px-2 py-1 text-xs rounded-full bg-slate-500/20 text-slate-400">
                        Última atividade: {member.lastActive}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Papéis e Permissões
          </CardTitle>
          <CardDescription>
            Defina os papéis e permissões para os membros da sua equipe
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {ROLES.map((role) => (
              <div key={role.id} className="flex items-center justify-between p-4 rounded-lg bg-slate-800/50">
                <div>
                  <p className="font-medium">{role.name}</p>
                  <p className="text-sm text-muted-foreground">{role.description}</p>
                </div>
                <Button variant="outline">Editar</Button>
              </div>
            ))}
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium">Permissões Disponíveis</h4>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="p-4 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  <span className="font-medium">Conversas</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Acesso às conversas com leads e gerenciamento de sessões
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-primary" />
                  <span className="font-medium">Agendamentos</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Visualização e gerenciamento de agendamentos com leads
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-primary" />
                  <span className="font-medium">Membros</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Gerenciamento de membros da equipe e convites
                </p>
              </div>
              <div className="p-4 rounded-lg bg-slate-800/50">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-primary" />
                  <span className="font-medium">Administração</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Configurações avançadas e gerenciamento de permissões
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="glass">
        <CardHeader>
          <CardTitle>Convidar Novo Membro</CardTitle>
          <CardDescription>
            Envie um convite para alguém se juntar à sua organização
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="inviteEmail">Email</Label>
            <Input 
              id="inviteEmail" 
              type="email" 
              placeholder="email@exemplo.com.br"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="inviteRole">Papel</Label>
            <select 
              id="inviteRole" 
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2"
            >
              {ROLES.map((role) => (
                <option key={role.id} value={role.id}>{role.name}</option>
              ))}
            </select>
          </div>
          <Button>
            <Mail className="mr-2 h-4 w-4" />
            Enviar Convite
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}