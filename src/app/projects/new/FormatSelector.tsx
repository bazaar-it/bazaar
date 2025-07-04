"use client";

import React, { useState } from 'react';
import { MonitorIcon, SmartphoneIcon, SquareIcon } from 'lucide-react';

export type VideoFormat = 'landscape' | 'portrait' | 'square';

interface FormatOption {
  id: VideoFormat;
  label: string;
  subtitle: string;
  width: number;
  height: number;
  icon: React.ReactNode;
  color: string;
}

const VIDEO_FORMATS: FormatOption[] = [
  { 
    id: 'landscape',
    label: 'Landscape',
    subtitle: '16:9 Horizontal',
    width: 1920,
    height: 1080,
    icon: <MonitorIcon className="w-8 h-8" />,
    color: 'from-blue-500 to-indigo-600'
  },
  { 
    id: 'portrait',
    label: 'Portrait',
    subtitle: '9:16 Vertical', 
    width: 1080,
    height: 1920,
    icon: <SmartphoneIcon className="w-8 h-8" />,
    color: 'from-pink-500 to-purple-600'
  },
  { 
    id: 'square',
    label: 'Square',
    subtitle: '1:1 Ratio',
    width: 1080,
    height: 1080,
    icon: <SquareIcon className="w-8 h-8" />,
    color: 'from-orange-500 to-red-600'
  }
];

interface FormatSelectorProps {
  onSelect: (format: VideoFormat) => void;
  isCreating?: boolean;
  showHeader?: boolean;
}

export function FormatSelector({ onSelect, isCreating = false, showHeader = true }: FormatSelectorProps) {
  const [selectedFormat, setSelectedFormat] = useState<VideoFormat | null>(null);
  
  const handleSelect = (format: VideoFormat) => {
    setSelectedFormat(format);
    onSelect(format);
  };
  
  return (
    <div className={showHeader ? "w-full max-w-5xl mx-auto p-8" : "w-full"}>
      {/* Header */}
      {showHeader && (
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Choose Your Video Format
          </h1>
          <p className="text-gray-600 text-lg">Select the format that best fits your platform</p>
        </div>
      )}
      
      {/* Format Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {VIDEO_FORMATS.map(format => {
          const isSelected = selectedFormat === format.id;
          const isLoading = isSelected && isCreating;
          
          return (
            <button
              key={format.id}
              onClick={() => handleSelect(format.id)}
              disabled={isCreating}
              className={`
                relative group overflow-hidden rounded-2xl transition-all duration-300
                ${isCreating && !isSelected ? 'opacity-50' : ''}
                ${isLoading ? 'scale-95' : 'hover:scale-105'}
              `}
            >
              {/* Glassmorphism Background */}
              <div className={`
                absolute inset-0 bg-gradient-to-br ${format.color} opacity-10 
                group-hover:opacity-20 transition-opacity duration-300
              `} />
              
              {/* Glass Effect */}
              <div className={`
                relative backdrop-blur-sm bg-white/70 border border-white/20 
                rounded-2xl p-8 transition-all duration-300
                ${isSelected ? 'ring-4 ring-offset-2 ring-blue-500/50' : ''}
                ${!isCreating ? 'hover:bg-white/80 hover:shadow-2xl' : ''}
              `}>
                {/* Loading Overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-white/60 backdrop-blur-sm rounded-2xl flex items-center justify-center z-10">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-3 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                      <p className="text-sm font-medium text-gray-700">Creating project...</p>
                    </div>
                  </div>
                )}
                
                {/* Icon with gradient background */}
                <div className={`
                  w-16 h-16 rounded-xl bg-gradient-to-br ${format.color} 
                  flex items-center justify-center text-white mb-6 mx-auto
                  transition-transform duration-300 ${!isCreating ? 'group-hover:scale-110' : ''}
                `}>
                  {format.icon}
                </div>
                
                {/* Format Info */}
                <h3 className="text-xl font-semibold mb-2 text-gray-800">{format.label}</h3>
                <p className="text-sm text-gray-600 mb-6">{format.subtitle}</p>
                
                {/* Visual Preview */}
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <div 
                      className={`
                        border-2 transition-all duration-300
                        ${isSelected ? 'border-blue-500' : 'border-gray-300 group-hover:border-gray-400'}
                      `}
                      style={{
                        width: format.width / 18,
                        height: format.height / 18,
                        maxWidth: '100px',
                        maxHeight: '100px'
                      }}
                    >
                      {/* Animated inner content */}
                      <div className={`
                        absolute inset-1 bg-gradient-to-br ${format.color} opacity-20
                        ${!isCreating ? 'group-hover:opacity-30' : ''} transition-opacity
                      `} />
                    </div>
                  </div>
                </div>
                
                {/* Dimensions */}
                <p className="text-xs text-gray-500 font-mono">
                  {format.width} × {format.height}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      
    </div>
  );
}