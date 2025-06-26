# React Hooks in Remotion - How It Works

## The Setup

Remotion automatically loads React globally, so `window.React` is already available with all hooks. You don't need to destructure or import anything.

## How to Use React Hooks

### ✅ CORRECT - Direct Usage
```javascript
export default function Scene_abc123() {
  const { AbsoluteFill, useCurrentFrame } = window.Remotion;
  
  // Use React hooks directly from window.React
  const [count, setCount] = window.React.useState(0);
  const [isVisible, setIsVisible] = window.React.useState(true);
  
  window.React.useEffect(() => {
    console.log('Scene mounted');
    window.RemotionGoogleFonts.loadFont("Inter", { weights: ["400", "700"] });
  }, []);
  
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill>
      {/* Your scene content */}
    </AbsoluteFill>
  );
}
```

### ❌ WRONG - Never Destructure
```javascript
// DON'T DO THIS IN ANY SCENE
const { useState, useEffect } = window.React; // This causes duplicate declarations!
```

## Why This Works

1. **Remotion Pre-loads React**: Before your scenes run, Remotion has already loaded React and made it available as `window.React`

2. **No Destructuring Needed**: `window.React.useState` works directly - no need to extract it first

3. **Available Everywhere**: Every scene can use `window.React.useState()` without any setup

## Common Patterns

### Using Multiple Hooks
```javascript
export default function Scene_xyz789() {
  const { AbsoluteFill } = window.Remotion;
  
  // Multiple state hooks
  const [text, setText] = window.React.useState("Hello");
  const [color, setColor] = window.React.useState("#ff0000");
  const [size, setSize] = window.React.useState(48);
  
  // Effect hook
  window.React.useEffect(() => {
    // Load fonts
    window.RemotionGoogleFonts.loadFont("Inter", { weights: ["400", "700"] });
  }, []);
  
  return <AbsoluteFill>...</AbsoluteFill>;
}
```

### Using Other React Features
```javascript
// useRef
const elementRef = window.React.useRef(null);

// useMemo
const expensiveValue = window.React.useMemo(() => {
  return calculateSomething();
}, [dependency]);

// useCallback
const handleClick = window.React.useCallback(() => {
  console.log('clicked');
}, []);
```

## The Rule is Simple

- **Remotion components**: Can destructure ✅
- **Everything else**: Use directly from window ✅
- **Never destructure non-Remotion globals**: ❌

This prevents any possibility of duplicate declarations when scenes are composed together.