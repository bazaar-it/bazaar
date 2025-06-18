# Scene Naming Architecture Fix

## Problem Statement

Current scene naming uses `Scene{order}_{projectId}` pattern which causes collisions:

1. Create scenes 1, 2, 3, 4
2. Delete scenes 2 and 3
3. Add new scene → becomes Scene 4 (order=3)
4. **COLLISION**: Two scenes named `Scene4_ddfd0d` → Runtime error!

## Root Cause

- Scene names are based on `order` field which changes when scenes are deleted
- React component names must be unique but we're generating duplicates
- The generated code exports functions like `export default function Scene4_ddfd0d`

## Solution: UUID-Based Component Names

### Option 1: Use Scene ID (Recommended)
```typescript
// Instead of: Scene4_ddfd0d
// Use: Scene_eb49b461 (first 8 chars of scene.id)

function generateSceneName(sceneId: string): string {
  return `Scene_${sceneId.substring(0, 8)}`;
}
```

### Option 2: Hybrid Approach
```typescript
// Include order for readability but ID for uniqueness
// Example: Scene1_eb49b461

function generateSceneName(order: number, sceneId: string): string {
  return `Scene${order}_${sceneId.substring(0, 8)}`;
}
```

### Option 3: Timestamp-Based
```typescript
// Use creation timestamp
// Example: Scene_1750237317

function generateSceneName(createdAt: Date): string {
  return `Scene_${Math.floor(createdAt.getTime() / 1000)}`;
}
```

## Implementation Plan

### 1. Update Code Generator
File: `/src/tools/add/add_helpers/CodeGeneratorNEW.ts`

```typescript
// Change from:
const sceneName = `Scene${input.sceneNumber}_${projectIdSuffix}`;

// To:
const sceneName = `Scene_${sceneId.substring(0, 8)}`;
```

### 2. Update Scene Entity
The scene name in the database should remain user-friendly (Scene 1, Scene 2, etc.)
But the TSX component name should be unique.

### 3. Update Preview System
The preview panel needs to map scene IDs to component names correctly.

### 4. Migration Strategy
- New scenes: Use UUID-based names immediately
- Existing scenes: Keep working as-is (no migration needed)
- The display name can still be "Scene 1", "Scene 2" for UX

## Benefits

1. **No More Collisions**: Each scene has a globally unique component name
2. **Stable Names**: Deleting other scenes doesn't affect existing scene names
3. **Simpler Logic**: No need to track "next available scene number"
4. **Better for Collaboration**: Multiple users can create scenes without conflicts

## Display vs Internal Names

- **Display Name** (UI): "Scene 1", "Scene 2", etc. (based on order)
- **Component Name** (Code): `Scene_eb49b461` (based on UUID)
- **Database Name**: User-friendly name stored in `scenes.name`

## Code Changes Required

1. **CodeGeneratorNEW.ts**: Update scene name generation
2. **Edit tool**: Preserve the UUID-based name during edits
3. **Preview panel**: Update component compilation to use new names
4. **Add tool**: Pass scene ID to code generator

## Testing Checklist

- [ ] Create 4 scenes
- [ ] Delete scenes 2 and 3
- [ ] Add new scene - should not conflict
- [ ] Edit existing scenes - names preserved
- [ ] Preview works with new naming
- [ ] Export/publish works correctly