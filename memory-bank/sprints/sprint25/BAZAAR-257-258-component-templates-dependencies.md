# BAZAAR-257/258: ESM Component Templates and Dependencies

## Overview

These tickets update the component templates and dependency handling for the ESM module format migration. BAZAAR-257 focuses on updating component templates for ESM compatibility, while BAZAAR-258 improves dependency handling for ESM modules.

## BAZAAR-257: ESM Component Templates

### Key Changes

1. **Removed IIFE Wrapper**
   - Eliminated the Immediately Invoked Function Expression that wrapped component code
   - Removed the global namespace pollution with `window.__REMOTION_COMPONENT`
   - Switched to standard ESM export patterns

2. **Default Export Addition**
   - Ensured all component templates include explicit default exports
   - Added validation to verify default exports exist
   - Provides automatic default export for named exports when needed

3. **Template Structure Simplification**
   - Cleaned up the template structure for better readability
   - Removed unnecessary boilerplate code
   - Improved comments and documentation in the template

### Before/After Comparison

**Before (IIFE pattern):**
```typescript
// Component code here...

// CRITICAL: Register component for Remotion - DO NOT REMOVE
(function register() {
  if (typeof window !== 'undefined') {
    try {
      window.__REMOTION_COMPONENT = MyComponent;
      console.log('Successfully registered component: MyComponent');
    } catch (e) {
      console.error('Error registering component:', e);
    }
  }
})();

export default MyComponent;
```

**After (ESM pattern):**
```typescript
// Component code here...

// Export the component as default for ESM compatibility
export default MyComponent;
```

## BAZAAR-258: Dependency Handling

### Key Changes

1. **External Dependencies**
   - Marked React, React-DOM, and Remotion packages as external dependencies
   - These are now imported at runtime rather than bundled
   - Reduces bundle size and prevents duplicate React instances

2. **Import Preservation**
   - Updated sanitizing logic to preserve important imports
   - React and Remotion imports are kept intact during build
   - Better static analysis of import usage

3. **Code Bundling Improvements**
   - Optimized esbuild configuration for ESM output
   - Ensured proper Tree-shaking works with ESM format
   - Improved minification for production builds

### Configuration Change

The key esbuild configuration change:

```typescript
// Before
{
  format: 'iife',
  globalName: 'COMPONENT_BUNDLE',
  external: [],
}

// After
{
  format: 'esm',
  external: ['react', 'react-dom', 'remotion', '@remotion/*'],
}
```

## Testing

The new templates and dependency handling have been tested with:

1. Various component export patterns (default export, named export, etc.)
2. Components with different import patterns (React, Remotion imports)
3. Runtime behavior validation
4. Bundle size and performance analysis

## Benefits

These changes provide several benefits:

1. Better integration with modern React patterns (React.lazy, Suspense)
2. Reduced bundle size by externalizing common dependencies
3. Cleaner component code without global namespace pollution
4. Better error handling and debugging experience 