# Brain Prompt Clarification Needed

## Issue
The brain prompt has a confusing workflow example that suggests using `analyzeImage` → `createSceneFromImage` when in reality `createSceneFromImage` handles everything internally.

## Current Confusing Section
```
4. **Analysis Then Create**: "analyze this image and create a scene from it"
   → Workflow: [{analyzeImage: "extract specs"}, {createSceneFromImage: "generate scene"}]
```

## Problem
- `createSceneFromImage` already analyzes images internally
- This workflow is unnecessary and confusing
- The async image analysis system is broken anyway

## Suggested Fix
Replace the workflow example with:
```
4. **Complex Edits**: "add the logo from the first image to scene 2"
   → Workflow: [{editSceneWithImage: "add logo to scene 2 using first image"}]
```

Or remove this example entirely since the image tools handle analysis internally.

## Clarification for analyzeImage Tool
The `analyzeImage` tool should ONLY be used when:
- User explicitly asks "what's in this image?"
- User asks "analyze this image"
- User wants image metadata/description without creating anything

It should NOT be a prerequisite for other image tools.