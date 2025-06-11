# CRITICAL BUG: Scene Numbering Mismatch

## Issue
When user says "make scene 1 2 seconds long", the system updates Scene 2 instead. This is causing major confusion.

## Root Cause
Scenes are ordered by the `order` field in the database, NOT by creation order. The brain orchestrator builds scene numbering like this:

```typescript
storyboardInfo = storyboardSoFar.map((scene, i) => 
  `Scene ${i + 1}: "${scene.name}" (ID: ${scene.id})`
).join('\n');
```

Where `storyboardSoFar` is ordered by the `order` field:
```typescript
orderBy: [scenes.order]
```

## The Problem
If scene `order` values are incorrect (e.g., first created scene has order=1, second has order=0), then:
- Database returns them as [Scene2, Scene1] due to order field
- Brain numbers them as Scene 1 (actually Scene2) and Scene 2 (actually Scene1)
- User says "edit scene 1" thinking of the first scene they created
- Brain selects what it thinks is "Scene 1" (the first in the ordered list)
- But this is actually their second created scene!

## Quick Fix
We need to ensure the brain's scene numbering matches what the user expects. Options:

### Option 1: Fix Scene Order Values (Recommended)
Ensure `order` values match creation order when scenes are created.

### Option 2: Show Scene Names in UI
Instead of "Scene 1, Scene 2", show actual scene names so there's no ambiguity.

### Option 3: Add Debug Info
Log the scene mapping so we can verify:
```
[Brain] Scene mapping:
  Scene 1: "Welcome Animation" (order: 0, created: first)
  Scene 2: "Product Demo" (order: 1, created: second)
```

## Immediate Action Needed
Check the actual `order` values in the database for the affected project to confirm this is the issue.