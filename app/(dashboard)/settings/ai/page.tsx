"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Bot, Save, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useConvex, useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useOrganization } from "@clerk/nextjs";
import { toast } from "sonner";

export default function AISettings() {
  const { organization } = useOrganization();
  const [loading, setSaving] = useState(false);
  
  // Get agent configuration
  const agentConfig = useQuery(api.agentConfigurations.getByOrg, 
    organization?.id ? { clerkOrgId: organization.id } : "skip"
  );
  
  // Get active prompt
  const activePrompt = useQuery(api.aiPrompts.getActivePrompt,
    agentConfig ? { orgId: agentConfig.orgId } : "skip"
  );
  
  // Mutations
  const updateAgentSettings = useMutation(api.agentConfigurations.updateSettings);
  const createOrUpdatePrompt = useMutation(api.aiPrompts.createOrUpdatePrompt);
  
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

  const handleSave = async () => {
    if (!agentConfig) {
      toast.error("Configuração do agente não encontrada");
      return;
    }

    setSaving(true);
    try {
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
      
      toast.success("Configurações salvas com sucesso!");
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
        </div>
      </div>
    </div>
  );
}