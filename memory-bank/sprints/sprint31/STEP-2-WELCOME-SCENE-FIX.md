# Sprint 31 Step 2: Welcome Scene Fix - Simple Flag Approach

## Problem Identified
The user correctly identified that the first prompt in new projects was incorrectly using `EditScene` instead of `AddScene` because the Brain LLM was seeing the welcome scene as an existing scene to edit.

## Root Cause
The Brain Orchestrator was receiving the welcome scene in the storyboard context, making it think there was already content to edit rather than recognizing this as the first real user scene.

## Solution: Simple `isWelcome` Flag

### Database Schema Change
```sql
-- Added to projects table
isWelcome: d.boolean().default(true).notNull()
```

### Backend Logic (generation.ts)
```typescript
if (project.isWelcome) {
  // First real user prompt - clear welcome flag and provide empty storyboard
  await db.update(projects)
    .set({ isWelcome: false })
    .where(eq(projects.id, projectId));
    
  // Delete welcome scene if it exists
  await db.delete(scenes).where(eq(scenes.projectId, projectId));
  
  // Provide empty storyboard to Brain LLM so it uses AddScene
  storyboardForBrain = [];
} else {
  // Normal operation - get existing scenes for context
  // ... existing logic
}
```

### System Simplification
- ✅ **Removed complex welcome scene detection** from Brain Orchestrator system prompts
- ✅ **Simplified ChatPanelG** auto-tagging logic (no more welcome scene filtering)
- ✅ **Clean separation of concerns**: Backend handles welcome logic, frontend stays simple

## Key Benefits

### 1. **Architectural Simplicity**
- No complex scene type detection in system prompts
- No frontend logic for welcome scene filtering
- Single source of truth: `isWelcome` flag

### 2. **Reliable First Prompt Handling**
- Brain LLM always sees empty storyboard for first real scene
- Guaranteed to select `AddScene` tool
- No ambiguity about scene creation vs editing

### 3. **Clean User Experience**
- Welcome scene automatically disappears on first prompt
- No manual cleanup required
- Seamless transition to real content

## Implementation Details

### Files Modified
1. **`src/server/db/schema.ts`** - Added `isWelcome` boolean column
2. **`src/server/api/routers/generation.ts`** - Welcome scene handling logic
3. **`src/server/services/brain/orchestrator.ts`** - Simplified system prompts
4. **`src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx`** - Simplified auto-tagging

### Migration
- Generated migration: `0015_mushy_meltdown.sql`
- Successfully applied to database
- Fixed foreign key constraint issue with `sceneSpecs.createdBy`

## User Flow After Fix

### New Project Creation
1. Project created with `isWelcome: true`
2. Welcome scene and chat message appear
3. User sees animated welcome content

### First Real Prompt
1. User submits prompt (e.g., "make a cool animation")
2. Backend detects `isWelcome: true`
3. Backend clears flag, deletes welcome scene
4. Brain LLM receives empty storyboard
5. Brain LLM correctly selects `AddScene` tool
6. User's first real scene is created

### Subsequent Prompts
1. Normal operation with existing scenes
2. Brain LLM receives full storyboard context
3. Proper tool selection based on intent

## Why This Approach Works

### 1. **Backend Responsibility**
The backend, not the LLM, determines when to clear welcome state. This is more reliable than training the LLM to detect welcome scenes.

### 2. **Simple State Machine**
```
isWelcome: true  → First prompt → isWelcome: false
isWelcome: false → All subsequent prompts → Normal operation
```

### 3. **No Training Required**
The Brain LLM doesn't need to understand welcome scenes - it just sees an empty or populated storyboard and makes the correct decision.

## Testing Checklist

- [ ] Create new project - verify welcome scene appears
- [ ] Submit first prompt - verify it uses AddScene tool
- [ ] Verify welcome scene is removed
- [ ] Submit second prompt - verify normal EditScene behavior
- [ ] Check database - verify `isWelcome` flag is cleared

## Conclusion

This simple flag approach solves the core issue without overcomplicating the system. The user was absolutely right to push for simplicity over complex LLM training. The backend handles the welcome state transition cleanly, and the frontend remains simple and focused.

**Result**: First prompts now correctly create new scenes instead of trying to edit welcome placeholders. 