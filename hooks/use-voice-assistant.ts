import { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceAssistantProps {
  onTranscript?: (text: string) => void;
  onSpeakingChange?: (isSpeaking: boolean) => void;
}

export function useVoiceAssistant({ onTranscript, onSpeakingChange }: VoiceAssistantProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkSpeakingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'pt-BR';

        recognitionRef.current.onresult = (event: any) => {
          const text = event.results[0][0].transcript;
          setTranscript(text);
          onTranscript?.(text);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setError(`Erro no reconhecimento: ${event.error}`);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      } else {
        setError('Seu navegador não suporta reconhecimento de voz');
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [onTranscript]);

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setError(null);
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const speak = useCallback((text: string) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      console.log('🗣️ Starting speech:', text.substring(0, 50) + '...');

      // Cancel any ongoing speech and clear timers
      window.speechSynthesis.cancel();
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
      if (checkSpeakingIntervalRef.current) {
        clearInterval(checkSpeakingIntervalRef.current);
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        console.log('🎤 Speech started');
        setIsSpeaking(true);
        onSpeakingChange?.(true);
      };

      utterance.onend = () => {
        console.log('✅ Speech ended (onend event)');
        setIsSpeaking(false);
        onSpeakingChange?.(false);

        if (speakingTimeoutRef.current) {
          clearTimeout(speakingTimeoutRef.current);
        }
        if (checkSpeakingIntervalRef.current) {
          clearInterval(checkSpeakingIntervalRef.current);
        }
      };

      utterance.onerror = (event) => {
        console.error('❌ Speech synthesis error:', event);
        setIsSpeaking(false);
        onSpeakingChange?.(false);

        if (speakingTimeoutRef.current) {
          clearTimeout(speakingTimeoutRef.current);
        }
        if (checkSpeakingIntervalRef.current) {
          clearInterval(checkSpeakingIntervalRef.current);
        }
      };

      synthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);

      // Safety mechanism 1: Timeout after 30 seconds
      speakingTimeoutRef.current = setTimeout(() => {
        console.warn('⚠️ Speech timeout after 30s - forcing end');
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.cancel();
        }
        setIsSpeaking(false);
        onSpeakingChange?.(false);
      }, 30000);

      // Safety mechanism 2: Check every 500ms if speech has finished
      let checkCount = 0;
      checkSpeakingIntervalRef.current = setInterval(() => {
        checkCount++;
        const stillSpeaking = window.speechSynthesis.speaking || window.speechSynthesis.pending;
        console.log(`🔍 Check ${checkCount}: still speaking?`, stillSpeaking);

        if (!stillSpeaking && isSpeaking) {
          console.log('✅ Speech detected as finished via polling - forcing callback');
          setIsSpeaking(false);
          onSpeakingChange?.(false);

          if (checkSpeakingIntervalRef.current) {
            clearInterval(checkSpeakingIntervalRef.current);
          }
          if (speakingTimeoutRef.current) {
            clearTimeout(speakingTimeoutRef.current);
          }
        }
      }, 500);
    }
  }, [onSpeakingChange, isSpeaking]);

  const stopSpeaking = useCallback(() => {
    console.log('🛑 Stopping speech manually');
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      onSpeakingChange?.(false);

      // Clear timers
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
      if (checkSpeakingIntervalRef.current) {
        clearInterval(checkSpeakingIntervalRef.current);
      }
    }
  }, [onSpeakingChange]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
      if (checkSpeakingIntervalRef.current) {
        clearInterval(checkSpeakingIntervalRef.current);
      }
    };
  }, []);

  return {
    isListening,
    isSpeaking,
    transcript,
    error,
    startListening,
    stopListening,
    speak,
    stopSpeaking
  };
}
