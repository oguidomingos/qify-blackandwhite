import { useState, useRef, useCallback } from 'react';

interface UseDeepgramRecorderProps {
  onTranscriptComplete: (text: string) => void;
}

export function useDeepgramRecorder({ onTranscriptComplete }: UseDeepgramRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = useCallback(async () => {
    console.log('🎙️ [Deepgram] Starting recording...');

    try {
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000 // Optimal for speech recognition
        }
      });

      console.log('✅ [Deepgram] Microphone access granted');
      streamRef.current = stream;

      // Create MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      console.log('🎵 [Deepgram] Using MIME type:', mimeType);

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 16000
      });

      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log('📦 [Deepgram] Audio chunk received:', event.data.size, 'bytes');
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('🛑 [Deepgram] Recording stopped, processing audio...');
        setIsProcessing(true);

        // Combine all chunks into a single blob
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        console.log('📦 [Deepgram] Total audio size:', audioBlob.size, 'bytes');

        if (audioBlob.size === 0) {
          console.warn('⚠️ [Deepgram] Audio blob is empty');
          setError('Nenhum áudio foi capturado. Tente novamente.');
          setIsProcessing(false);
          return;
        }

        // Send to API for transcription
        try {
          console.log('📤 [Deepgram] Sending audio to transcription API...');

          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');

          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });

          console.log('📥 [Deepgram] Response status:', response.status);

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(errorData.error || `HTTP ${response.status}`);
          }

          const data = await response.json();
          console.log('✅ [Deepgram] Transcription received:', data);

          if (data.success && data.transcript) {
            const transcriptText = data.transcript.trim();
            console.log('📝 [Deepgram] Final transcript:', transcriptText);

            setTranscript(transcriptText);
            onTranscriptComplete(transcriptText);
          } else {
            throw new Error(data.error || 'No transcript returned');
          }
        } catch (err) {
          console.error('❌ [Deepgram] Transcription error:', err);
          setError(err instanceof Error ? err.message : 'Erro ao transcrever áudio');
        } finally {
          setIsProcessing(false);
        }

        // Cleanup
        audioChunksRef.current = [];
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('❌ [Deepgram] MediaRecorder error:', event.error);
        setError('Erro ao gravar áudio');
        setIsRecording(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
      setTranscript('');

      console.log('🎤 [Deepgram] Recording started');
    } catch (err) {
      console.error('❌ [Deepgram] Error starting recording:', err);
      setError(err instanceof Error ? err.message : 'Erro ao acessar microfone');
    }
  }, [onTranscriptComplete]);

  const stopRecording = useCallback(() => {
    console.log('🛑 [Deepgram] Stopping recording...');

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }

    // Stop all tracks
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('🔇 [Deepgram] Stopped track:', track.kind);
      });
      streamRef.current = null;
    }
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    audioChunksRef.current = [];
  }, []);

  return {
    isRecording,
    transcript,
    error,
    isProcessing,
    startRecording,
    stopRecording,
    resetTranscript
  };
}
