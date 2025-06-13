# Sprint 41: Current State Analysis

## What We Have vs What Sprint 40 Intended

### 1. Orchestrator/Brain System

**Sprint 40 Vision:**
```typescript
// ~100 lines, decision-only
brain.decide(input) → { tool: 'addScene', context: {...} }
```

**Current Reality:**
```typescript
// orchestratorNEW with 3 components
orchestrator → ContextBuilder → IntentAnalyzer → ToolExecutor → Tools
```

**Issue**: ToolExecutor is inside brain, not in generation.ts

### 2. Generation Router

**Sprint 40 Vision:**
```typescript
// generation.ts handles execution
const decision = await brain.decide(input);
switch (decision.tool) {
  case 'addScene':
    return await sceneService.add(decision.context);
}
```

**Current Reality:**
```typescript
// generation.ts just passes through
const result = await orchestrator.processUserInput({...});
// All execution happens inside orchestrator
```

### 3. Tools Structure

**Sprint 40 Vision:**
- 3 simple MCP tools
- Direct scene service methods

**Current Reality:**
```
/src/tools/
├── sceneBuilderNEW.ts    # Wrapper
├── add/
│   ├── add.ts            # Complex tool class
│   └── add_helpers/      # Multiple services
├── edit/
│   ├── edit.ts
│   └── edit_helpers/
└── delete/
    └── delete.ts
```

**Assessment**: More complex than intended but well-organized

### 4. Field Names & Types

**Sprint 40 Vision:**
- Use exact database field names
- Zero transformation

**Current Reality:**
- Tools return `sceneCode`
- Database has `tsxCode`
- Multiple mappings required

### 5. VideoState

**Sprint 40 Vision:**
```typescript
// Normalized, flat structure
interface NormalizedVideoState {
  scenes: Record<string, Scene>;
  messages: Record<string, ChatMessage>;
  handleApiResponse(response: StandardApiResponse);
}
```

**Current Reality:**
- Still using old nested VideoState
- Multiple implementations exist but not integrated

### 6. Prompts

**Sprint 40 Vision:**
- 30-50 word prompts
- Trust AI models

**Current Reality:**
```
/src/brain/config/prompts/
├── ADD_SCENE.md (verbose)
├── ANALYZE_IMAGE.md (verbose)
├── BRAIN_ORCHESTRATOR.md (verbose)
└── ... (20+ files)
```

## File Inventory

### Orchestrators (Multiple Versions!)
1. `/src/server/services/brain/orchestrator.ts` - OLD (2442 lines)
2. `/src/server/services/brain/orchestrator.simplified.ts` - Sprint 40 attempt
3. `/src/brain/orchestratorNEW.ts` - Currently in use

### VideoStates (Multiple Versions!)
1. `/src/stores/videoState.ts` - Original
2. `/src/stores/videoState.normalized.ts` - Sprint 40 version
3. `/src/stores/videoState-simple.ts` - Another attempt
4. `/src/stores/videoState-hybrid.ts` - Yet another

### Generation Routers
1. `/src/server/api/routers/generation.ts` - Current (uses orchestratorNEW)
2. `/src/server/api/routers/generation.simplified.ts` - Sprint 40 version

## What's Good

1. **Modular Tools**: The `/src/tools/` structure is clean
2. **Type Safety**: Better than before with typed inputs/outputs
3. **Separation**: Tools, services, and brain are separate
4. **Working System**: It does function

## What Needs Fixing

1. **Execution in Wrong Place**: ToolExecutor should be in generation.ts
2. **Field Naming**: Must match database schema
3. **Too Complex**: More layers than Sprint 40 intended
4. **Multiple Versions**: Confusing duplicates everywhere
5. **Verbose Prompts**: Not simplified as intended

## Recommendation

1. **Start Fresh from Sprint 40 Vision**
   - Use Sprint 40's simplified architecture as base
   - Move execution to generation.ts
   - One source of truth for each component

2. **Keep Good Parts from restructure_brain**
   - Modular tools organization
   - Type definitions
   - Service patterns

3. **Fix Core Issues First**
   - Field naming alignment
   - Move execution out of brain
   - Integrate normalized VideoState

## Code Quality Assessment

- **Architecture**: C+ (too complex, execution in wrong place)
- **Type Safety**: B (good but field mismatches)
- **Organization**: B+ (tools well structured)
- **Sprint 40 Alignment**: D (missed key goals)
- **Maintainability**: C (too many versions)

## Next Action Items

1. Create clear migration plan
2. Start with fixing execution location
3. Align all field names
4. Remove duplicate files
5. Simplify to Sprint 40 vision