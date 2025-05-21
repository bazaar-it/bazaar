# ESM + Lazy Loading Implementation for Component Harness

This document outlines the implementation of ESM modules and lazy loading for the component testing harness in the context of Sprint 25.

## Implementation Overview

The component harness now implements a proper ESM + lazy loading pattern that:

1. Creates an import map in the document head to resolve bare module specifiers
2. Dynamically imports components as ES modules
3. Handles both components with and without default exports
4. Properly cleans up resources when components are reloaded or unmounted

## Key Details

### Import Map for External Dependencies

```javascript
importMapScript.textContent = JSON.stringify({
  imports: {
    'react': 'https://esm.sh/react@18.2.0',
    'react-dom': 'https://esm.sh/react-dom@18.2.0',
    'react/jsx-runtime': 'https://esm.sh/react@18.2.0/jsx-runtime',
    'remotion': 'https://esm.sh/remotion@4.0.290',
    '@remotion/player': 'https://esm.sh/@remotion/player@4.0.290',
    'remotion/': 'https://esm.sh/remotion@4.0.290/'
  }
});
```

This allows the ESM modules to resolve bare imports like `import { AbsoluteFill } from 'remotion'` without bundling.

### Dynamic ESM Loading

The implementation uses dynamic imports with the `import()` function:

```javascript
// Import the module dynamically
const module = await import(/* webpackIgnore: true */ url);

// Check if there's a default export which should be our component
if (module.default) {
  setCurrentComponent(() => module.default);
} else {
  // If no default export, look for any exported component
  const exportedKeys = Object.keys(module);
  if (exportedKeys.length > 0) {
    // Try to find a component in exports
    for (const key of exportedKeys) {
      if (typeof module[key] === 'function') {
        setCurrentComponent(() => module[key]);
        break;
      }
    }
  }
}
```

### Creating a Wrapper Component for Player

To properly use the dynamically loaded component with Remotion Player, we create a wrapper component:

```javascript
// Create a wrapper component that will be passed to Player
const Wrapper = currentComponent ? () => {
  const Comp = currentComponent;
  return <Comp />;
} : null;

// Then use it in the Player
<Player
  component={Wrapper}
  durationInFrames={videoConfig.meta.duration}
  fps={videoConfig.meta.fps}
  compositionWidth={videoConfig.meta.width}
  compositionHeight={videoConfig.meta.height}
  // ...other props
/>
```

This wrapper approach ensures that:
1. The component is properly initialized within the Remotion context
2. React hooks like `useCurrentFrame()` work correctly
3. The Player's context is properly passed down to the component

### Resource Management

The implementation properly manages blob URLs to prevent memory leaks:

```javascript
// Clean up old blob URLs when component unmounts or when new ones are created
useEffect(() => {
  return () => {
    if (componentUrl) {
      URL.revokeObjectURL(componentUrl);
    }
  };
}, []);

// In the compile function
if (componentUrl) {
  URL.revokeObjectURL(componentUrl);
  setComponentUrl(null);
}
```

## Sprint 25 Alignment

This implementation aligns with the Sprint 25 tickets:

### BAZAAR-255: ESM Build Pipeline

The component harness uses the API endpoint at `/api/test/compile-component` to transpile the TSX code to JavaScript and leverages ES modules for runtime execution, satisfying the need for an ESM build pipeline.

### BAZAAR-256: ESM Component Loading

The implementation handles dynamic loading of ES modules through:
- Creating blob URLs for the compiled JavaScript
- Using dynamic `import()` to load the modules
- Handling both default and named exports

### BAZAAR-258: Runtime Dependency Management

The import map approach provides runtime dependency management by:
- Resolving bare module specifiers without bundling
- Ensuring consistent versions of dependencies
- Supporting isolated testing of components without bundling the entire application

## Version Consistency

To ensure consistent behavior, the implementation uses the same version of Remotion (4.0.290) across all imports, preventing version conflicts that could cause unexpected issues.

## Error Handling

The implementation includes comprehensive error handling for:
- Compilation errors from the API
- Import errors when loading the ES module
- Missing exports in the compiled component

This ensures developers get clear feedback when issues occur. 