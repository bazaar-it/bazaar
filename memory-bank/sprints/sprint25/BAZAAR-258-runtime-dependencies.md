//memory-bank/sprints/sprint25/BAZAAR-258-runtime-dependencies.md
# BAZAAR-258: Runtime Dependency Resolution Strategy

## Current Implementation

### Dependency Management
In the current approach:
1. Components reference React and Remotion through globals that are assumed to be present (e.g., `window.React`, `window.Remotion`). The actual component code (see `src/server/workers/componentTemplate.ts`) might contain `import` statements, but these are effectively for type checking and developer convenience during authoring; they are not used for runtime resolution in the IIFE bundle.
2. The IIFE (Immediately Invoked Function Expression) format, as produced by `src/server/workers/buildCustomComponent.ts`, doesn't perform standard ES module import resolution at runtime. Instead, it expects pre-existing globals.
3. The host application provides React and Remotion globally through its own bundling (e.g., Next.js).
4. There's no explicit version management or compatibility check between the globally provided libraries and what a specific dynamic component might have been developed or tested against.

### Build Process Impact
The current build process (`src/server/workers/buildCustomComponent.ts`) reflects this:
1. While `esbuild` is configured with `external: ['react', 'remotion']`, this means these are not bundled *into the IIFE*. The IIFE's internal wrapper code (responsible for `window.__REMOTION_COMPONENT = ...`) then assumes `React` and `Remotion` are accessible on the `window` object.
2. The build output is a self-executing script designed for global scope, not a standard ES module that would require an import mechanism.

## Proposed Changes

### 1. Deciding between import maps or bundling for React/Remotion dependencies

#### Import Maps Approach

Import maps are a web standard that allow browsers to resolve bare module specifiers like `import React from 'react'` to specific URLs. This is a highly recommended approach as per `esm-lazy.md` for handling shared dependencies with Remotion dynamic components.

To leverage import maps effectively:
*   The component build pipeline (BAZAAR-255) **must** output true ES modules.
*   Component templates (BAZAAR-257) **must** use standard `import React from 'react';` and `import { X } from 'remotion';` statements.
*   The `esbuild` configuration in BAZAAR-255 **must** continue to mark `react`, `remotion`, etc., as `external`. In an ESM context, this tells `esbuild` to leave the `import` statements as-is (e.g., `import React from 'react'`), allowing the browser (guided by the import map) to resolve them at runtime.

```html
<!-- Import map example in HTML -->
<script type="importmap">
{
  "imports": {
    "react": "https://esm.sh/react@18.2.0",
    "react-dom": "https://esm.sh/react-dom@18.2.0",
    "remotion": "https://esm.sh/remotion@4.0.0",
    "@remotion/player": "https://esm.sh/@remotion/player@4.0.0"
  }
}
</script>
```

**Advantages:**
- Smaller component bundle sizes (dependencies not included)
- Shared dependency instances across components
- Better module caching at browser level
- No duplication of framework code

**Disadvantages:**
- Browser compatibility concerns (though polyfills exist)
- Requires careful server-side configuration
- May need dynamic importmap generation based on project requirements
- CDN dependencies for production use

#### Bundling Approach

Alternatively, we can bundle React and Remotion directly into each component. **This approach is generally discouraged by Remotion's guidance (`esm-lazy.md`) due to the high risk of multiple React/Remotion instances causing errors and increased bundle sizes.**

If this approach were taken (e.g., as a fallback or for specific isolated cases):
*   The `esbuild` configuration (BAZAAR-255) would need to **remove** `react`, `remotion`, etc., from the `external` array to ensure they are included in the bundle.

```typescript
// esbuild configuration without external deps
const result = await esbuild.build({
  stdin: {
    contents: tsxCode,
    loader: 'tsx',
    resolveDir: process.cwd(),
  },
  bundle: true,
  minify: true,
  format: 'esm',
  // No external config - everything gets bundled
});
```

**Advantages:**
- Self-contained components with no external dependencies
- Works in any modern browser with ESM support
- Simpler deployment with no import map configuration
- Version locked dependencies for stability

**Disadvantages:**
- Much larger bundle sizes
- Multiple instances of React can cause issues
- Poor cache utilization
- Slower loading times for multiple components

#### Recommended Approach

A hybrid strategy with import maps as the primary approach and bundling as a fallback:

1. Default to using import maps for standard dependencies, as this aligns with best practices for Remotion and web standards (`esm-lazy.md`).
2. Generate appropriate import maps based on the main application's dependency versions. This ensures the dynamically loaded component uses the exact same instances of React and Remotion as the host application, preventing version conflicts.
3. For environments without import map support, offer a fallback bundled version
4. Allow configuration to force bundled mode when needed

### 2. Ensuring version compatibility between host app and dynamic components

With the import map approach, version compatibility is inherently managed. The import map, generated by the host application's environment, dictates the versions of React, Remotion, etc., that all dynamically loaded ESM components will use. This ensures a single, consistent version across the application.

If, for some reason, components were built against different major versions, the primary concern would be API compatibility during development rather than runtime conflicts, as the import map would still enforce a single version at runtime.

#### Version Compatibility Matrix

| Host React | Host Remotion | Component React | Component Remotion | Compatibility |
|------------|---------------|-----------------|---------------------|---------------|
| 18.x       | 4.x           | 18.x            | 4.x                 | ✅ Full       |
| 18.x       | 4.x           | 18.x            | 3.x                 | ⚠️ Partial    |
| 18.x       | 4.x           | 17.x            | Any                 | ❌ None       |
| 17.x       | 3.x           | 18.x            | Any                 | ❌ None       |

