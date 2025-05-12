# Component Generation Fix - Standardizing Component Structure

## Current Problem

We've encountered issues with custom components not loading properly due to inconsistent code structure:

1. **Variable Naming Issues**: Components using minified variable names like `a.createElement` instead of `React.createElement`
2. **Inconsistent Imports**: Various import patterns (`import a from 'react'`, `import {useState} from 'react'`)
3. **Syntax Errors**: These issues cause syntax errors that prevent component execution

Rather than adding more regex patterns to fix specific issues, we need to address the root cause by standardizing how components are generated.

## Proposed Solution

### 1. Create a Standard Component Template

Create a rigid template that all generated components must follow:

```typescript
// src/server/workers/componentTemplate.ts

export const COMPONENT_TEMPLATE = `
"use client";

import React from 'react';
import { 
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  Sequence,
  Audio,
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
`;
```

### 2. Update Component Generation Process

Modify the LLM prompt to use a structured template approach:

```typescript
// Update in generateComponentCode.ts

const COMPONENT_SYSTEM_MESSAGE = `
You are a React component generator specialized in creating Remotion video components.
Always follow these strict rules:

1. NEVER import from Node.js built-in modules (fs, path, http, etc.)
2. NEVER use <img>, <Img>, or staticFile from Remotion
3. ALWAYS use the provided template structure exactly as shown
4. NEVER change variable names:
   - Always use 'React' for React imports
   - Always use 'window.__REMOTION_COMPONENT' for the component export
   - Always use standard camelCase for variables
5. Keep all logic within the component function

You will ONLY provide the implementation details that will be injected into 
the template, not the entire component. The template already has:
- "use client" directive
- All necessary imports
- Component structure with props
- window.__REMOTION_COMPONENT assignment

Your job is to ONLY fill in:
1. COMPONENT_NAME: A suitable name for the component (CamelCase)
2. COMPONENT_IMPLEMENTATION: The implementation logic
3. COMPONENT_RENDER: The JSX return structure
`;
```

### 3. Enhance the Component Processing and Validation

Add proper validation to ensure components match our template:

```typescript
// Add to generateComponentCode.ts

function enforceComponentTemplate(code: string, componentName: string): string {
  // Ensure componentName is valid
  const validComponentName = sanitizeComponentName(componentName);
  
  // Extract the implementation logic and render parts from the LLM response
  // This will require parsing the response to get just the implementation details
  const implementationMatch = code.match(/\/\/ Implementation details[\s\S]*?\/\/ Return statement/);
  const renderMatch = code.match(/<AbsoluteFill[\s\S]*?<\/AbsoluteFill>/);
  
  const implementation = implementationMatch 
    ? implementationMatch[0].trim() 
    : '// No implementation provided';
    
  const render = renderMatch 
    ? renderMatch[0].trim() 
    : '<AbsoluteFill><div>Error: No render content</div></AbsoluteFill>';
  
  // Now inject these into our template
  return COMPONENT_TEMPLATE
    .replace('COMPONENT_NAME', validComponentName)
    .replace('COMPONENT_IMPLEMENTATION', implementation)
    .replace('COMPONENT_RENDER', render);
}
```

### 4. Add Validation Before Storage

Add a validation step that ensures the component can be parsed before saving:

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

## Implementation Plan

1. Create the component template file
2. Update the system prompt in component generation
3. Implement the template enforcement function
4. Add syntax validation before storage
5. Return a fallback component if validation fails

This approach ensures we're fixing the root cause - inconsistent component generation - rather than trying to patch individual issues as they arise.

## Benefits

1. **Standardized Components**: All components follow the same structure
2. **Reduced Errors**: Consistent structure prevents variable naming issues
3. **Better Debugging**: Templated code is easier to debug
4. **Future-Proof**: New components will work without constant patching
5. **Less Maintenance**: Fewer regex patterns and edge-case handling

By enforcing a strict template at the source, we eliminate the need for complex regex transformations in the API routes.
