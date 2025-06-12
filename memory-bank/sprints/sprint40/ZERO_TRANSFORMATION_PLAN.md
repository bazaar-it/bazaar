# Zero Transformation Implementation Plan

## Core Principle
Every layer of the system uses the EXACT database field names. No renaming, no transformations, anywhere.

## Database Schema (Source of Truth)
```typescript
// scenes table columns:
{
  id: uuid
  projectId: uuid
  order: integer
  name: varchar(255)
  tsxCode: text           // NOT code, sceneCode, or fixedCode
  props: jsonb
  duration: integer       // In frames
  layoutJson: text
  publishedUrl: text
  publishedHash: text
  publishedAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

## Standardized Interfaces (Using Exact DB Names)

### 1. Scene Entity
```typescript
interface Scene {
  id: string;
  projectId: string;
  order: number;
  name: string;
  tsxCode: string;        // Exact DB column name
  props: Record<string, any> | null;
  duration: number;
  layoutJson: string | null;
  publishedUrl: string | null;
  publishedHash: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### 2. Service Responses
```typescript
// ALL services return this format
interface StandardApiResponse<T> {
  success: boolean;
  operation: 'create' | 'update' | 'delete' | 'analyze';
  data: T;
  metadata: {
    timestamp: number;
    affectedIds: string[];
    reasoning?: string;
    chatResponse?: string;
  };
  debug?: any;
}

// Scene operations return
interface SceneOperationResponse {
  scene: Scene;           // Complete scene matching DB
  changes?: string[];     // For updates
  preserved?: string[];   // For updates
}
```

### 3. What Changes in Each Layer

#### Services (SceneBuilder, CodeGenerator, etc.)
**Current:**
```typescript
return {
  code: generatedCode,
  name: functionName,
  duration: 150
}
```

**New:**
```typescript
return {
  success: true,
  operation: 'create',
  data: {
    scene: {
      id: generateId(),
      projectId: input.projectId,
      order: calculateOrder(),
      name: functionName,
      tsxCode: generatedCode,  // Use DB field name
      props: null,
      duration: 150,
      layoutJson: null,
      // ... all other DB fields
    }
  },
  metadata: {
    timestamp: Date.now(),
    affectedIds: [scene.id],
    reasoning: 'Generated scene'
  }
}
```

#### Tools (AddScene, EditScene, etc.)
**Current:**
```typescript
return {
  sceneCode: result.code,
  sceneName: result.name,
  duration: result.duration,
  chatResponse: undefined
}
```

**New:**
```typescript
// Just pass through the service response!
return serviceResponse;
```

#### Orchestrator
**Current:**
```typescript
// Complex field transformations
const scene = {
  tsxCode: result.sceneCode,
  name: result.sceneName,
  // etc.
}
```

**New:**
```typescript
// Direct use - no transformations
const scene = response.data.scene;
await db.insert(scenes).values(scene);
```

#### VideoState (Normalized)
**Current:**
```typescript
// Nested structure with transformations
projects[id].props.scenes[index].data.code = scene.tsxCode
```

**New:**
```typescript
// Normalized structure - direct storage
state.scenes[scene.id] = scene;
state.projectScenes[scene.projectId].push(scene.id);
```

## Implementation Steps

### 1. Update Service Layer
All services must return `StandardApiResponse<SceneOperationResponse>`:
- SceneBuilderService
- CodeGeneratorService  
- DirectCodeEditorService
- LayoutGeneratorService

### 2. Update Tool Layer
Tools just pass through service responses:
- Remove all field transformations
- Remove output interfaces that rename fields
- Just return the StandardApiResponse

### 3. Create New VideoState
Normalized structure with single update method:
```typescript
const useVideoState = create<NormalizedVideoState>((set, get) => ({
  // Entities
  scenes: {},
  projects: {},
  
  // Relationships
  projectScenes: {},
  
  // Single update method
  handleApiResponse: (response: StandardApiResponse<any>) => {
    // Handle all operations uniformly
  }
}));
```

### 4. Update Frontend
```typescript
// Simple, uniform handling
const response = await api.generation.execute(params);
videoState.handleApiResponse(response);
```

## Benefits

1. **Zero Transformations** - Data flows unchanged
2. **Type Safety** - TypeScript catches any field mismatches
3. **Simplicity** - No mental mapping needed
4. **Performance** - No transformation overhead
5. **Maintainability** - Database changes propagate automatically

## Key Rule
If you find yourself writing:
- `result.code` → `scene.tsxCode`
- `sceneName` → `name`
- Any field transformation

STOP! The system should use database field names everywhere.