# ESM + Lazy Loading Implementation for Component Harness

This document outlines the implementation of ESM modules and lazy loading for the component testing harness in the context of Sprint 25.

## Implementation Overview

The component harness now fully implements the Sprint 25 ESM + lazy loading approach:

1. Creates an import map in the document head to resolve bare module specifiers
2. Dynamically imports components as ES modules
3. Handles both components with and without default exports (auto-exports if needed)
4. Properly cleans up resources when components are reloaded or unmounted
5. Integrates with the shared module registry system (BAZAAR-263)
6. Uses consistent versioning from RUNTIME_DEPENDENCIES
7. Implements proper error boundaries for component failures

## Key Details

### Import Map for External Dependencies

```javascript
importMapScript.textContent = JSON.stringify({
  imports: {
    'react': `https://esm.sh/react@${RUNTIME_DEPENDENCIES.react}`,
    'react-dom': `https://esm.sh/react-dom@${RUNTIME_DEPENDENCIES.reactDom}`,
    'react/jsx-runtime': `https://esm.sh/react@${RUNTIME_DEPENDENCIES.react}/jsx-runtime`,
    'remotion': `https://esm.sh/remotion@${RUNTIME_DEPENDENCIES.remotion}`,
    '@remotion/player': `https://esm.sh/@remotion/player@${RUNTIME_DEPENDENCIES.remotion}`,
    'remotion/': `https://esm.sh/remotion@${RUNTIME_DEPENDENCIES.remotion}/`
  }
});
```

This allows the ESM modules to resolve bare imports like `import { AbsoluteFill } from 'remotion'` without bundling, using the exact same dependency versions as the rest of the application.

### Client-Side TSX Transpilation

The harness now uses Sucrase to perform client-side TSX transpilation:

```javascript
const { code: transformedCode } = transform(tsxCode, {
  transforms: ['typescript', 'jsx'],
  jsxRuntime: 'classic',
  production: false,
});
```

This eliminates the server-side API dependency and allows for faster iteration.

### Ensuring Default Exports

To align with Sprint 25's requirement for default exports, the harness automatically ensures components have proper default exports:

```javascript
// Function to ensure the code has a default export
const ensureDefaultExport = (code: string): string => {
  // If the code already has a default export, return it unchanged
  if (/export\s+default\s+/.test(code)) {
    return code;
  }
  
  // Try to find a component to export as default
  const componentNameMatch = code.match(/function\s+([A-Za-z0-9_]+)\s*\(/);
  // ...more matching logic...
  
  // Add default export if not already present
  return `${code}\n\nexport default ${componentName};`;
};
```

### ESM-Compliant Dynamic Loading

The component loading now follows the ESM pattern required by Sprint 25:

```javascript
// Function to create and load a dynamic component using the ESM pattern
function createDynamicComponent(jsCode: string, blobUrl: string): Promise<any> {
  return import(/* webpackIgnore: true */ blobUrl)
    .catch(err => {
      console.error('Error importing dynamic component:', err);
      throw new Error(`Failed to load component: ${err.message}`);
    });
}
```

### Shared Module Registry Integration

The harness integrates with Sprint 25's shared module registry (BAZAAR-263):

```javascript
// Register utilities for components to use
function registerSharedUtilities() {
  // Example shared utilities that components can use
  sharedModuleRegistry.register('animation-utils', '1.0.0', {
    easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
    spring: (frame: number, config = { damping: 10, stiffness: 100 }) => {
      // ...implementation...
    }
  });
  
  // Register version info
  setModuleVersion({ 
    name: 'animation-utils', 
    version: '1.0.0',
    description: 'Animation utility functions for Remotion components'
  });
}
```

Components can access these shared utilities through the registry:

```javascript
// In component code:
const animUtils = window.sharedModuleRegistry?.get('animation-utils');
const scale = animUtils?.spring(frame, { damping: 15, stiffness: 150 });
```

### Error Handling with Boundaries

The implementation includes comprehensive error handling with React Error Boundaries:

```javascript
<ErrorBoundary FallbackComponent={ErrorFallback}>
  <Suspense fallback={<div>Loading component via Suspense...</div>}>
    <RemotionPreview
      componentModule={componentModule}
      /* other props */
    />
  </Suspense>
</ErrorBoundary>
```

The `ErrorFallback` component provides detailed error information:

```javascript
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 text-red-500 bg-red-50 rounded-md border border-red-200">
      <h3 className="font-bold mb-2">Error Loading Component</h3>
      <p className="mb-2">{error.message}</p>
      <pre className="text-xs bg-red-100 p-2 rounded">
        {error.stack}
      </pre>
    </div>
  );
}
```

### Props Management

The harness provides a UI for editing component props as JSON:

```javascript
const [inputProps, setInputProps] = useState<Record<string, unknown>>({
  // Default or example props
  text: 'Hello from ComponentTestHarness!',
  value: 123,
});
```

And passes these props to the dynamically loaded component:

```javascript
// Create a component that will be used as the container
const RemotionComp = React.useMemo(() => {
  // Get the default export or first export that's a function
  const Component = componentModule.default || 
    Object.values(componentModule).find(exp => typeof exp === 'function');
  
  // Pass inputProps to the dynamically loaded component
  return () => <Component {...inputProps} />;
}, [componentModule, inputProps]);
```

## Sprint 25 Alignment

This implementation aligns with the Sprint 25 tickets:

### BAZAAR-255: ESM Build Pipeline

The component harness now uses Sucrase for client-side TSX transpilation, generating ESM-compatible code that's loaded through dynamic imports.

### BAZAAR-256: ESM Component Loading

The implementation handles dynamic loading of ES modules by:
- Creating blob URLs for the compiled JavaScript
- Using dynamic `import()` to load the modules
- Ensuring components have proper default exports
- Using React Suspense for loading states

### BAZAAR-258: Runtime Dependency Management

The import map approach provides runtime dependency management by:
- Resolving bare module specifiers without bundling
- Using the exact same dependency versions as the main application (from RUNTIME_DEPENDENCIES)
- Supporting isolated testing of components without bundling the entire application

### BAZAAR-263: Shared Module System

The harness now integrates with the shared module registry:
- Registers example shared utilities that components can use
- Provides access to shared modules through the registry
- Demonstrates the proper pattern for version tracking
- Shows how components can safely access and use shared utilities

## Version Consistency

To ensure consistent behavior, the implementation uses dependency versions from the RUNTIME_DEPENDENCIES constant:

```typescript
// In runtime-dependencies.ts
export const RUNTIME_DEPENDENCIES: RuntimeDependencies = {
  react: pkg.dependencies['react'],
  reactDom: pkg.dependencies['react-dom'],
  remotion: pkg.dependencies['remotion']
};
```

This ensures that all parts of the application use the same versions.

## Usage Example

Developers can now write components that:
1. Use Remotion hooks like `useCurrentFrame`
2. Accept and utilize input props
3. Access shared utilities from the registry
4. Export as default exports (or have exports automatically added)

Example component:

```jsx
import { AbsoluteFill, useCurrentFrame } from "remotion";
import React from "react";

// Access animation utilities from the shared registry
const animUtils = window.sharedModuleRegistry?.get('animation-utils');

export default function MyComponent({ text = "Hello Remotion", value = 100 }) {
  const frame = useCurrentFrame();
  
  // Use the spring function from animation utils if available
  const scale = animUtils?.spring 
    ? animUtils.spring(frame, { damping: 15, stiffness: 150 }) 
    : Math.min(1, frame / 30);
  
  return (
    <AbsoluteFill style={{ backgroundColor: "white" }}>
      <div style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        height: "100%",
        flexDirection: "column" 
      }}>
        <h1 style={{ 
          fontSize: 60, 
          color: "blue",
          transform: `scale(${scale})`,
        }}>
          {text}
        </h1>
        <p style={{ fontSize: 30, color: "gray" }}>
          Value: {value}, Frame: {frame}
        </p>
      </div>
    </AbsoluteFill>
  );
}
``` 