import { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceConversationProps {
  onUserMessage?: (text: string) => void;
  onAIResponse?: (text: string) => void;
  onSilenceDetected?: () => void;
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function useVoiceConversation({
  onUserMessage,
  onAIResponse,
  onSilenceDetected
}: VoiceConversationProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState<'user' | 'assistant' | 'idle'>('idle');

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const networkRetryCountRef = useRef<number>(0);
  const isRestartingRef = useRef<boolean>(false);
  const shouldBeListeningRef = useRef<boolean>(false); // Track intended listening state
  const accumulatedTranscriptRef = useRef<string>(''); // Accumulate final transcripts across restarts

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();

        // Use continuous=true for better stability (prevents frequent reconnections)
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'pt-BR';
        recognitionRef.current.maxAlternatives = 1;

        console.log('✅ Speech recognition initialized:', {
          continuous: recognitionRef.current.continuous,
          interimResults: recognitionRef.current.interimResults,
          lang: recognitionRef.current.lang
        });

        recognitionRef.current.onresult = (event: any) => {
          let interimTranscript = '';
          let newFinalTranscript = '';

          // Process results from the current recognition session
          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPiece = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
              newFinalTranscript += transcriptPiece + ' ';
              console.log('✅ Final piece received:', transcriptPiece);
            } else {
              interimTranscript += transcriptPiece;
            }
          }

          // Accumulate new final transcripts into our ref
          if (newFinalTranscript) {
            accumulatedTranscriptRef.current += newFinalTranscript;
            console.log('📚 Accumulated so far:', accumulatedTranscriptRef.current.substring(0, 100));
          }

          // Combine accumulated final + current interim
          const fullTranscript = (accumulatedTranscriptRef.current + interimTranscript).trim();

          console.log('📝 Transcript update:', {
            accumulated: accumulatedTranscriptRef.current.substring(0, 30),
            interim: interimTranscript.substring(0, 30),
            displaying: fullTranscript.substring(0, 50),
            totalLength: fullTranscript.length
          });

          setTranscript(fullTranscript);
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('❌ Speech recognition error:', event.error, 'Message:', event.message);

          // Handle different error types
          if (event.error === 'no-speech') {
            console.log('⚠️ No speech detected (this is normal)');
            return; // Don't show error for no-speech
          }

          if (event.error === 'network') {
            console.log('🌐 Network error detected. Attempting to reconnect...');

            // Check if we should still be listening
            if (!shouldBeListeningRef.current) {
              console.log('⚠️ User stopped listening, not retrying');
              return;
            }

            // More retries with exponential backoff
            if (networkRetryCountRef.current < 8) {
              networkRetryCountRef.current += 1;
              console.log(`🔄 Retry attempt ${networkRetryCountRef.current}/8`);

              // Exponential backoff: 1s, 2s, 4s, 8s, etc (capped at 10s)
              const retryDelay = Math.min(1000 * Math.pow(2, networkRetryCountRef.current - 1), 10000);
              console.log(`⏱️ Waiting ${retryDelay}ms before retry...`);

              setTimeout(() => {
                // Double-check user intent
                if (shouldBeListeningRef.current && !isRestartingRef.current) {
                  console.log('🔄 Restarting recognition after network error...');
                  isRestartingRef.current = true;

                  // Stop and restart
                  try {
                    if (recognitionRef.current) {
                      recognitionRef.current.stop();
                    }
                  } catch (e) {
                    console.log('Stop error (expected):', e);
                  }

                  setTimeout(() => {
                    try {
                      if (recognitionRef.current && shouldBeListeningRef.current) {
                        recognitionRef.current.start();
                        setIsListening(true); // Ensure state is synced
                        setCurrentTurn('user');
                        console.log('✅ Recognition restarted after network error');
                      }
                    } catch (err) {
                      console.error('Failed to restart:', err);
                      setError('Erro de conexão. Clique no microfone para reiniciar.');
                      setIsListening(false);
                      setCurrentTurn('idle');
                      shouldBeListeningRef.current = false;
                    } finally {
                      isRestartingRef.current = false;
                    }
                  }, 500);
                }
              }, retryDelay);
            } else {
              console.error('❌ Max retries reached (8 attempts)');
              setError('Erro de conexão persistente. Clique no microfone para reiniciar.');
              setIsListening(false);
              setCurrentTurn('idle');
              shouldBeListeningRef.current = false;
              networkRetryCountRef.current = 0;
            }
            return;
          }

          if (event.error === 'aborted') {
            console.log('⚠️ Recognition aborted (normal during restart)');
            return; // Don't show error for aborted
          }

          // For other errors, show message
          setError(`Erro no reconhecimento: ${event.error}`);
        };

        recognitionRef.current.onstart = () => {
          console.log('🎤 Speech recognition STARTED (onstart event)');
        };

        recognitionRef.current.onend = () => {
          console.log('🎤 Recognition ended. shouldBeListening:', shouldBeListeningRef.current, 'isRestartingRef:', isRestartingRef.current);

          // Only restart if user still wants to listen (using ref to avoid state timing issues)
          if (shouldBeListeningRef.current && !isRestartingRef.current) {
            console.log('🔄 Auto-restarting recognition (user still listening)');
            setTimeout(() => {
              try {
                if (recognitionRef.current && shouldBeListeningRef.current) {
                  console.log('✅ Restarting recognition...');
                  recognitionRef.current.start();
                  setIsListening(true); // Sync state
                  setCurrentTurn('user');
                }
              } catch (err) {
                console.error('❌ Error auto-restarting:', err);
                setIsListening(false);
                setCurrentTurn('idle');
                shouldBeListeningRef.current = false;
              }
            }, 200);
          } else {
            console.log('⏹️ Not restarting - user stopped listening');
            setIsListening(false);
            setCurrentTurn('idle');
            shouldBeListeningRef.current = false;
          }
        };

        recognitionRef.current.onnomatch = () => {
          console.log('⚠️ Speech recognition: no match');
        };

        recognitionRef.current.onsoundstart = () => {
          console.log('🔊 Sound detected!');
        };

        recognitionRef.current.onsoundend = () => {
          console.log('🔇 Sound ended');
        };

        recognitionRef.current.onspeechstart = () => {
          console.log('🗣️ Speech started!');
        };

        recognitionRef.current.onspeechend = () => {
          console.log('🗣️ Speech ended');
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
  }, []); // Remove currentTurn dependency to prevent unnecessary reinitializations

  const startListening = useCallback(async () => {
    console.log('🎤 startListening called. isListening:', isListening, 'recognitionRef:', !!recognitionRef.current);

    if (!recognitionRef.current) {
      console.error('❌ No recognition ref available');
      return;
    }

    if (isListening) {
      console.warn('⚠️ Already listening, stopping first...');
      recognitionRef.current.stop();
      setIsListening(false);
      // Wait for it to fully stop
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    // Reset network retry counter when user manually starts
    networkRetryCountRef.current = 0;
    isRestartingRef.current = false;

    setError(null);
    setTranscript('');
    accumulatedTranscriptRef.current = ''; // Clear accumulated transcript for new session
    setCurrentTurn('user');
    shouldBeListeningRef.current = true; // Set intent to listen

    try {
      console.log('🎤 Starting speech recognition...');
      recognitionRef.current.start();
      setIsListening(true);
      console.log('✅ Started listening');
    } catch (err: any) {
      console.error('❌ Error starting recognition:', err);

      // If it's an "already started" error, try stopping and restarting
      if (err.message?.includes('already') || err.message?.includes('aborted')) {
        console.log('🔄 Attempting to recover from "already started" error...');
        try {
          recognitionRef.current.stop();
          await new Promise(resolve => setTimeout(resolve, 500));
          recognitionRef.current.start();
          setIsListening(true);
          console.log('✅ Recovered and restarted recognition');
        } catch (retryErr) {
          console.error('❌ Failed to recover:', retryErr);
          setError('Erro ao iniciar reconhecimento de voz. Tente novamente.');
        }
      } else {
        setError('Erro ao iniciar reconhecimento de voz: ' + err.message);
      }
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    console.log('🛑 stopListening called. isListening:', isListening);

    // Reset retry counters
    networkRetryCountRef.current = 0;
    isRestartingRef.current = false;
    shouldBeListeningRef.current = false; // Clear intent to listen

    // First set isListening to false to prevent auto-restart
    setIsListening(false);
    setCurrentTurn('idle');

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
        console.log('✅ Recognition.stop() called');
      } catch (err) {
        console.error('⚠️ Error stopping recognition:', err);
      }

      console.log('🛑 Stopped listening');

      // Save user message to history
      if (transcript.trim()) {
        const userTurn: ConversationTurn = {
          role: 'user',
          content: transcript,
          timestamp: Date.now()
        };
        setConversationHistory(prev => [...prev, userTurn]);
        onUserMessage?.(transcript);
      }
    }
  }, [isListening, transcript, onUserMessage]);

  const speak = useCallback((text: string, onComplete?: () => void) => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      console.log('🗣️ AI Speaking:', text.substring(0, 50) + '...');

      window.speechSynthesis.cancel();
      setCurrentTurn('assistant');

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'pt-BR';
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onstart = () => {
        console.log('🎤 AI started speaking');
        setIsSpeaking(true);
      };

      utterance.onend = () => {
        console.log('✅ AI finished speaking');
        setIsSpeaking(false);
        setCurrentTurn('idle');

        // Add AI response to history
        const aiTurn: ConversationTurn = {
          role: 'assistant',
          content: text,
          timestamp: Date.now()
        };
        setConversationHistory(prev => [...prev, aiTurn]);
        onAIResponse?.(text);

        // Call completion callback
        onComplete?.();
      };

      utterance.onerror = (event) => {
        console.error('❌ Speech synthesis error:', event);
        setIsSpeaking(false);
        setCurrentTurn('idle');
      };

      synthesisRef.current = utterance;
      window.speechSynthesis.speak(utterance);
    }
  }, [onAIResponse]);

  const stopSpeaking = useCallback(() => {
    console.log('🛑 Stopping speech manually');
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      setCurrentTurn('idle');
    }
  }, []);

  const resetConversation = useCallback(() => {
    setConversationHistory([]);
    setTranscript('');
    setCurrentTurn('idle');
    stopListening();
    stopSpeaking();
  }, [stopListening, stopSpeaking]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup on unmount
    };
  }, []);

  return {
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
  };
}
