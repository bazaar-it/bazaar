//memory-bank/sprints/sprint25/BAZAAR-255-ESM-build-pipeline.md
# BAZAAR-255: Migrate Build Pipeline to ESM Format

## Current Implementation

### Build Process Overview
The current build pipeline in `src/server/workers/buildCustomComponent.ts` uses esbuild with the following configuration:

```typescript
const result = await esbuild.build({
  stdin: {
    contents: tsxCode,
    loader: 'tsx',
    resolveDir: process.cwd(),
  },
  bundle: true,
  minify: true,
  format: 'iife', // Immediately Invoked Function Expression
  globalName: 'COMPONENT_BUNDLE', // Makes the bundle attach to window.COMPONENT_BUNDLE
  // ... other configuration options
});
```

### Codebase Analysis Specifics (`src/server/workers/buildCustomComponent.ts` - as of {{ TODAY_DATE }})

Our review of the `compileWithEsbuild` function within `src/server/workers/buildCustomComponent.ts` confirms and elaborates on the above:

*   **`esbuild` Configuration:**
    *   `format: 'iife'` is indeed used, confirming the output is an Immediately Invoked Function Expression.
    *   `platform: 'browser'` and `target: 'es2020'` are specified.
    *   `external: ['react', 'remotion']` is present, meaning these are not bundled, and the IIFE expects them to be available in the global scope.
*   **Global Registration Mechanism:**
    *   The code uses a function (conceptually similar to the `wrapTsxWithGlobals` mentioned in other planning documents, though the exact name might differ in the actual file) to wrap the user's TSX code. 
    *   This wrapper is responsible for ensuring React and Remotion are accessed from the global scope (e.g., `const React = window.React;`).
    *   Crucially, this wrapper also injects the logic that assigns the user's component to `window.__REMOTION_COMPONENT = YourExportedComponent;`.
    *   This confirms that the component bundle is designed to pollute the global namespace directly with `window.__REMOTION_COMPONENT`.
*   **No ESM Output:** There is no mechanism currently in place to output standard ES modules. The entire pipeline is geared towards creating self-executing IIFEs that rely on globals.

### Component Registration
Components currently register themselves to the global window object:
```javascript
(function register() {
  if (typeof window !== 'undefined') {
    try {
      window.__REMOTION_COMPONENT = ComponentName;
      console.log('Successfully registered component: ComponentName');
    } catch (e) {
      console.error('Error registering component:', e);
    }
  }
})();
```

### Key Limitations
1. **Global namespace pollution**: Using window.__REMOTION_COMPONENT means only one component can be loaded at a time
2. **Hard to debug**: Issues with the global registration are difficult to diagnose
3. **Non-standard loading**: Uses a custom script tag injection pattern rather than standard module imports
4. **Remotion incompatibility**: Doesn't align with Remotion's recommended approach for dynamic components

## Proposed Changes

### 1. Switch esbuild from `format: 'iife'` to `format: 'esm'`

#### What and Why
Change the esbuild output format from IIFE (Immediately Invoked Function Expression) to ESM (ECMAScript Modules). This enables proper module imports/exports rather than global namespace pollution.

```typescript
const result = await esbuild.build({
  stdin: {
    contents: tsxCode,
    loader: 'tsx',
    resolveDir: process.cwd(),
  },
  bundle: true,
  minify: true,
  format: 'esm', // Changed from 'iife'
  // globalName: removed, not needed for ESM
  // ... other configuration options
});
```

#### Potential Effects
- Output will be standard ES modules with `import` and `export` statements
- Component will no longer attach to `window.COMPONENT_BUNDLE`
- Content-Type for R2 storage should be set to `application/javascript` instead of our custom approach

#### Implementation Considerations
- Ensure R2 storage and retrieval methods expect ESM format
- Update content type in R2 storage calls to `application/javascript`
- Remove any code that references `window.COMPONENT_BUNDLE`

### 2. Remove global name wrapper and window.__REMOTION_COMPONENT approach

#### What and Why
Remove the IIFE wrapper and the `window.__REMOTION_COMPONENT` assignment. Instead, rely on standard ES module exports that React.lazy can consume.

#### Potential Effects
- Components will export themselves normally via `export default ComponentName`
- The component template will be simplified, removing the self-invoking function
- The `useRemoteComponent` hook will need a complete rewrite to use `React.lazy` instead

#### Implementation Considerations
- Update `wrapTsxWithGlobals()` function to remove IIFE wrapping
- Remove all code referencing `window.__REMOTION_COMPONENT` 
- Update templates to use standard export syntax only
- Verify React.lazy can properly resolve the module exports

### 3. Mark React/Remotion as external dependencies in the build

#### What and Why
Configure esbuild to treat React, ReactDOM, and Remotion as external dependencies. This ensures the component imports these modules from the host application rather than bundling them again.

```typescript
const result = await esbuild.build({
  // ...other options
  external: ['react', 'react-dom', 'remotion', '@remotion/*'],
  // ...
});
```

#### Potential Effects
- Bundle size will be significantly smaller
- Components will import React/Remotion directly from the host application
- Avoids multiple versions of React running simultaneously (which causes errors)

#### Implementation Considerations
- Need to ensure the host environment properly provides these modules
- May require import maps in the browser (discussed in BAZAAR-258)
- Test with different React/Remotion versions to ensure compatibility
- May need to adjust import paths depending on how modules are exposed

## Integration Points

### Build Verification
After building the ESM component, a validation step should import it to verify:
```typescript
// Add after build
try {
  const module = await import('file://path/to/built-component.js');
  const Component = module.default;
  
  if (typeof Component !== 'function') {
    throw new Error('Component is not a function');
  }
  
  console.log('ESM component validated successfully');
} catch (err) {
  console.error('ESM validation failed:', err);
  // Handle appropriately
}
```

### Upload Changes
When uploading to R2, set the correct content type:
```typescript
await r2Client.putObject({
  Bucket: 'components',
  Key: `${componentId}.js`,
  Body: result.outputFiles[0].contents,
  ContentType: 'application/javascript', // Ensure proper MIME type
});
```

## Testing Strategy

1. **Unit Tests**: Update tests in `src/tests/remotion` to verify ESM output
2. **Integration Tests**: Test the full pipeline from build to load
3. **Compatibility Testing**: Ensure components work with different Remotion versions
4. **Performance Testing**: Measure build times and bundle sizes before/after

## Implementation Checklist

- [ ] Update `buildCustomComponent.ts` esbuild configuration
- [ ] Remove global name wrapper and IIFE format
- [ ] Add React/Remotion as external dependencies
- [ ] Update R2 storage content type setting
- [ ] Add ESM validation step after build
- [ ] Update related tests to expect ESM output
- [ ] Integration test with updated component loading

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Existing components break | High | Build a converter for old components |
| External dependency resolution fails | High | Fall back to bundling everything (larger size) |
| R2 serving incorrect content type | Medium | Add content type detection/correction |
| Dynamic import browser compatibility | Low | Add polyfill for older browsers |
