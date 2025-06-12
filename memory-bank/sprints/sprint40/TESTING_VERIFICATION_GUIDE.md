# Testing & Verification Guide - Sprint 40

## How to Verify the New System is Working

### 1. Type Safety Verification

#### Check: No More `any`
```bash
# Run this command - should return 0
grep -r "as any" src/server/services/brain/ | wc -l
grep -r ": any" src/server/services/brain/ | wc -l

# TypeScript strict mode
npm run typecheck -- --strict
```

#### Test Discriminated Unions
```typescript
// In TypeScript playground or test file
const decision: BrainDecision = await brain.decide(input);

// This should give TypeScript errors if types are wrong
if (decision.tool === 'addScene') {
  console.log(decision.context.sceneId); // ERROR - addScene has no sceneId
  console.log(decision.context.projectId); // OK
}
```

---

### 2. VideoState Normalization Test

#### Before (BAD):
```typescript
// Check current structure in console
const state = useVideoState.getState();
console.log(state.projects[projectId].props.scenes); // Nested!
```

#### After (GOOD):
```typescript
// Normalized structure
const state = useVideoState.getState();
console.log(state.scenes); // Flat object
console.log(state.messages); // Flat object
console.log(state.projectScenes[projectId]); // Just IDs
```

#### Performance Test:
```typescript
// Should only update ONE reference
const before = { ...state.scenes };
videoState.updateScene('scene_1', { name: 'New' });

// Check that other scenes didn't change reference
Object.keys(before).forEach(id => {
  if (id !== 'scene_1') {
    console.assert(state.scenes[id] === before[id], 'Unchanged scene mutated!');
  }
});
```

---

### 3. Optimistic UI Testing

#### Manual Test Steps:
1. Open Network tab, set to "Slow 3G"
2. Type "Change button to red"
3. **IMMEDIATELY** (within 16ms):
   - Preview should show updating indicator
   - Chat shows message as "pending"
4. After network completes:
   - Preview shows red button
   - Chat message shows "success"

#### Code Test:
```typescript
// Measure update speed
const start = performance.now();
videoState.updateSceneOptimistic('scene_1', predicted);
const elapsed = performance.now() - start;

console.assert(elapsed < 16, `Too slow! ${elapsed}ms`);
```

#### Rollback Test:
1. Disconnect network
2. Make edit
3. See optimistic update
4. Wait for timeout
5. Should rollback to original

---

### 4. Model Trust Verification

#### Prompt Length Check:
```typescript
// Count words in all prompts
const prompts = [
  SYSTEM_PROMPTS.CODE_GENERATOR,
  SYSTEM_PROMPTS.BRAIN_ORCHESTRATOR,
  // ... all prompts
];

prompts.forEach(prompt => {
  const wordCount = prompt.content.split(' ').length;
  console.log(`${prompt.name}: ${wordCount} words`);
  console.assert(wordCount < 200, `${prompt.name} too long!`);
});
```

#### Quality Test:
```typescript
// Test with minimal prompt
const result = await codeGenerator.generate({
  prompt: "Animated welcome screen",
  // NO rules, NO instructions
});

// Should still produce great code
expect(result.code).toContain('animation');
expect(result.code).toContain('Welcome');
```

---

### 5. End-to-End Flow Tests

#### Test 1: Add First Scene
```typescript
// Fresh project
const project = await createProject();
expect(videoState.scenes).toEqual({});

// Add scene
await api.generation.generateScene({
  projectId: project.id,
  userMessage: "Create intro with logo"
});

// Verify
expect(Object.keys(videoState.scenes)).toHaveLength(1);
expect(videoState.scenes[sceneId].tsxCode).toContain('logo');
```

#### Test 2: Fast Duration Change
```typescript
// Should use quick detect, skip AI
const start = Date.now();
await api.generation.generateScene({
  projectId,
  userMessage: "Make it 3 seconds"
});
const elapsed = Date.now() - start;

expect(elapsed).toBeLessThan(300); // No AI call
expect(scene.duration).toBe(90); // 3 * 30fps
```

#### Test 3: Multi-Step Workflow
```typescript
// Future feature
await api.generation.generateScene({
  userMessage: "Add intro, then add outro"
});

expect(videoState.workflow).toEqual([
  { tool: 'addScene', status: 'complete' },
  { tool: 'addScene', status: 'pending' }
]);
```

---

### 6. Performance Benchmarks

