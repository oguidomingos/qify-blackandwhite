"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, MessageSquare, TrendingUp, Calendar, Clock, Target, Loader2 } from "lucide-react";

const getStageColor = (stage: string) => {
  switch (stage) {
    case "S":
      return "bg-blue-500/20 text-blue-400 border-blue-500/30";
    case "P":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    case "I":
      return "bg-orange-500/20 text-orange-400 border-orange-500/30";
    case "N":
      return "bg-purple-500/20 text-purple-400 border-purple-500/30";
    case "qualified":
      return "bg-green-500/20 text-green-400 border-green-500/30";
    default:
      return "bg-gray-500/20 text-gray-400 border-gray-500/30";
  }
};

const getStatusBadge = (qualified: boolean, score: number) => {
  if (qualified) {
    return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Qualificado</Badge>;
  } else if (score >= 60) {
    return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">Em Progresso</Badge>;
  } else {
    return <Badge variant="secondary">Inicial</Badge>;
  }
};

interface SpinSession {
  contactId: string;
  contactName: string;
  currentStage: string;
  score: number;
  qualified: boolean;
  summary: string;
  lastActivity: number;
}

export default function SessionsPage() {
  const [spinData, setSpinData] = useState<{ sessions: SpinSession[]; statistics: any } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/evolution/spin-analysis")
      .then((res) => res.json())
      .then((data) => {
        setSpinData(data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load sessions");
        setIsLoading(false);
      });
  }, []);

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

  const sessions = (spinData?.sessions || []).map((session) => {
    const stage = session.currentStage; // already "S", "P", "I", "N"
    return {
      id: session.contactId,
      contact: session.contactName,
      stage,
      score: session.score,
      status: session.qualified ? "qualified" : "active",
      lastActivity: formatTimeAgo(session.lastActivity),
      variables: {
        situation: { completed: ["S", "P", "I", "N"].includes(stage) },
        problem: { completed: ["P", "I", "N"].includes(stage) },
        implication: { completed: ["I", "N"].includes(stage) },
        needPayoff: { completed: ["N"].includes(stage) },
      },
    };
  });

  const activeSessions = sessions.length;
  const averageScore = activeSessions > 0 ? Math.round(sessions.reduce((sum, s) => sum + s.score, 0) / activeSessions) : 0;
  const qualifiedSessions = sessions.filter((s) => s.status === "qualified").length;
  const conversionRate = activeSessions > 0 ? Math.round((qualifiedSessions / activeSessions) * 100) : 0;

  if (error) {
    return (
      <div className="flex-1 space-y-6 p-8">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4 max-w-lg">
            <div className="text-red-500 text-6xl">⚠️</div>
            <h2 className="text-xl font-semibold text-red-600">Análise SPIN Indisponível</h2>
            <div className="space-y-2">
              <p className="text-muted-foreground">{error}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sessões SPIN</h1>
          <p className="text-muted-foreground">
            Análise persistida no Convex • {activeSessions} sessões ativas
          </p>
        </div>
        <Button className="glass-hover">
          <Calendar className="mr-2 h-4 w-4" />
          Agendar Follow-up
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass glass-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessões Ativas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions}</div>
            <p className="text-xs text-muted-foreground">Conversas em análise SPIN</p>
          </CardContent>
        </Card>

        <Card className="glass glass-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}</div>
            <p className="text-xs text-muted-foreground">Qualificação geral dos leads</p>
          </CardContent>
        </Card>

        <Card className="glass glass-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualificados</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualifiedSessions}</div>
            <p className="text-xs text-muted-foreground">Prontos para proposta</p>
          </CardContent>
        </Card>

        <Card className="glass glass-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">Leads que se qualificaram</p>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Sessões em Andamento</h2>

        {isLoading && (
          <Card className="glass">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Carregando sessões...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {!isLoading && sessions.length === 0 && (
          <Card className="glass">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Nenhuma sessão ativa</h3>
              <p className="text-sm">As conversas aparecerão aqui quando persistidas pelo webhook</p>
            </CardContent>
          </Card>
        )}

        {sessions.map((session) => (
          <Card key={session.id} className="glass glass-hover">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h3 className="text-lg font-semibold text-foreground">{session.contact}</h3>
                        {getStatusBadge(session.status === "qualified", session.score)}
                      </div>
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                        <div className="flex items-center space-x-1">
                          <MessageSquare className="w-4 h-4" />
                          <span>Score persistido</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{session.lastActivity}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground">Progressão SPIN</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${session.variables.situation.completed ? 'bg-blue-400' : 'bg-gray-400'}`}></div>
                            <span className="text-sm">Situação</span>
                          </div>
                          <Badge variant="outline" className={`text-xs ${session.stage === 'S' ? getStageColor('S') : ''}`}>S</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${session.variables.problem.completed ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
                            <span className="text-sm">Problema</span>
                          </div>
                          <Badge variant="outline" className={`text-xs ${session.stage === 'P' ? getStageColor('P') : ''}`}>P</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${session.variables.implication.completed ? 'bg-orange-400' : 'bg-gray-400'}`}></div>
                            <span className="text-sm">Implicação</span>
                          </div>
                          <Badge variant="outline" className={`text-xs ${session.stage === 'I' ? getStageColor('I') : ''}`}>I</Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${session.variables.needPayoff.completed ? 'bg-purple-400' : 'bg-gray-400'}`}></div>
                            <span className="text-sm">Necessidade</span>
                          </div>
                          <Badge variant="outline" className={`text-xs ${session.stage === 'N' ? getStageColor('N') : ''}`}>N</Badge>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-foreground">Score de Qualificação</h4>
                        <span className="text-lg font-bold text-foreground">{session.score}%</span>
                      </div>
                      <Progress value={session.score} className="h-3" />

                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Status:</span>
                          <span className="text-foreground">{session.status === "qualified" ? "Pronto" : "Em andamento"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Critério:</span>
                          <span className="text-foreground">{session.score >= 70 ? "Atingido" : "Pendente"}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
