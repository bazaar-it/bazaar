'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';

interface YouTubeToBazaarProps {
  projectId: string;
  chatId: string;
  onSuccess?: () => void;
}

export function YouTubeToBazaar({ projectId, chatId, onSuccess }: YouTubeToBazaarProps) {
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Use your existing generateScene endpoint!
  const generateScene = api.generation.generateScene.useMutation({
    onSuccess: () => {
      setIsProcessing(false);
      setYoutubeUrl('');
      onSuccess?.();
    },
    onError: (error) => {
      console.error('Generation failed:', error);
      setIsProcessing(false);
    }
  });

  // First get analysis from Gemini
  const analyzeVideo = api.videoAnalysis.testYouTubeAnalysis.useMutation({
    onSuccess: (data) => {
      // Then feed it into your existing generation system!
      const prompt = `Create a motion graphics video based on this detailed analysis of a YouTube video:

${data.analysis}

IMPORTANT: Reproduce this video as accurately as possible, matching all animations, timing, colors, and visual elements exactly as described.`;

      // Use your existing generation pipeline
      generateScene.mutate({
        projectId,
        userMessage: prompt,
        userContext: {
          // Could add any additional context here
        }
      });
    },
    onError: (error) => {
      console.error('Analysis failed:', error);
      setIsProcessing(false);
    }
  });

  const handleSubmit = () => {
    if (!youtubeUrl) return;
    
    setIsProcessing(true);
    analyzeVideo.mutate({ youtubeUrl });
  };

  return (
    <div className="flex gap-2">
      <input
        type="text"
        value={youtubeUrl}
        onChange={(e) => setYoutubeUrl(e.target.value)}
        placeholder="Paste YouTube URL..."
        className="flex-1 px-3 py-2 border rounded-lg"
        disabled={isProcessing}
      />
      <button
        onClick={handleSubmit}
        disabled={isProcessing || !youtubeUrl}
        className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50"
      >
        {isProcessing ? 'Processing...' : 'Import from YouTube'}
      </button>
    </div>
  );
}