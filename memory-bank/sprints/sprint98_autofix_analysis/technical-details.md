# Sprint 98: Technical Deep Dive - Autofix System

## Detailed Code Analysis

### 1. Event Flow Tracing

#### Error Detection Points in PreviewPanelG.tsx

```typescript
// Line 369-384: Syntax Error Detection
catch (syntaxError) {
  console.error(`[PreviewPanelG] ❌ Scene ${index} has SYNTAX ERROR:`, syntaxError);
  const errorEvent = new CustomEvent('preview-scene-error', {
    detail: {
      sceneId,
      sceneName,
      sceneIndex: index + 1,
      error: new Error(`Syntax Error in ${sceneName}: ${errorMessage}`)
    }
  });
  window.dispatchEvent(errorEvent);
}

// Line 400-402: Runtime Error Detection
const errorEvent = new CustomEvent('preview-scene-error', {
  detail: { sceneId, sceneName, sceneIndex: index + 1, error }
});
window.dispatchEvent(errorEvent);
```

#### Event Reception in use-auto-fix.ts

```typescript
// Lines 302-363: Event Handler
const handlePreviewError = (event: CustomEvent) => {
  const { sceneId, sceneName, error } = event.detail;
  
  // Skip if already fixing
  if (fixingScenesRef.current.has(sceneId)) return;
  
  // Check cooldown
  if (isInCooldownRef.current) return;
  
  // Create queue item with debounce
  const queueItem: AutoFixQueueItem = {
    sceneId,
    errorDetails: { sceneName, errorMessage: error?.message },
    attempts: 0,
    firstErrorTime: Date.now(),
    lastAttemptTime: 0
  };
  
  // Debounce for 2 seconds
  queueItem.debounceTimer = setTimeout(() => {
    processAutoFixQueue(sceneId);
  }, 2000);
  
  autoFixQueueRef.current.set(sceneId, queueItem);
};
```

### 2. Queue Management System

#### Data Structures

```typescript
// AutoFixQueueItem structure
interface AutoFixQueueItem {
  sceneId: string;
  errorDetails: ErrorDetails;
  attempts: number;
  firstErrorTime: number;
  lastAttemptTime: number;
  debounceTimer?: NodeJS.Timeout;
  previousErrors?: string[];
}

// Queue storage
const autoFixQueueRef = useRef<Map<string, AutoFixQueueItem>>(new Map());
```

#### Queue Processing Logic

```typescript
// Lines 188-292: processAutoFixQueue
const processAutoFixQueue = useCallback(async (sceneId: string) => {
  const queueItem = autoFixQueueRef.current.get(sceneId);
  if (!queueItem) return;
  
  // Rate limiting check
  if (recentHistory.length >= MAX_FIXES_PER_SESSION) {
    setIsInCooldown(true);
    autoFixQueueRef.current.clear();
    return;
  }
  
  // Retry limit check
  if (queueItem.attempts >= 3) {
    autoFixQueueRef.current.delete(sceneId);
    return;
  }
  
  // Loop detection
  const isRepeatingError = queueItem.previousErrors?.includes(currentError);
  if (isRepeatingError && queueItem.attempts >= 2) {
    queueItem.attempts = 3; // Jump to rewrite
  }
  
  // Execute fix
  try {
    await executeAutoFix(sceneId, queueItem.errorDetails, queueItem.attempts + 1);
  } catch (error) {
    // Retry with exponential backoff
    setTimeout(() => processAutoFixQueue(sceneId), retryDelay);
  }
}, [executeAutoFix]);
```

### 3. Fix Execution Pipeline

#### API Call to Generation Service

```typescript
// Lines 132-136: Fix execution
const result = await generateSceneMutation.mutateAsync({
  projectId,
  userMessage: fixPrompt,
  userContext: { imageUrls: undefined }
});
```

#### State Update After Fix

```typescript
// Lines 145-159: State synchronization
// Invalidate tRPC cache
await utils.generation.getProjectScenes.invalidate({ projectId });

// Fetch latest scene data
const updatedScenes = await refetchScenes();

// Convert and update with guaranteed refresh
const updatedProps = convertDbScenesToInputProps(updatedScenes.data);
updateAndRefresh(projectId, () => updatedProps);

// Dispatch success event
const successEvent = new CustomEvent('scene-fixed', {
  detail: { sceneId }
});
window.dispatchEvent(successEvent);
```

