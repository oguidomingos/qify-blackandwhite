"use client";

import { useOrganization } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Rocket, 
  Clock, 
  CheckCircle, 
  ArrowRight,
  Bot 
} from "lucide-react";

const ONBOARDING_BENEFITS = [
  {
    icon: Clock,
    title: "Setup Rápido",
    description: "Configure seu agente SDR em menos de 10 minutos"
  },
  {
    icon: Bot,
    title: "IA Personalizada",
    description: "Agente treinado especificamente para seu negócio e nicho"
  },
  {
    icon: CheckCircle,
    title: "Integração Completa",
    description: "WhatsApp, Google Calendar e metodologia SPIN prontos para usar"
  }
];

export default function WelcomePage() {
  const { organization } = useOrganization();
  const router = useRouter();

  const handleStartOnboarding = () => {
    router.push("/onboarding");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        {/* Welcome Header */}
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Rocket className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-white">
            Bem-vindo ao Qify!
          </h1>
          <p className="text-xl text-slate-300">
            Vamos configurar seu agente SDR personalizado em poucos passos simples
          </p>
        </div>

        {/* Benefits */}
        <div className="space-y-4">
          {ONBOARDING_BENEFITS.map((benefit, index) => {
            const Icon = benefit.icon;
            return (
              <Card key={index} className="glass border-slate-700/50">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold">{benefit.title}</h3>
                      <p className="text-slate-300 text-sm">{benefit.description}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Organization Info */}
        {organization && (
          <Card className="glass border-slate-700/50">
            <CardContent className="p-6">
              <div className="text-center">
                <h3 className="text-white font-semibold">Organização</h3>
                <p className="text-slate-300">Configurando para: {organization.name}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* CTA */}
        <div className="text-center space-y-4">
          <Button 
            onClick={handleStartOnboarding}
            size="lg"
            className="glass-hover px-8 py-6 text-lg"
          >
            Começar Configuração
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <p className="text-slate-400 text-sm">
            ⏱️ Leva apenas 5-10 minutos para completar
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="flex justify-center space-x-2">
          {[1, 2, 3, 4].map((step) => (
            <div
              key={step}
              className="w-2 h-2 rounded-full bg-slate-600"
            />
          ))}
        </div>
      </div>
    </div>
  );
}