# Creating Custom Components for Bazaar-vid Remotion Player

This guide explains how to create custom components that properly render in the Bazaar-vid Remotion player.

## Common Issues and How to Fix Them

From our debugging, we've identified several common issues that prevent components from properly rendering:

1. **Syntax Errors in JSX Closing Tags**
   - Extra semicolons after closing tags (`</div>;`)
   - Improper nesting of JSX elements
   - Unterminated JSX elements

2. **Missing Global References**
   - Not properly referencing React and Remotion
   - Missing `window.__REMOTION_COMPONENT` assignment

3. **Runtime Errors**
   - Component errors not being caught/reported properly
   - Missing outputUrl despite "ready" status

## Working Component Template

Use this template as a starting point for creating custom components:

```tsx
// Always use window.React reference
const React = window.React;
// Get AbsoluteFill from Remotion
const { AbsoluteFill } = window.Remotion;

// Define your component props
interface MyComponentProps {
  color?: string;
  size?: number;
  text?: string;
}

// Create your component
const MyComponent = ({ 
  color = '#ff0000', 
  size = 200,
  text = 'Remotion Circle'
}: MyComponentProps) => {
  // Optional: Use React hooks
  React.useEffect(() => {
    console.log('Component mounted');
    return () => console.log('Component unmounted');
  }, []);

  // Return your JSX - proper indentation and nesting!
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}>
        <div style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          color: 'white',
          fontWeight: 'bold',
        }}>
          {text}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// IMPORTANT: This assignment is required for Remotion to find the component
window.__REMOTION_COMPONENT = MyComponent;
```

## How Components Are Processed

1. When you create a component, it's stored in the database with its TSX code
2. When the component is built, the system:
   - Preprocesses the TSX to fix common issues
   - Compiles it with esbuild
   - Uploads the compiled JS to R2 storage
   - Sets the component status to "ready" and stores the outputUrl

3. When you add the component to a video:
   - The CustomScene component loads the JS from the outputUrl
   - The JS is evaluated and the window.__REMOTION_COMPONENT is accessed
   - The component is rendered in the Remotion player

## Troubleshooting

If your component isn't rendering correctly:

1. **Check the Console Logs**
   - Look for errors in the browser console
   - Check server logs for build errors

2. **Use the Debug Button**
   - The debug button will identify components that are marked as "ready" but missing outputUrl
   - It will reset these to "pending" so they can be properly rebuilt

3. **Use the Fix Script**
   - We've created a script that can fix common syntax issues in components
   - Run `npx tsx src/scripts/fix-component-syntax.ts <component-id>` to fix a component

4. **Start from the Template**
   - If you're having trouble, start from the template above

## Common Gotchas

1. **No Extra Semicolons**
   - Don't add semicolons after JSX closing tags

2. **Proper Nesting**
   - Make sure your JSX elements are properly nested
   - All opening tags must have corresponding closing tags

3. **Required Assignment**
   - You must assign your component to `window.__REMOTION_COMPONENT`
   - This is how Remotion finds your component

4. **Use window.React and window.Remotion**
   - Always reference React and Remotion from the window object
   - Our preprocessor will handle this for you if you follow the template

5. **AbsoluteFill is Recommended**
   - Use AbsoluteFill as the root element to properly fill the frame
   - Ensures your component fills the entire composition

6. **Don't Use Dynamic Imports**
   - Stick to standard imports and references
   - Avoid dynamic imports or require() statements

## Example of a Working Component

Here's a simple working component that adds a bouncing ball animation:

```tsx
const React = window.React;
const { AbsoluteFill, useCurrentFrame, interpolate } = window.Remotion;

const BouncingBall = ({ color = '#0066cc', size = 100 }) => {
  const frame = useCurrentFrame();
  
  // Create a bouncing animation using interpolate
  const y = interpolate(
    frame % 60,
    [0, 30, 60],
    [0, 200, 0],
    {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp'
    }
  );
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100%',
      }}>
        <div style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          transform: `translateY(${y}px)`,
          transition: 'transform 0.1s ease-in-out',
        }} />
      </div>
    </AbsoluteFill>
  );
};

window.__REMOTION_COMPONENT = BouncingBall;
```

Follow these guidelines and your custom components should work properly in the Bazaar-vid Remotion player. 