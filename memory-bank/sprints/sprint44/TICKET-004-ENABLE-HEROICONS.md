# TICKET-004: Enable Heroicons Library

## Priority: MEDIUM
## Status: TODO
## Estimated: 1 hour
## Depends on: TICKET-001, TICKET-002, TICKET-003

## Objective
Enable Heroicons in the dependency system as the first new library, providing professional icons to replace emoji usage in AI-generated scenes.

## Background
From Sprint 44 analysis:
- Heroicons is already installed (zero bundle cost)
- Would eliminate 80%+ of emoji usage
- 280+ icons available in both solid and outline variants
- Professional appearance upgrade

## Implementation Details

### 1. Update GlobalDependencyProvider
**Location**: `src/components/GlobalDependencyProvider.tsx`

```typescript
"use client";

import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import * as Remotion from 'remotion';
import * as HeroiconsSolid from '@heroicons/react/24/solid';
import * as HeroiconsOutline from '@heroicons/react/24/outline';

export function GlobalDependencyProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).React = React;
      (window as any).ReactDOM = ReactDOM;
      (window as any).Remotion = Remotion;
      
      // Add Heroicons
      (window as any).HeroiconsSolid = HeroiconsSolid;
      (window as any).HeroiconsOutline = HeroiconsOutline;
      
      console.log('Dependencies exposed on window:', Object.keys(window).filter(k => 
        ['React', 'ReactDOM', 'Remotion', 'HeroiconsSolid', 'HeroiconsOutline'].includes(k)
      ));
    }
  }, []);

  return <>{children}</>;
}
```

### 2. Update Type Definitions
**Location**: `src/lib/types/shared/global.d.ts`

```typescript
import type React from 'react';
import type * as Remotion from 'remotion';
import type * as HeroiconsSolid from '@heroicons/react/24/solid';
import type * as HeroiconsOutline from '@heroicons/react/24/outline';

declare global {
  interface Window {
    React: typeof React;
    ReactDOM: typeof ReactDOM;
    Remotion: typeof Remotion;
    HeroiconsSolid: typeof HeroiconsSolid;
    HeroiconsOutline: typeof HeroiconsOutline;
    
    // Legacy (remove after migration)
    react?: typeof React;
    remotion?: typeof Remotion;
    __REMOTION_COMPONENT?: React.ComponentType<any>;
  }
}

export {};
```

### 3. Enable in Contract
**Location**: `src/lib/codegen/dependencies-contract.ts`

```typescript
// Change enabled: false to enabled: true
HeroiconsSolid: {
  enabled: true, // ← UPDATE THIS
  description: "Solid variant Heroicons",
  exports: ["StarIcon", "HeartIcon", "CheckIcon", "XMarkIcon", "PlayIcon", "PauseIcon", 
            "ArrowRightIcon", "ArrowLeftIcon", "ChevronUpIcon", "ChevronDownIcon",
            "BellIcon", "UserIcon", "HomeIcon", "CogIcon", "MagnifyingGlassIcon"]
},
HeroiconsOutline: {
  enabled: true, // ← UPDATE THIS
  description: "Outline variant Heroicons",
  exports: ["StarIcon", "HeartIcon", "CheckIcon", "XMarkIcon", "PlayIcon", "PauseIcon",
            "ArrowRightIcon", "ArrowLeftIcon", "ChevronUpIcon", "ChevronDownIcon",
            "BellIcon", "UserIcon", "HomeIcon", "CogIcon", "MagnifyingGlassIcon"]
}
```

### 4. Add Few-Shot Examples
**Location**: `src/lib/codegen/examples/with-heroicons.ts`

```typescript
export const HEROICONS_EXAMPLE = `const { AbsoluteFill, useCurrentFrame, interpolate, spring } = window.Remotion;
const { StarIcon, HeartIcon, CheckIcon } = window.HeroiconsSolid;

export default function IconAnimation() {
  const frame = useCurrentFrame();
  
  // Stagger animations for each icon
  const star = spring({
    frame: frame - 0,
    fps: 30,
    config: { damping: 100, stiffness: 200 }
  });
  
  const heart = spring({
    frame: frame - 10,
    fps: 30,
    config: { damping: 100, stiffness: 200 }
  });
  
  const check = spring({
    frame: frame - 20,
    fps: 30,
    config: { damping: 100, stiffness: 200 }
  });
  
  return (
    <AbsoluteFill style={{
      backgroundColor: "#1a1a1a",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: "40px"
    }}>
      <StarIcon style={{
        width: "80px",
        height: "80px",
        color: "#fbbf24",
        transform: \`scale(\${star})\`
      }} />
      
      <HeartIcon style={{
        width: "80px",
        height: "80px",
        color: "#ef4444",
        transform: \`scale(\${heart})\`
      }} />
      
      <CheckIcon style={{
        width: "80px",
        height: "80px",
        color: "#10b981",
        transform: \`scale(\${check})\`
      }} />
    </AbsoluteFill>
  );
}`;
```

### 5. Update Prompt Examples
Add icon usage guidance to prompts when relevant:

```typescript
// In PromptBuilder
if (request.toLowerCase().includes('icon') || request.includes('button')) {
  prompt += '\n\nPREFER: Use Heroicons (window.HeroiconsSolid/Outline) instead of emojis for professional appearance.';
}
```

## Testing Plan

1. **Manual Testing**:
   - Generate scene with "Add a star rating component"
   - Should use StarIcon from Heroicons, not "⭐"
   
2. **Validation Testing**:
   - Ensure validator accepts window.HeroiconsSolid
   - Ensure it rejects window.UnknownLibrary

3. **Bundle Size Check**:
   - Verify no increase (already in package.json)

## Success Criteria
- [ ] Heroicons available on window object
- [ ] TypeScript types working
- [ ] Contract updated with enabled: true
- [ ] AI uses icons instead of emojis
- [ ] No bundle size increase

## Rollback Plan
If issues arise:
1. Set enabled: false in contract
2. Redeploy
3. Icons won't be used but nothing breaks

## Future Libraries
This ticket serves as the template for enabling:
- @remotion/shapes (geometric shapes)
- framer-motion (advanced animations)
- react-simple-icons (brand icons)