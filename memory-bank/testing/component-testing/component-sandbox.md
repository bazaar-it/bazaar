//memory-bank/testing/component-testing/component-sandbox.md
# Component Sandbox Testing Guide

This document provides a detailed guide for using the Component Sandbox, a browser-based testing environment designed for direct testing of Remotion components without database or R2 dependencies.

## Overview

The Component Sandbox provides a simplified environment for testing custom components that bypasses much of the production pipeline complexity. This makes it an ideal tool for:

- Quick prototyping of new components
- Debugging components in isolation
- Testing components with specific props without project context
- Experimenting with Remotion features

## Location

- **URL**: `/test/component-sandbox`
- **Path**: `src/app/test/component-sandbox/page.tsx`

## Key Features

- **Direct ESM Import**: Components are loaded via ESM imports without the global registry
- **Real-time Editing**: Edit component code and see changes immediately
- **Simplified Rendering**: Components render directly without DynamicVideo/CustomScene pipeline
- **Code Inspection**: View compiled JavaScript output
- **Minimal Dependencies**: No database or R2 storage requirements

## How It Works

Unlike the Component Test Harness which uses the full production pipeline, the Component Sandbox takes a more direct approach:

1. Component TSX code is edited in the browser
2. The code is sent to the `/api/test/compile-component` endpoint
3. The endpoint compiles the code using esbuild
4. The compiled JavaScript is returned and displayed
5. The JavaScript is executed via a Blob URL and dynamic import
6. The component is rendered directly in a Remotion Player

This approach bypasses the global component registry and the DynamicVideo/CustomScene hierarchy, allowing for a more isolated testing environment.

## Using the Component Sandbox

### Step 1: Write Component Code

Write your Remotion component in the editor. Your component should:

- Have a default export
- Import from `remotion` (e.g., `AbsoluteFill`, `useCurrentFrame`)
- Be a valid React component

Example:

```tsx
import { AbsoluteFill, useCurrentFrame } from "remotion";
import React from "react";

export default function BouncingText() {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{ backgroundColor: "#111" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100%",
        flexDirection: "column" 
      }}>
        <h1 style={{ 
          fontSize: 60, 
          fontFamily: "sans-serif",
          color: "#f5f5f5",
          transform: `translateY(${Math.sin(frame / 15) * 30}px)`,
          textShadow: "0 2px 10px rgba(0,0,0,0.5)" 
        }}>
          Bouncing Text
        </h1>
      </div>
    </AbsoluteFill>
  );
}
```

### Step 2: Compile & Preview

Click the "Compile & Preview" button. This will:

1. Send the code to the compilation API
2. Compile the component using esbuild
3. Display the compiled JavaScript
4. Load the component via dynamic import
5. Render the component in the preview area

### Step 3: Iterate and Refine

Make changes to your component code and recompile to see the updates. The sandbox automatically handles the refresh process.

## Technical Implementation

### Compilation Process

The Component Sandbox uses the same `/api/test/compile-component` endpoint as the other testing tools, but with a simplified approach to component registration:

```typescript
// In the API endpoint
const result = await compileWithEsbuild(tsxCode, { format: 'esm' });

// In the frontend
const blob = new Blob([compiledJs], { type: 'application/javascript' });
const url = URL.createObjectURL(blob);
const module = await import(url);
const Component = module.default;

// Then render directly
<Player
  component={Component}
  durationInFrames={150}
  compositionWidth={1920}
  compositionHeight={1080}
  fps={30}
  controls
/>
```

### Differences from Test Harness

The key differences between the Component Sandbox and the Component Test Harness are:

| Feature | Component Sandbox | Component Test Harness |
|---------|-------------------|------------------------|
| Component Loading | Direct ESM import | Global registry |
| Rendering Pipeline | Directly in Player | DynamicVideo → CustomScene |
| Scene Configuration | Fixed parameters | Configurable |
| Refresh Mechanism | Dynamic import | Refresh token |
| Production Similarity | Lower | Higher |

## Use Cases

### When to Use Component Sandbox

- **Quick Prototyping**: When you need to quickly test a component idea
- **Debugging Basic Issues**: When you want to isolate a component from the pipeline
- **Learning Remotion**: When experimenting with Remotion features
- **Simple Components**: For components with minimal dependencies

### When to Use Component Test Harness Instead

- **Production Readiness**: When testing how a component will behave in production
- **Pipeline Integration**: When testing interactions with DynamicVideo/CustomScene
- **Scene Configuration**: When you need to test different scene parameters
- **Complex Components**: For components that interact with the wider system

## Debugging Tips

### Common Issues

1. **Import Errors**
   - Make sure imports are from the correct packages
   - Check for typos in import paths

2. **ESM Compatibility**
   - Use ES modules syntax (import/export)
   - Avoid CommonJS patterns (require/module.exports)

3. **Component Props**
   - The sandbox doesn't pass any special props to your component
   - Add default values for required props in your component

### Performance Considerations

The Component Sandbox is designed for quick iteration, but be aware that:

- Each compilation creates a new Blob URL
- These URLs aren't automatically garbage collected
- For long testing sessions, occasionally refresh the page

## Next Steps

- [ ] Add support for custom component props
- [ ] Implement a props editor interface
- [ ] Add export functionality for successful components
- [ ] Create a component template library

## Related Documentation

- [Integrated Testing Guide](./integrated-testing-guide.md): Overview of all testing approaches
- [Terminal Testing Tools](./terminal-tools.md): Command-line testing options
- [Component Pipeline Visualization](./component-pipeline.md): Step-by-step transformation guide
