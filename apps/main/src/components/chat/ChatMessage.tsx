"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Undo2, AlertCircle } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '~/stores/videoState';
import { GeneratingMessage } from './GeneratingMessage';
import { api } from '~/trpc/react';

interface ChatMessageProps {
  message: ChatMessageType;
  onImageClick?: (imageUrl: string) => void;
  projectId?: string;
  onRevert?: (messageId: string) => void;
  hasIterations?: boolean;
}

export function ChatMessage({ message, onImageClick, projectId, onRevert, hasIterations: hasIterationsProp }: ChatMessageProps) {
  const [confirmMode, setConfirmMode] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Only query if hasIterations prop not provided (backward compatibility)
  const { data: iterations, isLoading: isChecking } = api.generation.getMessageIterations.useQuery(
    { messageId: message.id! },
    { 
      enabled: hasIterationsProp === undefined && !message.isUser && !!message.id && !!projectId,
      staleTime: 60000, // Cache for 1 minute
    }
  );
  
  const hasIterations = hasIterationsProp ?? ((iterations?.length ?? 0) > 0);
  
  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleRestoreClick = () => {
    if (!confirmMode) {
      // First click - enter confirm mode
      setConfirmMode(true);
      
      // Auto-reset after 3 seconds if no second click
      timeoutRef.current = setTimeout(() => {
        setConfirmMode(false);
      }, 3000);
    } else {
      // Second click - execute restore
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setConfirmMode(false);
      if (onRevert && message.id) {
        onRevert(message.id);
      }
    }
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <div
      className={`flex ${message.isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-[80%] ${
          message.isUser
            ? "bg-black text-white rounded-2xl px-4 py-3"
            : "bg-gray-100 text-gray-900 rounded-2xl px-4 py-3"
        }`}
      >
        <div className="space-y-2">
            {/* Show uploaded images for user messages */}
            {message.isUser && message.imageUrls && message.imageUrls.length > 0 && (
              <div className="space-y-2 mb-2">
                <div className="grid grid-cols-2 gap-2">
                  {message.imageUrls.map((imageUrl: string, index: number) => (
                    <div 
                      key={index} 
                      className="relative cursor-pointer"
                      onClick={() => onImageClick?.(imageUrl)}
                    >
                      <img 
                        src={imageUrl} 
                        alt={`Uploaded image ${index + 1}`}
                        className="w-full h-20 object-cover rounded border"
                      />
                      <div className="absolute top-1 right-1 bg-green-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                        ✓
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-1 text-xs opacity-75">
                  <span>📎</span>
                  <span>{message.imageUrls.length} image{message.imageUrls.length > 1 ? 's' : ''} included</span>
                </div>
              </div>
            )}
            
            <div className="text-sm leading-relaxed">
              {/* Always use GeneratingMessage component for "Generating code" messages */}
              {!message.isUser && 
               (message.message === "Generating code" || 
                message.message === "Generating code..." || 
                message.message === "Generating code...." || 
                message.message.startsWith("Generating code")) && 
               message.status === "pending" ? (
                <GeneratingMessage />
              ) : (
                <span>{message.message}</span>
              )}
            </div>
            
            {/* Timestamp and revert button */}
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs opacity-50">{formatTimestamp(message.timestamp)}</span>
              <div className="flex items-center gap-2">
                {message.status === "error" && (
                  <span className="text-xs text-red-500">Failed</span>
                )}
                {!message.isUser && hasIterations && onRevert && message.id && (
                  <button
                    onClick={handleRestoreClick}
                    className={`text-xs flex items-center gap-1 transition-colors ${
                      confirmMode 
                        ? 'text-red-500 hover:text-red-700' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={confirmMode ? "Click again to confirm" : "Restore to this version"}
                  >
                    {confirmMode ? (
                      <>
                        <AlertCircle className="h-3 w-3" />
                        <span>Are you sure?</span>
                      </>
                    ) : (
                      <>
                        <Undo2 className="h-3 w-3" />
                        <span>Restore</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
      </div>
    </div>
  );
}