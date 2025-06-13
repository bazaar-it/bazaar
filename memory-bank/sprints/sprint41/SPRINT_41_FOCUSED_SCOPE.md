# Sprint 41: Focused Scope (Single Source of Truth)

## Sprint Goal: Fix Architecture Only

**One sentence**: Move tool execution from brain to generation.ts and fix field naming inconsistencies.

## What We ARE Doing (5 days)

### Day 1-2: Fix Execution Location ✅ (DONE)
- [x] Create decision-only orchestrator
- [x] Move tool execution to generation.ts
- [x] Remove unnecessary wrappers (sceneBuilderNEW)

### Day 3: Fix Field Naming 🔴 (CURRENT)
- [ ] Change all `sceneCode` to `tsxCode` in tool types
- [ ] Change all `sceneName` to `name` in tool types
- [ ] Ensure DB field names used everywhere
- [ ] Zero transformations

### Day 4: Integrate & Clean 🟡
- [ ] Switch ChatPanelG to use generationV2
- [ ] Remove old orchestrator (2442 lines)
- [ ] Remove toolExecutor from brain
- [ ] Integrate normalized VideoState (if it exists and works)

### Day 5: Test & Verify 🟡
- [ ] Test all operations (add/edit/delete)
- [ ] Verify field names end-to-end
- [ ] Clean up unused files
- [ ] Document final architecture

## What We are NOT Doing (Save for Sprint 42+)

❌ Multi-step workflows (already works with current tools)
❌ Version control system
❌ Transaction support
❌ New MCP tool improvements
❌ Prompt simplification (beyond basic cleanup)
❌ Performance optimizations
❌ New features of any kind

## Clear Decisions

### 1. Tools vs Services
**Decision**: Keep the new `/src/tools/` structure
**Why**: It's already working and follows Sprint 40's modular vision
**Action**: Delete old `/src/server/services/scene/` after migration

### 2. Which Orchestrator
**Decision**: Use our new decision-only orchestrator
**Why**: It properly separates concerns
**Action**: Delete old 2442-line orchestrator

### 3. Which VideoState
**Decision**: Find and use normalized VideoState if it exists, otherwise keep current
**Why**: Optimistic UI is good but not critical for architecture fix
**Action**: Quick search, integrate if easy, skip if complex

## Success Criteria

✅ Brain only makes decisions (< 100 lines)
✅ Generation.ts handles all execution
✅ Field names match database exactly
✅ No transformation layers
✅ All tests pass
✅ No new features added

## Out of Scope

Everything not listed above. Period.

## Timeline

- Day 1-2: Execution location ✅ DONE
- Day 3: Field naming (TODAY)
- Day 4: Integration
- Day 5: Testing & cleanup

## Next Immediate Action

Fix field naming in tool types:
1. Update `/src/tools/helpers/types.ts`
2. Update all tool implementations
3. Remove transformations in generation.ts

---

This is the ONLY document that matters for Sprint 41. Ignore conflicting information in other documents.