"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Undo2, AlertCircle, Play } from 'lucide-react';
import type { ChatMessage as ChatMessageType } from '~/stores/videoState';
import { useVideoState } from '~/stores/videoState';
import { GeneratingMessage } from './GeneratingMessage';
import { api } from '~/trpc/react';
import { toast } from 'sonner';

interface ChatMessageProps {
  message: ChatMessageType;
  onImageClick?: (imageUrl: string) => void;
  projectId?: string;
  onRevert?: (messageId: string) => void;
  hasIterations?: boolean;
  userId?: string;
  onEditScenePlan?: (prompt: string) => void;
  isFirstScenePlan?: boolean;
  totalScenePlans?: number;
}

// Create All Scenes Button Component  
function CreateAllScenesButton({ projectId, userId, totalScenePlans, scenePlanMessageIds }: { 
  projectId: string; 
  userId: string; 
  totalScenePlans: number;
  scenePlanMessageIds?: string[];
}) {
  const utils = api.useUtils();
  const [hasBeenClicked, setHasBeenClicked] = React.useState(false);
  const { setSceneGenerating, clearAllGeneratingScenes } = useVideoState();
  
  const createAllMutation = api.createSceneFromPlan.createAllScenes.useMutation({
    onSuccess: async (result) => {
      if (result.success && result.summary) {
        toast.success(`Created ${result.summary.successful} scenes successfully!`);
        
        // Invalidate queries to refresh UI
        await utils.generation.getProjectScenes.invalidate({ projectId });
        await utils.chat.getMessages.invalidate({ projectId });
        
        // Dispatch events for UI updates
        window.dispatchEvent(new CustomEvent('scenes-created-bulk', { 
          detail: { 
            projectId,
            count: result.summary.successful
          } 
        }));
        
        if (result.errors.length > 0) {
          toast.warning(`Note: ${result.errors.length} scenes failed to create`);
        }
      } else {
        toast.error(result.error || 'Failed to create scenes');
      }
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
    onSettled: () => {
      // Clear all generating states when mutation completes
      clearAllGeneratingScenes(projectId);
    }
  });
  
  return (
    <button
      onClick={() => {
        setHasBeenClicked(true);
        
        // Mark all scene plan messages as generating
        if (scenePlanMessageIds) {
          scenePlanMessageIds.forEach(messageId => {
            setSceneGenerating(projectId, messageId, true);
          });
        }
        
        createAllMutation.mutate({ projectId, userId });
      }}
      disabled={createAllMutation.isPending || hasBeenClicked}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ml-1 ${
        createAllMutation.isPending 
          ? 'bg-gradient-to-r from-orange-500 to-orange-600 text-white shadow-sm cursor-wait' 
          : hasBeenClicked
          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-gradient-to-r from-gray-800 to-gray-900 hover:from-black hover:to-gray-800 text-white shadow-sm hover:shadow-md transform hover:scale-[1.02]'
      }`}
      title={
        createAllMutation.isPending 
          ? 'Creating all scenes...' 
          : hasBeenClicked 
          ? 'Scenes already created' 
          : `Create all ${totalScenePlans} scenes`
      }
    >
      {createAllMutation.isPending ? (
        <>
          <div className="animate-spin rounded-full h-3.5 w-3.5 border-2 border-white border-t-transparent"></div>
          <span>Creating All...</span>
        </>
      ) : hasBeenClicked ? (
        <>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>Created</span>
        </>
      ) : (
        <>
          <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
          </svg>
          <span>Create All ({totalScenePlans})</span>
        </>
      )}
    </button>
  );
}

function ChatMessageComponent({ message, onImageClick, projectId, onRevert, hasIterations: hasIterationsProp, userId, onEditScenePlan, isFirstScenePlan, totalScenePlans }: ChatMessageProps) {
  // Get tRPC utils for cache invalidation
  const utils = api.useUtils();
  
  // Get scene generation state from videoState
  const { isSceneGenerating, setSceneGenerating } = useVideoState();
  
  // Only query if hasIterations prop not provided (backward compatibility)
  const { data: iterations, isLoading: isChecking } = api.generation.getMessageIterations.useQuery(
    { messageId: message.id! },
    { 
      enabled: hasIterationsProp === undefined && !message.isUser && !!message.id && !!projectId,
      staleTime: 0, // Always fetch fresh data to ensure restore button shows immediately
      refetchInterval: false, // Don't poll, but always get fresh data on mount
    }
  );
  
  // Scene creation mutation with comprehensive error handling
  const createSceneMutation = api.createSceneFromPlan.createScene.useMutation({
    onMutate: () => {
      // Mark this scene as generating when mutation starts
      if (projectId && message.id) {
        setSceneGenerating(projectId, message.id, true);
      }
    },
    onSuccess: async (result) => {
      console.log('[ChatMessage] Scene creation result:', result);
      try {
        if (result?.success) {
          console.log('[ChatMessage] Scene created successfully:', result.scene?.name);
          toast.success(`Scene created: ${result.scene?.name || 'Unnamed Scene'}`);
          
          // Invalidate tRPC cache to refresh data
          if (projectId) {
            await utils.generation.getProjectScenes.invalidate({ projectId });
            await utils.chat.getMessages.invalidate({ projectId });
          }
          
          // Dispatch custom events to notify components of scene creation
          window.dispatchEvent(new CustomEvent('scene-created', { 
            detail: { 
              sceneId: result.scene?.id,
              sceneName: result.scene?.name,
              projectId 
            } 
          }));
          
          // Notify video player to refresh
          window.dispatchEvent(new CustomEvent('videostate-update', {
            detail: { projectId, type: 'scene-added' }
          }));
        } else {
          console.error('[ChatMessage] Scene creation failed:', result?.error || result?.message);
          toast.error(`Failed to create scene: ${result?.message || result?.error || 'Unknown error'}`);
        }
      } catch (handleError) {
        console.error('[ChatMessage] Error handling scene creation result:', handleError);
        toast.error('Failed to process scene creation result');
      }
    },
    onError: (error) => {
      console.error('[ChatMessage] Scene creation mutation error:', error);
      try {
        // Extract useful error message from tRPC error
        let errorMessage = 'Unknown error occurred';
        
        if (typeof error.message === 'string') {
          errorMessage = error.message;
        } else if (error.shape?.message) {
          errorMessage = error.shape.message;
        } else if (error.data?.zodError) {
          errorMessage = 'Validation error occurred';
        } else if (typeof error === 'string') {
          errorMessage = error;
        }
        
        // Show user-friendly error message
        toast.error(`Error creating scene: ${errorMessage}`);
      } catch (handleError) {
        console.error('[ChatMessage] Error handling mutation error:', handleError);
        toast.error('Failed to create scene - unexpected error');
      }
    },
    onSettled: () => {
      // Clear generating state when mutation completes (success or error)
      if (projectId && message.id) {
        setSceneGenerating(projectId, message.id, false);
      }
    }
  });
  
  // Check if any iterations have actual code changes (not just duration/metadata changes)
  const hasCodeChanges = iterations?.some(iteration => 
    iteration.codeBefore !== iteration.codeAfter && 
    iteration.operationType !== 'delete' // Delete operations can be restored even without code changes
  ) ?? false;
  
  const hasIterations = hasIterationsProp ?? (hasCodeChanges || iterations?.some(i => i.operationType === 'delete'));
  
  // Check if this is an error message with auto-fix capability
  const isErrorMessage = message.status === 'error' && message.message.includes('Scene Compilation Error');
  
  // Check if this is a scene plan message
  // Check if this is a scene plan that hasn't been created yet
  const isScenePlan = message.kind === 'scene_plan' && 
                      !message.message.includes('created successfully') &&
                      message.status !== 'success';
  
  // Check if this is the main scene plan overview message (contains Create All button)
  const isScenePlanOverview = message.message.includes('<!-- SCENE_PLAN_OVERVIEW:');
  
  // Check if this is a scene creation success message
  const isSceneSuccess = message.kind === 'status' && 
    message.status === 'success' && 
    message.message.includes('created successfully');
  
  // Extract scene number from success message for color matching
  const extractSceneNumberFromSuccess = (successMessage: string): number | null => {
    const match = successMessage.match(/Scene (\d+) created successfully/);
    return match && match[1] ? parseInt(match[1]) : null;
  };
  
  const successSceneNumber = isSceneSuccess ? extractSceneNumberFromSuccess(message.message) : null;
  
  // Check if this specific scene plan is currently generating
  const isCurrentlyGenerating = isScenePlan && message.id && projectId ? 
    isSceneGenerating(projectId, message.id) : false;
  
  // Extract scene plan data if available
  const scenePlanData = isScenePlan ? (() => {
    const match = message.message.match(/<!-- SCENE_PLAN_DATA:(.*) -->/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        console.warn('Failed to parse scene plan data:', e);
        return null;
      }
    }
    return null;
  })() : null;
  
  // Extract scene plan overview data if available
  const scenePlanOverviewData = isScenePlanOverview ? (() => {
    const match = message.message.match(/<!-- SCENE_PLAN_OVERVIEW:(.*) -->/);
    if (match && match[1]) {
      try {
        return JSON.parse(match[1]);
      } catch (e) {
        console.warn('Failed to parse scene plan overview data:', e);
        return null;
      }
    }
    return null;
  })() : null;
  
  // Format timestamp for display
  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Simplified restore click handler - no confirmation needed
  const handleRestoreClick = () => {
    if (onRevert && message.id) {
      onRevert(message.id);
    }
  };

  // DISABLED: Old auto-fix system replaced by silent auto-fix
  const handleAutoFixClick = () => {
    console.warn('[ChatMessage] Manual auto-fix disabled - using silent auto-fix system');
    // Old auto-fix implementation removed to prevent conflicts
    // The new silent auto-fix system handles all error fixes automatically
  };

  // Handle create scene click
  const handleCreateSceneClick = () => {
    if (isScenePlan && message.id && projectId && userId) {
      console.log('[ChatMessage] Creating scene:', { messageId: message.id, projectId, userId });
      createSceneMutation.mutate({
        messageId: message.id,
        projectId: projectId,
        userId: userId,
      });
    } else {
      console.warn('[ChatMessage] Cannot create scene - missing required data:', {
        isScenePlan,
        messageId: message.id,
        projectId,
        userId
      });
    }
  };

  // Handle edit scene plan click
  const handleEditScenePlanClick = () => {
    if (isScenePlan && scenePlanData && onEditScenePlan) {
      const prompt = scenePlanData.scenePlan.prompt;
      onEditScenePlan(prompt);
    }
  };

  // Define different colors for scene plan messages
  const getScenePlanColors = (sceneNumber: number) => {
    const colors = [
      "bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200",      // Scene 1: Blue
      "bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200",    // Scene 2: Purple
      "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200",   // Scene 3: Green
      "bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200",     // Scene 4: Orange
      "bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200",        // Scene 5: Teal
      "bg-gradient-to-r from-violet-50 to-purple-50 border border-violet-200",  // Scene 6: Violet
      "bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-200",        // Scene 7: Rose
      "bg-gradient-to-r from-amber-50 to-yellow-50 border border-amber-200",    // Scene 8: Amber
    ];
    return colors[(sceneNumber - 1) % colors.length] || colors[0];
  };

  return (
    <div
      className={`flex ${message.isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className={`max-w-[80%] ${
          message.isUser
            ? "bg-black text-white rounded-2xl px-4 py-3"
            : isScenePlan && scenePlanData
            ? `${getScenePlanColors(scenePlanData.sceneNumber)} text-gray-900 rounded-xl px-3 py-2`
            : isSceneSuccess && successSceneNumber
            ? `${getScenePlanColors(successSceneNumber)} text-gray-900 rounded-xl px-3 py-2`
            : isSceneSuccess
            ? "bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 text-green-800 rounded-xl px-3 py-2"
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
                        className="w-full max-h-32 object-contain rounded border bg-gray-50"
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
               message.message.toLowerCase().includes("generating code") && 
               message.status === "pending" ? (
                <GeneratingMessage />
              ) : isSceneSuccess ? (
                <div className="flex items-center gap-2">
                  <span className="text-green-600">✅</span>
                  <span className="font-medium">{message.message}</span>
                </div>
              ) : (
                <span>
                  {message.message
                    .replace(/<!-- SCENE_PLAN_DATA:.*? -->/, '')
                    .replace(/<!-- SCENE_PLAN_OVERVIEW:.*? -->/, '')
                    .replace(/\*\*(.*?)\*\*/g, '$1') // Remove ** bold formatting
                    .replace(/^\*\*Scene \d+:\*\* /, '') // Remove "**Scene X:** " from the beginning
                    .trim()}
                </span>
              )}
            </div>
            
            {/* Scene plan overview actions (Create All button) */}
            {isScenePlanOverview && scenePlanOverviewData && (
              <div className="mt-2 pt-2 border-t border-gray-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-gray-500">{formatTimestamp(message.timestamp)}</span>
                    <span className="text-gray-300">•</span>
                    <span className="bg-blue-100 px-2 py-0.5 rounded-full font-medium text-blue-700">
                      {scenePlanOverviewData.totalScenePlans} Scenes Planned
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {/* Create All button in the main planning message */}
                    {scenePlanOverviewData.totalScenePlans > 1 && projectId && userId && (
                      <CreateAllScenesButton 
                        projectId={projectId}
                        userId={userId}
                        totalScenePlans={scenePlanOverviewData.totalScenePlans}
                        scenePlanMessageIds={scenePlanOverviewData.scenePlanMessageIds}
                      />
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Scene plan actions */}
            {isScenePlan && scenePlanData && (
              <div className="mt-2 pt-2 border-t border-gray-200/50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs">
                    <span className="text-gray-500">{formatTimestamp(message.timestamp)}</span>
                    <span className="text-gray-300">•</span>
                    <span className="bg-gray-100 px-2 py-0.5 rounded-full font-medium text-gray-700">Scene {scenePlanData.sceneNumber}</span>
                    <span className="text-gray-300">•</span>
                    <span className="text-gray-600">
                      {scenePlanData.scenePlan.toolType === 'typography' ? 'Text Animation' : 
                       scenePlanData.scenePlan.toolType === 'recreate' ? 'Image Recreation' : 
                       'Motion Graphics'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {/* Edit button */}
                    {onEditScenePlan && (
                      <button
                        onClick={handleEditScenePlanClick}
                        className="flex items-center gap-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-2 py-1 rounded text-xs font-medium transition-colors"
                        title="Edit prompt"
                      >
                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                    )}
                    
                    {/* Create Scene button */}
                    <button
                      onClick={handleCreateSceneClick}
                      disabled={createSceneMutation.isPending || isCurrentlyGenerating}
                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors ${
                        createSceneMutation.isPending || isCurrentlyGenerating
                          ? 'bg-blue-500 text-white cursor-wait' 
                          : 'bg-black hover:bg-gray-800 text-white'
                      }`}
                    >
                      {(createSceneMutation.isPending || isCurrentlyGenerating) ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
                          <span>Creating...</span>
                        </>
                      ) : (
                        <>
                          <Play className="h-3 w-3" />
                          <span>Create</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {/* Timestamp and action buttons - hidden for scene plan messages and scene plan overview messages since they have their own footer */}
            {!isScenePlan && !isScenePlanOverview && (
              <div className="flex items-center justify-between mt-1">
                <span className="text-xs opacity-50">{formatTimestamp(message.timestamp)}</span>
                <div className="flex items-center gap-2">
                  {message.status === "error" && !isErrorMessage && (
                    <span className="text-xs text-red-500">Failed</span>
                  )}
                  {isErrorMessage && (
                    <button
                      onClick={handleAutoFixClick}
                      className="text-xs flex items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded transition-colors"
                      title="Auto-fix this error"
                    >
                      <span>🔧</span>
                      <span>Fix</span>
                    </button>
                  )}
                  {!message.isUser && hasIterations && onRevert && message.id && !isErrorMessage && (
                    <button
                      onClick={handleRestoreClick}
                      className="text-xs flex items-center gap-1 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Restore to previous version"
                    >
                      <Undo2 className="h-3 w-3" />
                      <span>Restore</span>
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
      </div>
    </div>
  );
}

// Memoized export to prevent unnecessary re-renders
export const ChatMessage = React.memo(ChatMessageComponent, (prevProps, nextProps) => {
  // Custom comparison function - only re-render if these specific props change
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.status === nextProps.message.status &&
    prevProps.message.kind === nextProps.message.kind &&
    prevProps.hasIterations === nextProps.hasIterations &&
    prevProps.isFirstScenePlan === nextProps.isFirstScenePlan &&
    prevProps.totalScenePlans === nextProps.totalScenePlans
  );
});

ChatMessage.displayName = 'ChatMessage';