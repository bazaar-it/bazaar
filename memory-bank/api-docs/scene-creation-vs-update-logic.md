# Scene Creation vs. Update Logic & Name Preservation

## Overview
The system now correctly distinguishes between creating new scenes and updating existing ones, while preserving scene names on updates.

## Problem Solved
Previously, the system had overly aggressive edit detection that treated most prompts as scene updates, even when users intended to create new scenes. Additionally, scene names were being overwritten on every update.

## Solution Architecture

### 1. Explicit Intent Detection

#### New Scene Indicators (Always Create New)
- "create"
- "new scene" 
- "add scene"
- "make a scene"
- "generate"
- "build"
- "design"
- "show me"
- "i want"
- "can you create"

#### Edit Indicators (Update Existing)
- "make it"
- "change"
- "set"
- "turn"
- "modify"
- "update"
- "fix"
- "adjust"
- "improve"
- "move"
- "put"
- "place"
- "hide"
- "show"
- "bigger"
- "smaller"
- "faster"
- "slower"
- "brighter"
- "darker"
- "add to"
- "remove from"
- "replace"
- "swap"

### 2. Context-Aware Logic

```typescript
const isLikelyEdit = useCallback((msg: string): boolean => {
  // If no scenes exist, it can't be an edit
  if (scenes.length === 0) return false;
  
  // If no scene is selected, it's likely a new scene request
  if (!selectedScene) return false;
  
  // Check for explicit indicators first
  // ... (see implementation)
  
  // For ambiguous cases, use word count and context
  const words = trimmed.split(/\s+/).filter(word => word.length > 0);
  
  // Very short messages (1-3 words) with a selected scene are likely edits
  if (words.length <= 3 && selectedScene) {
    return true;
  }
  
  // Default to new scene for longer, descriptive prompts
  return false;
}, [scenes, selectedScene]);
```

### 3. Scene Name Preservation

#### Backend Changes
- Modified `upsertScene()` function to preserve scene names on updates
- Only updates `tsxCode` and `props` for existing scenes
- Tracks `existingSceneName` in edit mode

```typescript
if (sceneId) {
  // Update existing scene - preserve the original name
  await db.update(scenes)
    .set({
      tsxCode: sceneData.tsxCode,
      props: sceneData.props,
      updatedAt: new Date(),
      // Note: Intentionally NOT updating name to preserve original scene name
    })
    .where(and(eq(scenes.id, sceneId), eq(scenes.projectId, projectId)));
  return sceneId;
}
```

#### Scene Data Handling
```typescript
const sceneDataToSave = {
  name: isEditMode ? existingSceneName! : (uniqueComponentName || sceneName), // Preserve original name for edits
  order: 0,
  tsxCode: generatedCode.trim(),
  props: {
    userPrompt: isEditMode ? editInstruction : userPrompt,
    isEdit: isEditMode,
  },
};
```

### 4. User Feedback

#### Completion Messages
- **New Scene**: "Scene generated: [Title] ✅"
- **Scene Update**: "Scene updated ✅"

#### Status Messages
- **New Scene**: "Generating scene..."
- **Scene Update**: "Updating scene..."

## Expected Behavior

### Creating New Scenes
```
User: "create a scene showing a lunar eclipse"
→ ➕ New scene created
→ 📌 Title set to "Lunar Eclipse"
→ 💬 "Scene generated: Lunar Eclipse ✅"
```

### Updating Existing Scenes
```
User: "make the moon redder" (with scene selected)
→ ✏️ Current scene updated
→ 🛑 Title remains unchanged
→ 💬 "Scene updated ✅"
```

## Implementation Details

### Frontend (ChatPanelG.tsx)
- Improved `isLikelyEdit()` function with explicit indicators
- Context-aware decision making based on selected scene
- Proper completion message handling

### Backend (generation.ts)
- Enhanced edit detection with `@scene(id)` pattern matching
- Scene name preservation in `upsertScene()` function
- Proper tracking of edit vs. create operations

## Benefits
1. **Predictable Behavior**: Users can reliably create new scenes or edit existing ones
2. **Stable Scene Names**: Once created, scene titles don't change unexpectedly
3. **Clear Feedback**: Appropriate system messages for each operation type
4. **Better UX**: Intuitive prompt handling that matches user expectations 