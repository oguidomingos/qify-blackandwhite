"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, MessageSquare, TrendingUp, Calendar, Clock, Target } from "lucide-react";

const sessions = [
  {
    id: "1",
    contact: "Sarah Chen",
    stage: "implication",
    score: 75,
    status: "active",
    lastActivity: "2 min atrás",
    messages: 8,
    variables: {
      situation: { completed: true, answers: ["Empresa de tecnologia", "50 funcionários"] },
      problem: { completed: true, answers: ["Dificuldade com vendas", "Processo manual"] },
      implication: { completed: false, answers: ["Perda de clientes"] },
      needPayoff: { completed: false, answers: [] },
    }
  },
  {
    id: "2", 
    contact: "Marcus Silva",
    stage: "problem",
    score: 45,
    status: "active",
    lastActivity: "5 min atrás",
    messages: 4,
    variables: {
      situation: { completed: true, answers: ["Startup", "10 funcionários"] },
      problem: { completed: false, answers: ["Falta de automação"] },
      implication: { completed: false, answers: [] },
      needPayoff: { completed: false, answers: [] },
    }
  },
  {
    id: "3",
    contact: "Ana Costa",
    stage: "qualified",
    score: 90,
    status: "scheduled",
    lastActivity: "1h atrás",
    messages: 12,
    variables: {
      situation: { completed: true, answers: ["E-commerce", "100 funcionários"] },
      problem: { completed: true, answers: ["Sistema lento", "Alto custo"] },
      implication: { completed: true, answers: ["Perda de 30% nas vendas", "Clientes insatisfeitos"] },
      needPayoff: { completed: true, answers: ["Solução integrada", "ROI em 6 meses"] },
    }
  },
];

const getStageColor = (stage: string) => {
  switch (stage) {
    case "situation":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "problem":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "implication":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "need":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "qualified":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
};

const getStageName = (stage: string) => {
  switch (stage) {
    case "situation":
      return "Situação";
    case "problem":
      return "Problema";
    case "implication":
      return "Implicação";
    case "need":
    case "needPayoff":
      return "Necessidade";
    case "qualified":
      return "Qualificado";
    default:
      return stage;
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "active":
      return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>;
    case "scheduled":
      return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Agendado</Badge>;
    case "paused":
      return <Badge variant="secondary">Pausado</Badge>;
    case "closed":
      return <Badge variant="outline">Fechado</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

export default function SessionsPage() {
  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sessões SPIN</h1>
          <p className="text-muted-foreground">
            Acompanhe o progresso das conversas usando metodologia SPIN
          </p>
        </div>
        <Button className="glass-hover">
          <Target className="mr-2 h-4 w-4" />
          Nova Sessão
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-4">
        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessões Ativas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              +2 desde ontem
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">70</div>
            <p className="text-xs text-muted-foreground">
              ↗️ +15 pontos
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualificados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1</div>
            <p className="text-xs text-muted-foreground">
              Pronto para agendamento
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">33%</div>
            <p className="text-xs text-muted-foreground">
              1/3 qualificados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Sessões em Andamento</h2>
        
        {sessions.map((session) => (
          <Card key={session.id} className="glass glass-hover">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{session.contact}</CardTitle>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getStageColor(session.stage)}>
                        {getStageName(session.stage)}
                      </Badge>
                      {getStatusBadge(session.status)}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-2xl font-bold">{session.score}</span>
                    <span className="text-sm text-muted-foreground">/100</span>
                  </div>
                  <Progress value={session.score} className="w-20 h-2" />
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* SPIN Progress */}
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${session.variables.situation.completed ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span className="text-sm font-medium">Situação</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {session.variables.situation.answers.length} respostas
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${session.variables.problem.completed ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span className="text-sm font-medium">Problema</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {session.variables.problem.answers.length} respostas
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${session.variables.implication.completed ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span className="text-sm font-medium">Implicação</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {session.variables.implication.answers.length} respostas
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <div className={`w-3 h-3 rounded-full ${session.variables.needPayoff.completed ? 'bg-green-500' : 'bg-gray-500'}`}></div>
                    <span className="text-sm font-medium">Necessidade</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {session.variables.needPayoff.answers.length} respostas
                  </div>
                </div>
              </div>

              {/* Meta Info */}
              <div className="flex items-center justify-between pt-4 border-t border-border/30">
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <MessageSquare className="w-4 h-4" />
                    <span>{session.messages} mensagens</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-4 h-4" />
                    <span>{session.lastActivity}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="glass-hover">
                    Ver Conversa
                  </Button>
                  {session.status === "active" && (
                    <Button size="sm" className="glass-hover">
                      Continuar
                    </Button>
                  )}
                  {session.status === "scheduled" && (
                    <Button size="sm" className="glass-hover">
                      <Calendar className="w-4 h-4 mr-2" />
                      Ver Agendamento
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}