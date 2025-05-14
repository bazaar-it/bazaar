# Enhanced LLM Prompting System for Component Generation

## Overview

As part of Sprint 20's Component Recovery System implementation, we've significantly enhanced the LLM prompting system to prevent common syntax errors that lead to component generation failures. These improvements work alongside the new TSX preprocessor to create a more robust component generation pipeline.

## Prompt Improvements

### 1. Explicit Syntax Requirements

The prompt now includes a dedicated "SYNTAX REQUIREMENTS" section with clear instructions:

```
### SYNTAX REQUIREMENTS - FOLLOW EXACTLY:
- The FIRST line MUST be: // src/remotion/components/scenes/${componentName}.tsx
- NEVER declare the same variable twice (e.g., 'const frame = useCurrentFrame()' should appear only ONCE)
- ALWAYS properly close all JSX tags (use self-closing tags for elements like <img />, <path />, etc.)
- ESCAPE any HTML/XML inside string literals using &lt; and &gt; instead of < and >
- ENSURE the component has 'export default ${componentName}' at the end
- VERIFY all opening and closing brackets/braces match properly
```

### 2. Concrete Examples Section

We've added examples of correct code patterns to help guide the LLM:

```
### EXAMPLES OF PROPER SYNTAX:
// Correct - Single declaration of hooks at the beginning
const frame = useCurrentFrame();
const { width, height, fps, durationInFrames } = useVideoConfig();
// Correct - Properly escaped HTML in strings
const svgMarkup = "&lt;circle cx='50' cy='50' r='40'/&gt;";
// Correct - Properly closed JSX tags
return (
  <div>
    <circle cx={50} cy={50} r={40} />
  </div>
);
```

### 3. Common Errors to Avoid

The prompt explicitly shows anti-patterns that should be avoided:

```
### COMMON ERRORS TO AVOID:
// ERROR: Redeclaring frame variable
const frame = useCurrentFrame();
// Later in the code... DON'T DO THIS:
const frame = useCurrentFrame(); // Error: 'frame' already declared

// ERROR: Unescaped HTML in strings
const svgMarkup = "<circle cx='50' cy='50' r='40'/>"; // Use &lt; and &gt; instead

// ERROR: Unclosed JSX tags
return (
  <div>
    <circle cx={50} cy={50} r={40}> // Missing closing tag or self-close
  </div>
);
```

## Template Enhancements

The component template (`componentTemplate.ts`) has been improved to:

1. Include the file path comment as the first line
2. Add warning comments about not redeclaring hooks
3. Include reminders about properly closing JSX tags
4. Pre-sanitize implementation code to remove duplicate hook declarations

```typescript
export const COMPONENT_TEMPLATE = `
// src/remotion/components/scenes/{{COMPONENT_NAME}}.tsx
// Component generated with Bazaar template - browser-compatible version

// Using globals provided by Remotion environment
const React = window.React;
// ... other imports ...

// SYNTAX NOTE: Do NOT declare frame or videoConfig variables again below
// Component implementation goes here
const {{COMPONENT_NAME}} = (props) => {
  // IMPORTANT: These hook calls should NOT be duplicated anywhere else in the component
  const frame = useCurrentFrame();
  const { width, height, fps, durationInFrames } = useVideoConfig();
  
  // Animation Design Brief data is available in props.brief
  {{COMPONENT_IMPLEMENTATION}}
  
  // REMINDER: Always properly close all JSX tags
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      {{COMPONENT_RENDER}}
    </AbsoluteFill>
  );
};
// ... export statements ...
`;
```

## Validation Integration

The component validation process now integrates with the TSX preprocessor:

1. First tries to preprocess and fix common issues using `preprocessTsx`
2. Returns information about what was fixed for logging and storage
3. Preserves the original code for debugging when issues are automatically fixed

```typescript
function validateComponentSyntax(
  code: string,
  componentName: string = 'CustomComponent'
): { 
  valid: boolean; 
  error?: string; 
  processedCode?: string;
  wasFixed?: boolean;
  issues?: string[];
} {
  // First try to preprocess and fix common issues
  let processedCode = code;
  let wasFixed = false;
  let issues: string[] = [];
  
  try {
    // Attempt to fix common issues with the preprocessor
    const preprocessResult = preprocessTsx(code, componentName);
    
    if (preprocessResult.fixed) {
      processedCode = preprocessResult.code;
      wasFixed = true;
      issues = preprocessResult.issues;
      // ... logging ...
    }
  } catch (preprocessError) {
    // ... error handling ...
  }
  
  // Validate syntax with the possibly fixed code
  // ... validation logic ...
}
```

## Impact and Benefits

These improvements to the LLM prompting system work together with the Component Recovery System to:

1. **Prevent Errors Before They Occur**: By providing explicit guidance, examples, and anti-patterns
2. **Fix Errors Automatically**: By preprocessing the LLM output before validation
3. **Recover from Failures**: By identifying fixable components and providing repair options

The overall result should be a dramatic reduction in component generation failures, improving the user experience and reducing frustration when working with custom components.

## Integration with Component Recovery System

These prompt improvements complement the Component Recovery System by:

1. Reducing the number of components that need fixing in the first place
2. Ensuring that when components do need fixing, the errors are of the types our preprocessor can handle
3. Providing better error information to help users understand issues

Together, these improvements create a more robust end-to-end pipeline for custom component generation. 