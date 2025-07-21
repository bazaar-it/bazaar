"use client";

import React, { useCallback } from 'react';
import { nanoid } from 'nanoid';
import { Loader2, CheckCircleIcon, XCircleIcon } from 'lucide-react';

export interface UploadedMedia {
  id: string;
  file: File;
  status: 'uploading' | 'uploaded' | 'error';
  url?: string;
  error?: string;
  type?: 'image' | 'video' | 'audio';
  isLoaded?: boolean; // Track if the actual media has loaded
  duration?: number; // For audio files
}

interface MediaUploadProps {
  uploadedMedia: UploadedMedia[];
  onMediaChange: (media: UploadedMedia[]) => void;
  projectId: string;
  disabled?: boolean;
  onAudioSelect?: (audio: UploadedMedia) => void; // Callback when audio is selected for trimming
}

export function MediaUpload({
  uploadedMedia,
  onMediaChange,
  projectId,
  disabled = false,
  onAudioSelect
}: MediaUploadProps) {
  // Image compression utility
  const compressImage = async (file: File): Promise<File> => {
    // Only compress if larger than 1MB
    if (file.size < 1024 * 1024) return file;
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          // Max 1920px width/height
          let { width, height } = img;
          const maxSize = 1920;
          
          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              resolve(new File([blob!], file.name, { type: 'image/jpeg' }));
            },
            'image/jpeg',
            0.85 // 85% quality
          );
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleMediaUpload = useCallback(async (files: File[]) => {
    const newMedia: UploadedMedia[] = files.map(file => ({
      id: nanoid(),
      file,
      status: 'uploading' as const,
      type: file.type.startsWith('video/') ? 'video' : 
            file.type.startsWith('audio/') ? 'audio' : 'image'
    }));

    // Add new media to the list
    const updatedMedia = [...uploadedMedia, ...newMedia];
    onMediaChange(updatedMedia);

    // Upload each media file to R2
    for (const media of newMedia) {
      try {
        // Only compress images, not videos or audio
        const fileToUpload = (media.type === 'video' || media.type === 'audio')
          ? media.file 
          : await compressImage(media.file);
        
        if (media.type === 'image') {
          console.log(`[MediaUpload] 🖼️ Image compressed: ${media.file.size} → ${fileToUpload.size} bytes`);
        } else if (media.type === 'video') {
          console.log(`[MediaUpload] 🎥 Video upload: ${media.file.name} (${(media.file.size / 1024 / 1024).toFixed(2)}MB)`);
        } else if (media.type === 'audio') {
          console.log(`[MediaUpload] 🎵 Audio upload: ${media.file.name} (${(media.file.size / 1024 / 1024).toFixed(2)}MB)`);
        }
        
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('projectId', projectId);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        // Update the specific media with the URL
        onMediaChange(
          updatedMedia.map(m => 
            m.id === media.id 
              ? { ...m, status: 'uploaded' as const, url: result.url, isLoaded: false }
              : m
          )
        );
      } catch (error) {
        console.error('Media upload failed:', error);
        // Update the specific media with error
        onMediaChange(
          updatedMedia.map(m => 
            m.id === media.id 
              ? { ...m, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
              : m
          )
        );
      }
    }
  }, [uploadedMedia, onMediaChange, projectId]);

  const handleDeleteMedia = useCallback((mediaId: string) => {
    onMediaChange(uploadedMedia.filter(m => m.id !== mediaId));
  }, [uploadedMedia, onMediaChange]);

  const handleMediaLoad = useCallback((mediaId: string) => {
    onMediaChange(
      uploadedMedia.map(m => 
        m.id === mediaId 
          ? { ...m, isLoaded: true }
          : m
      )
    );
  }, [uploadedMedia, onMediaChange]);

  if (uploadedMedia.length === 0) return null;

  return (
    <div className="mb-3 flex gap-2 flex-wrap">
      {uploadedMedia.map((media) => (
        <div key={media.id} className="relative border bg-gray-50 flex items-center justify-center group" style={{ borderRadius: '15px' }}>
          {/* Show loading spinner until media is fully loaded */}
          {(media.status === 'uploading' || (media.status === 'uploaded' && (!media.url || !media.isLoaded))) && (
            <div className="w-24 h-24 flex items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
            </div>
          )}
          {media.status === 'error' && (
            <div className="w-24 h-24 flex items-center justify-center">
              <XCircleIcon className="h-6 w-6 text-red-500" />
            </div>
          )}
          {/* Only show media when fully loaded */}
          {media.url && media.status === 'uploaded' && media.isLoaded && (
            media.type === 'video' ? (
              <video 
                src={media.url} 
                className="max-w-32 max-h-32 w-auto h-auto"
                style={{ borderRadius: '15px' }}
                muted
              />
            ) : media.type === 'audio' ? (
              <button
                onClick={() => onAudioSelect?.(media)}
                className="w-24 h-24 flex flex-col items-center justify-center gap-2 hover:bg-gray-100 transition-colors"
                style={{ borderRadius: '15px' }}
              >
                <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
                <span className="text-xs text-gray-600 truncate max-w-20 px-1">
                  {media.file.name}
                </span>
              </button>
            ) : (
              <img 
                src={media.url} 
                alt="Upload preview" 
                className="max-w-32 max-h-32 w-auto h-auto"
                style={{ borderRadius: '15px' }}
              />
            )
          )}
          {/* Hidden preloader to trigger onLoad without affecting layout */}
          {media.url && media.status === 'uploaded' && !media.isLoaded && (
            media.type === 'video' ? (
              <video 
                src={media.url} 
                className="absolute opacity-0 pointer-events-none"
                style={{ left: '-9999px' }}
                muted
                onLoadedData={() => handleMediaLoad(media.id)}
              />
            ) : media.type === 'audio' ? (
              <audio 
                src={media.url} 
                className="absolute opacity-0 pointer-events-none"
                style={{ left: '-9999px' }}
                onLoadedData={() => handleMediaLoad(media.id)}
              />
            ) : (
              <img 
                src={media.url} 
                alt="" 
                className="absolute opacity-0 pointer-events-none"
                style={{ left: '-9999px' }}
                onLoad={() => handleMediaLoad(media.id)}
              />
            )
          )}
          {/* Delete button - always visible for uploaded media, hidden for uploading */}
          {media.status !== 'uploading' && (
            <button
              onClick={() => handleDeleteMedia(media.id)}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 hover:bg-red-500 text-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm transition-colors opacity-40 hover:opacity-100"
              aria-label="Delete media"
            >
              ×
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// Export utility functions for parent component to use
export const createMediaUploadHandlers = (
  uploadedMedia: UploadedMedia[],
  setUploadedMedia: React.Dispatch<React.SetStateAction<UploadedMedia[]>>,
  projectId: string
) => {
  // Image compression utility
  const compressImage = async (file: File): Promise<File> => {
    // Only compress if larger than 1MB
    if (file.size < 1024 * 1024) return file;
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d')!;
          
          // Max 1920px width/height
          let { width, height } = img;
          const maxSize = 1920;
          
          if (width > maxSize || height > maxSize) {
            const ratio = Math.min(maxSize / width, maxSize / height);
            width *= ratio;
            height *= ratio;
          }
          
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              resolve(new File([blob!], file.name, { type: 'image/jpeg' }));
            },
            'image/jpeg',
            0.85 // 85% quality
          );
        };
        img.src = e.target!.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleMediaUpload = async (files: File[]) => {
    const newMedia: UploadedMedia[] = files.map(file => ({
      id: nanoid(),
      file,
      status: 'uploading' as const,
      type: file.type.startsWith('video/') ? 'video' : 
            file.type.startsWith('audio/') ? 'audio' : 'image'
    }));

    setUploadedMedia([...uploadedMedia, ...newMedia]);

    // Upload each media file to R2
    for (const media of newMedia) {
      try {
        // Only compress images, not videos or audio
        const fileToUpload = (media.type === 'video' || media.type === 'audio')
          ? media.file 
          : await compressImage(media.file);
        
        if (media.type === 'image') {
          console.log(`[MediaUpload] 🖼️ Image compressed: ${media.file.size} → ${fileToUpload.size} bytes`);
        } else if (media.type === 'video') {
          console.log(`[MediaUpload] 🎥 Video upload: ${media.file.name} (${(media.file.size / 1024 / 1024).toFixed(2)}MB)`);
        } else if (media.type === 'audio') {
          console.log(`[MediaUpload] 🎵 Audio upload: ${media.file.name} (${(media.file.size / 1024 / 1024).toFixed(2)}MB)`);
        }
        
        const formData = new FormData();
        formData.append('file', fileToUpload);
        formData.append('projectId', projectId);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Upload failed: ${response.statusText}`);
        }

        const result = await response.json();
        
        setUploadedMedia(prev =>
          prev.map(m => 
            m.id === media.id 
              ? { ...m, status: 'uploaded' as const, url: result.url, isLoaded: false }
              : m
          )
        );
      } catch (error) {
        console.error('Media upload failed:', error);
        setUploadedMedia(prev =>
          prev.map(m => 
            m.id === media.id 
              ? { ...m, status: 'error' as const, error: error instanceof Error ? error.message : 'Upload failed' }
              : m
          )
        );
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      handleMediaUpload(files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    
    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')
    );
    
    if (files.length > 0) {
      handleMediaUpload(files);
    }
  };

  return {
    handleMediaUpload,
    handleFileSelect,
    handleDragOver,
    handleDragLeave,
    handleDrop
  };
};