### 4. Rate Limiting Implementation

#### Constants and Thresholds

```typescript
const MAX_FIXES_PER_SESSION = 10;   // Total fixes allowed
const MAX_FIXES_PER_SCENE = 3;      // Per-scene limit
const COOLDOWN_PERIOD_MS = 60000;   // 1 minute cooldown
const FIX_HISTORY_WINDOW_MS = 300000; // 5 minute window
```

#### Cooldown Management

```typescript
// Lines 207-225: Rate limit enforcement
if (recentHistory.length >= MAX_FIXES_PER_SESSION) {
  setIsInCooldown(true);
  setTimeout(() => {
    setIsInCooldown(false);
  }, COOLDOWN_PERIOD_MS);
  
  autoFixQueueRef.current.clear();
  return;
}
```

### 5. State Management Issues

#### Problem: Multiple State Trackers

```typescript
// use-auto-fix.ts state
const [autoFixQueue] = useState<Map<string, AutoFixQueueItem>>(new Map());
const [fixingScenes, setFixingScenes] = useState<Set<string>>(new Set());
const [fixHistory, setFixHistory] = useState<number[]>([]);
const [isInCooldown, setIsInCooldown] = useState(false);

// Refs for immediate access
const autoFixQueueRef = useRef(autoFixQueue);
const fixingScenesRef = useRef(fixingScenes);
const fixHistoryRef = useRef(fixHistory);
const isInCooldownRef = useRef(isInCooldown);
```

**Issue**: State and refs can desynchronize during rapid updates.

#### Problem: Stale Closure Capture

```typescript
// Event handler captures old processAutoFixQueue
const handlePreviewError = (event: CustomEvent) => {
  // This might use an old version of processAutoFixQueue
  queueItem.debounceTimer = setTimeout(() => {
    processAutoFixQueue(sceneId); // Stale reference
  }, 2000);
};
```

### 6. Memory Leak Vulnerabilities

#### Blob URL Management

```typescript
// PreviewPanelG.tsx Line 691
useEffect(() => {
  return () => {
    if (componentBlobUrl) {
      URL.revokeObjectURL(componentBlobUrl);
    }
  };
}, [componentBlobUrl]);
```

**Issue**: If component unmounts during error, cleanup might not occur.

#### Event Listener Cleanup

```typescript
// use-auto-fix.ts Lines 449-463
return () => {
  window.removeEventListener('preview-scene-error', handlePreviewError);
  // Timer cleanup
  autoFixQueueRef.current.forEach(item => {
    if (item.debounceTimer) clearTimeout(item.debounceTimer);
  });
};
```

**Issue**: Cleanup only on unmount, not on dependency changes.

### 7. Critical Fix Recommendations

#### Fix 1: Stable Function References

```typescript
const processAutoFixQueueRef = useRef<typeof processAutoFixQueue>();

useEffect(() => {
  processAutoFixQueueRef.current = processAutoFixQueue;
}, [processAutoFixQueue]);

const handlePreviewError = useCallback((event: CustomEvent) => {
  // Use ref for stable reference
  setTimeout(() => {
    processAutoFixQueueRef.current?.(sceneId);
  }, 2000);
}, []); // No dependencies - stable forever
```

#### Fix 2: Proper Cleanup on Dependency Change

```typescript
useEffect(() => {
  // Setup listeners
  
  return () => {
    // Complete cleanup
    window.removeEventListener('preview-scene-error', handlePreviewError);
    autoFixQueueRef.current.forEach(item => {
      if (item.debounceTimer) clearTimeout(item.debounceTimer);
    });
    autoFixQueueRef.current.clear();
  };
}, [projectId, scenes.length]); // Track all relevant changes
```

#### Fix 3: Event Validation

```typescript
const handlePreviewError = (event: CustomEvent) => {
  // Validate event structure
  if (!event?.detail) {
    console.error('[AUTOFIX] Invalid event: missing detail');
    return;
  }
  
  const { sceneId, sceneName, error } = event.detail;
  
  if (!sceneId || !sceneName || !error) {
    console.error('[AUTOFIX] Invalid event detail', event.detail);
    return;
  }
  
  // Process valid event
};
```

