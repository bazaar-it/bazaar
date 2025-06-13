# Sprint 41 Implementation Plan

## Current State Analysis

### What's Working
- ✅ ChatPanelG error fixed (sceneData declaration)
- ✅ Data flow mapped: ChatPanel → generation.ts → orchestratorNEW → toolExecutor → tools
- ✅ New modular tool structure under `/src/tools/`
- ✅ Brain makes decisions via orchestratorNEW (~60 lines)

### Critical Issues to Fix
1. **Tool execution in wrong place** - ToolExecutor is inside brain, should be in generation.ts
2. **Field naming mismatch** - Tools might return `sceneCode` but DB expects `tsxCode`
3. **Complex data transformations** - Multiple layers of data transformation
4. **Old code not removed** - 2442-line orchestrator still exists

## Implementation Steps

### Phase 1: Move Tool Execution (Priority 1)
**Goal**: Brain only decides, generation.ts executes

1. **Modify orchestratorNEW** to return tool decision only:
   ```typescript
   // Return format:
   {
     success: true,
     toolName: 'addScene',
     toolContext: { /* specific context for tool */ },
     reasoning: 'User wants to create a new scene',
     chatResponse: 'I'll create that scene for you!'
   }
   ```

2. **Move tool execution to generation.ts**:
   - Import sceneBuilderNEW directly in generation.ts
   - Execute tools based on brain's decision
   - Handle all DB operations in generation.ts

3. **Remove ToolExecutor from brain**:
   - Delete `/src/brain/orchestrator_functions/toolExecutor.ts`
   - Update orchestratorNEW to not use ToolExecutor

### Phase 2: Fix Field Naming (Priority 2)
**Goal**: Use DB field names everywhere (tsxCode, not sceneCode)

1. **Update all type definitions**:
   - Check BaseToolOutput and ensure it uses `tsxCode`
   - Update SceneData type to match DB schema exactly
   - Remove all field mapping/transformation code

2. **Update tools to return correct field names**:
   - Verify all tools return `tsxCode` not `sceneCode`
   - Check sceneBuilderNEW methods

3. **Remove transformations in ChatPanelG**:
   - Direct pass-through of DB fields
   - No more field renaming

### Phase 3: Integrate Normalized VideoState (Priority 3)
**Goal**: Single source of truth, optimistic UI

1. **Find and integrate videoState.normalized.ts**:
   - Replace current VideoState with normalized version
   - Implement single `handleApiResponse` method
   - Remove all complex refresh logic

2. **Update ChatPanelG for optimistic updates**:
   - Immediate VideoState update on response
   - No database refetch
   - Trust the state

3. **Update all panels to react to VideoState**:
   - PreviewPanelG should auto-recompile on state change
   - CodePanelG should update immediately
   - No manual refresh needed

### Phase 4: Simplify Architecture (Priority 4)
**Goal**: Clean, fast, maintainable codebase

1. **Simplify prompts**:
   - Reduce all prompts to 30-50 words
   - Remove verbose prompt files
   - Trust AI models more

2. **Remove old code**:
   - Delete old 2442-line orchestrator
   - Remove duplicate VideoState implementations
   - Archive unused files

3. **Optimize flow**:
   - Direct data flow with no unnecessary hops
   - <100ms decision time in brain
   - Immediate UI updates

## Expected Architecture After Implementation

```
User Input (ChatPanelG)
    ↓
generation.ts
    ├─→ Brain (orchestratorNEW) - DECIDES ONLY
    │      ├─→ ContextBuilder - builds context
    │      └─→ IntentAnalyzer - returns tool decision
    │
    └─→ Tool Execution (in generation.ts)
           ├─→ sceneBuilderNEW.addScene()
           ├─→ sceneBuilderNEW.editScene()
           └─→ sceneBuilderNEW.deleteScene()
                      ↓
                 Database Update
                      ↓
           Optimistic VideoState Update
                      ↓
              All Panels Update
```

## Success Metrics
- ✅ Brain under 100 lines
- ✅ Tool execution in generation.ts only
- ✅ Zero field transformations (tsxCode everywhere)
- ✅ Single VideoState implementation
- ✅ All prompts under 50 words
- ✅ No duplicate files
- ✅ <100ms decision time
- ✅ Immediate UI updates

## Testing Strategy
1. Test each phase independently
2. Verify data flow at each step
3. Check field names end-to-end
4. Measure performance improvements
5. Ensure no regressions

## Next Immediate Steps
1. Start with Phase 1 - Move tool execution to generation.ts
2. This is the most critical change that enables everything else
3. Once brain only makes decisions, everything else becomes clearer