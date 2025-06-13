# Principle 05: Speed First

## The Principle
**Every interaction must feel instant.** Speed is a feature.

## Performance Targets
- **Brain Decision**: <100ms
- **UI Update**: <16ms (one frame)
- **Tool Execution**: <500ms
- **Full Operation**: <1 second

## Current Performance Issues
```typescript
// ❌ SLOW: Database round trips
const result = await createScene();
const scenes = await fetchAllScenes(); // Unnecessary!
updateUI(scenes);

// ❌ SLOW: Complex state updates
videoState.updateScenes(
  videoState.transformData(
    videoState.validateData(newData)
  )
);
```

## Speed Optimizations

### 1. Optimistic Updates
```typescript
// ✅ FAST: Update UI immediately
// In generation.ts
const optimisticScene = createOptimisticScene(input);
videoState.addScene(optimisticScene); // Instant UI update

const result = await brain.decide(input);
const finalScene = await executeTools(result);
videoState.confirmScene(optimisticScene.id, finalScene);
```

### 2. Normalized State
```typescript
// ❌ SLOW: Nested lookups
const scene = state.projects[projectId].timelines[0].scenes.find(s => s.id === id);

// ✅ FAST: Direct access
const scene = state.scenes[id]; // O(1) lookup
```

### 3. Minimal Processing
```typescript
// ❌ SLOW: Transform everything
const processedScenes = scenes.map(transform).filter(validate).sort(order);

// ✅ FAST: Use as-is
videoState.handleApiResponse(response); // Direct update
```

### 4. Smart Caching
```typescript
// Cache decisions for similar inputs
const decisionCache = new Map();
const cacheKey = hashInput(input);

if (decisionCache.has(cacheKey)) {
  return decisionCache.get(cacheKey); // <1ms
}
```

## Implementation Checklist
- [ ] Implement optimistic updates everywhere
- [ ] Use normalized state structure
- [ ] Remove unnecessary transformations
- [ ] Add decision caching
- [ ] Profile and measure everything
- [ ] Set performance budgets

## Measuring Performance
```typescript
// Add timing to critical paths
const start = performance.now();
const decision = await brain.decide(input);
console.log(`Decision time: ${performance.now() - start}ms`);
```

## Success Criteria
- No UI operation over 16ms
- No decision over 100ms
- User never waits for UI
- Feels faster than native apps