# Adding Third-Party Libraries Guide

## Quick Reference

To add a third-party library for AI code generation, you need to modify **3 files**:

1. `GlobalDependencyProvider.tsx` - Actually put the library on window
2. `global.d.ts` - Tell TypeScript it exists
3. Your AI prompts - Tell the AI how to use it

## Step-by-Step Examples

### Example 1: Adding GSAP (Animation Library)

#### 1. Install the library
```bash
npm install gsap
npm install --save-dev @types/gsap  # If types available
```

#### 2. Update GlobalDependencyProvider.tsx
```typescript
// src/components/GlobalDependencyProvider.tsx
"use client";

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import * as Remotion from 'remotion';
import { gsap } from 'gsap';  // ADD THIS IMPORT

export function GlobalDependencyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Existing dependencies
      (window as any).React = React;
      (window as any).ReactDOM = ReactDOM;
      (window as any).Remotion = Remotion;
      
      // NEW: Add GSAP
      (window as any).gsap = gsap;
      
      console.log('React, ReactDOM, Remotion, GSAP exposed on window object.');
    }
  }, []);

  return <>{children}</>;
}
```

#### 3. Update global.d.ts
```typescript
// src/lib/types/shared/global.d.ts
import type React from 'react';
import type * as Remotion from 'remotion';
import type { gsap } from 'gsap';  // ADD THIS IMPORT

declare global {
  interface Window {
    React: typeof React;
    Remotion: typeof Remotion;
    gsap: typeof gsap;  // ADD THIS LINE
    
    // Legacy support
    react?: typeof React;
    remotion?: typeof Remotion;
    __REMOTION_COMPONENT?: React.ComponentType<any>;
  }
}

export {};
```

#### 4. Update AI prompts
```typescript
// In your prompt configuration
const SCENE_CREATION_PROMPT = `
You can create animations using these libraries:

**Remotion (window.Remotion):**
- AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring

**GSAP (window.gsap):**
- gsap.to(), gsap.from(), gsap.timeline(), gsap.set()
- For smooth animations and tweening

Example GSAP usage:
\`\`\`jsx
const { useEffect, useRef } = window.React;
const { AbsoluteFill } = window.Remotion;

function GSAPScene() {
  const boxRef = useRef();
  
  useEffect(() => {
    if (boxRef.current) {
      window.gsap.to(boxRef.current, {
        x: 100,
        rotation: 360,
        duration: 2,
        repeat: -1,
        yoyo: true
      });
    }
  }, []);
  
  return (
    <AbsoluteFill>
      <div ref={boxRef} style={{ width: 100, height: 100, background: 'red' }} />
    </AbsoluteFill>
  );
}
\`\`\`
`;
```

### Example 2: Adding Three.js (3D Graphics)

#### 1. Install Three.js
```bash
npm install three
npm install --save-dev @types/three
```

#### 2. Update GlobalDependencyProvider.tsx
```typescript
import * as THREE from 'three';

// In useEffect:
(window as any).THREE = THREE;
```

#### 3. Update global.d.ts
```typescript
import type * as THREE from 'three';

