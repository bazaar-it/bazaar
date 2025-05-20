//memory-bank/sprints/sprint25/BAZAAR-257-component-templates.md
# BAZAAR-257: Update Component Generation Templates

## Current Implementation

### Component Template Structure
The current component template in `src/server/workers/componentTemplate.ts` includes:

1. Standard imports for React and Remotion
2. Component interface/type definitions
3. The main component function
4. A self-invoking function that registers the component to `window.__REMOTION_COMPONENT`. This structure is designed to be compatible with the current build process (detailed in BAZAAR-255 and observed in `src/server/workers/buildCustomComponent.ts`) which wraps the component code and expects this global registration.
5. An `export default` statement that's functionally unused with the current IIFE approach

```typescript
// Simplified current template structure
export const COMPONENT_TEMPLATE = `
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, /* ... */ } from 'remotion';

interface {{COMPONENT_NAME}}Props {
  data: Record<string, unknown>;
}

export const {{COMPONENT_NAME}}: React.FC<{{COMPONENT_NAME}}Props> = ({ data }) => {
  // Component implementation
  // {{COMPONENT_IMPLEMENTATION}}
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      {{COMPONENT_RENDER}}
    </AbsoluteFill>
  );
};

// Self-invoking registration function
(function register() {
  if (typeof window !== 'undefined') {
    try {
      window.__REMOTION_COMPONENT = {{COMPONENT_NAME}};
      console.log('Successfully registered component: {{COMPONENT_NAME}}');
    } catch (e) {
      console.error('Error registering component:', e);
    }
  }
})();

export default {{COMPONENT_NAME}};
`;
```

### LLM Generation Process
The LLM generates component implementations that assume:
1. Global access to React and Remotion
2. Registration to `window.__REMOTION_COMPONENT` is required
3. Components must follow very specific patterns to work with our loading system

## Proposed Changes

### 1. Ensuring all generated components use proper export default syntax

#### What and Why
Simplify the component template to focus on clean ESM exports, making the default export the primary means of accessing the component. This aligns with the requirements outlined in `esm-lazy.md` for dynamically loading Remotion components:

```typescript
// Simplified updated template structure
export const COMPONENT_TEMPLATE = `
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, /* ... */ } from 'remotion';

interface {{COMPONENT_NAME}}Props {
  data: Record<string, unknown>;
}

const {{COMPONENT_NAME}}: React.FC<{{COMPONENT_NAME}}Props> = ({ data }) => {
  // Component implementation
  // {{COMPONENT_IMPLEMENTATION}}
  
  return (
    <AbsoluteFill style={{ backgroundColor: 'transparent' }}>
      {{COMPONENT_RENDER}}
    </AbsoluteFill>
  );
};

// This is now the primary export, not just a secondary export
export default {{COMPONENT_NAME}};
`;
```

#### Potential Effects
- Clean, standard ESM module structure
- Removal of unnecessary self-invoking registration function
- Components export a single, consistent interface
- Compatible with dynamic import and React.lazy
- Simpler output code that's easier to debug

#### Implementation Considerations
- Update prompt engineering for the LLM to instruct it about the new export pattern, emphasizing the `export default ComponentName;` and the removal of any self-registering IIFE.
- The removal of the self-invoking registration function from the template is critical. The updated ESM build pipeline (BAZAAR-255) will no longer inject IIFE-specific wrappers or expect global registration, relying solely on the `export default`.
- Validate that components properly include the export default statement
- Consider adding a validation step that checks for proper exports
- Verify components work with existing animations/transitions

### 2. Switching from global references to standard import statements

#### What and Why
Instead of assuming global availability of React and Remotion, use proper ES module imports. The template already does this correctly, but we need to ensure:

1. LLM-generated code doesn't try to use globals (e.g., `window.React`).
2. Our build system (BAZAAR-255) keeps the imports intact by marking React/Remotion as external dependencies.
3. The runtime environment (BAZAAR-258) can properly resolve these imports, potentially via import maps, as suggested in `esm-lazy.md`.

```typescript
// Proper import pattern to maintain
import React from 'react';
import { 
  AbsoluteFill, 
  useCurrentFrame, 
  useVideoConfig, 
  Sequence, 
  interpolate, 
  Easing 
} from 'remotion';
```

#### Potential Effects
- Cleaner component code with explicit dependencies
- Proper tree-shaking of unused imports
- Better IDE support with import auto-completion
- Type checking for imported functions and components
- Consistent module resolution behavior

#### Implementation Considerations
- Ensure esbuild configuration (BAZAAR-255) preserves import statements by marking dependencies (`react`, `remotion`, etc.) as external.
- Update component validation to check for proper imports and the absence of direct global access (e.g., `window.React`).
- LLM prompt engineering needs to emphasize using imports, not globals.
- Add import validation to the code generation pipeline

## Integration with Other Tickets

### Build Pipeline (BAZAAR-255)
- Templates should work with the ESM output format
- Remove code related to global registration

### Component Loading (BAZAAR-256)
- Components need proper default exports for React.lazy to work
- Import statements must match the loading environment expectations

### Runtime Dependencies (BAZAAR-258)
- Import paths may need to be adjusted based on our runtime dependency strategy
- Consider version compatibility in imports

## Component Template Validation

Add a validation step to ensure components follow the new pattern:

```typescript
function validateComponentTemplate(code: string): boolean {
  // Check for default export
  if (!code.includes('export default')) {
    console.error('Component missing default export');
    return false;
  }
  
  // Check for proper imports
  if (!code.includes('import React from') || !code.includes('import {') || !code.includes('} from \'remotion\'')) {
    console.error('Component missing required imports');
    return false;
  }
  
  // Check for no global registration
  if (code.includes('window.__REMOTION_COMPONENT')) {
    console.error('Component should not use window.__REMOTION_COMPONENT');
    return false;
  }
  
  return true;
}
```

## LLM Prompt Updates

The LLM prompt for component generation needs to be updated:

```
Generate a Remotion component with the following requirements:
1. Use standard ES module imports for React and Remotion
2. Follow the React functional component pattern
3. Include a proper "export default ComponentName" statement 
4. DO NOT use window.__REMOTION_COMPONENT or any global registration
5. Import only what you need from remotion (AbsoluteFill, useCurrentFrame, etc.)

The component should implement: [description of animation]
```

## Testing Strategy

1. **Unit Tests**:
   - Test template application with various component implementations
   - Verify output has proper exports and no global registration

2. **Integration Tests**:
   - Test LLM generation with new prompts
   - Verify dynamic component loading works with new template

3. **Regression Tests**:
   - Ensure existing animations still work with new template structure
   - Check for performance impact of template changes

## Implementation Checklist

- [ ] Update `COMPONENT_TEMPLATE` in componentTemplate.ts
- [ ] Remove self-invoking registration function
- [ ] Update LLM prompts for component generation
- [ ] Add template validation function
- [ ] Test with various component complexities
- [ ] Update related documentation and examples

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM generates incompatible code | High | Add validation step with auto-correction |
| Breaking existing components | High | Version the template system for backward compatibility |
| Missing imports causing runtime errors | Medium | Add import validation and auto-correction |
| Performance impact of template changes | Low | Benchmark before/after and optimize if needed |
