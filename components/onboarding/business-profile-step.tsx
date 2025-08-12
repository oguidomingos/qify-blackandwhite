"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { saveBusinessProfile, getBusinessProfileByOrg } from "@/lib/mock-api";
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

const POPULAR_NICHES = [
  "Tecnologia", "Marketing Digital", "Consultoria", "E-commerce", 
  "Saúde", "Educação", "Imobiliário", "Financeiro",
  "Advocacia", "Arquitetura", "Design", "Agência"
];

const SAMPLE_SERVICES = {
  "Tecnologia": ["Desenvolvimento de Software", "Consultoria em TI", "Cloud Computing", "Segurança Digital"],
  "Marketing Digital": ["Gestão de Redes Sociais", "Google Ads", "SEO", "Email Marketing"],
  "Consultoria": ["Consultoria Empresarial", "RH", "Processos", "Vendas"],
  "E-commerce": ["Loja Virtual", "Marketplace", "Logística", "Pagamentos"],
};

interface BusinessProfileStepProps {
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  orgData: any;
}

export default function BusinessProfileStep({ onNext, orgData }: BusinessProfileStepProps) {
  const [services, setServices] = useState<string[]>([]);
  const [newService, setNewService] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("");

  // Get existing business profile
  const businessProfile = useQuery(api.businessProfiles.getByOrg, {
    orgId: orgData._id,
  });

  // Create or update business profile
  const saveBusinessProfile = useMutation(api.businessProfiles.upsert);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
    watch,
  } = useForm<BusinessProfileForm>({
    resolver: zodResolver(businessProfileSchema),
    defaultValues: {
      businessName: orgData.name || "",
      niche: "",
      targetAudience: "",
      businessDescription: "",
      website: "",
    },
  });

  const watchedNiche = watch("niche");

  // Load existing data
  useEffect(() => {
    if (businessProfile) {
      setValue("businessName", businessProfile.businessName);
      setValue("niche", businessProfile.niche);
      setValue("targetAudience", businessProfile.targetAudience);
      setValue("businessDescription", businessProfile.businessDescription);
      setValue("website", businessProfile.website || "");
      setServices(businessProfile.services || []);
      setSelectedNiche(businessProfile.niche);
    }
  }, [businessProfile, setValue]);

  // Update selected niche when form niche changes
  useEffect(() => {
    setSelectedNiche(watchedNiche);
  }, [watchedNiche]);

  const addService = () => {
    if (newService.trim() && !services.includes(newService.trim())) {
      setServices([...services, newService.trim()]);
      setNewService("");
    }
  };

  const removeService = (service: string) => {
    setServices(services.filter(s => s !== service));
  };

  const addPopularService = (service: string) => {
    if (!services.includes(service)) {
      setServices([...services, service]);
    }
  };

  const onSubmit = async (data: BusinessProfileForm) => {
    try {
      await saveBusinessProfile({
        orgId: orgData._id,
        businessName: data.businessName,
        niche: data.niche,
        services,
        targetAudience: data.targetAudience,
        businessDescription: data.businessDescription,
        website: data.website || undefined,
      });
      onNext();
    } catch (error) {
      console.error("Error saving business profile:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Business Name */}
      <div className="space-y-2">
        <Label htmlFor="businessName" className="text-white flex items-center space-x-2">
          <Building className="w-4 h-4" />
          <span>Nome do Negócio</span>
        </Label>
        <Input
          id="businessName"
          {...register("businessName")}
          placeholder="Ex: TechSolutions Ltda"
          className="glass"
        />
        {errors.businessName && (
          <p className="text-red-400 text-sm">{errors.businessName.message}</p>
        )}
      </div>

      {/* Niche Selection */}
      <div className="space-y-4">
        <Label className="text-white flex items-center space-x-2">
          <Target className="w-4 h-4" />
          <span>Nicho do Negócio</span>
        </Label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {POPULAR_NICHES.map((niche) => (
            <button
              key={niche}
              type="button"
              onClick={() => setValue("niche", niche)}
              className={`p-3 rounded-lg border text-sm transition-all ${
                watchedNiche === niche
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-slate-600 text-slate-300 hover:border-slate-500"
              }`}
            >
              {niche}
            </button>
          ))}
        </div>
        <Input
          {...register("niche")}
          placeholder="Ou digite seu nicho personalizado"
          className="glass"
        />
        {errors.niche && (
          <p className="text-red-400 text-sm">{errors.niche.message}</p>
        )}
      </div>

      {/* Services */}
      <div className="space-y-4">
        <Label className="text-white">Principais Serviços</Label>
        
        {/* Popular Services for Selected Niche */}
        {selectedNiche && SAMPLE_SERVICES[selectedNiche as keyof typeof SAMPLE_SERVICES] && (
          <Card className="glass border-slate-600">
            <CardContent className="p-4">
              <p className="text-sm text-slate-300 mb-3">
                Serviços populares para {selectedNiche}:
              </p>
              <div className="flex flex-wrap gap-2">
                {SAMPLE_SERVICES[selectedNiche as keyof typeof SAMPLE_SERVICES].map((service) => (
                  <button
                    key={service}
                    type="button"
                    onClick={() => addPopularService(service)}
                    className="text-xs px-3 py-1 rounded-full border border-primary/30 text-primary hover:bg-primary/10 transition-colors"
                    disabled={services.includes(service)}
                  >
                    {services.includes(service) ? (
                      <span className="flex items-center space-x-1">
                        <CheckCircle className="w-3 h-3" />
                        <span>{service}</span>
                      </span>
                    ) : (
                      <span className="flex items-center space-x-1">
                        <Plus className="w-3 h-3" />
                        <span>{service}</span>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Custom Service Input */}
        <div className="flex space-x-2">
          <Input
            value={newService}
            onChange={(e) => setNewService(e.target.value)}
            placeholder="Digite um serviço personalizado"
            className="glass"
            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), addService())}
          />
          <Button type="button" onClick={addService} className="glass-hover">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Selected Services */}
        {services.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {services.map((service) => (
              <Badge
                key={service}
                variant="secondary"
                className="bg-primary/10 text-primary border-primary/30"
              >
                {service}
                <button
                  type="button"
                  onClick={() => removeService(service)}
                  className="ml-2 hover:text-red-400"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Target Audience */}
      <div className="space-y-2">
        <Label htmlFor="targetAudience" className="text-white">
          Público-Alvo
        </Label>
        <Textarea
          id="targetAudience"
          {...register("targetAudience")}
          placeholder="Descreva seu público-alvo ideal: idade, profissão, dores, etc."
          className="glass min-h-[100px]"
        />
        {errors.targetAudience && (
          <p className="text-red-400 text-sm">{errors.targetAudience.message}</p>
        )}
      </div>

      {/* Business Description */}
      <div className="space-y-2">
        <Label htmlFor="businessDescription" className="text-white">
          Descrição do Negócio
        </Label>
        <Textarea
          id="businessDescription"
          {...register("businessDescription")}
          placeholder="Descreva seu negócio, diferenciais e como ajuda seus clientes"
          className="glass min-h-[120px]"
        />
        {errors.businessDescription && (
          <p className="text-red-400 text-sm">{errors.businessDescription.message}</p>
        )}
      </div>

      {/* Website */}
      <div className="space-y-2">
        <Label htmlFor="website" className="text-white flex items-center space-x-2">
          <Globe className="w-4 h-4" />
          <span>Website (Opcional)</span>
        </Label>
        <Input
          id="website"
          {...register("website")}
          placeholder="https://seusite.com.br"
          className="glass"
        />
        {errors.website && (
          <p className="text-red-400 text-sm">{errors.website.message}</p>
        )}
      </div>

      {/* Submit Button */}
      <div className="flex justify-end pt-6">
        <Button
          type="submit"
          disabled={isSubmitting || services.length === 0}
          className="glass-hover px-8"
        >
          {isSubmitting ? "Salvando..." : "Continuar"}
        </Button>
      </div>
    </form>
  );
}