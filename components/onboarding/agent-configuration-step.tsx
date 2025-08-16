"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Bot, 
  User, 
  Clock, 
  Globe,
  Briefcase,
  Heart,
  Zap,
  ShieldCheck
} from "lucide-react";

const agentConfigSchema = z.object({
  agentName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  phoneNumber: z.string().optional(),
  responseTime: z.number().min(1).max(60),
});

type AgentConfigForm = z.infer<typeof agentConfigSchema>;

const PERSONALITIES = [
  {
    id: "professional",
    name: "Profissional",
    description: "Formal, direto e focado em resultados",
    icon: Briefcase,
    traits: ["Objetivo", "Respeitoso", "Confiável"],
    sample: "Olá! Sou da TechSolutions. Gostaria de entender melhor sobre os desafios de TI da sua empresa."
  },
  {
    id: "friendly",
    name: "Amigável",
    description: "Caloroso, empático e conversacional",
    icon: Heart,
    traits: ["Empático", "Caloroso", "Acessível"],
    sample: "Oi! Tudo bem? Sou o assistente da TechSolutions. Como posso te ajudar hoje?"
  },
  {
    id: "energetic",
    name: "Energético",
    description: "Entusiasmado, motivador e dinâmico",
    icon: Zap,
    traits: ["Entusiasmado", "Motivador", "Dinâmico"],
    sample: "Opa! 🚀 Que bom falar contigo! Sou da TechSolutions e tenho soluções incríveis para te mostrar!"
  },
  {
    id: "consultative",
    name: "Consultivo",
    description: "Analítico, questionador e orientado a soluções",
    icon: ShieldCheck,
    traits: ["Analítico", "Questionador", "Estratégico"],
    sample: "Olá! Para melhor te atender, preciso entender o cenário atual da sua empresa. Pode me contar um pouco?"
  }
];

const LANGUAGES = [
  { code: "pt-BR", name: "Português (Brasil)", flag: "🇧🇷" },
  { code: "en-US", name: "English (US)", flag: "🇺🇸" },
  { code: "es-ES", name: "Español", flag: "🇪🇸" },
];

const WORK_DAYS = [
  { id: "mon", name: "Segunda", short: "Seg" },
  { id: "tue", name: "Terça", short: "Ter" },
  { id: "wed", name: "Quarta", short: "Qua" },
  { id: "thu", name: "Quinta", short: "Qui" },
  { id: "fri", name: "Sexta", short: "Sex" },
  { id: "sat", name: "Sábado", short: "Sáb" },
  { id: "sun", name: "Domingo", short: "Dom" },
];

interface AgentConfigurationStepProps {
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  orgData: any;
}

