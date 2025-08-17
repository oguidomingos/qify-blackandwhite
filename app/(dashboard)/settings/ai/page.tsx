"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, Save, Settings, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrganization, useUser } from "@clerk/nextjs";
import { toast } from "sonner";

export default function AISettings() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const [loading, setSaving] = useState(false);
  
  // Use organization ID or user ID as fallback
  const clerkOrgId = organization?.id || user?.id;
  
  console.log('Organization from useOrganization:', organization);
  console.log('User from useUser:', user);
  console.log('Final clerkOrgId:', clerkOrgId);
  
  // Get agent configuration using Clerk ID
  const agentConfig = useQuery(api.agentConfigurations.getByOrg, 
    clerkOrgId ? { clerkOrgId } : "skip"
  );
  
  // Use the internal org ID from agent config for AI configurations
  const internalOrgId = agentConfig?.orgId;
  
  console.log('Agent config found:', agentConfig);
  console.log('Internal orgId:', internalOrgId);
  
  // Get active prompt
  const activePrompt = useQuery(api.aiPrompts.getActivePrompt,
    agentConfig ? { orgId: agentConfig.orgId } : "skip"
  );
  
  // Get AI configurations (batching settings) using internal org ID
  const aiConfig = useQuery(api.aiConfigurations.getByOrg,
    internalOrgId ? { orgId: internalOrgId } : "skip"
  );
  
  // Mutations
  const updateAgentSettings = useMutation(api.agentConfigurations.updateSettings);
  const createOrUpdatePrompt = useMutation(api.aiPrompts.createOrUpdatePrompt);
  const updateAiConfig = useMutation(api.aiConfigurations.upsert);
  
  // State
  const [prompt, setPrompt] = useState(`Você é um SDR (Sales Development Representative) especialista na metodologia SPIN.

SUA FUNÇÃO:
- Qualificar prospects através de perguntas estratégicas
- Identificar oportunidades de negócio
- Agendar reuniões com vendedores seniores

METODOLOGIA SPIN:
- Situation: Entenda a situação atual do prospect
- Problem: Identifique problemas e dores
- Implication: Explore as consequências dos problemas  
- Need-payoff: Ajude o prospect a perceber o valor da solução

DIRETRIZES:
- Faça uma pergunta por vez
- Seja conversacional e natural
- Use português brasileiro
- Mantenha respostas concisas (2-3 frases)
- Seja profissional mas amigável
- Progrida logicamente através das etapas SPIN

EXEMPLO DE CONVERSA:
1. "Olá! Vi que sua empresa trabalha com [setor]. Como vocês lidam atualmente com [desafio comum do setor]?"
2. "Interessante! Esse processo atual está funcionando bem para vocês ou vocês enfrentam algum tipo de dificuldade?"
3. "E como essas dificuldades impactam o dia a dia da sua equipe?"
4. "Se vocês tivessem uma solução que resolvesse isso, qual seria o benefício mais importante?"

Lembre-se: Seu objetivo é descobrir se existe fit e agendar uma conversa com nosso time comercial.`);

  const [responseDelay, setResponseDelay] = useState(2);
  const [personality, setPersonality] = useState("professional");
  const [language, setLanguage] = useState("pt-br");
  
  // Batching configurations
  const [batchingDelay, setBatchingDelay] = useState(3); // seconds
  const [cooldownTime, setCooldownTime] = useState(5); // seconds
  const [processingTimeout, setProcessingTimeout] = useState(30); // seconds
  const [maxMessagesContext, setMaxMessagesContext] = useState(20); // messages

  // Load existing data
  useEffect(() => {
    if (activePrompt?.content) {
      setPrompt(activePrompt.content);
    }
  }, [activePrompt]);

  useEffect(() => {
    if (agentConfig) {
      setPersonality(agentConfig.personality || "professional");
      setResponseDelay(agentConfig.responseTime || 2);
      setLanguage(agentConfig.language || "pt-br");
    }
  }, [agentConfig]);

  useEffect(() => {
    if (aiConfig) {
      setBatchingDelay(Math.round(aiConfig.batchingDelayMs / 1000));
      setCooldownTime(Math.round(aiConfig.cooldownMs / 1000));
      setProcessingTimeout(Math.round(aiConfig.processingTimeoutMs / 1000));
      setMaxMessagesContext(aiConfig.maxMessagesContext);
    }
  }, [aiConfig]);

  const handleSave = async () => {
    if (!internalOrgId) {
      toast.error("Configuração do agente não encontrada. Complete o onboarding primeiro.");
      return;
    }

    setSaving(true);
    try {
      // Save AI configurations (batching settings) using internal org ID
      await updateAiConfig({
        orgId: internalOrgId,
        batchingDelayMs: batchingDelay * 1000, // Convert to milliseconds
        cooldownMs: cooldownTime * 1000,
        processingTimeoutMs: processingTimeout * 1000,
        maxMessagesContext: maxMessagesContext
      });

      // Save prompt and agent settings only if agentConfig exists
      if (agentConfig) {
        try {
          await createOrUpdatePrompt({
            orgId: agentConfig.orgId,
            content: prompt,
            kind: "spin_sdr"
          });
          
          await updateAgentSettings({
            orgId: agentConfig.orgId,
            responseTime: responseDelay,
            personality: personality,
            language: language,
            toneOfVoice: personality
          });
          
          toast.success("Todas as configurações salvas com sucesso!");
        } catch (error) {
          console.error("Error saving agent settings:", error);
          toast.success("Configurações de batching salvas! (Configure o agente no onboarding para salvar prompts)");
        }
      } else {
        toast.success("Configurações de batching salvas! (Complete o onboarding para configurar prompts)");
      }
      
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        {/* Prompt Principal */}
        <div className="md:col-span-2">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Prompt do Agente SDR
              </CardTitle>
              <CardDescription>
                Configure como o agente se comporta e responde aos prospects
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Instruções para a IA</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Digite as instruções para o agente SDR..."
                  className="min-h-[400px] text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Este prompt define como o agente responde e se comporta nas conversas
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configurações */}
        <div className="md:col-span-1">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações
              </CardTitle>
              <CardDescription>
                Ajustes de comportamento do agente
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="delay">Tempo de Resposta (segundos)</Label>
                <Input
                  id="delay"
                  type="number"
                  value={responseDelay}
                  onChange={(e) => setResponseDelay(Number(e.target.value))}
                  min="1"
                  max="30"
                />
                <p className="text-xs text-muted-foreground">
                  Simula tempo de digitação humano
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="personality">Personalidade</Label>
                <select 
                  id="personality"
                  value={personality}
                  onChange={(e) => setPersonality(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-background"
                >
                  <option value="professional">Profissional</option>
                  <option value="friendly">Amigável</option>
                  <option value="energetic">Energético</option>
                  <option value="consultative">Consultivo</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="language">Idioma</Label>
                <select 
                  id="language"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md bg-background"
                >
                  <option value="pt-br">Português (Brasil)</option>
                  <option value="en-us">English (US)</option>
                  <option value="es">Español</option>
                </select>
              </div>

              <Button 
                onClick={handleSave} 
                disabled={loading}
                className="w-full"
              >
                <Save className="mr-2 h-4 w-4" />
                {loading ? "Salvando..." : "Salvar Configurações"}
              </Button>
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="glass mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Status do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm text-foreground">
                  Agente ativo e funcionando
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Último prompt salvo: {activePrompt ? "Carregado" : "Padrão"}
              </p>
            </CardContent>
          </Card>

          {/* Configurações de Batching */}
          <Card className="glass mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="h-4 w-4" />
                Configurações de Batching
              </CardTitle>
              <CardDescription className="text-xs">
                Controle de tempo de processamento das mensagens
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="batchingDelay" className="text-xs">
                  Delay de Batching (segundos)
                </Label>
                <Input
                  id="batchingDelay"
                  type="number"
                  value={batchingDelay}
                  onChange={(e) => setBatchingDelay(Number(e.target.value))}
                  min="1"
                  max="10"
                  className="text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Tempo para aguardar mensagens adicionais
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="cooldownTime" className="text-xs">
                  Cooldown entre Respostas (segundos)
                </Label>
                <Input
                  id="cooldownTime"
                  type="number"
                  value={cooldownTime}
                  onChange={(e) => setCooldownTime(Number(e.target.value))}
                  min="1"
                  max="30"
                  className="text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Intervalo mínimo entre respostas da IA
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="processingTimeout" className="text-xs">
                  Timeout de Processamento (segundos)
                </Label>
                <Input
                  id="processingTimeout"
                  type="number"
                  value={processingTimeout}
                  onChange={(e) => setProcessingTimeout(Number(e.target.value))}
                  min="10"
                  max="120"
                  className="text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Timeout para processos travados
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maxMessagesContext" className="text-xs">
                  Máximo de Mensagens no Contexto
                </Label>
                <Input
                  id="maxMessagesContext"
                  type="number"
                  value={maxMessagesContext}
                  onChange={(e) => setMaxMessagesContext(Number(e.target.value))}
                  min="5"
                  max="50"
                  className="text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Quantidade de mensagens incluídas no contexto
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}