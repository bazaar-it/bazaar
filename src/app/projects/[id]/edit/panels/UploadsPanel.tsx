// src/app/projects/[id]/edit/panels/UploadsPanel.tsx
"use client";

import React, { useState } from 'react';

export default function UploadsPanel({ projectId }: { projectId: string }) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<string[]>([]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    // This is just a placeholder - in a real implementation, 
    // we would upload the files to a storage service
    if (e.dataTransfer.files) {
      const newUploads = Array.from(e.dataTransfer.files).map(file => file.name);
      setUploads(prev => [...prev, ...newUploads]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newUploads = Array.from(e.target.files).map(file => file.name);
      setUploads(prev => [...prev, ...newUploads]);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white/95 rounded-[15px] shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 mb-4">
        <h2 className="text-lg font-medium">Uploads</h2>
        <p className="text-sm text-muted-foreground">Upload media files</p>
      </div>
      
      <div 
        className={`flex-1 border-2 border-dashed rounded-[15px] shadow-sm p-8 m-4 flex flex-col items-center justify-center ${
          isDragging ? 'border-blue-500 bg-blue-50/30' : 'border-gray-200 bg-gray-50/30'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 mb-4">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        
        <p className="text-lg text-center mb-2">
          Drag and drop files here
        </p>
        <p className="text-sm text-muted-foreground text-center mb-4">
          Or click to select files
        </p>
        
        <label className="px-4 py-2 bg-primary text-primary-foreground rounded-[15px] shadow-sm hover:bg-primary/90 transition-colors cursor-pointer">
          Select Files
          <input 
            type="file" 
            multiple 
            className="hidden" 
            onChange={handleFileChange}
          />
        </label>
      </div>
      
      {/* Uploaded files */}
      {uploads.length > 0 && (
        <div className="overflow-auto px-4 pb-4">
          <h3 className="font-medium mb-2">Uploaded Files</h3>
          <ul className="divide-y divide-gray-100 border border-gray-100 rounded-[15px] shadow-sm overflow-hidden">
            {uploads.map((filename, index) => (
              <li key={index} className="py-2 px-3 flex items-center justify-between hover:bg-gray-50">
                <span className="truncate">{filename}</span>
                <button 
                  className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                  onClick={() => setUploads(uploads.filter((_, i) => i !== index))}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
} 