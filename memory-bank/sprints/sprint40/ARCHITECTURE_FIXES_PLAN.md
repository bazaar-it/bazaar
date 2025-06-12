# Sprint 40: Architecture Fixes & Testing Plan

## Overview
The new simplified architecture has been built but NOT integrated. Before switching, we need to fix critical issues found during code review.

## Core Principles
1. **Simplicity** - Less code, clear purpose
2. **Speed** - Optimistic UI, smart caching
3. **Trust Models** - Minimal prompts, let AI be creative
4. **Type Safety** - No `any`, proper discriminated unions
5. **Single Source of Truth** - Normalized state, one update path

---

## Critical Issues to Fix

### 1. Type Safety ❌ CRITICAL
**Problem**: Using `as any` everywhere destroys type safety
```typescript
// BAD - Current
const context = decision.context as any;

// GOOD - Fixed
type BrainDecision = 
  | { tool: 'addScene'; context: AddSceneContext }
  | { tool: 'editScene'; context: EditSceneContext }
  | { tool: 'deleteScene'; context: DeleteSceneContext };
```

**Fix Plan**:
1. Create proper discriminated union for BrainDecision
2. Remove ALL `as any` casts
3. Use type guards for narrowing
4. Add strict TypeScript checks

**Test**: TypeScript should compile with `strict: true`

---

### 2. VideoState Normalization ❌ CRITICAL
**Problem**: VideoState is deeply nested, not normalized
```typescript
// BAD - Current
projects: {
  [projectId]: {
    props: {
      scenes: Scene[]  // Nested array!
    }
  }
}

// GOOD - Normalized
scenes: Record<string, Scene>;
messages: Record<string, Message>;
projectScenes: Record<string, string[]>;  // Just IDs
```

**Fix Plan**:
1. Flatten VideoState structure
2. Implement single `handleApiResponse` method
3. Use selectors for derived data
4. Remove all nested updates

**Test**: 
- No nested spreading in reducers
- Can update single scene without touching others
- Selectors return consistent data

---

### 3. Optimistic UI ⚠️ HIGH
**Problem**: Everything waits for server response
```typescript
// BAD - Current
const result = await generateScene();
updateUI(result);

// GOOD - Optimistic
updateUIOptimistically(predicted);
const result = await generateScene();
reconcile(result);
```

**Fix Plan**:
1. Add optimistic update methods to VideoState
2. Add reconciliation logic
3. Add rollback for failures
4. Track sync status per entity

**Test**:
- UI updates instantly (<16ms)
- Failed updates rollback correctly
- Sync indicators work

---

### 4. Model Trust & Simplification 🎯 HIGH
**Problem**: Over-instructing AI models
```typescript
// BAD - Too prescriptive
const PROMPT = `You must follow these exact rules:
1. Always use const
2. Quote all CSS values
3. Use these exact patterns...
[500 more lines]`;

// GOOD - Trust the model
const PROMPT = `Create a React/Remotion component for: ${userRequest}
Style: ${preferences.style}`;
```

**Fix Plan**:
1. Reduce all prompts by 80%
2. Remove prescriptive rules
3. Trust Sonnet 4 for code generation
4. Let models be creative

**Test**:
- Prompts under 200 words
- Models produce better, more creative output
- Less hallucination from confusion

---

### 5. Multi-Tool Workflows ⚠️ MEDIUM
**Problem**: Brain can only return one tool
```typescript
// User: "Add intro then add outro"
// Current: Can only do one
```

**Fix Plan**:
1. Add workflow support to BrainDecision
2. Support tool chaining
3. Add progress tracking
4. Handle partial failures

**Test**:
- Can execute multi-step operations
- Progress updates between steps
- Partial success handling

---

### 6. Error Boundaries 🛡️ MEDIUM
**Problem**: Single try-catch, no recovery
```typescript
// BAD - Current
try {
  // Everything
} catch {
  return fallback;
}

// GOOD - Granular
try {
  const decision = await brain.decide();
  try {
    const result = await executeTool(decision);
  } catch (toolError) {
    return handleToolError(toolError, decision);
  }
} catch (brainError) {
  return handleBrainError(brainError);
}
```

**Fix Plan**:
1. Add error boundaries at each layer
2. Implement retry logic
3. Add fallback strategies
4. Better error messages

**Test**:
- Network errors don't crash
- Retries work correctly
- User sees helpful errors

---

## Implementation Order

