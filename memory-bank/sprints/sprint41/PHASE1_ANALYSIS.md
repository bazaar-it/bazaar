# Phase 1: Move Tool Execution to generation.ts

## Current Flow
```
generation.ts → orchestrator.processUserInput() → {
  contextBuilder.buildContext()
  intentAnalyzer.analyzeIntent() 
  toolExecutor.executeTools() ← THIS SHOULD BE IN generation.ts
}
```

## Target Flow
```
generation.ts → {
  // 1. Get decision from brain
  const decision = await orchestrator.getDecision()
  
  // 2. Execute tool based on decision (in generation.ts)
  const result = await executeToolLocally(decision)
  
  // 3. Update database and return response
}
```

## Files to Modify

### 1. orchestratorNEW.ts
- Remove toolExecutor import and usage
- Rename `processUserInput` to `getDecision`
- Return tool decision instead of executing

### 2. generation.ts
- Import sceneBuilderNEW directly
- Add tool execution logic
- Handle all database operations

### 3. Types to Update
- Create new `BrainDecision` type for orchestrator output
- Keep existing `StandardApiResponse` for final response

## Benefits
- Clear separation: Brain decides, Generation executes
- Tool execution closer to database operations
- Easier to implement optimistic updates
- Simpler testing and debugging