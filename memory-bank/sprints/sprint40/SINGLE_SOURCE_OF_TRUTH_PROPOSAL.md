# Single Source of Truth Proposal for Tool & Service Interfaces

## Current State Analysis

### 1. Database Schema (Source of Truth)
```typescript
// scenes table
{
  id: uuid
  name: string           // e.g., "Scene1_abc123"
  tsxCode: string       // The React component code
  duration: number      // In frames (e.g., 150)
  layoutJson?: string   // JSON layout specification
  props?: jsonb         // Scene-specific props
}
```

### 2. VideoState Expected Format
```typescript
// InputProps scene format
{
  id: string            // UUID
  type: 'custom'        // For AI-generated scenes
  start: number         // Frame position
  duration: number      // In frames
  data: {
    code: string      // Maps to tsxCode
    name: string      // Maps to name
    componentId: string // Same as id
    props: {}         // Maps to props
  }
}
```

### 3. Current Inconsistencies
- **Services output**: `{code, name, duration}`
- **Tools output**: `{sceneCode, sceneName, duration}`
- **Special cases**: `fixedCode`, `changesApplied`
- **VideoState expects**: `data.code` (not `tsxCode` or `sceneCode`)

## Proposed Solution: Unified Scene Interface

### 1. Core Scene Interface (Database-Aligned)
```typescript
// src/lib/types/shared/scene.types.ts

/**
 * Core scene data structure matching database schema
 * This is the single source of truth for scene data
 */
export interface SceneData {
  id: string;
  name: string;        // e.g., "Scene1_abc123"
  tsxCode: string;     // React component code
  duration: number;    // In frames
  layoutJson?: string; // Optional layout specification
  props?: Record<string, any>; // Optional scene props
}

/**
 * Scene metadata for operations
 */
export interface SceneMetadata {
  order?: number;
  projectId?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

/**
 * Complete scene record (data + metadata)
 */
export interface Scene extends SceneData, SceneMetadata {}
```

### 2. Service Response Interface
```typescript
// src/lib/types/api/service-contracts.ts

/**
 * Standard response from all scene-generating services
 */
export interface SceneServiceResponse {
  scene: SceneData;        // Core scene data
  reasoning: string;       // Why this was generated
  debug?: any;            // Optional debug info
}

/**
 * Response from scene-editing services
 */
export interface SceneEditServiceResponse extends SceneServiceResponse {
  changes: string[];      // What was changed
  preserved: string[];    // What was kept
  newDurationFrames?: number; // If duration changed
}
```

### 3. Tool Output Interface
```typescript
// src/lib/types/api/tool-contracts.ts

/**
 * Base output for all scene-generating tools
 */
export interface SceneToolOutput {
  scene: SceneData;        // Core scene data
  reasoning: string;       // Tool's reasoning
  chatResponse?: string;   // Optional chat message
  debug?: any;            // Optional debug info
}

/**
 * Output for scene creation tools
 */
export interface SceneCreateToolOutput extends SceneToolOutput {
  replacedWelcomeScene?: boolean;
}

/**
 * Output for scene editing tools  
 */
export interface SceneEditToolOutput extends SceneToolOutput {
  changes: string[];
  preserved: string[];
}

/**
 * Output for scene deletion
 */
export interface SceneDeleteToolOutput {
  success: boolean;
  deletedScene: SceneData;
  reasoning: string;
  chatResponse?: string;
}
```

### 4. VideoState Adapter
```typescript
// src/lib/utils/videoStateAdapter.ts

/**
 * Converts database/tool scene format to InputProps scene format
 */
export function sceneToInputPropsScene(
  scene: SceneData, 
  startFrame: number
): InputProps['scenes'][number] {
  return {
    id: scene.id,
    type: 'custom' as const,
    start: startFrame,
    duration: scene.duration,
    data: {
      code: scene.tsxCode,    // Map tsxCode → code
      name: scene.name,
      componentId: scene.id,
      props: scene.props || {}
    }
  };
}

/**
 * Converts InputProps scene to database format
 */
export function inputPropsSceneToScene(
  scene: InputProps['scenes'][number]
): SceneData {
  if (scene.type !== 'custom') {
    throw new Error('Only custom scenes can be converted');
  }
  
  return {
    id: scene.id,
    name: scene.data.name,
    tsxCode: scene.data.code,  // Map code → tsxCode
    duration: scene.duration,
    props: scene.data.props
  };
}
```

## Implementation Plan

### Phase 1: Define Interfaces ✅
1. Create type files with interfaces above
2. Export from central index

### Phase 2: Update Services (Bottom-Up)
1. **SceneBuilderService**: Return `{scene: SceneData, reasoning, debug}`
2. **CodeGeneratorService**: Return `{scene: SceneData, reasoning, debug}`
3. **DirectCodeEditorService**: Return `{scene: SceneData, changes, preserved, reasoning}`

### Phase 3: Update Tools
1. Change all tools to expect `SceneData` from services
2. Change all tools to output `SceneToolOutput` variants
3. Remove all field transformations

### Phase 4: Update Orchestrator
1. Update `processToolResult` to expect new interfaces
2. Update database operations to use `scene` field
3. Add adapter calls when passing to videoState

### Phase 5: Update VideoState
1. Update `addScene` to use adapter: `sceneToInputPropsScene`
2. Update `updateScene` to use adapter
3. Keep internal format for backwards compatibility

## Benefits

1. **Single Source of Truth**: Database schema drives all interfaces
2. **No Transformations**: Services and tools use same field names
3. **Type Safety**: TypeScript enforces consistency
4. **Clear Adapter Layer**: Only transform at videoState boundary
5. **Backwards Compatible**: VideoState internal format unchanged

## Migration Strategy

1. **Add New Fields First**: Add `scene` field alongside old fields
2. **Deprecate Old Fields**: Mark old fields as deprecated
3. **Update Consumers**: Update code to use new fields
4. **Remove Old Fields**: Clean up after migration

## Example Implementation

### Before (Current)
```typescript
// Service returns
{ code: "...", name: "Scene1", duration: 150 }

// Tool transforms
{ sceneCode: result.code, sceneName: result.name, duration: result.duration }

// VideoState expects different format
{ data: { code: "...", name: "Scene1" }, duration: 150 }
```

### After (Proposed)
```typescript
// Service returns
{ scene: { id: "...", name: "Scene1", tsxCode: "...", duration: 150 } }

// Tool passes through
{ scene: result.scene, reasoning: "..." }

// Adapter at videoState boundary only
const inputPropsScene = sceneToInputPropsScene(toolOutput.scene, startFrame);
```

This establishes a clear, single source of truth with transformations only at the system boundary (videoState), not scattered throughout tools and services.