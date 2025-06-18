# Heroicons Implementation Example

## Why Heroicons is Perfect for This Example

- **Already installed**: `@heroicons/react": "^2.2.0"` in package.json
- **Zero bundle impact**: We're already paying the cost
- **Huge visual impact**: Professional icons transform scenes
- **Simple implementation**: Just React components
- **Two variants**: Solid and Outline for variety

## Step-by-Step Implementation

### 1. Update GlobalDependencyProvider.tsx

```typescript
// src/components/GlobalDependencyProvider.tsx
"use client";

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import * as Remotion from 'remotion';
import * as HeroiconsSolid from '@heroicons/react/24/solid';
import * as HeroiconsOutline from '@heroicons/react/24/outline';

export function GlobalDependencyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Existing dependencies
      (window as any).React = React;
      (window as any).ReactDOM = ReactDOM;
      (window as any).Remotion = Remotion;
      
      // NEW: Add Heroicons
      (window as any).HeroiconsSolid = HeroiconsSolid;
      (window as any).HeroiconsOutline = HeroiconsOutline;
      
      console.log('React, ReactDOM, Remotion, Heroicons exposed on window object.');
    }
  }, []);

  return <>{children}</>;
}
```

### 2. Update global.d.ts

```typescript
// src/lib/types/shared/global.d.ts
import type React from 'react';
import type * as Remotion from 'remotion';
import type * as HeroiconsSolid from '@heroicons/react/24/solid';
import type * as HeroiconsOutline from '@heroicons/react/24/outline';

declare global {
  interface Window {
    React: typeof React;
    Remotion: typeof Remotion;
    HeroiconsSolid: typeof HeroiconsSolid;
    HeroiconsOutline: typeof HeroiconsOutline;
    
    // Legacy support
    react?: typeof React;
    remotion?: typeof Remotion;
    __REMOTION_COMPONENT?: React.ComponentType<any>;
  }
}

export {};
```

### 3. Update AI Prompts

Add to code generation prompts:

```typescript
const CODE_GENERATOR_WITH_ICONS = {
  role: 'system' as const,
  content: `You are an expert React/Remotion developer creating motion graphics scenes.

🚨 CRITICAL TECHNICAL RULES:
1. const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
2. Icons available: const { PlayIcon, PauseIcon, StarIcon, HeartIcon, etc } = window.HeroiconsSolid;
3. Outline icons: const { PlayIcon, PauseIcon } = window.HeroiconsOutline;
4. export default function {{FUNCTION_NAME}}() - MUST be on the function declaration line
5. NO imports, NO TypeScript, NO markdown code blocks

📋 ICON USAGE:
- Use icons to enhance visual storytelling
- Animate icon properties: scale, rotation, opacity
- Popular icons: PlayIcon, PauseIcon, StarIcon, HeartIcon, CheckIcon, XMarkIcon, ArrowRightIcon
- Size icons: style={{ width: 64, height: 64 }}

🎬 ANIMATION WITH ICONS:
- Animate icon entrance with spring()
- Use interpolate() for smooth icon transformations
- Layer icons with text for rich compositions
- Add icon color changes over time

Example icon usage:
\`\`\`jsx
const { StarIcon, HeartIcon } = window.HeroiconsSolid;

// Animated star
<StarIcon 
  style={{
    width: 48,
    height: 48,
    color: 'gold',
    transform: \`scale(\${iconScale}) rotate(\${rotation}deg)\`
  }}
/>
\`\`\`

Return ONLY the code, no explanations or markdown.`
};
```

## Real AI-Generated Examples

### Example 1: Icon Celebration Scene

```jsx
const { AbsoluteFill, useCurrentFrame, interpolate, spring } = window.Remotion;
const { StarIcon, HeartIcon, CheckIcon } = window.HeroiconsSolid;

