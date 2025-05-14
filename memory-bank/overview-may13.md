# Custom Component Analysis: May 13 Investigation

## Overview of the Problem

Custom components in Bazaar-Vid are experiencing several issues in the rendering pipeline:

1. **Component Creation Issues**: Many components (131 of 206) have "error" status in the database
2. **Preview Panel Issues**: Even components with "success" or "complete" status are not rendering in the PreviewPanel
3. **R2 Storage Discrepancies**: Components marked as "success" in the database don't exist in R2 storage

Our goal is to understand the complete lifecycle of custom components from creation to rendering, identify where things are breaking, and determine how to fix them.

## Complete Component Lifecycle

After a thorough investigation, we now understand the complete component pipeline:

### 1. Component Generation (LLM)
- LLM generates TSX code based on a detailed prompt in `src/server/services/componentGenerator.service.ts` 
- This prompt is ~400 lines long and includes detailed Remotion-specific instructions
- The component generation happens via the `generateComponentCode` function in `src/server/workers/generateComponentCode.ts`
- The generated code is wrapped with a template from `src/server/workers/componentTemplate.ts`
- Code is stored in the database in the "tsxCode" field of "bazaar-vid_custom_component_job" table
- Status is set to "pending" or "manual_build_retry"

### 2. Component Building (buildCustomComponent.ts)
- The `processPendingJobs()` function in `src/server/workers/buildCustomComponent.ts` runs periodically via a cron job
- For each job, it:
  1. Preprocesses the TSX code using `wrapTsxWithGlobals()` which should add window.__REMOTION_COMPONENT assignment
  2. Compiles using esbuild with target 'es2020' and format 'iife'
  3. Uploads the compiled JS file to R2 storage
  4. Updates the database with "complete" status (newer) or "success" status (older) and outputUrl

### 3. Component Loading (api/components/[componentId]/route.ts)
- When a component is needed in the UI, the `/api/components/[componentId]` endpoint is called
- This endpoint in `src/app/api/components/[componentId]/route.ts`:
  1. Fetches the component job from the database
  2. Checks if status is "complete" or "success" and outputUrl exists
  3. Fetches the JS file from R2 storage
  4. Processes the JS file to ensure window.__REMOTION_COMPONENT is set
  5. Returns the JS file for client-side execution

### 4. Component Rendering (useRemoteComponent.tsx)
- The RemoteComponent in `src/hooks/useRemoteComponent.tsx` uses a hook to:
  1. Create a script element with src=`/api/components/[componentId]`
  2. Insert the script into the DOM
  3. Wait for the script to load
  4. Retrieve the component from window.__REMOTION_COMPONENT
  5. Render the component with the provided props

## Status Difference: "success" vs "complete"

Our database analysis reveals two different status values for "successful" components:

### "success" Status (Older Components)
- 25 components have this status
- Used in older versions of the component generation system
- These components **do not exist in R2 storage** despite having outputUrl values
- Example: Component with ID 7ed548bb-7f5a-453c-b323-8d262e340f3b
- These likely failed to upload to R2 but the database was updated anyway

### "complete" Status (Newer Components)
- 31 components have this status 
- Used in the newer system with Animation Design Brief integration
- These components **do exist in R2 storage** and can be fetched
- Example: Component with ID 50d8b936-9b5f-4988-b5ad-4be515268e61
- These use a proper template with window.__REMOTION_COMPONENT assignment

## Identified Issues

### 1. Component Build Issues
- **Missing window.__REMOTION_COMPONENT assignment**: Many components don't get properly registered
- **Symbol Redeclaration**: Components have duplicate imports of React and Remotion libraries
- **esbuild Compilation Errors**: Types and syntax errors occurring during compilation

### 2. R2 Storage Issues
- **Missing Files for "success" status**: Components with "success" status don't exist in R2 storage
- The most likely cause is:
  1. Database records get updated with status="success" in `buildCustomComponent.ts`
  2. R2 upload fails but the error isn't properly caught in the try/catch block
  3. No verification step to ensure the file was actually uploaded

