"use client"

import { useEffect, useRef, useState } from "react"
import { Mic, Volume2, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Message {
  role: "user" | "assistant"
  content: string
}

interface VoiceConversationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConversationComplete: (finalMessage: string) => void
}

export function VoiceConversationModal({
  open,
  onOpenChange,
  onConversationComplete,
}: VoiceConversationModalProps) {
  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [currentMessage, setCurrentMessage] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null)
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const conversationContextRef = useRef<string>("")

  // Inicializar Web Speech API
  useEffect(() => {
    if (typeof window !== "undefined" && "webkitSpeechRecognition" in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      const recognition = new SpeechRecognition()

      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = "pt-BR"

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = ""
        let finalTranscript = ""

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            finalTranscript += transcript + " "
          } else {
            interimTranscript += transcript
          }
        }

        if (finalTranscript) {
          setTranscript((prev) => prev + finalTranscript)
          setCurrentMessage((prev) => prev + finalTranscript)

          // Reset timer de silêncio
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current)
          }

          // Detectar pausa de 2 segundos
          silenceTimerRef.current = setTimeout(() => {
            if (currentMessage.trim() || finalTranscript.trim()) {
              handleUserMessageComplete(currentMessage + finalTranscript)
            }
          }, 2000)
        } else if (interimTranscript) {
          setTranscript((prev) => {
            const lastFinalIndex = prev.lastIndexOf(" ")
            return prev.substring(0, lastFinalIndex + 1) + interimTranscript
          })
        }
      }

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error)
        if (event.error === "no-speech") {
          // Continuar escutando
          recognition.start()
        }
      }

      recognition.onend = () => {
        if (isListening && open) {
          // Reiniciar automaticamente se ainda estiver aberto
          recognition.start()
        } else {
          setIsListening(false)
        }
      }

      recognitionRef.current = recognition
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop()
      }
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current)
      }
    }
  }, [])

  // Iniciar reconhecimento quando o modal abrir
  useEffect(() => {
    if (open && recognitionRef.current) {
      // Resetar estado
      setMessages([])
      setTranscript("")
      setCurrentMessage("")
      conversationContextRef.current = ""

      // Iniciar gravação
      try {
        recognitionRef.current.start()
      } catch (error) {
        console.error("Error starting recognition:", error)
      }

      // Saudação inicial da IA
      speakMessage("Olá! Como posso ajudá-lo hoje? Pode falar livremente.")
    } else if (!open && recognitionRef.current) {
      recognitionRef.current.stop()
      window.speechSynthesis.cancel()
      setIsListening(false)
      setIsSpeaking(false)
    }
  }, [open])

  const handleUserMessageComplete = async (message: string) => {
    if (!message.trim()) return

    const userMessage = message.trim()
    setCurrentMessage("")

    // Adicionar mensagem do usuário
    const newMessages = [...messages, { role: "user" as const, content: userMessage }]
    setMessages(newMessages)

    // Parar de escutar enquanto a IA processa
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsListening(false)
    setIsProcessing(true)

    try {
      // Chamar API para obter resposta da IA
      const response = await fetch("/api/voice/conversation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: newMessages,
          context: conversationContextRef.current,
        }),
      })

      const data = await response.json()

      if (data.assistantMessage) {
        // Adicionar resposta da IA
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.assistantMessage },
        ])

        // Atualizar contexto
        conversationContextRef.current = data.context || ""

        // IA fala a resposta
        await speakMessage(data.assistantMessage)

        // Verificar se a conversa está completa
        if (data.isComplete && data.finalMessage) {
          // Fechar modal e abrir confirmação
          onOpenChange(false)
          onConversationComplete(data.finalMessage)
        } else {
          // Continuar escutando
          setIsProcessing(false)
          if (recognitionRef.current && open) {
            recognitionRef.current.start()
          }
        }
      }
    } catch (error) {
      console.error("Error processing message:", error)
      await speakMessage("Desculpe, ocorreu um erro. Pode repetir?")
      setIsProcessing(false)
      if (recognitionRef.current && open) {
        recognitionRef.current.start()
      }
    }
  }

  const speakMessage = (text: string): Promise<void> => {
    return new Promise((resolve) => {
      // Cancelar qualquer fala anterior
      window.speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = "pt-BR"
      utterance.rate = 1.0
      utterance.pitch = 1.0

      utterance.onstart = () => {
        setIsSpeaking(true)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        resolve()
      }

      utterance.onerror = (event) => {
        console.error("Speech synthesis error:", event)
        setIsSpeaking(false)
        resolve()
      }

      speechSynthesisRef.current = utterance
      window.speechSynthesis.speak(utterance)
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Volume2 className="w-5 h-5" />
            Conversa por Voz
          </DialogTitle>
          <DialogDescription>
            Fale naturalmente. A IA irá responder quando você terminar de falar.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Status de escuta/fala */}
          <div className="flex items-center justify-center py-8">
            {isProcessing ? (
              <div className="flex items-center gap-2 text-blue-600">
                <Loader2 className="w-8 h-8 animate-spin" />
                <span className="text-sm">Processando...</span>
              </div>
            ) : isSpeaking ? (
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <Volume2 className="w-12 h-12 text-green-600 animate-pulse" />
                  <div className="absolute inset-0 bg-green-600/20 rounded-full animate-ping" />
                </div>
                <span className="text-sm text-green-600 font-medium">IA falando...</span>
              </div>
            ) : isListening ? (
              <div className="flex flex-col items-center gap-2">
                <div className="relative">
                  <Mic className="w-12 h-12 text-red-600 animate-pulse" />
                  <div className="absolute inset-0 bg-red-600/20 rounded-full animate-ping" />
                </div>
                <span className="text-sm text-red-600 font-medium">Ouvindo...</span>
                <div className="flex gap-1 mt-2">
                  <div className="w-1 h-8 bg-red-600 animate-[speakingPulse_0.6s_ease-in-out_infinite]" />
                  <div className="w-1 h-8 bg-red-600 animate-[speakingPulse_0.6s_ease-in-out_0.2s_infinite]" />
                  <div className="w-1 h-8 bg-red-600 animate-[speakingPulse_0.6s_ease-in-out_0.4s_infinite]" />
                </div>
              </div>
            ) : null}
          </div>

          {/* Transcrição em tempo real */}
          {transcript && (
            <div className="glass rounded-lg p-4 max-h-[200px] overflow-y-auto">
              <h3 className="text-sm font-semibold mb-2">Transcrição:</h3>
              <p className="text-sm text-gray-700 dark:text-gray-300">{transcript}</p>
            </div>
          )}

          {/* Histórico da conversa */}
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg ${
                  message.role === "user"
                    ? "bg-blue-100 dark:bg-blue-900/30 ml-8"
                    : "bg-green-100 dark:bg-green-900/30 mr-8"
                }`}
              >
                <div className="text-xs font-semibold mb-1">
                  {message.role === "user" ? "Você" : "Assistente IA"}
                </div>
                <div className="text-sm">{message.content}</div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
