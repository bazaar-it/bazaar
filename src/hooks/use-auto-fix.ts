"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { api } from "~/trpc/react";
import { useVideoState } from '~/stores/videoState';
import type { ErrorDetails, AutoFixQueueItem } from '~/lib/types/auto-fix';
import { toolsLogger } from '~/lib/utils/logger';
// Session ID generation for tracking
const getSessionId = () => {
  if (typeof window === 'undefined') return 'server-session';
  
  // Check if we already have a session ID
  let sessionId = sessionStorage.getItem('autofix-session-id');
  if (!sessionId) {
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('autofix-session-id', sessionId);
  }
  return sessionId;
};

interface Scene {
  id: string;
  [key: string]: any;
}

const DEBUG_AUTOFIX = true; // Enable temporarily to debug infinite loops

// EMERGENCY KILL SWITCH - Set to true to completely disable auto-fix
const AUTOFIX_KILL_SWITCH = false; // EMERGENCY: Set to true to disable all auto-fixing
// Alternative: Set via localStorage in browser console:
// localStorage.setItem('autofix-kill-switch', 'true');

// Cost control constants - CRITICAL FOR API BUDGET
const MAX_FIXES_PER_SESSION = 5; // Reduced from 10 to prevent runaway costs
const MAX_FIXES_PER_SCENE = 2; // Reduced from 3 - if 2 attempts fail, stop
const COOLDOWN_PERIOD_MS = 120000; // 2 minute cooldown (increased from 1)
const FIX_HISTORY_WINDOW_MS = 300000; // 5 minute sliding window for rate limiting
const MIN_TIME_BETWEEN_FIXES_MS = 10000; // Minimum 10 seconds between any fix attempts

// Circuit breaker constants
const CIRCUIT_BREAKER_THRESHOLD = 5; // Number of consecutive failures to trip
const CIRCUIT_BREAKER_RESET_MS = 120000; // 2 minutes to reset after tripping

