//src/client/components/custom-component/ComponentStatusSSE.tsx

import React, { useEffect, useRef } from "react";
import { useTaskStatus } from "~/client/hooks/sse";
import { api } from "~/trpc/react";

// Simple spinner component for loading states
const Spinner = ({ className }: { className?: string }) => (
  <div className={`animate-spin ${className || ''}`}>
    ⟳
  </div>
);

interface ComponentStatusSSEProps {
  componentId: string;
  onSuccess?: (outputUrl: string) => void;
  onStatusChange?: (status: string, outputUrl?: string) => void;
  collapsed?: boolean;
}

/**
 * A2A-compliant component for displaying the status of a custom component job
 * 
 * Uses SSE instead of polling for real-time updates.
 * 
 * @param componentId UUID of the custom component job
 * @param onSuccess Optional callback for when the job succeeds
 * @param onStatusChange Optional callback for any status change
 * @param collapsed Whether to show a condensed view (for sidebar)
 */
export function ComponentStatusSSE({
  componentId,
  onSuccess,
  onStatusChange,
  collapsed
}: ComponentStatusSSEProps) {
  // Track previous values to prevent duplicate callbacks
  const prevStatusRef = useRef<string | null>(null);
  const prevOutputUrlRef = useRef<string | null>(null);

  // Use our task status hook to get real-time updates via SSE
  const { status, isLoading, error } = useTaskStatus(componentId, {
    onStatusChange: (updatedStatus) => {
      // Extract task state and artifacts if any
      if (!updatedStatus) return;
      
      const state = updatedStatus.state;
      // Find the artifact that might contain the output URL
      const outputArtifact = updatedStatus.artifacts?.find(
        artifact => artifact.type === 'file' && artifact.mimeType === 'application/javascript'
      );
      const outputUrl = outputArtifact?.url;
      
      // Map A2A states to our component states
      let componentStatus = state;
      switch (state) {
        case 'submitted':
          componentStatus = 'pending';
          break;
        case 'working':
          componentStatus = 'building';
          break;
        case 'completed':
          componentStatus = 'complete';
          break;
        case 'failed':
          componentStatus = 'error';
          break;
      }

      // Call the onStatusChange callback if provided
      if (onStatusChange) {
        onStatusChange(componentStatus, outputUrl);
      }

      // Call onSuccess if the component is completed and has outputUrl
      if (state === 'completed' && outputUrl && onSuccess) {
        onSuccess(outputUrl);
      }
    }
  });

  // Handle error states
  if (error) {
    return (
      <div className="text-red-500">
        <span className="text-xs">❌ Status unavailable</span>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-slate-500">
        <Spinner className="h-4 w-4" />
        <span className="text-xs">Loading...</span>
      </div>
    );
  }

  // If no status available
  if (!status) {
    return (
      <div className="text-red-500">
        <span className="text-xs">❌ Not found</span>
      </div>
    );
  }

  // Find output URL artifact if available
  const outputArtifact = status.artifacts?.find(
    artifact => artifact.type === 'file' && artifact.mimeType === 'application/javascript'
  );
  const outputUrl = outputArtifact?.url;
  const errorMessage = status.message?.parts?.[0]?.text;

  // Render different UI based on status
  switch (status.state) {
    case "submitted":
      return (
        <div className="flex items-center gap-1 text-amber-500">
          <Spinner className="h-3 w-3" />
          <span className="text-xs">Queued</span>
        </div>
      );
    
    case "working":
      return (
        <div className="flex items-center gap-1 text-blue-500">
          <Spinner className="h-3 w-3" />
          <span className="text-xs">Building</span>
        </div>
      );
    
    case "completed":
      return (
        <div 
          title={outputUrl ? `URL: ${outputUrl}` : 'Missing output URL! Use the debug button to fix.'} 
          className={`text-green-500 flex items-center gap-1 ${!outputUrl ? 'opacity-50' : ''}`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span className="text-xs">{outputUrl ? 'Ready' : 'Ready*'}</span>
        </div>
      );
    
    case "failed":
      return (
        <div className="text-red-500">
          <div className="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="15" y1="9" x2="9" y2="15"></line>
              <line x1="9" y1="9" x2="15" y2="15"></line>
            </svg>
            <span className="text-xs">Error</span>
          </div>
          {errorMessage && !collapsed && (
            <div className="mt-1 text-xs bg-red-50 p-1 rounded-md border border-red-200 max-w-[200px] truncate">
              {errorMessage}
            </div>
          )}
        </div>
      );
    
    case "input-required":
      return (
        <div className="flex items-center gap-1 text-purple-500">
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span className="text-xs">Input Required</span>
        </div>
      );
    
    default:
      return <div className="text-xs">Unknown: {status.state}</div>;
  }
}
