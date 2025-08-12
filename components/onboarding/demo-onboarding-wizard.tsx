"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useOrganization } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
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
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    businessName: "",
    niche: "",
    businessDescription: "",
    agentName: "",
    personality: "professional",
  });

  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  const saveStepData = async (stepId: string) => {
    setIsSaving(true);
    
    // In a real implementation, this would save to Convex
    // For now, we'll simulate an API call
    return new Promise((resolve) => {
      setTimeout(() => {
        console.log(`Saving data for step: ${stepId}`, formData);
        setIsSaving(false);
        resolve(true);
      }, 1000);
    });
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
              <Label htmlFor="businessDescription" className="text-white">Descrição do Negócio</Label>
              <Textarea
                id="businessDescription"
                value={formData.businessDescription}
                onChange={(e) => setFormData({...formData, businessDescription: e.target.value})}
                placeholder="Descreva seu negócio, diferenciais e como ajuda seus clientes"
                className="glass min-h-[120px]"
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
                // In a real implementation, this would initiate Google OAuth flow
                console.log("Initiating Google Calendar connection");
                // Mark step as completed for demo purposes
                if (!completedSteps.includes("google")) {
                  setCompletedSteps([...completedSteps, "google"]);
                }
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
          <div className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
              <MessageCircle className="w-8 h-8 text-green-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white mb-2">WhatsApp Setup</h3>
              <p className="text-slate-300">
                Configure sua conexão WhatsApp via Evolution API
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                <h4 className="text-white font-medium mb-2">Próximos Passos:</h4>
                <div className="space-y-2 text-sm text-slate-300">
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span>Criar instância Evolution API</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span>Gerar QR Code para autenticação</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span>Sincronizar conversas existentes</span>
                  </div>
                </div>
              </div>
              
              <Button 
                className="glass-hover"
                onClick={() => {
                  // In a real implementation, this would initiate WhatsApp connection
                  console.log("Initiating WhatsApp connection");
                  // Mark step as completed for demo purposes
                  if (!completedSteps.includes("whatsapp")) {
                    setCompletedSteps([...completedSteps, "whatsapp"]);
                  }
                }}
              >
                Configurar WhatsApp
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