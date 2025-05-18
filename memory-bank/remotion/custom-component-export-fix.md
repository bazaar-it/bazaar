# Custom Component Export Fix

## Problem Description

We were experiencing issues with custom Remotion components not loading properly when added to the timeline. The browser console showed errors like:

```
Error: Unexpected identifier 'React'. import call expects one or two arguments.
[useRemoteComponent] Component loaded but __REMOTION_COMPONENT not found: 7bff90dd-a813-455e-9622-c2d7eb7fa36f
[CustomScene] Metadata fetch timeout for component 7bff90dd-a813-455e-9622-c2d7eb7fa36f after 5 seconds
```

The component JavaScript files had several issues:

1. **Minified/Incorrect Imports**: The JavaScript had imports like `import a from "react"` or `import o, {useMemo as w} from "react"` instead of proper React imports.
2. **Missing Window Assignment**: The components weren't being properly assigned to `window.__REMOTION_COMPONENT`, which is what our `useRemoteComponent` hook looks for.
3. **Missing Audio Files**: Components were referencing audio files that might not exist, causing runtime errors.
4. **Ineffective Export Handling**: Our previous approach tried to handle exports using specific patterns that didn't match all variations.
5. **Import Syntax Errors**: In some cases, the ES module import syntax had errors causing JavaScript parsing failures.

## Enhanced Solution (2025-05-12)

We implemented a comprehensive system of fixes and safeguards in the API route handler to address all component loading issues:

1. **Modular Code Processing**: Split the component handling into specialized functions:
   - `preprocessComponentCode()`: Fixes syntax issues before evaluation
   - `analyzeComponentCode()`: Intelligently identifies the main component variable

2. **Expanded Import Fixes**: Enhanced regex replacements to handle many import patterns:
   - `import a from "react"` → `import React from "react"`
   - `import o, {useMemo as w} from "react"` → `import React, {useMemo as w} from "react"`
   - `import * as R from "react"` → `import React from "react"`
   - Multiple import statements → Combined imports where possible
   - Removed problematic ES module syntax that causes parsing errors

3. **Multi-Layer Component Detection**: Implemented a hierarchical approach to identify component variables:
   - First pass: Analyze code structure looking for export statements
   - Second pass: Look for React component patterns (capitalized function names, Scene in name)
   - Runtime pass: Inspect global scope for potential component variables
   - Filtered detection: Prioritizes variables that follow React naming conventions

4. **Enhanced Fallback Mechanism**: Added a robust runtime detection system:
   - Runtime global scope scanning to find functions that look like components
   - Prioritization of capitalized variables (following React conventions)
   - Clear console logging at each stage for debugging
   - Emergency fallback that creates a placeholder component if all detection fails

## Code Implementation

The solution includes specialized helper functions in `/src/app/api/components/[componentId]/route.ts`:

```typescript
/**
 * Preprocess the component code to fix common issues before evaluation.
 */
function preprocessComponentCode(code: string, componentId: string): string {
  // Track all fixes applied for logging
  const fixes: string[] = [];
  let processedCode = code;
  
  // Fix React imports that might be causing issues
  if (processedCode.match(/import\s+([a-z])\s+from\s*["']react["']/)) {
    processedCode = processedCode.replace(/import\s+([a-z])\s+from\s*["']react["']/g, 'import React from "react"');
    fixes.push('Fixed single-letter React import');
  }
  
  // Fix namespace imports
  if (processedCode.match(/import\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from\s*["']react["']/)) {
    processedCode = processedCode.replace(
      /import\s+\*\s+as\s+([A-Za-z0-9_$]+)\s+from\s*["']react["']/g, 
      'import React from "react"'
    );
    fixes.push('Fixed namespace React import');
  }
  
  // Fix invalid ES module syntax
  processedCode = processedCode.replace(
    /import\s+React\s+from\s*["']react["']\s*;?\s*import\s+\{/g, 
    'import React, {'
  );
  
  // Ensure Remotion is imported properly
  if (!processedCode.includes('from "remotion"') && !processedCode.includes('from \'remotion\'')) {
    processedCode = `import { useCurrentFrame, useVideoConfig } from 'remotion';\n${processedCode}`;
    fixes.push('Added missing Remotion imports');
  }
  
  return processedCode;
}

/**
 * Analyze the component code to extract information about exports and component variables.
 */
function analyzeComponentCode(code: string, componentId: string): { mainComponent: string | null } {
  // Try to find exported components with different patterns
  // 1. Named exports with "as" keyword
  const namedExportAsMatch = code.match(
    /export\s*\{\s*([A-Za-z0-9_$]+)\s+as\s+([A-Za-z0-9_$]+)\s*\}/
  );
  if (namedExportAsMatch && namedExportAsMatch[1]) {
    return { mainComponent: namedExportAsMatch[1] };
  }
  
  // 2. Look for React component declarations with "Scene" in the name
  const sceneComponentMatch = code.match(
    /(?:var|const|let|function)\s+([A-Z][A-Za-z0-9_$]*Scene[A-Za-z0-9_$]*)/
  );
  if (sceneComponentMatch && sceneComponentMatch[1]) {
    return { mainComponent: sceneComponentMatch[1] };
  }
  
  // No component found
  return { mainComponent: null };
}
```

