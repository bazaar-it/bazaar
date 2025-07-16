# Sprint 73: Auto-Autofix Implementation Plan

## Overview
Transform the current manual auto-fix system into a truly automatic error resolution system that requires zero user intervention.

## Implementation Steps

### Step 1: Update useAutoFix Hook with Queue System

#### 1.1 Add Queue Management
```typescript
// In use-auto-fix.ts
interface AutoFixQueueItem {
  sceneId: string;
  errorDetails: ErrorDetails;
  attempts: number;
  firstErrorTime: number;
  lastAttemptTime: number;
  debounceTimer?: NodeJS.Timeout;
}

// Add to useAutoFix hook
const [autoFixQueue] = useState<Map<string, AutoFixQueueItem>>(new Map());
const [autoFixEnabled] = useState(true); // TODO: Get from user settings
```

#### 1.2 Modify Error Event Handler
```typescript
// Replace current handlePreviewError with:
const handlePreviewError = (event: CustomEvent) => {
  const { sceneId, sceneName, error } = event.detail;
  
  // Skip if already fixing
  if (fixingScenes.has(sceneId)) return;
  
  // Add to queue with debouncing
  const existingItem = autoFixQueue.get(sceneId);
  
  if (existingItem?.debounceTimer) {
    clearTimeout(existingItem.debounceTimer);
  }
  
  const queueItem: AutoFixQueueItem = {
    sceneId,
    errorDetails: {
      sceneName,
      errorMessage: error?.message || String(error),
      timestamp: Date.now()
    },
    attempts: existingItem?.attempts || 0,
    firstErrorTime: existingItem?.firstErrorTime || Date.now(),
    lastAttemptTime: 0
  };
  
  // Set debounce timer
  queueItem.debounceTimer = setTimeout(() => {
    if (autoFixEnabled) {
      processAutoFixQueue(sceneId);
    } else {
      // Fallback to manual fix
      setSceneErrors(prev => {
        const next = new Map(prev);
        next.set(sceneId, queueItem.errorDetails);
        return next;
      });
    }
  }, 2000); // 2 second debounce
  
  autoFixQueue.set(sceneId, queueItem);
};
```

### Step 2: Implement Auto-Fix Processing

#### 2.1 Queue Processor
```typescript
const processAutoFixQueue = async (sceneId: string) => {
  const queueItem = autoFixQueue.get(sceneId);
  if (!queueItem) return;
  
  // Check if scene still exists
  const sceneStillExists = scenes.some(s => s.id === sceneId);
  if (!sceneStillExists) {
    autoFixQueue.delete(sceneId);
    return;
  }
  
  // Check retry limits
  if (queueItem.attempts >= 3) {
    // Max retries reached, give up silently
    autoFixQueue.delete(sceneId);
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[SILENT FIX] Giving up on ${queueItem.errorDetails.sceneName} after 3 attempts`);
    }
    return;
  }
  
  // Update attempt count
  queueItem.attempts++;
  queueItem.lastAttemptTime = Date.now();
  
  // Execute fix silently
  try {
    await executeAutoFix(sceneId, queueItem.errorDetails);
    
    // Success - just clean up
    autoFixQueue.delete(sceneId);
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[SILENT FIX] Successfully fixed ${queueItem.errorDetails.sceneName}`);
    }
    
  } catch (error) {
    // Failed, schedule retry silently
    if (process.env.NODE_ENV === 'development') {
      console.error(`[SILENT FIX] Attempt ${queueItem.attempts} failed:`, error);
    }
    
    // Schedule retry with exponential backoff
    const retryDelay = Math.min(5000 * Math.pow(2, queueItem.attempts - 1), 30000);
    
    setTimeout(() => {
      processAutoFixQueue(sceneId);
    }, retryDelay);
  }
};
```

#### 2.2 Extract Fix Logic
```typescript
const executeAutoFix = async (sceneId: string, errorDetails: ErrorDetails) => {
  // This is the core fix logic extracted from handleAutoFix
  const fixPrompt = `Fix scene compilation error: "${errorDetails.errorMessage}" in scene "${errorDetails.sceneName}".`;
  
  // No chat messages - completely silent
  
  // Mark as fixing
  setFixingScenes(prev => new Set(prev).add(sceneId));
  
  // Call generation API
  const result = await generateSceneMutation.mutateAsync({
    projectId,
    userMessage: fixPrompt,
    userContext: { imageUrls: undefined }
  });
  
  // Process result (same as current handleAutoFix)
  // ... existing fix processing logic ...
};
```

### Step 3: Remove All UI Components

#### 3.1 Remove AutoFixErrorBanner
- Delete the component entirely
- Remove all imports and usages
- No user-facing error indicators

#### 3.2 Silent Operation Only
- No status indicators
- No progress updates
- No error messages
- Complete background operation

### Step 4: Add User Settings

#### 4.1 Settings Schema
```typescript
interface AutoFixSettings {
  enabled: boolean;
  debounceMs: number;
  maxRetries: number;
  showNotifications: boolean;
}
```

#### 4.2 Settings UI
Add to user preferences:
- Toggle: "Automatically fix scene errors"
- Slider: "Wait time before fixing (1-10 seconds)"
- Number: "Maximum fix attempts (1-5)"
- Toggle: "Show fix notifications"

### Step 5: Testing Strategy

#### 5.1 Test Scenarios
1. **Single Error**: Verify auto-fix after debounce
2. **Rapid Errors**: Ensure debouncing works
3. **Persistent Error**: Test retry logic
4. **Max Retries**: Verify fallback to manual
5. **Concurrent Errors**: Multiple scenes failing
6. **Error During Fix**: Handle fix failures gracefully
7. **Scene Deletion**: Clean up queue properly

#### 5.2 Debug Mode
Add debug logging that can be enabled:
```typescript
const DEBUG_AUTOFIX = process.env.NODE_ENV === 'development';

if (DEBUG_AUTOFIX) {
  console.log('[AutoFix Queue]', {
    queue: Array.from(autoFixQueue.entries()),
    fixing: Array.from(fixingScenes),
    errors: Array.from(sceneErrors.entries())
  });
}
```

### Step 6: Rollout Plan

#### Phase 1: Hidden Feature (Week 1)
- Implement core functionality
- Enable only for internal testing
- Monitor for issues

#### Phase 2: Opt-in Beta (Week 2)
- Add settings UI
- Enable for users who opt-in
- Collect feedback

#### Phase 3: Default On (Week 3)
- Make auto-fix default behavior
- Keep manual option available
- Monitor metrics

#### Phase 4: Optimization (Week 4)
- Tune debounce timing based on data
- Optimize retry strategy
- Improve error detection

## Success Metrics

1. **Error Resolution Time**: Average time from error to fix
2. **Fix Success Rate**: % of errors fixed automatically
3. **Retry Efficiency**: Average attempts needed
4. **User Satisfaction**: Feedback on auto-fix experience
5. **Performance Impact**: CPU/memory usage during fixes

## Risk Mitigation

1. **Infinite Loops**: Hard limit on retries + cooldown period
2. **Performance**: Queue processing + debouncing
3. **User Confusion**: Clear notifications + settings
4. **Debugging**: Comprehensive logging + debug mode
5. **Rollback**: Feature flag for quick disable

## Future Enhancements

1. **ML-Powered**: Learn from successful fixes
2. **Predictive**: Fix common errors before they happen
3. **Batch Fixes**: Fix multiple related errors together
4. **Context Aware**: Consider user's recent actions
5. **Smart Scheduling**: Fix during idle times