# Developer Guide: Silent Progressive Auto-Fix System

## Quick Start

The auto-fix system runs automatically in the background. You don't need to do anything - it just works!

```typescript
// That's it! The system is already active via ChatPanelG
useAutoFix(projectId, scenes);
```

## How It Works

### 1. Error Detection
When PreviewPanelG encounters a compilation error, it dispatches an event:

```typescript
// In PreviewPanelG (unchanged)
const errorEvent = new CustomEvent('preview-scene-error', {
  detail: {
    sceneId: scene.id,
    sceneName: scene.name,
    error: compilationError
  }
});
window.dispatchEvent(errorEvent);
```

### 2. Silent Processing
The `useAutoFix` hook catches errors and fixes them silently:

```typescript
// No UI updates, no user interruption
const executeAutoFix = async (sceneId, errorDetails, attemptNumber) => {
  // Progressive prompts based on attempt
  const fixPrompt = getProgressivePrompt(attemptNumber);
  
  // Call fix API silently
  await generateSceneMutation.mutateAsync({
    projectId,
    userMessage: fixPrompt,
    userContext: { imageUrls: undefined }
  });
  
  // Refresh scene state
  await refreshSceneState();
};
```

### 3. Progressive Strategy

Each attempt uses a different approach:

| Attempt | Strategy | Prompt | Delay |
|---------|----------|--------|--------|
| 1 | Minimal Fix | "Fix ONLY this specific error" | 2s |
| 2 | Comprehensive | "Fix ALL errors, be thorough" | 5s |
| 3 | Rewrite | "REWRITE using simpler code" | 10s |

## Configuration

### Debug Mode
```bash
# Enable console logging
NODE_ENV=development npm run dev
```

Watch for these logs:
```
[SILENT FIX] Error detected: {sceneId, error}
[SILENT FIX] Executing fix attempt 1
[SILENT FIX] Successfully fixed on attempt 2
[SILENT FIX] Same error repeating, jumping to rewrite
[SILENT FIX] Giving up after 3 attempts
```

### Constants
```typescript
const DEBUG_AUTOFIX = process.env.NODE_ENV === 'development';
const MAX_ATTEMPTS = 3;
const DEBOUNCE_DELAY = 2000; // 2 seconds
const RETRY_DELAYS = [5000, 10000, 20000]; // Progressive delays
```

## Testing Auto-Fix

### 1. Create Test Scenarios

#### Simple Import Error
```tsx
// components/TestScene1.tsx
export default function TestScene() {
  const [count, setCount] = useState(0); // Missing React import
  return <div>{count}</div>;
}
```
**Expected**: Fixed on attempt 1 by adding import

#### Multiple Errors
```tsx
// components/TestScene2.tsx
export default function TestScene() {
  const data = fetchData(); // Undefined function
  useEffect(() => {
    console.log(unknownVar); // Undefined variable
  }, [missingDep]); // Missing dependency
  return <div>{data}</div>;
}
```
**Expected**: Fixed on attempt 2 (comprehensive)

#### Complex Error
```tsx
// components/TestScene3.tsx
export default function TestScene() {
  // This will cause an infinite loop
  const [state, setState] = useState(0);
  setState(state + 1); // Outside useEffect!
  return <div>{state}</div>;
}
```
**Expected**: Rewritten on attempt 3

### 2. Monitor Fix Process

1. Open browser DevTools console
2. Add a broken scene to your project
3. Watch for `[SILENT FIX]` logs
4. Verify scene is fixed automatically

### 3. Test Edge Cases

#### Rapid Errors
```typescript
// Add multiple broken scenes quickly
// Expected: Debouncing prevents spam, fixes queue properly
```

#### Scene Deletion During Fix
```typescript
// Delete a scene while it's being fixed
// Expected: Fix cancelled, no errors
```

#### Same Error Repeating
```typescript
// Create an error that can't be fixed easily
// Expected: System detects loop, jumps to rewrite
```

## Troubleshooting

### Auto-Fix Not Working?

1. **Check if hook is active**:
   ```typescript
   // In ChatPanelG, verify this line exists:
   useAutoFix(projectId, scenes);
   ```

2. **Verify error events**:
   ```typescript
   // Add temporary log in PreviewPanelG:
   console.log('Dispatching error:', errorEvent.detail);
   ```

3. **Check browser console**:
   - Look for `[SILENT FIX]` logs
   - Check for any uncaught errors

### Common Issues

#### "Fix attempts but scene still broken"
- The AI might need better context
- Consider improving error messages passed to AI
- Check if the scene code is fundamentally flawed

#### "Same error keeps appearing"
- System should detect this and jump to rewrite
- If not, check `previousErrors` tracking
- Verify loop detection logic

#### "Fixes taking too long"
- Normal delays: 2s → 5s → 10s → 20s
- This is intentional to avoid overwhelming the API
- Consider adjusting delays if needed

## Advanced Usage

### Custom Error Handling
```typescript
// Dispatch custom error for immediate fix
const triggerAutoFix = (sceneId: string, error: Error) => {
  const event = new CustomEvent('preview-scene-error', {
    detail: {
      sceneId,
      sceneName: 'Custom Scene',
      error
    }
  });
  window.dispatchEvent(event);
};
```

### Monitoring Fix Success Rate
```typescript
// Add to your analytics
window.addEventListener('scene-fixed', (event) => {
  analytics.track('auto_fix_success', {
    sceneId: event.detail.sceneId,
    attempt: event.detail.attemptNumber
  });
});
```

### Disable for Specific Scenes
```typescript
// Add to scene metadata
const scene = {
  id: 'scene-123',
  autoFixEnabled: false, // Not implemented yet
  // ... rest of scene data
};
```

## Best Practices

### 1. Let It Work
- Don't interfere with the auto-fix process
- Trust the progressive strategy
- Avoid manual fixes while auto-fix is active

### 2. Write Fixable Code
- Use clear, standard patterns
- Avoid overly complex logic
- Include helpful error messages

### 3. Monitor in Production
- Track fix success rates
- Log which errors occur most
- Optimize prompts based on data

## Architecture Notes

### Why Silent?
- Users don't need to know about errors
- Reduces anxiety and friction
- Maintains creative flow

### Why Progressive?
- Different errors need different approaches
- Minimizes code changes when possible
- Ensures eventual success

### Why Direct Tool Calling?
- Faster than brain orchestrator
- More predictable results
- Purpose-built for fixing

## Future Enhancements

### 1. Smarter Fix Strategies
```typescript
// Pattern matching for common errors
const quickFixes = {
  "Cannot find name 'useState'": "Add React import",
  "Cannot find name 'useEffect'": "Add React import",
  // ... more patterns
};
```

### 2. Learning System
```typescript
// Track successful fixes
interface FixPattern {
  errorPattern: RegExp;
  successfulFix: string;
  successRate: number;
}
```

### 3. User Preferences
```typescript
interface AutoFixPreferences {
  enabled: boolean;
  aggressiveness: 'conservative' | 'balanced' | 'aggressive';
  maxAttempts: number;
  debounceMs: number;
}
```

## Conclusion

The silent progressive auto-fix system represents a significant UX improvement. By handling errors automatically and invisibly, we let users focus on creativity rather than debugging. The progressive strategy ensures high success rates while multiple safety mechanisms prevent any issues.

Remember: The best error handling is the kind users never see!