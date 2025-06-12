# Service Migration Guide to StandardSceneService

## Overview
This guide shows how to migrate existing services to use `StandardSceneService` base class for consistent output format.

## Before Migration
```typescript
// Old service returning custom format
class MyService {
  async generateSomething() {
    return {
      code: generatedCode,      // Wrong field name!
      name: sceneName,          // Inconsistent!
      duration: 150,
      reasoning: "...",
      debug: {...}
    };
  }
}
```

## After Migration
```typescript
// New service extending StandardSceneService
class MyService extends StandardSceneService {
  async generateScene(input) {
    // Generate your content...
    const generatedCode = await generateCode();
    
    // Create Scene entity with EXACT DB field names
    const scene = this.createSceneEntity({
      projectId: input.projectId,
      order: input.order || 0,
      name: "Scene 1",           // 'name' not 'sceneName'
      tsxCode: generatedCode,    // 'tsxCode' not 'code'
      duration: 150,
      layoutJson: null,
      props: null
    });
    
    // Return standardized response
    return this.createSceneResponse(
      scene,
      "Generated scene successfully",
      "Created a new scene"
    );
  }
}
```

## Migration Steps

### 1. Update Service Class
```typescript
// Change from:
export class SceneBuilderService {

// To:
import { StandardSceneService } from '~/server/services/base/StandardSceneService';
export class SceneBuilderService extends StandardSceneService {
```

### 2. Implement Required Method
```typescript
// Add the required generateScene method
async generateScene(input: {
  projectId: string;
  // ... your inputs
}): Promise<StandardApiResponse<SceneOperationResponse>> {
  // Your implementation
}
```

### 3. Update Field Names
```typescript
// Replace all occurrences:
code → tsxCode
sceneName → name
sceneCode → tsxCode
fixedCode → tsxCode
```

### 4. Use Helper Methods
```typescript
// Instead of manually creating response:
return {
  success: true,
  data: { code: "...", name: "..." }
};

// Use helpers:
const scene = this.createSceneEntity({...});
return this.createSceneResponse(scene, reasoning, chatResponse);
```

### 5. Add Backward Compatibility (if needed)
```typescript
// Keep old method for compatibility
async generateTwoStepCode(input) {
  console.warn('Deprecated: Use generateScene() instead');
  const response = await this.generateScene(input);
  
  // Transform to old format
  return {
    code: response.data.scene.tsxCode,
    name: response.data.scene.name,
    // ...
  };
}
```

## Services to Migrate

### High Priority (Used by tools)
1. ✅ SceneBuilderService → sceneBuilder.service.updated.ts
2. ⏳ CodeGeneratorService
3. ⏳ DirectCodeEditorService
4. ⏳ LayoutGeneratorService

### Medium Priority
5. ⏳ CodeFixerService
6. ⏳ ImageAnalysisService
7. ⏳ CodeMergerService

### Low Priority (internal services)
8. ⏳ ConversationalResponseService (being removed)

## Validation Checklist

- [ ] Service extends StandardSceneService
- [ ] Implements generateScene() method
- [ ] Returns StandardApiResponse<SceneOperationResponse>
- [ ] Uses exact DB field names (tsxCode, name, duration)
- [ ] No field transformations
- [ ] Validates scene with validateScene()
- [ ] Uses helper methods for response creation
- [ ] Backward compatibility maintained (if needed)

## Testing

After migration, test with:
```typescript
const result = await service.generateScene({...});

// Should have this structure:
expect(result).toMatchObject({
  success: true,
  operation: 'create',
  data: {
    scene: {
      tsxCode: expect.any(String),  // NOT 'code'
      name: expect.any(String),      // NOT 'sceneName'
      duration: expect.any(Number)
    }
  }
});
```

## Common Errors

1. **Field name mismatch**
   ```
   Error: Scene contains "code" field - use "tsxCode" instead
   ```
   Solution: Update all field names to match DB schema

2. **Missing required fields**
   ```
   Error: Scene missing required field: projectId
   ```
   Solution: Ensure all required fields are provided to createSceneEntity()

3. **Type mismatch**
   ```
   Type error: Property 'generateScene' is missing
   ```
   Solution: Implement the abstract generateScene() method