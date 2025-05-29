# Generation.ts Cleanup Plan - Phase 2 Implementation

## 🎯 **Goal: Simplify generation.ts to Delegation-Only (~500 lines)**

Currently `generation.ts` is 1,754 lines with massive duplication. The MCP tools are properly implemented in separate files, but the generation router still contains redundant tool logic.

## 🚨 **Current Duplication Issues**

### **Tool Logic Duplication**
```typescript
// CURRENT: generation.ts contains tool-specific logic
if (orchestrationResult.toolUsed === 'addScene') {
  // 50+ lines of addScene handling logic
  const result = orchestrationResult.result as any;
  // Database operations, validation, etc.
}

if (orchestrationResult.toolUsed === 'editScene') {
  // 40+ lines of editScene handling logic  
  // TODO PHASE2: Handle editScene and deleteScene tools
}

if (orchestrationResult.toolUsed === 'deleteScene') {
  // 30+ lines of deleteScene handling logic
  const result = orchestrationResult.result as any;
  // Scene deletion, database cleanup, etc.
}
```

**Problem**: This duplicates the logic already implemented in MCP tools!

### **Legacy System Duplication**
```typescript
// CURRENT: Two complete generation systems
const isMCPEnabled = () => process.env.FEATURE_MCP_ENABLED === 'true';

if (isMCPEnabled()) {
  // MCP system (300+ lines)
  const orchestrationResult = await brainOrchestrator.processUserInput(...);
  // Tool handling logic...
} else {
  // Legacy system (800+ lines)  
  const systemPrompt = isEditMode ? editPrompt : createPrompt;
  // Direct LLM call...
}
```

**Problem**: Maintaining two complete systems instead of clean delegation!

## ✅ **Target Architecture: Clean Delegation**

### **Simplified Generation Router**
```typescript
// TARGET: Clean delegation pattern (~500 lines total)
export const generationRouter = createTRPCRouter({
  generateScene: protectedProcedure
    .input(generateSceneSchema)
    .mutation(async ({ input, ctx }) => {
      // 1. Feature flag check (5 lines)
      if (!isMCPEnabled()) {
        return await legacyGenerationService.generateScene(input, ctx);
      }
      
      // 2. Delegate to Brain Orchestrator (10 lines)
      const orchestrationResult = await brainOrchestrator.processUserInput({
        prompt: input.userMessage,
        projectId: input.projectId,
        userId: ctx.session.user.id,
        userContext: { sceneId: input.sceneId },
        storyboardSoFar: await getProjectScenes(input.projectId),
      });
      
      // 3. Handle orchestration result (20 lines)
      if (!orchestrationResult.success) {
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: orchestrationResult.error || 'Scene generation failed',
        });
      }
      
      // 4. Return result (5 lines)
      return {
        scene: orchestrationResult.result,
        toolUsed: orchestrationResult.toolUsed,
        reasoning: orchestrationResult.reasoning,
      };
    }),
    
  // Other endpoints...
});
```

### **Extracted Services**
```typescript
// NEW: src/server/services/legacyGeneration.service.ts
export class LegacyGenerationService {
  async generateScene(input: GenerateSceneInput, ctx: Context) {
    // All legacy logic moved here
    // Clean separation from MCP system
  }
}

// NEW: src/server/services/sceneManagement.service.ts  
export class SceneManagementService {
  async getProjectScenes(projectId: string) {
    // Scene fetching logic
  }
  
  async persistScene(scene: Scene) {
    // Scene persistence logic
  }
}
```

## 🔧 **Implementation Steps**

### **Step 1: Extract Legacy System**
```bash
# Create new service file
touch src/server/services/legacyGeneration.service.ts
```

**Move Legacy Logic**:
- All non-MCP generation logic → `LegacyGenerationService`
- Legacy prompts and LLM calls
- Legacy validation and error handling
- Legacy database operations

### **Step 2: Extract Common Services**
```bash
# Create scene management service
touch src/server/services/sceneManagement.service.ts
```

**Move Common Logic**:
- Scene fetching and persistence
- Project context building
- Database operations
- SSE event emission

### **Step 3: Simplify Generation Router**
**Remove Duplicated Logic**:
- ❌ Remove tool-specific handling (already in MCP tools)
- ❌ Remove legacy generation code (moved to service)
- ❌ Remove database operations (moved to service)
- ✅ Keep only orchestration and delegation

### **Step 4: Update MCP Tools**
**Ensure Complete Implementation**:
- ✅ AddScene tool: Complete
- 🔄 EditScene tool: Complete implementation (remove TODO)
- ✅ DeleteScene tool: Complete  
- ✅ AskSpecify tool: Complete

## 📊 **Before vs After Comparison**

### **Current State (1,754 lines)**
```
generation.ts:
├── Feature flag logic (50 lines)
├── MCP orchestration (300 lines)
├── Tool handling duplication (400 lines)
├── Legacy generation system (800 lines)
├── Database operations (150 lines)
└── Error handling (54 lines)
```

### **Target State (~500 lines)**
```
generation.ts (~200 lines):
├── Feature flag logic (20 lines)
├── MCP delegation (50 lines)
├── Legacy delegation (30 lines)
├── Response formatting (50 lines)
└── Error handling (50 lines)

legacyGeneration.service.ts (~200 lines):
├── Legacy prompts and LLM calls
├── Legacy validation
└── Legacy database operations

sceneManagement.service.ts (~100 lines):
├── Scene CRUD operations
├── Project context building
└── SSE event emission
```

## 🎯 **Benefits of Cleanup**

### **Maintainability**
- **Single Responsibility**: Each file has one clear purpose
- **No Duplication**: Tool logic exists only in MCP tools
- **Clear Boundaries**: MCP vs Legacy vs Common services

### **Extensibility**
- **Easy Tool Addition**: Drop new tools into MCP framework
- **Legacy Isolation**: Legacy system contained and replaceable
- **Service Reuse**: Common services used by both systems

### **Testing**
- **Unit Testing**: Each service can be tested independently
- **Integration Testing**: Clear interfaces between services
- **Mocking**: Easy to mock dependencies

### **Performance**
- **Smaller Bundles**: Less code loaded per request
- **Better Caching**: Services can be cached independently
- **Cleaner Memory**: No duplicate logic in memory

## 🚀 **Implementation Timeline**

### **Day 1: Extract Legacy System**
- Create `LegacyGenerationService`
- Move all legacy logic
- Update generation.ts to delegate

### **Day 2: Extract Common Services**
- Create `SceneManagementService`
- Move database operations
- Update both MCP and legacy to use service

### **Day 3: Simplify Generation Router**
- Remove all duplicated tool logic
- Clean up imports and dependencies
- Verify ~500 line target

### **Day 4: Testing & Validation**
- Unit tests for new services
- Integration tests for delegation
- Performance testing

## ✅ **Success Criteria**

- **Line Count**: generation.ts reduced to ~500 lines
- **No Duplication**: Tool logic exists only in MCP tools
- **Clean Delegation**: Router only orchestrates, doesn't implement
- **All Tests Pass**: No functionality regression
- **Performance Maintained**: No latency increase

This cleanup will transform generation.ts from a monolithic file into a clean orchestration layer, making the codebase much more maintainable and extensible. 