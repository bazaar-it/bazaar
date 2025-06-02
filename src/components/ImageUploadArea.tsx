"use client";
import React, { useState, useRef, useCallback, useEffect } from 'react';
import { nanoid } from 'nanoid';

interface ImageUploadAreaProps {
  projectId: string;
  onUpload: (urls: string[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

interface UploadedImage {
  id: string;
  file: File;
  url: string;
  publicUrl?: string;
  uploading: boolean;
  error?: string;
}

export function ImageUploadArea({ 
  projectId, 
  onUpload, 
  maxImages = 2, 
  disabled = false 
}: ImageUploadAreaProps) {
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    if (!file.type.match(/^image\/(jpeg|jpg|png|webp)$/i)) {
      return 'Only JPEG, PNG, and WebP images are supported';
    }
    if (file.size > 10 * 1024 * 1024) { // 10MB
      return 'Image must be smaller than 10MB';
    }
    return null;
  };

  const uploadToR2 = async (file: File): Promise<string> => {
    // Get presigned URL
    const response = await fetch('/api/r2-presign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        projectId,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to get upload URL');
    }

    const { presignedUrl, publicUrl } = await response.json();

    // Upload directly to R2
    const uploadResponse = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': file.type },
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload image');
    }

    return publicUrl;
  };

  // 🚨 NEW: Auto-update chat when images finish uploading
  useEffect(() => {
    const uploadedUrls = images
      .filter(img => img.publicUrl && !img.uploading && !img.error)
      .map(img => img.publicUrl!);
    
    if (uploadedUrls.length > 0) {
      console.log('[ImageUploadArea] 🖼️ Auto-updating chat with uploaded images:', uploadedUrls);
      onUpload(uploadedUrls);
    }
  }, [images, onUpload]);

  const handleFiles = useCallback(async (files: FileList) => {
    if (disabled) return;

    const fileArray = Array.from(files).slice(0, maxImages - images.length);
    
    for (const file of fileArray) {
      const error = validateFile(file);
      if (error) {
        alert(error);
        continue;
      }

      const imageId = nanoid();
      const newImage: UploadedImage = {
        id: imageId,
        file,
        url: URL.createObjectURL(file),
        uploading: true,
      };

      setImages(prev => [...prev, newImage]);

      try {
        const publicUrl = await uploadToR2(file);
        
        setImages(prev => 
          prev.map(img => 
            img.id === imageId 
              ? { ...img, publicUrl, uploading: false }
              : img
          )
        );
      } catch (error) {
        console.error('Upload failed:', error);
        setImages(prev => 
          prev.map(img => 
            img.id === imageId 
              ? { ...img, uploading: false, error: String(error) }
              : img
          )
        );
      }
    }
  }, [disabled, maxImages, images.length, projectId]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
    }
  }, [handleFiles]);

  const removeImage = (id: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === id);
      if (image) {
        URL.revokeObjectURL(image.url);
      }
      return prev.filter(img => img.id !== id);
    });
  };

  const clearAllImages = () => {
    // Clear images and notify chat
    images.forEach(img => URL.revokeObjectURL(img.url));
    setImages([]);
    onUpload([]); // Clear images from chat state
  };

  // Check if we have successfully uploaded images
  const hasUploadedImages = images.some(img => img.publicUrl && !img.uploading && !img.error);
  const isUploading = images.some(img => img.uploading);
  const hasErrors = images.some(img => img.error);

  return (
    <div className="space-y-3">
      {/* Upload Area */}
      {images.length < maxImages && (
        <div
          className={`
            border-2 border-dashed rounded-lg p-4 text-center transition-colors
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-gray-400'}
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && fileInputRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-2">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <p className="text-sm text-gray-600">
              Drop images here or click to upload
            </p>
            <p className="text-xs text-gray-500">
              PNG, JPG, WebP up to 10MB ({maxImages - images.length} remaining)
            </p>
          </div>
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            disabled={disabled}
          />
        </div>
      )}

      {/* Image Previews */}
      {images.length > 0 && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            {images.map((image) => (
              <div key={image.id} className="relative group">
                <img 
                  src={image.url} 
                  alt="Upload preview"
                  className="w-full h-24 object-cover rounded border"
                />
                
                {/* Upload Status Overlay */}
                {image.uploading && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded">
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                
                {image.error && (
                  <div className="absolute inset-0 bg-red-500 bg-opacity-75 flex items-center justify-center rounded">
                    <p className="text-white text-xs text-center p-1">{image.error}</p>
                  </div>
                )}

                {image.publicUrl && !image.uploading && !image.error && (
                  <div className="absolute inset-0 bg-green-500 bg-opacity-20 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                {/* Remove Button */}
                <button
                  onClick={() => removeImage(image.id)}
                  className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full text-xs hover:bg-red-600 transition-colors"
                >
                  ×
                </button>
              </div>
            ))}
          </div>

          {/* Status Messages */}
          {isUploading && (
            <div className="flex items-center gap-2 text-sm text-blue-600">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span>Uploading images...</span>
            </div>
          )}
          
          {hasUploadedImages && !isUploading && (
            <div className="flex items-center gap-2 text-sm text-green-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span>Images ready! Type your message and send.</span>
            </div>
          )}

          {hasErrors && (
            <div className="text-sm text-red-600">
              Some images failed to upload. Remove them and try again.
            </div>
          )}

          {/* Clear All Button */}
          {images.length > 0 && (
            <button
              onClick={clearAllImages}
              className="w-full px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded hover:bg-gray-50 transition-colors"
            >
              Clear All Images
            </button>
          )}
        </div>
      )}
    </div>
  );
} 