### 3. Component Loading Issues
- **API Error Handling**: The component API route has fallbacks but they may not be working
- **Script Loading Issues**: useRemoteComponent may not detect all script loading errors
- **Error Communication**: Errors don't get properly communicated back to the UI

### 4. Generated Code Issues
- **Missing Imports**: Components don't properly import Remotion dependencies
- **Undefined Variables**: Components use functions like useVideoConfig without proper imports
- **Global Context**: Components don't properly handle the global context in Remotion

## Comparison of "success" vs "complete" Components

### "success" Status Component (Doesn't Exist in R2)
Example from component 7ed548bb-7f5a-453c-b323-8d262e340f3b:

```jsx
function FireworksDisplay() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = ['#ff0045', '#00ff00', '#0045ff', '#ffff00', '#ff00ff'];

  // Calculate burst timing
  const burstInterval = 30; // Bursts every 30 frames
  const totalBursts = Math.floor(frame / burstInterval);

  // Generate firework bursts
  const fireworks = Array.from({ length: totalBursts }, (_, index) => {
    const burstFrame = index * burstInterval;
    const animationProgress = Math.min(1, (frame - burstFrame) / 30);
    const size = interpolate(animationProgress, [0, 1], [0, 300]);
    const color = colors[index % colors.length];

    return {
      size,
      color,
      opacity: interpolate(animationProgress, [0, 1], [0, 1]),
      positionX: spring({ frame: frame - burstFrame, fps, config: { damping: 200 } }),
      positionY: spring({ frame: frame - burstFrame, fps, config: { damping: 200 } }),
    };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      <Audio src="https://www.soundjay.com/fireworks/fireworks-explosion-1.mp3" volume={0.2} />
      {fireworks.map((firework, index) => (
        <div key={index} style={{
          position: 'absolute',
          left: `calc(50% + ${firework.positionX}px)`,
          top: `calc(50% + ${firework.positionY}px)`,
          width: firework.size,
          height: firework.size,
          backgroundColor: firework.color,
          borderRadius: '50%',
          opacity: firework.opacity,
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }} />
      ))}
    </AbsoluteFill>
  );
}

export default FireworksDisplay;
```

### "complete" Status Component (Exists in R2)
Example from component 50d8b936-9b5f-4988-b5ad-4be515268e61:

```jsx
"use client";

import React from 'react';
import { 
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  interpolate,
  Easing
} from 'remotion';

const TheRedBubbleScene = (props) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  
  // ... component implementation ...
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      {/* ... component JSX ... */}
    </AbsoluteFill>
  );
};

// Register component using IIFE
(function() {
  try {
    window.__REMOTION_COMPONENT = TheRedBubbleScene;
    console.log('Successfully registered component: TheRedBubbleScene');
  } catch(e) {
    console.error('Error registering component:', e);
  }
})();
```

Key differences:
1. "complete" components include window.__REMOTION_COMPONENT assignment
2. "complete" components use a template with proper imports
3. "complete" components exist in R2 storage

## LLM Prompt Analysis

The LLM prompt for component generation in `src/server/services/componentGenerator.service.ts` is extremely detailed:

