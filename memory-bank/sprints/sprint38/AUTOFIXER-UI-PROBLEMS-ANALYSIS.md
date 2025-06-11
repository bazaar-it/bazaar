# Autofixer UI Problems Analysis

## Current Issues

### 1. **UI Lag**
- The autofixer UI appears to lag when showing/hiding
- Event listeners might be causing performance issues
- Multiple re-renders when errors occur

### 2. **Multi-Scene Error Confusion**
- When multiple scenes have errors, the autofixer doesn't know which one to fix
- The error event only stores one scene's details at a time
- No visual indication of which scene the error belongs to

### 3. **Stale UI After Scene Deletion**
- After deleting a broken scene, the autofix UI still shows
- The error state isn't cleared when scenes are removed
- Event listeners don't clean up properly

### 4. **Frequent Failures**
- The autofixer often fails to fix scenes
- Error context might not be complete when passed to the fix tool
- The brain orchestrator might not always select the fixBrokenScene tool

## Root Causes

### 1. **Single Error State Problem**
```javascript
// Current implementation only tracks ONE error at a time
const [sceneErrorDetails, setSceneErrorDetails] = useState<{
  sceneId: string;
  sceneName: string;
  errorMessage: string;
} | null>(null);
```

### 2. **No Scene Existence Validation**
The autofix UI doesn't check if the error scene still exists:
```javascript
// Missing validation like:
const sceneStillExists = scenes.some(s => s.id === sceneErrorDetails?.sceneId);
```

### 3. **Event System Issues**
- Events are global and don't track multiple errors
- No cleanup when scenes are deleted
- Race conditions between error detection and UI updates

### 4. **Brain Orchestrator Tool Selection**
The orchestrator might not recognize autofix requests properly:
- Missing clear keywords in the prompt
- Error context not properly formatted
- Tool selection logic might not prioritize fixBrokenScene

## Proposed Solutions

### 1. **Track Multiple Errors**
```typescript
// Track all scene errors in a Map
const [sceneErrors, setSceneErrors] = useState<Map<string, {
  sceneName: string;
  errorMessage: string;
  timestamp: number;
}>>(new Map());
```

### 2. **Add Scene Validation**
```typescript
// Check if error scenes still exist
const activeErrors = Array.from(sceneErrors.entries())
  .filter(([sceneId]) => scenes.some(s => s.id === sceneId));
```

### 3. **Improve Error Events**
```typescript
// Add scene validation before showing error
useEffect(() => {
  const handlePreviewError = (event: CustomEvent) => {
    const { sceneId, sceneName, error } = event.detail;
    
    // Validate scene still exists
    if (!scenes.some(s => s.id === sceneId)) {
      console.log('[ChatPanelG] Ignoring error for deleted scene:', sceneId);
      return;
    }
    
    // Add to errors map instead of replacing
    setSceneErrors(prev => new Map(prev).set(sceneId, {
      sceneName,
      errorMessage: error?.message || String(error),
      timestamp: Date.now()
    }));
  };
  
  // Listen for scene deletions to clean up errors
  const handleSceneDeleted = (event: CustomEvent) => {
    const { sceneId } = event.detail;
    setSceneErrors(prev => {
      const next = new Map(prev);
      next.delete(sceneId);
      return next;
    });
  };
}, [scenes]);
```

### 4. **Enhance Autofix Prompt**
```typescript
const handleAutoFix = async (sceneId: string, errorDetails: ErrorDetails) => {
  // Get the actual scene code
  const scene = scenes.find(s => s.id === sceneId);
  if (!scene) return;
  
  // More explicit prompt for brain orchestrator
  const fixPrompt = `🔧 FIX BROKEN SCENE: Scene "${errorDetails.sceneName}" (ID: ${sceneId}) has a compilation error. The error message is: "${errorDetails.errorMessage}". This scene needs to be fixed using the fixBrokenScene tool. The broken code is in the scene with ID ${sceneId}.`;
};
```

### 5. **UI Improvements**
- Show which specific scene has an error
- Allow fixing multiple scenes individually
- Add loading states for each scene being fixed
- Clear error state when scene is deleted

## Implementation Priority
1. Fix scene validation (prevent stale UI)
2. Track multiple errors properly
3. Improve brain orchestrator prompts
4. Add better error context
5. Optimize event handling for performance