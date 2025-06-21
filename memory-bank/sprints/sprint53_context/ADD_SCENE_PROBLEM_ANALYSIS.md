# Why Add Scene Doesn't Build Upon Previous Scenes

## The Problem

The foundation IS there, but it's not connected:

### What Exists (But Unused)
1. **Add Tool** has `previousSceneContext` parameter
2. **CodeGenerator** has `generateCodeWithReference()` method
3. **Instructions exist**: "Keep the same visual style, colors, fonts, and animation patterns"

### What's Missing
The router NEVER passes `previousSceneContext`:

```typescript
// Current (BROKEN)
toolInput = {
  userPrompt: decision.toolContext.userPrompt,
  projectId,
  userId,
  sceneNumber: storyboard.length + 1,
  storyboardSoFar: storyboard,  // Has all scenes but not used!
  imageUrls: decision.toolContext.imageUrls,
  visionAnalysis: decision.toolContext.visionAnalysis,
  // previousSceneContext is NOT passed!
} as AddToolInput;
```

## The Flow That Should Happen

1. User: "Add another scene"
2. Router: Has all scenes in `storyboard` array
3. Router: Should pass last scene as `previousSceneContext`
4. Add Tool: Would use `generateCodeWithReference()`
5. Result: New scene matches previous style

## The Flow That Actually Happens

1. User: "Add another scene"
2. Router: Has scenes but doesn't pass them
3. Add Tool: No `previousSceneContext`, uses `generateCodeDirect()`
4. Result: Generic scene with no style continuity

## The Simple Fix

```typescript
// In helpers.ts, case 'addScene':
toolInput = {
  userPrompt: decision.toolContext.userPrompt,
  projectId,
  userId,
  sceneNumber: storyboard.length + 1,
  
  // ADD THIS - Pass previous scene for style reference
  previousSceneContext: storyboard.length > 0 ? {
    tsxCode: storyboard[storyboard.length - 1].tsxCode,
    style: undefined // Could extract style metadata later
  } : undefined,
  
  imageUrls: decision.toolContext.imageUrls,
  visionAnalysis: decision.toolContext.visionAnalysis,
} as AddToolInput;
```

## Why This Matters

When users say "add another scene", they expect:
- Similar colors
- Matching animation style
- Consistent visual language

Current behavior:
- Random new style
- No continuity
- Feels disjointed

## The Deeper Issue

This is a perfect example of the context problem:
- The data exists (storyboard with all scene code)
- The functionality exists (reference-based generation)
- But they're not connected

It's like having a car with an engine and wheels that aren't connected by a drivetrain.