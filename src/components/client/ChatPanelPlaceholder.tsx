// src/components/client/ChatPanelPlaceholder.tsx
"use client";

import React from 'react';

export function ChatPanelPlaceholder() {
  return (
    <div className="flex flex-col h-full">
      <h2 className="text-xl font-semibold mb-4">Chat Panel</h2>
      
      <div className="flex-1 bg-gray-100 rounded-lg p-4 mb-4 overflow-auto">
        <div className="bg-blue-100 p-3 rounded-lg mb-3 max-w-[80%]">
          <p className="text-sm">Hello! I'm your AI assistant. You can describe what edits you'd like to make to your video, and I'll update the preview.</p>
        </div>
        
        <div className="bg-gray-200 p-3 rounded-lg mb-3 ml-auto max-w-[80%]">
          <p className="text-sm">This is a placeholder message. The chat functionality will be implemented in future sprints.</p>
        </div>
      </div>
      
      <div className="border rounded-lg p-2">
        <div className="flex items-center">
          <textarea 
            placeholder="Describe edits to your video..." 
            disabled
            className="flex-1 resize-none p-2 bg-transparent text-gray-400"
            rows={2}
          />
          <button 
            className="bg-blue-500 text-white rounded-md px-4 py-2 ml-2 opacity-50 cursor-not-allowed"
            disabled
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
} 