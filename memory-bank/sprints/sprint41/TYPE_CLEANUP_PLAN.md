# Sprint 41 Type Cleanup Plan

## Current Type Usage

### ✅ ACTIVELY USED (Keep)
1. **`/src/tools/helpers/types.ts`** - Primary Sprint 41 tool types
   - Used by: All tools (add/edit/delete)
   - Contains: Tool input/output interfaces, Zod schemas

2. **`/src/brain/orchestrator_functions/types.ts`** - Brain types
   - Used by: orchestratorNEW.ts
   - Contains: OrchestrationInput/Output

3. **`/src/lib/types/api/brain-decision.ts`** - Decision interface
   - Used by: generation.ts
   - Contains: BrainDecision interface

4. **`/src/lib/types/api/golden-rule-contracts.ts`** - Legacy but still needed
   - Used by: Old scene services (not Sprint 41 code)
   - Contains: StandardApiResponse, Scene types
   - **Note**: Keep until scene services are migrated

### ❌ NOT USED (Can Delete)
1. **`brain-contracts.ts`** - Old brain contracts
2. **`tool-contracts.ts`** - Old tool contracts  
3. **`tool-contracts.simplified.ts`** - Simplified but unused
4. **`service-contracts.ts`** - Legacy service types

## Type Architecture (Sprint 41)

```
Tools: /src/tools/helpers/types.ts
Brain: /src/brain/orchestrator_functions/types.ts  
API: /src/lib/types/api/brain-decision.ts
```

## Migration Status
- ✅ Tools: Fully migrated to new types
- ✅ Brain: Using minimal types
- ✅ Generation Router: Using new types
- ⚠️ Scene Services: Still using golden-rule-contracts
- ⚠️ Other Services: May need golden-rule-contracts

## Recommendation
1. Delete unused contract files now
2. Keep golden-rule-contracts.ts for now
3. Plan future migration of scene services
4. Document the new type system clearly