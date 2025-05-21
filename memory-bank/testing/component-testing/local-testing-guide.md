//memory-bank/testing/component-testing/local-testing-guide.md
# Local Component Testing Guide

This document explains the local testing approach for Remotion components, which bypasses the normal database and R2 storage dependencies. This is useful for quickly iterating on component development, testing LLM-generated components, and diagnosing issues in the component pipeline.

## Available Testing Tools

We've implemented several tools for local component testing:

### 1. Browser-Based Component Sandbox

The most user-friendly way to test components is with our browser-based sandbox:

- **URL**: `/test/component-sandbox`
- **Features**:
  - In-browser code editor
  - One-click compilation
  - Live Remotion preview
  - Compiled JS code inspection

This is ideal for quick iterations and manual testing.

### 2. Complete Pipeline Visualization

For a more detailed view of the transformation process:

- **URL**: `/test/component-pipeline`
- **Features**:
  - Step-by-step visualization of the pipeline
  - Raw TSX → Sanitized TSX → Compiled JS → Rendered Output
  - Complete code inspection at each stage
  - Live Remotion preview

This is useful for debugging and understanding the component transformation process.

### 3. Command-Line Testing Tool

For scripted testing and automation:

- **Path**: `src/scripts/test-components/test-component.ts`
- **Usage**: `npx tsx src/scripts/test-components/test-component.ts <input-tsx-file> [output-js-file]`
- **Features**:
  - Direct compilation from TSX files
  - Outputs both JS and HTML files
  - Can be used in scripts and CI/CD pipelines

Example command:
```bash
npx tsx src/scripts/test-components/test-component.ts ./test-components/my-component.tsx
```

### 4. Batch Testing Tool

For testing multiple components at once:

- **Path**: `src/scripts/test-components/batch-test-components.ts`
- **Usage**: `npx tsx src/scripts/test-components/batch-test-components.ts [input-pattern] [output-dir]`
- **Features**:
  - Processes multiple TSX files in one run
  - Generates a component gallery with all results
  - Creates a summary report
  - Perfect for evaluating LLM-generated components

Example command:
```bash
npx tsx src/scripts/test-components/batch-test-components.ts "./llm-components/*.tsx" ./public/test-gallery
```

## Implementation Details

The local component testing approach reuses the same core compilation logic as the production pipeline, but without the database and R2 storage dependencies. Here's how it works:

1. **TSX Source Code**: The raw component code written in TSX format
2. **Sanitization**: Uses the same `sanitizeTsx` function from `buildCustomComponent.ts`
3. **Compilation**: Uses esbuild with identical configuration:
   - ESM format for modern browser compatibility
   - External dependencies for React and Remotion
   - Browser platform target
4. **Rendering**: Dynamic imports for the compiled JS, then rendering with Remotion Player

This ensures that components tested locally will behave the same way when deployed through the full pipeline.

## Component Requirements

For components to work correctly in the local testing environment:

1. Must have a default export that is a valid React component
2. Should import from `remotion` and React
3. Should conform to the Remotion component guidelines

Example of a valid component:

```tsx
import { AbsoluteFill, useCurrentFrame } from "remotion";
import React from "react";

export default function MyComponent() {
  const frame = useCurrentFrame();
  
  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100%" 
      }}>
        <h1 style={{ 
          fontSize: 60, 
          color: "blue",
          transform: `translateY(${Math.sin(frame / 10) * 20}px)` 
        }}>
          Frame {frame}
        </h1>
      </div>
    </AbsoluteFill>
  );
}
```

## Use Cases

### 1. Evaluating LLM-Generated Components

1. Have LLM generate several component variations as TSX files
2. Use the batch tester to compile and render all of them
3. Review the gallery to see which ones work best
4. Analyze failures to improve LLM prompting

### 2. Diagnosing Build Issues

1. Extract TSX code from a failed component job
2. Run it through the component pipeline page
3. Identify at which stage the failure occurs
4. Make adjustments and retest until fixed

### 3. Component Development

1. Use the component sandbox for rapid iteration
2. Write and test components without database connections
3. Once working, deploy through the normal pipeline

## Future Improvements

Potential enhancements to the local testing tools:

1. Integration with LLM APIs for direct generation and testing
2. Automated performance benchmarking
3. Visual regression testing for components
4. Component screenshots and video exports
5. Comparison tool for visually comparing component variants

## Related Resources

- [Remotion Component Best Practices](../remotion/component-guidelines.md)
- [Component Builder Architecture](../architecture/component-builder.md)
- [ESM Migration Overview](../sprints/sprint25/BAZAAR-255-ESM-build-pipeline.md)
