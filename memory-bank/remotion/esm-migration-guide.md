<!-- path: memory-bank/remotion/esm-migration-guide.md -->
# Migration to ESM-based Dynamic Components

This document explains how to refactor Bazaar‑Vid to follow the official Remotion guidance for dynamically loaded components using ES modules and `React.lazy`.

## Current Implementation

- Custom components are compiled to **IIFE** bundles in `buildCustomComponent.ts`.
- The compiled code attaches the component to `window.__REMOTION_COMPONENT`.
- `useRemoteComponent` injects a `<script>` tag and reads `window.__REMOTION_COMPONENT` to obtain the component.
- Global React and Remotion objects are referenced instead of module imports.

## Target Approach (per Remotion docs)

1. Each custom component should be an **ES module** exporting the React component as the **default export**.
2. Client code dynamically imports the module using `React.lazy` or the Remotion `<Player lazyComponent>` prop.
3. React and Remotion should be shared with the host app (via externals + import maps or full bundling).
4. No use of `window.__REMOTION_COMPONENT`.

## Required Codebase Changes

### 1. Build Pipeline (`src/server/workers/buildCustomComponent.ts`)

- **esbuild Format**: switch from `format: 'iife'` to `format: 'esm'` and remove the `globalName` wrapper.
- **Globals Removal**: drop `wrapTsxWithGlobals()` and related logic that injects React/Remotion globals. Preserve normal `import` statements.
- **External Dependencies**: mark `react`, `react-dom` and `remotion` as `external` in esbuild so the bundle keeps `import React from 'react'` etc.
- **Output File**: store the compiled module as `<id>.js` in R2 with `Content-Type: application/javascript`.
- **Validation Step**: after building, `import()` the file in Node to verify it has `module.default` as a function.
- **Remove window Assignment**: eliminate any code that writes to `window.__REMOTION_COMPONENT`.

### 2. Component Generation Templates

- Ensure templates produced by `generateComponent` end with `export default MyComponent;`.
- Do not include global React/Remotion references; rely on normal imports.

### 3. `useRemoteComponent` Hook (`src/hooks/useRemoteComponent.tsx`)

- Replace script element injection with `React.lazy`:
  ```tsx
  const LazyComp = React.lazy(() => import(/* webpackIgnore: true */ scriptSrc));
  ```
- Use `<Suspense>` inside the hook or in `CustomScene` for loading fallbacks.
- Drop all logic around clearing `window.__REMOTION_COMPONENT` and removing `<script>` tags.
- Keep retry/error handling but based on the dynamic import promise.

### 4. `CustomScene` (`src/remotion/components/scenes/CustomScene.tsx`)

- Import the hook’s `LazyComp` and render it inside `<Suspense>`.
- Pass `refreshToken` by changing the import URL (e.g., `?v=${refreshToken}`) so React remounts when needed.

### 5. Player Usage

- For dynamic compositions loaded from a URL, use `<Player lazyComponent={fn}>` where `fn` returns `import(url)`.
- Our current `PlayerShell` can continue to import `DynamicVideo` statically, but if we want to load it remotely the same pattern applies.

### 6. Runtime Dependency Resolution

- Provide React and Remotion to the browser either by:
  - Using an **import map** mapping `react` and `remotion` to CDN URLs.
  - Or bundling them into the component (larger bundle, not recommended).
- Ensure versions match those used by the host app to avoid multiple React instances.

### 7. Testing & Verification

- Update unit tests under `src/tests/remotion` to mount components using `React.lazy` and verify rendering via Suspense.
- Extend the component verification script to `import()` the built module and assert `typeof default === 'function'`.

### 8. Server‑Side Rendering Support

- If components are also rendered via Remotion Lambda, generate a small project wrapper that registers a `<Composition>` using the same component and `registerRoot`.
- Keep this wrapper separate from the module used by the Player.

## Summary

Migrating to ESM modules aligns Bazaar‑Vid with Remotion’s recommended workflow. Components become standard JavaScript modules that can be lazily imported both in the browser and on the server, eliminating brittle global assignments and enabling better integration with the Player.
