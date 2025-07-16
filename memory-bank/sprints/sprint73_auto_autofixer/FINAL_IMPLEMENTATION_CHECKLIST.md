# Sprint 73: Silent Auto-Fix - Final Implementation Checklist

## ✅ Code Analysis Complete

### Current State
1. **use-auto-fix.ts**: 
   - Handles error events from PreviewPanelG
   - Shows AutoFixErrorBanner UI
   - Adds chat messages when fixing
   - Uses toast notifications (imported from 'sonner')

2. **AutoFixErrorBanner.tsx**:
   - Used in ChatPanelG.tsx (line 741)
   - Exports ErrorDetails interface (used by use-auto-fix.ts)

3. **PreviewPanelG.tsx**:
   - Dispatches 'preview-scene-error' events at multiple points
   - Also dispatches 'trigger-autofix' for immediate fixes

4. **ChatPanelG.tsx**:
   - Imports and renders AutoFixErrorBanner
   - Passes sceneErrors, handleAutoFix from useAutoFix hook

## 🔧 Implementation Steps

### Step 1: Extract ErrorDetails Interface
First, move the ErrorDetails interface to avoid circular dependencies:

```typescript
// Create new file: src/lib/types/auto-fix.ts
export interface ErrorDetails {
  sceneName: string;
  errorMessage: string;
  timestamp: number;
}

export interface AutoFixQueueItem {
  sceneId: string;
  errorDetails: ErrorDetails;
  attempts: number;
  firstErrorTime: number;
  lastAttemptTime: number;
  debounceTimer?: NodeJS.Timeout;
}
```

### Step 2: Update use-auto-fix.ts
Key changes needed:

1. **Remove imports**:
   - ❌ Remove: `import { toast } from 'sonner';`
   - ❌ Remove: `import type { ErrorDetails } from '~/components/chat/AutoFixErrorBanner';`
   - ✅ Add: `import type { ErrorDetails, AutoFixQueueItem } from '~/lib/types/auto-fix';`

2. **Add queue state**:
   ```typescript
   const [autoFixQueue] = useState<Map<string, AutoFixQueueItem>>(new Map());
   ```

3. **Replace handlePreviewError** with silent version:
   - Remove setSceneErrors calls
   - Add debounced queue processing
   - No UI updates

4. **Update handleAutoFix**:
   - Remove all user messages (addUserMessage calls)
   - Remove assistant message updates
   - Keep state refresh logic

5. **Add processAutoFixQueue function**:
   - Silent retry logic
   - No toast notifications
   - Debug logging only

6. **Remove handleDirectAutoFix** or make it silent

### Step 3: Remove UI Components

1. **Delete AutoFixErrorBanner.tsx** entirely

2. **Update ChatPanelG.tsx**:
   - Remove import: `import { AutoFixErrorBanner } from "~/components/chat/AutoFixErrorBanner";`
   - Remove component usage (lines 741-746)
   - Keep useAutoFix hook but don't use sceneErrors or handleAutoFix

### Step 4: API Considerations

The generateScene mutation currently doesn't have a flag to mark messages as system/hidden. We have two options:

**Option A: No Chat Messages** (Recommended)
- Don't call addUserMessage at all
- Don't add assistant messages
- Completely silent operation

**Option B: Add System Flag** (If chat history needed)
- Modify generateScene input to accept `isSystemFix: boolean`
- Filter system messages from UI display
- More complex, requires API changes

## 📋 File Change Summary

### Files to Modify:
1. **src/hooks/use-auto-fix.ts**
   - Remove UI imports (toast, AutoFixErrorBanner)
   - Add queue management
   - Make all operations silent
   - Add debug logging

2. **src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx**
   - Remove AutoFixErrorBanner import
   - Remove AutoFixErrorBanner component usage
   - Keep useAutoFix hook call (for event listening)

3. **src/lib/types/auto-fix.ts** (NEW)
   - Create file with shared types

### Files to Delete:
1. **src/components/chat/AutoFixErrorBanner.tsx** - Remove entirely

### Files that DON'T need changes:
1. **PreviewPanelG.tsx** - Keep error event dispatching as-is
2. **Generation API** - No changes needed if using Option A

## ⚠️ Important Considerations

1. **Error Events**: Keep all 'preview-scene-error' event dispatching unchanged
2. **State Management**: The fix still needs to update VideoState properly
3. **Debugging**: Add `NODE_ENV` checks for console logging
4. **Testing**: Test with actual broken scenes to ensure silent fixing works

## 🚀 Ready to Implement?

The plan aligns perfectly with the current codebase. The main work is:
1. Making use-auto-fix.ts completely silent
2. Removing the UI component
3. Adding queue/debounce logic

No API changes needed if we go with the "no chat messages" approach, which is the cleanest solution.