```javascript
enhancedDescriptionLines.push(`### ROLE: You are an Expert Remotion Developer and Senior React Engineer.`);
enhancedDescriptionLines.push(`### TASK: Create a production-quality Remotion React functional component in TypeScript.`);
enhancedDescriptionLines.push(`### COMPONENT NAME: '${componentName}'`);
enhancedDescriptionLines.push(`### OBJECTIVE: Generate a component that precisely implements the provided AnimationDesignBrief with professional animations and visual effects.`);
enhancedDescriptionLines.push(`### VIDEO CONFIG: Target video is ${actualWidth}x${actualHeight}px, ${actualDurationInFrames} frames total duration, at ${actualFps} FPS.`);
enhancedDescriptionLines.push(`### MANDATORY REQUIREMENTS:`);
enhancedDescriptionLines.push(`- The FIRST line MUST be: // src/remotion/components/scenes/${componentName}.tsx`);
enhancedDescriptionLines.push(`- The component MUST be a functional component using TypeScript (.tsx).`);
enhancedDescriptionLines.push(`- ALWAYS use the Remotion hooks: useCurrentFrame() and useVideoConfig() for timing and dimensions.`);
enhancedDescriptionLines.push(`- Component MUST accept props: { brief: AnimationDesignBrief } (assume this type is imported).`);
```

However, the final components are actually generated using a template from componentTemplate.ts:

```javascript
export const COMPONENT_TEMPLATE = `
// Component generated with Bazaar template - browser-compatible version

// Using globals provided by Remotion environment
const React = window.React;
const { 
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  interpolate,
  Easing
} = window.Remotion || {};

// Component implementation goes here
const {{COMPONENT_NAME}} = (props) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  
  // Animation Design Brief data is available in props.brief
  {{COMPONENT_IMPLEMENTATION}}
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      {{COMPONENT_RENDER}}
    </AbsoluteFill>
  );
};

export default {{COMPONENT_NAME}};
`;
```

The LLM itself is called with specific instructions in `src/server/workers/generateComponentCode.ts`:

```javascript
// Call OpenAI with function calling enabled
const response = await openai.chat.completions.create({
  model: "o4-mini", // Using o4-mini model
  messages: [
    {
      role: "system",
      content: `You are an expert React and Remotion developer...`
    },
    {
      role: "user",
      content: enhancedDescription
    }
  ],
  tools: [
    {
      type: "function",
      function: {
        name: "generate_remotion_component",
        description: "Generate a Remotion React component based on the provided description",
        parameters: {
          // ... parameter definitions ...
        }
      }
    }
  ],
  tool_choice: { type: "function", function: { name: "generate_remotion_component" } }
});
```

## Root Causes

Based on our analysis, we've identified the core issues:

1. **Database-R2 Storage Mismatch**: 
   - In `src/server/workers/buildCustomComponent.ts`, the database is updated with "success" status before verifying R2 upload
   - Error handling doesn't properly handle R2 upload failures

2. **Script Loading and Error Handling**:
   - The `useRemoteComponent` hook in `src/hooks/useRemoteComponent.tsx` doesn't handle all error cases
   - Error states aren't properly propagated to the UI

3. **PreviewPanel Cleanup**:
   - Script cleanup in `src/app/projects/[id]/edit/panels/PreviewPanel.tsx` may be too aggressive

4. **Template Issues**:
   - The `COMPONENT_TEMPLATE` in `src/server/workers/componentTemplate.ts` needs updating
   - Not all component registration uses the same pattern with window.__REMOTION_COMPONENT

## Fix Implementation Approach

To completely fix the component issues, we need to update multiple files:

1. **Fix buildCustomComponent.ts**:
   ```typescript
   // In src/server/workers/buildCustomComponent.ts
   try {
     // Upload to R2
     await r2.send(new PutObjectCommand({...}));
     
     // Verify file exists in R2 before updating database
     const headResult = await r2.send(new HeadObjectCommand({
       Bucket: env.R2_BUCKET_NAME,
       Key: publicPath,
     }));
     
     if (headResult.$metadata.httpStatusCode === 200) {
       // Only update DB if file actually exists
       await db.update(customComponentJobs)
         .set({ 
           outputUrl: publicUrl,
           status: "complete",
           updatedAt: new Date()
         })
         .where(eq(customComponentJobs.id, jobId));
     } else {
       throw new Error("Failed to verify file exists in R2 after upload");
     }
   } catch (r2Error) {
     // Improved error handling
   }
   ```

2. **Update Component Template**:
   ```typescript
   // In src/server/workers/componentTemplate.ts
   export const COMPONENT_TEMPLATE = `
   // Component generated with Bazaar template - browser-compatible version

   // Using globals provided by Remotion environment
   const React = window.React;
   const { 
     AbsoluteFill,
     useCurrentFrame,
     useVideoConfig,
     Sequence,
     interpolate,
     Easing
   } = window.Remotion || {};

   // Component implementation goes here
   const {{COMPONENT_NAME}} = (props) => {
     const frame = useCurrentFrame();
     const { width, height, fps, durationInFrames } = useVideoConfig();
     
     // Animation Design Brief data is available in props.brief
     {{COMPONENT_IMPLEMENTATION}}
     
     return (
       <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
         {{COMPONENT_RENDER}}
       </AbsoluteFill>
     );
   };

   // IMPORTANT: Register component for Remotion
   window.__REMOTION_COMPONENT = {{COMPONENT_NAME}};
   export default {{COMPONENT_NAME}};
   `;
   ```

3. **Fix useRemoteComponent.tsx**:
   ```typescript
   // In src/hooks/useRemoteComponent.tsx
   const handleScriptLoad = () => {
     try {
       // Check if the component was loaded successfully 
       if (window.__REMOTION_COMPONENT) {
         console.log(`[useRemoteComponent] Successfully loaded component: ${baseComponentId}`);
         // Store the component locally to prevent losing reference
         const loadedComponent = window.__REMOTION_COMPONENT;
         setComponent(loadedComponent);
         setLoading(false);
         setError(null);
       } else {
         console.error(`[useRemoteComponent] Component loaded but __REMOTION_COMPONENT not found: ${baseComponentId}`);
         setError("Component loaded but not found in window.__REMOTION_COMPONENT");
         setLoading(false);
         
         // Add retry logic
         if (retryCount < 3) {
           setTimeout(() => {
             setRetryCount(prev => prev + 1);
             reloadComponent();
           }, 1000);
         }
       }
     } catch (err) {
       // Improved error handling
     }
   };
   ```

4. **Fix PreviewPanel.tsx**:
   ```typescript
   // In src/app/projects/[id]/edit/panels/PreviewPanel.tsx
   const handleRefresh = useCallback(() => {
     // Be more selective about script removal
     const componentScriptTags = document.querySelectorAll(
       `script[src*="components"][src*="${currentComponentIds.join('"},script[src*="')}"]`
     );
     
     console.log(`[PreviewPanel] Cleaning up ${componentScriptTags.length} component scripts`);
     componentScriptTags.forEach(script => {
       script.remove();
     });
     
     // Only clear window.__REMOTION_COMPONENT if it's for our components
     if (window && 'window' in window && window.__REMOTION_COMPONENT) {
       console.log('[PreviewPanel] Clearing window.__REMOTION_COMPONENT');
       window.__REMOTION_COMPONENT = undefined;
     }
     
     // Force refresh with better error handling
     forceRefresh(projectId);
   }, [forceRefresh, projectId, currentComponentIds]);
   ```

## Next Steps for Implementation

1. **Fix Database-R2 Sync**:
   - Update the `buildCustomComponent.ts` file to verify R2 upload success
   - Add a repair script to rebuild all components with "success" status
   - Implement proper error handling in the R2 upload process

2. **Improve Script Loading**:
   - Update `useRemoteComponent.tsx` with better error detection and retries
   - Add more detailed logging throughout the script loading process
   - Improve error display in the UI

3. **Enhance Component Template**:
   - Update `componentTemplate.ts` to directly assign window.__REMOTION_COMPONENT
   - Ensure the template has proper imports and global variable handling
   - Add clearer error messages in the fallback component logic

4. **Update PreviewPanel**:
   - Make script cleanup in PreviewPanel.tsx more selective
   - Add debug mode to show component loading states
   - Improve refresh logic to handle component errors better 