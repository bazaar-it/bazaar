# Scene Service Migration Plan

## Overview
Migrate from 13 services to 1 unified SceneService with 3 methods.

## Phase 1: Create SceneService (Day 1)

### 1.1 Create the Service
```typescript
// src/server/services/scene/scene.service.ts
export class SceneService extends StandardSceneService {
  // Copy implementation from ULTRA_SIMPLIFIED_SCENE_SERVICE.ts
}
```

### 1.2 Move System Prompts
```bash
src/server/prompts/
├── scene-generation/
│   ├── style-json-prompt.md      # From layoutGenerator
│   ├── codegen-prompt.md         # From codeGenerator
│   └── image-to-code-prompt.md   # New/existing
├── scene-editing/
│   ├── surgical-edit-prompt.md   # From directCodeEditor
│   ├── creative-edit-prompt.md   # New
│   ├── structural-edit-prompt.md # New
│   └── edit-with-image-prompt.md # From existing
```

### 1.3 Test SceneService in Isolation
- Unit tests for each method
- Mock AI responses
- Verify database operations

## Phase 2: Update MCP Tools (Day 2)

### 2.1 Simplify Tool Interfaces
```typescript
// Before: 7 tools
addScene, editScene, deleteScene, createSceneFromImage, 
editSceneWithImage, changeDuration, fixBrokenScene

// After: 3 tools
addScene, editScene, deleteScene
```

### 2.2 Update Each Tool

**addScene.ts:**
```typescript
export const addSceneTool = {
  name: 'addScene',
  description: 'Add a new scene from prompt or images',
  input: z.object({
    projectId: z.string(),
    prompt: z.string(),
    imageUrls: z.array(z.string()).optional(),
  }),
  execute: async (input) => {
    return sceneService.addScene(input);
  }
};
```

**editScene.ts:**
```typescript
export const editSceneTool = {
  name: 'editScene',
  description: 'Edit scene content, structure, or duration',
  input: z.object({
    sceneId: z.string(),
    prompt: z.string().optional(),
    editType: z.enum(['surgical', 'creative', 'structural']).optional(),
    imageUrls: z.array(z.string()).optional(),
    duration: z.number().optional(),
  }),
  execute: async (input) => {
    return sceneService.editScene(input);
  }
};
```

### 2.3 Remove Obsolete Tools
- Delete: createSceneFromImage (merged into addScene)
- Delete: editSceneWithImage (merged into editScene)
- Delete: changeDuration (merged into editScene)
- Archive: fixBrokenScene (keep for emergency)

## Phase 3: Update Orchestrator (Day 3)

### 3.1 Simplify Tool Registration
```typescript
// Before
const tools = [
  addSceneTool,
  editSceneTool,
  deleteSceneTool,
  createSceneFromImageTool,
  editSceneWithImageTool,
  changeDurationTool,
  fixBrokenSceneTool,
  // ... more
];

// After
const tools = [
  addSceneTool,
  editSceneTool,
  deleteSceneTool,
];
```

### 3.2 Update System Prompt
Tell the AI about the simplified tools:
```markdown
You have 3 scene tools:
- addScene: Creates scenes from prompts OR images
- editScene: Edits scenes (surgical/creative/structural) OR changes duration
- deleteScene: Deletes scenes

No need to choose between different creation/edit tools - they auto-detect!
```

## Phase 4: Frontend Updates (Day 4)

### 4.1 Simplify Tool Selection Logic
```typescript
// Before: Complex tool selection
const tool = imageUrls ? 'createSceneFromImage' : 'addScene';

// After: Always use the same tool
const tool = 'addScene'; // It handles both!
```

### 4.2 Update Type Definitions
```typescript
// Ensure frontend knows about simplified interfaces
type SceneOperation = 'add' | 'edit' | 'delete';
```

## Phase 5: Cleanup (Day 5)

### 5.1 Archive Old Services
```bash
# Move to archive (don't delete yet)
src/server/services/_archived/
├── generation/
│   ├── sceneBuilder.service.ts
│   ├── codeGenerator.service.ts
│   ├── directCodeEditor.service.ts
│   └── layoutGenerator.service.ts
```

### 5.2 Update Documentation
- Update CLAUDE.md with new architecture
- Update API documentation
- Create migration guide for team

### 5.3 Performance Testing
- Measure response times
- Compare AI token usage
- Verify model selection logic

## Rollback Plan

If issues arise:
1. SceneService can delegate to old services temporarily
2. Keep old tools available but deprecated
3. Feature flag for gradual rollout

## Success Metrics

- ✅ All tests pass
- ✅ 3 tools instead of 7
- ✅ 1 service instead of 13
- ✅ Same or better performance
- ✅ Cleaner codebase

## Timeline

- **Day 1**: Create SceneService
- **Day 2**: Update MCP tools
- **Day 3**: Update orchestrator
- **Day 4**: Frontend updates
- **Day 5**: Cleanup & documentation
- **Week 2**: Monitor in production
- **Week 3**: Remove old code

## Risk Mitigation

1. **Risk**: Breaking existing functionality
   - **Mitigation**: Comprehensive tests before migration

2. **Risk**: Different AI responses
   - **Mitigation**: Test prompts thoroughly

3. **Risk**: Performance regression
   - **Mitigation**: Benchmark before/after

4. **Risk**: Team confusion
   - **Mitigation**: Clear documentation & training