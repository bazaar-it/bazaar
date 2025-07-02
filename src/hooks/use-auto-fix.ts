"use client";

import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';
import { api } from "~/trpc/react";
import { useVideoState } from '~/stores/videoState';
import type { ErrorDetails } from '~/components/chat/AutoFixErrorBanner';

interface Scene {
  id: string;
  [key: string]: any;
}

export function useAutoFix(projectId: string, scenes: Scene[]) {
  const [sceneErrors, setSceneErrors] = useState<Map<string, ErrorDetails>>(new Map());
  const generateSceneMutation = api.generation.generateScene.useMutation();
  const utils = api.useUtils();
  const { refetch: refetchScenes } = api.generation.getProjectScenes.useQuery({ projectId });
  
  const { 
    getCurrentProps, 
    updateAndRefresh, 
    addUserMessage, 
    addAssistantMessage, 
    updateMessage
  } = useVideoState();

  // Helper function to convert database scenes to InputProps format
  const convertDbScenesToInputProps = useCallback((dbScenes: any[]) => {
    let currentStart = 0;
    const currentProps = getCurrentProps();
    const convertedScenes = dbScenes.map((dbScene) => {
      const sceneDuration = dbScene.duration || 150; 
      const scene = {
        id: dbScene.id,
        type: 'custom' as const,
        start: currentStart,
        duration: sceneDuration,
        data: {
          code: dbScene.tsxCode,
          name: dbScene.name,
          componentId: dbScene.id,
          props: dbScene.props || {}
        }
      };
      currentStart += sceneDuration;
      return scene;
    });
    
    return {
      meta: {
        title: currentProps?.meta?.title || 'New Project',
        duration: currentStart,
        backgroundColor: currentProps?.meta?.backgroundColor || '#000000'
      },
      scenes: convertedScenes
    };
  }, [getCurrentProps]);

  const handleAutoFix = useCallback(async (sceneId: string) => {
    const errorDetails = sceneErrors.get(sceneId);
    if (!errorDetails) {
      console.log('[useAutoFix] 🔧 AUTOFIX DEBUG: No error details for scene:', sceneId);
      return;
    }
    
    // Check if scene still exists
    const sceneStillExists = scenes.some(s => s.id === sceneId);
    if (!sceneStillExists) {
      console.log('[useAutoFix] 🔧 AUTOFIX DEBUG: Scene no longer exists:', sceneId);
      // Clean up the error
      setSceneErrors(prev => {
        const next = new Map(prev);
        next.delete(sceneId);
        return next;
      });
      return;
    }
    
    // More explicit prompt for brain orchestrator
    const fixPrompt = `Fixing scene`;
    
    console.log('[useAutoFix] 🔧 AUTOFIX DEBUG: Starting autofix flow:', {
      sceneId: sceneId,
      sceneName: errorDetails.sceneName,
      errorMessage: errorDetails.errorMessage,
      fixPrompt: fixPrompt
    });
    
    // ✅ IMMEDIATE: Add user message to chat right away (like normal chat)
    addUserMessage(projectId, fixPrompt);
    
    // Mark this scene as being fixed
    setFixingScenes(prev => new Set(prev).add(sceneId));
    
    // ✅ IMMEDIATE: Clear the error banner right away
    setSceneErrors(prev => {
      const next = new Map(prev);
      next.delete(sceneId);
      return next;
    });
    
    console.log('[useAutoFix] 🔧 AUTOFIX DEBUG: Sending fix request to backend...');
    
    try {
      const result = await generateSceneMutation.mutateAsync({
        projectId,
        userMessage: fixPrompt,
        userContext: {
          imageUrls: undefined
        }
      });

      // ✅ CRITICAL: Force complete state refresh after successful fix
      const responseData = result as any;
      
      // Get the real assistant message ID from the response
      const realAssistantMessageId = responseData.assistantMessageId;
      
      if (realAssistantMessageId) {
        // Add the real assistant message to VideoState (same as ChatPanelG)
        const aiResponse = responseData.context?.chatResponse || 
                          responseData.chatResponse || 
                          responseData.message || 
                          '✅ Scene error fixed successfully!';
        
        // Add the real assistant message to VideoState
        addAssistantMessage(projectId, realAssistantMessageId, aiResponse);
        updateMessage(projectId, realAssistantMessageId, {
          status: 'success'
        });
      }
      
      if (responseData.data || responseData.meta?.success) {
        console.log('[useAutoFix] 🔧 Auto-fix successful, force refreshing all state...');
        
        // ✅ STEP 1: Invalidate tRPC cache FIRST
        console.log('[useAutoFix] ♻️ Auto-fix: Invalidating tRPC cache...');
        await utils.generation.getProjectScenes.invalidate({ projectId });
        
        // ✅ STEP 2: Fetch latest scene data
        console.log('[useAutoFix] 🔄 Auto-fix: Fetching fresh scenes...');
        const updatedScenes = await refetchScenes();
        
        if (updatedScenes.data && updatedScenes.data.length > 0) {
          // ✅ STEP 3: Convert and update with guaranteed refresh
          const updatedProps = convertDbScenesToInputProps(updatedScenes.data);
          
          console.log('[useAutoFix] 🚀 Auto-fix: Using updateAndRefresh for guaranteed sync...');
          updateAndRefresh(projectId, () => updatedProps);
          
          console.log('[useAutoFix] ✅ Auto-fix complete - preview should show fixed scene');
        }
      }
      
    } catch (error) {
      console.error('Auto-fix failed:', error);
      
      // Create error message
      const errorMessageId = `assistant-error-${Date.now()}`;
      addAssistantMessage(projectId, errorMessageId, `Auto-fix failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      updateMessage(projectId, errorMessageId, {
        status: 'error'
      });
    } finally {
      // Error already cleaned up at the start
      
      // Remove from fixing set after a delay to allow preview to refresh
      setTimeout(() => {
        setFixingScenes(prev => {
          const next = new Set(prev);
          next.delete(sceneId);
          return next;
        });
      }, 2000); // 2 second delay to ensure preview has refreshed
    }
  }, [sceneErrors, scenes, projectId, generateSceneMutation, utils, refetchScenes, convertDbScenesToInputProps, updateAndRefresh, addUserMessage, addAssistantMessage, updateMessage]);

  // Track scenes that are currently being fixed to avoid re-adding errors
  const [fixingScenes, setFixingScenes] = useState<Set<string>>(new Set());

  // Listen for preview panel errors
  useEffect(() => {
    const handlePreviewError = (event: CustomEvent) => {
      const { sceneId, sceneName, error } = event.detail;
      console.log('[useAutoFix] 🔧 AUTOFIX DEBUG: Preview error detected:', { 
        sceneId, 
        sceneName, 
        error: error?.message || String(error),
        errorType: typeof error,
        fullEvent: event.detail 
      });
      
      // Don't track errors for scenes that are currently being fixed
      if (fixingScenes.has(sceneId)) {
        console.log('[useAutoFix] 🔧 AUTOFIX DEBUG: Ignoring error for scene being fixed:', sceneId);
        return;
      }
      
      // Track scene error with Map
      setSceneErrors(prev => {
        const next = new Map(prev);
        next.set(sceneId, {
          sceneName,
          errorMessage: error?.message || String(error),
          timestamp: Date.now()
        });
        return next;
      });

      console.log('[useAutoFix] 🔧 AUTOFIX DEBUG: Error state updated for scene:', sceneId);
    };

    // Also listen for direct autofix triggers from error boundaries
    const handleDirectAutoFix = (event: CustomEvent) => {
      const { sceneId, sceneName, error } = event.detail;
      console.log('[useAutoFix] 🔧 AUTOFIX DEBUG: Direct autofix trigger received:', { 
        sceneId, 
        sceneName, 
        error 
      });
      
      // Set error state and immediately trigger autofix
      setSceneErrors(prev => {
        const next = new Map(prev);
        next.set(sceneId, {
          sceneName,
          errorMessage: error?.message || String(error),
          timestamp: Date.now()
        });
        return next;
      });
      
      // Immediately trigger autofix without waiting for button click
      setTimeout(() => {
        handleAutoFix(sceneId);
      }, 100);
    };

    // Clean up stale errors when scenes are removed
    const handleSceneDeleted = (event: CustomEvent) => {
      const { sceneId } = event.detail;
      console.log('[useAutoFix] 🔧 AUTOFIX DEBUG: Scene deleted, cleaning up error state:', sceneId);
      
      setSceneErrors(prev => {
        if (!prev.has(sceneId)) return prev;
        const next = new Map(prev);
        next.delete(sceneId);
        return next;
      });
    };

    // Listen for successful scene fixes
    const handleSceneFixed = (event: CustomEvent) => {
      const { sceneId } = event.detail;
      console.log('[useAutoFix] 🔧 AUTOFIX DEBUG: Scene fixed successfully, clearing error:', sceneId);
      
      setSceneErrors(prev => {
        if (!prev.has(sceneId)) return prev;
        const next = new Map(prev);
        next.delete(sceneId);
        return next;
      });
      
      // Also remove from fixing set
      setFixingScenes(prev => {
        const next = new Set(prev);
        next.delete(sceneId);
        return next;
      });
    };

    console.log('[useAutoFix] 🔧 AUTOFIX DEBUG: Setting up preview-scene-error listener');
    window.addEventListener('preview-scene-error', handlePreviewError as EventListener);
    window.addEventListener('trigger-autofix', handleDirectAutoFix as EventListener);
    window.addEventListener('scene-deleted', handleSceneDeleted as EventListener);
    window.addEventListener('scene-fixed', handleSceneFixed as EventListener);
    
    return () => {
      console.log('[useAutoFix] 🔧 AUTOFIX DEBUG: Removing preview-scene-error listener');
      window.removeEventListener('preview-scene-error', handlePreviewError as EventListener);
      window.removeEventListener('trigger-autofix', handleDirectAutoFix as EventListener);
      window.removeEventListener('scene-deleted', handleSceneDeleted as EventListener);
      window.removeEventListener('scene-fixed', handleSceneFixed as EventListener);
    };
  }, [handleAutoFix, scenes, fixingScenes]);

  return {
    sceneErrors,
    handleAutoFix
  };
}