### Phase 1: Type Safety (Day 1)
1. Fix all discriminated unions
2. Remove all `any` types
3. Add strict TypeScript
4. Run type checker

### Phase 2: VideoState (Day 2)
1. Normalize structure
2. Implement handleApiResponse
3. Add selectors
4. Migrate existing code

### Phase 3: Optimistic UI (Day 3)
1. Add optimistic methods
2. Add reconciliation
3. Add sync tracking
4. Test UI responsiveness

### Phase 4: Simplify Prompts (Day 4)
1. Audit all prompts
2. Reduce by 80%
3. Test output quality
4. Document new approach

### Phase 5: Integration (Day 5)
1. Switch to new orchestrator
2. Update imports
3. Remove old code
4. Full system test

---

## Testing Strategy

### Unit Tests
```typescript
// Test discriminated unions
describe('BrainDecision', () => {
  it('narrows types correctly', () => {
    const decision = brain.decide(input);
    if (decision.tool === 'addScene') {
      // TypeScript knows context is AddSceneContext
      expect(decision.context.projectId).toBeDefined();
    }
  });
});

// Test normalized state
describe('VideoState', () => {
  it('updates single scene efficiently', () => {
    const before = { ...state.scenes };
    videoState.updateScene('scene_1', { name: 'New' });
    // Only scene_1 reference changed
    expect(state.scenes.scene_2).toBe(before.scene_2);
  });
});
```

### Integration Tests
```typescript
// Test full flow
it('handles add scene flow', async () => {
  // 1. Check optimistic update
  const promise = api.generateScene({ prompt: 'Add intro' });
  expect(videoState.scenes).toContain(optimisticScene);
  
  // 2. Wait for result
  const result = await promise;
  
  // 3. Check reconciliation
  expect(videoState.scenes[result.id]).toEqual(result);
});
```

### Performance Tests
```typescript
// Measure latencies
it('updates UI in one frame', () => {
  const start = performance.now();
  videoState.updateScene(id, data);
  const end = performance.now();
  expect(end - start).toBeLessThan(16); // 60fps
});
```

### Model Output Tests
```typescript
// Test simplified prompts
it('generates quality code with minimal prompt', async () => {
  const result = await codeGenerator.generate({
    prompt: 'Button that says Hello',
    style: 'modern'
  });
  
  expect(result.code).toContain('Hello');
  expect(result.code).toContain('button');
  // Trust model for the rest
});
```

---

## Success Metrics

### Performance
- [ ] User action → UI update: <16ms
- [ ] Brain decision with cache: <100ms
- [ ] Scene generation: <2s
- [ ] Zero unnecessary re-renders

### Code Quality
- [ ] 0 TypeScript errors with strict mode
- [ ] 0 uses of `any` type
- [ ] All prompts <200 words
- [ ] <100 lines per file

### User Experience
- [ ] Instant feedback on all actions
- [ ] Clear sync status indicators
- [ ] Helpful error messages
- [ ] Multi-step operations work

### Developer Experience
- [ ] Can understand any file in <2 minutes
- [ ] Clear separation of concerns
- [ ] Easy to add new tools
- [ ] Testable architecture

---

## Migration Checklist

### Pre-Switch
- [ ] All types fixed
- [ ] VideoState normalized
- [ ] Optimistic UI working
- [ ] Prompts simplified
- [ ] Tests passing

### Switch Day
- [ ] Update generation router import
- [ ] Update orchestrator import
- [ ] Test in development
- [ ] Deploy to staging
- [ ] Monitor for errors

### Post-Switch
- [ ] Remove old orchestrator
- [ ] Remove old generation router
- [ ] Clean up unused code
- [ ] Update documentation

---

## Risk Mitigation

### Rollback Plan
1. Keep old code for 1 week
2. Feature flag for gradual rollout
3. Monitor error rates
4. Quick revert if needed

### Data Migration
1. VideoState structure change needs migration
2. Write migration script
3. Test on copy of production data
4. Have backup ready

---

## Final Architecture Vision

```typescript
// Clean, typed, fast
const decision = await brain.decide(input);  // <100ms with cache

// Type-safe execution
switch (decision.tool) {
  case 'addScene':
    // TypeScript knows context type
    return handleAddScene(decision.context);
}

// Optimistic UI
videoState.optimistic.addScene(predicted);
const result = await api.generateScene(input);
videoState.reconcile(result);

// Trust AI
const prompt = `Create ${input.request}. Style: ${user.preferences}`;
// Let Sonnet 4 work its magic
```

Simple. Fast. Typed. Trusted.