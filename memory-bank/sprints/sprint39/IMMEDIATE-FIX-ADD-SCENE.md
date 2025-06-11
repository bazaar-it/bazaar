# Immediate Fix: Add Scene Not Updating UI

## The Problem

Based on the TEAM-CONTEXT.md and the current state management pattern, the issue is clear:

**ChatPanelG is calling `addScene()` with database format, but VideoState expects InputProps format for scenes.**

## Quick Fix (Apply Now)

Replace the current addScene implementation in ChatPanelG.tsx with this:

```typescript
} else if (result.scene && (result.operation === 'addScene' || result.operation === 'unknown')) {
  // For new scenes, trust the backend response directly
  console.log('[ChatPanelG] 🆕 New scene detected, using backend data directly');
  sceneData = result.scene.scene || result.scene;
  
  // ✅ FIX: Transform and add the scene properly
  if (sceneData) {
    // Get current scenes to calculate start time
    const currentScenes = getCurrentProps()?.scenes || [];
    const lastScene = currentScenes[currentScenes.length - 1];
    const startTime = lastScene ? (lastScene.start + lastScene.duration) : 0;
    
    // Transform database format to InputProps format
    const transformedScene = {
      id: sceneData.id,
      type: 'custom' as const,
      start: startTime,
      duration: sceneData.duration || 180,
      data: {
        code: sceneData.tsxCode,
        name: sceneData.name || 'Generated Scene',
        componentId: sceneData.id,
        props: sceneData.props || {}
      }
    };
    
    // Use replace to update the entire scenes array
    const updatedScenes = [...currentScenes, transformedScene];
    const updatedProps = {
      ...getCurrentProps(),
      scenes: updatedScenes,
      meta: {
        ...getCurrentProps()?.meta,
        duration: updatedScenes.reduce((sum, s) => sum + s.duration, 0)
      }
    };
    
    replace(projectId, updatedProps);
    
    console.log('[ChatPanelG] ✅ Added transformed scene to VideoState:', {
      sceneId: transformedScene.id,
      start: transformedScene.start,
      duration: transformedScene.duration
    });
  }
}
```

## Why This Works

1. **Format Match**: Transforms database scene to InputProps format that PreviewPanel expects
2. **Timeline Calculation**: Properly calculates `start` time based on existing scenes
3. **Total Duration**: Updates the meta.duration for the entire video
4. **Direct State Update**: Uses `replace()` which we know works (same as editScene)

## Alternative Minimal Fix

If you want an even simpler fix, just use `updateAndRefresh` which handles all the transformation:

```typescript
} else if (result.scene && (result.operation === 'addScene' || result.operation === 'unknown')) {
  sceneData = result.scene.scene || result.scene;
  
  if (sceneData) {
    // Let updateAndRefresh handle everything
    await updateAndRefresh();
    console.log('[ChatPanelG] ✅ Refreshed after addScene');
  }
}
```

But this is less optimal as it requires a database round-trip.

## Test It Now

1. Apply the fix to ChatPanelG.tsx
2. Try adding a scene
3. Check if it appears in the preview immediately

The scene should now appear properly in the UI!