export default function IconCelebration() {
  const frame = useCurrentFrame();
  
  // Icon animations
  const starScale = spring({
    frame: frame - 20,
    fps: 30,
    config: { damping: 8 }
  });
  
  const heartBeat = interpolate(
    frame % 60,
    [0, 30, 60],
    [1, 1.2, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  const checkRotation = interpolate(
    frame,
    [0, 30],
    [0, 360],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  
  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column'
    }}>
      
      {/* Animated stars */}
      <div style={{ display: 'flex', gap: '20px', marginBottom: '40px' }}>
        {[0, 1, 2, 3, 4].map(i => (
          <StarIcon
            key={i}
            style={{
              width: 48,
              height: 48,
              color: '#ffd700',
              transform: `scale(${starScale}) rotate(${frame * 2 + i * 72}deg)`,
              filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.3))'
            }}
          />
        ))}
      </div>
      
      {/* Beating heart */}
      <HeartIcon 
        style={{
          width: 80,
          height: 80,
          color: '#ff6b6b',
          transform: `scale(${heartBeat})`,
          marginBottom: '30px'
        }}
      />
      
      {/* Spinning checkmark */}
      <CheckIcon
        style={{
          width: 64,
          height: 64,
          color: '#51cf66',
          transform: `rotate(${checkRotation}deg)`
        }}
      />
      
      <h1 style={{
        color: 'white',
        fontSize: '3rem',
        fontWeight: '700',
        marginTop: '30px',
        textAlign: 'center',
        fontFamily: 'Inter'
      }}>
        Success!
      </h1>
    </AbsoluteFill>
  );
}
```

### Example 2: Product Feature Showcase

```jsx
const { AbsoluteFill, useCurrentFrame, interpolate, spring } = window.Remotion;
const { ShieldCheckIcon, BoltIcon, GlobeAltIcon } = window.HeroiconsSolid;

export default function FeatureShowcase() {
  const frame = useCurrentFrame();
  
  const features = [
    { Icon: ShieldCheckIcon, title: 'Secure', color: '#10b981', delay: 0 },
    { Icon: BoltIcon, title: 'Fast', color: '#f59e0b', delay: 20 },
    { Icon: GlobeAltIcon, title: 'Global', color: '#3b82f6', delay: 40 }
  ];
  
  return (
    <AbsoluteFill style={{
      backgroundColor: '#1f2937',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '60px'
    }}>
      
      <div style={{
        display: 'flex',
        gap: '80px',
        alignItems: 'center'
      }}>
        {features.map((feature, index) => {
          const iconScale = spring({
            frame: frame - feature.delay,
            fps: 30,
            config: { damping: 12 }
          });
          
          const textOpacity = interpolate(
            frame - feature.delay - 15,
            [0, 20],
            [0, 1],
            { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
          );
          
          return (
            <div key={index} style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}>
              <feature.Icon
                style={{
                  width: 72,
                  height: 72,
                  color: feature.color,
                  transform: `scale(${iconScale})`,
                  marginBottom: '20px',
                  filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.4))'
                }}
              />
              
              <h2 style={{
                color: 'white',
                fontSize: '1.5rem',
                fontWeight: '600',
                fontFamily: 'Inter',
                opacity: textOpacity
              }}>
                {feature.title}
              </h2>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
}
```

## Visual Impact Analysis

### Before (Text Only):
```jsx
<div style={{ color: 'white', fontSize: '2rem' }}>
  ✓ Secure
  ⚡ Fast  
  🌍 Global
</div>
```

### After (With Heroicons):
```jsx
<ShieldCheckIcon style={{ width: 48, height: 48, color: '#10b981' }} />
<BoltIcon style={{ width: 48, height: 48, color: '#f59e0b' }} />
<GlobeAltIcon style={{ width: 48, height: 48, color: '#3b82f6' }} />
```

**Result**: Professional, consistent, scalable icons vs. emoji/text fallbacks.

## Available Icon Categories

### Popular Icons Already Available:
- **Actions**: PlayIcon, PauseIcon, StopIcon, ArrowRightIcon
- **Status**: CheckIcon, XMarkIcon, ExclamationTriangleIcon
- **Social**: HeartIcon, StarIcon, ShareIcon, ChatBubbleLeftIcon
- **Business**: ChartBarIcon, CurrencyDollarIcon, BuildingOfficeIcon
- **Tech**: BoltIcon, CpuChipIcon, ShieldCheckIcon, GlobeAltIcon
- **Navigation**: ArrowUpIcon, ArrowDownIcon, ChevronRightIcon

### Full List:
Over 280 icons available in both solid and outline variants.

## Bundle Size Impact

- **Current**: Already included (~15KB for used icons)
- **Additional cost**: 0KB (already paying for it)
- **Tree shaking**: Only imported icons are bundled
- **Performance**: SVG icons render efficiently

## Implementation Benefits

1. **Professional appearance**: Consistent, pixel-perfect icons
2. **Animation friendly**: SVG scales perfectly at any size
3. **Accessibility**: Built-in ARIA labels and screen reader support
4. **Flexibility**: Solid and outline variants for different styles
5. **Zero learning curve**: Standard React component usage

## Next Steps If Implemented

1. Update GlobalDependencyProvider (5 lines of code)
2. Update global.d.ts (4 lines of code)
3. Update AI prompts to include icon examples
4. Test with a simple icon animation scene
5. Document icon naming conventions for AI

This would immediately make all AI-generated scenes look more professional with minimal implementation effort.