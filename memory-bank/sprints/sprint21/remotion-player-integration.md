# Remotion Player Integration Technical Guide

## Core Concepts

The Remotion Player component is the bridge between remotely loaded components and the Remotion rendering ecosystem. Understanding how it works is critical for diagnosing and fixing component loading issues in Bazaar-Vid.

## Player Component Architecture

### Overview

The Remotion Player works by:

1. **Mounting a React component tree** that includes your compositions
2. **Managing playback state** (playing, paused, current frame)
3. **Rendering frames on demand** using the specified configuration
4. **Handling interaction** through controls and events

### Key Properties

```typescript
<Player
  component={MyComp}
  durationInFrames={120}
  fps={30}
  compositionWidth={1280}
  compositionHeight={720}
  controls
  loop
  autoPlay
  showVolumeControls
  style={{ width: '100%' }}
  inputProps={{ ... }}
/>
```

- **component**: The React component to render 
- **durationInFrames**: Length of the composition
- **fps**: Frames per second
- **compositionWidth/Height**: Dimensions of the output
- **controls**: Whether to show playback controls
- **loop**: Whether to loop playback
- **autoPlay**: Whether to start playing automatically
- **inputProps**: Props to pass to the component

### Dynamic Component Loading

Of particular relevance to our component loading issues:

```typescript
// Dynamic component reference
const [Comp, setComp] = useState<React.ComponentType | null>(null);

useEffect(() => {
  // Dynamic import (similar to useRemoteComponent)
  import(/* @vite-ignore */ `path/to/component?t=${Date.now()}`)
    .then((module) => {
      // Extract component from module
      const Component = module.default || module.__REMOTION_COMPONENT;
      setComp(() => Component);
    })
    .catch((err) => {
      console.error('Error loading component:', err);
    });
}, [componentId]);

// Use in Player
{Comp && <Player component={Comp} {...otherProps} />}
```

## Script Loading and Component Registration

### Browser-Side Loading Mechanism

Remotion's approach to dynamically loading components relies on these key mechanisms:

1. **Dynamic Import**: Using `import()` to load JavaScript modules at runtime
2. **Global Registration**: Components register themselves via `window.__REMOTION_COMPONENT`
3. **Source Transformation**: Code transformations to ensure compatibility

### Expected Registration Pattern

```javascript
// What Remotion expects in the loaded bundle
const Component = () => {
  // Component implementation
};

// Global registration (one of these must be present)
window.__REMOTION_COMPONENT = Component;
// OR
export default Component;
```

### Common Issues and Solutions

| Issue | Symptom | Solution |
|-------|---------|----------|
| Missing Registration | Component loads but doesn't render | Fix export in component code |
| Script Loading Failure | Network error in console | Check URL and CORS settings |
| Cache Issues | Old version renders despite changes | Add cache-busting parameters |
| SSR Compatibility | Hydration errors | Use dynamic imports with proper client detection |

## Player Performance Optimization

### Render Efficiency

- Use `React.memo()` for expensive components
- Leverage `useMemo()` for computation-heavy calculations
- Avoid layout thrashing by batching DOM operations

### Script Loading Optimization

```typescript
// Preload scripts before they're needed
const preloadComponent = (id: string) => {
  const link = document.createElement('link');
  link.rel = 'preload';
  link.href = `/api/components/${id}?t=${Date.now()}`;
  link.as = 'script';
  document.head.appendChild(link);
};

// Use in component that displays list of available components
useEffect(() => {
  if (availableComponents) {
    availableComponents.forEach(comp => preloadComponent(comp.id));
  }
}, [availableComponents]);
```

## Integration with Next.js

### Client Components Requirements

Remotion Player must be used within a client component:

```tsx
'use client';

import { Player } from '@remotion/player';
import dynamic from 'next/dynamic';

// Dynamic import for components
const MyComp = dynamic(() => 
  import('../components/my-comp').then(mod => mod.default), 
  { ssr: false }
);

export default function PlayerWrapper() {
  return (
    <Player
      component={MyComp}
      durationInFrames={120}
      fps={30}
      compositionWidth={1280}
      compositionHeight={720}
    />
  );
}
```

