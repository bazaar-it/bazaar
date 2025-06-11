# State Management Fix: addScene, changeDuration, and Scene Numbering

## Problems Fixed

### 1. addScene Not Updating VideoState
**Issue**: Backend created scenes successfully but UI didn't show them
**Fix**: Added `addScene` to imports and actually call it when backend returns new scene

### 2. changeDuration Missing Scene Info
**Issue**: changeDuration tool didn't return which scene was modified
**Fix**: Added `targetSceneId` to changeDuration response in brain orchestrator

### 3. changeDuration Not Handled
**Issue**: ChatPanelG only handled editScene and addScene, not changeDuration
**Fix**: Added changeDuration handling to update scene duration in VideoState

### 4. JSON Parsing Error
**Issue**: LLM returning JSON wrapped in markdown code blocks caused parsing errors
**Fix**: Strip markdown code blocks before parsing JSON

## Code Changes

### 1. ChatPanelG.tsx - Import addScene
```typescript
const { ...updateScene, addScene } = useVideoState();
```

### 2. ChatPanelG.tsx - Handle addScene
```typescript
} else if (result.scene && (result.operation === 'addScene' || result.operation === 'unknown')) {
  sceneData = result.scene.scene || result.scene;
  
  if (sceneData) {
    addScene(projectId, {
      id: sceneData.id,
      name: sceneData.name || 'Generated Scene',
      tsxCode: sceneData.tsxCode,
      duration: sceneData.duration || 180,
      props: sceneData.props || {}
    });
  }
}
```

### 3. ChatPanelG.tsx - Handle changeDuration
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
    }
  }
}
```

### 4. Orchestrator.ts - Include targetSceneId
```typescript
case ToolName.ChangeDuration:
  // Add targetSceneId so ChatPanelG knows which scene to update
  if (toolSelection?.targetSceneId) {
    result.data.targetSceneId = toolSelection.targetSceneId;
  }
  break;
```

### 5. LayoutGenerator.ts - Fix JSON Parsing
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

## Critical Scene Numbering Issue

### The Problem
User: "make scene 1 2 seconds long" → System updates Scene 2 instead!

### Root Cause
Scenes are ordered by `order` field in database, not creation order:
- Database query: `orderBy: [scenes.order]`
- If order values are incorrect, scene numbering gets confused
- User's "Scene 1" might be system's "Scene 2"

### Debug Logging Added
```typescript
console.log('[BrainOrchestrator] Scene ordering debug:', storyboardSoFar.map((scene, i) => ({
  userFacingNumber: i + 1,
  name: scene.name,
  id: scene.id,
  order: (scene as any).order || 'unknown',
  createdAt: (scene as any).createdAt || 'unknown'
})));
```

This will show the actual order values to diagnose the issue.

## Next Steps

1. Check the debug logs to see actual `order` values
2. Ensure new scenes get correct `order` values on creation
3. Consider fixing existing scenes with incorrect order values
4. Test all scene operations work correctly