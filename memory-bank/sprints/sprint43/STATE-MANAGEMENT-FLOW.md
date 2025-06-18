# State Management Flow - Preview Panel Not Updating

## Problem
When code is added or edited, the preview panel doesn't update automatically. It only updates after a hard refresh.

## Current Flow

### 1. User Request → Brain → Tool
```
User: "Make the text red"
      ↓
generation.universal.ts → orchestratorNEW.ts → edit.ts
      ↓
Modified code returned
```

### 2. State Update Flow (WHERE IT BREAKS)
```
generation.universal.ts
      ↓
Returns response with new scene data
      ↓
ChatPanelG.tsx receives response
      ↓
Should call videoState.updateScene() ❌ NOT HAPPENING
      ↓
PreviewPanelG should re-render ❌ NOT HAPPENING
```

## Key Files

### videoState.ts
- Has `updateScene()` and `addScene()` methods
- These methods DO update the Zustand store
- PreviewPanelG subscribes to this store

### PreviewPanelG.tsx
- Subscribes to videoState: `const currentProps = useVideoState((state) => ...)`
- Should re-render when state changes
- Has refresh token mechanism

### ChatPanelG.tsx
- Receives the response from generation.universal.ts
- Should call `videoState.updateScene()` or `videoState.addScene()`
- THIS IS LIKELY WHERE THE DISCONNECT IS

## The Issue

Looking at the code flow:
1. `generation.universal.ts` returns the new/edited scene
2. `ChatPanelG.tsx` receives this response
3. But ChatPanelG is NOT calling `videoState.updateScene()` to update the store
4. So PreviewPanelG never knows about the change

## Solution

ChatPanelG needs to:
1. Parse the response from generation.universal.ts
2. Extract the scene data
3. Call `videoState.updateScene(projectId, sceneId, updatedScene)` for edits
4. Call `videoState.addScene(projectId, scene)` for new scenes

This will trigger the Zustand store update, which will cause PreviewPanelG to re-render automatically.