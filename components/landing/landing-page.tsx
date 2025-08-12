"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  ArrowRight, 
  Bot, 
  MessageCircle, 
  TrendingUp, 
  Clock, 
  Shield, 
  Zap,
  Star,
  CheckCircle,
  Play
} from "lucide-react";

const features = [
  {
    icon: Bot,
    title: "IA Avançada",
    description: "Agente SDR com Gemini 2.0 Flash que conversa naturalmente seguindo metodologia SPIN"
  },
  {
    icon: MessageCircle,
    title: "WhatsApp Nativo",
    description: "Integração completa com WhatsApp via Evolution API para conversas autênticas"
  },
  {
    icon: TrendingUp,
    title: "SPIN Selling",
    description: "Metodologia comprovada de vendas implementada com critérios personalizáveis"
  },
  {
    icon: Clock,
    title: "24/7 Disponível",
    description: "Nunca perca um lead. Seu agente trabalha enquanto você dorme"
  },
  {
    icon: Shield,
    title: "Multi-tenant",
    description: "Perfeito para agências. Gerencie múltiplos clientes com isolamento total"
  },
  {
    icon: Zap,
    title: "Setup Rápido",
    description: "Configure seu agente SDR em menos de 10 minutos com nosso onboarding"
  }
];

const testimonials = [
  {
    name: "Carlos Silva",
    role: "CEO, TechSolutions",
    content: "Aumentamos nossa conversão de leads em 340% no primeiro mês. O agente é indistinguível de um SDR humano.",
    rating: 5
  },
  {
    name: "Ana Costa",
    role: "Diretora de Vendas, Marketing Pro",
    content: "Finalmente conseguimos qualificar leads 24/7. O ROI foi positivo já na segunda semana.",
    rating: 5
  },
  {
    name: "Roberto Fernandes",
    role: "Fundador, StartupXYZ",
    content: "A metodologia SPIN implementada na IA é perfeita. Nossos prospects nem percebem que é um bot.",
    rating: 5
  }
];

const plans = [
  {
    name: "Starter",
    price: "R$ 297",
    period: "/mês",
    description: "Perfeito para empresas iniciantes",
    features: [
      "1 Agente SDR",
      "Até 1.000 conversas/mês",
      "WhatsApp + Web",
      "Dashboard básico",
      "Suporte por email"
    ],
    cta: "Começar Grátis",
    popular: false
  },
  {
    name: "Professional",
    price: "R$ 597",
    period: "/mês",
    description: "Para empresas em crescimento",
    features: [
      "3 Agentes SDR",
      "Até 5.000 conversas/mês",
      "Multi-canal (WhatsApp, Web, Email)",
      "Analytics avançado",
      "Integrações CRM",
      "Suporte prioritário"
    ],
    cta: "Começar Teste",
    popular: true
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Para agências e grandes empresas",
    features: [
      "Agentes ilimitados",
      "Conversas ilimitadas",
      "White-label completo",
      "API personalizada",
      "Suporte dedicado",
      "Onboarding personalizado"
    ],
    cta: "Falar com Vendas",
    popular: false
  }
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="border-b border-slate-800/50 glass">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="h-8 w-8 text-primary" />
              <span className="text-2xl font-bold text-white">Qify</span>
              <Badge className="bg-primary/20 text-primary border-primary/30">Beta</Badge>
            </div>
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-slate-300 hover:text-white transition-colors">
                Recursos
              </a>
              <a href="#pricing" className="text-slate-300 hover:text-white transition-colors">
                Preços
              </a>
              <a href="#testimonials" className="text-slate-300 hover:text-white transition-colors">
                Depoimentos
              </a>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="ghost" asChild className="text-slate-300 hover:text-white">
                <Link href="/sign-in">Entrar</Link>
              </Button>
              <Button asChild className="glass-hover">
                <Link href="/sign-up">
                  Começar Grátis
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4">
        <div className="container mx-auto text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="space-y-4">
              <Badge className="bg-primary/20 text-primary border-primary/30 text-sm px-4 py-2">
                🚀 Agora com Gemini 2.0 Flash
              </Badge>
              <h1 className="text-5xl md:text-7xl font-bold text-white leading-tight">
                Seu{" "}
                <span className="bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
                  Agente SDR
                </span>{" "}
                com IA
              </h1>
              <p className="text-xl md:text-2xl text-slate-300 max-w-3xl mx-auto">
                Qualifique leads automaticamente no WhatsApp usando metodologia SPIN Selling. 
                Configure em 10 minutos e aumente suas vendas em até 340%.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Button size="lg" asChild className="glass-hover text-lg px-8 py-6">
                <Link href="/sign-up">
                  Começar Grátis
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="glass-hover text-lg px-8 py-6">
                <Play className="mr-2 h-5 w-5" />
                Ver Demo
              </Button>
            </div>

            <div className="flex items-center justify-center space-x-8 text-sm text-slate-400">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Setup em 10min</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Sem cartão de crédito</span>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span>Cancele quando quiser</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Tecnologia de Ponta
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Combinamos as melhores ferramentas do mercado para criar o agente SDR mais avançado do Brasil
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <Card key={index} className="glass glass-hover border-slate-700/50">
                  <CardHeader>
                    <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                      <Icon className="w-6 h-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl text-white">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-slate-300">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-20 px-4 bg-slate-800/30">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Resultados Reais
            </h2>
            <p className="text-xl text-slate-300">
              Veja o que nossos clientes estão dizendo
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {testimonials.map((testimonial, index) => (
              <Card key={index} className="glass glass-hover border-slate-700/50">
                <CardHeader>
                  <div className="flex items-center space-x-1">
                    {[...Array(testimonial.rating)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-slate-300 italic">"{testimonial.content}"</p>
                  <div>
                    <p className="text-white font-semibold">{testimonial.name}</p>
                    <p className="text-slate-400 text-sm">{testimonial.role}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-20 px-4">
        <div className="container mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Planos Simples
            </h2>
            <p className="text-xl text-slate-300">
              Escolha o plano ideal para seu negócio
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {plans.map((plan, index) => (
              <Card 
                key={index} 
                className={`glass glass-hover border-slate-700/50 relative ${
                  plan.popular ? 'ring-2 ring-primary/50' : ''
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground">
                    Mais Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl text-white">{plan.name}</CardTitle>
                  <div className="space-y-2">
                    <div className="text-4xl font-bold text-white">
                      {plan.price}
                      <span className="text-lg text-slate-400">{plan.period}</span>
                    </div>
                    <CardDescription className="text-slate-300">
                      {plan.description}
                    </CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center space-x-3">
                        <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                        <span className="text-slate-300">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className="w-full glass-hover" 
                    variant={plan.popular ? "default" : "outline"}
                    asChild
                  >
                    <Link href="/sign-up">
                      {plan.cta}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-r from-primary/20 to-blue-500/20">
        <div className="container mx-auto text-center">
          <div className="max-w-3xl mx-auto space-y-8">
            <h2 className="text-4xl md:text-5xl font-bold text-white">
              Pronto para 10x suas vendas?
            </h2>
            <p className="text-xl text-slate-300">
              Configure seu agente SDR em menos de 10 minutos e comece a qualificar leads automaticamente
            </p>
            <Button size="lg" asChild className="glass-hover text-lg px-8 py-6">
              <Link href="/sign-up">
                Começar Agora - É Grátis
                <ArrowRight className="ml-2 h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 py-8 px-4">
        <div className="container mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <Bot className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold text-white">Qify</span>
            </div>
            <div className="text-slate-400 text-sm">
              © 2024 Qify. Todos os direitos reservados.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}