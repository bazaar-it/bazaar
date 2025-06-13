# Principle 09: Direct Tool Access

## The Principle
**No unnecessary wrappers.** Call tools directly where they're needed.

## Current Problem
```typescript
// ❌ WRONG: Too many layers
generation.ts
  → orchestrator
    → toolExecutor
      → sceneBuilderWrapper
        → addSceneTool
          → layoutGenerator
            → codeGenerator

// 7 layers to create a scene!
```

## Correct Implementation
```typescript
// ✅ RIGHT: Direct access
// In generation.ts
const decision = await brain.decide(input);

switch (decision.tool) {
  case 'addScene':
    return await addSceneTool.execute(decision.context);
  case 'editScene':
    return await editSceneTool.execute(decision.context);
}

// That's it! 2 layers total.
```

## Remove These Wrappers
```typescript
// ❌ sceneBuilderNEW wrapper
export class SceneBuilderNEW {
  async addScene(input) {
    return this.addTool.execute(input); // Just forwarding!
  }
}

// ❌ toolExecutor wrapper  
async executeTools(decision) {
  const tool = this.tools[decision.tool];
  return tool.execute(decision.context); // Just forwarding!
}

// ❌ serviceWrapper pattern
class SceneServiceWrapper {
  constructor(private service: SceneService) {}
  async create(input) {
    return this.service.create(input); // Why?!
  }
}
```

## Direct Access Pattern
```typescript
// ✅ Import and use directly
import { addSceneTool } from './tools/add';
import { editSceneTool } from './tools/edit';
import { deleteSceneTool } from './tools/delete';

// ✅ Call directly
const result = await addSceneTool.execute({
  projectId,
  prompt,
  imageUrls
});
```

## When Wrappers ARE Acceptable
```typescript
// ✅ OK: Adding genuine functionality
class CachedSceneService {
  private cache = new Map();
  
  async getScene(id: string) {
    if (this.cache.has(id)) {
      return this.cache.get(id);
    }
    const scene = await db.query.scenes.findFirst({ where: eq(scenes.id, id) });
    this.cache.set(id, scene);
    return scene;
  }
}

// This wrapper adds caching - real value!
```

## Benefits
- Fewer files to navigate
- Clearer execution flow
- Less code to maintain
- Easier debugging
- Better performance

## Success Criteria
- Maximum 3 layers from entry to execution
- No pass-through wrappers
- Each layer adds real value
- Direct tool imports
- Clear execution path