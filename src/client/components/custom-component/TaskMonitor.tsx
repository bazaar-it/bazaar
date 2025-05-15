//src/client/components/custom-component/TaskMonitor.tsx

'use client';

import { useState, useEffect } from 'react';
import { useTaskStatus } from '~/client/hooks/sse';
import { ArtifactViewer } from './ArtifactViewer';
import { TaskInputForm } from './TaskInputForm';
import { ComponentStatusSSE } from './ComponentStatusSSE';

interface TaskMonitorProps {
  taskId: string;
  onTaskComplete?: (outputUrl?: string) => void;
  className?: string;
  showArtifacts?: boolean;
}

/**
 * Complete A2A task monitoring component
 * 
 * Combines real-time status updates, artifact viewing, and input handling
 * for comprehensive task monitoring and interaction.
 */
export function TaskMonitor({
  taskId,
  onTaskComplete,
  className = '',
  showArtifacts = true
}: TaskMonitorProps) {
  const [isInputRequired, setIsInputRequired] = useState(false);
  const [prompt, setPrompt] = useState<string | undefined>();

  // Use the task status hook to get real-time updates
  const { status, isLoading, error, refresh } = useTaskStatus(taskId, {
    onStatusChange: (updatedStatus) => {
      if (!updatedStatus) return;
      
      // Set input required state when applicable
      setIsInputRequired(updatedStatus.state === 'input-required');
      
      // Extract prompt from message if present
      if (updatedStatus.state === 'input-required' && updatedStatus.message?.parts?.[0]?.text) {
        setPrompt(updatedStatus.message.parts[0].text);
      }
      
      // Call completion callback if task is completed
      if (updatedStatus.state === 'completed' && onTaskComplete) {
        // Find the output URL artifact if available
        const outputArtifact = updatedStatus.artifacts?.find(
          artifact => artifact.type === 'file' && artifact.mimeType === 'application/javascript'
        );
        
        onTaskComplete(outputArtifact?.url);
      }
    }
  });

  // Handle input submission completion
  const handleInputSubmitComplete = () => {
    setIsInputRequired(false);
    setPrompt(undefined);
    refresh();
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Status display */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">
          Task: <span className="font-mono text-xs">{taskId.substring(0, 12)}...</span>
        </h3>
        <ComponentStatusSSE componentId={taskId} />
      </div>
      
      {/* Display error if any */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-600">
          {error.message || 'Error loading task status'}
        </div>
      )}
      
      {/* Input form when input is required */}
      {isInputRequired && (
        <TaskInputForm
          taskId={taskId}
          prompt={prompt}
          onSubmitComplete={handleInputSubmitComplete}
        />
      )}
      
      {/* Artifact display */}
      {showArtifacts && status?.artifacts && status.artifacts.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Artifacts</h4>
          <ArtifactViewer artifacts={status.artifacts} />
        </div>
      )}
      
      {/* Status message display */}
      {status?.message?.parts?.[0]?.text && !isInputRequired && (
        <div className="p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm">
          {status.message.parts[0].text}
        </div>
      )}
    </div>
  );
}
