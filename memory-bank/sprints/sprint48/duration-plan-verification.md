# Duration Implementation Plan - VERIFIED ✅

After reviewing the codebase, here's the updated and verified implementation plan:

## 1. Create Duration Parser Utility ✅

**Location**: `/src/brain/utils/durationParser.ts` (NEW FILE)

The trim tool already has this logic in `trim.ts:72-88`. We'll extract it to a shared utility:

```typescript
export function parseDurationFromPrompt(prompt: string): number | undefined {
  // Match patterns like "3 seconds", "90 frames", "make it 5s"
  const secondsMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s)\b/i);
  const framesMatch = prompt.match(/(\d+)\s*(?:frames?|f)\b/i);
  
  if (secondsMatch && secondsMatch[1]) {
    const seconds = parseFloat(secondsMatch[1]);
    return Math.round(seconds * 30); // Return frames at 30fps
  }
  
  if (framesMatch && framesMatch[1]) {
    return parseInt(framesMatch[1]);
  }
  
  return undefined;
}
```

## 2. Update Brain Orchestrator ✅

**File**: `/src/brain/orchestratorNEW.ts`

Current structure at line 72-91:
```typescript
const result = {
  success: true,
  toolUsed: toolSelection.toolName,
  reasoning: toolSelection.reasoning,
  chatResponse: toolSelection.userFeedback || toolSelection.reasoning,
  result: {
    toolName: toolSelection.toolName,
    toolContext: {
      userPrompt: input.prompt,
      targetSceneId: toolSelection.targetSceneId,
      targetDuration: toolSelection.targetDuration, // EXISTS but unused
      referencedSceneIds: toolSelection.referencedSceneIds,
      imageUrls: (input.userContext?.imageUrls as string[]) || undefined,
      videoUrls: (input.userContext?.videoUrls as string[]) || undefined,
      webContext: contextPacket.webContext,
      modelOverride: input.userContext?.modelOverride,
    },
    workflow: toolSelection.workflow,
  }
};
```

**UPDATE**: Add duration parsing before creating result:
```typescript
import { parseDurationFromPrompt } from './utils/durationParser';

// After line 71, add:
const requestedDurationFrames = parseDurationFromPrompt(input.prompt);

// Then in toolContext, add:
toolContext: {
  userPrompt: input.prompt,
  targetSceneId: toolSelection.targetSceneId,
  targetDuration: toolSelection.targetDuration,
  requestedDurationFrames, // ADD THIS
  // ... rest of fields
}
```

## 3. Update Tool Types ✅

**File**: `/src/tools/helpers/types.ts`

Add to `BaseToolInput` interface (line 11-20):
```typescript
export interface BaseToolInput {
  userPrompt: string;
  projectId: string;
  userId?: string;
  requestedDurationFrames?: number; // ADD THIS
  formatContext?: {
    format: 'landscape' | 'portrait' | 'square';
    width: number;
    height: number;
  };
}
```

## 4. Update Tool Execution ✅

**File**: `/src/server/api/routers/generation/helpers.ts`

In the ADD tool case (line 67-86), add:
```typescript
toolInput = {
  userPrompt: decision.toolContext.userPrompt,
  projectId,
  userId,
  requestedDurationFrames: decision.toolContext.requestedDurationFrames, // ADD THIS
  sceneNumber: storyboard.length + 1,
  // ... rest of fields
};
```

For EDIT tool (around line 106):
```typescript
toolInput = {
  userPrompt: decision.toolContext.userPrompt,
  sceneId: decision.toolContext.targetSceneId,
  projectId,
  userId,
  requestedDurationFrames: decision.toolContext.requestedDurationFrames, // ADD THIS
  // ... rest of fields
};
```

## 5. Update ADD Tool ✅

**File**: `/src/tools/add/add_helpers/CodeGeneratorNEW.ts`

In the system prompt generation, add duration constraints when provided:

```typescript
// In generateSystemPrompt method
if (context.requestedDurationFrames) {
  systemPrompt += `

DURATION REQUIREMENT:
You MUST generate a scene that is EXACTLY ${context.requestedDurationFrames} frames long.
- Export the duration using: export const durationInFrames_[ID] = ${context.requestedDurationFrames};
- Plan all animations to complete before frame ${context.requestedDurationFrames - 10}
- Ensure smooth exit animations finish by frame ${context.requestedDurationFrames}
`;
}
```

## 6. Update Code Generator Prompt ✅

**File**: `/src/config/prompts/active/code-generator.ts`

Current line 165 exports duration. We need to make it respect the requested duration:

Add after the animation timing guide (around line 48):
```typescript
${context.requestedDurationFrames ? `
EXACT DURATION REQUIREMENT:
The scene MUST be exactly ${context.requestedDurationFrames} frames (${(context.requestedDurationFrames / 30).toFixed(1)} seconds).
Export: const durationInFrames_[ID] = ${context.requestedDurationFrames};
` : `
DURATION GUIDANCE:
Choose duration based on content complexity. Export the chosen duration.
`}
```

## Summary of Changes

1. **New file**: `/src/brain/utils/durationParser.ts` - Extracts duration parsing
2. **Modified**: `/src/brain/orchestratorNEW.ts` - Parse duration from prompt
3. **Modified**: `/src/tools/helpers/types.ts` - Add requestedDurationFrames to BaseToolInput
4. **Modified**: `/src/server/api/routers/generation/helpers.ts` - Pass duration to tools
5. **Modified**: `/src/tools/add/add_helpers/CodeGeneratorNEW.ts` - Use duration in prompts
6. **Modified**: `/src/config/prompts/active/code-generator.ts` - Add duration instructions

## Key Insights from Verification

1. **targetDuration already exists** in toolContext but is never used
2. **Trim tool already has duration parsing** - we can reuse the pattern
3. **Tool flow is clear**: Brain → scene-operations → helpers → tools
4. **BaseToolInput is the right place** for requestedDurationFrames since all tools inherit it

This plan is ready to implement! The changes are minimal and surgical, adding explicit duration handling without breaking existing functionality.