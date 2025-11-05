import { useState, useEffect, useRef, useCallback } from 'react';

interface VoiceConversationProps {
  onUserMessage?: (text: string) => void;
  onAIResponse?: (text: string) => void;
  onSilenceDetected?: () => void;
  silenceThreshold?: number; // ms of silence before triggering
  volumeThreshold?: number; // 0-255, minimum volume to consider as speech
}

interface ConversationTurn {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function useVoiceConversation({
  onUserMessage,
  onAIResponse,
  onSilenceDetected,
  silenceThreshold = 2000, // 2 seconds of silence
  volumeThreshold = 30 // minimum volume threshold
}: VoiceConversationProps = {}) {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [conversationHistory, setConversationHistory] = useState<ConversationTurn[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [currentTurn, setCurrentTurn] = useState<'user' | 'assistant' | 'idle'>('idle');

  const recognitionRef = useRef<any>(null);
  const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const silenceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const volumeCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSpeechTimeRef = useRef<number>(Date.now());
  const streamRef = useRef<MediaStream | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
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
          console.log('🎤 onresult event fired! Results:', event.results.length);
          let interimTranscript = '';
          let finalTranscript = '';

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcriptPiece = event.results[i][0].transcript;
            console.log(`  Result ${i}: "${transcriptPiece}" (final: ${event.results[i].isFinal})`);

            if (event.results[i].isFinal) {
              finalTranscript += transcriptPiece;
            } else {
              interimTranscript += transcriptPiece;
            }
          }

          const currentTranscript = finalTranscript || interimTranscript;
          console.log('📝 Real-time transcript:', currentTranscript);
          setTranscript(currentTranscript);

          // Reset silence timer when speech is detected
          if (currentTranscript) {
            lastSpeechTimeRef.current = Date.now();
          }

          // When we have final transcript, add to conversation
          if (finalTranscript) {
            console.log('✅ Final transcript:', finalTranscript);
            setTranscript(finalTranscript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error('❌ Speech recognition error:', event.error, 'Message:', event.message);
          if (event.error !== 'no-speech') {
            setError(`Erro no reconhecimento: ${event.error}`);
          }
        };

        recognitionRef.current.onstart = () => {
          console.log('🎤 Speech recognition STARTED (onstart event)');
        };

        recognitionRef.current.onend = () => {
          console.log('🎤 Recognition ended. CurrentTurn:', currentTurn, 'Will restart:', currentTurn === 'user');

          // If we're still in user turn, restart recognition
          if (currentTurn === 'user') {
            console.log('🔄 Restarting recognition automatically...');
            try {
              recognitionRef.current?.start();
            } catch (err) {
              console.error('❌ Error restarting recognition:', err);
            }
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

  // Initialize Audio Context for volume detection
  const initAudioContext = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      microphoneRef.current = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.8;

      microphoneRef.current.connect(analyserRef.current);

      console.log('🎤 Audio context initialized for silence detection');
    } catch (err) {
      console.error('Error initializing audio context:', err);
    }
  }, []);

  // Check volume levels to detect silence
  const checkVolume = useCallback(() => {
    if (!analyserRef.current) return 0;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);

    // Calculate average volume
    const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
    return average;
  }, []);

  // Start monitoring for silence
  const startSilenceDetection = useCallback(() => {
    console.log('🎯 Starting silence detection...');
    if (volumeCheckIntervalRef.current) {
      clearInterval(volumeCheckIntervalRef.current);
    }

    lastSpeechTimeRef.current = Date.now();
    let lastTranscript = '';

    volumeCheckIntervalRef.current = setInterval(() => {
      const volume = checkVolume();
      const now = Date.now();
      const timeSinceLastSpeech = now - lastSpeechTimeRef.current;

      // If volume is above threshold, update last speech time
      if (volume > volumeThreshold) {
        lastSpeechTimeRef.current = now;
        console.log('🔊 Volume detected:', Math.round(volume));
      }

      // Check if transcript has changed
      if (transcript !== lastTranscript) {
        lastTranscript = transcript;
        lastSpeechTimeRef.current = now;
        console.log('📝 Transcript updated, resetting silence timer');
      }

      // If silence has been detected for longer than threshold AND we have a transcript
      if (timeSinceLastSpeech > silenceThreshold && transcript.trim().length > 0) {
        console.log('🤫 Silence detected! Time since last speech:', timeSinceLastSpeech, 'ms. Transcript:', transcript.substring(0, 30));
        stopSilenceDetection();
        onSilenceDetected?.();
      }
    }, 100); // Check every 100ms
  }, [checkVolume, silenceThreshold, volumeThreshold, transcript, onSilenceDetected]);

  const stopSilenceDetection = useCallback(() => {
    if (volumeCheckIntervalRef.current) {
      clearInterval(volumeCheckIntervalRef.current);
      volumeCheckIntervalRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const startListening = useCallback(async () => {
    console.log('🎤 startListening called. isListening:', isListening, 'recognitionRef:', !!recognitionRef.current);

    if (recognitionRef.current && !isListening) {
      setError(null);
      setTranscript('');
      setCurrentTurn('user');

      try {
        console.log('🎤 Initializing audio context...');
        await initAudioContext();

        console.log('🎤 Starting speech recognition...');
        recognitionRef.current.start();
        setIsListening(true);

        console.log('🎤 Starting silence detection...');
        startSilenceDetection();

        console.log('✅ Started listening with silence detection');
      } catch (err) {
        console.error('❌ Error starting recognition:', err);
        setError('Erro ao iniciar reconhecimento de voz: ' + (err as Error).message);
      }
    } else {
      console.warn('⚠️ Cannot start listening. recognitionRef:', !!recognitionRef.current, 'isListening:', isListening);
    }
  }, [isListening, initAudioContext, startSilenceDetection]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      stopSilenceDetection();

      // Clean up audio context
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
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
  }, [isListening, transcript, onUserMessage, stopSilenceDetection]);

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
      stopSilenceDetection();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [stopSilenceDetection]);

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
