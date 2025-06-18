# Structure Improvement Action Plan

## Current State vs Ideal State

### ✅ What's Already Perfect
1. **Database-driven types** - Already implemented via `generate:types`
2. **T3 structure** - `app/` and `server/` properly separated
3. **Tools pattern** - Clean MCP-style tools in `/tools/`
4. **Workspace** - All panels working correctly

### 🔧 What Needs Improvement

## Action Items

### 1. Consolidate Test Files (Low Priority)
**Current**: Tests scattered in 8+ locations
```
src/__tests__/
src/app/__tests__/
src/server/services/__tests__/
src/hooks/__tests__/
src/remotion/components/scenes/__tests__/
src/lib/api/__tests__/
src/tests/
```

**Action**: Move to root-level `__tests__/` directory
```
__tests__/
├── unit/
│   ├── components/
│   ├── hooks/
│   └── services/
├── integration/
│   ├── api/
│   └── db/
└── e2e/
    └── workspace/
```

### 2. Simplify Prompts (High Priority)
**Current**: 40+ prompts in `prompts.config.ts` (1234 lines!)
**Target**: 5 essential prompts

**Action**:
```typescript
// NEW: config/prompts.essential.ts
export const PROMPTS = {
  PLANNER: "...",      // For brain/planner
  GENERATE: "...",     // For scene generation  
  EDIT: "...",         // For scene editing
  FIX: "...",          // For error fixing
  ANALYZE: "..."       // For image analysis
};
```

### 3. Clean Up Services (Medium Priority)
**Current Issues**:
- Old generation services still exist
- Duplicate implementations
- Unclear which are used

**Action**: Keep only essential services
```
server/services/
├── ai/
│   └── aiClient.service.ts      # ✅ Keep - LLM wrapper
├── data/
│   └── projectMemory.service.ts # ✅ Keep - Memory service
└── storage/
    └── r2.service.ts           # Create - R2 operations
```

Delete:
- `generation/` folder (replaced by tools)
- `base/` folder (old pattern)
- Empty service files

### 4. Simplify Brain (High Priority)
**Current**: Complex orchestration with separate functions
**Target**: Single intelligent planner

**Action**:
```typescript
// NEW: brain/planner.ts
export class Planner {
  async plan(input: PlannerInput): Promise<PlannerDecision> {
    // Simplified, intelligent planning
  }
}
```

### 5. Type Organization (Medium Priority)
**Current**: Types scattered across multiple directories
**Target**: Generated types + minimal manual types

**Action**:
```
generated/              # From database
├── entities.ts        # ✅ Already exists
├── api-contracts.ts   # Generate from tRPC
└── zod-schemas.ts     # Generate from entities

lib/types/             # Manual types only
├── remotion.ts        # Video-specific
└── ui.ts             # UI component types
```

## Implementation Priority

### Phase 1: Quick Wins (1 day)
1. **Simplify prompts** - Create new 5-prompt system
2. **Delete unused services** - Remove old generation services
3. **Update imports** - Use generated types everywhere

### Phase 2: Brain Optimization (2-3 days)
1. **Simplify brain** - Create new planner.ts
2. **Remove layout JSON** - Direct generation
3. **Implement streaming** - Multi-step operations

### Phase 3: Structure Cleanup (1 week)
1. **Consolidate tests** - Move to root __tests__/
2. **Clean services** - Keep only essential
3. **Document structure** - Update README

## Files to Delete (Confirmed Safe)

### Old Service Implementations
```bash
rm -rf src/server/services/generation/
rm -rf src/server/services/base/
rm -f src/server/services/ai/conversationalResponse.service.ts
rm -f src/server/services/ai/titleGenerator.service.ts
```

### Duplicate Configs
```bash
rm -f src/config/prompts.simplified.ts  # Use new essential prompts
```

### Empty/Unused Files
```bash
rm -f src/tree.json
rm -f src/env.js  # If not used
```

## Success Metrics

1. **Build time**: Should decrease by 20%
2. **Type safety**: 100% generated types usage
3. **Code clarity**: Team understands structure
4. **Generation time**: <30 seconds (from 2 minutes)

## Current File Count
- **Now**: 269 files, 120 directories
- **Target**: ~220 files, ~100 directories
- **Reduction**: ~50 files, ~20 directories

## Key Principle

> "The database schema is the single source of truth. Everything else is generated or minimal."

This ensures type safety and reduces manual synchronization errors.