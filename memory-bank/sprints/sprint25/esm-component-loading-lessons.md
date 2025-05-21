//memory-bank/sprints/sprint25/esm-component-loading-lessons.md
# ESM Component Loading: Lessons Learned

This document summarizes what we've learned about ESM component loading during Sprint 25, including our experiments, challenges, and solutions.

## What We Tried

### 1. Import Maps Approach

Our first approach was to use import maps to resolve bare module specifiers:

```javascript
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.2.0",
    "remotion": "https://esm.sh/remotion@4.0.290"
  }
}
</script>
```

**Results:**
- Import maps correctly resolved bare imports in the ESM modules
- Browser supported dynamic ESM imports from URLs
- BUT: This created duplicate React/Remotion instances, leading to context errors

### 2. Global Registration Pattern

We tried maintaining the global variable approach but with ESM compilation:

```javascript
// In component code
import React from 'react';
import { useCurrentFrame } from 'remotion';

const MyComponent = () => { /* ... */ };

// Register globally
window.__REMOTION_COMPONENT = MyComponent;
```

**Results:**
- Familiar pattern for existing codebase
- Worked with current component generator
- BUT: Still had React/Remotion duplication issues
- ALSO: Limited to one component at a time due to global variable

### 3. Script Tag with Module Type

We experimented with script tags with type="module":

```javascript
const script = document.createElement('script');
script.type = 'module';
script.src = componentUrl;
document.head.appendChild(script);
```

**Results:**
- Properly loaded ESM modules
- BUT: No easy way to get the exports from the module
- STILL: React context issues remained

## What Works: esbuild external-global Plugin Approach

Our successful solution is built on esbuild's external-global plugin, which follows Remotion's official guidance:

1. **Host Application Global Exposure**:
   ```javascript
// In host app
useEffect(() => {
  window.React = React;
  window.ReactDOM = ReactDOM;
  
  // Use dynamic import for JSX runtime (future-proof for React 19+)
  import('react/jsx-runtime').then(jsx => {
    window.ReactJSX = jsx;
  });
  
  window.Remotion = RemotionLib;
}, []);
   ```

2. **Component Build with esbuild**:
   ```javascript
   import { build } from 'esbuild';
import { externalGlobalPlugin } from 'esbuild-plugin-external-global';

await build({
  entryPoints: ['component.tsx'],
  outfile: 'component.mjs',
  format: 'esm',
  bundle: true,
  platform: 'browser',
  sourcemap: true,
  plugins: [
    externalGlobalPlugin({
      // Core React externals
      react: 'window.React',
      'react-dom': 'window.ReactDOM',
      'react/jsx-runtime': 'window.ReactJSX',
      
      // Remotion and all sub-paths
      remotion: 'window.Remotion',
      'remotion/color': 'window.Remotion',
      'remotion/audio': 'window.Remotion',
      'remotion/noise': 'window.Remotion',
      'remotion/paths': 'window.Remotion',
    }),
  ],
});
   ```

3. **Clean Dynamic ESM Import**:
   ```javascript
   const lazyComponent = () => import(/* webpackIgnore: true */ componentUrl);
   ```

4. **Standard Player Integration**:
   ```jsx
   <Player
     lazyComponent={lazyComponent}
     durationInFrames={duration}
     fps={fps}
     inputProps={props}
     // ... other props
   />
   ```

## Major Challenges We Overcame

### 1. React Context Fragmentation

**Problem:** Multiple React instances caused context objects to be different between host app and dynamic components.

**Solution:** Used esbuild's external-global plugin to replace React imports with window.React references at build time.

### 2. Dynamic Import Handling

**Problem:** Standard dynamic imports are processed by webpack at build time.

**Solution:** Used `/* webpackIgnore: true */` comment to make webpack ignore the dynamic import, allowing true runtime imports.

### 3. Source Maps for Debugging

**Problem:** String manipulation and runtime code transformation breaks source maps.

**Solution:** esbuild properly preserves source maps during the build process, making debugging much easier.

### 4. LLM Code Generation Patterns

**Problem:** Needed a standard pattern for LLM to generate components.

**Solution:** Instructed LLM to generate standard Remotion code that doesn't import React - simpler and cleaner for the language model to understand.

## Key Insights

1. **Single Instance is Critical**: The most important factor is ensuring only one instance of React and Remotion exists across the entire application - esbuild with external-global is the most reliable way to achieve this.

2. **Build-time Transformation Over Runtime Hacks**: Using proper build tools like esbuild for externalization is more reliable than runtime regex transformations.

3. **Shared Registry Matters**: Making the shared module registry globally available ensures all components can access common utilities.

4. **Player Integration**: Using the `lazyComponent` prop on Remotion's Player is essential for proper ESM component loading.

5. **Error Boundaries and Source Maps**: Proper error boundaries, suspense fallbacks, and preserved source maps are critical for debugging and graceful failure handling.

## Performance Considerations

1. **Build Step**: The esbuild process is extremely fast and efficient, adding minimal overhead to the pipeline.

2. **Bundle Size**: By externalizing React and Remotion, bundle sizes remain small (< 120KB), improving load times.

3. **Caching**: We should implement a caching strategy for built modules to avoid unnecessary rebuilding.

4. **Initialization**: Window globals should be initialized early in the application lifecycle to ensure availability.

## Security Considerations

1. **Script Injection**: Our approach avoids script tag injection, reducing XSS risks.

2. **Sandbox Concerns**: Dynamic evaluation of code should eventually run in a more controlled environment.

3. **Global Pollution**: Window globals should be properly namespaced to avoid conflicts.

## Next Steps

1. **Integrate esbuild Pipeline**: Incorporate esbuild with external-global plugin into the component generation process.

2. **Update LLM System Prompts**: Modify prompts to instruct LLM to generate components that import from Remotion (including sub-paths) but not React.

3. **Implement Caching**: Add a caching layer for built modules to improve performance.

4. **Add CORS Configuration**: Ensure R2/Cloudflare storage has proper CORS headers for dynamic imports.

5. **Use Dynamic Import for JSX Runtime**: Replace internal fields with proper dynamic import for future compatibility.

6. **Enhance Debugging Experience**: Leverage preserved source maps to create better debugging tools for dynamically loaded components.

7. **Add CI Verification**: Implement checks to confirm bundle size and absence of duplicate React/Remotion.
