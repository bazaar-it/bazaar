# CreateSceneFromImage Response Structure Issue

## Problem

The `createSceneFromImage` operation successfully creates scenes in the database but ChatPanelG cannot update the UI because:

1. The response structure is missing the scene ID
2. The field names don't match (sceneCode vs tsxCode, sceneName vs name)
3. The scene object structure is not consistent with other operations

## Current Flow

1. **User**: "add new scene based on this image"
2. **Orchestrator**: Selects `createSceneFromImage` tool
3. **Tool**: Generates code successfully
4. **SceneRepository**: Creates scene in DB with ID `4b029e9c-6a5c-4499-a6f9-bb4b94c02633`
5. **Response to ChatPanelG**: Missing the scene ID!

## Response Structure Issue

What ChatPanelG receives:
```javascript
{
  success: true,
  operation: 'createSceneFromImage',
  scene: {
    sceneCode: '...', // Not tsxCode
    sceneName: 'Scene6_mbs9z2bm', // Not name
    duration: 135,
    // Missing: id!
    // Missing: scene object with id
  }
}
```

What ChatPanelG needs:
```javascript
{
  success: true,
  operation: 'createSceneFromImage',
  scene: {
    scene: {
      id: '4b029e9c-6a5c-4499-a6f9-bb4b94c02633', // CRITICAL!
      name: 'Scene6_mbs9z2bm',
      tsxCode: '...',
      duration: 135,
      props: {}
    }
  }
}
```

## Root Cause

In `orchestrator.ts`, the `handleSceneCreation` method returns the created scene data, but the response transformation loses the ID:

```typescript
// Line 1640-1650 in orchestrator.ts
const standardizedData: SceneData = {
  sceneName: sceneData.sceneName,
  sceneCode: sceneData.sceneCode,
  duration: sceneData.duration || 180,
  // ... other fields
};

return await sceneRepositoryService.createScene(standardizedData, context, modelUsage);
// This returns the scene with ID, but it's not properly passed back
```

## Temporary Workaround

Since we can't update the UI without the scene ID, the workaround is to refresh from the database:

```typescript
// In ChatPanelG.tsx
if (result.operation === 'createSceneFromImage') {
  // The response doesn't have the scene ID, so we must refresh
  console.log('[ChatPanelG] 🔄 createSceneFromImage requires database refresh');
  await updateAndRefresh();
  return; // Skip the normal update flow
}
```

## Proper Fix (Backend)

The orchestrator needs to return the complete scene data including the ID:

```typescript
// In orchestrator.ts handleSceneCreation
const createdScene = await sceneRepositoryService.createScene(standardizedData, context, modelUsage);

// Return the full scene data
return {
  scene: {
    id: createdScene.id,
    name: createdScene.name,
    tsxCode: createdScene.tsxCode,
    duration: createdScene.duration,
    props: createdScene.props || {}
  },
  operation: 'createSceneFromImage',
  // Keep the original fields for backward compatibility
  sceneCode: standardizedData.sceneCode,
  sceneName: standardizedData.sceneName,
  duration: standardizedData.duration
};
```

## Impact

- **addScene**: Works with the fix applied ✅
- **editScene**: Works ✅
- **createSceneFromImage**: Broken due to missing ID ❌
- **changeDuration**: Works with targetSceneId fix ✅

## Action Items

1. **Immediate**: Apply workaround to use `updateAndRefresh()` for createSceneFromImage
2. **Short-term**: Fix orchestrator to return proper scene structure
3. **Long-term**: Standardize all scene operation responses