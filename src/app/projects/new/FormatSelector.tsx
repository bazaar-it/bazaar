"use client";

import React from 'react';

export type VideoFormat = 'landscape' | 'portrait' | 'square';

interface FormatOption {
  id: VideoFormat;
  label: string;
  subtitle: string;
  width: number;
  height: number;
  icon: string;
}

const VIDEO_FORMATS: FormatOption[] = [
  { 
    id: 'landscape',
    label: 'YouTube / Desktop',
    subtitle: '16:9 Landscape',
    width: 1920,
    height: 1080,
    icon: '🖥️'
  },
  { 
    id: 'portrait',
    label: 'TikTok / Reels',
    subtitle: '9:16 Portrait', 
    width: 1080,
    height: 1920,
    icon: '📱'
  },
  { 
    id: 'square',
    label: 'Instagram Post',
    subtitle: '1:1 Square',
    width: 1080,
    height: 1080,
    icon: '□'
  }
];

interface FormatSelectorProps {
  onSelect: (format: VideoFormat) => void;
}

export function FormatSelector({ onSelect }: FormatSelectorProps) {
  return (
    <div className="w-full max-w-4xl mx-auto p-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Choose Your Video Format</h1>
        <p className="text-gray-600">Select the format that best fits your platform</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {VIDEO_FORMATS.map(format => (
          <button
            key={format.id}
            onClick={() => onSelect(format.id)}
            className="group relative p-8 bg-white border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:shadow-lg transition-all duration-200"
          >
            {/* Format Icon */}
            <div className="text-5xl mb-4">{format.icon}</div>
            
            {/* Format Info */}
            <h3 className="text-lg font-semibold mb-1">{format.label}</h3>
            <p className="text-sm text-gray-500 mb-4">{format.subtitle}</p>
            
            {/* Visual Preview */}
            <div className="flex justify-center">
              <div 
                className="border-2 border-gray-300 group-hover:border-blue-400 transition-colors"
                style={{
                  width: format.width / 15,
                  height: format.height / 15,
                  maxWidth: '100px',
                  maxHeight: '100px'
                }}
              />
            </div>
            
            {/* Dimensions */}
            <p className="text-xs text-gray-400 mt-3">
              {format.width} × {format.height}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}