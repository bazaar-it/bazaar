# Sprint 41: Architecture Consolidation & Alignment

## Current State (Post-Merge)

After merging `restructure_brain` into `mark-12`, we have a hybrid system:

### What's Actually Running
- **NEW**: `orchestratorNEW` (modular ~60 lines) - IN USE ✅
- **OLD**: 2442-line orchestrator - EXISTS but NOT USED ❌
- **VideoState**: Still using old nested structure ❌
- **Tools**: New modular structure under `/src/tools/` ✅

### Architecture Overview
```
User Request → generation.ts → orchestratorNEW
                                    ↓
                            ContextBuilder
                                    ↓
                            IntentAnalyzer  
                                    ↓
                            ToolExecutor (⚠️ ISSUE: Should be in generation.ts)
                                    ↓
                            sceneBuilderNEW → Tools (add/edit/delete)
```

## Key Issues

### 1. Tool Execution Location 🔴
**Current**: ToolExecutor is inside the brain (`/src/brain/orchestrator_functions/toolExecutor.ts`)
**Should Be**: Tool execution should be in `generation.ts`
**Why**: Clear separation - Brain decides, Generation executes

### 2. Field Name Inconsistencies 🔴
- Tools return: `sceneCode`
- Database expects: `tsxCode`
- This breaks Sprint 40's "zero transformation" goal

### 3. Incomplete Sprint 40 Implementation 🟡
Sprint 40 built but didn't integrate:
- ✅ Simplified orchestrator (partial - using orchestratorNEW)
- ❌ Normalized VideoState (not integrated)
- ❌ Optimistic UI patterns (not implemented)
- ❌ Simplified prompts (still have 20+ verbose files)

### 4. Multiple Versions of Everything 🟡
- 3+ VideoState implementations
- 2+ orchestrator implementations
- Old code not cleaned up

## Sprint 41 Goals

### Primary Goal: Align Architecture with Original Vision

1. **Move Tool Execution to generation.ts**
   - Brain only makes decisions
   - Generation.ts handles all execution
   - Clean separation of concerns

2. **Fix Field Naming**
   - Use database field names everywhere
   - No transformation layers
   - Single source of truth

3. **Complete Sprint 40 Integration**
   - Integrate normalized VideoState
   - Implement optimistic UI
   - Simplify prompts to 30-50 words

4. **Clean Up Codebase**
   - Remove old orchestrator
   - Remove duplicate implementations
   - Single clear architecture

## Important Context

From user guidance:
> "This new structure is not what we want. We don't want tool executor inside the brain. We want that inside generation.ts."

> "We should not trust the new code from the new branch 100%. It's just suggestions. A lot of it is better in our original branch."

## Architecture Decision

### What We Keep from restructure_brain:
- Modular tools structure (`/src/tools/`)
- Separation of concerns in tools
- Base tool patterns

### What We Revert/Change:
- Move ToolExecutor out of brain
- Use Sprint 40's intended architecture
- Simplify to match original vision

## Next Steps

1. **Document current architecture precisely**
2. **Create migration plan to Sprint 40 vision**
3. **Start with moving tool execution to generation.ts**
4. **Fix field naming inconsistencies**
5. **Integrate normalized VideoState**

## Success Criteria

- Brain makes decisions ONLY (no execution)
- Generation.ts orchestrates execution
- Zero data transformation (use DB field names)
- Single VideoState implementation
- Prompts under 50 words
- Old code removed

## References

- Sprint 40 documentation: Complete architecture overhaul plan
- Current codebase: Hybrid state with new orchestrator but old patterns
- Original vision: Simple, fast, type-safe architecture