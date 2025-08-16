"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, MessageSquare, TrendingUp, Calendar, Clock, Target } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrganization, useUser } from "@clerk/nextjs";

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
  const { organization } = useOrganization();
  const { user } = useUser();

  // Use organization ID or user ID as fallback
  const orgId = organization?.id || user?.id;

  // Get organization from Convex
  const convexOrg = useQuery(api.organizations.getByClerkId, 
    orgId ? { clerkId: orgId } : "skip"
  );

  // Load real data from Convex
  const sessionsData = useQuery(api.sessions.listByOrg, 
    convexOrg ? { orgId: convexOrg._id } : "skip"
  );

  const contacts = useQuery(api.contacts.listByOrg, 
    convexOrg ? { orgId: convexOrg._id } : "skip"
  );

  const recentMessages = useQuery(api.messages.listByOrgRecent,
    convexOrg ? { orgId: convexOrg._id } : "skip"
  );

  // Transform sessions data for display
  const sessions = sessionsData?.map(session => {
    const contact = contacts?.find(c => c._id === session.contactId);
    const sessionMessages = recentMessages?.filter(msg => msg.sessionId === session._id);
    
    // Calculate SPIN score based on variables
    const spinData = session.variables.spin;
    let score = 0;
    if (spinData) {
      score = spinData.score || 0;
    }

    // Format time ago
    function formatTimeAgo(timestamp: number) {
      const now = Date.now();
      const diff = now - timestamp;
      const minutes = Math.floor(diff / 60000);
      const hours = Math.floor(diff / 3600000);
      const days = Math.floor(diff / 86400000);

      if (minutes < 1) return "Agora";
      if (minutes < 60) return `${minutes} min atrás`;
      if (hours < 24) return `${hours}h atrás`;
      return `${days}d atrás`;
    }

    return {
      id: session._id,
      contact: contact?.name || "Contato sem nome",
      stage: spinData?.stage || session.stage || "situation",
      score: score,
      status: session.status,
      lastActivity: formatTimeAgo(session.lastActivityAt),
      messages: sessionMessages?.length || 0,
      variables: {
        situation: spinData?.situation || { completed: false, answers: [] },
        problem: spinData?.problem || { completed: false, answers: [] },
        implication: spinData?.implication || { completed: false, answers: [] },
        needPayoff: spinData?.needPayoff || { completed: false, answers: [] },
      }
    };
  }) || [];

  // Calculate statistics
  const activeSessions = sessions.filter(s => s.status === "active").length;
  const averageScore = sessions.length > 0 
    ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / sessions.length) 
    : 0;
  const qualifiedSessions = sessions.filter(s => s.status === "scheduled" || s.stage === "qualified").length;
  const conversionRate = sessions.length > 0 
    ? Math.round((qualifiedSessions / sessions.length) * 100) 
    : 0;

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
            <div className="text-2xl font-bold">{activeSessions}</div>
            <p className="text-xs text-muted-foreground">
              {sessions.length > 0 ? `${sessions.length} total` : "Nenhuma sessão"}
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}</div>
            <p className="text-xs text-muted-foreground">
              {sessions.length > 0 ? "pontos SPIN" : "Sem dados"}
            </p>
          </CardContent>
        </Card>

        <Card className="glass">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualificados</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualifiedSessions}</div>
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
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {qualifiedSessions}/{sessions.length} qualificados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Sessões em Andamento</h2>
        
        {!convexOrg && (
          <Card className="glass">
            <CardContent className="p-8 text-center">
              <div className="animate-pulse text-muted-foreground">
                Carregando sessões...
              </div>
            </CardContent>
          </Card>
        )}

        {convexOrg && sessions.length === 0 && (
          <Card className="glass">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhuma sessão ativa</h3>
              <p className="text-sm">
                As conversas aparecerão aqui quando iniciadas pelos prospects
              </p>
            </CardContent>
          </Card>
        )}
        
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