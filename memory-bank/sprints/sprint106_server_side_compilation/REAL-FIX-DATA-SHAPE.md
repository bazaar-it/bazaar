# The Real Fix: Data Shape Consistency

## The Problem
We have scenes in different shapes depending on their source:

### From Database (tRPC queries)
```typescript
scene = {
  id: "scene_123",
  tsxCode: "export default function...",
  jsCode: "function Component()...", 
  jsCompiledAt: "2024-01-01",
  name: "Scene 1",
  duration: 150,
  order: 0
}
```

### From Zustand State (videoState)
```typescript
scene = {
  id: "scene_123", 
  data: {
    code: "export default function...", // or tsxCode
    jsCode: "function Component()...",    // sometimes missing
    name: "Scene 1"
  },
  duration: 150,
  order: 0
}
```

## Why This Happened
1. Historical evolution - started with one structure, evolved differently
2. Database schema uses flat structure
3. Zustand store wraps scene data in `data` property for... reasons?
4. No single transformation layer to normalize

## The Band-Aid We're Doing Now
Checking multiple locations everywhere:
```typescript
const tsxCode = scene.tsxCode || scene.data?.code || scene.data?.tsxCode;
const jsCode = scene.jsCode || scene.data?.jsCode;
```

This is technical debt because:
- Every component needs to know about both shapes
- Easy to miss a location and cause bugs
- Fingerprint calculation becomes complex
- Type safety is compromised

## The Real Fix

### Option 1: Single Transformation Layer (Recommended)
Create a normalization function that ALL components use:

```typescript
// src/lib/utils/scene-normalizer.ts
export function normalizeScene(scene: any): NormalizedScene {
  return {
    id: scene.id,
    tsxCode: scene.tsxCode || scene.data?.code || scene.data?.tsxCode || '',
    jsCode: scene.jsCode || scene.data?.jsCode || '',
    jsCompiledAt: scene.jsCompiledAt || scene.data?.jsCompiledAt,
    compilationError: scene.compilationError || scene.data?.compilationError,
    name: scene.name || scene.data?.name || `Scene ${scene.order + 1}`,
    duration: scene.duration || 150,
    order: scene.order || 0,
    // ... other fields
  };
}
```

Then EVERYWHERE:
```typescript
const normalizedScenes = scenes.map(normalizeScene);
```

### Option 2: Fix Zustand Store Structure
Change videoState to store scenes in the same shape as the database:
- Remove the `data` wrapper
- Store fields flat
- One-time migration of existing state

### Option 3: Transform at API Boundary
Make tRPC procedures return scenes in the same shape as Zustand:
- Wrap database results in `data` property
- Consistent but weird structure

## Why We're Not Doing The Real Fix Now

1. **Scope creep** - Sprint 106 is about compilation, not data architecture
2. **Risk** - Touching every component that uses scenes
3. **Testing** - Would need comprehensive regression testing
4. **Time** - This is a 2-3 day refactor minimum

## The Minimal Fix For Now

Update the fingerprint to check all locations:
```typescript
const tsxCode = s.tsxCode || (s.data as any)?.code || (s.data as any)?.tsxCode || '';
const jsCode = s.jsCode || (s.data as any)?.jsCode || '';
const combinedCode = tsxCode + '|JS|' + jsCode;
```

This solves the immediate problem (preview not refreshing) without:
- Adding new patterns
- Making the problem worse
- Breaking existing code

## Future Sprint Proposal

**Sprint XXX: Data Shape Normalization**
- Implement scene normalizer utility
- Update all components to use normalized scenes
- Add TypeScript types for NormalizedScene
- Regression test all scene operations
- Consider doing same for projects, templates, etc.

## Lessons Learned

1. **Define data shapes early** - Don't let them evolve organically
2. **Single source of truth** - One shape, everywhere
3. **Transform at boundaries** - Not throughout the app
4. **Type safety matters** - Would have caught this earlier