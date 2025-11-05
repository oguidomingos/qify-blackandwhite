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
  const [hasMicrophonePermission, setHasMicrophonePermission] = useState(false);

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const speakingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const checkSpeakingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const microphoneStreamRef = useRef<MediaStream | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true; // Enable interim results for real-time feedback
        recognitionRef.current.lang = 'pt-BR';

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPiece = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
              finalTranscript += transcriptPiece;
            } else {
              interimTranscript += transcriptPiece;
            }
          }

          // Update transcript in real-time (interim or final)
          const currentTranscript = finalTranscript || interimTranscript;
          console.log('📝 Real-time transcript:', currentTranscript);
          setTranscript(currentTranscript);

          // Only trigger callback when final
          if (finalTranscript) {
            console.log('✅ Final transcript:', finalTranscript);
            onTranscript?.(finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setError(`Erro no reconhecimento: ${event.error}`);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          console.log('🎤 Recognition ended');
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

  // Request microphone permission
  const requestMicrophonePermission = useCallback(async () => {
    console.log('🎤 Requesting microphone permission...');

    try {
      // Request microphone access explicitly
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      microphoneStreamRef.current = stream;
      setHasMicrophonePermission(true);
      console.log('✅ Microphone permission granted');
      return true;
    } catch (err: any) {
      console.error('❌ Microphone permission denied:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Permissão do microfone negada. Por favor, permita o acesso ao microfone nas configurações do navegador.');
      } else if (err.name === 'NotFoundError') {
        setError('Nenhum microfone encontrado. Verifique se há um microfone conectado.');
      } else {
        setError('Erro ao acessar o microfone: ' + err.message);
      }

      setHasMicrophonePermission(false);
      return false;
    }
  }, []);

  const startListening = useCallback(async () => {
    if (!recognitionRef.current || isListening) {
      return;
    }

    // First, request microphone permission if we don't have it yet
    if (!hasMicrophonePermission) {
      const granted = await requestMicrophonePermission();
      if (!granted) {
        console.error('❌ Cannot start listening without microphone permission');
        return;
      }
    }

    setError(null);
    setTranscript('');

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err: any) {
      console.error('❌ Error starting recognition:', err);
      setError('Erro ao iniciar reconhecimento de voz: ' + err.message);
    }
  }, [isListening, hasMicrophonePermission, requestMicrophonePermission]);

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
      // Clear timers
      if (speakingTimeoutRef.current) {
        clearTimeout(speakingTimeoutRef.current);
      }
      if (checkSpeakingIntervalRef.current) {
        clearInterval(checkSpeakingIntervalRef.current);
      }

      // Stop microphone stream
      if (microphoneStreamRef.current) {
        microphoneStreamRef.current.getTracks().forEach(track => track.stop());
        console.log('🧹 Cleanup: Microphone stream stopped');
      }

      // Stop recognition
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignore errors on cleanup
        }
      }

      // Stop speech synthesis
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
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
