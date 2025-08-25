"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle, AlertCircle, QrCode } from "lucide-react";

export default function SetupInstancePage() {
  const [instanceName, setInstanceName] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [qrCode, setQrCode] = useState("");
  const [status, setStatus] = useState<"idle" | "creating" | "connecting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const createInstance = async () => {
    if (!instanceName || !phoneNumber) {
      setMessage("Preencha nome da instância e telefone");
      return;
    }

    setStatus("creating");
    setMessage("Criando instância...");

    try {
      // Criar instância na Evolution API
      const response = await fetch(`/api/evolution/instance/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName,
          phoneNumber,
        }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Erro ao criar instância");
      }

      setStatus("connecting");
      setMessage("Instância criada! Gerando QR Code...");
      
      // Gerar QR Code
      await generateQRCode();

    } catch (error) {
      console.error("Erro:", error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Erro desconhecido");
    }
  };

  const generateQRCode = async () => {
    try {
      const response = await fetch(`/api/evolution/instance/qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instanceName }),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || "Erro ao gerar QR Code");
      }

      if (result.qrCode) {
        setQrCode(result.qrCode);
        setStatus("success");
        setMessage("QR Code gerado! Escaneie com seu WhatsApp para conectar.");
      }

    } catch (error) {
      console.error("Erro ao gerar QR:", error);
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "Erro ao gerar QR Code");
    }
  };

  const testInstance = async () => {
    if (!instanceName) return;

    try {
      const response = await fetch(`/api/debug/send-test-message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          instanceName,
          targetNumber: phoneNumber,
          message: `Teste da instância ${instanceName} - ${new Date().toLocaleString()}`,
        }),
      });

      const result = await response.json();
      
      if (response.ok) {
        setMessage("✅ Mensagem de teste enviada com sucesso!");
      } else {
        setMessage(`❌ Erro no teste: ${result.message}`);
      }

    } catch (error) {
      setMessage(`❌ Erro no teste: ${error instanceof Error ? error.message : "Erro desconhecido"}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-md mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-center">🔧 Setup de Instância Evolution</CardTitle>
            <p className="text-sm text-gray-600 text-center">
              Configure uma nova instância WhatsApp para testes
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nome da Instância</label>
              <Input
                value={instanceName}
                onChange={(e) => setInstanceName(e.target.value)}
                placeholder="Ex: qify-test-123"
                disabled={status === "creating" || status === "connecting"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Número de Telefone</label>
              <Input
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Ex: 5561999999999"
                disabled={status === "creating" || status === "connecting"}
              />
            </div>

            <Button 
              onClick={createInstance}
              disabled={status === "creating" || status === "connecting"}
              className="w-full"
            >
              {status === "creating" || status === "connecting" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {status === "creating" ? "Criando..." : "Conectando..."}
                </>
              ) : (
                <>
                  <QrCode className="w-4 h-4 mr-2" />
                  Criar Instância & Gerar QR
                </>
              )}
            </Button>

            {message && (
              <div className={`p-3 rounded-md text-sm ${
                status === "error" 
                  ? "bg-red-50 text-red-700 border border-red-200" 
                  : status === "success"
                  ? "bg-green-50 text-green-700 border border-green-200"
                  : "bg-blue-50 text-blue-700 border border-blue-200"
              }`}>
                <div className="flex items-start space-x-2">
                  {status === "error" ? (
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  ) : status === "success" ? (
                    <CheckCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  ) : (
                    <Loader2 className="w-4 h-4 mt-0.5 flex-shrink-0 animate-spin" />
                  )}
                  <span>{message}</span>
                </div>
              </div>
            )}

            {qrCode && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border">
                  <div className="text-center">
                    <img 
                      src={qrCode} 
                      alt="QR Code WhatsApp" 
                      className="mx-auto max-w-full"
                      style={{ maxHeight: "300px" }}
                    />
                  </div>
                </div>
                
                <Button 
                  onClick={testInstance}
                  variant="outline"
                  className="w-full"
                >
                  🧪 Testar Envio de Mensagem
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="text-sm text-gray-600 space-y-2">
              <p><strong>Instruções:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Preencha o nome da instância (único)</li>
                <li>Coloque seu número de WhatsApp</li>
                <li>Clique em "Criar Instância & Gerar QR"</li>
                <li>Escaneie o QR Code com seu WhatsApp</li>
                <li>Teste o envio de mensagem</li>
              </ol>
              
              <p className="pt-2"><strong>Formato do telefone:</strong> 5561999999999 (código do país + DDD + número)</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}