And our enhanced runtime detection fallback:

```javascript
// Enhanced component detection and registration
(function detectAndRegisterComponent() {
  // Log all available exports and variables for debugging
  console.log('[Component Loader] Available globals:', Object.keys(window).filter(k => !k.startsWith('__') && typeof window[k] === 'function'));
  
  // First, try to find named exports (they're often used in minified code)
  const namedExports = {};
  try {
    // Look for any capitalized variables that might be React components
    Object.keys(window).forEach(key => {
      if (
        key !== 'React' && 
        typeof window[key] === 'function' && 
        /^[A-Z]/.test(key)
      ) {
        namedExports[key] = window[key];
      }
    });
    
    // If we found any likely component exports, use the first one
    const exportKeys = Object.keys(namedExports);
    if (exportKeys.length > 0) {
      const bestMatch = exportKeys.find(k => k.includes('Scene') || k.includes('Component')) || exportKeys[0];
      window.__REMOTION_COMPONENT = namedExports[bestMatch];
      console.log('[Component Loader] Found component export:', bestMatch);
      return;
    }
  } catch (e) {
    console.error('[Component Loader] Error finding exports:', e);
  }

  // If all else fails - create an emergency fallback component
  window.__REMOTION_COMPONENT = props => {
    return React.createElement('div', {
      style: { 
        backgroundColor: 'red', 
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        fontFamily: 'sans-serif'
      }
    }, [
      React.createElement('h2', {key: 'title'}, 'Component Loading Error'),
      React.createElement('p', {key: 'desc'}, 'The component code loaded but no valid component was found.')
    ]);
  };
})();
```

## Testing and Verification

To verify that components are now loading properly:

1. **Check Console Logs**: Look for messages like:
   ```
   [Component Loader] Registered component: Y
   [Component Loader] Available globals: [...]
   ```

2. **Component Preview**: The component should now appear in the timeline preview without error

3. **Check Network Tab**: Verify that `/api/components/[componentId]` requests are successful

4. **Monitor Error Logs**: The following errors should no longer appear:
   ```
   Error: Unexpected identifier 'React'. import call expects one or two arguments.
   [useRemoteComponent] Component loaded but __REMOTION_COMPONENT not found
   [CustomScene] Metadata fetch timeout for component
   ```

## Example Scenarios Handled

### Scenario 1: Minified Component with Named Export
```javascript
"use client";import o,{useMemo as w}from"react";import{AbsoluteFill as B}from"remotion";
var Y=({brief:n})=>{...}
export{Y as BluePlanetCirclingScene};
```

Transformation:
1. Fix React import: `import React,{useMemo as w}from"react"`
2. Identify `Y` as the component variable (named export pattern)
3. Set `window.__REMOTION_COMPONENT = Y`

### Scenario 2: Invalid Import Syntax
```javascript
import a from "react";import{useState,useEffect}from"react";
// Double import causes syntax error
```

Transformation:
1. Combine imports: `import React, {useState, useEffect} from "react"`
2. Convert React imports to global references using `window.React`
3. Continue with component detection

### Scenario 3: No Exports Found
```javascript
// Component with no clear exports
const renderScene = (props) => {...}
```

Fallback Process:
1. Runtime detection looks for capitalized variables
2. If none found, searches all function variables
3. Creates emergency fallback component if detection fails

## Comprehensive Approach to Component Loading

Our solution now addresses custom component loading issues through multiple layers:

1. **Preprocessing**: Fix known syntax issues before they cause runtime errors
2. **Static Analysis**: Identify components through code structure analysis
3. **Runtime Detection**: Find components in the global scope when they load
4. **Visual Fallbacks**: Provide a red error component when all detection fails
5. **Improved Logging**: Clear debugging output at each stage

## Future Improvements

1. **Standardize Component Generation**: Update the LLM prompt and component generation code to produce standardized export patterns

2. **Component Validation Pipeline**: Add a validation step during component builds:
   - Parse generated components to verify syntax before storage
   - Test load the component in a sandbox environment
   - Validate against a schema of permitted patterns

3. **Enhanced Asset Management**: Implement proper asset handling:
   - Allow uploads of images and audio
   - Provide URL patterns for component access
   - Cache assets with the components

4. **Framework Standardization**: Move toward a more standardized component framework:
   - Define a specific export pattern all components must follow
   - Create a component template system
   - Standardize props and interfaces

## Documentation Reference

This documentation should be used in conjunction with:
- `custom-component-refresh-mechanism.md`: Details on component refresh system
- `custom-component-image-handling.md`: Information on image limitations
- `scene-types-reference.md`: Reference for available scene types