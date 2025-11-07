import { useState, useCallback, useEffect } from 'react';
import { usePushToTalk } from './use-push-to-talk';
import { useDeepgramRecorder } from './use-deepgram-recorder';

interface UseHybridRecorderProps {
  onTranscriptComplete: (text: string) => void;
}

type RecognitionMethod = 'web-speech' | 'deepgram' | null;

export function useHybridRecorder({ onTranscriptComplete }: UseHybridRecorderProps) {
  const [method, setMethod] = useState<RecognitionMethod>(null);
  const [shouldUseDeepgram, setShouldUseDeepgram] = useState(false);

  // Web Speech API hook
  const webSpeech = usePushToTalk({
    onTranscriptComplete
  });

  // Deepgram hook
  const deepgram = useDeepgramRecorder({
    onTranscriptComplete
  });

  // Monitor Web Speech errors and switch to Deepgram if needed
  useEffect(() => {
    if (webSpeech.error && webSpeech.error.includes('indisponível')) {
      console.log('⚠️ [Hybrid] Web Speech unavailable, switching to Deepgram');
      setShouldUseDeepgram(true);
    }
  }, [webSpeech.error]);

  const startRecording = useCallback(() => {
    console.log('🎬 [Hybrid] Starting recording...');
    console.log('🔍 [Hybrid] shouldUseDeepgram:', shouldUseDeepgram);

    if (shouldUseDeepgram) {
      console.log('🎙️ [Hybrid] Using Deepgram');
      setMethod('deepgram');
      deepgram.startRecording();
    } else {
      console.log('🎤 [Hybrid] Trying Web Speech API first');
      setMethod('web-speech');
      webSpeech.startRecording();
    }
  }, [shouldUseDeepgram, webSpeech, deepgram]);

  const stopRecording = useCallback(() => {
    console.log('🛑 [Hybrid] Stopping recording, method:', method);

    if (method === 'deepgram') {
      deepgram.stopRecording();
    } else {
      webSpeech.stopRecording();
    }
  }, [method, webSpeech, deepgram]);

  const resetTranscript = useCallback(() => {
    webSpeech.resetTranscript();
    deepgram.resetTranscript();
  }, [webSpeech, deepgram]);

  // Force switch to Deepgram
  const switchToDeepgram = useCallback(() => {
    console.log('🔄 [Hybrid] Manual switch to Deepgram');
    setShouldUseDeepgram(true);
  }, []);

  // Get current state based on active method
  const isRecording = method === 'deepgram' ? deepgram.isRecording : webSpeech.isRecording;
  const transcript = method === 'deepgram' ? deepgram.transcript : webSpeech.transcript;
  const error = method === 'deepgram' ? deepgram.error : webSpeech.error;
  const isProcessing = method === 'deepgram' ? deepgram.isProcessing : false;

  return {
    isRecording,
    transcript,
    error,
    isProcessing,
    method: shouldUseDeepgram ? 'deepgram' : 'web-speech',
    startRecording,
    stopRecording,
    resetTranscript,
    switchToDeepgram
  };
}
