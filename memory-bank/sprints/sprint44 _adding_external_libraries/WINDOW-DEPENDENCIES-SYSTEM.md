# Window Dependencies System Documentation

## Overview

The Bazaar-Vid dynamic code compilation system relies on making dependencies available on the global `window` object so that AI-generated code can access them at runtime. This document explains exactly how this works.

## Current Implementation

### 1. Type Declarations (`global.d.ts`)

**File**: `/src/lib/types/shared/global.d.ts`

```typescript
import type React from 'react';
import type * as Remotion from 'remotion';

declare global {
  interface Window {
    React: typeof React;
    Remotion: typeof Remotion;
    react?: typeof React;
    remotion?: typeof Remotion;
    __REMOTION_COMPONENT?: React.ComponentType<any>;
  }
}

export {};
```

**⚠️ IMPORTANT**: This file only tells TypeScript "these things exist on window" - it doesn't actually PUT them there.

### 2. Actual Implementation (`GlobalDependencyProvider.tsx`)

**File**: `/src/components/GlobalDependencyProvider.tsx`

```typescript
"use client";

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import * as Remotion from 'remotion';

export function GlobalDependencyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).React = React;
      (window as any).ReactDOM = ReactDOM;
      (window as any).Remotion = Remotion;
      console.log('React, ReactDOM, Remotion exposed on window object.');
    }
  }, []);

  return <>{children}</>;
}
```

**This is where the magic happens** - the actual assignment to the window object.

### 3. Integration in Root Layout

**File**: `/src/app/layout.tsx` (line 142)

```tsx
<GlobalDependencyProvider>
  <AnalyticsProvider>
    <ErrorBoundary>
      {/* Rest of app */}
    </ErrorBoundary>
  </AnalyticsProvider>
</GlobalDependencyProvider>
```

The GlobalDependencyProvider wraps the entire app, ensuring window dependencies are available before any AI-generated code runs.

## How AI Uses Window Dependencies

### Current Usage Pattern

AI-generated code in `/src/hooks/useRemoteComponent.tsx` and `/src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx` uses:

```typescript
// AI generates code like this:
const { AbsoluteFill, useCurrentFrame, useVideoConfig } = window.Remotion;

function MyScene() {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'blue' }}>
      <div>Frame: {frame}</div>
    </AbsoluteFill>
  );
}
```

This works because:
1. `GlobalDependencyProvider` puts `Remotion` on window
2. AI destructures what it needs from `window.Remotion`
3. Dynamic compilation (via Sucrase) transforms this into valid JavaScript

## Adding New Dependencies (Step-by-Step)

### Example: Adding Three.js Support

#### Step 1: Install the Library
```bash
npm install three @types/three
```

#### Step 2: Update GlobalDependencyProvider
```typescript
// src/components/GlobalDependencyProvider.tsx
import * as Three from 'three';

export function GlobalDependencyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Existing dependencies
      (window as any).React = React;
      (window as any).ReactDOM = ReactDOM;
      (window as any).Remotion = Remotion;
      
      // NEW: Add Three.js
      (window as any).Three = Three;
      
      console.log('All dependencies exposed on window object.');
    }
  }, []);

  return <>{children}</>;
}
```

#### Step 3: Update Type Declarations
```typescript
// src/lib/types/shared/global.d.ts
import type React from 'react';
import type * as Remotion from 'remotion';
import type * as Three from 'three';

declare global {
  interface Window {
    React: typeof React;
    Remotion: typeof Remotion;
    Three: typeof Three;  // ADD THIS
    
    // Legacy support
    react?: typeof React;
    remotion?: typeof Remotion;
    __REMOTION_COMPONENT?: React.ComponentType<any>;
  }
}

export {};
```

#### Step 4: Update AI Prompts
In your code generation prompts, inform the AI:

```typescript
const SCENE_CREATION_PROMPT = `
Available dependencies on window object:
- React: window.React (React hooks, components)
- Remotion: window.Remotion (AbsoluteFill, useCurrentFrame, etc.)
- Three.js: window.Three (3D graphics, cameras, geometries, materials)

