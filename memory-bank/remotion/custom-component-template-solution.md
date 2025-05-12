# Custom Component Template Solution

## Problem Overview

We've encountered persistent issues with custom Remotion components failing to load properly due to:

1. **Syntax Errors**: Invalid import patterns like `import {useState} from 'react'` causing script evaluation failures
2. **Component Export Issues**: Inconsistent export patterns making it difficult to find and register the component
3. **Missing `window.__REMOTION_COMPONENT` Assignment**: The component not being registered globally as required

## Solution: Template-Based Component Generation

We've implemented a robust solution that addresses these issues at their source by standardizing the component generation process:

### 1. Standard Component Template

We created a template file (`src/server/workers/componentTemplate.ts`) that all generated components must follow:

```typescript
// Template structure
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

// Component implementation goes here
const COMPONENT_NAME = (props) => {
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  
  // Implementation details go here
  COMPONENT_IMPLEMENTATION
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      COMPONENT_RENDER
    </AbsoluteFill>
  );
};

// This is required - DO NOT modify this line
window.__REMOTION_COMPONENT = COMPONENT_NAME;
```

### 2. Updated Component Generation Process

We've modified the LLM component generation process to use this template:

1. **Modified LLM System Message**: Instructed the LLM to provide only the implementation parts that fit into the template
2. **Template Application**: Apply the template using the `applyComponentTemplate()` function
3. **Syntax Validation**: Validate the generated component before storage

### 3. API Route Detection

The API route now detects template-based components:

```typescript
// Check if a component is using our template format
const isTemplatedComponent = jsContent.includes('window.__REMOTION_COMPONENT =') && 
                           !jsContent.includes('function detectAndRegisterComponent()');

if (isTemplatedComponent) {
  // For template-based components, minimal processing is needed
  apiRouteLogger.debug("Component uses template format, skipping transformation");
  
  // Still apply basic preprocessing for safety
  jsContent = preprocessComponentCode(jsContent, componentId);
} else {
  // For legacy components, apply full transformations
  // ...
}
```

## Implementation Details

### Component Template File

The implementation includes:

1. **Template String**: A standardized template with placeholders
2. **Helper Function**: `applyComponentTemplate()` for applying the template

```typescript
export function applyComponentTemplate(
  componentName: string,
  implementation: string = '',
  render: string = '<div>Empty component</div>'
): string {
  return COMPONENT_TEMPLATE
    .replace(/{{COMPONENT_NAME}}/g, componentName)
    .replace('{{COMPONENT_IMPLEMENTATION}}', implementation)
    .replace('{{COMPONENT_RENDER}}', render);
}
```

### Modified LLM Prompt

The LLM prompt now instructs the model to only provide implementation details:

```
You will ONLY provide implementation details following a very strict template structure.

You will NOT write complete component files. Instead:
1. ONLY provide the COMPONENT_NAME, COMPONENT_IMPLEMENTATION, and COMPONENT_RENDER parts.
2. These parts will be inserted into our template that already has:
   - "use client" directive
   - All necessary imports from React and Remotion
   - Component structure with props
   - window.__REMOTION_COMPONENT assignment
```

### Syntax Validation

We perform syntax validation to catch errors before storing the component:

```typescript
function validateComponentSyntax(code: string): { valid: boolean; error?: string } {
  try {
    // Use Function constructor to check if code parses
    // This won't execute the code, just check syntax
    new Function('"use strict";' + code);
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: error instanceof Error ? error.message : String(error)
    };
  }
}
```

### Fallback Mechanism

If syntax errors are found, we generate a fallback component:

```typescript
// Create fallback component with error message
const fallbackComponent = applyComponentTemplate(
  sanitizedComponentName,
  `// Original implementation had syntax errors: ${validation.error}`,
  `<div style={{ backgroundColor: 'rgba(255, 0, 0, 0.2)', padding: '20px', borderRadius: '8px', color: 'red' }}>
    <h2>Component Error</h2>
    <p>The component could not be generated correctly.</p>
  </div>`
);
```

## Testing and Validation

1. **Syntax Testing**: All components are syntax-checked before storage
2. **Template Format**: Each component has a predictable structure
3. **Consistent Global Registration**: Every component sets `window.__REMOTION_COMPONENT`
4. **Backward Compatibility**: Legacy components still work with the enhanced preprocessing

## Benefits

This solution offers several benefits:

1. **Error Prevention**: Components have a consistent structure that prevents syntax errors
2. **Simplified Maintenance**: No need for complex regex transformations in the API routes
3. **Better Debugging**: Standardized component code is easier to debug
4. **Reduced Processing**: Template-based components need minimal processing at runtime
5. **Future-Proof**: New components work without requiring constant patching

## Migration Process

We've implemented this solution with a gradual migration approach:

1. **New Components**: Generated using the template system
2. **Legacy Components**: Still supported with the existing preprocessing functions
3. **API Detection**: The API route detects which type of component it's serving and applies the appropriate handling

By addressing the component generation issues at their source, we've created a more robust and maintainable solution that should eliminate most component loading issues. 