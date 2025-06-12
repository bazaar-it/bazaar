# Golden Rule Architecture for Zero-Transformation System

## Overview

Complete rewrite of tools, services, and VideoState to follow state management golden rules with ZERO transformations.

## Core Principles

### 1. Database is Source of Truth ✅
- Database defines the schema
- All layers use exact same field names
- No field renaming anywhere

### 2. Zustand is Session Truth ✅
- Normalized store structure
- Complete trust in state
- No refresh mechanisms needed

### 3. Never Fetch After Update ✅
- State updates are immediate
- No cache invalidation
- No refetching

### 4. Normalized Store ✅
```typescript
{
  // Entities
  scenes: { [id]: Scene },
  projects: { [id]: Project },
  messages: { [id]: ChatMessage },
  
  // Relationships
  projectScenes: { [projectId]: sceneIds[] }
}
```

### 5. One Update Path ✅
```typescript
// ALL API responses go through ONE method
handleApiResponse(response: StandardApiResponse)
```

### 6. Subscribe to Slices ✅
```typescript
// Components subscribe to specific data
const scenes = useVideoState(state => state.getProjectScenes(projectId))
```

### 7. Predictable Responses ✅
```typescript
// EVERY response has same shape
{
  success: boolean,
  operation: 'create' | 'update' | 'delete',
  data: T,
  metadata: { timestamp, affectedIds, reasoning, chatResponse }
}
```

## Implementation Plan

### Phase 1: Database Schema
```sql
-- No changes needed! We use the existing column names:
-- tsxCode (not code)
-- name (not sceneName)
-- duration (in frames)
-- order, props, layoutJson, etc.

-- The database is already the source of truth
```

### Phase 2: New Service Layer
```typescript
// Every service method returns StandardApiResponse
class SceneService {
  async create(input): Promise<StandardApiResponse<SceneOperationResponse>> {
    const scene: Scene = {
      id: generateId(),
      projectId: input.projectId,
      order: calculateOrder(),
      name: generateName(),
      tsxCode: generateCode(),  // Using exact DB field name
      duration: 150,
      props: null,
      layoutJson: null,
      publishedUrl: null,
      publishedHash: null,
      publishedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    await db.insert(scenes).values(scene);
    
    return {
      success: true,
      operation: 'create',
      data: { scene },
      metadata: {
        timestamp: Date.now(),
        affectedIds: [scene.id],
        reasoning: 'Generated scene from prompt',
        chatResponse: 'Scene created!'
      }
    };
  }
}
```

### Phase 3: New Tool Layer
```typescript
// Tools just orchestrate services, no transformations
class AddSceneTool {
  async execute(input): Promise<StandardApiResponse<SceneOperationResponse>> {
    // Call services
    const layoutResult = await layoutService.generate(input);
    const codeResult = await codeService.generate(layoutResult);
    
    // Create scene with exact field names from DB
    return sceneService.create({
      projectId: input.projectId,
      order: calculateOrder(),
      name: codeResult.name,
      tsxCode: codeResult.tsxCode,  // Services also use DB field names!
      duration: codeResult.duration,
      props: codeResult.props,
      layoutJson: JSON.stringify(layoutResult.layoutJson)
    });
  }
}
```

### Phase 4: New VideoState
```typescript
const useVideoState = create<NormalizedVideoState>((set, get) => ({
  // Normalized entities
  scenes: {},
  projects: {},
  messages: {},
  
  // Relationships
  projectScenes: {},
  
  // Single update method for ALL operations
  handleApiResponse: <T>(response: StandardApiResponse<T>) => {
    if (!response.success) return;
    
    set(state => {
      const newState = { ...state };
      
      switch (response.operation) {
        case 'create':
        case 'update': {
          const { scene } = response.data as SceneOperationResponse;
          newState.scenes[scene.id] = scene;
          
          if (response.operation === 'create') {
            newState.projectScenes[scene.projectId] = [
              ...state.projectScenes[scene.projectId],
              scene.id
            ];
          }
          break;
        }
        
        case 'delete': {
          const { deletedId } = response.data as DeleteOperationResponse;
          delete newState.scenes[deletedId];
          // Update relationships...
          break;
        }
      }
      
      return newState;
    });
  },
  
  // Selectors
  getProjectScenes: (projectId: string) => {
    const state = get();
    const sceneIds = state.projectScenes[projectId] || [];
    return sceneIds.map(id => state.scenes[id]).filter(Boolean);
  }
}));
```

### Phase 5: Simplified Frontend
```typescript
// ChatPanelG becomes simple
const handleSubmit = async (prompt: string) => {
  // Call API
  const response = await api.generation.execute({
    operation: determineOperation(prompt),
    prompt,
    projectId
  });
  
  // Update state - that's it!
  videoState.handleApiResponse(response);
};

// No more:
// - Complex switch statements
// - Field transformations
// - Cache invalidation
// - Refresh mechanisms
// - Trust issues
```

## Benefits

1. **Zero Transformations**: Data flows unchanged through all layers
2. **Predictable**: Same response format for everything
3. **Efficient**: Normalized store enables O(1) updates
4. **Simple**: Frontend code reduced by ~80%
5. **Type Safe**: TypeScript knows exact shapes everywhere
6. **Trustworthy**: No need for refresh mechanisms

## Migration Strategy

1. **Create new types** (done ✅)
2. **Update database schema** (or create views)
3. **Rewrite services** with StandardApiResponse
4. **Rewrite tools** to use new services
5. **Create new VideoState** with normalized structure
6. **Update frontend** to use single update path

## Example Data Flow

```
User Input: "Create a blue gradient scene"
    ↓
Tool: AddSceneTool
    ↓
Service: Returns StandardApiResponse<SceneOperationResponse>
{
  success: true,
  operation: 'create',
  data: {
    scene: {
      id: '123',
      projectId: 'abc',
      order: 0,
      name: 'Scene1_xyz',
      tsxCode: '...tsx code...',  // Exact DB field name
      props: null,
      duration: 150,
      layoutJson: '{"sceneType":"gradient",...}',
      publishedUrl: null,
      publishedHash: null,
      publishedAt: null,
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    }
  },
  metadata: {
    timestamp: 1234567890,
    affectedIds: ['123'],
    reasoning: 'Created gradient scene',
    chatResponse: 'Created a blue gradient scene!'
  }
}
    ↓
VideoState: handleApiResponse()
    ↓
UI: Automatically updates (Zustand reactivity)
```

No transformations. No special cases. No complexity.