export function useAutoFix(projectId: string, scenes: Scene[]) {
  // API mutations for metrics
  const saveMetricMutation = api.admin.saveAutofixMetric.useMutation();
  const updateSessionMutation = api.admin.updateAutofixSession.useMutation();
  
  // Session tracking
  const sessionId = getSessionId();
  const sessionMetrics = useRef({
    totalErrors: 0,
    uniqueErrors: new Set<string>(),
    successfulFixes: 0,
    failedFixes: 0,
    totalApiCalls: 0,
    totalCost: 0,
  });
  // 🛑 EMERGENCY KILL SWITCH CHECK
  const isKillSwitchEnabled = () => {
    // Check hardcoded constant first
    if (AUTOFIX_KILL_SWITCH) return true;
    
    // Check localStorage for runtime toggle
    if (typeof window !== 'undefined') {
      const killSwitch = localStorage.getItem('autofix-kill-switch');
      if (killSwitch === 'true') return true;
    }
    
    // Check if completely disabled via MAX_FIXES
    if (MAX_FIXES_PER_SESSION === 0) return true;
    
    return false;
  };
  
  // 🔥 CRITICAL: Track current projectId to prevent cross-project contamination
  const currentProjectIdRef = useRef(projectId);
  
  // 🚨 FIX: Add error signature tracking to prevent fixing same error repeatedly
  const fixedErrorSignatures = useRef<Set<string>>(new Set());
  const lastFixAttemptTime = useRef<number>(0);
  
  // Generate error signature to detect repeated errors
  const getErrorSignature = (sceneId: string, errorMessage: string): string => {
    // Create a stable signature from error key parts
    const normalizedError = errorMessage
      .replace(/at line \d+/g, '')
      .replace(/column \d+/g, '')
      .trim();
    return `${sceneId}:${normalizedError}`;
  };
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
      toolsLogger.debug('[SILENT FIX] Executing fix attempt', { attemptNumber, sceneId, errorDetails });
    }
    
    const startTime = Date.now();
    // Record fix attempt start in database
    const recordMetric = async (success: boolean, strategy?: string) => {
      const fixDuration = Date.now() - startTime;
      
      // Save metric to database
      await saveMetricMutation.mutateAsync({
        projectId,
        sceneId,
        errorMessage: errorDetails.errorMessage,
        errorType: errorDetails.errorType,
        errorSignature: getErrorSignature(sceneId, errorDetails.errorMessage),
        fixAttemptNumber: attemptNumber,
        fixStrategy: strategy || 'progressive',
        fixSuccess: success,
        fixDurationMs: fixDuration,
        apiCallsCount: 1,
        estimatedCost: 0.003, // Rough estimate
        sessionId,
        userAgent: navigator?.userAgent,
      });
      
      // Update session metrics
      if (success) {
        sessionMetrics.current.successfulFixes++;
      } else {
        sessionMetrics.current.failedFixes++;
      }
      sessionMetrics.current.totalApiCalls++;
      sessionMetrics.current.totalCost += 0.003;
      
      // Update session in database
      await updateSessionMutation.mutateAsync({
        sessionId,
        projectId,
        ...sessionMetrics.current,
        uniqueErrors: sessionMetrics.current.uniqueErrors.size,
      });
    };

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
            toolsLogger.debug('[SILENT FIX] Fix successful, refreshing state...');
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
              toolsLogger.debug('[SILENT FIX] Scene fixed and state updated');
            }
          }
          
          // Success - remove from queue
          autoFixQueueRef.current.delete(sceneId);
          
          // Record success metrics to database
          await recordMetric(true, 'progressive');
          
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
          toolsLogger.error(`[SILENT FIX] API attempt ${apiRetry + 1}/${MAX_API_RETRIES} failed`, error as Error);
        }
        
        // If not the last retry, wait before trying again
        if (apiRetry < MAX_API_RETRIES - 1) {
          const waitTime = 1000 * Math.pow(2, apiRetry); // 1s, 2s, 4s
          if (DEBUG_AUTOFIX) {
            toolsLogger.debug(`[SILENT FIX] Waiting ${waitTime}ms before retry...`);
          }
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // If we get here and lastError exists, all retries failed
    if (lastError) {
      if (DEBUG_AUTOFIX) {
        toolsLogger.error('[SILENT FIX] All API retries failed', lastError as Error);
      }
      // Record failure to database
      await recordMetric(false, 'progressive');
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
          toolsLogger.warn(`[SILENT FIX] 🔴 Circuit breaker is OPEN - waiting ${remainingTime}s before reset`);
        }
        autoFixQueueRef.current.delete(sceneId);
        return;
      } else {
        // Reset circuit breaker
        if (DEBUG_AUTOFIX) {
          toolsLogger.info('[SILENT FIX] 🟢 Circuit breaker RESET - resuming operations');
        }
        setCircuitBreakerTrippedAt(null);
        setConsecutiveFailures(0);
      }
    }
    
    // Check if we're in cooldown
    if (isInCooldownRef.current) {
      toolsLogger.warn('[SILENT FIX] ⚠️ In cooldown period, skipping auto-fix');
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
        toolsLogger.error('[SILENT FIX] 🛑 RATE LIMIT: Reached maximum fixes per session!', undefined, {
          fixCount: recentHistory.length,
          windowMinutes: FIX_HISTORY_WINDOW_MS / 60000
        });
      }
      
      // Enter cooldown
      setIsInCooldown(true);
      // Log cooldown in console for debugging
      console.log('[AutoFix] Cooldown triggered', { fixCount: recentHistory.length });
      setTimeout(() => {
        setIsInCooldown(false);
        if (DEBUG_AUTOFIX) {
          toolsLogger.info('[SILENT FIX] Cooldown period ended');
        }
        console.log('[AutoFix] Cooldown ended');
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
    
    // Check retry limits (reduced to 2)
    if (queueItem.attempts >= MAX_FIXES_PER_SCENE) {
      // Max retries reached, give up and log
      autoFixQueueRef.current.delete(sceneId);
      
      if (DEBUG_AUTOFIX) {
        toolsLogger.error(`[SILENT FIX] Giving up on ${queueItem.errorDetails.sceneName} after 3 attempts`);
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
        toolsLogger.debug('[SILENT FIX] Same error repeating, jumping to rewrite attempt');
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
          toolsLogger.info(`[SILENT FIX] Successfully fixed ${queueItem.errorDetails.sceneName} on attempt ${queueItem.attempts}`);
        }
      }
      
    } catch (error) {
      // Failed, track consecutive failures
      setConsecutiveFailures(prev => {
        const newCount = prev + 1;
        
        // Check if we should trip the circuit breaker
        if (newCount >= CIRCUIT_BREAKER_THRESHOLD) {
          if (DEBUG_AUTOFIX) {
            toolsLogger.error(`[SILENT FIX] 🔴 Circuit breaker TRIPPED after ${newCount} consecutive failures!`);
          }
          setCircuitBreakerTrippedAt(Date.now());
          // Record circuit breaker trip to database
          await updateSessionMutation.mutateAsync({
            sessionId,
            projectId,
            circuitBreakerTripped: true,
          });
          console.log('[AutoFix] Circuit breaker tripped', { consecutiveFailures: newCount });
          
          // Clear the entire queue when circuit breaker trips
          autoFixQueueRef.current.clear();
        }
        
        return newCount;
      });
      
      if (DEBUG_AUTOFIX) {
        toolsLogger.error(`[SILENT FIX] Attempt ${queueItem.attempts} failed`, error as Error, {
          consecutiveFailures: consecutiveFailuresRef.current + 1
        });
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
  
  // Create stable event handlers using useCallback with minimal dependencies
  const handlePreviewError = useCallback((event: CustomEvent) => {
    // 🛑 KILL SWITCH: Check if auto-fix is disabled
    if (isKillSwitchEnabled()) {
      if (DEBUG_AUTOFIX) {
        toolsLogger.warn('[SILENT FIX] 🛑 KILL SWITCH ACTIVE - Auto-fix disabled');
      }
      console.log('[AutoFix] Kill switch active');
      return;
    }
    
    if (DEBUG_AUTOFIX) {
      toolsLogger.debug('[SILENT FIX] Preview error event received', { 
        detail: event.detail,
        currentProject: currentProjectIdRef.current,
        eventProject: projectId
      });
    }
    
    // 🔥 CRITICAL: Verify event is for current project to prevent cross-contamination
    if (currentProjectIdRef.current !== projectId) {
      if (DEBUG_AUTOFIX) {
        toolsLogger.warn('[SILENT FIX] Ignoring error from different project', {
          currentProject: currentProjectIdRef.current,
          eventProject: projectId
        });
      }
      console.log('[AutoFix] Cross-project event ignored', { 
        currentProject: currentProjectIdRef.current, 
        eventProject: projectId 
      });
      return;
    }
    
    // Add comprehensive event validation
    if (!event?.detail) {
      toolsLogger.error('[SILENT FIX] Invalid error event: missing detail property');
      console.warn('[AutoFix] Invalid event - missing detail');
      return;
    }
    
    const { sceneId, sceneName, error } = event.detail;
    
    // Track error detection
    // Track error detection in session
    sessionMetrics.current.totalErrors++;
    sessionMetrics.current.uniqueErrors.add(getErrorSignature(sceneId, error?.message || String(error)));
    
    if (DEBUG_AUTOFIX) {
      console.log('[AutoFix] Error detected', { sceneId, sceneName, error: error?.message });
    }
    
    // Validate required fields
    if (!sceneId || typeof sceneId !== 'string') {
      toolsLogger.error('[SILENT FIX] Invalid error event: sceneId is missing or invalid', undefined, { detail: event.detail });
      return;
    }
    
    if (!sceneName || typeof sceneName !== 'string') {
      toolsLogger.error('[SILENT FIX] Invalid error event: sceneName is missing or invalid', undefined, { detail: event.detail });
      return;
    }
    
    if (!error) {
      toolsLogger.error('[SILENT FIX] Invalid error event: error is missing', undefined, { detail: event.detail });
      return;
    }
    
    // 🚨 FIX: Check if we've already fixed this exact error
    const errorSignature = getErrorSignature(sceneId, error?.message || String(error));
    if (fixedErrorSignatures.current.has(errorSignature)) {
      if (DEBUG_AUTOFIX) {
        toolsLogger.warn('[SILENT FIX] Already attempted to fix this exact error, skipping', { 
          sceneId, 
          errorSignature 
        });
      }
      if (DEBUG_AUTOFIX) {
        console.log('[AutoFix] Duplicate error ignored', { sceneId, errorSignature });
      }
      return;
    }
    
    // 🚨 FIX: Enforce minimum time between fixes
    const now = Date.now();
    const timeSinceLastFix = now - lastFixAttemptTime.current;
    if (timeSinceLastFix < MIN_TIME_BETWEEN_FIXES_MS) {
      if (DEBUG_AUTOFIX) {
        toolsLogger.warn('[SILENT FIX] Too soon since last fix attempt', { 
          timeSinceLastFix, 
          minRequired: MIN_TIME_BETWEEN_FIXES_MS 
        });
      }
      if (DEBUG_AUTOFIX) {
        console.log('[AutoFix] Rate limited', { 
          timeSinceLastFix, 
          minRequired: MIN_TIME_BETWEEN_FIXES_MS 
        });
      }
      return;
    }
    
    // Don't track errors for scenes that are currently being fixed
    if (fixingScenesRef.current.has(sceneId)) {
      if (DEBUG_AUTOFIX) {
        toolsLogger.debug('[SILENT FIX] Ignoring error for scene being fixed', { sceneId });
      }
      return;
    }
    
    // Check if we're in cooldown
    if (isInCooldownRef.current) {
      if (DEBUG_AUTOFIX) {
        toolsLogger.warn('[SILENT FIX] ERROR DETECTED BUT IN COOLDOWN - Auto-fix disabled temporarily');
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
    
    // Use stable ref for processAutoFixQueue with longer debounce
    queueItem.debounceTimer = setTimeout(() => {
      // Double-check project hasn't changed
      if (currentProjectIdRef.current === projectId) {
        lastFixAttemptTime.current = Date.now();
        fixedErrorSignatures.current.add(errorSignature);
        processAutoFixQueueRef.current(sceneId);
      } else {
        if (DEBUG_AUTOFIX) {
          toolsLogger.warn('[SILENT FIX] Project changed, cancelling queued fix');
        }
      }
    }, 5000); // Increased from 2000ms to 5000ms
    
    // Add to queue
    autoFixQueueRef.current.set(sceneId, queueItem);
    
    if (DEBUG_AUTOFIX) {
      toolsLogger.debug('[SILENT FIX] Queued for auto-fix after debounce', { sceneId });
    }
  }, []); // Empty deps - uses refs for all state
  
  const handleSceneDeleted = useCallback((event: CustomEvent) => {
    const { sceneId } = event.detail;
    
    if (DEBUG_AUTOFIX) {
      toolsLogger.debug('[SILENT FIX] Scene deleted, cleaning up', { sceneId });
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
  }, []);
  
  const handleSceneFixed = useCallback((event: CustomEvent) => {
    const { sceneId } = event.detail;
    
    if (DEBUG_AUTOFIX) {
      toolsLogger.debug('[SILENT FIX] Scene fixed event received', { sceneId });
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
  }, []);

  // Listen for preview panel errors - now with stable handlers
  useEffect(() => {
    // 🛑 KILL SWITCH: Don't set up listeners if disabled
    if (isKillSwitchEnabled()) {
      if (DEBUG_AUTOFIX) {
        toolsLogger.warn('[SILENT FIX] 🛑 Kill switch active - not setting up event listeners');
      }
      return;
    }
    
    // 🔥 CRITICAL: Update project ID ref when it changes
    currentProjectIdRef.current = projectId;
    
    // 🚨 FIX: Clear error signatures when project changes
    fixedErrorSignatures.current.clear();
    lastFixAttemptTime.current = 0;
    
    // Track project switch in metrics
    // Start new session for new project
    sessionMetrics.current = {
      totalErrors: 0,
      uniqueErrors: new Set<string>(),
      successfulFixes: 0,
      failedFixes: 0,
      totalApiCalls: 0,
      totalCost: 0,
    };
    
    if (DEBUG_AUTOFIX) {
      console.log('[AutoFix] Project switch', { projectId });
    }
    
    if (DEBUG_AUTOFIX) {
      toolsLogger.debug('[SILENT FIX] Setting up event listeners for new project', {
        projectId,
        autoFixQueueSize: autoFixQueueRef.current.size,
        fixingScenes: Array.from(fixingScenesRef.current)
      });
    }
    
    // Handler functions are now defined outside with useCallback, use them directly
    if (DEBUG_AUTOFIX) {
      toolsLogger.debug('[SILENT FIX] Adding event listeners');
    }
    
    window.addEventListener('preview-scene-error', handlePreviewError as EventListener);
    window.addEventListener('scene-deleted', handleSceneDeleted as EventListener);
    window.addEventListener('scene-fixed', handleSceneFixed as EventListener);
    
    if (DEBUG_AUTOFIX) {
      toolsLogger.debug('[SILENT FIX] Event listeners added');
    }
    
    // Process any existing items in the queue
    if (autoFixQueueRef.current.size > 0) {
      if (DEBUG_AUTOFIX) {
        toolsLogger.debug('[SILENT FIX] Processing existing queue items', { size: autoFixQueueRef.current.size });
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
        toolsLogger.debug('[SILENT FIX] 🧹 FULL CLEANUP - projectId changed or unmounting', {
          oldProjectId: projectId,
          queueSize: autoFixQueueRef.current.size
        });
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
            toolsLogger.debug('[SILENT FIX] Cleared timer for scene', { sceneId });
          }
        }
      });
      
      // Clear the queue completely when projectId changes
      autoFixQueueRef.current.clear();
      
      // Clear fixing scenes set
      setFixingScenes(new Set());
      
      // 🚨 FIX: Reset all tracking state
      setFixHistory([]);
      setIsInCooldown(false);
      setConsecutiveFailures(0);
      setCircuitBreakerTrippedAt(null);
      
      // Clear error signature tracking
      fixedErrorSignatures.current.clear();
      lastFixAttemptTime.current = 0;
      
      if (DEBUG_AUTOFIX) {
        toolsLogger.debug('[SILENT FIX] ✅ Complete cleanup done, all state reset');
      }
    };
  }, [projectId, handlePreviewError, handleSceneDeleted, handleSceneFixed]); // Include stable handlers in deps

  // Add a manual trigger for debugging
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Expose session metrics for debugging
      (window as any).getAutofixSession = () => {
        console.log('=== AUTOFIX SESSION METRICS ===');
        console.log('Session ID:', sessionId);
        console.log('Total Errors:', sessionMetrics.current.totalErrors);
        console.log('Unique Errors:', sessionMetrics.current.uniqueErrors.size);
        console.log('Successful Fixes:', sessionMetrics.current.successfulFixes);
        console.log('Failed Fixes:', sessionMetrics.current.failedFixes);
        console.log('API Calls:', sessionMetrics.current.totalApiCalls);
        console.log('Estimated Cost:', `$${sessionMetrics.current.totalCost.toFixed(4)}`);
        return sessionMetrics.current;
      };
      
      // Expose kill switch controls
      (window as any).enableAutofixKillSwitch = () => {
        localStorage.setItem('autofix-kill-switch', 'true');
        console.log('🛑 Auto-fix KILL SWITCH ENABLED! Auto-fix is now disabled.');
        console.log('To re-enable, run: disableAutofixKillSwitch()');
      };
      
      (window as any).disableAutofixKillSwitch = () => {
        localStorage.removeItem('autofix-kill-switch');
        console.log('✅ Auto-fix kill switch disabled. Auto-fix is now active.');
      };
      
      (window as any).autofixKillSwitchStatus = () => {
        const hardcoded = AUTOFIX_KILL_SWITCH;
        const localStorage = window.localStorage.getItem('autofix-kill-switch') === 'true';
        const maxZero = MAX_FIXES_PER_SESSION === 0;
        const isActive = hardcoded || localStorage || maxZero;
        
        console.log('=== AUTO-FIX KILL SWITCH STATUS ===');
        console.log('Kill Switch Active:', isActive ? '🛑 YES' : '✅ NO');
        console.log('Hardcoded Constant:', hardcoded ? 'true' : 'false');
        console.log('LocalStorage Setting:', localStorage ? 'true' : 'false');
        console.log('MAX_FIXES_PER_SESSION:', MAX_FIXES_PER_SESSION);
        console.log('');
        if (isActive) {
          console.log('⚠️ Auto-fix is currently DISABLED');
        } else {
          console.log('✅ Auto-fix is currently ACTIVE');
        }
        
        return { isActive, hardcoded, localStorage, maxZero };
      };
      
      // Keep the manual trigger
      (window as any).forceAutoFix = () => {
        toolsLogger.debug('[SILENT FIX] Manual trigger activated');
        toolsLogger.debug('[SILENT FIX] Current queue', { queue: autoFixQueueRef.current });
        if (autoFixQueueRef.current.size > 0) {
          const firstSceneId = Array.from(autoFixQueueRef.current.keys())[0];
          if (firstSceneId) {
            toolsLogger.debug('[SILENT FIX] Processing scene', { sceneId: firstSceneId });
            processAutoFixQueue(firstSceneId);
          }
        } else {
          toolsLogger.debug('[SILENT FIX] No items in queue');
        }
      };
    }
  }, [processAutoFixQueue]);
  
  // Return empty object - no UI interaction needed
  return {};
}