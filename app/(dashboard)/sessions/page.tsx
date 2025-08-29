"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Users, MessageSquare, TrendingUp, Calendar, Clock, Target, Loader2 } from "lucide-react";
import { useOrganization, useUser, useAuth } from "@clerk/nextjs";

interface SPINSession {
  contactId: string;
  contactName: string;
  currentStage: 'S' | 'P' | 'I' | 'N';
  score: number;
  stageProgression: Array<{
    stage: 'S' | 'P' | 'I' | 'N';
    timestamp: number;
    confidence: number;
    triggerMessage: string;
  }>;
  lastActivity: number;
  totalMessages: number;
  qualified: boolean;
  summary: string;
}

interface SPINData {
  sessions: SPINSession[];
  statistics: {
    totalSessions: number;
    qualified: number;
    stageDistribution: {
      S: number;
      P: number;
      I: number;
      N: number;
    };
    averageScore: number;
  };
}

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

const getStageName = (stage: string) => {
  switch (stage) {
    case "S":
      return "Situação";
    case "P":
      return "Problema";
    case "I":
      return "Implicação";
    case "N":
      return "Necessidade";
    case "qualified":
      return "Qualificado";
    default:
      return stage;
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

export default function SessionsPage() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const { getToken } = useAuth();
  
  const [spinData, setSPINData] = useState<SPINData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSPINData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Get authentication token
        const token = await getToken();
        if (!token) {
          throw new Error('Não foi possível autenticar. Faça login novamente.');
        }
        
        const response = await fetch('/api/evolution/spin-analysis?period=week', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error('Sessão expirada. Faça login novamente.');
          } else if (response.status === 403) {
            throw new Error('Acesso negado. Verifique se você tem permissão.');
          } else {
            throw new Error('Falha ao carregar análise SPIN');
          }
        }
        
        const data = await response.json();
        if (data.success) {
          setSPINData(data);
        } else {
          // Show specific error message from API
          const errorMsg = data.message || 'Erro ao processar dados SPIN';
          throw new Error(errorMsg);
        }
      } catch (err) {
        console.error('Erro ao buscar dados SPIN:', err);
        setError(err instanceof Error ? err.message : 'Erro desconhecido');
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if user is authenticated
    if (user && organization) {
      fetchSPINData();
      // Refresh every 2 minutes for authenticated users
      const interval = setInterval(fetchSPINData, 120000);
      return () => clearInterval(interval);
    } else if (!user) {
      setError('Usuário não autenticado');
      setIsLoading(false);
    }
  }, [user, organization, getToken]);

  // Transform sessions data for display
  const sessions = spinData?.sessions?.map(session => {
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
      id: session.contactId,
      contact: session.contactName,
      stage: session.currentStage,
      score: session.score,
      status: session.qualified ? "qualified" : "active",
      lastActivity: formatTimeAgo(session.lastActivity),
      messages: session.totalMessages,
      variables: {
        situation: { completed: session.stageProgression.some(s => s.stage === 'S'), answers: [] },
        problem: { completed: session.stageProgression.some(s => s.stage === 'P'), answers: [] },
        implication: { completed: session.stageProgression.some(s => s.stage === 'I'), answers: [] },
        needPayoff: { completed: session.stageProgression.some(s => s.stage === 'N'), answers: [] },
      }
    };
  }) || [];

  // Calculate statistics from real SPIN data
  const activeSessions = spinData?.statistics.totalSessions || 0;
  const averageScore = spinData?.statistics.averageScore || 0;
  const qualifiedSessions = spinData?.statistics.qualified || 0;
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
              <p className="text-sm text-muted-foreground">
                As análises SPIN dependem das mensagens do WhatsApp. Verifique se a Evolution API está funcionando.
              </p>
            </div>
            <Button onClick={() => window.location.reload()}>
              Tentar novamente
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sessões SPIN</h1>
          <p className="text-muted-foreground">
            Análise inteligente baseada em conversas reais • {activeSessions} sessões ativas
          </p>
        </div>
        <Button className="glass-hover">
          <Calendar className="mr-2 h-4 w-4" />
          Agendar Follow-up
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card className="glass glass-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sessões Ativas</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeSessions}</div>
            <p className="text-xs text-muted-foreground">
              Conversas em análise SPIN
            </p>
          </CardContent>
        </Card>

        <Card className="glass glass-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Score Médio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageScore}</div>
            <p className="text-xs text-muted-foreground">
              Qualificação geral dos leads
            </p>
          </CardContent>
        </Card>

        <Card className="glass glass-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Qualificados</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{qualifiedSessions}</div>
            <p className="text-xs text-muted-foreground">
              Prontos para proposta
            </p>
          </CardContent>
        </Card>

        <Card className="glass glass-hover">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              Leads que se qualificaram
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sessions List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-foreground">Sessões em Andamento</h2>
        
        {isLoading && (
          <Card className="glass">
            <CardContent className="p-8 text-center">
              <div className="flex items-center justify-center space-x-2 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Analisando conversas...</span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && sessions.length === 0 && !error && (
          <Card className="glass">
            <CardContent className="p-8 text-center text-muted-foreground">
              <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Análise SPIN não iniciada</h3>
              <p className="text-sm mb-4">
                Para começar a análise SPIN, você precisa ter conversas ativas no WhatsApp.
              </p>
              <div className="space-y-2 text-xs">
                <p>• Configure sua instância do WhatsApp</p>
                <p>• Inicie conversas com leads</p>
                <p>• O sistema analisará automaticamente usando metodologia SPIN</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Atualizar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <Card className="glass">
            <CardContent className="p-8 text-center">
              <div className="text-yellow-500 mb-4">⚠️</div>
              <h3 className="text-lg font-medium mb-2 text-red-400">Análise SPIN Indisponível</h3>
              <p className="text-sm text-muted-foreground mb-4">{error}</p>
              <div className="space-y-2 text-xs text-muted-foreground">
                <p>• Verifique se você está autenticado</p>
                <p>• Confirme se sua organização está configurada</p>
                <p>• Verifique se a Evolution API está funcionando</p>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => window.location.reload()}
              >
                Tentar novamente
              </Button>
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
                          <span>{session.messages} mensagens</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="w-4 h-4" />
                          <span>{session.lastActivity}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-6">
                    {/* SPIN Progress */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground">Progressão SPIN</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${session.variables.situation.completed ? 'bg-blue-400' : 'bg-gray-400'}`}></div>
                            <span className="text-sm">Situação</span>
                          </div>
                          <Badge variant="outline" className={`text-xs ${session.stage === 'S' ? getStageColor('S') : ''}`}>
                            S
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${session.variables.problem.completed ? 'bg-yellow-400' : 'bg-gray-400'}`}></div>
                            <span className="text-sm">Problema</span>
                          </div>
                          <Badge variant="outline" className={`text-xs ${session.stage === 'P' ? getStageColor('P') : ''}`}>
                            P
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${session.variables.implication.completed ? 'bg-orange-400' : 'bg-gray-400'}`}></div>
                            <span className="text-sm">Implicação</span>
                          </div>
                          <Badge variant="outline" className={`text-xs ${session.stage === 'I' ? getStageColor('I') : ''}`}>
                            I
                          </Badge>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <div className={`w-3 h-3 rounded-full ${session.variables.needPayoff.completed ? 'bg-purple-400' : 'bg-gray-400'}`}></div>
                            <span className="text-sm">Necessidade</span>
                          </div>
                          <Badge variant="outline" className={`text-xs ${session.stage === 'N' ? getStageColor('N') : ''}`}>
                            N
                          </Badge>
                        </div>
                      </div>
                    </div>

                    {/* Score & Actions */}
                    <div className="space-y-3">
                      <h4 className="text-sm font-medium text-foreground">Score de Qualificação</h4>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Atual</span>
                          <Badge className={`text-sm font-medium ${session.score >= 70 ? 'bg-green-500/20 text-green-400' : session.score >= 50 ? 'bg-yellow-500/20 text-yellow-400' : 'bg-gray-500/20 text-gray-400'}`}>
                            {session.score}/100
                          </Badge>
                        </div>
                        <Progress value={session.score} className="h-2" />
                        <div className="flex space-x-2">
                          <Button size="sm" variant="outline" className="flex-1">
                            Ver Histórico
                          </Button>
                          {session.status === "qualified" && (
                            <Button size="sm" className="flex-1">
                              Enviar Proposta
                            </Button>
                          )}
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