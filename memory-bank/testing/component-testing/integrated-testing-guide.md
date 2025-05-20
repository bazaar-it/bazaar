//memory-bank/testing/component-testing/integrated-testing-guide.md
# Integrated Component Testing Guide

This document describes the integrated testing approach for Remotion components in the Bazaar-Vid platform. This approach provides a streamlined workflow for testing custom components that mirrors the actual production environment, reusing the same underlying infrastructure.

## Testing Tools Overview

We've implemented multiple testing approaches, each with different advantages:

### 1. Component Test Harness (Production Pipeline Mirror)

- **URL**: `/test/component-harness`
- **Path**: `src/app/test/component-harness/page.tsx`
- **Purpose**: Test components in the exact same rendering pipeline as production

This is the recommended approach for most testing scenarios as it uses the actual `DynamicVideo` → `CustomScene` hierarchy that your production system uses. This ensures that your test results closely match how components will behave in the live application.

**Key features:**
- Uses the actual `DynamicVideo` component from your production code
- Components are registered in the global `window.__REMOTION_COMPONENT` registry
- Refresh tokens work exactly as they do in production
- Scene configuration can be edited in real-time

### 2. Component Sandbox (Direct ESM Testing)

- **URL**: `/test/component-sandbox`
- **Path**: `src/app/test/component-sandbox/page.tsx`
- **Purpose**: More direct testing of components without production pipeline dependencies

This approach offers a more stripped-down testing experience that directly loads the component via ESM imports. It's useful for diagnosing issues that might be related to the component itself vs. the rendering pipeline.

**Key features:**
- Direct ESM import of the component
- Simpler rendering path (doesn't use DynamicVideo)
- Displays compiled JS code for inspection
- Useful for isolating component-specific issues

### 3. Component Pipeline (Visualization Tool)

- **URL**: `/test/component-pipeline`
- **Path**: `src/app/test/component-pipeline/page.tsx`
- **Purpose**: Visualize each step of the component transformation process

This tool provides a detailed view of how your component is transformed during the build process, allowing you to inspect each stage from raw TSX to sanitized code to compiled JS to rendering.

**Key features:**
- Step-by-step visualization
- Shows code transformations at each stage
- Helps understand the build pipeline
- Useful for debugging build issues

### 4. Terminal-Based Testing Tools

- **Path**: `src/scripts/test-components/test-component.ts`
- **Path**: `src/scripts/test-components/batch-test-components.ts`
- **Purpose**: Automated testing and bulk processing

These command-line tools enable scripted testing and bulk processing, which is particularly valuable for LLM evaluation or CI/CD integration.

## Integration with Production Pipeline

The Component Test Harness uses the exact same rendering pipeline as your production system:

```
PreviewPanel --> DynamicVideo --> CustomScene --> Custom Component
```

This ensures that your test results accurately reflect how components will behave in production.

### Rendering Flow

1. **Component Code**: Your TSX component code is edited in the browser
2. **Compilation**: The component is compiled with esbuild (same as production)
3. **Global Registration**: The component is registered in `window.__REMOTION_COMPONENT`
4. **DynamicVideo Rendering**: The actual DynamicVideo component renders your scene
5. **CustomScene Loading**: The CustomScene component loads your component from the registry
6. **Rendering**: Your component is rendered within the Remotion Player

## Using the Component Test Harness

### Step 1: Write Component Code

Write your Remotion component in the editor. Your component should:

- Have a default export
- Import from `remotion` (e.g., `AbsoluteFill`, `useCurrentFrame`)
- Be a valid React component
- Follow all Remotion component guidelines

Example:

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
        height: "100%",
        flexDirection: "column" 
      }}>
        <h1 style={{ 
          fontSize: 60, 
          color: "blue",
          transform: `translateY(${Math.sin(frame / 10) * 20}px)` 
        }}>
          Hello Remotion
        </h1>
        <p style={{ fontSize: 30, color: "gray" }}>
          Frame: {frame}
        </p>
      </div>
    </AbsoluteFill>
  );
}
```

### Step 2: Compile & Test

Click the "Compile & Test Component" button. This will:

1. Send the code to the compilation API
2. Compile the component using esbuild with production settings
3. Register the component in the global registry
4. Update the refresh token to trigger a re-render
5. Render the component in the preview area using DynamicVideo

### Step 3: Modify Scene Configuration (Optional)

You can modify the scene configuration in the JSON editor below the preview. This allows you to test different scene parameters like:

- Duration
- Background color
- Start time

### Step 4: Iterate and Refine

Make changes to your component code and recompile to see the updates. The refresh token is automatically updated to ensure the component is properly reloaded.

## Technical Implementation Details

### Component Registration

Components are registered in the global `window.__REMOTION_COMPONENT` object, just like in the production pipeline:

```javascript
window.__REMOTION_COMPONENT = window.__REMOTION_COMPONENT || {};
window.__REMOTION_COMPONENT["component-id"] = Component.default;
```

### Refresh Token Mechanism

The test harness uses the same refresh token mechanism as the production system to trigger component reloads:

```javascript
setRefreshToken('refresh-' + Date.now());
```

This token is passed through DynamicVideo to CustomScene, which forces a remount of the component when the token changes.

### Scene Configuration

The test harness uses a simplified scene configuration that matches the structure expected by DynamicVideo:

```javascript
{
  scenes: [
    {
      id: 'test-scene-uuid',
      type: 'custom',
      start: 0,
      duration: 150,
      data: {
        componentId: 'component-id',
      }
    }
  ],
  meta: {
    duration: 150,
    backgroundColor: '#000000'
  }
}
```

## Differences from Production

While the testing environment closely mirrors production, there are a few differences to be aware of:

1. **No Database/R2 Dependency**: The test harness doesn't require a database connection or R2 storage.
2. **Direct Component Registration**: Components are registered directly in the browser rather than being loaded from R2.
3. **No Animation Design Brief**: The test harness doesn't fetch Animation Design Briefs (ADBs) from the database.
4. **Simplified Scene Configuration**: Only the most essential scene properties are included.

## Debugging Tips

1. **Console Logs**: Both CustomScene and DynamicVideo emit detailed logging. Open your browser console to see the component lifecycle.
2. **Component ID**: The component ID is displayed below the editor. Use this ID when looking at console logs.
3. **Refresh Token**: The current refresh token is also displayed, which can help track remounting behavior.
4. **Error States**: CustomScene will display error states if component loading fails.

## Use Cases

### 1. Testing LLM-Generated Components

This testing environment is perfect for evaluating components generated by LLMs:

1. Generate component code with an LLM
2. Paste it into the component test harness
3. Test how it renders in the actual Remotion pipeline
4. Identify and fix any issues
5. Iterate with the LLM to improve the component

### 2. Debugging Production Components

If you have a component that's failing in production:

1. Get the component TSX code from the database
2. Paste it into the test harness
3. Observe how it behaves in isolation
4. Make changes to fix issues
5. Test the fixed version before updating in production

### 3. Rapid Component Development

The test harness provides a tight development loop for creating new components:

1. Write component code in the editor
2. See immediate results in the preview
3. Iterate quickly without database operations
4. Export working components to the main codebase

## Related Documentation

- [ESM Component Migration](../../sprints/sprint25/BAZAAR-255-ESM-build-pipeline.md)
- [Component Loading Mechanism](../../sprints/sprint25/BAZAAR-256-component-loading.md)
- [Runtime Dependencies](../../sprints/sprint25/BAZAAR-258-runtime-dependencies.md)
- [Remotion Component Guidelines](../../remotion/component-guidelines.md)
