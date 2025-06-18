# ChatPanelG Critical Issues - Sprint 42 Analysis

## Executive Summary

ChatPanelG is currently **BROKEN** due to API contract mismatches between the old generation.ts interface it expects and the new generation.clean.ts router that's actually running.

## Critical Issues Found

### 1. API Endpoint Mismatch
- **Root router uses**: `generation: generationCleanRouter`
- **ChatPanelG calls**: Old generation.ts interface
- **Result**: Runtime type errors

### 2. Missing Endpoints
The clean router is missing these endpoints that ChatPanelG uses:
- `api.generation.getProjectScenes` (line 158)
- `api.generation.addScene` (used by CodePanelG)

### 3. Parameter Mismatches
```typescript
// ChatPanelG sends:
{
  projectId: string,
  userMessage: string,     // ❌ Wrong field name
  sceneId?: string,        // ❌ Not in clean router
  userContext: {           // ❌ Nested structure
    sceneId?: string,
    imageUrls?: string[]
  }
}

// Clean router expects:
{
  projectId: string,
  prompt: string,          // ✅ Different field name
  imageUrls?: string[]     // ✅ Top-level, not nested
}
```

### 4. Partial Fix Attempted
The user has started adding compatibility to generation.clean.ts:
- Added optional `userMessage` field
- Added optional `sceneId` and `userContext` fields
- But the code still uses `input.prompt` everywhere

## Impact Analysis

### Broken Components
1. **ChatPanelG.tsx** - Main chat interface
2. **CodePanelG.tsx** - Uses non-existent `addScene`
3. **TemplatesPanelG.tsx** - Likely broken
4. **WorkspaceContentAreaG.tsx** - Likely broken
5. **StoryboardPanelG.tsx** - Likely broken

### Working Components
1. **VideoState store** - State management is fine
2. **Voice recording** - Uses separate voice router
3. **Image uploads** - Uses Next.js API route `/api/upload`

## Recommended Fix Strategy

### Option 1: Complete the Compatibility Layer (Recommended)
```typescript
// In generation.clean.ts
const prompt = input.prompt || input.userMessage;
const imageUrls = input.imageUrls || input.userContext?.imageUrls;

// Add missing endpoint
getProjectScenes: protectedProcedure
  .input(z.object({ projectId: z.string() }))
  .query(async ({ input }) => {
    return await databaseService.getProjectScenes(input.projectId);
  })
```

### Option 2: Update All Components
Update ChatPanelG and all other components to use the new API:
- Change `userMessage` → `prompt`
- Flatten `userContext.imageUrls` → `imageUrls`
- Remove `sceneId` from generateScene
- Add separate calls for edit/delete operations

### Option 3: Temporary Revert
Switch back to old generation.ts router until all components are updated.

## Dependencies That Need Updates

### If Keeping Clean Router:
1. Fix parameter compatibility in generation.clean.ts
2. Add missing `getProjectScenes` endpoint
3. Update all components to new API gradually

### If Reverting:
1. Change root.ts to use `generationRouter`
2. Keep clean router for future migration
3. Plan proper migration strategy

## TICKET-006 Implications

The ChatPanelG optimization ticket cannot proceed until:
1. API compatibility is fixed
2. Missing endpoints are added
3. Basic functionality is restored

## Next Steps

1. **Immediate**: Complete compatibility fix in generation.clean.ts
2. **Short-term**: Add missing endpoints
3. **Long-term**: Migrate all components to clean API
4. **Then**: Proceed with TICKET-006 optimizations