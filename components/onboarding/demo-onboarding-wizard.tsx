"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization, useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { 
  Building, 
  Calendar, 
  Bot, 
  MessageCircle, 
  CheckCircle, 
  ArrowRight,
  ChevronLeft,
  User,
  Globe,
  Clock
} from "lucide-react";

const ONBOARDING_STEPS = [
  {
    id: "business",
    title: "Perfil do Negócio",
    description: "Conte-nos sobre seu negócio e público-alvo",
    icon: Building,
  },
  {
    id: "google",
    title: "Google Calendar",
    description: "Conecte sua agenda para agendamentos automáticos",
    icon: Calendar,
  },
  {
    id: "agent",
    title: "Configuração do Agente",
    description: "Personalize a personalidade e comportamento do seu SDR",
    icon: Bot,
  },
  {
    id: "whatsapp",
    title: "WhatsApp Setup",
    description: "Configure sua conexão WhatsApp via Evolution API",
    icon: MessageCircle,
  },
];

const PERSONALITIES = [
  {
    id: "professional",
    name: "Profissional",
    description: "Formal, direto e focado em resultados",
    sample: "Olá! Sou da TechSolutions. Gostaria de entender melhor sobre os desafios de TI da sua empresa."
  },
  {
    id: "friendly",
    name: "Amigável",
    description: "Caloroso, empático e conversacional",
    sample: "Oi! Tudo bem? Sou o assistente da TechSolutions. Como posso te ajudar hoje?"
  },
  {
    id: "energetic",
    name: "Energético",
    description: "Entusiasmado, motivador e dinâmico",
    sample: "Opa! 🚀 Que bom falar contigo! Sou da TechSolutions e tenho soluções incríveis para te mostrar!"
  },
  {
    id: "consultative",
    name: "Consultivo",
    description: "Analítico, questionador e orientado a soluções",
    sample: "Olá! Para melhor te atender, preciso entender o cenário atual da sua empresa. Pode me contar um pouco?"
  }
];

