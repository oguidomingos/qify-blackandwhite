"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Send, X, Loader2, Edit2, Check } from "lucide-react";
import { useVoiceAssistant } from "@/hooks/use-voice-assistant";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [editableInstruction, setEditableInstruction] = useState('');

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
    setEditableInstruction(text);
    stopListening();
    setStage('idle'); // Back to idle while user confirms

    // Show confirmation dialog
    setShowConfirmDialog(true);
  }

  function handleConfirmInstruction() {
    setShowConfirmDialog(false);
    setStage('processing');

    // Get AI suggestions based on user instruction
    generateSuggestions(editableInstruction);
  }

  function handleCancelInstruction() {
    setShowConfirmDialog(false);
    setUserInstruction('');
    setEditableInstruction('');
    setStage('idle');
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

      console.log('📡 API Response status:', response.status);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 API Response data:', data);

      if (data.success && data.summary) {
        console.log('✅ Analysis complete, speaking summary');
        speak(data.summary);
        // Note: stage will be reset to 'idle' by onSpeakingChange callback when speech ends
      } else {
        const errorMsg = data.error || 'Erro desconhecido';
        console.error('❌ API error:', errorMsg);
        speak(`Desculpe, ocorreu um erro: ${errorMsg}`);
        setTimeout(() => setStage('idle'), 3000);
      }
    } catch (error) {
      console.error('❌ Analysis error:', error);
      speak("Ocorreu um erro ao conectar com a IA. Verifique se a API key está configurada.");
      setTimeout(() => setStage('idle'), 3000);
    }
  }

  async function generateSuggestions(instruction: string) {
    if (!conversation) return;

    console.log('💡 Generating suggestions for instruction:', instruction);
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

      console.log('📡 Suggestions API status:', response.status);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}`);
      }

      const data = await response.json();
      console.log('📦 Suggestions data:', data);

      if (data.success && data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
        setStage('suggesting');
        speak("Preparei duas sugestões de resposta. Escolha uma para enviar.");
      } else {
        const errorMsg = data.error || 'Não consegui gerar sugestões';
        console.error('❌ Suggestions error:', errorMsg);
        speak(`${errorMsg}. Tente novamente.`);
        setStage('idle');
        setSuggestions([]);
        setUserInstruction('');
      }
    } catch (error) {
      console.error('❌ Suggestion error:', error);
      speak("Erro ao gerar sugestões. Verifique se a API key está configurada.");
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
        <>
          <div className="flex items-center gap-2">
            <Button
              onClick={handleMicClick}
              size="lg"
              className={`flex-1 ${isListening ? 'bg-red-500 hover:bg-red-600 animate-pulse' : ''}`}
              disabled={isSpeaking}
            >
              <Mic className="w-5 h-5 mr-2" />
              {isListening ? 'Clique para parar' : 'Falar Instrução'}
            </Button>
          </div>

          {/* Real-time Transcription Display */}
          {isListening && (
            <Card className="glass border-red-500/50 bg-red-500/5">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1 h-8 bg-red-500 animate-pulse" style={{ animationDelay: '0ms' }}></div>
                      <div className="w-1 h-6 bg-red-500 animate-pulse" style={{ animationDelay: '150ms' }}></div>
                      <div className="w-1 h-10 bg-red-500 animate-pulse" style={{ animationDelay: '300ms' }}></div>
                      <div className="w-1 h-5 bg-red-500 animate-pulse" style={{ animationDelay: '450ms' }}></div>
                      <div className="w-1 h-9 bg-red-500 animate-pulse" style={{ animationDelay: '600ms' }}></div>
                    </div>
                    <span className="text-sm font-semibold text-red-500">Gravando...</span>
                  </div>
                  <div className="min-h-[60px] p-3 bg-background/50 rounded-md">
                    {transcript ? (
                      <p className="text-sm text-foreground">{transcript}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">Fale agora...</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </>
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

      {/* Confirmation/Edit Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Confirmar Instrução</DialogTitle>
            <DialogDescription>
              Revise ou edite sua instrução antes de gerar as sugestões de resposta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Sua instrução:</label>
              <Textarea
                value={editableInstruction}
                onChange={(e) => setEditableInstruction(e.target.value)}
                placeholder="Digite sua instrução aqui..."
                className="min-h-[100px] resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Exemplo: "Pergunte quando ele quer receber o orçamento"
              </p>
            </div>
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleCancelInstruction}
            >
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmInstruction}
              disabled={!editableInstruction.trim()}
            >
              <Check className="h-4 w-4 mr-2" />
              Gerar Sugestões
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
