"use client";

import React, { useEffect, useState, useRef } from 'react';
import { useVoiceToText } from '~/hooks/useVoiceToText';
import { Loader2, MicIcon } from 'lucide-react';
import { cn } from "~/lib/cn";

interface VoiceInputProps {
  onTranscription: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInput({ onTranscription, disabled = false }: VoiceInputProps) {
  const [showError, setShowError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lastTranscriptionRef = useRef<string | null>(null);
  
  const {
    recordingState,
    startRecording,
    stopRecording,
    transcription,
    error: voiceError,
    isSupported: isVoiceSupported,
  } = useVoiceToText();
  
  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-fill transcribed text - only when we get a new transcription
  useEffect(() => {
    if (transcription && transcription.trim() && transcription !== lastTranscriptionRef.current) {
      console.log('[VoiceInput] 🎤 Transcription complete:', transcription);
      lastTranscriptionRef.current = transcription;
      onTranscription(transcription);
    }
  }, [transcription, onTranscription]);

  // Show voice error when it occurs
  useEffect(() => {
    if (voiceError) {
      setShowError(true);
    }
  }, [voiceError]);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted || !isVoiceSupported) return null;

  return (
    <>
      {/* Voice error message */}
      {showError && voiceError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>Error: {voiceError}</span>
          <button
            onClick={() => setShowError(false)}
            className="ml-2 text-red-500 hover:text-red-700 p-1"
            aria-label="Close error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Voice button */}
      <button
        type="button"
        onClick={async () => {
          // Enable audio context with user gesture before starting recording
          try {
            const { enableAudioWithGesture } = await import('~/lib/utils/audioContext');
            enableAudioWithGesture();
          } catch (error) {
            console.warn('[VoiceInput] Audio context not available:', error);
          }
          
          if (recordingState === 'recording') {
            stopRecording();
          } else {
            startRecording();
          }
        }}
        className={cn(
          "p-0.5 rounded-full flex items-center justify-center",
          recordingState === 'recording'
            ? "text-red-500 bg-red-50 animate-pulse"
            : recordingState === 'transcribing'
            ? "text-gray-500 bg-gray-100"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        )}
        disabled={disabled || recordingState === 'transcribing'}
        aria-label={
          recordingState === 'recording' 
            ? 'Stop recording' 
            : recordingState === 'transcribing'
            ? 'Transcribing audio...'
            : 'Start voice recording'
        }
      >
        {recordingState === 'transcribing' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MicIcon className="h-4 w-4" />
        )}
      </button>
    </>
  );
}

// Export a container version that includes the error message in the parent layout
export function VoiceInputWithError({ 
  onTranscription, 
  disabled = false,
  className
}: VoiceInputProps & { className?: string }) {
  const [showError, setShowError] = useState(false);
  const [mounted, setMounted] = useState(false);
  const lastTranscriptionRef = useRef<string | null>(null);
  
  const {
    recordingState,
    startRecording,
    stopRecording,
    transcription,
    error: voiceError,
    isSupported: isVoiceSupported,
  } = useVoiceToText();
  
  // Avoid hydration mismatch by only rendering after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Auto-fill transcribed text - only when we get a new transcription
  useEffect(() => {
    if (transcription && transcription.trim() && transcription !== lastTranscriptionRef.current) {
      console.log('[VoiceInput] 🎤 Transcription complete:', transcription);
      lastTranscriptionRef.current = transcription;
      onTranscription(transcription);
    }
  }, [transcription, onTranscription]);

  // Show voice error when it occurs
  useEffect(() => {
    if (voiceError) {
      setShowError(true);
    }
  }, [voiceError]);

  // Don't render until mounted to avoid hydration mismatch
  if (!mounted || !isVoiceSupported) return null;

  return (
    <div className={className}>
      {/* Voice error message */}
      {showError && voiceError && (
        <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center justify-between">
          <span>Error: {voiceError}</span>
          <button
            onClick={() => setShowError(false)}
            className="ml-2 text-red-500 hover:text-red-700 p-1"
            aria-label="Close error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Voice button */}
      <button
        type="button"
        onClick={async () => {
          // Enable audio context with user gesture before starting recording
          try {
            const { enableAudioWithGesture } = await import('~/lib/utils/audioContext');
            enableAudioWithGesture();
          } catch (error) {
            console.warn('[VoiceInput] Audio context not available:', error);
          }
          
          if (recordingState === 'recording') {
            stopRecording();
          } else {
            startRecording();
          }
        }}
        className={cn(
          "p-0.5 rounded-full flex items-center justify-center",
          recordingState === 'recording'
            ? "text-red-500 bg-red-50 animate-pulse"
            : recordingState === 'transcribing'
            ? "text-gray-500 bg-gray-100"
            : "text-gray-500 hover:text-gray-700 hover:bg-gray-100"
        )}
        disabled={disabled || recordingState === 'transcribing'}
        aria-label={
          recordingState === 'recording' 
            ? 'Stop recording' 
            : recordingState === 'transcribing'
            ? 'Transcribing audio...'
            : 'Start voice recording'
        }
      >
        {recordingState === 'transcribing' ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <MicIcon className="h-4 w-4" />
        )}
      </button>
    </div>
  );
}