"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, Save, Settings, ArrowLeft } from "lucide-react";
import { useState, useEffect } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrganization, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import Link from "next/link";

export default function AISettings() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const [loading, setSaving] = useState(false);
  
  // Use organization ID or user ID as fallback
  const orgId = organization?.id || user?.id;
  
  // Debug logs
  console.log("Organization from useOrganization:", organization);
  console.log("User from useUser:", user);
  console.log("Final orgId:", orgId);
  
  // Get agent configuration
  const agentConfig = useQuery(api.agentConfigurations.getByOrg, 
    orgId ? { clerkOrgId: orgId } : "skip"
  );
  
  // Get active prompt
  const activePrompt = useQuery(api.aiPrompts.getActivePrompt,
    agentConfig ? { orgId: agentConfig.orgId } : "skip"
  );
  
  // Mutations
  const updateAgentSettings = useMutation(api.agentConfigurations.updateSettings);
  const createOrUpdatePrompt = useMutation(api.aiPrompts.createOrUpdatePrompt);
  const upsertAgentConfig = useMutation(api.agentConfigurations.upsert);
  
  // State - Prompt editável pelo usuário (metodologia SPIN)
  const [prompt, setPrompt] = useState(`## METODOLOGIA SPIN PARA QUALIFICAÇÃO

**SUA ABORDAGEM:**
Como SDR especialista, use a metodologia SPIN para qualificar prospects e agendar reuniões comerciais.

**ETAPAS SPIN:**

**1. SITUATION (Situação)**
- Entenda o contexto atual do prospect
- Perguntas sobre como trabalham hoje
- Identifique o cenário atual da empresa/pessoa

**2. PROBLEM (Problema)**
- Identifique dores e desafios específicos
- Explore dificuldades que enfrentam
- Descubra gaps no processo atual

**3. IMPLICATION (Implicação)**
- Explore consequências dos problemas
- Mostre impactos no negócio/vida
- Crie urgência para resolução

**4. NEED-PAYOFF (Necessidade)**
- Apresente benefícios da solução
- Faça o prospect verbalizar valor
- Conduza para agendamento comercial

**DIRETRIZES:**
- Uma pergunta por vez
- Seja natural e conversacional
- Progrida logicamente pelas etapas
- Mantenha foco no agendamento
- Use linguagem simples e direta

**EXEMPLOS DE PERGUNTAS:**

*Situation:* "Como vocês lidam com [área relevante] atualmente?"
*Problem:* "Que tipo de dificuldades vocês enfrentam com isso?"
*Implication:* "Como isso impacta o dia a dia da equipe?"
*Need-payoff:* "Se resolvêssemos isso, qual seria o maior benefício?"

**OBJETIVO FINAL:** Descobir fit e agendar conversa com time comercial.`);

  const [responseDelay, setResponseDelay] = useState(2);
  const [personality, setPersonality] = useState("professional");
  const [language, setLanguage] = useState("pt-br");

  // Load existing data from Convex
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

  // Create agent config if it doesn't exist
  useEffect(() => {
    const createAgentConfigIfNeeded = async () => {
      if (orgId && !agentConfig && !loading) {
        try {
          console.log("Creating agent config for orgId:", orgId);
          await upsertAgentConfig({
            clerkOrgId: orgId,
            agentName: "Agente SDR",
            phoneNumber: "",
            personality: "professional",
            toneOfVoice: "professional",
            language: "pt-br",
            responseTime: 2,
            workingHours: {
              start: "09:00",
              end: "18:00",
              timezone: "America/Sao_Paulo",
              workDays: ["monday", "tuesday", "wednesday", "thursday", "friday"]
            }
          });
        } catch (error) {
          console.error("Error creating agent config:", error);
        }
      }
    };

    createAgentConfigIfNeeded();
  }, [orgId, agentConfig, loading, upsertAgentConfig]);

  const handleSave = async () => {
    if (!orgId) {
      toast.error("Usuário não autenticado. Faça login primeiro.");
      return;
    }

    setSaving(true);
    try {
      // Ensure agent config exists
      let currentAgentConfig = agentConfig;
      if (!currentAgentConfig) {
        console.log("Creating agent config before saving...");
        await upsertAgentConfig({
          clerkOrgId: orgId,
          agentName: "Agente SDR",
          phoneNumber: "",
          personality: personality,
          toneOfVoice: personality,
          language: language,
          responseTime: responseDelay,
          workingHours: {
            start: "09:00",
            end: "18:00",
            timezone: "America/Sao_Paulo",
            workDays: ["monday", "tuesday", "wednesday", "thursday", "friday"]
          }
        });
        
        // Refetch the config after creation
        // Wait a bit for the mutation to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // We'll continue with the current config approach
        // The useQuery will refetch automatically
      }

      if (agentConfig) {
        // Save prompt
        await createOrUpdatePrompt({
          orgId: agentConfig.orgId,
          content: prompt,
          kind: "spin_sdr"
        });
        
        // Save agent settings
        await updateAgentSettings({
          orgId: agentConfig.orgId,
          responseTime: responseDelay,
          personality: personality,
          language: language,
          toneOfVoice: personality
        });
      }
      
      toast.success("Configurações salvas com sucesso!");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erro ao salvar configurações");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 space-y-6 p-8">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/settings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Configurações de IA</h1>
          <p className="text-muted-foreground">
            Configure como o agente SDR se comporta e responde aos prospects
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Prompt Principal */}
        <div className="md:col-span-2 space-y-4">
          {/* Informação sobre System Message */}
          <Card className="glass border-blue-500/20">
            <CardContent className="pt-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 rounded-full bg-blue-500 mt-2"></div>
                <div>
                  <p className="text-sm font-medium text-blue-400">System Message Ativo</p>
                  <p className="text-xs text-muted-foreground">
                    O agente possui um <strong>system message base</strong> que gerencia automaticamente:
                    coleta de nome, identificação pessoa física/jurídica, nome da empresa, 
                    percepção de gênero e manutenção do padrão de atendimento profissional.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Prompt Editável */}
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Metodologia SPIN (Editável)
              </CardTitle>
              <CardDescription>
                Configure a metodologia de qualificação que será aplicada após a coleta dos dados básicos
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="prompt">Instruções da Metodologia SPIN</Label>
                <Textarea
                  id="prompt"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Digite as instruções da metodologia SPIN..."
                  className="min-h-[400px] text-sm font-mono"
                />
                <p className="text-xs text-muted-foreground">
                  <strong>Este prompt é aplicado APÓS</strong> o system message base coletar os dados essenciais (nome, tipo de pessoa, empresa, etc).
                  Foque na metodologia de qualificação e processo comercial.
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

              <div className="space-y-3">
                <Button 
                  onClick={handleSave} 
                  disabled={loading}
                  className="w-full"
                >
                  <Save className="mr-2 h-4 w-4" />
                  {loading ? "Salvando..." : "Salvar Configurações"}
                </Button>
                
              </div>
            </CardContent>
          </Card>

          {/* Status */}
          <Card className="glass mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Status do Sistema</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${orgId ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                  <span className="text-sm text-foreground">
                    {organization?.id 
                      ? 'Organização conectada' 
                      : user?.id 
                        ? 'Usuário conectado (sem organização)' 
                        : 'Não autenticado'
                    }
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${agentConfig ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                  <span className="text-sm text-foreground">
                    {agentConfig ? 'Configuração carregada' : 'Configuração pendente'}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Org ID: {organization?.id || "N/A"}<br/>
                User ID: {user?.id || "N/A"}<br/>
                Using: {orgId || "Nenhum"}<br/>
                Último prompt: {activePrompt ? "Carregado" : "Padrão"}
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}