### Refresh Token Implementation

Proper implementation of refresh token pattern to force component reloading:

```typescript
// In parent component
const [refreshToken, setRefreshToken] = useState(Date.now());

const forceRefresh = useCallback(() => {
  setRefreshToken(Date.now());
}, []);

// Pass to Player
<Player
  key={`player-${refreshToken}`}
  component={Comp}
  {...otherProps}
/>
```

## Application to Bazaar-Vid Component Loading Issues

### Current Implementation Analysis

Based on the Remotion documentation and our codebase analysis, here are the key issues with our component loading:

1. **Script Loading and Cleanup**:
   - Current cleanup mechanism is too aggressive, removing scripts that might be needed
   - Lack of proper error handling when scripts fail to load

2. **Component Registration**:
   - Inconsistencies in how components register with `window.__REMOTION_COMPONENT`
   - Missing fallback patterns for different export styles

3. **Cache and Refresh Issues**:
   - Inadequate cache-busting strategy for dynamic imports
   - Refresh tokens not properly propagating through component hierarchy

4. **Database-R2 Mismatch**:
   - Components marked as ready but missing outputUrl
   - Lack of verification before updating component status

### Recommended Implementation

```typescript
// 1. Enhanced useRemoteComponent hook
function useRemoteComponent(componentId: string, refreshToken: string) {
  const [component, setComponent] = useState<React.ComponentType | null>(null);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    // Clear previous component on id/token change
    setComponent(null);
    
    // Script tracking for proper cleanup
    const scriptId = `remotion-component-${componentId}`;
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      document.head.removeChild(existingScript);
    }
    
    // Create new script with cache-busting
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = `/api/components/${componentId}?t=${refreshToken}`;
    script.type = 'module';
    
    // Handle loading success
    script.onload = () => {
      // Try multiple ways to extract the component
      const Component = 
        window.__REMOTION_COMPONENT || 
        window[`__REMOTION_COMPONENT_${componentId}`];
      
      if (Component) {
        setComponent(() => Component);
      } else {
        setError(new Error(`Component ${componentId} loaded but not found in window.__REMOTION_COMPONENT`));
      }
    };
    
    // Handle loading failure
    script.onerror = (e) => {
      setError(new Error(`Failed to load component ${componentId}: ${e}`));
    };
    
    // Add to document
    document.head.appendChild(script);
    
    // Cleanup
    return () => {
      if (document.getElementById(scriptId)) {
        document.head.removeChild(script);
      }
    };
  }, [componentId, refreshToken]);
  
  return { component, error };
}

// 2. Proper refresh propagation
function CustomScene({ componentId, data }) {
  const [refreshKey, setRefreshKey] = useState(Date.now());
  const { component: RemoteComponent } = useRemoteComponent(componentId, refreshKey);
  
  // Force refresh from parent
  useEffect(() => {
    if (data.forceRefresh) {
      setRefreshKey(Date.now());
    }
  }, [data.forceRefresh]);
  
  // Render with error handling
  if (!RemoteComponent) return <div>Loading component...</div>;
  return <RemoteComponent {...data} />;
}
```

## Testing and Debugging

### Component Loading Verification

```typescript
// Verify component loading in browser console
function verifyComponent(id) {
  const script = document.createElement('script');
  script.src = `/api/components/${id}?t=${Date.now()}`;
  script.onload = () => {
    console.log('Component registered:', window.__REMOTION_COMPONENT);
  };
  script.onerror = (e) => {
    console.error('Failed to load:', e);
  };
  document.head.appendChild(script);
}
```

### Debugging Tips

1. Check Network tab for script loading errors
2. Inspect script content to verify proper component registration
3. Validate that refreshToken is actually changing on refresh
4. Ensure proper script cleanup to prevent duplicate registrations
5. Monitor memory usage for potential leaks during frequent refreshes

## Conclusion

Properly integrating the Remotion Player with dynamically loaded components requires careful attention to script loading, component registration, and cache management. By addressing these areas, we can significantly improve the reliability of our custom component system in Bazaar-Vid.
