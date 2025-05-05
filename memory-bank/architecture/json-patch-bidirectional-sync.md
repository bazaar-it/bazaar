# JSON-Patch Bidirectional Sync Architecture

## Overview
We've implemented a robust Single Source of Truth pattern using JSON-Patch for bidirectional updates across the application's key components: Timeline, Chat, and Preview. This architecture ensures that changes made in any one component are immediately reflected in all others, with proper error handling and type safety.

## Components

### 1. Patch Factory (`/src/lib/patch.ts`)
A utility library that generates standardized JSON-Patch operations:

```typescript
// Creates a JSON Patch operation to add a new scene
export function addScene(newScene: Scene): Operation[] {
  return [{ op: "add", path: "/scenes/-", value: newScene }];
}

// Creates a JSON Patch operation to remove a scene by its index
export function removeSceneByIndex(idx: number): Operation[] {
  return [{ op: "remove", path: `/scenes/${idx}` }];
}

// Creates a JSON Patch operation to replace a specific property of a scene
export function replace<K extends keyof Scene>(
  idx: number,
  key: K,
  value: Scene[K],
): Operation[] {
  return [{ op: "replace", path: `/scenes/${idx}/${key}`, value }];
}
```

### 2. Enhanced Video State Store (`/src/stores/videoState.ts`)
Central state manager using Zustand with optimistic updates and rollback capability:

```typescript
applyPatch: (projectId, patch) =>
  set((state) => {
    // Skip if project doesn't exist
    if (!state.projects[projectId]) return state;
    
    try {
      // Store original state for potential rollback
      const originalProps = structuredClone(state.projects[projectId].props);

      // Apply patch to create new props
      const newProps = applyPatch(
        structuredClone(originalProps), 
        patch, 
        /* validate */ true
      ).newDocument;
      
      // Fire-and-forget persist to server
      fetch("/api/trpc/video.applyPatch", {/*...*/})
        .catch(() => {
          // Rollback if server rejects
          // ...
        });
      
      // Return updated state
      return {/*...*/};
    } catch (error) {
      console.error("Failed to apply patch:", error);
      return state; // Return unchanged state on error
    }
  })
```

### 3. Server-Side Patch Handler (`/src/server/api/routers/video.ts`)
TRPC router that validates and applies patches with database transaction safety:

```typescript
export const videoRouter = createTRPCRouter({
  applyPatch: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        patch: z.array(z.any()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await handlePatch(
        input.projectId,
        input.patch as Operation[],
        ctx.db,
        ctx.session.user.id
      );
    }),
});
```

### 4. Selected Scene Context (`/src/components/client/Timeline/SelectedSceneContext.tsx`)
React context for tracking the currently selected scene:

```typescript
export const useSelectedScene = () => {
  const context = useContext(SelectedSceneContext);
  
  if (!context) {
    throw new Error('useSelectedScene must be used within a SelectedSceneProvider');
  }
  
  return context;
};
```

### 5. Chat Panel Integration (`/src/app/projects/[id]/edit/panels/ChatPanel.tsx`)
Enhanced chat interface that considers selected scenes:

```typescript
const { selectedSceneId } = useSelectedScene();

const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (!message.trim() || isStreaming) return;
  
  // Include selected scene context in chat
  initiateChatMutation.mutate({
    projectId,
    message: message.trim(),
    sceneId: selectedSceneId, // Include scene context
  });
};
```

## Bidirectional Flow

### Timeline → Preview & Chat
1. User drags/resizes/deletes a timeline item
2. Action generates JSON-Patch via the patch factory
3. Patch is applied to the Zustand store with `applyPatch()`
4. Store updates trigger re-renders in connected components
5. Preview re-renders with updated frame bounds 
6. Server persists changes with validation

### Chat → Timeline & Preview
1. User asks to modify content in the chat
2. Selected scene context is included in the request
3. LLM processes the request and generates the appropriate JSON-Patch
4. Patch is applied through the same `applyPatch()` function
5. Timeline and Preview update simultaneously
6. All components maintain consistent state

## Benefits

1. **Single Source of Truth**: All components read from the same Zustand store
2. **Type Safety**: TypeScript ensures patches maintain proper structure
3. **Optimistic Updates**: UI updates immediately, with rollback on server errors
4. **Clean Architecture**: Components are decoupled and focus on their responsibilities
5. **Persistence**: Changes are automatically saved to the database
6. **History**: All patches are stored for potential undo/redo features

## Future Extensions

1. **Undo/Redo**: Implement time-travel using stored patches
2. **Collaborative Editing**: Patches are small and can be easily synchronized between users
3. **Advanced Scene Context**: Enhance LLM prompts with detailed scene information
4. **Scene Templates**: Create reusable scene templates through patches
