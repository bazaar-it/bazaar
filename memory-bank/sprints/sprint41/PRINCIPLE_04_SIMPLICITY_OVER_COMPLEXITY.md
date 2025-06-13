# Principle 04: Simplicity Over Complexity

## The Principle
**Prefer 100 lines over 2000 lines.** Complexity is the enemy of reliability.

## Current Violations
```typescript
// ❌ OLD orchestrator.ts: 2442 lines
// - Complex state machines
// - Multiple abstraction layers
// - Defensive programming everywhere
// - 20+ dependencies

// ❌ Verbose prompts: 500+ words per file
// - Over-explaining context
// - Repeating instructions
// - Not trusting AI
```

## Target Simplicity
```typescript
// ✅ NEW brain: ~100 lines
class SimpleBrain {
  async decide(input) {
    const intent = this.getIntent(input);
    const context = this.getContext(input, intent);
    return { tool: intent.tool, context };
  }
}

// ✅ Concise prompts: 30-50 words
const PROMPT = `Decide which tool:
- addScene: create new
- editScene: modify existing
- deleteScene: remove
Return: {tool, context}`;
```

## Simplification Strategies

### 1. Remove Defensive Code
```typescript
// ❌ WRONG
if (scene && scene.id && typeof scene.id === 'string') {
  if (scene.tsxCode && scene.tsxCode.length > 0) {
    // 5 levels of checks
  }
}

// ✅ RIGHT
await updateScene(scene.id, scene.tsxCode);
// Trust your types and data
```

### 2. Flatten Deep Hierarchies
```typescript
// ❌ WRONG: 5 levels deep
orchestrator
  → strategySelector
    → contextEnricher
      → intentClassifier
        → toolSelector
          → executor

// ✅ RIGHT: 2 levels
brain.decide()
generation.execute()
```

### 3. Remove Unnecessary Abstractions
```typescript
// ❌ WRONG
interface IAbstractSceneFactory {
  createSceneBuilder(): ISceneBuilder;
}

// ✅ RIGHT
function addScene(prompt: string) { }
```

## Benefits
- Easier to understand
- Faster to debug
- Less code to maintain
- Fewer places for bugs
- Quicker onboarding

## Success Criteria
- Brain under 100 lines
- No file over 300 lines
- Maximum 3 levels of nesting
- All prompts under 50 words
- Zero unnecessary abstractions