declare global {
  interface Window {
    // ... existing types
    THREE: typeof THREE;
  }
}
```

#### 4. AI can now generate 3D scenes:
```jsx
function ThreeJSScene() {
  const { useEffect, useRef } = window.React;
  const { AbsoluteFill } = window.Remotion;
  
  const mountRef = useRef();
  
  useEffect(() => {
    if (!mountRef.current) return;
    
    // Create scene
    const scene = new window.THREE.Scene();
    const camera = new window.THREE.PerspectiveCamera(75, 16/9, 0.1, 1000);
    const renderer = new window.THREE.WebGLRenderer({ alpha: true });
    
    // Create cube
    const geometry = new window.THREE.BoxGeometry();
    const material = new window.THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new window.THREE.Mesh(geometry, material);
    
    scene.add(cube);
    camera.position.z = 5;
    
    renderer.setSize(1280, 720);
    mountRef.current.appendChild(renderer.domElement);
    
    // Animation loop
    const animate = () => {
      cube.rotation.x += 0.01;
      cube.rotation.y += 0.01;
      renderer.render(scene, camera);
      requestAnimationFrame(animate);
    };
    animate();
    
    // Cleanup
    return () => {
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);
  
  return <AbsoluteFill><div ref={mountRef} /></AbsoluteFill>;
}
```

## Advanced: Dynamic Loading System

For large libraries, implement lazy loading to reduce initial bundle size:

### Enhanced GlobalDependencyProvider.tsx
```typescript
"use client";

import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom';
import * as Remotion from 'remotion';

// Define library loaders
const LIBRARY_LOADERS = {
  three: () => import('three').then(mod => mod.default || mod),
  gsap: () => import('gsap').then(mod => mod.gsap || mod.default),
  lottie: () => import('lottie-web').then(mod => mod.default),
  p5: () => import('p5').then(mod => mod.default),
  fabric: () => import('fabric').then(mod => mod.fabric),
} as const;

type LibraryName = keyof typeof LIBRARY_LOADERS;

export function GlobalDependencyProvider({ children }: { children: React.ReactNode }) {
  const [loadedLibraries, setLoadedLibraries] = useState<Set<LibraryName>>(new Set());
  const [loadingLibraries, setLoadingLibraries] = useState<Set<LibraryName>>(new Set());

  const loadLibrary = async (libraryName: LibraryName): Promise<void> => {
    // Already loaded
    if (loadedLibraries.has(libraryName)) {
      return Promise.resolve();
    }

    // Currently loading
    if (loadingLibraries.has(libraryName)) {
      // Return a promise that resolves when loading is complete
      return new Promise((resolve) => {
        const checkLoaded = () => {
          if (loadedLibraries.has(libraryName)) {
            resolve();
          } else {
            setTimeout(checkLoaded, 100);
          }
        };
        checkLoaded();
      });
    }

    // Start loading
    setLoadingLibraries(prev => new Set(prev).add(libraryName));

    try {
      const library = await LIBRARY_LOADERS[libraryName]();
      
      // Assign to window with proper naming
      const windowName = libraryName === 'three' ? 'THREE' : 
                        libraryName === 'gsap' ? 'gsap' :
                        libraryName === 'lottie' ? 'lottie' :
                        libraryName === 'p5' ? 'p5' :
                        libraryName === 'fabric' ? 'fabric' : libraryName;
      
      (window as any)[windowName] = library;
      
      setLoadedLibraries(prev => new Set(prev).add(libraryName));
      console.log(`✅ ${libraryName} loaded and exposed as window.${windowName}`);
    } catch (error) {
      console.error(`❌ Failed to load ${libraryName}:`, error);
      throw error;
    } finally {
      setLoadingLibraries(prev => {
        const newSet = new Set(prev);
        newSet.delete(libraryName);
        return newSet;
      });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Core dependencies (always loaded)
      (window as any).React = React;
      (window as any).ReactDOM = ReactDOM;
      (window as any).Remotion = Remotion;
      
      // Expose library loader
      (window as any).loadLibrary = loadLibrary;
      
      // Expose library status checkers
      (window as any).isLibraryLoaded = (name: LibraryName) => loadedLibraries.has(name);
      (window as any).isLibraryLoading = (name: LibraryName) => loadingLibraries.has(name);
      
      console.log('Core dependencies and library loader exposed on window');
    }
  }, [loadedLibraries, loadingLibraries]);

  return <>{children}</>;
}
```

### Enhanced global.d.ts
```typescript
import type React from 'react';
import type * as Remotion from 'remotion';
import type * as THREE from 'three';
import type { gsap } from 'gsap';

declare global {
  interface Window {
    // Core dependencies (always available)
    React: typeof React;
    Remotion: typeof Remotion;
    
    // Optional dependencies (loaded on demand)
    THREE?: typeof THREE;
    gsap?: typeof gsap;
    lottie?: any;
    p5?: any;
    fabric?: any;
    
    // Library management functions
    loadLibrary?: (name: 'three' | 'gsap' | 'lottie' | 'p5' | 'fabric') => Promise<void>;
    isLibraryLoaded?: (name: string) => boolean;
    isLibraryLoading?: (name: string) => boolean;
    
    // Legacy support
    react?: typeof React;
    remotion?: typeof Remotion;
    __REMOTION_COMPONENT?: React.ComponentType<any>;
  }
}

export {};
```

### AI Usage with Dynamic Loading
```jsx
function DynamicThreeScene() {
  const { useEffect, useRef, useState } = window.React;
  const { AbsoluteFill } = window.Remotion;
  
  const mountRef = useRef();
  const [isReady, setIsReady] = useState(false);
  
  useEffect(() => {
    // Load Three.js dynamically
    window.loadLibrary?.('three').then(() => {
      setIsReady(true);
    }).catch(error => {
      console.error('Failed to load Three.js:', error);
    });
  }, []);
  
  useEffect(() => {
    if (!isReady || !window.THREE || !mountRef.current) return;
    
    // Now we can safely use Three.js
    const scene = new window.THREE.Scene();
    // ... rest of Three.js setup
  }, [isReady]);
  
  if (!isReady) {
    return (
      <AbsoluteFill style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading 3D library...</div>
      </AbsoluteFill>
    );
  }
  
  return <AbsoluteFill><div ref={mountRef} /></AbsoluteFill>;
}
```

## Bundle Size Impact

### Current System (All Libraries Loaded)
- **Remotion**: ~500KB
- **React**: ~130KB  
- **THREE.js**: ~600KB
- **GSAP**: ~100KB
- **Total**: ~1.3MB additional bundle size

### Dynamic Loading System
- **Initial**: Core dependencies only (~630KB)
- **On-demand**: Libraries loaded when needed
- **Better UX**: Faster initial page load

## Best Practices

### 1. Namespace Consistently
```typescript
// Good - clear, consistent naming
(window as any).THREE = THREE;
(window as any).gsap = gsap;
(window as any).lottie = lottie;

// Bad - inconsistent naming
(window as any).three = THREE;
(window as any).GSAP = gsap;
(window as any).LottieWeb = lottie;
```

### 2. Handle Loading States
```jsx
// AI should generate loading states for dynamic libraries
function SmartScene() {
  const [libraryReady, setLibraryReady] = useState(false);
  
  useEffect(() => {
    if (window.isLibraryLoaded?.('three')) {
      setLibraryReady(true);
    } else {
      window.loadLibrary?.('three').then(() => setLibraryReady(true));
    }
  }, []);
  
  if (!libraryReady) {
    return <div>Loading 3D library...</div>;
  }
  
  // Use library here
}
```

### 3. Error Boundaries
```jsx
// Wrap dynamic library usage in error boundaries
function SafeThreeScene() {
  try {
    if (!window.THREE) {
      throw new Error('THREE.js not loaded');
    }
    
    // Use THREE.js
    return <ThreeJSScene />;
  } catch (error) {
    return <div>3D scene unavailable: {error.message}</div>;
  }
}
```

## Testing Your Implementation

Add this to your GlobalDependencyProvider to verify everything works:

```typescript
useEffect(() => {
  if (typeof window !== 'undefined') {
    // ... existing code ...
    
    // Debug logging
    console.log('🔍 Window dependencies check:', {
      React: !!window.React,
      Remotion: !!window.Remotion,
      THREE: !!(window as any).THREE,
      gsap: !!(window as any).gsap,
      loadLibrary: typeof (window as any).loadLibrary === 'function',
    });
  }
}, []);
```

This should help you add any third-party library to your AI code generation system!