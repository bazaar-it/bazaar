//memory-bank/sprints/sprint25/BAZAAR-264-full-pipeline-integration.md
# BAZAAR-264: Integrated ESM Component Pipeline

## Overview

This ticket encompasses the complete renewal of our component generation and rendering pipeline, implementing the ESM component loading approach discovered in BAZAAR-256. The goal is to create an end-to-end pipeline from user prompt to final rendered video while maintaining a single React/Remotion context throughout the entire process.

## Objectives

1. Integrate ESM component loading with the Animation Design Brief (ADB) system
2. Update component generation to produce ESM-compatible components
3. Modify storage and retrieval mechanisms for ESM modules
4. Ensure seamless Remotion Player integration
5. Implement shared module registry access for all components
6. Update system prompts for the code generator to align with the new approach

## Key Requirements

> IMPORTANT: Components should use Remotion imports but NOT React imports. esbuild will handle the externalization of these dependencies at build time. This pattern follows Remotion's official guidance for dynamic Player integration.

### Component Generation

- [ ] Implement ESM-based component generation in `componentGenerator.service.ts`
- [ ] Update system prompts to instruct AI to generate components that import from Remotion but NOT React
- [ ] Have LLM create standard code that uses default exports for Remotion compatibility
- [ ] Remove global variable pattern (`window.__REMOTION_COMPONENT`) from generated code
- [ ] Add lint/test step to fail build if `import React` or `window.__REMOTION_COMPONENT` appears in source

### Storage & Retrieval

- [ ] Update component storage to include correct MIME types (`application/javascript`) for ESM modules
- [ ] Configure CORS headers (`Access-Control-Allow-Origin: *`) on R2/Cloudflare for dynamic imports
- [ ] Modify component URL generation to support import statements
- [ ] Implement proper caching and invalidation for ESM modules
- [ ] Add versioning support to track component compatibility

### Player Integration

- [ ] Update `Player` component integration to use `lazyComponent` property
- [ ] Implement proper error boundaries and Suspense fallbacks
- [ ] Pass dimensions, fps, and other metadata from design briefs to Player configuration
- [ ] Add support for debugging dynamically loaded components
- [ ] Ensure animation timing is consistent across all components

### Build Pipeline Integration

- [ ] Integrate esbuild with external-global plugin to handle externals at build time
- [ ] Add `react/jsx-runtime` to external-global mapping to handle automatic JSX
- [ ] Handle Remotion sub-paths (e.g., `remotion/color`) in external mappings
- [ ] Configure build pipeline to replace all React/Remotion imports with window global references
- [ ] Ensure source maps are preserved for better debugging
- [ ] Create utilities to expose and manage window globals safely using dynamic import

### Import Handling

- [ ] Create import transformation pipeline to handle React/Remotion imports
- [ ] Handle Remotion sub-namespace imports (like `remotion/color`) via destructuring 
- [ ] Implement proper caching and invalidation for ESM modules
- [ ] Add validation to prevent duplicate React/Remotion instances
- [ ] Implement smoke tests to verify bundle size (< 120 KB) and confirm React isn't embedded

## Relationship to Other Tickets

This ticket extends and integrates work from:

- BAZAAR-255: ESM Build Pipeline
- BAZAAR-256: ESM Component Loading
- BAZAAR-257: Component Templates
- BAZAAR-258: Runtime Dependencies
- BAZAAR-263: Shared Modules

## Success Criteria

1. Complete pipeline from user prompt to rendered video works without errors
2. All components share a single React/Remotion context via proper externalization
3. Component animations render correctly with proper frame timing
4. Shared utilities are accessible to all components
5. Bundle size < 120KB (no duplicate React/Remotion) - verified in CI
6. Source maps work correctly for debugging components
7. Clean component loading/unloading without memory leaks
8. No "Invalid hook call" or "useContext is null" errors in any component
9. Works consistently across production and development builds
