"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Send, X, Loader2, MessageCircle, Sparkles, Check, Radio } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useHybridRecorder } from "@/hooks/use-hybrid-recorder";

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface VoiceChatAssistantProps {
  conversation: any | null;
  contactName: string;
  contactId: string;
  onMessageSent: () => void;
}

export function VoiceChatAssistant({
  conversation,
  contactName,
  contactId,
  onMessageSent
}: VoiceChatAssistantProps) {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isConfirmationOpen, setIsConfirmationOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [finalMessage, setFinalMessage] = useState('');
  const [editedMessage, setEditedMessage] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const {
    isRecording,
    transcript,
    error,
    isProcessing: isTranscribing,
    method,
    startRecording,
    stopRecording,
    resetTranscript,
    switchToDeepgram
  } = useHybridRecorder({
    onTranscriptComplete: handleUserMessage
  });

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, transcript]);

  function openChat() {
    console.log('🎬 Opening chat assistant...');
    setIsChatOpen(true);
    setMessages([]);

    // Initial AI greeting with context
    const contextSummary = summarizeContext();
    const greeting = `Olá! Vejo que você está conversando com ${contactName}. ${contextSummary}\n\nComo posso ajudar você a responder?`;

    setMessages([{
      role: 'assistant',
      content: greeting,
      timestamp: Date.now()
    }]);
  }

  function closeChat() {
    setIsChatOpen(false);
    setMessages([]);
    resetTranscript();
  }

  function summarizeContext(): string {
    if (!conversation || !conversation.recentMessages || conversation.recentMessages.length === 0) {
      return "Ainda não há mensagens nesta conversa.";
    }

    const recentCount = Math.min(3, conversation.recentMessages.length);
    const lastMessage = conversation.recentMessages[0];
    const isFromThem = !lastMessage.fromMe;

    if (isFromThem) {
      return `A última mensagem foi deles: "${lastMessage.text.substring(0, 100)}..."`;
    } else {
      return `Você enviou a última mensagem. Há ${conversation.totalMessages} mensagens no total.`;
    }
  }

  async function handleUserMessage(userText: string) {
    if (!userText || userText.trim().length === 0) {
      console.log('❌ Empty message, ignoring');
      return;
    }

    console.log('📝 User message:', userText);

    // Add user message to chat
    const userMessage: Message = {
      role: 'user',
      content: userText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsProcessing(true);

    try {
      // Send to AI for processing
      const response = await fetch('/api/ai/voice-conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationHistory: messages,
          userMessage: userText,
          contextMessages: conversation?.recentMessages || [],
          contactName: contactName
        })
      });

      const data = await response.json();

      if (data.success) {
        console.log('🤖 AI Response:', data);

        // Add AI response to chat
        const aiMessage: Message = {
          role: 'assistant',
          content: data.response,
          timestamp: Date.now()
        };

        setMessages(prev => [...prev, aiMessage]);

        // If AI decided conversation is complete and has a final message
        if (data.isComplete && data.finalMessage) {
          console.log('✅ Conversation complete, showing final message');
          setFinalMessage(data.finalMessage);
          setEditedMessage(data.finalMessage);
          setIsChatOpen(false);
          setIsConfirmationOpen(true);
        }
      } else {
        // Error response
        const errorMessage: Message = {
          role: 'assistant',
          content: "Desculpe, ocorreu um erro. Pode repetir?",
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, errorMessage]);
      }
    } catch (error) {
      console.error('❌ Error processing message:', error);

      const errorMessage: Message = {
        role: 'assistant',
        content: "Desculpe, ocorreu um erro de conexão. Tente novamente.",
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsProcessing(false);
      resetTranscript();
    }
  }

  function handleGenerateFinalMessage() {
    setIsProcessing(true);

    // Ask AI to generate the final WhatsApp message based on the conversation
    fetch('/api/ai/voice-conversation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        conversationHistory: messages,
        userMessage: "[GENERATE_FINAL_MESSAGE]", // Special command
        contextMessages: conversation?.recentMessages || [],
        contactName: contactName
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.finalMessage) {
          setFinalMessage(data.finalMessage);
          setEditedMessage(data.finalMessage);
          setIsChatOpen(false);
          setIsConfirmationOpen(true);
        }
      })
      .catch(err => {
        console.error('Error generating final message:', err);
      })
      .finally(() => {
        setIsProcessing(false);
      });
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
        setMessages([]);
        setFinalMessage('');
        setEditedMessage('');
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
    setIsChatOpen(true); // Reopen chat to continue
  }

  return (
    <>
      {/* Trigger Button */}
      <Button
        onClick={openChat}
        size="lg"
        className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white"
      >
        <MessageCircle className="w-5 h-5 mr-2" />
        Conversar com IA
      </Button>

      {/* Chat Dialog - ChatGPT Style */}
      <Dialog open={isChatOpen} onOpenChange={closeChat}>
        <DialogContent className="sm:max-w-[700px] h-[600px] p-0 gap-0 flex flex-col">
          <DialogHeader className="p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <DialogTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                Assistente IA - {contactName}
              </div>
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                <Radio className="w-3 h-3 mr-1" />
                {method === 'deepgram' ? 'Deepgram' : 'Web Speech'}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4" ref={scrollRef}>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  <p className="text-xs mt-1 opacity-70">
                    {new Date(msg.timestamp).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}

            {/* Current transcript (while recording) */}
            {isRecording && transcript && (
              <div className="flex justify-end">
                <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-blue-600/50 text-white border-2 border-blue-600 border-dashed">
                  <p className="text-sm">{transcript}</p>
                  <p className="text-xs mt-1 opacity-70 animate-pulse">
                    🎤 Gravando... (solte para enviar)
                  </p>
                </div>
              </div>
            )}

            {/* Transcription processing indicator */}
            {isTranscribing && (
              <div className="flex justify-end">
                <div className="rounded-2xl px-4 py-3 bg-purple-600/20 border-2 border-purple-600 border-dashed">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                    <span className="text-sm text-purple-600">Transcrevendo áudio...</span>
                  </div>
                </div>
              </div>
            )}

            {/* AI processing indicator */}
            {isProcessing && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 bg-gray-100 dark:bg-gray-800">
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">IA pensando...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Area - Push to Talk */}
          <div className="border-t p-4 bg-gray-50 dark:bg-gray-900">
            {error && (
              <div className="mb-2 p-2 bg-red-100 text-red-700 rounded text-sm">
                {error}
              </div>
            )}

            <div className="flex items-center gap-3">
              {/* Push to Talk Button */}
              <Button
                onMouseDown={startRecording}
                onMouseUp={stopRecording}
                onTouchStart={startRecording}
                onTouchEnd={stopRecording}
                disabled={isProcessing || isTranscribing}
                size="lg"
                className={`flex-1 ${
                  isRecording
                    ? 'bg-red-600 hover:bg-red-700 animate-pulse'
                    : isTranscribing
                    ? 'bg-purple-600 hover:bg-purple-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isTranscribing ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Transcrevendo...
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 mr-2" />
                    {isRecording ? 'Gravando... (solte para enviar)' : 'Segurar para falar'}
                  </>
                )}
              </Button>

              {/* Generate Final Message Button */}
              <Button
                onClick={handleGenerateFinalMessage}
                disabled={isProcessing || messages.length < 2}
                size="lg"
                variant="outline"
                className="border-purple-600 text-purple-600 hover:bg-purple-50"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Gerar Mensagem
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-2">
              {isRecording
                ? 'Solte o botão quando terminar de falar'
                : 'Mantenha pressionado o botão azul para falar'}
            </p>
          </div>

          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20"
            onClick={closeChat}
          >
            <X className="h-4 w-4" />
          </Button>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal - Edit & Send */}
      <Dialog open={isConfirmationOpen} onOpenChange={setIsConfirmationOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Check className="w-5 h-5 text-green-600" />
              Confirmar Mensagem para {contactName}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Revise e edite a mensagem antes de enviar
              </label>
              <Textarea
                value={editedMessage}
                onChange={(e) => setEditedMessage(e.target.value)}
                rows={8}
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
                Voltar ao Chat
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
                    Enviar no WhatsApp
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
