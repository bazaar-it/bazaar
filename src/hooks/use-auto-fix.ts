"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { api } from "~/trpc/react";
import { useVideoState } from '~/stores/videoState';
import type { ErrorDetails, AutoFixQueueItem } from '~/lib/types/auto-fix';

interface Scene {
  id: string;
  [key: string]: any;
}

const DEBUG_AUTOFIX = true; // Enable debug logging to diagnose auto-fix issues

// Cost control constants - CRITICAL FOR API BUDGET
const MAX_FIXES_PER_SESSION = 10; // Maximum total fixes in a session
const MAX_FIXES_PER_SCENE = 3; // Already enforced per scene
const COOLDOWN_PERIOD_MS = 60000; // 1 minute cooldown after hitting limits
const FIX_HISTORY_WINDOW_MS = 300000; // 5 minute sliding window for rate limiting

// Circuit breaker constants
const CIRCUIT_BREAKER_THRESHOLD = 5; // Number of consecutive failures to trip
const CIRCUIT_BREAKER_RESET_MS = 120000; // 2 minutes to reset after tripping

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
  
  // Circuit breaker state
  const [consecutiveFailures, setConsecutiveFailures] = useState(0);
  const [circuitBreakerTrippedAt, setCircuitBreakerTrippedAt] = useState<number | null>(null);
  
  // 🚨 CRITICAL FIX: Use refs to avoid stale closures in event handlers
  const scenesRef = useRef(scenes);
  const autoFixQueueRef = useRef(autoFixQueue);
  const fixingScenesRef = useRef(fixingScenes);
  const isInCooldownRef = useRef(isInCooldown);
  const fixHistoryRef = useRef(fixHistory);
  const consecutiveFailuresRef = useRef(consecutiveFailures);
  const circuitBreakerTrippedAtRef = useRef(circuitBreakerTrippedAt);
  
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
  
  useEffect(() => {
    consecutiveFailuresRef.current = consecutiveFailures;
  }, [consecutiveFailures]);
  
  useEffect(() => {
    circuitBreakerTrippedAtRef.current = circuitBreakerTrippedAt;
  }, [circuitBreakerTrippedAt]);

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
    
    // Add retry logic for API failures
    const MAX_API_RETRIES = 3;
    let lastError: any;
    
    for (let apiRetry = 0; apiRetry < MAX_API_RETRIES; apiRetry++) {
      try {
        // Mark as fixing (only on first attempt)
        if (apiRetry === 0) {
          setFixingScenes(prev => new Set(prev).add(sceneId));
        }

        // Call generation API with retry
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
          
          // Success - reset consecutive failures counter
          setConsecutiveFailures(0);
          
          // Success - break out of retry loop
          break;
        }
      } catch (error) {
        lastError = error;
        if (DEBUG_AUTOFIX) {
          console.error(`[SILENT FIX] API attempt ${apiRetry + 1}/${MAX_API_RETRIES} failed:`, error);
        }
        
        // If not the last retry, wait before trying again
        if (apiRetry < MAX_API_RETRIES - 1) {
          const waitTime = 1000 * Math.pow(2, apiRetry); // 1s, 2s, 4s
          if (DEBUG_AUTOFIX) {
            console.log(`[SILENT FIX] Waiting ${waitTime}ms before retry...`);
          }
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // If we get here and lastError exists, all retries failed
    if (lastError) {
      if (DEBUG_AUTOFIX) {
        console.error('[SILENT FIX] All API retries failed:', lastError);
      }
      throw lastError; // Re-throw for the outer retry logic in processAutoFixQueue
    }
    
    // Clean up fixing set after operation completes
    setTimeout(() => {
      setFixingScenes(prev => {
        const next = new Set(prev);
        next.delete(sceneId);
        return next;
      });
    }, 2000);
  }, [projectId, generateSceneMutation, utils, refetchScenes, convertDbScenesToInputProps, updateAndRefresh]);

  // Process queued fixes with progressive strategy
  const processAutoFixQueue = useCallback(async (sceneId: string) => {
    const queueItem = autoFixQueueRef.current.get(sceneId);
    if (!queueItem) return;
    
    // Check if circuit breaker is tripped
    if (circuitBreakerTrippedAtRef.current) {
      const now = Date.now();
      const timeSinceTripped = now - circuitBreakerTrippedAtRef.current;
      
      if (timeSinceTripped < CIRCUIT_BREAKER_RESET_MS) {
        if (DEBUG_AUTOFIX) {
          const remainingTime = Math.round((CIRCUIT_BREAKER_RESET_MS - timeSinceTripped) / 1000);
          console.warn(`[SILENT FIX] 🔴 Circuit breaker is OPEN - waiting ${remainingTime}s before reset`);
        }
        autoFixQueueRef.current.delete(sceneId);
        return;
      } else {
        // Reset circuit breaker
        if (DEBUG_AUTOFIX) {
          console.log('[SILENT FIX] 🟢 Circuit breaker RESET - resuming operations');
        }
        setCircuitBreakerTrippedAt(null);
        setConsecutiveFailures(0);
      }
    }
    
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
      // Failed, track consecutive failures
      setConsecutiveFailures(prev => {
        const newCount = prev + 1;
        
        // Check if we should trip the circuit breaker
        if (newCount >= CIRCUIT_BREAKER_THRESHOLD) {
          if (DEBUG_AUTOFIX) {
            console.error(`[SILENT FIX] 🔴 Circuit breaker TRIPPED after ${newCount} consecutive failures!`);
          }
          setCircuitBreakerTrippedAt(Date.now());
          
          // Clear the entire queue when circuit breaker trips
          autoFixQueueRef.current.clear();
        }
        
        return newCount;
      });
      
      if (DEBUG_AUTOFIX) {
        console.error(`[SILENT FIX] Attempt ${queueItem.attempts} failed:`, error);
        console.error(`[SILENT FIX] Consecutive failures: ${consecutiveFailuresRef.current + 1}`);
      }
      
      // Only retry if circuit breaker hasn't tripped
      if (consecutiveFailuresRef.current + 1 < CIRCUIT_BREAKER_THRESHOLD) {
        // Progressive retry delays: 5s, 10s, 20s
        const retryDelay = Math.min(5000 * Math.pow(2, queueItem.attempts - 1), 20000);
        
        setTimeout(() => {
          processAutoFixQueue(sceneId);
        }, retryDelay);
      }
    }
  }, [executeAutoFix]);

  // FIX 2: Create stable refs for functions that will be used in event handlers
  const processAutoFixQueueRef = useRef(processAutoFixQueue);
  useEffect(() => {
    processAutoFixQueueRef.current = processAutoFixQueue;
  }, [processAutoFixQueue]);

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
      
      // FIX 3: Add comprehensive event validation
      if (!event?.detail) {
        console.error('[SILENT FIX] Invalid error event: missing detail property');
        return;
      }
      
      const { sceneId, sceneName, error } = event.detail;
      
      // Validate required fields
      if (!sceneId || typeof sceneId !== 'string') {
        console.error('[SILENT FIX] Invalid error event: sceneId is missing or invalid', event.detail);
        return;
      }
      
      if (!sceneName || typeof sceneName !== 'string') {
        console.error('[SILENT FIX] Invalid error event: sceneName is missing or invalid', event.detail);
        return;
      }
      
      if (!error) {
        console.error('[SILENT FIX] Invalid error event: error is missing', event.detail);
        return;
      }
      
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
      
      // FIX 2: Use stable ref for processAutoFixQueue
      queueItem.debounceTimer = setTimeout(() => {
        processAutoFixQueueRef.current(sceneId);
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
    
    // Process any existing items in the queue
    if (autoFixQueueRef.current.size > 0) {
      if (DEBUG_AUTOFIX) {
        console.log('[SILENT FIX] Processing existing queue items:', autoFixQueueRef.current.size);
      }
      autoFixQueueRef.current.forEach((item, sceneId) => {
        // Only process if not already being fixed
        if (!fixingScenesRef.current.has(sceneId)) {
          // Clear any existing timer and set a new one
          if (item.debounceTimer) {
            clearTimeout(item.debounceTimer);
          }
          // FIX 2: Use stable ref here too
          item.debounceTimer = setTimeout(() => {
            processAutoFixQueueRef.current(sceneId);
          }, 2000);
        }
      });
    }
    
    // FIX 4: Implement proper cleanup on dependency changes, not just unmount
    return () => {
      if (DEBUG_AUTOFIX) {
        console.log('[SILENT FIX] Cleaning up event listeners and timers');
        console.log('[SILENT FIX] Reason: projectId changed or component unmounting');
      }
      
      // Remove event listeners
      window.removeEventListener('preview-scene-error', handlePreviewError as EventListener);
      window.removeEventListener('scene-deleted', handleSceneDeleted as EventListener);
      window.removeEventListener('scene-fixed', handleSceneFixed as EventListener);
      
      // Clear all timers and queue items
      autoFixQueueRef.current.forEach((item, sceneId) => {
        if (item.debounceTimer) {
          clearTimeout(item.debounceTimer);
          if (DEBUG_AUTOFIX) {
            console.log('[SILENT FIX] Cleared timer for scene:', sceneId);
          }
        }
      });
      
      // Clear the queue completely when projectId changes
      autoFixQueueRef.current.clear();
      
      // Clear fixing scenes set
      setFixingScenes(new Set());
      
      if (DEBUG_AUTOFIX) {
        console.log('[SILENT FIX] Cleanup complete, queue cleared');
      }
    };
  }, [projectId, setFixingScenes]); // FIX 1: Include setFixingScenes in deps for proper cleanup

  // Add a manual trigger for debugging - expose it on window in dev mode
  useEffect(() => {
    if (DEBUG_AUTOFIX && typeof window !== 'undefined') {
      (window as any).forceAutoFix = () => {
        console.log('[SILENT FIX] Manual trigger activated!');
        console.log('[SILENT FIX] Current queue:', autoFixQueueRef.current);
        if (autoFixQueueRef.current.size > 0) {
          const firstSceneId = Array.from(autoFixQueueRef.current.keys())[0];
          if (firstSceneId) {
            console.log('[SILENT FIX] Processing scene:', firstSceneId);
            processAutoFixQueue(firstSceneId);
          }
        } else {
          console.log('[SILENT FIX] No items in queue');
        }
      };
    }
  }, [processAutoFixQueue]);
  
  // Return empty object - no UI interaction needed
  return {};
}