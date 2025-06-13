# Sprint 41: Migration Plan to Sprint 40 Vision

## Overview

Move from current hybrid state to Sprint 40's clean architecture vision.

## Phase 1: Fix Execution Location (Day 1)

### Current Flow
```
generation.ts → orchestratorNEW → ToolExecutor → Tools
```

### Target Flow
```
generation.ts → brain.decide() → generation.ts executes → Tools
```

### Steps:
1. **Modify orchestratorNEW to only return decisions**
   ```typescript
   // Instead of executing, just return:
   return {
     tool: 'addScene',
     context: { projectId, prompt, imageUrls },
     reasoning: 'User wants to add a new scene'
   }
   ```

2. **Move execution logic to generation.ts**
   ```typescript
   // In generation.ts
   const decision = await brain.decide(input);
   
   switch (decision.tool) {
     case 'addScene':
       const result = await addTool.execute(decision.context);
       break;
     case 'editScene':
       const result = await editTool.execute(decision.context);
       break;
   }
   ```

3. **Remove ToolExecutor from brain**
   - Delete `/src/brain/orchestrator_functions/toolExecutor.ts`
   - Update orchestratorNEW to not use it

## Phase 2: Fix Field Names (Day 1-2)

### Changes Required:
1. **Update all type definitions**
   ```typescript
   // Change from:
   sceneCode: string;
   // To:
   tsxCode: string;
   ```

2. **Update tools to return correct fields**
   - Modify BaseToolOutput interface
   - Update all tool implementations
   - No more field mapping!

3. **Ensure database alignment**
   - Tools output matches DB schema exactly
   - No transformation layers

## Phase 3: Simplify Brain (Day 2)

### Target Structure:
```typescript
// brain/orchestrator.simple.ts (~100 lines)
export class SimpleBrain {
  async decide(input: BrainInput): Promise<BrainDecision> {
    // 1. Understand intent (30 lines)
    const intent = await this.analyzeIntent(input);
    
    // 2. Prepare context (30 lines)
    const context = this.prepareContext(input, intent);
    
    // 3. Return decision (10 lines)
    return {
      tool: intent.tool,
      context: context,
      reasoning: intent.reasoning
    };
  }
}
```

### Remove:
- Complex orchestration logic
- Multi-step workflows (handle in generation.ts)
- Tool execution code

## Phase 4: Integrate Normalized VideoState (Day 3)

### Steps:
1. **Switch to normalized store**
   ```typescript
   // In components
   import { useVideoStateNormalized } from '~/stores/videoState.normalized';
   ```

2. **Update all components**
   - Use flat structure: `scenes[id]`
   - Call `handleApiResponse()` for updates
   - Remove nested access patterns

3. **Delete old VideoState**
   - Remove `/src/stores/videoState.ts`
   - Remove other variants

## Phase 5: Simplify Prompts (Day 3-4)

### Current:
```
/src/brain/config/prompts/BRAIN_ORCHESTRATOR.md (500+ words)
```

### Target:
```typescript
// In code, not separate files
const BRAIN_PROMPT = `
Decide which tool to use:
- addScene: Create new scenes
- editScene: Modify existing scenes  
- deleteScene: Remove scenes

User request: {prompt}
Current scenes: {sceneCount}

Return: { tool, targetSceneId?, reasoning }
`;
```

### Actions:
1. Replace all verbose prompt files with inline strings
2. Keep prompts under 50 words
3. Trust AI to understand context

## Phase 6: Cleanup (Day 4-5)

### Delete These Files:
```
❌ /src/server/services/brain/orchestrator.ts (old 2442 lines)
❌ /src/brain/orchestrator_functions/toolExecutor.ts
❌ /src/stores/videoState.ts (old)
❌ /src/stores/videoState-simple.ts
❌ /src/stores/videoState-hybrid.ts
❌ /src/brain/config/prompts/*.md (verbose files)
```

### Keep These:
```
✅ /src/brain/orchestrator.simple.ts (new 100 lines)
✅ /src/server/api/routers/generation.ts (with execution)
✅ /src/stores/videoState.normalized.ts
✅ /src/tools/* (current structure is good)
```

## Testing Checkpoints

### After Phase 1:
- [ ] Brain returns decisions only
- [ ] Generation.ts executes tools
- [ ] All features still work

### After Phase 2:
- [ ] No field mapping code exists
- [ ] Tools return tsxCode, not sceneCode
- [ ] Database saves without transformation

### After Phase 3:
- [ ] Brain is under 100 lines
- [ ] Decisions are simple and clear
- [ ] No execution logic in brain

### After Phase 4:
- [ ] UI uses normalized state
- [ ] Updates are optimistic (<16ms)
- [ ] Single update method works

### After Phase 5:
- [ ] All prompts under 50 words
- [ ] AI responses are still good
- [ ] No separate prompt files

## Risk Mitigation

1. **Create backups before major changes**
2. **Test each phase thoroughly**
3. **Keep old files temporarily (rename with .old)**
4. **Document any deviations from plan**
5. **Have rollback strategy ready**

## Expected Outcome

A clean, simple architecture that matches Sprint 40's vision:
- Brain: 100 lines (decisions only)
- Generation: Clear execution flow
- VideoState: Normalized and fast
- Prompts: Concise and effective
- Zero unnecessary complexity

## Timeline

- Day 1: Phases 1-2 (Critical fixes)
- Day 2: Phase 3 (Simplify brain)
- Day 3: Phase 4 (VideoState)
- Day 4: Phase 5 (Prompts)
- Day 5: Phase 6 (Cleanup) + Testing

Total: 5 days to reach Sprint 40's vision