export default function AgentConfigurationStep({ onNext, orgData }: AgentConfigurationStepProps) {
  const [selectedPersonality, setSelectedPersonality] = useState("professional");
  const [selectedLanguage, setSelectedLanguage] = useState("pt-BR");
  const [workDays, setWorkDays] = useState(["mon", "tue", "wed", "thu", "fri"]);
  const [workStart, setWorkStart] = useState("09:00");
  const [workEnd, setWorkEnd] = useState("18:00");

  // Get existing agent configuration
  const agentConfig = useQuery(api.agentConfigurations.getByOrg, {
    clerkOrgId: orgData._id,
  });

  // Get business profile for default agent name
  const businessProfile = useQuery(api.businessProfiles.getByOrg, {
    clerkOrgId: orgData._id,
  });

  // Save agent configuration
  const saveAgentConfig = useMutation(api.agentConfigurations.upsert);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<AgentConfigForm>({
    resolver: zodResolver(agentConfigSchema),
    defaultValues: {
      agentName: "",
      phoneNumber: "",
      responseTime: 3,
    },
  });

  // Load existing data
  useEffect(() => {
    if (agentConfig) {
      setValue("agentName", agentConfig.agentName);
      setValue("phoneNumber", agentConfig.phoneNumber || "");
      setValue("responseTime", agentConfig.responseTime);
      setSelectedPersonality(agentConfig.personality);
      setSelectedLanguage(agentConfig.language);
      setWorkDays(agentConfig.workingHours.workDays);
      setWorkStart(agentConfig.workingHours.start);
      setWorkEnd(agentConfig.workingHours.end);
    } else if (businessProfile) {
      // Set default agent name based on business
      setValue("agentName", `${businessProfile.businessName} Assistant`);
    }
  }, [agentConfig, businessProfile, setValue]);

  const selectedPersonalityData = PERSONALITIES.find(p => p.id === selectedPersonality);

  const toggleWorkDay = (dayId: string) => {
    setWorkDays(prev => 
      prev.includes(dayId) 
        ? prev.filter(d => d !== dayId)
        : [...prev, dayId]
    );
  };

  const onSubmit = async (data: AgentConfigForm) => {
    try {
      await saveAgentConfig({
        orgId: orgData._id,
        agentName: data.agentName,
        phoneNumber: data.phoneNumber,
        personality: selectedPersonality,
        toneOfVoice: selectedPersonalityData?.description || "",
        language: selectedLanguage,
        responseTime: data.responseTime,
        workingHours: {
          start: workStart,
          end: workEnd,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          workDays,
        },
      });
      onNext();
    } catch (error) {
      console.error("Error saving agent configuration:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Agent Identity */}
      <Card className="glass border-slate-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <User className="w-5 h-5" />
            <span>Identidade do Agente</span>
          </CardTitle>
          <CardDescription>
            Como seu agente SDR se apresentará aos prospects
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="agentName" className="text-white">Nome do Agente</Label>
            <Input
              id="agentName"
              {...register("agentName")}
              placeholder="Ex: Sofia da TechSolutions"
              className="glass"
            />
            {errors.agentName && (
              <p className="text-red-400 text-sm">{errors.agentName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phoneNumber" className="text-white">
              Número de Telefone (Opcional)
            </Label>
            <Input
              id="phoneNumber"
              {...register("phoneNumber")}
              placeholder="Ex: +55 11 99999-9999"
              className="glass"
            />
            <p className="text-slate-400 text-xs">
              Será configurado automaticamente quando conectar o WhatsApp
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Personality */}
      <Card className="glass border-slate-600">
        <CardHeader>
          <CardTitle className="text-white flex items-center space-x-2">
            <Bot className="w-5 h-5" />
            <span>Personalidade</span>
          </CardTitle>
          <CardDescription>
            Escolha o estilo de comunicação do seu agente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid md:grid-cols-2 gap-4">
            {PERSONALITIES.map((personality) => {
              const Icon = personality.icon;
              const isSelected = selectedPersonality === personality.id;
              
              return (
                <div
                  key={personality.id}
                  onClick={() => setSelectedPersonality(personality.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    isSelected
                      ? "border-primary bg-primary/10"
                      : "border-slate-600 hover:border-slate-500"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isSelected ? "bg-primary/20" : "bg-slate-700"
                      }`}>
                        <Icon className={`w-4 h-4 ${isSelected ? "text-primary" : "text-slate-400"}`} />
                      </div>
                      <div>
                        <h3 className="text-white font-medium">{personality.name}</h3>
                        <p className="text-slate-400 text-xs">{personality.description}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {personality.traits.map((trait) => (
                        <Badge
                          key={trait}
                          variant="secondary"
                          className="text-xs bg-slate-700/50 text-slate-300"
                        >
                          {trait}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sample Message */}
          {selectedPersonalityData && (
            <Card className="bg-slate-800/30 border-slate-700">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <p className="text-slate-300 text-sm font-medium">Exemplo de mensagem:</p>
                  <div className="bg-slate-900/50 p-3 rounded-lg">
                    <p className="text-slate-200 text-sm italic">
                      "{selectedPersonalityData.sample}"
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>

      {/* Language & Response Time */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card className="glass border-slate-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Globe className="w-5 h-5" />
              <span>Idioma</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {LANGUAGES.map((language) => (
                <div
                  key={language.code}
                  onClick={() => setSelectedLanguage(language.code)}
                  className={`p-3 rounded-lg border cursor-pointer transition-all ${
                    selectedLanguage === language.code
                      ? "border-primary bg-primary/10"
                      : "border-slate-600 hover:border-slate-500"
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-lg">{language.flag}</span>
                    <span className="text-white">{language.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="glass border-slate-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Tempo de Resposta</span>
            </CardTitle>
            <CardDescription>
              Delay para simular digitação humana
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="text-white">Segundos de delay</Label>
              <Input
                {...register("responseTime", { valueAsNumber: true })}
                type="number"
                min="1"
                max="60"
                className="glass"
              />
              <p className="text-slate-400 text-xs">
                Recomendado: 2-5 segundos para parecer mais humano
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Working Hours */}
      <Card className="glass border-slate-600">
        <CardHeader>
          <CardTitle className="text-white">Horário de Funcionamento</CardTitle>
          <CardDescription>
            Quando seu agente estará ativo para responder mensagens
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Work Days */}
          <div className="space-y-3">
            <Label className="text-white">Dias da Semana</Label>
            <div className="flex flex-wrap gap-2">
              {WORK_DAYS.map((day) => (
                <button
                  key={day.id}
                  type="button"
                  onClick={() => toggleWorkDay(day.id)}
                  className={`px-4 py-2 rounded-lg border text-sm transition-all ${
                    workDays.includes(day.id)
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-slate-600 text-slate-300 hover:border-slate-500"
                  }`}
                >
                  {day.short}
                </button>
              ))}
            </div>
          </div>

          {/* Work Hours */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-white">Horário de Início</Label>
              <Input
                type="time"
                value={workStart}
                onChange={(e) => setWorkStart(e.target.value)}
                className="glass"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-white">Horário de Fim</Label>
              <Input
                type="time"
                value={workEnd}
                onChange={(e) => setWorkEnd(e.target.value)}
                className="glass"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end pt-6">
        <Button
          type="submit"
          disabled={isSubmitting || workDays.length === 0}
          className="glass-hover px-8"
        >
          {isSubmitting ? "Salvando..." : "Continuar"}
        </Button>
      </div>
    </form>
  );
}