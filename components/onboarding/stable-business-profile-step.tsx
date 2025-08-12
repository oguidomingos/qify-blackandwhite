"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Building, 
  Target, 
  Globe, 
  Plus, 
  X,
  CheckCircle 
} from "lucide-react";

const businessProfileSchema = z.object({
  businessName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  niche: z.string().min(2, "Nicho é obrigatório"),
  targetAudience: z.string().min(10, "Descreva seu público-alvo com mais detalhes"),
  businessDescription: z.string().min(20, "Descrição deve ter pelo menos 20 caracteres"),
  website: z.string().url("URL inválida").optional().or(z.literal("")),
});

type BusinessProfileForm = z.infer<typeof businessProfileSchema>;

interface BusinessProfileStepProps {
  onNext: (data: any) => void;
  onPrevious: () => void;
  orgData: any;
}

const SUGGESTED_NICHES = [
  "E-commerce",
  "SaaS/Software",
  "Marketing Digital",
  "Consultoria",
  "Educação Online",
  "Imobiliário",
  "Saúde/Bem-estar",
  "Financeiro",
];

export default function BusinessProfileStep({ onNext, onPrevious, orgData }: BusinessProfileStepProps) {
  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("");

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<BusinessProfileForm>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      businessName: orgData?.name || "",
      niche: "",
      targetAudience: "",
      businessDescription: "",
      website: "",
    },
  });

  const watchedNiche = watch("niche");

  const addService = () => {
    if (newService.trim() && !services.includes(newService.trim())) {
      setServices([...services, newService.trim()]);
      setNewService("");
    }
  };

  const removeService = (service: string) => {
    setServices(services.filter(s => s !== service));
  };

  const selectNiche = (niche: string) => {
    setSelectedNiche(niche);
    setValue("niche", niche);
  };

  const onSubmit = async (data: BusinessProfileForm) => {
    try {
      const businessProfileData = {
        ...data,
        services,
        orgId: orgData?.id || 'mock-org-id',
      };

      // Simulate API call
      console.log("Saving business profile:", businessProfileData);
      
      // Move to next step
      onNext(businessProfileData);
    } catch (error) {
      console.error("Error saving business profile:", error);
    }
  };

  return (
    <Card className="glass">
      <CardContent className="p-6">
        <div className="space-y-6">
          <div className="text-center">
            <Building className="w-12 h-12 text-primary mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-foreground">Perfil do Negócio</h2>
            <p className="text-muted-foreground">
              Conte-nos sobre seu negócio para personalizar o agente SDR
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Business Name */}
            <div className="space-y-2">
              <Label htmlFor="businessName">Nome do Negócio</Label>
              <Input
                id="businessName"
                {...register("businessName")}
                placeholder="Ex: TechSolutions Ltda"
                className="glass"
              />
              {errors.businessName && (
                <p className="text-sm text-destructive">{errors.businessName.message}</p>
              )}
            </div>

            {/* Niche Selection */}
            <div className="space-y-3">
              <Label>Nicho/Área de Atuação</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {SUGGESTED_NICHES.map((niche) => (
                  <Button
                    key={niche}
                    type="button"
                    variant={selectedNiche === niche ? "default" : "outline"}
                    size="sm"
                    onClick={() => selectNiche(niche)}
                    className="text-xs"
                  >
                    {niche}
                  </Button>
                ))}
              </div>
              <Input
                {...register("niche")}
                placeholder="Ou digite seu nicho específico"
                className="glass"
                value={watchedNiche}
                onChange={(e) => {
                  setValue("niche", e.target.value);
                  setSelectedNiche("");
                }}
              />
              {errors.niche && (
                <p className="text-sm text-destructive">{errors.niche.message}</p>
              )}
            </div>

            {/* Services */}
            <div className="space-y-3">
              <Label>Serviços/Produtos Oferecidos</Label>
              <div className="flex gap-2">
                <Input
                  value={newService}
                  onChange={(e) => setNewService(e.target.value)}
                  placeholder="Ex: Desenvolvimento Web"
                  className="glass"
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                />
                <Button type="button" onClick={addService} size="icon" variant="outline">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {services.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {services.map((service) => (
                    <Badge key={service} variant="secondary" className="flex items-center gap-1">
                      {service}
                      <X 
                        className="w-3 h-3 cursor-pointer" 
                        onClick={() => removeService(service)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Target Audience */}
            <div className="space-y-2">
              <Label htmlFor="targetAudience">Público-Alvo</Label>
              <Textarea
                id="targetAudience"
                {...register("targetAudience")}
                placeholder="Descreva seu público-alvo ideal: idade, profissão, necessidades, etc."
                className="glass min-h-[100px]"
              />
              {errors.targetAudience && (
                <p className="text-sm text-destructive">{errors.targetAudience.message}</p>
              )}
            </div>

            {/* Business Description */}
            <div className="space-y-2">
              <Label htmlFor="businessDescription">Descrição do Negócio</Label>
              <Textarea
                id="businessDescription"
                {...register("businessDescription")}
                placeholder="Conte mais sobre seu negócio: missão, diferenciais, historia..."
                className="glass min-h-[120px]"
              />
              {errors.businessDescription && (
                <p className="text-sm text-destructive">{errors.businessDescription.message}</p>
              )}
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website">Website (Opcional)</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  id="website"
                  {...register("website")}
                  placeholder="https://seusite.com.br"
                  className="glass pl-10"
                />
              </div>
              {errors.website && (
                <p className="text-sm text-destructive">{errors.website.message}</p>
              )}
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onPrevious}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="flex-1"
              >
                {isSubmitting ? "Salvando..." : "Continuar"}
              </Button>
            </div>
          </form>
        </div>
      </CardContent>
    </Card>
  );
}