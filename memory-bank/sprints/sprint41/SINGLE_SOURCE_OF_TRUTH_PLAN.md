# Sprint 41: Single Source of Truth

## Sprint Goal
Fix the architecture to match Sprint 40's vision: **Brain decides, generation.ts executes**.

## Current State
- ToolExecutor is inside brain (wrong location)
- Field names don't match database (`sceneCode` vs `tsxCode`)
- Multiple implementations of core components
- Architecture doesn't match Sprint 40 design

## Target State
- Brain only makes decisions (~100 lines)
- generation.ts handles all execution
- Database field names used everywhere
- Single implementation of each component
- Clean, simple architecture

## Success Criteria
1. ✅ Brain returns decisions only (no execution)
2. ✅ All tool execution in generation.ts
3. ✅ Zero field transformations
4. ✅ No duplicate implementations
5. ✅ Architecture matches Sprint 40 vision

## Out of Scope
- New features (multi-step workflows, version control)
- UI changes beyond necessary updates
- Performance optimizations
- Additional tooling

## Timeline
5 days to complete architecture fix

## Reference
Sprint 40 documentation is the north star for this sprint.