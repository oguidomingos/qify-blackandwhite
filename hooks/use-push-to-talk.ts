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

          // If user is still holding the button, try to restart automatically
          if (isUserHoldingButtonRef.current) {
            console.log('🔄 User still holding button, attempting auto-restart...');
            setTimeout(() => {
              if (isUserHoldingButtonRef.current && recognitionRef.current) {
                try {
                  recognitionRef.current.start();
                  console.log('✅ Auto-restarted after network error');
                } catch (err) {
                  console.error('Failed to auto-restart:', err);
                  setError('Erro de conexão. Solte e segure novamente.');
                }
              }
            }, 500);
          } else {
            setError('Erro de conexão temporário. Tente novamente.');
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

  const startRecording = useCallback(() => {
    initRecognition();

    if (!recognitionRef.current) return;

    try {
      accumulatedTranscriptRef.current = '';
      setTranscript('');
      setError(null);
      isUserHoldingButtonRef.current = true; // User is holding button
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
