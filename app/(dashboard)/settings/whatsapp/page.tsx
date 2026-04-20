"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  MessageCircle,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Wifi,
  WifiOff,
  Users,
  MessageSquare,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";

interface EvolutionInstance {
  id: string;
  name: string;
  connectionStatus: string;
  profileName: string | null;
  profilePicUrl: string | null;
  phoneNumber: string | null;
  messageCount: number;
  contactCount: number;
}

function StatusBadge({ status }: { status: string }) {
  if (status === "open") {
    return (
      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
        <CheckCircle className="h-3 w-3" /> Conectado
      </Badge>
    );
  }
  if (status === "connecting") {
    return (
      <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 gap-1">
        <RefreshCw className="h-3 w-3 animate-spin" /> Conectando
      </Badge>
    );
  }
  return (
    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
      <XCircle className="h-3 w-3" /> Desconectado
    </Badge>
  );
}

export default function WhatsAppSettings() {
  const [instances, setInstances] = useState<EvolutionInstance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [qrInstance, setQrInstance] = useState<string | null>(null);

  const loadInstances = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/evolution/instances");
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setInstances(data.instances || []);
    } catch (err: any) {
      setError(err.message || "Erro ao carregar instâncias");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInstances();
  }, []);

  const handleConnect = async (instanceName: string) => {
    setConnecting(instanceName);
    setQrCode(null);
    setQrInstance(null);
    try {
      const res = await fetch("/api/evolution/instance/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName }),
      });
      const data = await res.json();
      if (data.qrCode) {
        setQrCode(data.qrCode);
        setQrInstance(instanceName);

        // Poll status
        const poll = setInterval(async () => {
          await loadInstances();
          const inst = instances.find((i) => i.name === instanceName);
          if (inst?.connectionStatus === "open") {
            clearInterval(poll);
            setQrCode(null);
            setQrInstance(null);
          }
        }, 3000);

        setTimeout(() => clearInterval(poll), 120000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (instanceName: string) => {
    try {
      await fetch(`/api/whatsapp/disconnect/${encodeURIComponent(instanceName)}`, { method: "POST" });
      await loadInstances();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSelect = (instanceName: string) => {
    setSelectedInstance(instanceName === selectedInstance ? null : instanceName);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Configurações do WhatsApp</h3>
        <p className="text-sm text-muted-foreground">
          Selecione uma instância Evolution API para conectar ao seu agente
        </p>
      </div>

      <Card className="glass">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Instâncias Disponíveis
            </CardTitle>
            <CardDescription>
              Escolha qual instância do WhatsApp usar para este agente
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={loadInstances} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span>Buscando instâncias...</span>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center py-8 gap-3 text-center">
              <AlertCircle className="h-8 w-8 text-red-500" />
              <p className="text-sm text-red-500">{error}</p>
              <Button variant="outline" size="sm" onClick={loadInstances}>
                Tentar novamente
              </Button>
            </div>
          )}

          {!isLoading && !error && instances.length === 0 && (
            <div className="flex flex-col items-center py-8 gap-3 text-center text-muted-foreground">
              <WifiOff className="h-8 w-8 opacity-50" />
              <p className="text-sm">Nenhuma instância encontrada na Evolution API</p>
            </div>
          )}

          {!isLoading && !error && instances.length > 0 && (
            <div className="space-y-3">
              {instances.map((inst) => {
                const isSelected = selectedInstance === inst.name;
                const isConnected = inst.connectionStatus === "open";

                return (
                  <div
                    key={inst.id}
                    className={`rounded-lg border p-4 cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "border-primary bg-primary/5"
                        : "border-border/40 bg-slate-800/30 hover:border-border hover:bg-slate-800/50"
                    }`}
                    onClick={() => handleSelect(inst.name)}
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Avatar + Info */}
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className="relative flex-shrink-0">
                          {inst.profilePicUrl ? (
                            <img
                              src={inst.profilePicUrl}
                              alt={inst.profileName || inst.name}
                              className="w-12 h-12 rounded-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = "none";
                              }}
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                              <MessageCircle className="w-6 h-6 text-primary" />
                            </div>
                          )}
                          <div
                            className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 ${
                              isConnected ? "bg-green-500" : "bg-slate-500"
                            }`}
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold text-foreground">{inst.profileName || inst.name}</span>
                            {inst.profileName && (
                              <span className="text-xs text-muted-foreground font-mono">({inst.name})</span>
                            )}
                          </div>
                          {inst.phoneNumber && (
                            <p className="text-xs text-muted-foreground mt-0.5">+{inst.phoneNumber}</p>
                          )}
                          <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <MessageSquare className="h-3 w-3" />
                              {inst.messageCount.toLocaleString()} msgs
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {inst.contactCount.toLocaleString()} contatos
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status + Actions */}
                      <div className="flex flex-col items-end gap-2 flex-shrink-0">
                        <StatusBadge status={inst.connectionStatus} />

                        {isSelected && (
                          <div className="flex gap-2">
                            {isConnected ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-400 border-red-500/30 hover:bg-red-500/10"
                                onClick={(e) => { e.stopPropagation(); handleDisconnect(inst.name); }}
                              >
                                <WifiOff className="h-3 w-3 mr-1" />
                                Desconectar
                              </Button>
                            ) : (
                              <Button
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleConnect(inst.name); }}
                                disabled={connecting === inst.name}
                              >
                                {connecting === inst.name ? (
                                  <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                ) : (
                                  <Wifi className="h-3 w-3 mr-1" />
                                )}
                                Conectar
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* QR Code */}
                    {qrInstance === inst.name && qrCode && (
                      <div
                        className="mt-4 flex flex-col items-center gap-3 pt-4 border-t border-border/30"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <p className="text-sm text-muted-foreground">
                          Escaneie o QR Code com o WhatsApp
                        </p>
                        <div className="p-3 bg-white rounded-lg">
                          <img src={qrCode} alt="QR Code" className="w-48 h-48" />
                        </div>
                        <p className="text-xs text-muted-foreground">Expira em 2 minutos</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Summary */}
      {!isLoading && instances.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">{instances.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Total de instâncias</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-green-400">
                {instances.filter((i) => i.connectionStatus === "open").length}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Conectadas</p>
            </CardContent>
          </Card>
          <Card className="glass">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {instances.reduce((sum, i) => sum + i.contactCount, 0).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Contatos totais</p>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