Example usage:
const { useEffect, useRef } = window.React;
const { AbsoluteFill } = window.Remotion;

function ThreeJSScene() {
  const mountRef = useRef();
  
  useEffect(() => {
    const scene = new window.Three.Scene();
    const camera = new window.Three.PerspectiveCamera(75, 16/9, 0.1, 1000);
    // ... rest of Three.js code
  }, []);
  
  return <AbsoluteFill><div ref={mountRef} /></AbsoluteFill>;
}
`;
```

## Bundle Size Considerations

### Current Approach: All Dependencies Upfront
- **Pros**: Simple, everything always available
- **Cons**: Every user downloads every library, even if unused

### Alternative: Dynamic Loading System

For large libraries, consider lazy loading:

```typescript
// src/components/GlobalDependencyProvider.tsx
const LIBRARY_LOADERS = {
  three: () => import('three'),
  gsap: () => import('gsap'),
  lottie: () => import('lottie-web'),
};

export function GlobalDependencyProvider({ children }: { children: React.ReactNode }) {
  const [loadedLibraries, setLoadedLibraries] = useState<Set<string>>(new Set());

  const loadLibrary = async (libraryName: keyof typeof LIBRARY_LOADERS) => {
    if (loadedLibraries.has(libraryName)) return;

    try {
      const library = await LIBRARY_LOADERS[libraryName]();
      (window as any)[libraryName] = library.default || library;
      setLoadedLibraries(prev => new Set(prev).add(libraryName));
      console.log(`${libraryName} loaded and exposed on window`);
    } catch (error) {
      console.error(`Failed to load ${libraryName}:`, error);
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Core dependencies (always loaded)
      (window as any).React = React;
      (window as any).Remotion = Remotion;
      
      // Expose loader for dynamic loading
      (window as any).loadLibrary = loadLibrary;
    }
  }, []);

  return <>{children}</>;
}
```

Then AI can use:
```javascript
// In AI-generated code
useEffect(() => {
  window.loadLibrary?.('three').then(() => {
    // Use Three.js here
    const scene = new window.Three.Scene();
  });
}, []);
```

## Security Considerations

### Safe Practices
1. **Only expose well-known libraries**: Don't expose internal app state
2. **Version control**: Pin library versions to avoid breaking changes
3. **Namespace properly**: Use clear, non-conflicting names

### What NOT to expose
```typescript
// DON'T DO THIS - security risk
(window as any).fetch = fetch;  // Could be overridden
(window as any).localStorage = localStorage;  // Security risk
(window as any).process = process;  // Node.js internals
```

## Testing Dependencies

To verify dependencies are properly exposed:

```typescript
// Add to GlobalDependencyProvider for debugging
useEffect(() => {
  if (typeof window !== 'undefined') {
    // ... existing code ...
    
    // Debug: Log what's available
    console.log('Window dependencies available:', {
      React: !!window.React,
      Remotion: !!window.Remotion,
      Three: !!(window as any).Three,
    });
  }
}, []);
```

## Real-World Usage in Codebase

### PreviewPanelG.tsx
The preview panel compiles AI-generated scenes that use window dependencies:

```typescript
// Line 79-86 in PreviewPanelG.tsx
const testCompositeCode = `
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, random } = window.Remotion;

${cleanSceneCode}

export default function TestComponent() {
  return <${componentName} />;
}`;
```

### Dynamic Import in useRemoteComponent.tsx
Remote components loaded via ESM also rely on window dependencies:

```typescript
// Line 77 in useRemoteComponent.tsx
const module = await import(/* @vite-ignore */ componentUrl);
```

The imported module code uses `window.React` and `window.Remotion` because the AI was instructed to generate code this way.

## Conclusion

The window dependencies system is a three-part implementation:

1. **Type declarations** tell TypeScript what exists
2. **GlobalDependencyProvider** actually puts dependencies on window
3. **AI prompts** inform the AI how to use them

This enables dynamic code compilation and execution of AI-generated React/Remotion components at runtime.