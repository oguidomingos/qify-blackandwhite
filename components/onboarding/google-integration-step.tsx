"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Calendar, 
  CheckCircle, 
  ExternalLink, 
  Clock, 
  MapPin,
  AlertCircle,
  RefreshCw
} from "lucide-react";

interface GoogleIntegrationStepProps {
  onNext: () => void;
  onPrevious: () => void;
  isLastStep: boolean;
  orgData: any;
}

export default function GoogleIntegrationStep({ onNext, orgData }: GoogleIntegrationStepProps) {
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedCalendar, setSelectedCalendar] = useState<string>("");

  // Get existing Google credentials
  const googleCredentials = useQuery(api.google.getCredentials, {
    orgId: orgData._id,
  });

  // Mock calendars for now - would need to implement listCalendars in convex/google.ts
  const calendars = null;

  // Update organization settings
  const updateOrgSettings = useMutation(api.organizationSettings.upsert);

  const handleGoogleConnect = async () => {
    setIsConnecting(true);
    try {
      // Redirect to Google OAuth
      window.location.href = `/api/oauth/google/start?orgId=${orgData._id}`;
    } catch (error) {
      console.error("Error connecting to Google:", error);
      setIsConnecting(false);
    }
  };

  const handleCalendarSelect = async (calendarId: string) => {
    setSelectedCalendar(calendarId);
    await updateOrgSettings({
      orgId: orgData._id,
      defaultCalendarId: calendarId,
      meetingDurationMin: 30,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
  };

  const handleContinue = () => {
    // Simplified for now - just continue
    onNext();
  };

  const isConnected = !!googleCredentials;
  const hasCalendars = false; // Simplified for now
  const canContinue = true; // Simplified for now

  return (
    <div className="space-y-8">
      {/* Connection Status */}
      <Card className="glass border-slate-600">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-white">Google Calendar</CardTitle>
                <CardDescription>
                  Conecte sua agenda para agendamentos automáticos
                </CardDescription>
              </div>
            </div>
            {isConnected ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <CheckCircle className="w-3 h-3 mr-1" />
                Conectado
              </Badge>
            ) : (
              <Badge variant="outline" className="border-yellow-500/30 text-yellow-400">
                <AlertCircle className="w-3 h-3 mr-1" />
                Pendente
              </Badge>
            )}
          </div>
        </CardHeader>
        
        {!isConnected && (
          <CardContent className="space-y-4">
            <div className="text-slate-300 text-sm space-y-2">
              <p>Para configurar agendamentos automáticos, você precisa conectar sua conta Google.</p>
              <div className="space-y-1">
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50"></div>
                  <span>Acesso apenas à criação de eventos</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50"></div>
                  <span>Suas informações são seguras e criptografadas</span>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary/50"></div>
                  <span>Você pode revogar o acesso a qualquer momento</span>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleGoogleConnect} 
              disabled={isConnecting}
              className="w-full glass-hover"
            >
              {isConnecting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Conectar Google Calendar
                </>
              )}
            </Button>
          </CardContent>
        )}

        {isConnected && googleCredentials && (
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-3 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
              <CheckCircle className="w-5 h-5 text-green-400" />
              <div>
                <p className="text-white text-sm font-medium">Conectado com sucesso!</p>
                <p className="text-green-300 text-xs">{googleCredentials.email}</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Calendar Selection */}
      {isConnected && hasCalendars && (
        <Card className="glass border-slate-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>Selecionar Calendário</span>
            </CardTitle>
            <CardDescription>
              Escolha o calendário onde os agendamentos serão criados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(calendars || []).map((calendar: any) => (
              <div
                key={calendar.id}
                onClick={() => handleCalendarSelect(calendar.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all ${
                  selectedCalendar === calendar.id
                    ? "border-primary bg-primary/10"
                    : "border-slate-600 hover:border-slate-500"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: calendar.backgroundColor || "#3b82f6" }}></div>
                    <div>
                      <p className="text-white font-medium">{calendar.summary}</p>
                      {calendar.description && (
                        <p className="text-slate-400 text-xs">{calendar.description}</p>
                      )}
                    </div>
                  </div>
                  {selectedCalendar === calendar.id && (
                    <CheckCircle className="w-5 h-5 text-primary" />
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Meeting Settings */}
      {isConnected && (
        <Card className="glass border-slate-600">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Clock className="w-5 h-5" />
              <span>Configurações de Reunião</span>
            </CardTitle>
            <CardDescription>
              Configurações padrão para reuniões agendadas
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-white text-sm font-medium">Duração Padrão</label>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-600">
                  <span className="text-slate-300">30 minutos</span>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-white text-sm font-medium">Fuso Horário</label>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-600 flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  <span className="text-slate-300 text-sm">
                    {Intl.DateTimeFormat().resolvedOptions().timeZone}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skip Option */}
      {!isConnected && (
        <Card className="glass border-slate-600 border-dashed">
          <CardContent className="p-6 text-center space-y-4">
            <div className="text-slate-300 text-sm">
              <p>Você pode pular esta etapa e configurar depois nas configurações.</p>
              <p className="text-xs text-slate-400">
                Sem integração Google, os agendamentos precisarão ser criados manualmente.
              </p>
            </div>
            <Button variant="outline" onClick={onNext} className="glass-hover">
              Pular por Agora
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Continue Button */}
      {canContinue && (
        <div className="flex justify-end pt-6">
          <Button onClick={handleContinue} className="glass-hover px-8">
            Continuar
          </Button>
        </div>
      )}
    </div>
  );
}