# Principle 03: Single Implementation

## The Principle
**One solution per problem.** Multiple implementations create confusion and bugs.

## Current Violations
```
❌ 3 Orchestrators:
- /src/server/services/brain/orchestrator.ts (2442 lines)
- /src/server/services/brain/orchestrator.simplified.ts
- /src/brain/orchestratorNEW.ts

❌ 4 VideoStates:
- /src/stores/videoState.ts
- /src/stores/videoState.normalized.ts
- /src/stores/videoState-simple.ts
- /src/stores/videoState-hybrid.ts

❌ 2 Tool Systems:
- /src/tools/
- /src/server/services/scene/
```

## Decision Criteria
Choose the implementation that:
1. **Matches Sprint 40 vision** (most important)
2. **Is simplest** (fewer lines, clearer logic)
3. **Has best performance** (measured, not assumed)
4. **Is most maintainable** (clear structure)

## What to Keep
```
✅ Brain: New simple orchestrator (~100 lines)
✅ VideoState: Normalized version (flat structure)
✅ Tools: Best structure from both (see QUICK_SUMMARY.md)
```

## What to Delete
```
🗑️ /src/server/services/brain/orchestrator.ts
🗑️ /src/stores/videoState.ts
🗑️ /src/stores/videoState-simple.ts
🗑️ /src/stores/videoState-hybrid.ts
🗑️ Duplicate tool implementations
```

## Migration Strategy
1. **Identify**: List all duplicates
2. **Compare**: Evaluate against criteria
3. **Choose**: Pick one winner
4. **Migrate**: Update all references
5. **Delete**: Remove losers immediately
6. **Test**: Ensure nothing broke

## Benefits
- Clear codebase navigation
- No confusion about which to use
- Reduced maintenance burden
- Faster onboarding
- Fewer bugs from inconsistency

## Success Criteria
- One orchestrator file
- One VideoState implementation
- One tool system
- Zero duplicate approaches