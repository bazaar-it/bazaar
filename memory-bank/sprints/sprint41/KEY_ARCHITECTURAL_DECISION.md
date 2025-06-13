# Sprint 41: Key Architectural Decision

## The Core Issue

The `restructure_brain` branch put **tool execution inside the brain**. This is wrong.

## The Right Architecture

### Brain (Decision Only)
```typescript
// Brain ONLY decides what to do
async decide(input): Decision {
  return {
    tool: 'addScene',
    context: { prompt, projectId, imageUrls },
    reasoning: 'User wants to create a new scene'
  };
}
```

### Generation.ts (Execution)
```typescript
// Generation.ts orchestrates execution
async generateScene(input) {
  // 1. Brain decides
  const decision = await brain.decide(input);
  
  // 2. Generation executes
  switch (decision.tool) {
    case 'addScene':
      return await addTool.execute(decision.context);
    case 'editScene':
      return await editTool.execute(decision.context);
    case 'deleteScene':
      return await deleteTool.execute(decision.context);
  }
}
```

## Why This Separation Matters

1. **Single Responsibility**
   - Brain: Strategic decisions
   - Generation: Tactical execution

2. **Testability**
   - Test decisions separately from execution
   - Mock brain for execution tests
   - Mock tools for decision tests

3. **Flexibility**
   - Change execution strategy without touching brain
   - Add new tools without modifying decision logic
   - Handle errors at the right layer

4. **Clarity**
   - Clear boundary between "what" and "how"
   - Easy to understand flow
   - No hidden execution inside decision logic

## What's Wrong with Current Code

```typescript
// Current: Brain does EVERYTHING
orchestrator.processUserInput()
  → contextBuilder.buildContext()
  → intentAnalyzer.analyzeIntent()  
  → toolExecutor.executeTools()     // ❌ WRONG! Execution inside brain
  → tools.execute()
```

## What Sprint 40 Got Right

Sprint 40 understood this separation:
- Brain: ~100 lines of decision logic
- Generation: Handles all execution
- Tools: Focused on their specific tasks

## The Fix

1. Remove `toolExecutor` from brain
2. Return decisions from brain
3. Move execution to generation.ts
4. Keep clean separation

## Example Flow

```
User: "Add a blue title scene"
         ↓
    generation.ts
         ↓
    brain.decide()
         ↓
    { tool: 'addScene', context: {...} }
         ↓
    generation.ts executes
         ↓
    addTool.execute(context)
         ↓
    Result back to user
```

## This is Non-Negotiable

The user was clear:
> "We don't want tool executor inside the brain. We want that inside generation.ts."

This is the correct architecture. Sprint 40 had it right. The restructure_brain branch got it wrong.

## Remember

- **Brain decides**
- **Generation executes**
- **Never mix the two**