"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Send, X, Loader2, MessageSquare } from "lucide-react";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VoiceAssistantPanelProps {
  conversation: any | null;
  contactName: string;
  contactId: string;
  onMessageSent: () => void;
}

type ConversationStep =
  | 'idle'
  | 'recording'
  | 'confirming'
  | 'generating'
  | 'suggesting';

export function VoiceAssistantPanel({
  conversation,
  contactName,
  contactId,
  onMessageSent
}: VoiceAssistantPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [step, setStep] = useState<ConversationStep>('idle');
  const [userInstruction, setUserInstruction] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [sending, setSending] = useState(false);
  const [aiMessage, setAiMessage] = useState('');

  const { isListening, isSpeaking, transcript, speak, startListening, stopListening, stopSpeaking } = useVoiceAssistant({
    onTranscript: handleTranscript,
    onSpeakingChange: (speaking) => {
      console.log('🔊 Speaking change:', speaking, 'Current step:', step);
      if (!speaking && step === 'confirming') {
        // AI finished confirming, ready for user response
        console.log('✅ AI finished confirming');
      }
    }
  });

  function openVoiceModal() {
    setIsModalOpen(true);
    setStep('recording');
    setTimeout(() => startListening(), 300); // Small delay for modal animation
  }

  function closeVoiceModal() {
    setIsModalOpen(false);
    setStep('idle');
    setUserInstruction('');
    setAiMessage('');
    setSuggestions([]);
    stopListening();
    stopSpeaking();
  }

  function handleTranscript(text: string) {
    console.log('📝 Final transcript:', text);
    if (!text || text.trim().length === 0) {
      console.log('❌ Empty transcription');
      return;
    }

    setUserInstruction(text);
    stopListening();
    setStep('confirming');

    // AI confirms what it heard
    const confirmMessage = `Entendi. Você quer que eu ${text}. É isso mesmo?`;
    setAiMessage(confirmMessage);
    speak(confirmMessage);
  }

  function handleConfirmYes() {
    setStep('generating');
    setAiMessage('Perfeito! Gerando sugestões de resposta...');
    speak('Perfeito! Gerando sugestões.');
    generateSuggestions(userInstruction);
  }

  function handleConfirmNo() {
    setStep('recording');
    setUserInstruction('');
    setAiMessage('');
    speak('Ok, fale novamente sua instrução.');
    setTimeout(() => startListening(), 2000);
  }

  async function generateSuggestions(instruction: string) {
    try {
      const response = await fetch('/api/ai/suggest-response', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversation.recentMessages,
          contactName: contactName,
          userInstruction: instruction
        })
      });

      const data = await response.json();

      if (data.success && data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setStep('suggesting');
        setAiMessage('Aqui estão minhas sugestões. Escolha uma para enviar:');
      } else {
        setAiMessage('Desculpe, não consegui gerar sugestões. Vamos tentar novamente?');
        speak('Desculpe, não consegui gerar sugestões.');
        setTimeout(() => {
          setStep('recording');
          startListening();
        }, 3000);
      }
    } catch (error) {
      console.error('❌ Error generating suggestions:', error);
      setAiMessage('Erro ao gerar sugestões. Tente novamente.');
      speak('Erro ao gerar sugestões.');
    }
  }

  async function sendMessage(message: string) {
    setSending(true);

    try {
      const response = await fetch('/api/evolution/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contactId,
          message: message
        })
      });

      const data = await response.json();

      if (data.success) {
        speak("Mensagem enviada com sucesso!");
        setTimeout(() => {
          closeVoiceModal();
          onMessageSent();
        }, 2000);
      } else {
        speak("Erro ao enviar mensagem.");
      }
    } catch (error) {
      console.error('Send error:', error);
      speak("Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {/* Trigger Button */}
      <Button
        onClick={openVoiceModal}
        size="lg"
        className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
      >
        <Mic className="w-5 h-5 mr-2" />
        Conversar com Assistente de Voz
      </Button>

      {/* Voice Modal */}
      <Dialog open={isModalOpen} onOpenChange={closeVoiceModal}>
        <DialogContent className="sm:max-w-[600px] min-h-[500px] p-0 gap-0 bg-gradient-to-b from-background to-background/95">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="text-center text-2xl">
              Assistente de Voz
            </DialogTitle>
          </DialogHeader>

          <div className="flex flex-col items-center justify-center flex-1 p-8 space-y-8">
            {/* Voice Visualization Circle */}
            <div className="relative">
              {/* Outer rings */}
              {(isListening || isSpeaking) && (
                <>
                  <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping" style={{ animationDuration: '2s' }}></div>
                  <div className="absolute inset-[-20px] rounded-full bg-primary/5 animate-ping" style={{ animationDuration: '3s' }}></div>
                </>
              )}

              {/* Main circle */}
              <div className={`relative w-40 h-40 rounded-full flex items-center justify-center transition-all duration-300 ${
                isListening
                  ? 'bg-red-500/20 border-4 border-red-500'
                  : isSpeaking
                  ? 'bg-blue-500/20 border-4 border-blue-500'
                  : 'bg-primary/20 border-4 border-primary/50'
              }`}>
                {/* Inner animated circle */}
                <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
                  isListening
                    ? 'bg-red-500 animate-pulse'
                    : isSpeaking
                    ? 'bg-blue-500 animate-pulse'
                    : 'bg-primary/50'
                }`}>
                  <Mic className="w-16 h-16 text-white" />
                </div>
              </div>
            </div>

            {/* Status Text */}
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">
                {step === 'recording' && 'Estou ouvindo...'}
                {step === 'confirming' && 'Confirmando instrução'}
                {step === 'generating' && 'Gerando sugestões...'}
                {step === 'suggesting' && 'Escolha uma sugestão'}
              </h3>

              {/* Real-time transcript or AI message */}
              <div className="min-h-[80px] max-w-md mx-auto">
                {step === 'recording' && (
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Fale sua instrução agora</p>
                    {transcript && (
                      <div className="p-4 bg-muted rounded-lg">
                        <p className="text-base">{transcript}</p>
                      </div>
                    )}
                  </div>
                )}

                {(step === 'confirming' || step === 'generating') && aiMessage && (
                  <div className="p-4 bg-primary/10 rounded-lg border border-primary/20">
                    <p className="text-base">{aiMessage}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="w-full max-w-md space-y-3">
              {step === 'recording' && isListening && (
                <Button
                  onClick={() => stopListening()}
                  size="lg"
                  variant="destructive"
                  className="w-full"
                >
                  Parar Gravação
                </Button>
              )}

              {step === 'confirming' && !isSpeaking && (
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={handleConfirmNo}
                    size="lg"
                    variant="outline"
                  >
                    Não, gravar de novo
                  </Button>
                  <Button
                    onClick={handleConfirmYes}
                    size="lg"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    Sim, continuar
                  </Button>
                </div>
              )}

              {step === 'generating' && (
                <div className="flex items-center justify-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              )}

              {step === 'suggesting' && suggestions.length > 0 && (
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {suggestions.map((suggestion, index) => (
                    <Card key={index} className="border-2 border-primary/20 hover:border-primary/50 transition-all cursor-pointer">
                      <CardContent className="p-4">
                        <p className="text-sm mb-3">{suggestion}</p>
                        <Button
                          onClick={() => sendMessage(suggestion)}
                          disabled={sending}
                          size="sm"
                          className="w-full"
                        >
                          {sending ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Enviar esta mensagem
                            </>
                          )}
                        </Button>
                      </CardContent>
                    </Card>
                  ))}

                  <Button
                    onClick={() => {
                      setStep('recording');
                      setSuggestions([]);
                      setUserInstruction('');
                      speak('Grave sua instrução novamente.');
                      setTimeout(() => startListening(), 2000);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <Mic className="w-4 h-4 mr-2" />
                    Gravar nova instrução
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={closeVoiceModal}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
