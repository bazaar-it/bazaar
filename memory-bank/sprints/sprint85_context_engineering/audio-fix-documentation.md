# Audio Component Fix Documentation

## Issue Fixed: Audio Constructor Error

### Problem
When opening the audio panel, the video preview would break with the error:
```
TypeError: Failed to construct 'Audio': Please use the 'new' operator, this DOM object constructor cannot be called as a function.
```

### Root Cause
There was a naming conflict between:
1. Remotion's `Audio` component (a React component for adding audio tracks to videos)
2. The browser's native `Audio` constructor (used to create HTML audio elements)

When Remotion components were loaded into the window object, the native `Audio` constructor was being overwritten by Remotion's `Audio` component. This caused issues when code tried to use `new Audio()` to create audio elements.

### Solution Implemented

#### 1. GlobalDependencyProvider.tsx
- Added preservation of the native `Audio` constructor as `window.NativeAudio` before Remotion components are loaded
- This prevents the conflict by saving a reference to the native constructor

#### 2. AudioPanel.tsx
- Updated to use `window.NativeAudio` when creating audio elements for duration detection
- Added fallback to native `Audio` if needed

#### 3. MainComposition.tsx & PreviewPanelG.tsx
- Added `NativeAudio` to the window proxy that provides the execution context for scenes
- Ensured both single and multi-scene compositions have access to `NativeAudio`

### Result
- The Remotion `Audio` component remains available for adding audio tracks to videos
- The native `Audio` constructor is preserved as `NativeAudio` for creating audio elements
- Both can coexist without conflicts in the scene execution environment
- Users can now open the audio panel without breaking the video preview

## Context Engineering System Documentation

### Sprint 85: Revolutionary AI Video Generation Architecture

We've designed a complete context engineering system that transforms how AI video generation works. Instead of having 7+ specialized tools/agents, we now have:

1. **Static Context System**: Modular markdown files for different capabilities (typography, particles, platforms)
2. **Dynamic Context Gathering**: Real-time style gathering for "in the style of X" requests

### Key Innovation: Dynamic Style References

When a user says "Create text in the style of Apple", the system:
1. Detects the style reference
2. Searches for Apple's design system information
3. Extracts colors, fonts, animation principles
4. Merges with static typography context
5. Generates with complete Apple-accurate styling

This allows infinite creative possibilities without code changes. Users can reference ANY brand, era, or style and get accurate results.

See `/memory-bank/sprints/sprint85_context_engineering/` for complete documentation.