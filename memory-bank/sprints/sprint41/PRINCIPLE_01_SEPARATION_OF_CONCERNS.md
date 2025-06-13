# Principle 01: Separation of Concerns

## The Principle
**Brain decides, generation.ts executes.** Never mix decision-making with execution.

## Why This Matters
1. **Testability**: Test decisions and execution independently
2. **Flexibility**: Change execution strategy without touching decision logic
3. **Clarity**: Clear boundaries make code easier to understand
4. **Debugging**: Problems are isolated to one layer

## Current Violation
```typescript
// ❌ WRONG: Execution inside brain
orchestratorNEW.ts
  → contextBuilder
  → intentAnalyzer
  → toolExecutor.executeTools() // This should NOT be here!
```

## Correct Implementation
```typescript
// ✅ RIGHT: Clean separation
// In brain/orchestrator.simple.ts
async decide(input): Decision {
  return {
    tool: 'addScene',
    context: { projectId, prompt },
    reasoning: 'User wants to create a scene'
  };
}

// In generation.ts
async generateScene(input) {
  const decision = await brain.decide(input);
  
  switch (decision.tool) {
    case 'addScene':
      return await sceneService.add(decision.context);
  }
}
```

## How to Fix
1. Remove ToolExecutor from brain
2. Make brain return decisions only
3. Move all execution to generation.ts
4. Keep interfaces clean and focused

## Anti-patterns to Avoid
- Brain calling services directly
- Decision logic in generation.ts
- Mixed responsibilities
- Hidden execution in decision methods

## Success Criteria
- Brain is pure decision logic
- Generation.ts orchestrates all execution
- Clear data flow: Input → Decision → Execution → Result