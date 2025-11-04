"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Send, X, Loader2 } from "lucide-react";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";

interface VoiceAssistantPanelProps {
  conversation: any | null;
  contactName: string;
  contactId: string;
  onMessageSent: () => void;
}

export function VoiceAssistantPanel({
  conversation,
  contactName,
  contactId,
  onMessageSent
}: VoiceAssistantPanelProps) {
  const [stage, setStage] = useState<'idle' | 'analyzing' | 'listening' | 'processing' | 'suggesting'>('idle');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [userInstruction, setUserInstruction] = useState('');
  const [sending, setSending] = useState(false);

  const { isListening, isSpeaking, transcript, speak, startListening, stopListening, stopSpeaking } = useVoiceAssistant({
    onTranscript: handleTranscript,
    onSpeakingChange: (speaking) => {
      if (!speaking && stage === 'analyzing') {
        // IA terminou de falar o contexto, pode ouvir agora
        setStage('idle');
      }
    }
  });

  function handleTranscript(text: string) {
    console.log('Transcription:', text);
    setUserInstruction(text);
    setStage('processing');

    // Get AI suggestions based on user instruction
    generateSuggestions(text);
  }

  async function analyzeConversation() {
    if (!conversation || !conversation.recentMessages) return;

    setStage('analyzing');
    stopSpeaking();

    try {
      const response = await fetch('/api/ai/analyze-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: conversation.recentMessages,
          contactName: contactName
        })
      });

      const data = await response.json();

      if (data.success) {
        speak(data.summary);
      } else {
        speak("Desculpe, não consegui analisar a conversa.");
        setStage('idle');
      }
    } catch (error) {
      console.error('Analysis error:', error);
      speak("Ocorreu um erro ao analisar a conversa.");
      setStage('idle');
    }
  }

  async function generateSuggestions(instruction: string) {
    if (!conversation) return;

    setStage('suggesting');

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

      if (data.success) {
        setSuggestions(data.suggestions);
        speak("Preparei duas sugestões de resposta. Escolha uma ou peça para refazer.");
      } else {
        speak("Não consegui gerar sugestões.");
        setStage('idle');
      }
    } catch (error) {
      console.error('Suggestion error:', error);
      speak("Erro ao gerar sugestões.");
      setStage('idle');
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
        setSuggestions([]);
        setUserInstruction('');
        setStage('idle');
        onMessageSent();
      } else {
        speak("Erro ao enviar mensagem. Tente novamente.");
      }
    } catch (error) {
      console.error('Send error:', error);
      speak("Erro ao enviar mensagem.");
    } finally {
      setSending(false);
    }
  }

  function handleMicClick() {
    if (isListening) {
      stopListening();
    } else {
      if (isSpeaking) {
        stopSpeaking();
      }
      setStage('listening');
      startListening();
    }
  }

  function handleCancel() {
    setSuggestions([]);
    setUserInstruction('');
    setStage('idle');
    stopSpeaking();
    stopListening();
  }

  return (
    <div className="space-y-4">
      {/* Main Control Button */}
      {conversation && stage === 'idle' && (
        <Button
          onClick={analyzeConversation}
          className="w-full"
          variant="default"
        >
          Analisar Conversa com IA
        </Button>
      )}

      {/* Voice Input */}
      {(stage === 'idle' || stage === 'listening') && !suggestions.length && (
        <div className="flex items-center gap-2">
          <Button
            onClick={handleMicClick}
            size="lg"
            className={`flex-1 ${isListening ? 'bg-red-500 hover:bg-red-600' : ''}`}
          >
            <Mic className="w-5 h-5 mr-2" />
            {isListening ? 'Ouvindo...' : 'Falar Instrução'}
          </Button>
        </div>
      )}

      {/* Status Messages */}
      {stage === 'analyzing' && (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Analisando conversa...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {stage === 'processing' && (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Gerando sugestões...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User Instruction Display */}
      {userInstruction && (
        <Card className="glass">
          <CardContent className="p-4">
            <p className="text-sm font-semibold mb-1">Sua instrução:</p>
            <p className="text-sm text-muted-foreground">"{userInstruction}"</p>
          </CardContent>
        </Card>
      )}

      {/* Suggestions */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold">Sugestões de Resposta:</h4>
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {suggestions.map((suggestion, index) => (
            <Card key={index} className="glass cursor-pointer hover:bg-primary/5">
              <CardContent className="p-4">
                <p className="text-sm mb-3">{suggestion}</p>
                <Button
                  onClick={() => sendMessage(suggestion)}
                  disabled={sending}
                  size="sm"
                  className="w-full"
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar esta resposta
                </Button>
              </CardContent>
            </Card>
          ))}

          <Button
            variant="outline"
            onClick={() => {
              setSuggestions([]);
              setStage('listening');
              startListening();
            }}
            className="w-full"
          >
            Refazer instrução
          </Button>
        </div>
      )}
    </div>
  );
}
