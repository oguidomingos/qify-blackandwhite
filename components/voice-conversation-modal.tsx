"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, Send, X, Loader2, MessageCircle, Volume2, User } from "lucide-react";
import { useVoiceConversation } from "@/hooks/use-voice-conversation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface VoiceConversationModalProps {
  conversation: any | null;
  contactName: string;
  contactId: string;
  onMessageSent: () => void;
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function VoiceConversationModal({
  conversation,
  contactName,
  contactId,
  onMessageSent
}: VoiceConversationModalProps) {
  const [isConversationOpen, setIsConversationOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalMessage, setFinalMessage] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    isListening,
    isSpeaking,
    transcript,
    conversationHistory,
    currentTurn,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    resetConversation
  } = useVoiceConversation({
    onSilenceDetected: handleSilenceDetected,
    silenceThreshold: 10000, // 10 seconds - long timeout, user will click to stop
    volumeThreshold: 30
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversationHistory, transcript]);

  function openConversation() {
    console.log('🎬 Opening conversation modal...');
    setIsConversationOpen(true);
    resetConversation();

    // First, let the AI speak, then start listening
    setTimeout(() => {
      speak("Olá! Como posso ajudar você a responder " + contactName + "?", () => {
        // After AI finishes speaking, start listening
        console.log('✅ AI finished greeting, starting to listen...');
        setTimeout(() => startListening(), 500);
      });
    }, 500);
  }

  function closeConversation() {
    setIsConversationOpen(false);
    stopListening();
    stopSpeaking();
    resetConversation();
  }

  function handleStopListening() {
    console.log('🛑 User clicked to stop listening');
    if (!transcript || transcript.trim().length === 0) {
      console.log('❌ No transcript yet, not processing');

      // If there's an error, allow user to stop and close
      if (error) {
        closeConversation();
      }
      return;
    }

    handleSilenceDetected();
  }

  async function handleSilenceDetected() {
    console.log('🤫 Processing user message...');
    setIsProcessing(true);
    stopListening();

    const userMessage = transcript;
    if (!userMessage || userMessage.trim().length === 0) {
      console.log('❌ Empty message, resuming listening');
      setIsProcessing(false);
      startListening();
      return;
    }

    try {
      // Send to AI for processing
      const response = await fetch('/api/ai/voice-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationHistory: conversationHistory,
          userMessage: userMessage,
          contextMessages: conversation?.recentMessages || [],
          contactName: contactName
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('🤖 AI Response:', data);

        // Speak the AI response
        speak(data.response, () => {
          // After AI finishes speaking
          setIsProcessing(false);

          if (data.isComplete && data.finalMessage) {
            // Conversation is complete, show confirmation modal
            console.log('✅ Conversation complete, showing confirmation');
            setFinalMessage(data.finalMessage);
            setEditedMessage(data.finalMessage);
            setIsConversationOpen(false);
            setIsConfirmationOpen(true);
          } else {
            // Continue conversation - start listening again
            console.log('🔄 Continuing conversation, will start listening in 1 second...');
            setTimeout(() => {
              console.log('🔄 Now calling startListening...');
              startListening();
            }, 1000); // Increased delay to 1 second
          }
        });
      } else {
        // Error, retry
        speak("Desculpe, não entendi. Pode repetir?", () => {
          setIsProcessing(false);
          console.log('🔄 Error case, will start listening in 1 second...');
          setTimeout(() => startListening(), 1000);
        });
      }
    } catch (error) {
      console.error('❌ Error processing conversation:', error);
      speak("Desculpe, ocorreu um erro. Vamos tentar novamente?", () => {
        setIsProcessing(false);
        startListening();
      });
    }
  }

  async function sendMessage() {
    setSending(true);

    try {
      const response = await fetch('/api/evolution/send-message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contactId: contactId,
          message: editedMessage
        })
      });

      const data = await response.json();

      if (data.success) {
        setIsConfirmationOpen(false);
        resetConversation();
        onMessageSent();
      } else {
        alert("Erro ao enviar mensagem. Tente novamente.");
      }
    } catch (error) {
      console.error('Send error:', error);
      alert("Erro ao enviar mensagem. Tente novamente.");
    } finally {
      setSending(false);
    }
  }

  function cancelMessage() {
    setIsConfirmationOpen(false);
    setFinalMessage('');
    setEditedMessage('');
    // Optionally reopen conversation
    // openConversation();
  }

  return (
    <>
      {/* Trigger Button */}
      <Button
        onClick={openConversation}
        size="lg"
        className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white"
      >
        <MessageCircle className="w-5 h-5 mr-2" />
        Conversar com IA
      </Button>

      {/* Main Conversation Modal */}
      <Dialog open={isConversationOpen} onOpenChange={closeConversation}>
        <DialogContent className="sm:max-w-[700px] h-[600px] p-0 gap-0 bg-gradient-to-b from-background to-background/95">
          <DialogHeader className="p-6 pb-4 border-b">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <MessageCircle className="w-6 h-6 text-blue-600" />
              Conversando sobre mensagem para {contactName}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Conversation History */}
            <div className="flex-1 p-6 overflow-y-auto" ref={scrollRef}>
              <div className="space-y-4">
                {conversationHistory.map((turn, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-3 ${
                      turn.role === 'user' ? 'flex-row-reverse' : 'flex-row'
                    }`}
                  >
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                      turn.role === 'user'
                        ? 'bg-blue-500/20 text-blue-600'
                        : 'bg-green-500/20 text-green-600'
                    }`}>
                      {turn.role === 'user' ? (
                        <User className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                    </div>
                    <div className={`flex-1 ${
                      turn.role === 'user' ? 'text-right' : 'text-left'
                    }`}>
                      <div className={`inline-block p-4 rounded-2xl ${
                        turn.role === 'user'
                          ? 'bg-blue-500/10 border border-blue-500/20'
                          : 'bg-green-500/10 border border-green-500/20'
                      }`}>
                        <p className="text-sm leading-relaxed">{turn.content}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 px-2">
                        {new Date(turn.timestamp).toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}

                {/* Current transcript (while user is speaking) */}
                {isListening && currentTurn === 'user' && (
                  <div className="flex items-start gap-3 flex-row-reverse">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center bg-blue-500/20 text-blue-600 animate-pulse">
                      <User className="w-5 h-5" />
                    </div>
                    <div className="flex-1 text-right">
                      <div className="inline-block p-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 border-dashed">
                        <p className="text-sm leading-relaxed">
                          {transcript || 'Aguardando sua fala...'}
                        </p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 px-2 animate-pulse">
                        🎤 Ouvindo {transcript ? '(detectando silêncio...)' : ''}
                      </p>
                    </div>
                  </div>
                )}

                {/* Processing indicator */}
                {isProcessing && (
                  <div className="flex items-center justify-center gap-2 text-muted-foreground py-4">
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <span className="text-sm">IA processando...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Voice Visualization */}
            <div className="border-t bg-background/50 p-6">
              <div className="flex items-center justify-center gap-6">
                {/* Visual indicator - CLICKABLE */}
                <button
                  onClick={handleStopListening}
                  disabled={!isListening || isProcessing || isSpeaking}
                  className="relative group disabled:cursor-not-allowed cursor-pointer"
                >
                  {(isListening || isSpeaking) && (
                    <>
                      <div className="absolute inset-0 rounded-full bg-blue-500/10 animate-ping" style={{ animationDuration: '2s' }}></div>
                      <div className="absolute inset-[-20px] rounded-full bg-blue-500/5 animate-ping" style={{ animationDuration: '3s' }}></div>
                    </>
                  )}

                  <div className={`relative w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isListening
                      ? 'bg-blue-500/20 border-4 border-blue-500 group-hover:border-red-500 group-hover:bg-red-500/20'
                      : isSpeaking
                      ? 'bg-green-500/20 border-4 border-green-500'
                      : 'bg-muted border-4 border-muted-foreground/20'
                  }`}>
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-all ${
                      isListening
                        ? 'bg-blue-500 animate-pulse group-hover:bg-red-500'
                        : isSpeaking
                        ? 'bg-green-500 animate-pulse'
                        : 'bg-muted-foreground/20'
                    }`}>
                      {isListening ? (
                        <Mic className="w-8 h-8 text-white" />
                      ) : isSpeaking ? (
                        <Volume2 className="w-8 h-8 text-white" />
                      ) : (
                        <Mic className="w-8 h-8 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                </button>

                {/* Status text */}
                <div className="text-center">
                  <p className="font-semibold text-lg">
                    {isListening && 'Estou ouvindo...'}
                    {isSpeaking && 'IA falando...'}
                    {!isListening && !isSpeaking && !isProcessing && 'Aguardando...'}
                    {isProcessing && 'Processando...'}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {isListening && '👆 Clique no microfone quando terminar de falar'}
                    {isSpeaking && 'Aguarde a IA terminar de falar'}
                    {!isListening && !isSpeaking && !isProcessing && 'Clique no X para fechar'}
                    {isProcessing && 'Analisando sua mensagem...'}
                  </p>
                  {isListening && transcript && (
                    <p className="text-xs text-blue-600 mt-2 font-medium animate-pulse">
                      ✅ Captando áudio - Clique para enviar
                    </p>
                  )}
                </div>
              </div>

              {error && (
                <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                  <p className="text-sm text-red-600 mb-2">{error}</p>
                  <Button
                    onClick={() => {
                      console.log('🔄 User clicked retry button');
                      startListening();
                    }}
                    size="sm"
                    variant="outline"
                    className="w-full border-red-500/50 hover:bg-red-500/10"
                  >
                    🔄 Tentar Novamente
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
            onClick={closeConversation}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="w-5 h-5 text-green-600" />
              Confirmar Mensagem
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Mensagem para {contactName}
              </label>
              <Textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={6}
                className="resize-none"
                placeholder="Edite a mensagem se necessário..."
              />
            </div>

            <div className="flex gap-3">
              <Button
                onClick={cancelMessage}
                variant="outline"
                className="flex-1"
                disabled={sending}
              >
                <X className="w-4 h-4 mr-2" />
                Cancelar
              </Button>
              <Button
                onClick={sendMessage}
                className="flex-1 bg-green-600 hover:bg-green-700"
                disabled={sending || !editedMessage.trim()}
              >
                {sending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Mensagem
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
