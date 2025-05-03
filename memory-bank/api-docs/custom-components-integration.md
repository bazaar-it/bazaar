# Custom Components Integration

## Overview
The Custom Components feature allows users to generate custom Remotion components via LLM and insert them directly into their video timeline. This document explains how these components are generated, displayed, and inserted into videos.

## Architecture

### Component Generation Pipeline
1. **Generation**: User requests a custom component via chat
2. **Processing**: 
   - LLM generates TSX/JS code for the component
   - Code undergoes post-processing to ensure all required imports are present
   - Compiled component is uploaded to R2 storage
3. **Listing**: Components appear in the Custom Components sidebar section
4. **Insertion**: Users can insert ready components directly into their video timeline

### Data Flow
```
User Request → LLM → Generate Code → Post-process → R2 Storage → Sidebar Display → Timeline Insertion → Live Preview
```

## Core Components

### 1. Custom Component Generation (`generateComponentCode.ts`)
- Uses OpenAI to generate component code based on user description
- Automatically adds missing Remotion imports through post-processing
- Returns component metadata and code for storage

### 2. Custom Components Sidebar (`Sidebar.tsx`)
- Displays all user-owned components across all projects
- Shows real-time status using `<CustomComponentStatus />` component
- Handles insertion of components into the video timeline

### 3. Timeline Integration
- Uses the Zustand videoState store to maintain UI reactivity
- Applies JSON patch operations to update the video state
- Components appear immediately in the Preview panel

## Component Insertion Flow

When a user clicks on a ready custom component:

1. **UI Action**: User clicks on a component with "ready" status
2. **State Preparation**: 
   - Get current video state via `getCurrentProps()`
   - Generate a UUID for the new scene
   - Determine insertion position (currently end of timeline)
3. **Patch Creation**: Create JSON patch operations:
   - Add a new scene with type "custom"
   - Set component source URL and name
   - Adjust video duration if needed
4. **State Update**: Apply patch via `applyVideoPatch(projectId, patch)`
5. **UI Update**: The Preview panel reactively updates to show the new component

## JSON Patch Format

```typescript
const patch: Operation[] = [
  {
    op: "add",
    path: `/scenes/-`,
    value: {
      id: newSceneId,
      type: "custom",
      start: insertPosition,
      duration: 60, // Default duration in frames
      data: {
        src: job.outputUrl, // URL to the R2-stored component
        name: job.effect    // Component name/description
      }
    }
  },
  {
    op: "replace",
    path: "/meta/duration",
    value: Math.max(currentProps.meta.duration, insertPosition + 60)
  }
];
```

## Technical Details

### Custom Component Scene Type
Custom components are added as scenes with:
- `type: "custom"`
- `data.src`: URL to the R2-stored JavaScript component
- `data.name`: Component description/name

### State Management
The implementation follows the project's Zustand-based state management pattern:
1. Changes to video are made via `applyPatch` method
2. All updates happen through JSON Patch operations
3. UI components react to state changes automatically

## Future Improvements
- Add drag-and-drop positioning of components
- Allow adjusting component duration
- Add preview functionality before insertion 
- Support component parameters/props customization
