# Animation Duration Auto-Detection Solution

## Problem
When LLM generates/edits animations, it can create 300-frame animations while the scene duration is only 150 frames, cutting off the animation until manually extended.

## Solution: Hybrid Approach

### 1. LLM Returns Duration (Primary)
Modify edit/add tools to return suggested duration:

```typescript
// In edit.ts and add.ts
return {
  tsxCode: generatedCode,
  duration: suggestedDuration, // NEW: LLM declares duration
  reasoning: ...,
}
```

### 2. Static Code Analysis (Fallback)
Quick regex scan to find max frame references:

```typescript
function scanForMaxFrame(tsxCode: string): number {
  const patterns = [
    // spring animations
    /spring\s*\(\s*\{[^}]*frame:\s*frame\s*-\s*(\d+)/g,
    /durationInFrames:\s*(\d+)/g,
    
    // interpolate ranges
    /interpolate\s*\(\s*frame\s*,\s*\[\s*(\d+)\s*,\s*(\d+)\s*\]/g,
    
    // direct frame comparisons
    /frame\s*[<>=]+\s*(\d+)/g,
    /\[\s*(\d+)\s*,\s*(\d+)\s*\]/g,
  ];
  
  let maxFrame = 0;
  
  for (const pattern of patterns) {
    const matches = tsxCode.matchAll(pattern);
    for (const match of matches) {
      // Get all numeric groups
      for (let i = 1; i < match.length; i++) {
        const frame = parseInt(match[i]);
        if (!isNaN(frame)) {
          maxFrame = Math.max(maxFrame, frame);
        }
      }
    }
  }
  
  return maxFrame;
}
```

### 3. Auto-Adjust Duration
In generation.universal.ts after tool execution:

```typescript
// After getting tool result
if (toolResult.scene) {
  let finalDuration = toolResult.scene.duration;
  
  // If tool didn't specify duration, scan the code
  if (!finalDuration && toolResult.scene.tsxCode) {
    const detectedMaxFrame = scanForMaxFrame(toolResult.scene.tsxCode);
    if (detectedMaxFrame > 0) {
      // Add 1-second buffer (30 frames at 30fps)
      finalDuration = detectedMaxFrame + 30;
    }
  }
  
  // Update if different from current
  if (finalDuration && finalDuration !== existingScene?.duration) {
    await db.update(scenes)
      .set({ duration: finalDuration })
      .where(eq(scenes.id, sceneId));
    
    toolResult.scene.duration = finalDuration;
  }
}
```

## Implementation Priority

1. **Quick Win**: Add static analysis to generation.universal.ts (15 min)
2. **Better**: Update prompts to return duration (30 min)
3. **Future**: Runtime detection in preview panel

## Benefits

- Users see complete animations immediately
- No manual "make it 9 seconds" requests
- Works even if LLM forgets to specify duration
- Fast (<10ms) with no extra API calls