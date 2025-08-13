"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { api } from "~/trpc/react";
import { useVideoState } from '~/stores/videoState';
import type { ErrorDetails, AutoFixQueueItem } from '~/lib/types/auto-fix';

interface Scene {
  id: string;
  [key: string]: any;
}

const DEBUG_AUTOFIX = false; // Enable debug logging to diagnose auto-fix issues

// Cost control constants - CRITICAL FOR API BUDGET
const MAX_FIXES_PER_SESSION = 10; // Maximum total fixes in a session
const MAX_FIXES_PER_SCENE = 3; // Already enforced per scene
const COOLDOWN_PERIOD_MS = 60000; // 1 minute cooldown after hitting limits
const FIX_HISTORY_WINDOW_MS = 300000; // 5 minute sliding window for rate limiting

export function useAutoFix(projectId: string, scenes: Scene[]) {
  // 🚨 FIX: Use useMemo to stabilize scenes array reference to prevent infinite re-renders
  const sceneIds = scenes.map(s => s.id).join(',');
  const stableScenes = useMemo(() => scenes, [sceneIds]);
  
  // Removed debug log to prevent re-render spam
  const [autoFixQueue] = useState<Map<string, AutoFixQueueItem>>(new Map());
  const generateSceneMutation = api.generation.generateScene.useMutation();
  const utils = api.useUtils();
  const { refetch: refetchScenes } = api.generation.getProjectScenes.useQuery({ projectId });
  
  const { 
    getCurrentProps, 
    updateAndRefresh
  } = useVideoState();

  // Track scenes that are currently being fixed to avoid re-adding errors
  const [fixingScenes, setFixingScenes] = useState<Set<string>>(new Set());
  
  // Cost control state
  const [fixHistory, setFixHistory] = useState<number[]>([]); // Timestamps of recent fixes
  const [isInCooldown, setIsInCooldown] = useState(false);
  
  // 🚨 CRITICAL FIX: Use refs to avoid stale closures in event handlers
  const scenesRef = useRef(scenes);
  const autoFixQueueRef = useRef(autoFixQueue);
  const fixingScenesRef = useRef(fixingScenes);
  const isInCooldownRef = useRef(isInCooldown);
  const fixHistoryRef = useRef(fixHistory);
  
  // Update refs when values change
  useEffect(() => {
    scenesRef.current = scenes;
  }, [scenes]);
  
  useEffect(() => {
    autoFixQueueRef.current = autoFixQueue;
  }, [autoFixQueue]);
  
  useEffect(() => {
    fixingScenesRef.current = fixingScenes;
  }, [fixingScenes]);
  
  useEffect(() => {
    isInCooldownRef.current = isInCooldown;
  }, [isInCooldown]);
  
  useEffect(() => {
    fixHistoryRef.current = fixHistory;
  }, [fixHistory]);

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
        backgroundColor: currentProps?.meta?.backgroundColor || '#000000',
        format: currentProps?.meta?.format || 'landscape',
        width: currentProps?.meta?.width || 1920,
        height: currentProps?.meta?.height || 1080
      },
      scenes: convertedScenes
    };
  }, [getCurrentProps]);

  // Silent auto-fix execution with progressive strategy
  const executeAutoFix = useCallback(async (sceneId: string, errorDetails: ErrorDetails, attemptNumber: number = 1) => {
    if (DEBUG_AUTOFIX) {
      console.log('[SILENT FIX] Executing fix attempt', attemptNumber, 'for:', sceneId, errorDetails);
    }

    // Progressive fix prompts based on attempt number
    let fixPrompt: string;
    
    if (attemptNumber === 1) {
      // Attempt 1: Quick targeted fix
      fixPrompt = `🔧 FIX BROKEN SCENE: Scene "${errorDetails.sceneName}" (ID: ${sceneId}) has a compilation error. The error message is: "${errorDetails.errorMessage}". Fix ONLY this specific error. Make minimal changes to resolve the compilation issue.`;
    } else if (attemptNumber === 2) {
      // Attempt 2: Comprehensive fix
      fixPrompt = `🔧 FIX BROKEN SCENE (ATTEMPT 2): Previous fix failed. Scene "${errorDetails.sceneName}" still has errors. Error: "${errorDetails.errorMessage}". Fix ALL compilation errors, check imports, undefined variables, and syntax issues. Be more thorough this time.`;
    } else {
      // Attempt 3: Nuclear option - rewrite
      fixPrompt = `🔧 REWRITE BROKEN SCENE (FINAL ATTEMPT): Two fixes have failed. Scene "${errorDetails.sceneName}" needs a complete rewrite. Error: "${errorDetails.errorMessage}". REWRITE this component using simpler, more reliable code that will definitely compile. Keep the same visual output but prioritize making it work.`;
    }
    
    try {
      // Mark as fixing
      setFixingScenes(prev => new Set(prev).add(sceneId));

      // Call generation API silently - no chat messages
      const result = await generateSceneMutation.mutateAsync({
        projectId,
        userMessage: fixPrompt,
        userContext: { imageUrls: undefined }
      });

      const responseData = result as any;
      
      if (responseData.data || responseData.meta?.success) {
        if (DEBUG_AUTOFIX) {
          console.log('[SILENT FIX] Fix successful, refreshing state...');
        }
        
        // Invalidate tRPC cache
        await utils.generation.getProjectScenes.invalidate({ projectId });
        
        // Fetch latest scene data
        const updatedScenes = await refetchScenes();
        
        if (updatedScenes.data && updatedScenes.data.length > 0) {
          // Convert and update with guaranteed refresh
          const updatedProps = convertDbScenesToInputProps(updatedScenes.data);
          updateAndRefresh(projectId, () => updatedProps);
          
          if (DEBUG_AUTOFIX) {
            console.log('[SILENT FIX] Scene fixed and state updated');
          }
        }
        
        // Success - remove from queue
        autoFixQueueRef.current.delete(sceneId);
        
        // Dispatch success event for PreviewPanel
        const successEvent = new CustomEvent('scene-fixed', {
          detail: { sceneId }
        });
        window.dispatchEvent(successEvent);
      }
    } catch (error) {
      if (DEBUG_AUTOFIX) {
        console.error('[SILENT FIX] Fix failed:', error);
      }
      throw error; // Re-throw for retry logic
    } finally {
      // Remove from fixing set after a delay
      setTimeout(() => {
        setFixingScenes(prev => {
          const next = new Set(prev);
          next.delete(sceneId);
          return next;
        });
      }, 2000);
    }
  }, [projectId, generateSceneMutation, utils, refetchScenes, convertDbScenesToInputProps, updateAndRefresh]);

  // Process queued fixes with progressive strategy
  const processAutoFixQueue = useCallback(async (sceneId: string) => {
    const queueItem = autoFixQueueRef.current.get(sceneId);
    if (!queueItem) return;
    
    // Check if we're in cooldown
    if (isInCooldownRef.current) {
      console.warn('[SILENT FIX] ⚠️ In cooldown period, skipping auto-fix');
      autoFixQueueRef.current.delete(sceneId);
      return;
    }
    
    // Clean up old fix history entries (older than window)
    const now = Date.now();
    const recentHistory = fixHistoryRef.current.filter(timestamp => 
      now - timestamp < FIX_HISTORY_WINDOW_MS
    );
    setFixHistory(recentHistory);
    
    // Check if we've hit the rate limit
    if (recentHistory.length >= MAX_FIXES_PER_SESSION) {
      if (DEBUG_AUTOFIX) {
        console.error('[SILENT FIX] 🛑 RATE LIMIT: Reached maximum fixes per session!');
        console.error(`[SILENT FIX] ${recentHistory.length} fixes in the last ${FIX_HISTORY_WINDOW_MS / 60000} minutes`);
      }
      
      // Enter cooldown
      setIsInCooldown(true);
      setTimeout(() => {
        setIsInCooldown(false);
        if (DEBUG_AUTOFIX) {
          console.log('[SILENT FIX] Cooldown period ended');
        }
      }, COOLDOWN_PERIOD_MS);
      
      // Clear all queued fixes to prevent further attempts
      autoFixQueueRef.current.clear();
      return;
    }
    
    // Check if scene still exists
    const sceneStillExists = scenesRef.current.some(s => s.id === sceneId);
    if (!sceneStillExists) {
      autoFixQueueRef.current.delete(sceneId);
      return;
    }
    
    // Check retry limits
    if (queueItem.attempts >= 3) {
      // Max retries reached, give up silently
      autoFixQueueRef.current.delete(sceneId);
      
      if (DEBUG_AUTOFIX) {
        console.error(`[SILENT FIX] Giving up on ${queueItem.errorDetails.sceneName} after 3 attempts`);
      }
      return;
    }
    
    // Check if we're seeing the same error repeatedly
    const currentError = queueItem.errorDetails.errorMessage;
    const isRepeatingError = queueItem.previousErrors?.includes(currentError);
    
    if (isRepeatingError && queueItem.attempts >= 2) {
      // Same error after multiple attempts - skip to final rewrite
      queueItem.attempts = 3;
      if (DEBUG_AUTOFIX) {
        console.log('[SILENT FIX] Same error repeating, jumping to rewrite attempt');
      }
    }
    
    // Update attempt count and track error
    queueItem.attempts++;
    queueItem.lastAttemptTime = Date.now();
    if (!queueItem.previousErrors) {
      queueItem.previousErrors = [];
    }
    queueItem.previousErrors.push(currentError);
    
    // Execute fix with progressive strategy
    try {
      // Record this fix attempt in history
      setFixHistory(prev => [...prev, Date.now()]);
      
      await executeAutoFix(sceneId, queueItem.errorDetails, queueItem.attempts);
      
      // Success - already cleaned up in executeAutoFix
      if (DEBUG_AUTOFIX) {
        if (DEBUG_AUTOFIX) {
          console.log(`[SILENT FIX] Successfully fixed ${queueItem.errorDetails.sceneName} on attempt ${queueItem.attempts}`);
        }
      }
      
    } catch (error) {
      // Failed, schedule retry with progressive delay
      if (DEBUG_AUTOFIX) {
        console.error(`[SILENT FIX] Attempt ${queueItem.attempts} failed:`, error);
      }
      
      // Progressive retry delays: 5s, 10s, 20s
      const retryDelay = Math.min(5000 * Math.pow(2, queueItem.attempts - 1), 20000);
      
      setTimeout(() => {
        processAutoFixQueue(sceneId);
      }, retryDelay);
    }
  }, [executeAutoFix]);

  // Listen for preview panel errors
  useEffect(() => {
    if (DEBUG_AUTOFIX) {
      console.log('[SILENT FIX] Setting up event listeners in useEffect at:', new Date().toISOString());
      console.log('[SILENT FIX] Current autoFixQueue size:', autoFixQueueRef.current.size);
      console.log('[SILENT FIX] Current fixingScenes:', Array.from(fixingScenesRef.current));
    }
    
    const handlePreviewError = (event: CustomEvent) => {
      if (DEBUG_AUTOFIX) {
        console.log('[SILENT FIX] ======== PREVIEW ERROR EVENT RECEIVED ========');
        console.log('[SILENT FIX] Event timestamp:', new Date().toISOString());
        console.log('[SILENT FIX] Event detail:', JSON.stringify(event.detail, null, 2));
      }
      const { sceneId, sceneName, error } = event.detail;
      
      if (DEBUG_AUTOFIX) {
        console.log('[SILENT FIX] Error detected:', { sceneId, sceneName, error: error?.message });
      }
      
      // Don't track errors for scenes that are currently being fixed
      if (fixingScenesRef.current.has(sceneId)) {
        if (DEBUG_AUTOFIX) {
          console.log('[SILENT FIX] Ignoring error for scene being fixed:', sceneId);
        }
        return;
      }
      
      // Check if we're in cooldown - still add to queue but warn
      if (isInCooldownRef.current) {
        if (DEBUG_AUTOFIX) {
          console.warn('[SILENT FIX] ⚠️ ERROR DETECTED BUT IN COOLDOWN - Auto-fix disabled temporarily');
        }
        return;
      }
      
      // Check if already in queue
      const existingItem = autoFixQueueRef.current.get(sceneId);
      
      // Clear existing debounce timer
      if (existingItem?.debounceTimer) {
        clearTimeout(existingItem.debounceTimer);
      }
      
      // Create/update queue item
      const queueItem: AutoFixQueueItem = {
        sceneId,
        errorDetails: {
          sceneName,
          errorMessage: error?.message || String(error),
          timestamp: Date.now()
        },
        attempts: existingItem?.attempts || 0,
        firstErrorTime: existingItem?.firstErrorTime || Date.now(),
        lastAttemptTime: 0,
        previousErrors: existingItem?.previousErrors || []
      };
      
      // Set debounce timer (2 seconds)
      queueItem.debounceTimer = setTimeout(() => {
        processAutoFixQueue(sceneId);
      }, 2000);
      
      // Add to queue
      autoFixQueueRef.current.set(sceneId, queueItem);
      
      if (DEBUG_AUTOFIX) {
        console.log('[SILENT FIX] Queued for auto-fix after debounce:', sceneId);
      }
    };

    // Clean up when scenes are deleted
    const handleSceneDeleted = (event: CustomEvent) => {
      const { sceneId } = event.detail;
      
      if (DEBUG_AUTOFIX) {
        console.log('[SILENT FIX] Scene deleted, cleaning up:', sceneId);
      }
      
      // Clear from queue
      const queueItem = autoFixQueueRef.current.get(sceneId);
      if (queueItem?.debounceTimer) {
        clearTimeout(queueItem.debounceTimer);
      }
      autoFixQueueRef.current.delete(sceneId);
      
      // Remove from fixing set
      setFixingScenes(prev => {
        const next = new Set(prev);
        next.delete(sceneId);
        return next;
      });
    };

    // Listen for successful scene fixes
    const handleSceneFixed = (event: CustomEvent) => {
      const { sceneId } = event.detail;
      
      if (DEBUG_AUTOFIX) {
        console.log('[SILENT FIX] Scene fixed event received:', sceneId);
      }
      
      // Clean up queue
      const queueItem = autoFixQueueRef.current.get(sceneId);
      if (queueItem?.debounceTimer) {
        clearTimeout(queueItem.debounceTimer);
      }
      autoFixQueueRef.current.delete(sceneId);
      
      // Remove from fixing set
      setFixingScenes(prev => {
        const next = new Set(prev);
        next.delete(sceneId);
        return next;
      });
    };

    if (DEBUG_AUTOFIX) {
      console.log('[SILENT FIX] 🎯 Adding event listeners NOW');
      
      // Test that events work
      const testListener = () => {
        console.log('[SILENT FIX] Test event received - event system is working!');
      };
      window.addEventListener('test-event', testListener);
      window.dispatchEvent(new CustomEvent('test-event'));
      window.removeEventListener('test-event', testListener);
    }
    
    window.addEventListener('preview-scene-error', handlePreviewError as EventListener);
    if (DEBUG_AUTOFIX) {
      console.log('[SILENT FIX] ✅ Event listener for preview-scene-error added');
    }
    window.addEventListener('scene-deleted', handleSceneDeleted as EventListener);
    window.addEventListener('scene-fixed', handleSceneFixed as EventListener);
    
    return () => {
      if (DEBUG_AUTOFIX) {
        console.log('[SILENT FIX] Removing event listeners');
      }
      window.removeEventListener('preview-scene-error', handlePreviewError as EventListener);
      window.removeEventListener('scene-deleted', handleSceneDeleted as EventListener);
      window.removeEventListener('scene-fixed', handleSceneFixed as EventListener);
      
      // Clear all timers on unmount
      autoFixQueueRef.current.forEach(item => {
        if (item.debounceTimer) {
          clearTimeout(item.debounceTimer);
        }
      });
    };
  }, [projectId, processAutoFixQueue]); // Add processAutoFixQueue to dependencies since it's used in handlers

  // Return empty object - no UI interaction needed
  return {};
}