export default function DemoOnboardingWizard() {
  const { organization } = useOrganization();
  const { user } = useUser();
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    niche: "",
    businessDescription: "",
    targetAudience: "",
    services: "",
    website: "",
    agentName: "",
    personality: "professional",
    phoneNumber: "",
  });

  // Convex mutations
  const createBusinessProfile = useMutation(api.businessProfiles.upsert);
  const createAgentConfig = useMutation(api.agentConfigurations.upsert);

  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  const saveStepData = async (stepId: string) => {
    setIsSaving(true);
    
    try {
      const orgId = organization?.id || user?.id;
      if (!orgId) {
        throw new Error("No organization ID found");
      }

      switch (stepId) {
        case "business":
          await createBusinessProfile({
            clerkOrgId: orgId,
            businessName: formData.businessName,
            niche: formData.niche,
            services: formData.services.split(',').map(s => s.trim()).filter(s => s),
            targetAudience: formData.targetAudience,
            businessDescription: formData.businessDescription,
            website: formData.website || undefined,
          });
          break;

        case "agent":
          await createAgentConfig({
            clerkOrgId: orgId,
            agentName: formData.agentName,
            phoneNumber: "", // Will be set in WhatsApp step
            personality: formData.personality,
            toneOfVoice: formData.personality === "professional" ? "Formal e objetivo" : 
                         formData.personality === "friendly" ? "Caloroso e empático" :
                         formData.personality === "energetic" ? "Entusiasmado e dinâmico" :
                         "Analítico e questionador",
            language: "pt-BR",
            responseTime: 2,
            workingHours: {
              start: "09:00",
              end: "18:00",
              timezone: "America/Sao_Paulo",
              workDays: ["mon", "tue", "wed", "thu", "fri"]
            }
          });
          break;

        case "google":
          // Google step doesn't save form data directly
          break;
          
        case "whatsapp":
          // Update agent config with phone number
          await createAgentConfig({
            clerkOrgId: orgId,
            agentName: formData.agentName,
            phoneNumber: formData.phoneNumber,
            personality: formData.personality,
            toneOfVoice: formData.personality === "professional" ? "Formal e objetivo" : 
                         formData.personality === "friendly" ? "Caloroso e empático" :
                         formData.personality === "energetic" ? "Entusiasmado e dinâmico" :
                         "Analítico e questionador",
            language: "pt-BR",
            responseTime: 2,
            workingHours: {
              start: "09:00",
              end: "18:00",
              timezone: "America/Sao_Paulo",
              workDays: ["mon", "tue", "wed", "thu", "fri"]
            }
          });
          break;
      }
      
      console.log(`Saved data for step: ${stepId}`);
    } catch (error) {
      console.error(`Error saving step ${stepId}:`, error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handleNext = async () => {
    const currentStepId = ONBOARDING_STEPS[currentStep].id;
    
    // Save current step data
    await saveStepData(currentStepId);
    
    // Mark current step as completed
    if (!completedSteps.includes(currentStepId)) {
      setCompletedSteps([...completedSteps, currentStepId]);
    }

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Onboarding completed - update organization status and redirect to dashboard
      // In a real implementation, this would update the organization in Convex
      console.log("Onboarding completed for organization:", organization?.id);
      router.push("/dashboard");
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // Business Profile
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="businessName" className="text-white">Nome do Negócio</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                placeholder="Ex: TechSolutions Ltda"
                className="glass"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="niche" className="text-white">Nicho do Negócio</Label>
              <Input
                id="niche"
                value={formData.niche}
                onChange={(e) => setFormData({...formData, niche: e.target.value})}
                placeholder="Ex: Tecnologia, Marketing Digital, Consultoria"
                className="glass"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="services" className="text-white">Serviços (separados por vírgula)</Label>
              <Input
                id="services"
                value={formData.services}
                onChange={(e) => setFormData({...formData, services: e.target.value})}
                placeholder="Ex: Desenvolvimento de Software, Consultoria, Suporte"
                className="glass"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetAudience" className="text-white">Público-alvo</Label>
              <Input
                id="targetAudience"
                value={formData.targetAudience}
                onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
                placeholder="Ex: Empresas médias do setor industrial"
                className="glass"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="businessDescription" className="text-white">Descrição do Negócio</Label>
              <Textarea
                id="businessDescription"
                value={formData.businessDescription}
                onChange={(e) => setFormData({...formData, businessDescription: e.target.value})}
                placeholder="Descreva seu negócio, diferenciais e como ajuda seus clientes"
                className="glass min-h-[120px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website" className="text-white">Website (opcional)</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData({...formData, website: e.target.value})}
                placeholder="Ex: https://www.techsolutions.com.br"
                className="glass"
              />
            </div>
          </div>
        );

      case 1: // Google Calendar
        return (
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-blue-500/10 flex items-center justify-center">
              <Calendar className="w-8 h-8 text-blue-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">Google Calendar</h3>
              <p className="text-slate-300">
                Conecte sua agenda para agendamentos automáticos
              </p>
            </div>
            <Button 
              className="glass-hover"
              onClick={() => {
                // Redirect to Google OAuth flow
                window.location.href = "/api/oauth/google/start";
              }}
            >
              Conectar Google Calendar
            </Button>
            <p className="text-slate-400 text-sm">
              Você pode pular esta etapa e configurar depois
            </p>
          </div>
        );

      case 2: // Agent Configuration
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="agentName" className="text-white">Nome do Agente</Label>
              <Input
                id="agentName"
                value={formData.agentName}
                onChange={(e) => setFormData({...formData, agentName: e.target.value})}
                placeholder="Ex: Sofia da TechSolutions"
                className="glass"
              />
            </div>

            <div className="space-y-4">
              <Label className="text-white">Personalidade do Agente</Label>
              <div className="grid md:grid-cols-2 gap-4">
                {PERSONALITIES.map((personality) => (
                  <div
                    key={personality.id}
                    onClick={() => setFormData({...formData, personality: personality.id})}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      formData.personality === personality.id
                        ? "border-primary bg-primary/10"
                        : "border-slate-600 hover:border-slate-500"
                    }`}
                  >
                    <h4 className="text-white font-medium">{personality.name}</h4>
                    <p className="text-slate-400 text-sm">{personality.description}</p>
                  </div>
                ))}
              </div>
              
              {formData.personality && (
                <Card className="bg-slate-800/30 border-slate-700">
                  <CardContent className="p-4">
                    <p className="text-slate-300 text-sm font-medium mb-2">Exemplo de mensagem:</p>
                    <div className="bg-slate-900/50 p-3 rounded-lg">
                      <p className="text-slate-200 text-sm italic">
                        "{PERSONALITIES.find(p => p.id === formData.personality)?.sample}"
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        );

      case 3: // WhatsApp Setup
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                <MessageCircle className="w-8 h-8 text-green-400" />
              </div>
              <div className="mt-4">
                <h3 className="text-xl font-bold text-white mb-2">WhatsApp Setup</h3>
                <p className="text-slate-300">
                  Configure sua conexão WhatsApp via Evolution API
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="phoneNumber" className="text-white">
                  Número do WhatsApp *
                </Label>
                <Input
                  id="phoneNumber"
                  type="tel"
                  placeholder="+5511999999999"
                  value={formData.phoneNumber}
                  onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                  className="bg-slate-800/50 border-slate-600 text-white"
                  required
                />
                <p className="text-slate-400 text-sm mt-1">
                  Digite o número completo com código do país (ex: +5511999999999)
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                <h4 className="text-white font-medium mb-2">Próximos Passos:</h4>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span>Salvar número do WhatsApp</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span>Criar instância Evolution API</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span>Gerar QR Code para autenticação</span>
                  </div>
                </div>
              </div>
              
              <Button 
                className="glass-hover w-full"
                disabled={!formData.phoneNumber.trim() || isSaving}
                onClick={async () => {
                  if (!formData.phoneNumber.trim()) {
                    alert("Por favor, digite o número do WhatsApp");
                    return;
                  }
                  
                  try {
                    await saveStepData("whatsapp");
                    if (!completedSteps.includes("whatsapp")) {
                      setCompletedSteps([...completedSteps, "whatsapp"]);
                    }
                  } catch (error) {
                    console.error("Error saving WhatsApp config:", error);
                    alert("Erro ao salvar configuração. Tente novamente.");
                  }
                }}
              >
                {isSaving ? "Salvando..." : "Configurar WhatsApp"}
              </Button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="flex min-h-screen">
        {/* Progress Sidebar */}
        <div className="hidden lg:flex lg:w-80 lg:flex-col bg-slate-900/50 border-r border-slate-700/50">
          <div className="flex-1 flex flex-col py-8 px-6">
            <div className="flex items-center space-x-2 mb-8">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="text-primary font-bold">Q</span>
              </div>
              <span className="text-xl font-bold text-white">Qify Setup</span>
            </div>
            
            <div className="space-y-4">
              <div className="text-sm text-slate-400 uppercase tracking-wider font-medium">
                Configuração Inicial
              </div>
              <div className="space-y-2">
                <div className="text-slate-300 text-sm">
                  Configure seu agente SDR em poucos passos simples
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b border-slate-700/50 bg-slate-900/50 px-8 py-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h1 className="text-2xl font-bold text-white">
                    Configuração Inicial
                  </h1>
                  <p className="text-slate-400">
                    Passo {currentStep + 1} de {ONBOARDING_STEPS.length}
                  </p>
                </div>
                <Badge variant="outline" className="border-primary/30 text-primary">
                  {Math.round(progress)}% Completo
                </Badge>
              </div>
              
              {/* Progress Bar */}
              <div className="space-y-3">
                <Progress value={progress} className="h-2" />
                <div className="flex justify-between text-xs text-slate-400">
                  {ONBOARDING_STEPS.map((step, index) => (
                    <div key={step.id} className="flex items-center space-x-1">
                      {completedSteps.includes(step.id) ? (
                        <CheckCircle className="w-4 h-4 text-green-400" />
                      ) : (
                        <div className={`w-4 h-4 rounded-full border-2 ${
                          index === currentStep 
                            ? "border-primary bg-primary/20" 
                            : "border-slate-600"
                        }`} />
                      )}
                      <span className={index === currentStep ? "text-primary" : ""}>
                        {step.title}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Step Content */}
          <div className="flex-1 px-8 py-8">
            <div className="max-w-4xl mx-auto">
              <Card className="glass border-slate-700/50">
                <CardHeader>
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                      {React.createElement(ONBOARDING_STEPS[currentStep].icon, {
                        className: "w-6 h-6 text-primary"
                      })}
                    </div>
                    <div>
                      <CardTitle className="text-2xl text-white">
                        {ONBOARDING_STEPS[currentStep].title}
                      </CardTitle>
                      <CardDescription className="text-slate-300">
                        {ONBOARDING_STEPS[currentStep].description}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  {renderStepContent()}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Navigation */}
          <div className="border-t border-slate-700/50 bg-slate-900/50 px-8 py-6">
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <Button 
                variant="ghost" 
                onClick={handlePrevious}
                disabled={currentStep === 0}
                className="text-slate-300 hover:text-white"
              >
                <ChevronLeft className="mr-2 h-4 w-4" />
                Anterior
              </Button>
              
              <div className="text-sm text-slate-400">
                {currentStep + 1} de {ONBOARDING_STEPS.length} passos
              </div>
              
              <Button 
                onClick={handleNext}
                disabled={isSaving}
                className="glass-hover"
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Salvando...
                  </>
                ) : isLastStep ? (
                  "Finalizar"
                ) : (
                  "Próximo"
                )}
                {!isSaving && !isLastStep && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}