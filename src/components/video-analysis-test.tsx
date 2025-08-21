'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';

export function VideoAnalysisTest() {
  const [youtubeUrl, setYoutubeUrl] = useState('https://www.youtube.com/watch?v=v-EYzZCLF48');
  const [analysis, setAnalysis] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const analyzeVideo = api.videoAnalysis.testYouTubeAnalysis.useMutation({
    onSuccess: (data) => {
      setAnalysis(data.analysis);
      setCode(''); // Clear code when doing analysis only
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('Analysis failed:', error);
      setIsLoading(false);
    }
  });

  const youtubeToCode = api.videoAnalysis.youtubeToCode.useMutation({
    onSuccess: (data) => {
      setCode(data.code || '');
      setAnalysis(data.analysis || '');
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('Code generation failed:', error);
      setIsLoading(false);
    }
  });

  const directToCode = api.videoAnalysis.directYouTubeToCode.useMutation({
    onSuccess: (data) => {
      setCode(data.code || '');
      setAnalysis(''); // No analysis in direct mode
      setIsLoading(false);
    },
    onError: (error) => {
      console.error('Direct code generation failed:', error);
      setIsLoading(false);
    }
  });

  const handleAnalyze = () => {
    setIsLoading(true);
    analyzeVideo.mutate({ youtubeUrl });
  };

  const handleGenerateCode = () => {
    setIsLoading(true);
    youtubeToCode.mutate({ 
      youtubeUrl,
      projectFormat: 'landscape' 
    });
  };

  const handleDirectToCode = () => {
    setIsLoading(true);
    directToCode.mutate({ youtubeUrl });
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">YouTube Video to Remotion Code</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">YouTube URL</label>
        <input
          type="text"
          value={youtubeUrl}
          onChange={(e) => setYoutubeUrl(e.target.value)}
          className="w-full p-2 border rounded"
          placeholder="https://www.youtube.com/watch?v=..."
        />
      </div>
      
      <div className="flex gap-4 mb-6">
        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {analyzeVideo.isPending ? 'Analyzing...' : 'Analyze Video Only'}
        </button>
        
        <button
          onClick={handleGenerateCode}
          disabled={isLoading}
          className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:opacity-50"
        >
          {youtubeToCode.isPending ? 'Generating...' : '2-Step (Analysis + Code)'}
        </button>
        
        <button
          onClick={handleDirectToCode}
          disabled={isLoading}
          className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:opacity-50"
        >
          {directToCode.isPending ? 'Generating...' : 'Direct Gemini to Code'}
        </button>
      </div>
      
      {code && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Generated Remotion Code:</h3>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded overflow-auto text-sm">
            <code>{code}</code>
          </pre>
        </div>
      )}
      
      {analysis && (
        <div className="mt-6">
          <h3 className="text-lg font-semibold mb-2">Video Analysis:</h3>
          <pre className="bg-gray-100 p-4 rounded overflow-auto whitespace-pre-wrap text-sm">
            {analysis}
          </pre>
        </div>
      )}
    </div>
  );
}