// src/components/ui/FeedbackModal.tsx
"use client";
import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '~/trpc/react';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { Label } from '~/components/ui/label';
import { X, Mic } from 'lucide-react';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { AppRouter } from '~/server/api/root';

interface FeedbackModalProps {
  onClose: () => void;
}

export default function FeedbackModal({ onClose }: FeedbackModalProps) {
  const { data: session } = useSession();
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef<MediaRecorder | null>(null);

  // Voice-to-text transcription
  const transcribe = api.voice.transcribe.useMutation({
    onSuccess: (data) => {
      setFeedback((prev) => (prev ? `${prev} ${data.text}` : data.text));
    },
    onError: (error) => {
      console.error('Transcription error:', error);
    },
  });

  const handleRecord = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: recorder.mimeType });
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          transcribe.mutate({ audio: base64, mimeType: blob.type });
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach((t) => t.stop());
        setIsRecording(false);
      };
      
      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Voice recording failed', err);
    }
  };

  const submitFeedbackMutation = api.feedback.submit.useMutation({
    onSuccess: () => {
      setIsSubmitted(true);
      setIsSubmitting(false);
      setFeedback('');
      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
      }, 3000);
    },
    onError: (error: TRPCClientErrorLike<AppRouter>) => {
      console.error('Feedback submission error:', error);
      setIsSubmitting(false);
      alert(`Error submitting feedback: ${error.message}`);
    }
  });

  const handleSubmit = () => {
    if (!feedback.trim()) return;

    setIsSubmitting(true);
    submitFeedbackMutation.mutate({
      content: feedback.trim(),
      name: session?.user?.name || undefined,
      email: session?.user?.email || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-lg p-6 sm:p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          aria-label="Close feedback form"
        >
          <X size={20} />
        </button>

        {isSubmitted ? (
          <div className="text-center py-10">
            <h3 className="text-xl sm:text-2xl font-semibold text-green-600 dark:text-green-400">Thank you for your feedback!</h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300">Your input helps us improve Bazaar.</p>
          </div>
        ) : (
          <>
            <h2 className="text-xl sm:text-2xl font-semibold mb-6 text-gray-800 dark:text-gray-100">We'd Love Your Feedback</h2>

            <div className="space-y-4">
              <div>
                <Label htmlFor="feedback" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Your Feedback
                </Label>
                <div className="mt-1 relative">
                  <Textarea
                    id="feedback"
                    value={feedback}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setFeedback(e.target.value)}
                    placeholder="Share your thoughts, feature requests, or report issues..."
                    className="block w-full bg-white dark:bg-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 pr-12"
                    rows={4}
                  />
                  <button
                    type="button"
                    onClick={handleRecord}
                    disabled={transcribe.isPending}
                    className={`absolute right-2 top-2 p-2 rounded-md transition-colors ${
                      isRecording 
                        ? 'text-red-500 hover:text-red-600' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-600 dark:text-gray-300 dark:hover:bg-gray-500'
                    } disabled:opacity-50`}
                    aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
                  >
                    <Mic size={16} className={isRecording ? 'text-red-500' : ''} />
                  </button>
                </div>
                {transcribe.isPending && (
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1">Transcribing audio...</p>
                )}
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || !feedback.trim()}
                className="w-full bg-primary hover:bg-primary-dark text-white py-2.5 transition-colors duration-150 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