#### Version Detection

Under an import map strategy, explicit version detection within the component or loader becomes less critical for *runtime instance conflicts*, as the import map controls this. However, it can still be useful for:
*   **Build-time checks**: Validating that a component's source code (if its target versions are known) is compatible with the versions the host plans to provide via the import map.
*   **Tooling/Debugging**: Displaying version information.

```typescript
// In the host application
const SUPPORTED_VERSIONS = {
  react: ['18.0.0', '18.2.0'],
  remotion: ['4.0.0', '4.0.1', '4.0.2']
};

// When generating import maps
function generateImportMap() {
  return {
    imports: {
      "react": `https://esm.sh/react@${getCurrentReactVersion()}`,
      "react-dom": `https://esm.sh/react-dom@${getCurrentReactDomVersion()}`,
      "remotion": `https://esm.sh/remotion@${getCurrentRemotionVersion()}`,
      // Add other necessary imports
    }
  };
}

// When validating components
function validateComponentCompatibility(componentCode) {
  // Extract import versions from component code or metadata
  const componentVersions = extractVersions(componentCode);
  
  return checkVersionCompatibility(componentVersions, SUPPORTED_VERSIONS);
}
```

#### Implementation Strategy

1. **Version Tracking**: The host application (specifically the part that generates the import map) knows the versions it's providing. This is the source of truth.
2. **Version Validation**: Optional: At component build/upload time, metadata about the React/Remotion versions the component was *developed* against could be stored. This could be used to warn developers if they try to load a component into a host environment with known major incompatibilities, even if the import map would technically force a version.
3. **Dependency Resolution**: The import map itself *is* the dependency resolution mechanism for the browser.
4. **Fallback Mechanism**: Provide graceful fallbacks for incompatible versions

## Integration Architecture

### Import Map Generation

Create a service to dynamically generate import maps based on project dependencies:

```typescript
// src/server/services/importMapService.ts
export async function generateImportMap(projectId: string): Promise<string> {
  // Get project's dependency versions
  const dependencies = await getProjectDependencies(projectId);
  
  // Create import map with CDN URLs
  const importMap = {
    imports: {
      "react": `https://esm.sh/react@${dependencies.react}`,
      "react-dom": `https://esm.sh/react-dom@${dependencies.reactDom}`,
      "remotion": `https://esm.sh/remotion@${dependencies.remotion}`,
      // Add other dependencies as needed
    }
  };
  
  return JSON.stringify(importMap);
}
```

### Component Loader Integration

Update the component loading mechanism to include import maps:

```typescript
// In the component loading page
export default function ComponentPreview({ componentId }) {
  const { data: importMap } = useQuery(['importMap'], fetchImportMap);
  
  // Apply import map to the page
  useEffect(() => {
    if (importMap) {
      const script = document.createElement('script');
      script.type = 'importmap';
      script.textContent = importMap;
      document.head.appendChild(script);
    }
  }, [importMap]);
  
  // Rest of component loading code
}
```

### Fallback Strategy

Implement a fallback for browsers without import map support:

```typescript
// Check for import map support
const hasImportMapSupport = () => {
  try {
    const script = document.createElement('script');
    return 'type' in script && script.type = 'importmap' === 'importmap';
  } catch (e) {
    return false;
  }
};

// Use appropriate component URL based on support
const componentUrl = hasImportMapSupport() 
  ? `/api/components/${id}/module.js`  // Uses import maps
  : `/api/components/${id}/bundle.js`; // Includes all dependencies
```

## Versioning and Migration Strategy

### Component Version Tagging

Tag components with their dependency requirements:

```typescript
// Component metadata stored with the component
export interface ComponentMetadata {
  id: string;
  name: string;
  dependencies: {
    react: string;
    reactDom: string;
    remotion: string;
    // Other dependencies
  };
  // Other metadata fields
}
```

### Progressive Migration

For existing components:
1. Start with bundled dependencies for all legacy components
2. Gradually shift new components to the import map approach
3. Provide tools to migrate legacy components if needed

## CDN Strategy

To ensure reliable dependency delivery:

1. **Primary CDN**: Use established ESM CDNs like esm.sh, skypack, or unpkg
2. **Fallback CDNs**: Configure multiple CDN options in case of failure
3. **Self-Hosting Option**: Allow hosting critical dependencies locally
4. **Caching Strategy**: Implement appropriate caching headers

## Testing Strategy

1. **Browser Compatibility**: Test in all targeted browsers
2. **Version Compatibility**: Test with various dependency version combinations
3. **Fallback Scenarios**: Test when import maps aren't supported
4. **Performance Testing**: Compare loading times between approaches
5. **Network Resilience**: Test with throttled connections and CDN failures

## Implementation Checklist

- [ ] Create import map generation service
- [ ] Update build pipeline to support both bundling strategies
- [ ] Implement version compatibility checking
- [ ] Add component metadata for dependency tracking
- [ ] Create fallback mechanism for browsers without import map support
- [ ] Update Remotion player configuration to work with both approaches
- [ ] Document version compatibility requirements

## Risks and Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Browser compatibility issues | High | Provide bundled fallback, feature detection |
| CDN reliability problems | High | Multiple CDN fallbacks, local hosting option |
| Version conflicts | Medium | Strict version validation, compatibility matrix |
| Performance degradation | Medium | Measure metrics, optimize loading strategy |
| Security concerns with external CDNs | Medium | Use trusted CDNs, SRI validation |
| Cache invalidation challenges | Low | Version-specific URLs, cache control headers |
