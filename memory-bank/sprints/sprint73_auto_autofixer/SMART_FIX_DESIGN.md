# Sprint 73: Smart Progressive Auto-Fix Design

## Current vs. Smart Approach

### Current (Inefficient)
```
Error → Brain Orchestrator → Edit Tool → Fix
(Same prompt every time, brain adds unnecessary overhead)
```

### Smart Approach (Direct)
```
Error → Edit Tool with progressive strategy → Fix
(Skip brain, use increasingly aggressive fixes)
```

## Progressive Fix Strategy

### Attempt 1: Quick Fix (2s delay)
**Goal**: Fix the specific error mentioned
```typescript
{
  userPrompt: "Fix compilation error",
  errorDetails: "Cannot find name 'useState'",
  tsxCode: currentCode,
  // Minimal intervention - just fix the error
}
```

### Attempt 2: Comprehensive Fix (5s delay)
**Goal**: Look for related issues and fix more broadly
```typescript
{
  userPrompt: "Previous fix failed. Fix ALL errors and potential issues",
  errorDetails: "Cannot find name 'useState'. Check all imports and dependencies.",
  tsxCode: currentCode,
  // More aggressive - fix related issues too
}
```

### Attempt 3: Rewrite (10s delay)
**Goal**: Rewrite the component to ensure it works
```typescript
{
  userPrompt: "Two fixes failed. Rewrite this component to make it work, keeping the same visual output",
  errorDetails: "Multiple attempts failed. Consider rewriting with simpler approach.",
  tsxCode: currentCode,
  // Nuclear option - rewrite from scratch
}
```

## Implementation Plan

### 1. Direct Edit Tool Call
Instead of going through the brain orchestrator:

```typescript
import { EditTool } from "~/tools/edit/edit";

const executeAutoFix = async (
  sceneId: string, 
  errorDetails: ErrorDetails,
  attemptNumber: number = 1
) => {
  // Get current scene code
  const scene = scenes.find(s => s.id === sceneId);
  if (!scene) return;
  
  const editTool = new EditTool();
  
  // Progressive strategy based on attempt
  let toolInput: EditToolInput;
  
  if (attemptNumber === 1) {
    // Quick fix - just the error
    toolInput = {
      sceneId,
      tsxCode: scene.data.code,
      userPrompt: "Fix this compilation error",
      errorDetails: errorDetails.errorMessage,
      projectId,
      userId: "system-autofix"
    };
  } else if (attemptNumber === 2) {
    // Comprehensive fix
    toolInput = {
      sceneId,
      tsxCode: scene.data.code,
      userPrompt: "Previous fix attempt failed. Fix ALL compilation errors and check for missing imports, undefined variables, and syntax issues",
      errorDetails: `${errorDetails.errorMessage}\n\nThis is the second attempt - be more thorough`,
      projectId,
      userId: "system-autofix"
    };
  } else {
    // Nuclear option - rewrite
    toolInput = {
      sceneId,
      tsxCode: scene.data.code,
      userPrompt: "Two fix attempts have failed. Rewrite this component using a simpler approach that will definitely compile. Keep the same visual output but use basic, reliable code",
      errorDetails: `${errorDetails.errorMessage}\n\nPrevious fixes failed - consider a complete rewrite`,
      projectId,
      userId: "system-autofix"
    };
  }
  
  const result = await editTool.execute(toolInput);
  
  if (result.success && result.tsxCode) {
    // Update the scene directly
    await updateSceneCode(sceneId, result.tsxCode);
  }
};
```

### 2. Benefits of Direct Approach

1. **Faster**: Skip brain orchestrator overhead
2. **Targeted**: Edit tool is designed for fixing code
3. **Progressive**: Each attempt is more aggressive
4. **Contextual**: Later attempts know previous ones failed

### 3. Why This Works Better

**Attempt 1**: "Fix 'useState' not defined"
- AI adds: `import { useState } from 'react';`
- Quick, minimal change

**Attempt 2**: "Fix ALL errors"  
- AI checks all imports, syntax, common issues
- Might fix multiple problems at once

**Attempt 3**: "Rewrite to make it work"
- AI creates simpler, working version
- Removes complex code that might be causing issues

## Key Improvements

1. **No Brain Overhead**: Direct tool execution
2. **Progressive Strategy**: Each attempt more aggressive
3. **Context Awareness**: AI knows previous attempts failed
4. **Specific Instructions**: Clear what to do each time
5. **Fallback Safety**: Attempt 3 prioritizes "just make it work"

## Edge Cases Handled

1. **Import Errors**: Attempt 1 usually fixes
2. **Multiple Errors**: Attempt 2 catches these
3. **Complex Logic Issues**: Attempt 3 rewrites
4. **Syntax Problems**: All attempts can handle
5. **Type Errors**: Progressive fixing catches these

This approach is much smarter because it:
- Learns from failures
- Escalates intervention
- Skips unnecessary overhead
- Uses tool designed for the job