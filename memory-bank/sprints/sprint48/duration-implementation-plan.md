# Duration Fix Implementation Plan - Sprint 48

## Quick Win: Brain Duration Parser

### 1. Create Duration Parser Utility
Create `/src/brain/utils/durationParser.ts`:

```typescript
export function parseDurationFromPrompt(prompt: string): number | undefined {
  // Convert various duration formats to frames (30fps)
  const patterns = [
    // "5 seconds", "5 second", "5s"
    /(\d+)\s*(?:second|seconds|sec|s)\b/i,
    // "2.5 seconds"
    /(\d+\.?\d*)\s*(?:second|seconds|sec|s)\b/i,
    // "120 frames", "90 frame"
    /(\d+)\s*(?:frame|frames|f)\b/i,
  ];
  
  for (const pattern of patterns) {
    const match = prompt.match(pattern);
    if (match) {
      const value = parseFloat(match[1]);
      
      // Check if it's frames or seconds
      if (pattern.toString().includes('frame')) {
        return Math.round(value);
      } else {
        // Convert seconds to frames at 30fps
        return Math.round(value * 30);
      }
    }
  }
  
  return undefined; // No explicit duration found
}
```

### 2. Update Brain Orchestrator

In `/src/brain/orchestratorNEW.ts`, add duration parsing:

```typescript
import { parseDurationFromPrompt } from './utils/durationParser';

// In the process function, after getting toolSelection:
const requestedDurationFrames = parseDurationFromPrompt(input.prompt);

const result = {
  success: true,
  toolUsed: toolSelection.toolName,
  reasoning: toolSelection.reasoning,
  chatResponse: toolSelection.userFeedback || toolSelection.reasoning,
  result: {
    toolName: toolSelection.toolName,
    sceneId: toolSelection.sceneId,
    targetSceneData: toolSelection.targetSceneData,
    userMessage: input.prompt,
    requestedDurationFrames, // ADD THIS
    // ... rest of properties
  }
};
```

### 3. Update Tool Interfaces

Add duration to tool context in each tool:

```typescript
// In ADD tool
if (context.requestedDurationFrames) {
  systemPrompt += `\n\nIMPORTANT: Generate a scene that is EXACTLY ${context.requestedDurationFrames} frames long.`;
  systemPrompt += `\nExport: const durationInFrames_[ID] = ${context.requestedDurationFrames};`;
}

// In EDIT tool  
if (context.requestedDurationFrames) {
  systemPrompt += `\n\nIMPORTANT: Adjust all animations to fit EXACTLY ${context.requestedDurationFrames} frames.`;
}
```

### 4. Update Code Generator Prompt

In `/src/config/prompts/active/code-generator.ts`, add:

```typescript
const durationSection = context.requestedDurationFrames ? `
DURATION REQUIREMENT:
You MUST generate a scene that is EXACTLY ${context.requestedDurationFrames} frames long.
- Export: const durationInFrames_[ID] = ${context.requestedDurationFrames};
- Ensure all animations complete before frame ${context.requestedDurationFrames - 10}
- Plan exit animations to finish by frame ${context.requestedDurationFrames}
` : `
DURATION GUIDANCE:
Choose an appropriate duration based on content complexity:
- Simple text/logo: 60-90 frames (2-3 seconds)
- Standard animations: 150-180 frames (5-6 seconds)  
- Complex showcases: 240-300 frames (8-10 seconds)
Export the duration: const durationInFrames_[ID] = [chosen_frames];
`;
```

## Testing Plan

### Test Cases:
1. "Create a 5 second intro" → Should generate exactly 150 frames
2. "Make a quick logo animation" → Should be 60-90 frames
3. "Build a product showcase" → Should be 240+ frames
4. "Animate this for 2.5 seconds" → Should be 75 frames
5. No duration specified → Should choose appropriate duration

### Validation:
- Check that `requestedDurationFrames` is parsed correctly
- Verify generated code has matching duration export
- Confirm animations fit within specified duration
- Test edge cases (0.5 seconds, 30 seconds, etc.)

## Rollout Strategy

### Phase 1: Parser & Brain (Low Risk)
1. Add duration parser utility
2. Update brain orchestrator
3. Test parsing without affecting generation

### Phase 2: Tool Integration (Medium Risk)
4. Update ADD tool with duration constraints
5. Update EDIT tool for duration adjustments
6. Test with explicit durations

### Phase 3: Smart Defaults (Enhancement)
7. Implement content-aware defaults
8. Add duration validation
9. Create warning system for mismatches

## Success Metrics

1. **Explicit Duration Accuracy**: 95%+ of requests with explicit duration generate exact frame count
2. **Animation Fit**: 90%+ of animations complete within scene duration
3. **User Satisfaction**: Reduced complaints about cut-off animations
4. **Consistency**: Same prompt generates similar duration across runs

## Code Changes Summary

1. **New File**: `/src/brain/utils/durationParser.ts`
2. **Modified**: `/src/brain/orchestratorNEW.ts` (add duration parsing)
3. **Modified**: `/src/tools/add/add.ts` (use duration parameter)
4. **Modified**: `/src/tools/edit/edit.ts` (respect duration changes)
5. **Modified**: `/src/config/prompts/active/code-generator.ts` (duration instructions)

Total estimated effort: 2-3 hours for core implementation + testing