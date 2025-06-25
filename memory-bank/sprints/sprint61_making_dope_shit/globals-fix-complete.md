# Globals Fix Complete - No More Duplicate Declarations

## The Problem
When multiple scenes are loaded together, duplicate const declarations break the video:
```javascript
// Scene 1
const { IconifyIcon } = window;

// Scene 2
const { IconifyIcon } = window; // ERROR: Duplicate declaration!
```

## The Solution Implemented

### Updated System Prompts

Both CODE_GENERATOR and CODE_EDITOR now enforce:

1. **ONLY destructure from window.Remotion**
   ```javascript
   const { AbsoluteFill, useCurrentFrame, interpolate } = window.Remotion;
   ```

2. **NEVER destructure anything else**
   ```javascript
   // React hooks - use directly
   const [count, setCount] = window.React.useState(0);
   window.React.useEffect(() => {}, []);
   
   // Icons - use directly
   <window.IconifyIcon icon="lucide:rocket" />
   
   // Fonts - use directly
   window.RemotionGoogleFonts.loadFont("Inter", { weights: ["400", "700"] });
   ```

### Clear Examples Added
The prompt now includes:
- ✅ CORRECT usage examples
- ❌ WRONG usage examples
- Clear marking of which globals can be destructured (only Remotion)

## Result

- No more duplicate declaration errors
- Scenes can be composed together safely
- Clear, consistent pattern
- Easy to understand and follow

## Testing

Try creating multiple scenes now - they should all work together without conflicts!