#### Fix 4: Queue Persistence

```typescript
// Use Zustand for persistent queue
const useAutoFixStore = create((set, get) => ({
  queue: new Map<string, AutoFixQueueItem>(),
  
  enqueue: (item: AutoFixQueueItem) => {
    set(state => ({
      queue: new Map(state.queue).set(item.sceneId, item)
    }));
  },
  
  dequeue: (sceneId: string) => {
    set(state => {
      const newQueue = new Map(state.queue);
      newQueue.delete(sceneId);
      return { queue: newQueue };
    });
  }
}));
```

### 8. Performance Optimizations

#### Debounce Optimization

```typescript
// Current: Individual timers per scene
// Better: Batch processing
const batchProcessor = useMemo(() => {
  let pendingFixes = new Set<string>();
  let batchTimer: NodeJS.Timeout;
  
  return {
    add: (sceneId: string) => {
      pendingFixes.add(sceneId);
      clearTimeout(batchTimer);
      batchTimer = setTimeout(() => {
        processBatch(Array.from(pendingFixes));
        pendingFixes.clear();
      }, 2000);
    }
  };
}, []);
```

#### Memory Management

```typescript
// Add memory pressure monitoring
const checkMemoryPressure = () => {
  if (performance.memory) {
    const { usedJSHeapSize, jsHeapSizeLimit } = performance.memory;
    const usage = usedJSHeapSize / jsHeapSizeLimit;
    
    if (usage > 0.9) {
      // Clear non-essential caches
      autoFixQueueRef.current.clear();
      console.warn('[AUTOFIX] Memory pressure detected, clearing queue');
    }
  }
};
```

### 9. Debug Improvements

#### Structured Logging

```typescript
const logger = {
  debug: (message: string, data?: any) => {
    if (!DEBUG_AUTOFIX) return;
    console.log(`[AUTOFIX:DEBUG] ${message}`, data);
  },
  
  error: (message: string, error?: any) => {
    console.error(`[AUTOFIX:ERROR] ${message}`, error);
  },
  
  metric: (event: string, data: any) => {
    if (!DEBUG_AUTOFIX) return;
    console.log(`[AUTOFIX:METRIC] ${event}`, {
      timestamp: Date.now(),
      ...data
    });
  }
};
```

#### Event Tracing

```typescript
const traceEvent = (eventName: string, detail: any) => {
  const traceId = Math.random().toString(36).substr(2, 9);
  
  logger.debug(`Event dispatched: ${eventName}`, {
    traceId,
    detail,
    stack: new Error().stack
  });
  
  return traceId;
};
```

### 10. Test Scenarios

#### Scenario 1: Rapid Error Generation
```typescript
// Test multiple errors in quick succession
for (let i = 0; i < 5; i++) {
  window.dispatchEvent(new CustomEvent('preview-scene-error', {
    detail: {
      sceneId: `scene-${i}`,
      sceneName: `Test Scene ${i}`,
      error: new Error(`Test error ${i}`)
    }
  }));
}
```

#### Scenario 2: Error During Fix
```typescript
// Simulate error while fix is in progress
window.dispatchEvent(new CustomEvent('preview-scene-error', {
  detail: { sceneId: 'scene-1', error: new Error('Initial error') }
}));

setTimeout(() => {
  window.dispatchEvent(new CustomEvent('preview-scene-error', {
    detail: { sceneId: 'scene-1', error: new Error('Error during fix') }
  }));
}, 1000);
```

#### Scenario 3: Rate Limit Testing
```typescript
// Generate enough errors to trigger rate limiting
for (let i = 0; i < MAX_FIXES_PER_SESSION + 5; i++) {
  await simulateError(`scene-${i}`);
  await wait(100);
}
// Verify cooldown activated
```

## Conclusion

The autofix system's architecture is sound but implementation details need refinement. The primary issues stem from React lifecycle management, event system reliability, and state synchronization. The proposed fixes address these core issues while maintaining the sophisticated progressive fix strategy and rate limiting features.