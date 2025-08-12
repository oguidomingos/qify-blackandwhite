"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { 
  Bot, 
  Sparkles, 
  MessageSquare, 
  Clock, 
  Languages,
  Save
} from "lucide-react";
import { useState } from "react";

const SPIN_STAGES = [
  {
    id: "situation",
    name: "Situação",
    description: "Entender o contexto e situação atual do prospect"
  },
  {
    id: "problem",
    name: "Problema",
    description: "Identificar os desafios e dores do prospect"
  },
  {
    id: "implication",
    name: "Implicação",
    description: "Explorar as consequências dos problemas"
  },
  {
    id: "need",
    name: "Necessidade",
    description: "Apresentar soluções e valor proposto"
  }
];

const PERSONALITIES = [
  {
    id: "professional",
    name: "Profissional",
    description: "Formal, direto e focado em resultados"
  },
  {
    id: "friendly",
    name: "Amigável",
    description: "Caloroso, empático e conversacional"
  },
  {
    id: "energetic",
    name: "Energético",
    description: "Entusiasmado, motivador e dinâmico"
  },
  {
    id: "consultative",
    name: "Consultivo",
    description: "Analítico, questionador e orientado a soluções"
  }
];

export default function AISettings() {
  const [selectedStage, setSelectedStage] = useState("situation");
  const [selectedPersonality, setSelectedPersonality] = useState("professional");
  
  // Mock prompts - in a real implementation, these would come from Convex
  const [prompts, setPrompts] = useState({
    situation: {
      opening: "Olá! Estou entrando em contato para entender melhor sobre sua empresa. Poderia me contar um pouco sobre o que vocês fazem?",
      followUp: [
        "Como vocês começaram a trabalhar nessa área?",
        "Quais são os principais desafios que vocês enfrentam atualmente?"
      ],
      closing: "Obrigado por compartilhar essas informações. Vou analisar e em breve volto com algumas ideias de como podemos ajudar."
    },
    problem: {
      opening: "Com base no que você compartilhou, gostaria de entender melhor sobre os desafios que vocês enfrentam. O que tem sido mais difícil de resolver?",
      followUp: [
        "Como esse problema afeta o dia a dia da sua equipe?",
        "Quais soluções vocês já tentaram implementar?"
      ],
      closing: "Entendo a complexidade dessa situação. Vamos ver como podemos ajudar a resolver esses desafios."
    },
    implication: {
      opening: "Como você acha que esses problemas estão impactando seus resultados?",
      followUp: [
        "Se nada mudar, qual seria o impacto a longo prazo?",
        "Como isso afeta a satisfação dos seus clientes?"
      ],
      closing: "Agora tenho uma visão mais clara das consequências desses desafios."
    },
    need: {
      opening: "Com base no que conversamos, acredito que nossa solução pode ajudar vocês. Gostaria de apresentar algumas ideias?",
      followUp: [
        "Como você imagina que uma solução eficaz resolveria esses problemas?",
        "Quais seriam os benefícios mais importantes para sua empresa?"
      ],
      closing: "Fico feliz em saber que vê valor nessas soluções. Podemos agendar uma demonstração para você ver na prática?"
    }
  });

  const handleSavePrompts = () => {
    // In a real implementation, this would save to Convex
    console.log("Saving prompts to Convex");
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Configurações de IA</h3>
        <p className="text-sm text-muted-foreground">
          Personalize os prompts e comportamento da IA do agente SDR
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-1 space-y-4">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Etapas SPIN
              </CardTitle>
              <CardDescription>
                Selecione uma etapa para configurar os prompts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {SPIN_STAGES.map((stage) => (
                <Button
                  key={stage.id}
                  variant={selectedStage === stage.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedStage(stage.id)}
                >
                  <MessageSquare className="mr-2 h-4 w-4" />
                  {stage.name}
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Personalidade
              </CardTitle>
              <CardDescription>
                Escolha como o agente se comporta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {PERSONALITIES.map((personality) => (
                <Button
                  key={personality.id}
                  variant={selectedPersonality === personality.id ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => setSelectedPersonality(personality.id)}
                >
                  {personality.name}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2 space-y-6">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Prompts da Etapa: {SPIN_STAGES.find(s => s.id === selectedStage)?.name}
              </CardTitle>
              <CardDescription>
                {SPIN_STAGES.find(s => s.id === selectedStage)?.description}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="opening">Mensagem de Abertura</Label>
                <Textarea
                  id="opening"
                  value={prompts[selectedStage as keyof typeof prompts].opening}
                  onChange={(e) => setPrompts({
                    ...prompts,
                    [selectedStage]: {
                      ...prompts[selectedStage as keyof typeof prompts],
                      opening: e.target.value
                    }
                  })}
                  placeholder="Digite o prompt de abertura..."
                  className="min-h-[100px]"
                />
              </div>

              <div className="space-y-2">
                <Label>Perguntas de Follow-up</Label>
                <div className="space-y-3">
                  {prompts[selectedStage as keyof typeof prompts].followUp.map((question, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={question}
                        onChange={(e) => {
                          const newFollowUp = [...prompts[selectedStage as keyof typeof prompts].followUp];
                          newFollowUp[index] = e.target.value;
                          setPrompts({
                            ...prompts,
                            [selectedStage]: {
                              ...prompts[selectedStage as keyof typeof prompts],
                              followUp: newFollowUp
                            }
                          });
                        }}
                        placeholder={`Pergunta de follow-up ${index + 1}`}
                      />
                    </div>
                  ))}
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      const newFollowUp = [...prompts[selectedStage as keyof typeof prompts].followUp, ""];
                      setPrompts({
                        ...prompts,
                        [selectedStage]: {
                          ...prompts[selectedStage as keyof typeof prompts],
                          followUp: newFollowUp
                        }
                      });
                    }}
                  >
                    Adicionar Pergunta
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="closing">Mensagem de Encerramento</Label>
                <Textarea
                  id="closing"
                  value={prompts[selectedStage as keyof typeof prompts].closing}
                  onChange={(e) => setPrompts({
                    ...prompts,
                    [selectedStage]: {
                      ...prompts[selectedStage as keyof typeof prompts],
                      closing: e.target.value
                    }
                  })}
                  placeholder="Digite o prompt de encerramento..."
                  className="min-h-[100px]"
                />
              </div>

              <Button onClick={handleSavePrompts}>
                <Save className="mr-2 h-4 w-4" />
                Salvar Prompts
              </Button>
            </CardContent>
          </Card>

          <Card className="glass">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Configurações Adicionais
              </CardTitle>
              <CardDescription>
                Ajustes finos no comportamento da IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Respostas Personalizadas</Label>
                    <p className="text-sm text-muted-foreground">
                      Adaptar respostas com base no contexto da conversa
                    </p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Atraso de Resposta</Label>
                    <p className="text-sm text-muted-foreground">
                      Simular tempo de digitação humano (segundos)
                    </p>
                  </div>
                  <Input 
                    type="number" 
                    defaultValue="2" 
                    className="w-20 text-right" 
                  />
                </div>
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Idioma</Label>
                    <p className="text-sm text-muted-foreground">
                      Idioma principal das respostas
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Languages className="h-4 w-4" />
                    <select className="bg-slate-800 border border-slate-700 rounded-md px-2 py-1">
                      <option>Português (Brasil)</option>
                      <option>English (US)</option>
                      <option>Español</option>
                    </select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}