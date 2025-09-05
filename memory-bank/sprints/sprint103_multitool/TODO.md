# Sprint 103: Multi-Tool Support TODO

## Goal
Enable the brain to execute multiple tools in sequence from a single user prompt.

## Implementation Tasks (Sequential Approach - 2 Days)

### Day 1: Backend

- [ ] Update brain orchestrator prompt to detect multi-operations
- [ ] Modify intent analyzer to return operation arrays
- [ ] Update orchestrator to handle sequential execution
- [ ] Add progress callbacks for multi-step operations
- [ ] Implement error handling with partial completion

### Day 2: Frontend & Testing  

- [ ] Update SSE streaming to show multi-operation progress
- [ ] Add UI indicators for "Step X of Y"
- [ ] Handle partial success states
- [ ] Test common scenarios:
  - Delete multiple scenes
  - Edit all scenes
  - Add multiple scenes
  - Mixed operations

## Test Scenarios

1. **"Delete scenes 3, 4, and 5"**
   - Should delete all three sequentially
   - Show progress: "Deleting 1 of 3..."

2. **"Make all scenes 3 seconds"**
   - Should trim each scene to 90 frames
   - Handle scenes already at 3 seconds

3. **"Add 3 text scenes"**
   - Create three sequential text scenes
   - Each with unique content

4. **"Make scene 1 blue and scene 2 red"**
   - Two edit operations
   - Different changes per scene

## Success Metrics

- Multi-operations complete in single request
- Clear progress indication
- Graceful error handling
- No performance degradation
- Backwards compatible with single-tool