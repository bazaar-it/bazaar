# Component Loading Fix - Implementation Plan

## Issue Overview

We've identified that custom components are failing to load with specific error patterns:

```
Error: Unexpected token '{'. import call expects one or two arguments.
🔴 [INTERCEPTED] "[useRemoteComponent] Component loaded but __REMOTION_COMPONENT not found: 7bff90dd-a813-455e-9622-c2d7eb7fa36f"
🔴 [INTERCEPTED] "[CustomScene] Metadata fetch timeout for component 7bff90dd-a813-455e-9622-c2d7eb7fa36f after 5 seconds"
```

After thorough analysis, we've determined:
1. The component contains a "naked import" statement with destructuring: `import {useState, useEffect} from 'react'`
2. Our current regex patterns don't handle this case, causing a syntax error
3. This prevents the script from executing and setting `window.__REMOTION_COMPONENT`

## Proposed Code Changes

### 1. Fix `/src/app/api/components/[componentId]/route.ts`

```typescript
// Add this specific regex for naked destructuring imports
jsContent = jsContent.replace(
  /import\s*\{\s*([^}]*)\s*\}\s*from\s*["']react["']/g, 
  'import React, {$1} from "react"'
);

// Also improve other import patterns to be more robust
jsContent = jsContent.replace(
  /import\s+React\s+from\s*["']react["']\s*;?\s*import\s+\{\s*([^}]*)\s*\}\s*from\s*["']react["']/g,
  'import React, {$1} from "react"'
);
```

### 2. Add Syntax Error Detection and Fallback

```typescript
// Before returning the processed JS, add a validation step
try {
  // Test if the code can be parsed without errors
  new Function('"use strict";' + jsContent);
} catch (syntaxError) {
  // If there's a syntax error, return a fallback component
  console.error(`[API:COMPONENT:ERROR][ID:${componentId}] Syntax error in component, using fallback:`, syntaxError.message);
  
  jsContent = `
    // Fallback component due to syntax error: ${syntaxError.message}
    console.error('[Component Loader] Original component had syntax error: ${syntaxError.message}');
    window.__REMOTION_COMPONENT = props => {
      const React = window.React || { createElement: (type, props, ...children) => ({ type, props, children }) };
      return React.createElement('div', {
        style: { 
          backgroundColor: 'red', 
          color: 'white',
          padding: '20px',
          borderRadius: '8px',
          fontFamily: 'sans-serif',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          width: '100%'
        }
      }, [
        React.createElement('h2', {key: 'title'}, 'Component Syntax Error'),
        React.createElement('p', {key: 'error'}, '${syntaxError.message.replace(/'/g, "\\'")}'),
        React.createElement('p', {key: 'id'}, 'Component ID: ${componentId}')
      ]);
    };
  `;
}
```

### 3. Enhance the Component Code Processing Function

```typescript
/**
 * Preprocess component code to fix common issues
 */
function preprocessComponentCode(code: string, componentId: string): string {
  let processedCode = code;
  
  // Fix naked destructuring imports from React
  processedCode = processedCode.replace(
    /import\s*\{\s*([^}]*)\s*\}\s*from\s*["']react["']/g, 
    'import React, {$1} from "react"'
  );
  
  // Fix single-letter React imports
  processedCode = processedCode.replace(
    /import\s+([a-z])\s+from\s*["']react["']/g, 
    'import React from "react"'
  );
  
  // Fix React imports with trailing comma
  processedCode = processedCode.replace(
    /import\s+([a-zA-Z0-9_$]+),/g, 
    'import React,'
  );
  
  // Combine multiple React imports
  processedCode = processedCode.replace(
    /import\s+React\s+from\s*["']react["']\s*;?\s*import\s+\{\s*([^}]*)\s*\}\s*from\s*["']react["']/g,
    'import React, {$1} from "react"'
  );
  
  // Ensure Remotion is imported
  if (!processedCode.includes('from "remotion"') && !processedCode.includes("from 'remotion'")) {
    processedCode = `import { useCurrentFrame, useVideoConfig } from 'remotion';\n${processedCode}`;
  }
  
  return processedCode;
}
```

## Testing Procedure

1. Identify a sample component that's failing to load
2. Apply the fixes to the API route handler
3. Start the server and track requests to the component endpoint
4. Check browser console for errors and component loading status
5. Verify that components now load and render correctly

## Long-Term Improvements

1. **Standardize Component Generation**
   - Update the LLM prompt to generate components with consistent imports
   - Always use a standard pattern that includes `window.__REMOTION_COMPONENT = MyComponent`

2. **Add Component Validation**
   - Add a validation step during component build to detect syntax errors
   - Test-load components in an isolated environment before storing

3. **Enhance Error Recovery**
   - Improve the useRemoteComponent hook to handle script loading failures more gracefully
   - Add retry mechanisms and better error reporting

## Documentation Updates

We'll update the following documentation:
- `custom-component-export-fix.md`: Add the new patterns and fixes
- `custom-component-refresh-mechanism.md`: Add information about the fallback mechanism
- `progress.md`: Document the fix and its implementation details
