"use client";

import React, { useCallback } from 'react';
import { XIcon } from 'lucide-react';

export interface UploadedIcon {
  id: string;
  iconName: string;
  svgContent: string;
  prefix: string;
  name: string;
}

interface IconUploadProps {
  uploadedIcons: UploadedIcon[];
  onIconsChange: (icons: UploadedIcon[]) => void;
  disabled?: boolean;
}

export function IconUpload({
  uploadedIcons,
  onIconsChange,
  disabled = false
}: IconUploadProps) {
  const handleDeleteIcon = useCallback((iconId: string) => {
    onIconsChange(uploadedIcons.filter(icon => icon.id !== iconId));
  }, [uploadedIcons, onIconsChange]);

  if (uploadedIcons.length === 0) return null;

  return (
    <div className="mb-3 flex gap-2 flex-wrap">
      {uploadedIcons.map((icon) => (
        <div key={icon.id} className="relative border bg-gray-50 flex items-center justify-center group" style={{ borderRadius: '15px' }}>
          <div className="w-24 h-24 p-2 flex items-center justify-center">
            <div 
              className="w-full h-full text-gray-700 dark:text-gray-300"
              dangerouslySetInnerHTML={{ 
                __html: icon.svgContent.replace(
                  '<svg',
                  '<svg style="width: 100%; height: 100%; max-width: 100%; max-height: 100%;"'
                )
              }}
              title={`${icon.prefix}:${icon.name}`}
            />
          </div>
          
          {/* Delete button */}
          <button
            onClick={() => handleDeleteIcon(icon.id)}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-colors opacity-40 hover:opacity-100"
            aria-label="Delete icon"
            disabled={disabled}
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
} 