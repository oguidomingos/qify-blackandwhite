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

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();

        // Try with continuous=false to reduce network issues
        recognitionRef.current.continuous = false; // Changed from true to false
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
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPiece = event.results[i][0].transcript;

            if (event.results[i].isFinal) {
              finalTranscript += transcriptPiece;
            } else {
              interimTranscript += transcriptPiece;
            }
          }

          const currentTranscript = finalTranscript || interimTranscript;
          setTranscript(currentTranscript);

          // When we have final transcript, just update it
          if (finalTranscript) {
            console.log('✅ Final transcript:', finalTranscript.substring(0, 50));
            setTranscript(finalTranscript);
          }
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

            // Don't show scary error message to user - try more times
            if (networkRetryCountRef.current < 5) { // Increased from 3 to 5
              networkRetryCountRef.current += 1;
              console.log(`🔄 Retry attempt ${networkRetryCountRef.current}/5`);

              // Try to restart recognition after a longer delay
              const retryDelay = 1500 + (networkRetryCountRef.current * 500); // Progressive backoff: 2s, 2.5s, 3s, 3.5s, 4s
              console.log(`⏱️ Waiting ${retryDelay}ms before retry...`);

              setTimeout(() => {
                if (currentTurn === 'user' && !isRestartingRef.current) {
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
                      if (recognitionRef.current && currentTurn === 'user') {
                        recognitionRef.current.start();
                        console.log('✅ Recognition restarted after network error');
                      }
                    } catch (err) {
                      console.error('Failed to restart:', err);
                      setError('Erro de conexão. Clique no microfone para reiniciar.');
                      setIsListening(false);
                      setCurrentTurn('idle');
                    } finally {
                      isRestartingRef.current = false;
                    }
                  }, 800); // Increased delay before restart
                }
              }, retryDelay);
            } else {
              console.error('❌ Max retries reached (5 attempts)');
              setError('Erro de conexão persistente. Clique no microfone para reiniciar.');
              setIsListening(false);
              setCurrentTurn('idle');
              networkRetryCountRef.current = 0; // Reset for next time
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
          console.log('🎤 Recognition ended. CurrentTurn:', currentTurn);

          // With continuous=false, we need to restart if still in user turn
          if (currentTurn === 'user' && !isRestartingRef.current && isListening) {
            console.log('🔄 Auto-restarting recognition (continuous=false mode)');
            setTimeout(() => {
              try {
                if (recognitionRef.current && currentTurn === 'user') {
                  recognitionRef.current.start();
                }
              } catch (err) {
                console.error('❌ Error auto-restarting:', err);
                setIsListening(false);
              }
            }, 100);
          } else {
            setIsListening(false);
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
  }, [currentTurn]);

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
    setCurrentTurn('user');

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

    if (recognitionRef.current) {
      try {
        if (isListening) {
          recognitionRef.current.stop();
          console.log('✅ Recognition.stop() called');
        }
      } catch (err) {
        console.error('⚠️ Error stopping recognition:', err);
      }

      setIsListening(false);
      setCurrentTurn('idle');

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
