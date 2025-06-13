# Sprint 41: Goal

## Single Objective
**Fix the architecture to align with Sprint 40's vision.**

## Problem Statement
The `restructure_brain` merge introduced architectural violations:
- Tool execution is inside the brain (wrong)
- Field names don't match the database
- Multiple implementations of core components exist
- The system is more complex than Sprint 40 intended

## Solution
Implement Sprint 40's clean architecture:
- Brain makes decisions only
- generation.ts handles all execution  
- Database field names everywhere
- One implementation per component
- Simple, fast, maintainable

## Definition of Done
When this code pattern works everywhere:

```typescript
// User request comes in
const decision = await brain.decide(userInput);
// Returns: { tool: 'addScene', context: {...} }

// Generation executes
const result = await executeTool(decision);
// Direct tool call, no wrappers

// State updates
videoState.handleApiResponse(result);
// Instant UI update
```

## What This Sprint is NOT
- Not adding new features
- Not optimizing performance
- Not redesigning UI
- Not refactoring everything

Just fixing the architecture to match Sprint 40.

## Success Metric
The architecture diagram matches Sprint 40's vision exactly.