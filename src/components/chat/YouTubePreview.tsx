import React from 'react';
import { ExternalLink, Play } from 'lucide-react';

interface YouTubePreviewProps {
  url: string;
  className?: string;
}

export function YouTubePreview({ url, className = '' }: YouTubePreviewProps) {
  // Extract video ID from various YouTube URL formats
  const getVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  };

  const videoId = getVideoId(url);
  if (!videoId) return null;

  // YouTube thumbnail URL (high quality)
  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
  // Fallback to medium quality if high quality doesn't exist
  const fallbackThumbnail = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;

  return (
    <div className={`rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-white dark:bg-gray-800 ${className}`}>
      <div className="relative group">
        <img 
          src={thumbnailUrl}
          alt="YouTube video thumbnail"
          className="w-full h-40 object-cover"
          onError={(e) => {
            // Fallback to medium quality thumbnail
            const img = e.target as HTMLImageElement;
            if (img.src !== fallbackThumbnail) {
              img.src = fallbackThumbnail;
            }
          }}
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="bg-red-600 rounded-full p-3">
            <Play className="w-6 h-6 text-white fill-white ml-0.5" />
          </div>
        </div>
        <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
          YouTube Reference
        </div>
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              YouTube Video Reference
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Video ID: {videoId}
            </p>
          </div>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
            title="Open in YouTube"
          >
            <ExternalLink className="w-4 h-4 text-gray-500 dark:text-gray-400" />
          </a>
        </div>
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
          <p className="text-xs text-gray-600 dark:text-gray-300">
            📹 This video will be analyzed for style and motion reference
          </p>
        </div>
      </div>
    </div>
  );
}