<!-- path: memory-bank/remotion/esm-component-development.md -->
# Developer Guide: Creating ESM-Compatible Components

This guide explains how to write custom Remotion components that comply with the new ESM-based loading mechanism introduced in Sprint 25.

## 1. Module Structure

- **Default Export**: Always export your component as the default export.
- **Standard Imports**: Use regular `import` statements for React and Remotion. Do not rely on globals.
- **No Global Assignments**: Remove any `window.__REMOTION_COMPONENT` or similar global side effects.

```tsx
// Example component
import { AbsoluteFill } from 'remotion';
import React from 'react';

const MyEffect: React.FC = () => (
  <AbsoluteFill style={{ background: 'white' }} />
);

export default MyEffect;
```

## 2. Bundling

Components should be bundled using esbuild with `format: 'esm'` and `platform: 'browser'`. React and Remotion remain external so the output keeps the `import` statements.

## 3. Loading in the Player

Use `React.lazy` or the Remotion `lazyComponent` prop to load the module dynamically:

```tsx
const LazyComp = React.lazy(() => import(/* webpackIgnore: true */ url));
```

Wrap the component with `<Suspense>` when rendering.

## 4. Testing

Use `npm test` and the guidance in `testing/esm-component-testing.md` to verify that the compiled module exports a React component and loads correctly in the browser.

