# Sprint 73: Auto-Fix Analysis - Current Issues & Improvements

## Is it perfect now?

**Not quite.** While the implementation is solid, there are several areas that need attention:

### 1. System Prompt Issues

**Current prompt:**
```typescript
const fixPrompt = `Fix scene compilation error: "${errorDetails.errorMessage}" in scene "${errorDetails.sceneName}".`;
```

**Problems:**
- Too generic - doesn't tell the AI to use the `fixBrokenScene` tool
- Doesn't provide context about the scene code
- Same prompt on every retry (no learning from previous attempts)

**Should be:**
```typescript
const fixPrompt = `🔧 FIX BROKEN SCENE: Scene "${errorDetails.sceneName}" (ID: ${sceneId}) has a compilation error. The error message is: "${errorDetails.errorMessage}". This scene needs to be fixed using the fixBrokenScene tool. The broken code is in the scene with ID ${sceneId}.`;
```

### 2. No Difference Between Retry Attempts

Currently, the system uses the **exact same prompt** for all 3 attempts. This means:
- Attempt 1: "Fix scene compilation error: 'foo' is not defined"
- Attempt 2: Same prompt (likely same failure)
- Attempt 3: Same prompt (likely same failure)

**Better approach:**
```typescript
const getFixPrompt = (attempt: number) => {
  if (attempt === 1) {
    return `Fix scene compilation error: "${errorDetails.errorMessage}"...`;
  } else if (attempt === 2) {
    return `Previous fix attempt failed. Try a different approach. Error: "${errorDetails.errorMessage}"...`;
  } else {
    return `Two fix attempts failed. Use a simpler solution. Error: "${errorDetails.errorMessage}"...`;
  }
};
```

### 3. Infinity Loop Prevention

**Current safeguards:**
✅ **Max 3 attempts** - Hard limit prevents infinite retries
✅ **Exponential backoff** - 5s, 10s, 20s delays between retries
✅ **Scene existence check** - Stops if scene deleted
✅ **Fixing set tracking** - Prevents duplicate fix attempts

**Potential infinity scenarios:**
1. **Rapid error cycling** - If a fix creates a new error:
   - Scene A has error → Fix → Scene A now has different error
   - This would trigger a new fix cycle (not infinity, but wasteful)

2. **Memory leak** - Queue items aren't cleaned up if component unmounts during debounce

### 4. Error Coverage

**What it catches:**
- Compilation errors (syntax, undefined variables)
- ESBuild failures
- Component load failures

**What it might miss:**
- Runtime errors (only catches compile-time)
- Errors that happen after initial render
- Cascading errors from dependencies

### 5. Specific Issues to Fix

#### Issue 1: Weak System Prompt
```typescript
// Current - too vague
const fixPrompt = `Fix scene compilation error: "${errorDetails.errorMessage}" in scene "${errorDetails.sceneName}".`;

// Better - explicit tool usage
const fixPrompt = `Use the fixBrokenScene tool to fix this compilation error in scene "${errorDetails.sceneName}" (ID: ${sceneId}): "${errorDetails.errorMessage}"`;
```

#### Issue 2: No Context Accumulation
The AI doesn't know what was tried before, so it might:
- Try the same fix repeatedly
- Not learn from previous failures

#### Issue 3: Silent Failures
When giving up after 3 attempts, the user has no idea:
- A scene is broken
- Auto-fix failed
- They might have a blank/missing scene

## Recommendations

### 1. Improve Prompt Strategy
```typescript
const executeAutoFix = useCallback(async (
  sceneId: string, 
  errorDetails: ErrorDetails,
  attemptNumber: number = 1
) => {
  // Vary prompt based on attempt
  let fixPrompt: string;
  
  if (attemptNumber === 1) {
    fixPrompt = `Use the fixBrokenScene tool to fix scene "${errorDetails.sceneName}" (ID: ${sceneId}) with error: "${errorDetails.errorMessage}"`;
  } else if (attemptNumber === 2) {
    fixPrompt = `Previous fix failed. Try a simpler approach using fixBrokenScene tool for scene "${errorDetails.sceneName}" error: "${errorDetails.errorMessage}"`;
  } else {
    fixPrompt = `Two fixes failed. Use minimal working code with fixBrokenScene tool for scene "${errorDetails.sceneName}". Just make it compile without errors.`;
  }
  
  // ... rest of implementation
}, [...deps]);
```

### 2. Add Failure Tracking
```typescript
interface AutoFixQueueItem {
  // ... existing fields
  previousErrors?: string[]; // Track what errors we've seen
  fixAttempts?: string[]; // Track what fixes were tried
}
```

### 3. Consider Fallback Strategy
After 3 failed attempts, instead of giving up silently:
- Replace with a placeholder scene
- Or notify in a non-intrusive way
- Or flag for manual review later

### 4. Add Cleanup
```typescript
useEffect(() => {
  return () => {
    // Clear all timers on unmount
    autoFixQueue.forEach(item => {
      if (item.debounceTimer) {
        clearTimeout(item.debounceTimer);
      }
    });
    autoFixQueue.clear(); // Clear the queue too
  };
}, [autoFixQueue]);
```

## Summary

The current implementation is **good but not perfect**:

✅ **Prevents infinity** - Max 3 attempts with backoff
✅ **Silent operation** - No user interruption  
✅ **Smart debouncing** - Avoids rapid fixes

❌ **Weak prompts** - Not optimized for the AI
❌ **No learning** - Same approach each retry
❌ **Silent failures** - User unaware when fixes fail
❌ **No context** - AI doesn't know previous attempts

The system works but could be significantly improved with better prompting and retry strategies.