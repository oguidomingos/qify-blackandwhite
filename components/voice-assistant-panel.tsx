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
      console.log('🔊 Speaking change:', speaking, 'Current stage:', stage);
      if (!speaking) {
        // IA terminou de falar
        if (stage === 'analyzing') {
          // Após análise, voltar para idle para permitir nova instrução
          console.log('✅ Analysis done, ready for instruction');
          setStage('idle');
        } else if (stage === 'suggesting') {
          // Após falar as sugestões, manter no suggesting para escolher
          console.log('✅ Suggestions ready');
        }
      }
    }
  });

  function handleTranscript(text: string) {
    console.log('📝 Transcription:', text);
    if (!text || text.trim().length === 0) {
      console.log('❌ Empty transcription, ignoring');
      setStage('idle');
      return;
    }

    setUserInstruction(text);
    setStage('processing');
    stopListening();

    // Get AI suggestions based on user instruction
    generateSuggestions(text);
  }

  async function analyzeConversation() {
    if (!conversation || !conversation.recentMessages) return;

    console.log('🔍 Starting conversation analysis...');
    setStage('analyzing');
    stopSpeaking();
    stopListening();

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
        console.log('✅ Analysis complete, speaking summary');
        speak(data.summary);
        // Note: stage will be reset to 'idle' by onSpeakingChange callback when speech ends
      } else {
        speak("Desculpe, não consegui analisar a conversa. Tente novamente.");
        setTimeout(() => setStage('idle'), 3000);
      }
    } catch (error) {
      console.error('❌ Analysis error:', error);
      speak("Ocorreu um erro ao analisar a conversa. Tente novamente.");
      setTimeout(() => setStage('idle'), 3000);
    }
  }

  async function generateSuggestions(instruction: string) {
    if (!conversation) return;

    setStage('processing');

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
        setStage('suggesting');
        speak("Preparei duas sugestões de resposta. Escolha uma para enviar.");
      } else {
        speak("Não consegui gerar sugestões. Por favor, tente novamente.");
        setStage('idle');
        setSuggestions([]);
        setUserInstruction('');
      }
    } catch (error) {
      console.error('Suggestion error:', error);
      speak("Erro ao gerar sugestões. Por favor, tente novamente.");
      setStage('idle');
      setSuggestions([]);
      setUserInstruction('');
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
      {/* Status Display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isSpeaking && (
            <div className="flex items-center gap-2 text-sm text-primary">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
              <span>IA falando...</span>
            </div>
          )}
          {isListening && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              <span>Ouvindo...</span>
            </div>
          )}
        </div>

        {/* Reset Button - Always visible */}
        {stage !== 'idle' && (
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <X className="h-4 w-4 mr-1" />
            Cancelar
          </Button>
        )}
      </div>

      {/* Main Control Button */}
      {conversation && stage === 'idle' && !suggestions.length && (
        <Button
          onClick={analyzeConversation}
          className="w-full"
          variant="default"
          disabled={isSpeaking}
        >
          Analisar Conversa com IA
        </Button>
      )}

      {/* Voice Input - Show after analysis or when idle */}
      {stage === 'idle' && !suggestions.length && (
        <div className="flex items-center gap-2">
          <Button
            onClick={handleMicClick}
            size="lg"
            className={`flex-1 ${isListening ? 'bg-red-500 hover:bg-red-600' : ''}`}
            disabled={isSpeaking}
          >
            <Mic className="w-5 h-5 mr-2" />
            {isListening ? 'Pare de falar para processar' : 'Ou fale uma instrução diretamente'}
          </Button>
        </div>
      )}

      {/* Status Messages */}
      {stage === 'analyzing' && (
        <Card className="glass">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">
                  {isSpeaking ? 'IA falando o contexto...' : 'Analisando conversa...'}
                </span>
              </div>
              {isSpeaking && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    stopSpeaking();
                    setStage('idle');
                  }}
                >
                  Pular
                </Button>
              )}
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
