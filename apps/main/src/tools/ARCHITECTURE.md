# Tools Architecture - Scene Management System

## Overview

This directory contains a completely restructured and modularized scene management system. The new architecture separates concerns into distinct tools and services, making the codebase more maintainable, testable, and easier to understand.

## Architecture

```
src/tools/
├── types.ts                    # Shared type definitions
├── sceneBuilderNEW.ts         # Main orchestrator wrapper
├── index.ts                   # Public exports
├── add/                       # Scene creation
│   ├── add.ts                 # Main ADD tool
│   └── add_helpers/           # ADD tool services
│       ├── layoutGeneratorNEW.ts
│       ├── CodeGeneratorNEW.ts
│       └── ImageToCodeGeneratorNEW.ts
├── edit/                      # Scene modification
│   ├── edit.ts                # Main EDIT tool
│   └── edit_helpers/          # EDIT tool services
│       ├── BaseEditorNEW.ts
│       └── CreativeEditorNEW.ts
└── delete/                    # Scene removal
    └── delete.ts              # Main DELETE tool
```

## Key Principles

### 1. Unified Input/Output Types
All tools share the same base input/output structure:
- `BaseToolInput` - Common fields for all tools
- `BaseToolOutput` - Standardized response format
- Tool-specific extensions for specialized needs

### 2. Modular Services
Each tool is composed of focused services:
- **Layout Generator** - Converts prompts to JSON specifications
- **Code Generator** - Converts JSON to React/Remotion code
- **Image-to-Code Generator** - Direct image-to-code conversion
- **Creative Editor** - Handles scene modifications

### 3. Consistent Error Handling
All tools follow the same error handling pattern:
- Graceful degradation
- Meaningful error messages
- Debug information preservation
- Fallback responses

## Usage

### Basic Usage

```typescript
import { sceneBuilder } from "~/tools";

// Add a new scene
const addResult = await sceneBuilder.addScene({
  userPrompt: "Create a title scene with blue background",
  projectId: "project-123",
  userId: "user-456",
});

// Edit an existing scene
const editResult = await sceneBuilder.editScene({
  userPrompt: "Change the background to red",
  projectId: "project-123",
  sceneId: "scene-789",
  existingCode: "...",
  editType: "creative",
});

// Delete a scene
const deleteResult = await sceneBuilder.deleteScene({
  userPrompt: "Remove this scene",
  projectId: "project-123",
  sceneId: "scene-789",
  confirmDeletion: true,
});
```

## Benefits

### 1. **Maintainability**
- Clear separation of concerns
- Focused, single-responsibility classes
- Easy to locate and modify specific functionality

### 2. **Testability**
- Each service can be tested independently
- Mocked dependencies for unit testing
- Predictable input/output contracts

### 3. **Type Safety**
- Comprehensive TypeScript interfaces
- Compile-time error detection
- Better IDE support and autocomplete

## Migration from Old System

The new system maintains all core functionality while providing a cleaner, more modular interface. All existing features are preserved but organized in a more maintainable structure. 