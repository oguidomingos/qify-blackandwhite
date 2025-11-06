import { useState, useRef, useCallback } from 'react';

interface UsePushToTalkProps {
  onTranscriptComplete: (text: string) => void;
}

export function usePushToTalk({ onTranscriptComplete }: UsePushToTalkProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef<string>('');
  const isUserHoldingButtonRef = useRef<boolean>(false); // Track if user is still holding button
  const networkRetryCountRef = useRef<number>(0); // Limit retries to prevent infinite loops

  // Initialize recognition once
  const initRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Seu navegador não suporta reconhecimento de voz');
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Single recording session for push-to-talk
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let newFinalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            newFinalTranscript += transcriptPiece + ' ';
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        if (newFinalTranscript) {
          accumulatedTranscriptRef.current += newFinalTranscript;
        }

        const fullTranscript = (accumulatedTranscriptRef.current + interimTranscript).trim();
        setTranscript(fullTranscript);
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);

        // Ignore harmless errors
        if (event.error === 'no-speech') {
          return; // Normal - no speech detected
        }

        if (event.error === 'aborted') {
          return; // Normal - user stopped manually
        }

        // Network errors are usually temporary Chrome/browser issues
        if (event.error === 'network') {
          console.warn('Network error in speech recognition - usually temporary');
          console.log('🔍 Diagnostic info:', {
            retryCount: networkRetryCountRef.current,
            userHoldingButton: isUserHoldingButtonRef.current,
            isRecording: isRecording,
            hasPermission: 'Checking microphone permission...'
          });

          // Limit retries to prevent infinite loops
          if (networkRetryCountRef.current >= 3) {
            console.error('❌ Max network retries reached (3). This usually means:');
            console.error('1. Microphone permission not granted');
            console.error('2. No microphone available');
            console.error('3. Another app is using the microphone');
            console.error('4. Browser API issue - try refreshing the page');

            setError('⚠️ Verifique se o microfone está permitido e disponível. Recarregue a página se necessário.');
            setIsRecording(false);
            isUserHoldingButtonRef.current = false;
            networkRetryCountRef.current = 0;
            return;
          }

          // If user is still holding the button, try to restart automatically
          if (isUserHoldingButtonRef.current) {
            networkRetryCountRef.current += 1;
            console.log(`🔄 User still holding button, attempting auto-restart (${networkRetryCountRef.current}/3)...`);

            setTimeout(() => {
              if (isUserHoldingButtonRef.current && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                  console.log('✅ Auto-restarted after network error');
                } catch (err) {
                  console.error('Failed to auto-restart:', err);
                  setError('Erro de conexão. Solte e segure novamente.');
                  networkRetryCountRef.current = 0;
                }
              }
            }, 500);
          } else {
            setError('Erro de conexão temporário. Tente novamente.');
            networkRetryCountRef.current = 0;
          }
          return;
        }

        // For other errors, show user-friendly message
        setError('Erro ao reconhecer voz. Tente falar novamente.');
      };

      recognition.onend = () => {
        // When recognition ends, finalize the transcript
        if (accumulatedTranscriptRef.current.trim()) {
          onTranscriptComplete(accumulatedTranscriptRef.current.trim());
        }
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, [onTranscriptComplete]);

  const startRecording = useCallback(async () => {
    initRecognition();

    if (!recognitionRef.current) return;

    // Check microphone permission first
    try {
      console.log('🎤 Checking microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');

      // Stop the test stream immediately
      stream.getTracks().forEach(track => track.stop());
    } catch (permErr) {
      console.error('❌ Microphone permission denied or unavailable:', permErr);
      setError('Permissão do microfone negada. Clique no ícone de cadeado na barra de endereço para permitir.');
      return;
    }

    try {
      accumulatedTranscriptRef.current = '';
      setTranscript('');
      setError(null);
      isUserHoldingButtonRef.current = true; // User is holding button
      networkRetryCountRef.current = 0; // Reset retry counter on new recording
      recognitionRef.current.start();
      setIsRecording(true);
      console.log('🎤 Started recording');
    } catch (err) {
      console.error('Error starting recognition:', err);
      setError('Erro ao iniciar gravação');
      isUserHoldingButtonRef.current = false;
    }
  }, [initRecognition]);

  const stopRecording = useCallback(() => {
    isUserHoldingButtonRef.current = false; // User released button

    if (recognitionRef.current && isRecording) {
      try {
        recognitionRef.current.stop();
        console.log('🛑 Stopped recording');
      } catch (err) {
        console.error('Error stopping recognition:', err);
      }
    }
  }, [isRecording]);

  const resetTranscript = useCallback(() => {
    accumulatedTranscriptRef.current = '';
    setTranscript('');
  }, []);

  return {
    isRecording,
    transcript,
    error,
    startRecording,
    stopRecording,
    resetTranscript
  };
}
