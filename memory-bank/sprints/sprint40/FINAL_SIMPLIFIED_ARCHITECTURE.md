# Final Simplified Architecture

## Overview
After iterating on the design, we've achieved a clean, simple architecture that balances modularity with simplicity.

## Key Simplifications

### 1. Just 3 Tools
```typescript
addScene    // Create scenes (text or image)
editScene   // Edit scenes (surgical, creative, or fix)
deleteScene // Delete scenes
```

### 2. Simplified Edit Types
Instead of surgical/creative/structural, we now have:
- **surgical**: Minimal targeted changes
- **creative**: Any bigger changes (visual or structural)
- **fix**: Error corrections

### 3. All Editors Support Images
No separate ImageBasedEditor - all edit services handle both text and image inputs.

## Architecture

```
src/server/services/scene/
├── scene.service.ts              # Coordinator (3 methods)
├── add/
│   ├── LayoutGenerator.ts        # Text → JSON layout
│   ├── CodeGenerator.ts          # JSON → TSX code
│   └── ImageToCodeGenerator.ts   # Image → TSX code
├── edit/
│   ├── BaseEditor.ts             # Shared image/text logic
│   ├── SurgicalEditor.ts         # Minimal changes (text/image)
│   ├── CreativeEditor.ts         # Bigger changes (text/image)
│   └── ErrorFixer.ts             # Fix errors
└── delete/
    └── SceneDeleter.ts           # Simple deletion
```

## Models Used (optimal-new pack)

### Creation:
- `layoutGenerator` - Claude Sonnet-4 (structured JSON)
- `codeGenerator` - Claude Sonnet-4 (React code)
- `createSceneFromImage` - GPT-4o (vision)

### Editing:
- `directCodeEditor.surgical` - GPT-4.1-mini (fast, cheap)
- `directCodeEditor.creative` - Claude Sonnet-4 (creative)
- `editSceneWithImage` - GPT-4o (vision)
- `fixBrokenScene` - GPT-4.1-mini (precise fixes)

## Usage Examples

### Creating Scenes
```typescript
// Text prompt
await sceneService.addScene({
  projectId: "abc",
  prompt: "Create a blue gradient background"
});

// From image
await sceneService.addScene({
  projectId: "abc", 
  prompt: "Create scene from this design",
  imageUrls: ["https://..."]
});
```

### Editing Scenes
```typescript
// Minimal change
await sceneService.editScene({
  sceneId: "123",
  prompt: "Change text to red",
  editType: "surgical"
});

// Bigger change (visual or structural)
await sceneService.editScene({
  sceneId: "123",
  prompt: "Make it more dynamic with animations",
  editType: "creative"
});

// With image reference (works with any editType)
await sceneService.editScene({
  sceneId: "123",
  prompt: "Match this style",
  editType: "creative",
  imageUrls: ["https://..."]
});

// Fix error
await sceneService.editScene({
  sceneId: "123",
  prompt: "Fix: Duplicate export default",
  editType: "fix"
});

// Just duration
await sceneService.editScene({
  sceneId: "123",
  duration: 300  // No AI needed
});
```

## Benefits

1. **Simple Mental Model**: Just 3 operations (add/edit/delete)
2. **Flexible Editing**: 2 main edit types cover all use cases
3. **Unified Image Support**: Any edit can use images
4. **Smart Model Selection**: Right model for each task
5. **Zero Transformations**: All use DB field names
6. **Modular but Simple**: Clean separation without over-engineering

## Next Steps

1. Hook up simplified tools to orchestrator
2. Test complete flow
3. Remove old tool implementations
4. Update frontend to use simplified interface