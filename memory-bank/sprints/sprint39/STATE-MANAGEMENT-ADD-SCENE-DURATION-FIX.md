# State Management Fix: addScene and changeDuration

## Problem

Following the state management simplification in Sprint 35, two operations were not properly updating VideoState:

1. **addScene**: Backend created scenes successfully but UI didn't show them
2. **changeDuration**: Backend updated duration but UI didn't reflect changes

## Root Causes

### 1. addScene Not Updating VideoState

ChatPanelG was missing the actual call to `addScene()` after receiving the backend response:

```typescript
// BEFORE: Comment said it updated VideoState but it didn't
} else if (result.scene && (result.operation === 'addScene' || result.operation === 'unknown')) {
  sceneData = result.scene.scene || result.scene;
  // No refetch needed - the addScene call above already updated VideoState
}
```

### 2. changeDuration Missing targetSceneId

The changeDuration tool didn't return which scene was modified:
- Tool returned: `{ oldDurationFrames, newDurationFrames, ... }` 
- Missing: `targetSceneId` to identify which scene to update

### 3. changeDuration Not Handled in ChatPanelG

ChatPanelG only handled `editScene` and `addScene` operations, not `changeDuration`.

### 4. JSON Parsing Error in LayoutGenerator

LLM was returning JSON wrapped in markdown code blocks:
```
```json
{...}
```
```

## Fixes Applied

### 1. Added addScene Import and Call (ChatPanelG.tsx)

```typescript
// Import addScene
const { ...updateScene, addScene } = useVideoState();

// Call addScene when backend returns new scene
if (sceneData) {
  addScene(projectId, {
    id: sceneData.id,
    name: sceneData.name || 'Generated Scene',
    tsxCode: sceneData.tsxCode,
    duration: sceneData.duration || 180,
    props: sceneData.props || {}
  });
  console.log('[ChatPanelG] ✅ Added new scene to VideoState:', sceneData.id);
}
```

### 2. Include targetSceneId in changeDuration Response (orchestrator.ts)

```typescript
case ToolName.ChangeDuration:
  // Add targetSceneId to the result so ChatPanelG knows which scene to update
  if (toolSelection?.targetSceneId) {
    result.data.targetSceneId = toolSelection.targetSceneId;
  }
  break;
```

### 3. Handle changeDuration in ChatPanelG

```typescript
} else if (result.scene && result.operation === 'changeDuration') {
  const durationData = result.scene;
  const targetSceneId = durationData.targetSceneId;
  
  if (targetSceneId && durationData.newDurationFrames) {
    const scene = scenes.find(s => s.id === targetSceneId);
    if (scene) {
      updateScene(projectId, targetSceneId, {
        ...scene,
        duration: durationData.newDurationFrames
      });
      console.log('[ChatPanelG] ✅ Scene duration updated in VideoState');
    }
  }
}
```

### 4. Fix JSON Parsing in LayoutGenerator

```typescript
// Strip markdown code blocks if present
let cleanedOutput = rawOutput;

if (cleanedOutput.startsWith('```')) {
  const lines = cleanedOutput.split('\n');
  if (lines[0].startsWith('```')) {
    lines.shift(); // Remove first ```json or ```
  }
  if (lines[lines.length - 1].startsWith('```')) {
    lines.pop(); // Remove last ```
  }
  cleanedOutput = lines.join('\n');
}

parsed = JSON.parse(cleanedOutput);
```

## Result

All operations now properly update VideoState, following the simplified state management pattern:

1. **Backend performs operation** → Returns updated data
2. **ChatPanelG receives response** → Updates VideoState directly  
3. **UI components react** → Show changes immediately

No database refetching, no race conditions, just direct state updates as intended.

## Testing

Test these scenarios:
1. Add a new scene - should appear immediately in preview
2. Change scene duration - timeline should update instantly
3. Edit existing scene - preview should refresh with changes