//memory-bank/testing/component-testing/component-pipeline.md
# Component Pipeline Visualization Tool

This document describes the Component Pipeline Visualization tool, which provides a step-by-step view of the transformation process for custom Remotion components in the Bazaar-Vid platform.

## Overview

The Component Pipeline tool offers a transparent view of how a TSX component is processed through the build pipeline, from raw source code to the final rendered output. This provides valuable insights for debugging, education, and understanding the internal workings of the component compilation process.

## Location

- **URL**: `/test/component-pipeline`
- **Path**: `src/app/test/component-pipeline/page.tsx`

## Key Features

- **Multi-stage Visualization**: View each transformation stage side-by-side
- **Real-time Editing**: Edit source code and see how it affects each stage
- **Detailed Inspection**: Examine sanitized code, compiled JavaScript, and runtime behavior
- **Error Reporting**: See errors at each stage of the pipeline
- **Educational Tool**: Learn how the component build process works

## Pipeline Stages

The tool visualizes these key stages in the component transformation process:

1. **Raw TSX Source**: The original TypeScript/React component code
2. **Sanitized TSX**: Code after security and compatibility preprocessing
3. **Compiled JavaScript**: Output from esbuild compilation
4. **Runtime Rendering**: The actual component rendered in the Remotion Player

## Using the Component Pipeline Tool

### Step 1: Write Component Code

Write your Remotion component in the editor. Your component should:

- Have a default export
- Import from `remotion` (e.g., `AbsoluteFill`, `useCurrentFrame`)
- Be a valid React component

Example:

```tsx
import { AbsoluteFill, useCurrentFrame, spring, interpolate } from "remotion";
import React from "react";

export default function AnimatedCard() {
  const frame = useCurrentFrame();
  const springValue = spring({
    frame,
    from: 0,
    to: 1,
    fps: 30,
    durationInFrames: 30,
    config: {
      damping: 10,
      stiffness: 100,
    },
  });
  
  const scale = interpolate(springValue, [0, 1], [0.5, 1]);
  const rotation = interpolate(springValue, [0, 1], [-15, 0]);
  
  return (
    <AbsoluteFill style={{ 
      backgroundColor: "#f5f5f5",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    }}>
      <div style={{ 
        width: 400,
        height: 250,
        backgroundColor: "white",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
        display: "flex",
        flexDirection: "column",
        transform: `scale(${scale}) rotate(${rotation}deg)`,
      }}>
        <h2 style={{ margin: 0, color: "#333" }}>Spring Animation</h2>
        <p style={{ flex: 1, marginTop: 10, color: "#666" }}>
          This card demonstrates spring physics using Remotion's spring() function.
        </p>
        <div style={{ 
          width: "100%", 
          height: 8, 
          backgroundColor: "#f0f0f0",
          borderRadius: 4,
          overflow: "hidden",
        }}>
          <div style={{ 
            width: `${springValue * 100}%`, 
            height: "100%",
            backgroundColor: "#0096FF"
          }}/>
        </div>
      </div>
    </AbsoluteFill>
  );
}
```

### Step 2: Process the Pipeline

Click the "Process Pipeline" button. This will:

1. Send the code to the pipeline processing API
2. Process the code through each transformation stage
3. Display the output of each stage in separate panels
4. Render the final component in the preview area

### Step 3: Analyze Each Stage

Examine the output of each stage to understand how your component is transformed:

- **Sanitized TSX**: Look for any changes made during the sanitization process
- **Compiled JavaScript**: Observe how TypeScript is transpiled to JavaScript
- **Rendered Output**: See the actual component in action

### Step 4: Iterate and Learn

Make changes to your component code and process it again to see how modifications affect each stage of the pipeline. This iterative process provides valuable insights into how the compilation process works.

## Technical Implementation

### API Endpoint

The Component Pipeline tool uses a dedicated API endpoint at `/api/test/process-component-pipeline` that handles the multi-stage processing:

```typescript
// In the API route
export async function POST(request: Request) {
  try {
    const { tsxCode } = await request.json();
    
    // Step 1: Sanitize the code
    const sanitizedCode = sanitizeTsx(tsxCode);
    
    // Step 2: Compile with esbuild
    const compilationResult = await compileWithEsbuild(sanitizedCode, { 
      format: 'esm' 
    });
    
    // Return all stages
    return NextResponse.json({
      success: true,
      rawTsx: tsxCode,
      sanitizedTsx: sanitizedCode,
      compiledJs: compilationResult.js,
      errors: compilationResult.errors || [],
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: (error as Error).message,
    }, { status: 500 });
  }
}
```

### Component Loading

The final rendered output is created using the same dynamic import approach as the Component Sandbox:

```typescript
// Create a Blob URL from the compiled JS
const blob = new Blob([compiledJs], { type: 'application/javascript' });
const url = URL.createObjectURL(blob);

// Import the component dynamically
const module = await import(url);
const Component = module.default;

// Render in the Player
<Player
  component={Component}
  durationInFrames={150}
  compositionWidth={1920}
  compositionHeight={1080}
  fps={30}
  controls
/>
```

## Educational Value

### Understanding the Build Process

The Component Pipeline tool provides valuable insights into:

1. **Security Measures**: How code is sanitized before compilation
2. **TypeScript Transpilation**: How TSX is converted to JavaScript
3. **Remotion Integration**: How components are prepared for the Remotion runtime
4. **Module Transformation**: How ESM modules are handled

### Common Transformations to Look For

1. **Import Handling**: How imports are processed and externalized
2. **TypeScript Removal**: How TypeScript annotations are stripped
3. **JSX Transpilation**: How JSX is converted to React.createElement calls
4. **Export Handling**: How the default export is processed

## Use Cases

### When to Use the Component Pipeline Tool

- **Debugging Build Issues**: When components compile but don't render correctly
- **Learning**: For team members new to Remotion or the build process
- **Optimization**: To understand how code changes affect the compiled output
- **Troubleshooting**: To diagnose issues related to specific transformation stages

## Relation to Other Testing Tools

| Feature | Component Pipeline | Component Test Harness | Component Sandbox |
|---------|-------------------|------------------------|-------------------|
| Primary Purpose | Educational insights | Production testing | Rapid prototyping |
| View of Pipeline | Complete, multi-stage | Black box | Single-stage |
| Complexity | Medium | High | Low |
| Production Similarity | Medium | High | Low |

## Debugging Tips

### Common Issues at Each Stage

#### Sanitization Issues

- Invalid imports or exports
- Potentially harmful code patterns
- Non-standard syntax

#### Compilation Issues

- TypeScript errors
- Invalid JSX
- Missing dependencies

#### Runtime Issues

- React key warnings
- Missing props
- Performance problems

### Resolving Issues

1. Start by identifying which stage introduces the issue
2. Compare the output before and after that stage
3. Make targeted changes to your component code
4. Process the pipeline again to verify the fix

## Next Steps

- [ ] Add syntax highlighting for code panels
- [ ] Implement diff view to highlight changes between stages
- [ ] Add performance metrics for compilation time
- [ ] Create educational guides explaining common transformations

## Related Documentation

- [Integrated Testing Guide](./integrated-testing-guide.md): Overview of all testing approaches
- [Component Sandbox Guide](./component-sandbox.md): Simplified testing environment
- [Terminal Testing Tools](./terminal-tools.md): Command-line testing options
