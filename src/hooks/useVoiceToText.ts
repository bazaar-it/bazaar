import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';

export type RecordingState = 'idle' | 'recording' | 'transcribing';

interface UseVoiceToTextResult {
  recordingState: RecordingState;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  transcription: string | null;
  error: string | null;
  isSupported: boolean;
}

export function useVoiceToText(): UseVoiceToTextResult {
  const [recordingState, setRecordingState] = useState<RecordingState>('idle');
  const [transcription, setTranscription] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Check if browser supports audio recording
  const isSupported = typeof navigator !== 'undefined' && 
                     'mediaDevices' in navigator && 
                     'getUserMedia' in navigator.mediaDevices;

  const startRecording = useCallback(async () => {
    if (!isSupported) {
      setError('Audio recording is not supported in this browser');
      toast.error('Audio recording is not supported in this browser');
      return;
    }

    try {
      setError(null);
      setTranscription(null);
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        } 
      });
      
      streamRef.current = stream;
      audioChunksRef.current = [];
      
      // Create MediaRecorder with preferred format
      let mediaRecorder: MediaRecorder;
      let selectedMimeType = 'audio/webm'; // Default fallback
      
      // Try different MIME types for better compatibility
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mediaRecorder = new MediaRecorder(stream, { 
          mimeType: 'audio/webm;codecs=opus',
          audioBitsPerSecond: 128000,
        });
        selectedMimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mediaRecorder = new MediaRecorder(stream, { 
          mimeType: 'audio/webm',
          audioBitsPerSecond: 128000,
        });
        selectedMimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mediaRecorder = new MediaRecorder(stream, { 
          mimeType: 'audio/mp4',
          audioBitsPerSecond: 128000,
        });
        selectedMimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mediaRecorder = new MediaRecorder(stream, { 
          mimeType: 'audio/ogg;codecs=opus',
          audioBitsPerSecond: 128000,
        });
        selectedMimeType = 'audio/ogg;codecs=opus';
      } else {
        // Use default MediaRecorder settings
        mediaRecorder = new MediaRecorder(stream);
        selectedMimeType = 'audio/webm'; // Assume webm as fallback
      }
      
      console.log(`[VoiceToText] Using MIME type: ${selectedMimeType}`);
      mediaRecorderRef.current = mediaRecorder;
      
      // Handle data collection
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      // Handle recording stop
      mediaRecorder.onstop = async () => {
        setRecordingState('transcribing');
        
        try {
          // Create audio blob from recorded chunks
          const audioBlob = new Blob(audioChunksRef.current, { 
            type: selectedMimeType 
          });
          
          // Validate audio size (5 minutes max)
          const maxSize = 25 * 1024 * 1024; // 25MB
          if (audioBlob.size > maxSize) {
            throw new Error('Recording too long. Please keep recordings under 5 minutes.');
          }
          
          if (audioBlob.size < 1000) { // Less than 1KB
            throw new Error('Recording too short. Please speak for at least a few seconds.');
          }
          
          console.log(`[VoiceToText] Sending audio for transcription: ${audioBlob.size} bytes, type: ${audioBlob.type}`);
          
          // Send to transcription API
          const formData = new FormData();
          formData.append('audio', audioBlob, 'recording.webm');
          
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            body: formData,
          });
          
          const result = await response.json();
          
          if (!response.ok) {
            throw new Error(result.error || 'Transcription failed');
          }
          
          if (result.text && result.text.trim()) {
            setTranscription(result.text.trim());
            console.log(`[VoiceToText] Transcription successful: ${result.text}`);
          } else {
            throw new Error('No speech detected. Please try speaking more clearly.');
          }
          
        } catch (transcriptionError) {
          console.error('[VoiceToText] Transcription error:', transcriptionError);
          const errorMessage = transcriptionError instanceof Error 
            ? transcriptionError.message 
            : 'Failed to transcribe audio';
          setError(errorMessage);
          toast.error(errorMessage);
        }
        
        // Clean up stream
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
        setRecordingState('idle');
      };
      
      // Start recording
      mediaRecorder.start(100); // Collect data every 100ms
      setRecordingState('recording');
      
      console.log('[VoiceToText] Recording started');
      
    } catch (err) {
      console.error('[VoiceToText] Error starting recording:', err);
      let errorMessage = 'Failed to start recording';
      
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Microphone access denied. Please allow microphone access and try again.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No microphone found. Please connect a microphone and try again.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      setRecordingState('idle');
      
      // Clean up on error
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    }
  }, [isSupported]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      console.log('[VoiceToText] Stopping recording');
      mediaRecorderRef.current.stop();
    }
  }, [recordingState]);

  return {
    recordingState,
    startRecording,
    stopRecording,
    transcription,
    error,
    isSupported,
  };
} 