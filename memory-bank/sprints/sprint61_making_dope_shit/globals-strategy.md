# Global Access Strategy - Avoiding Duplicate Declarations

## The Problem

When multiple scenes are loaded in the same Remotion composition, having duplicate const declarations breaks everything:

```javascript
// Scene 1
const { useState } = window.React;
const { IconifyIcon } = window;

// Scene 2  
const { useState } = window.React; // ERROR: Duplicate declaration
const { IconifyIcon } = window; // ERROR: Duplicate declaration
```

## The Solution

### ✅ DO: Destructure ONLY from window.Remotion

```javascript
// This is OK - Remotion components are scene-specific
const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
```

### ✅ DO: Access everything else directly

```javascript
// React hooks
const [count, setCount] = window.React.useState(0);
window.React.useEffect(() => {
  // effect
}, []);

// Icons
<window.IconifyIcon icon="lucide:rocket" />

// Google Fonts
window.RemotionGoogleFonts.loadFont("Inter", { weights: ["400", "700"] });

// Other globals
<window.HeroiconsSolid.CheckIcon />
<window.LucideIcons.Rocket />
```

### ❌ DON'T: Destructure from window (except Remotion)

```javascript
// NEVER DO THIS
const { useState } = window.React;
const { IconifyIcon } = window;
const { loadFont } = window.RemotionGoogleFonts;
```

## Why This Works

1. **No Duplicate Declarations**: Each scene can use window.React.useState without conflicts
2. **Clear Origin**: It's obvious where each function comes from
3. **No Scope Issues**: Everything works regardless of how scenes are loaded
4. **Consistent Pattern**: Easy rule to follow

## Implementation in Prompts

Update the system prompt to be very clear:

```
CRITICAL: 
- ONLY destructure from window.Remotion
- Access ALL other globals directly: window.React.useState(), window.IconifyIcon, etc.
- NEVER destructure React, Icons, or other globals
```

This ensures scenes can be composed together without breaking.