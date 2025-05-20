// memory-bank/sprints/sprint25/detailed-tickets.md
# Sprint 25 - ESM Migration Ticket Breakdown

This document expands upon `overview.md` and other sprint 25 research notes. Each ticket includes implementation guidance, trade-offs, and affected files.

## BAZAAR-255: Convert Build Pipeline to ESM Output

### Goal
Compile generated components as ES modules rather than IIFE bundles.

### Implementation Outline
- Update `src/server/workers/buildCustomComponent.ts` to call `esbuild.build` with `format: 'esm'` and remove the `globalName` logic.
- Mark `react`, `react-dom` and `remotion` as `external`.
- Example configuration:
  ```ts
  const result = await esbuild.build({
    stdin: { contents: fixedTsxCode, loader: 'tsx' },
    bundle: true,
    format: 'esm',
    platform: 'browser',
    target: 'es2020',
    external: ['react', 'react-dom', 'remotion'],
    write: false
  });
  ```
- After building, `import()` the produced file to verify `module.default` is a function.
- Upload the `.js` file to R2 with `Content-Type: application/javascript`.

### Trade-offs
- Pure ESM output requires React/Remotion to be resolvable at runtime (via import map or bundling). Simpler but slightly larger bundles can inline these dependencies.
- Removing the global assignment changes the contract with existing loaders; tasks below address loader changes.

### Affected Areas
- `src/server/workers/buildCustomComponent.ts`
- Any scripts that read the built artifact extension or content type.

## BAZAAR-256: Replace Script Injection with Dynamic Import

### Goal
Load remote components via `React.lazy` using `import()` instead of script tags and global variables.

### Implementation Outline
- Rewrite `src/hooks/useRemoteComponent.tsx`:
  - `const LazyComp = React.lazy(() => import(/* webpackIgnore: true */ url));`
  - Expose `{ Component: LazyComp, loading, error, reload }`.
- Wrap rendering in `<Suspense>` within `CustomScene` or the hook itself.
- Remove all `window.__REMOTION_COMPONENT` logic and script element management.

```tsx
export function useRemoteComponent(url?: string) {
  const Lazy = React.useMemo(() =>
    url ? React.lazy(() => import(/* webpackIgnore: true */ url)) : null,
  [url]);
  // handle errors and retries...
  return { Component: Lazy };
}
```

### Trade-offs
- Dynamic import requires CORS headers on R2. Script injection avoided this.
- Errors surface via Suspense boundaries instead of manual callbacks.

### Affected Areas
- `src/hooks/useRemoteComponent.tsx`
- `src/remotion/components/scenes/CustomScene.tsx`
- Tests relying on script injection behaviour.

## BAZAAR-257: Update Code Generation Templates

### Goal
Ensure generated components export the main React component as the default export with standard imports.

### Implementation Outline
- Modify template files used by `generateComponentCode.ts` so the final line is `export default MyComponent;`.
- Remove any `window.__REMOTION_COMPONENT` assignment from templates.
- Update tests in `src/server/workers/__tests__` expecting the old structure.

### Trade-offs
- Older components built with the IIFE pattern may need migration or rebuilds.

### Affected Areas
- `src/server/workers/generateComponentCode.ts`
- Template files under `scripts` or `src/server` used for component scaffolding.

## BAZAAR-258: Provide Runtime React/Remotion Modules

### Goal
Expose React and Remotion to the browser when loading ESM components.

### Implementation Outline
- Add an `importMap` script in `src/app/layout.tsx` mapping `react`, `react-dom` and `remotion` to CDN URLs.
  ```html
  <script type="importmap">
    {
      "imports": {
        "react": "/cdn/react.js",
        "react-dom": "/cdn/react-dom.js",
        "remotion": "/cdn/remotion.js"
      }
    }
  </script>
  ```
- Alternatively, bundle these libraries into the component using esbuild if import maps are not feasible. This increases bundle size but simplifies runtime.
- Document version synchronization strategy.

### Trade-offs
- Import maps keep bundles tiny but require browser support and careful version management.
- Bundling avoids import map complexity but duplicates React/Remotion and risks multiple React instances.

### Affected Areas
- Application shell files where the import map is injected.
- Build pipeline if bundling is chosen.

## BAZAAR-259: Server-Side Rendering Support

### Goal
Allow components built for the Player to also be rendered via Remotion CLI or Lambda.

### Implementation Outline
- Generate a small wrapper project during build containing:
  - `Root.tsx` that registers a `<Composition>` using the built component.
  - An entry file calling `registerRoot(Root)`.
- Store this wrapper alongside the component bundle so it can be used by Remotion Lambda.

### Trade-offs
- Maintaining two build outputs increases complexity.
- Rendering via Lambda requires bundling dependencies anyway; ensure versions match the Player.

### Affected Areas
- `buildCustomComponent.ts` (to create wrapper files)
- R2 upload structure and any Lambda invocation scripts.

## BAZAAR-260: Testing & Verification Updates

### Goal
Extend the test suite to cover the new ESM flow.

### Implementation Outline
- Update existing tests under `src/server/workers/__tests__/` to import the ESM output and check for `module.default`.
- Add React component tests using `React.lazy` and `<Suspense>`.
- Document testing steps in `memory-bank/testing`.

### Affected Areas
- `src/server/workers/__tests__/`*
- `memory-bank/testing` docs

---
These tickets translate the sprint plan into actionable development work while highlighting trade-offs and impacted code areas.
