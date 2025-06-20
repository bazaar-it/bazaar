# Heroicons + Remotion Shapes Implementation Plan

## Overview
Adding Heroicons and Remotion Shapes to the window object for AI-generated scenes to replace emojis with professional graphics.

## Step-by-Step Implementation

### Step 1: Update GlobalDependencyProvider.tsx

```typescript
// src/components/GlobalDependencyProvider.tsx
"use client";

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import * as Remotion from 'remotion';
import * as HeroiconsSolid from '@heroicons/react/24/solid';
import * as HeroiconsOutline from '@heroicons/react/24/outline';
import * as RemotionShapes from '@remotion/shapes';

export function GlobalDependencyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).React = React;
      (window as any).ReactDOM = ReactDOM;
      (window as any).Remotion = Remotion;
      
      // NEW: Add Heroicons
      (window as any).HeroiconsSolid = HeroiconsSolid;
      (window as any).HeroiconsOutline = HeroiconsOutline;
      
      // NEW: Add Remotion Shapes
      (window as any).RemotionShapes = RemotionShapes;
      
      console.log('React, ReactDOM, Remotion, Heroicons, and RemotionShapes exposed on window object.');
    }
  }, []);

  return <>{children}</>;
}
```

### Step 2: Update global.d.ts

```typescript
// src/lib/types/shared/global.d.ts
import type React from 'react';
import type * as Remotion from 'remotion';
import type * as HeroiconsSolid from '@heroicons/react/24/solid';
import type * as HeroiconsOutline from '@heroicons/react/24/outline';
import type * as RemotionShapes from '@remotion/shapes';

declare global {
  interface Window {
    React: typeof React;
    Remotion: typeof Remotion;
    HeroiconsSolid: typeof HeroiconsSolid;
    HeroiconsOutline: typeof HeroiconsOutline;
    RemotionShapes: typeof RemotionShapes;
    react?: typeof React;
    remotion?: typeof Remotion;
    __REMOTION_COMPONENT?: React.ComponentType<any>;
  }
}

export {};
```

### Step 3: Update AI Prompts

Need to update the code generation prompts to inform AI about new dependencies. Key files to update:

1. **Code generator prompt configuration**
2. **System prompts for scene generation**
3. **Few-shot examples**

Add this to prompts:

```typescript
const ENHANCED_DEPENDENCIES = `
Available dependencies on window:

1. **Remotion Shapes** (window.RemotionShapes):
   - Circle, Triangle, Star, Rect, Ellipse
   - Perfect for geometric shapes instead of emojis
   - Example: const { Circle, Star } = window.RemotionShapes;

2. **Heroicons** (window.HeroiconsSolid, window.HeroiconsOutline):
   - Professional SVG icons in two styles
   - Common: CheckIcon, XMarkIcon, StarIcon, HeartIcon, PlayIcon
   - Example: const { CheckIcon, StarIcon } = window.HeroiconsSolid;

EXAMPLES:

// Instead of emoji stars
const { Star } = window.RemotionShapes;
<Star points={5} innerRadius={20} outerRadius={40} fill="gold" />

// Instead of ✅ ❌
const { CheckIcon, XMarkIcon } = window.HeroiconsSolid;
<CheckIcon style={{ width: 48, height: 48, color: '#10b981' }} />
<XMarkIcon style={{ width: 48, height: 48, color: '#ef4444' }} />

// Animated shape
const { Circle } = window.RemotionShapes;
<Circle 
  r={interpolate(frame, [0, 30], [0, 50])} 
  fill="#3b82f6" 
/>
`;
```

### Step 4: Test Implementation

Create a test scene to verify everything works:

```jsx
const { AbsoluteFill, useCurrentFrame, interpolate, spring } = window.Remotion;
const { Circle, Star, Triangle } = window.RemotionShapes;
const { CheckIcon, StarIcon, HeartIcon } = window.HeroiconsSolid;

export default function TestLibraries() {
  const frame = useCurrentFrame();
  
  const scale = spring({
    frame,
    fps: 30,
    config: { damping: 10 }
  });
  
  return (
    <AbsoluteFill style={{
      backgroundColor: '#1e293b',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '40px'
    }}>
      {/* Remotion Shapes */}
      <Circle r={50} fill="#3b82f6" />
      <Star 
        points={5} 
        innerRadius={25} 
        outerRadius={50} 
        fill="#fbbf24"
        style={{ transform: `scale(${scale})` }}
      />
      <Triangle length={80} direction="up" fill="#10b981" />
      
      {/* Heroicons */}
      <CheckIcon style={{ width: 64, height: 64, color: '#10b981' }} />
      <StarIcon style={{ width: 64, height: 64, color: '#fbbf24' }} />
      <HeartIcon style={{ width: 64, height: 64, color: '#ef4444' }} />
    </AbsoluteFill>
  );
}
```

## Files to Modify

1. ✅ `/src/components/GlobalDependencyProvider.tsx` - Add imports and window assignments
2. ✅ `/src/lib/types/shared/global.d.ts` - Add TypeScript declarations
3. 🔍 Find and update AI prompt files (need to locate these)

## Benefits

- **Zero bundle cost** - Already installed
- **Professional appearance** - No more pixelated emojis
- **Consistent styling** - Scalable SVGs
- **Animation-friendly** - Perfect with Remotion's interpolate/spring

## Common Icon Replacements

| Emoji | Heroicon Replacement | Remotion Shape |
|-------|---------------------|----------------|
| ✅ | CheckIcon | - |
| ❌ | XMarkIcon | - |
| ⭐ | StarIcon | Star |
| ❤️ | HeartIcon | - |
| ▶️ | PlayIcon | Triangle |
| ⏸️ | PauseIcon | - |
| 🔵 | - | Circle |
| 🔴 | - | Circle |
| 🟡 | - | Circle |
| ⬜ | - | Rect |

## Next Steps

1. Implement the code changes above
2. Test with a sample scene
3. Update AI prompts to use new dependencies
4. Document usage patterns for AI