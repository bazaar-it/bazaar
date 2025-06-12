# Shared Interfaces Analysis - UPDATED FOR ZERO TRANSFORMATIONS

## Goal: Zero Transformations Using Exact Database Field Names

## Current State Summary

### 1. Database Schema (Truth)
```typescript
{
  id: string
  name: string         // e.g., "Scene1_abc123"
  tsxCode: string      // React component code
  duration: number     // In frames
  layoutJson?: string  // Stringified JSON
  props?: jsonb
}
```

### 2. Service Outputs (Current)

#### SceneBuilderService
```typescript
{
  code: string         // → Should be tsxCode
  name: string         // Display name "Scene 1"
  duration: number
  layoutJson: any      // Object, not string
  reasoning: string
  debug: {...}
}
```

#### CodeGeneratorService (all methods)
```typescript
{
  code: string         // → Should be tsxCode
  name: string         // Function name
  duration: number
  reasoning: string
  debug: {...}
}
```

#### DirectCodeEditorService
```typescript
{
  code: string         // → Should be tsxCode
  changes: string[]
  preserved: string[]
  reasoning: string
  newDurationFrames?: number
  debug: {...}
}
```

### 3. Tool Outputs (Current)

#### Scene Creation Tools (AddScene, CreateSceneFromImage)
```typescript
{
  sceneCode: string    // → Should be tsxCode
  sceneName: string    // → Should be name
  duration: number
  layoutJson?: string  // AddScene only
  reasoning: string
  chatResponse?: string
  debug?: any
}
```

#### Scene Editing Tools (EditScene, EditSceneWithImage)
```typescript
{
  sceneCode: string    // → Should be tsxCode
  sceneName: string    // → Should be name
  duration: number
  changes: string[]
  preserved: string[]
  reasoning: string
  chatResponse?: string
  debug?: any
}
```

#### Special Case: FixBrokenScene
```typescript
{
  fixedCode: string    // → Should be tsxCode (DIFFERENT!)
  sceneName: string    // → Should be name
  sceneId: string
  duration: number
  changesApplied: string[] // → Should be changes (DIFFERENT!)
  reasoning: string
  chatResponse?: string
  debug?: any
}
```

### 4. VideoState Expected Format
```typescript
{
  id: string
  type: 'custom'
  start: number
  duration: number
  data: {
    code: string       // Maps from tsxCode
    name: string
    componentId: string
    props: {}
  }
}
```

## Transformation Chain

```
Database → Service → Tool → Orchestrator → VideoState
tsxCode → code → sceneCode → scene.tsxCode → data.code
name → name → sceneName → scene.name → data.name
```

## Recommendations

### Phase 1: Create Shared Interfaces ✅ COMPLETE
Created files:
- `/src/lib/types/shared/scene.types.ts` - Core SceneData interface
- `/src/lib/types/api/service-contracts.ts` - Service response interfaces
- `/src/lib/types/api/tool-contracts.ts` - Tool input/output interfaces
- `/src/lib/types/api/field-mapping.ts` - Transformation helpers

### Phase 2: Standardize Services (Next Step)
Update services to return standardized format:

```typescript
// Instead of:
return { code, name, duration, reasoning, debug }

// Return:
return {
  scene: {
    id: generateId(), // or passed in
    name,
    tsxCode: code,    // Rename field
    duration,
    layoutJson: layoutJson ? JSON.stringify(layoutJson) : undefined
  },
  reasoning,
  debug
}
```

### Phase 3: Standardize Tools
Update tools to expect and return standardized format:

```typescript
// Instead of:
return { sceneCode: result.code, sceneName: result.name, ... }

// Return:
return {
  scene: result.scene, // Pass through from service
  reasoning: result.reasoning,
  chatResponse: undefined,
  debug: result.debug
}
```

### Phase 4: Update Orchestrator
- Expect `scene` field from tools
- Use `scene` field for database operations
- Transform only at VideoState boundary

### Phase 5: Create VideoState Adapter
Single transformation point:

```typescript
// In videoState.addScene/updateScene:
const inputPropsScene = sceneToInputPropsScene(
  toolOutput.scene,
  calculateStartFrame()
);
```

## Benefits of This Approach

1. **Type Safety**: TypeScript will catch mismatches
2. **Single Source of Truth**: Database schema drives everything
3. **Clear Transformation Points**: Only at system boundaries
4. **Incremental Migration**: Can update services/tools one at a time
5. **Backwards Compatible**: Old code continues to work during migration

## Migration Order

1. Start with services (bottom of stack)
2. Then tools (middle layer)
3. Finally orchestrator and videoState (top layer)
4. Remove old field names after migration

This ensures we always have working code during the migration process.