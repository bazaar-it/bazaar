# Principle 08: State Management

## The Principle
**Normalized, flat state structure.** Optimistic updates everywhere.

## Current Problem
```typescript
// ❌ WRONG: Nested state
{
  projects: {
    [projectId]: {
      timelines: [{
        scenes: [{
          id: "scene1",
          components: [...]
        }]
      }]
    }
  }
}

// Finding a scene requires deep traversal
const scene = state.projects[pid].timelines[0].scenes.find(s => s.id === id);
```

## Correct Implementation
```typescript
// ✅ RIGHT: Normalized state
{
  scenes: {
    "scene1": { id: "scene1", projectId: "p1", tsxCode: "..." },
    "scene2": { id: "scene2", projectId: "p1", tsxCode: "..." }
  },
  messages: {
    "msg1": { id: "msg1", content: "...", role: "user" },
    "msg2": { id: "msg2", content: "...", role: "assistant" }
  },
  ui: {
    selectedSceneId: "scene1",
    isGenerating: false
  }
}

// Direct O(1) access
const scene = state.scenes[id];
```

## Optimistic Update Pattern
```typescript
class VideoStateNormalized {
  // 1. Immediate UI update
  addOptimisticScene(tempScene: Scene) {
    this.scenes[tempScene.id] = { 
      ...tempScene, 
      isOptimistic: true 
    };
    this.notifySubscribers();
  }
  
  // 2. Confirm when server responds
  confirmScene(tempId: string, finalScene: Scene) {
    delete this.scenes[tempId];
    this.scenes[finalScene.id] = finalScene;
    this.notifySubscribers();
  }
  
  // 3. Rollback on error
  rollbackScene(tempId: string) {
    delete this.scenes[tempId];
    this.notifySubscribers();
  }
}
```

## Single Update Method
```typescript
// ✅ One method handles all API responses
handleApiResponse(response: StandardApiResponse) {
  if (!response.success) {
    this.handleError(response.error);
    return;
  }
  
  const { operation, data } = response;
  
  switch (operation) {
    case 'create':
      this.scenes[data.id] = data;
      break;
    case 'update':
      this.scenes[data.id] = { ...this.scenes[data.id], ...data };
      break;
    case 'delete':
      delete this.scenes[data.id];
      break;
  }
  
  this.notifySubscribers();
}
```

## State Access Patterns
```typescript
// ✅ Computed values for derived state
get sceneList() {
  return Object.values(this.scenes)
    .filter(s => s.projectId === this.currentProjectId)
    .sort((a, b) => a.order - b.order);
}

get selectedScene() {
  return this.scenes[this.ui.selectedSceneId];
}

// ✅ Direct updates
selectScene(id: string) {
  this.ui.selectedSceneId = id;
  this.notifySubscribers();
}
```

## Benefits
- **O(1) lookups**: Direct access by ID
- **Instant UI**: Optimistic updates
- **Simple updates**: Flat structure
- **Type safety**: Clear interfaces
- **Performance**: Minimal traversal

## Success Criteria
- Flat state structure
- All lookups are O(1)
- Optimistic updates work
- Single update method
- <16ms UI updates