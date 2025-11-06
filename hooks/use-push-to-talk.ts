import { useState, useRef, useCallback } from 'react';

interface UsePushToTalkProps {
  onTranscriptComplete: (text: string) => void;
}

type RecordingState = 'idle' | 'starting' | 'recording' | 'stopping';

export function usePushToTalk({ onTranscriptComplete }: UsePushToTalkProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const accumulatedTranscriptRef = useRef<string>('');
  const recordingStateRef = useRef<RecordingState>('idle');
  const networkRetryCountRef = useRef<number>(0);
  const micStreamRef = useRef<MediaStream | null>(null);

  // Initialize recognition once
  const initRecognition = useCallback(() => {
    if (typeof window === 'undefined') return;

    // Check for secure context (HTTPS or localhost)
    if (!window.isSecureContext) {
      setError('⚠️ Reconhecimento de voz requer HTTPS ou localhost');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError('Seu navegador não suporta reconhecimento de voz');
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();

      // STABLE CONFIGURATION: continuous true + interimResults true
      // This is more reliable than continuous false
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'pt-BR';
      recognition.maxAlternatives = 1;

      // Diagnostic event handlers
      recognition.onstart = () => {
        console.log('✅ Recognition STARTED successfully');
        recordingStateRef.current = 'recording';
        setIsRecording(true);
      };

      recognition.onaudiostart = () => {
        console.log('🎤 Audio capture STARTED');
      };

      recognition.onsoundstart = () => {
        console.log('🔊 Sound DETECTED');
      };

      recognition.onspeechstart = () => {
        console.log('🗣️ Speech DETECTED');
        // Reset error when speech is successfully detected
        setError(null);
        networkRetryCountRef.current = 0; // Reset retry count on successful speech
      };

      recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let newFinalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptPiece = event.results[i][0].transcript;

          if (event.results[i].isFinal) {
            newFinalTranscript += transcriptPiece + ' ';
            console.log('📝 Final transcript piece:', transcriptPiece);
          } else {
            interimTranscript += transcriptPiece;
          }
        }

        if (newFinalTranscript) {
          accumulatedTranscriptRef.current += newFinalTranscript;
        }

        const fullTranscript = (accumulatedTranscriptRef.current + interimTranscript).trim();
        setTranscript(fullTranscript);

        console.log('📋 Current transcript:', fullTranscript.substring(0, 50) + '...');
      };

      recognition.onspeechend = () => {
        console.log('🗣️ Speech ENDED (user stopped talking)');
        // Don't stop here - we'll stop when user releases button
      };

      recognition.onsoundend = () => {
        console.log('🔇 Sound ENDED');
      };

      recognition.onaudioend = () => {
        console.log('🎤 Audio capture ENDED');
      };

      recognition.onerror = (event: any) => {
        console.error('❌ Speech recognition error:', event.error);
        console.log('🔍 Error state:', {
          error: event.error,
          recordingState: recordingStateRef.current,
          retryCount: networkRetryCountRef.current
        });

        // Ignore harmless errors
        if (event.error === 'no-speech') {
          console.log('⚠️ No speech detected (normal)');
          return;
        }

        if (event.error === 'aborted') {
          console.log('⚠️ Recognition aborted (normal when user stops)');
          return;
        }

        // Network errors - handle with exponential backoff
        if (event.error === 'network') {
          console.warn('🌐 Network error in speech recognition');

          // Max 3 retries
          if (networkRetryCountRef.current >= 3) {
            console.error('❌ Max network retries reached (3)');
            console.error('Possible causes:');
            console.error('  1. Not on HTTPS or localhost');
            console.error('  2. Google Speech API temporarily unavailable');
            console.error('  3. Firewall/VPN blocking Google services');
            console.error('  4. Regional restrictions');

            setError('⚠️ Serviço de reconhecimento temporariamente indisponível. Tente recarregar a página.');
            setIsRecording(false);
            recordingStateRef.current = 'idle';
            networkRetryCountRef.current = 0;

            // Clean up microphone stream
            if (micStreamRef.current) {
              micStreamRef.current.getTracks().forEach(track => track.stop());
              micStreamRef.current = null;
            }
            return;
          }

          // Retry with exponential backoff: 200ms, 500ms, 1000ms
          const retryDelay = Math.min(200 * Math.pow(2, networkRetryCountRef.current), 1000);
          networkRetryCountRef.current += 1;

          console.log(`🔄 Retrying (${networkRetryCountRef.current}/3) after ${retryDelay}ms...`);

          setTimeout(() => {
            if (recordingStateRef.current !== 'idle' && recognitionRef.current) {
              try {
                console.log('🔄 Restarting recognition...');
                recognitionRef.current.start();
              } catch (err) {
                console.error('Failed to restart:', err);
                setError('Erro de conexão. Solte o botão e tente novamente.');
                setIsRecording(false);
                recordingStateRef.current = 'idle';
                networkRetryCountRef.current = 0;
              }
            }
          }, retryDelay);
          return;
        }

        // Other errors
        console.error('Unhandled error type:', event.error);
        setError('Erro ao reconhecer voz. Tente novamente.');
        setIsRecording(false);
        recordingStateRef.current = 'idle';
      };

      recognition.onend = () => {
        console.log('🏁 Recognition ENDED');
        console.log('Final accumulated transcript:', accumulatedTranscriptRef.current);

        // Only call callback if we have transcript and we're in stopping state
        if (recordingStateRef.current === 'stopping' && accumulatedTranscriptRef.current.trim()) {
          console.log('✅ Sending transcript to callback');
          onTranscriptComplete(accumulatedTranscriptRef.current.trim());
        }

        setIsRecording(false);
        recordingStateRef.current = 'idle';

        // Clean up microphone stream
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => track.stop());
          micStreamRef.current = null;
        }
      };

      recognitionRef.current = recognition;
    }
  }, [onTranscriptComplete]);

  const startRecording = useCallback(async () => {
    console.log('🎬 startRecording called, current state:', recordingStateRef.current);

    // Prevent multiple starts
    if (recordingStateRef.current !== 'idle') {
      console.warn('⚠️ Already recording or starting, ignoring');
      return;
    }

    recordingStateRef.current = 'starting';
    initRecognition();

    if (!recognitionRef.current) {
      recordingStateRef.current = 'idle';
      return;
    }

    // Request microphone permission and keep stream active during recording
    try {
      console.log('🎤 Requesting microphone permission...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      console.log('✅ Microphone permission granted');

      micStreamRef.current = stream;

      // Wait for microphone to stabilize (150ms delay)
      await new Promise(resolve => setTimeout(resolve, 150));

    } catch (permErr) {
      console.error('❌ Microphone permission denied or unavailable:', permErr);
      setError('Permissão do microfone negada. Clique no ícone de cadeado na barra de endereço para permitir.');
      recordingStateRef.current = 'idle';
      return;
    }

    // Start recognition
    try {
      accumulatedTranscriptRef.current = '';
      setTranscript('');
      setError(null);
      networkRetryCountRef.current = 0;

      console.log('🎤 Starting speech recognition...');
      recognitionRef.current.start();
      // State will be set to 'recording' in onstart handler

    } catch (err: any) {
      console.error('❌ Error starting recognition:', err);

      // Handle "already started" error
      if (err.message?.includes('already')) {
        console.warn('Recognition already started, stopping and retrying...');
        try {
          recognitionRef.current.stop();
          await new Promise(resolve => setTimeout(resolve, 300));
          recognitionRef.current.start();
        } catch (retryErr) {
          setError('Erro ao iniciar gravação. Tente novamente.');
          recordingStateRef.current = 'idle';
          if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(track => track.stop());
            micStreamRef.current = null;
          }
        }
      } else {
        setError('Erro ao iniciar gravação');
        recordingStateRef.current = 'idle';
        if (micStreamRef.current) {
          micStreamRef.current.getTracks().forEach(track => track.stop());
          micStreamRef.current = null;
        }
      }
    }
  }, [initRecognition]);

  const stopRecording = useCallback(() => {
    console.log('🛑 stopRecording called, current state:', recordingStateRef.current);

    if (!recognitionRef.current) return;

    // If still starting, abort instead of stop
    if (recordingStateRef.current === 'starting') {
      console.log('⚠️ User released while still starting, aborting...');
      try {
        recognitionRef.current.abort();
      } catch (err) {
        console.error('Error aborting:', err);
      }
      recordingStateRef.current = 'idle';
      setIsRecording(false);

      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
        micStreamRef.current = null;
      }
      return;
    }

    // If recording, stop gracefully with small delay
    if (recordingStateRef.current === 'recording') {
      recordingStateRef.current = 'stopping';

      // Small delay (150ms) before calling stop to ensure we capture the last bit of speech
      setTimeout(() => {
        try {
          console.log('🛑 Calling recognition.stop()');
          recognitionRef.current.stop();
        } catch (err) {
          console.error('Error stopping recognition:', err);
          recordingStateRef.current = 'idle';
          setIsRecording(false);

          if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach(track => track.stop());
            micStreamRef.current = null;
          }
        }
      }, 150);
    }
  }, []);

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