Run these in console to verify speed improvements:

```javascript
// Test 1: Context Cache Hit Rate
let cacheHits = 0;
let cacheMisses = 0;

// Intercept console logs
const originalLog = console.log;
console.log = (...args) => {
  if (args[0]?.includes('[ContextBuilder] Using cached')) cacheHits++;
  if (args[0]?.includes('[ContextBuilder] Building fresh')) cacheMisses++;
  originalLog(...args);
};

// Make 10 requests
for (let i = 0; i < 10; i++) {
  await api.generation.generateScene({ userMessage: `Test ${i}` });
}

console.log(`Cache hit rate: ${(cacheHits / (cacheHits + cacheMisses) * 100).toFixed(1)}%`);
// Should be >80% after first request
```

```javascript
// Test 2: UI Update Latency
const measurements = [];

// Override updateScene to measure
const original = videoState.updateScene;
videoState.updateScene = (...args) => {
  const start = performance.now();
  original(...args);
  measurements.push(performance.now() - start);
};

// Make edits
// ... user actions ...

console.log(`Average UI update: ${(measurements.reduce((a,b) => a+b) / measurements.length).toFixed(2)}ms`);
// Should be <16ms
```

---

### 7. System Health Checks

#### Memory Usage:
```javascript
// Check VideoState size
const state = useVideoState.getState();
const stateSize = new Blob([JSON.stringify(state)]).size;
console.log(`VideoState size: ${(stateSize / 1024).toFixed(1)}KB`);
// Should be <100KB per project
```

#### No Memory Leaks:
```javascript
// Take heap snapshot
// Run 100 operations
// Take another snapshot
// Compare - should be minimal growth
```

#### Error Recovery:
```javascript
// Simulate failures
const original = fetch;
let callCount = 0;

window.fetch = (...args) => {
  callCount++;
  if (callCount % 3 === 0) {
    return Promise.reject(new Error('Network error'));
  }
  return original(...args);
};

// Should see retries and graceful handling
```

---

### 8. Developer Experience Test

#### Can you answer YES to all?
- [ ] Can understand any service file in <2 minutes?
- [ ] Can add a new tool without touching orchestrator?
- [ ] Can test a single service in isolation?
- [ ] Types guide you without checking docs?
- [ ] Errors are helpful and actionable?

#### Code Simplicity Metrics:
```bash
# No file over 100 lines
find src/server/services/brain -name "*.ts" -exec wc -l {} \; | sort -n

# Cyclomatic complexity <5
npx eslint src/server/services/brain --rule 'complexity: ["error", 5]'
```

---

## Integration Test Script

Save as `test-new-architecture.ts`:

```typescript
import { test, expect } from '@playwright/test';

test.describe('New Architecture E2E', () => {
  test('complete user journey', async ({ page }) => {
    // 1. Create project
    await page.goto('/projects/new');
    
    // 2. Add first scene
    await page.fill('[data-testid="chat-input"]', 'Create welcome screen');
    await page.press('[data-testid="chat-input"]', 'Enter');
    
    // Check optimistic UI
    await expect(page.locator('[data-testid="preview"]')).toContainText('Loading', { timeout: 100 });
    
    // Check final result
    await expect(page.locator('[data-testid="preview"]')).toContainText('Welcome', { timeout: 3000 });
    
    // 3. Edit scene
    await page.fill('[data-testid="chat-input"]', 'Make text blue');
    await page.press('[data-testid="chat-input"]', 'Enter');
    
    // Should update quickly
    await expect(page.locator('[data-testid="preview"] text')).toHaveCSS('color', 'rgb(0, 0, 255)', { timeout: 1000 });
    
    // 4. Duration change (should be fast)
    const start = Date.now();
    await page.fill('[data-testid="chat-input"]', 'Make it 3 seconds');
    await page.press('[data-testid="chat-input"]', 'Enter');
    await expect(page.locator('[data-testid="timeline"]')).toContainText('3s');
    expect(Date.now() - start).toBeLessThan(500);
  });
});
```

Run with: `npx playwright test test-new-architecture.ts`

---

## When It's Ready

You'll know the new system is ready when:

1. **All tests pass** (unit, integration, e2e)
2. **Performance targets met** (<16ms UI, <100ms cache)
3. **No TypeScript errors** with strict mode
4. **Prompts under 200 words** each
5. **Can handle errors** gracefully
6. **Developer experience** is delightful

Then and only then, switch to the new architecture!