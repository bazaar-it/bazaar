// //memory-bank/testing/esm-component-testing.md
# Testing ESM Dynamic Components

## 1. Purpose

This document provides guidelines and procedures for writing and running tests for the new ESM-based dynamic components in the Bazaar Vid project. It covers server-side build verification and client-side React component testing to ensure the ESM migration (BAZAAR-255, BAZAAR-256) is robust and reliable.

Refer to [BAZAAR-260: Testing & Verification Updates](<../sprints/sprint25/BAZAAR-260-testing-verification-updates.md>) for the overall testing strategy.

## 2. General Setup & Tooling

- **Test Runner:** Jest
- **React Testing:** React Testing Library (`@testing-library/react`)
- **Mocking:** Jest's built-in mocking capabilities (`jest.fn()`, `jest.mock()`).

Ensure your Jest configuration is set up to handle ESM, potentially using `NODE_OPTIONS=--experimental-vm-modules jest` or similar, and that `transform` options in `jest.config.js` correctly process `.ts` and `.tsx` files.

## 3. Server-Side Tests: `buildCustomComponent.ts` ESM Output Verification

**Location:** `src/server/workers/__tests__/buildComponent.test.ts`

### 3.1. Objectives

- Verify that `buildCustomComponent.ts` (when updated for BAZAAR-255) correctly produces ESM-formatted JavaScript bundles.
- Ensure the output contains a `default` export for the Remotion component.
- Confirm that specified dependencies (e.g., `react`, `remotion`) are correctly externalized in the esbuild configuration.
- Validate that the generated ESM code can be dynamically imported and the default export accessed.

### 3.2. Key Testing Techniques

- **Mocking `esbuild.build`:**
  - Spy on `esbuild.build` to assert it's called with `format: 'esm'` and the correct `external` array (e.g., `['react', 'react-dom', 'remotion', '@remotion/*']`).
  - Mock the return value of `esbuild.build` to provide a controlled ESM string output for testing the dynamic import.
- **Dynamic `import()`:**
  - Write the mocked ESM output from `esbuild.build` to a temporary `.mjs` file (e.g., using `fs.promises.writeFile` in a temporary directory managed by `beforeEach`/`afterEach`).
  - Use dynamic `await import(pathToFileURL(tempFilePath).href);` to load the temporary module.
  - Assert that the imported module has a `default` property and that `typeof importedModule.default === 'function'`.
- **File System Operations:** Use `fs/promises` for managing temporary files needed for dynamic import tests.

### 3.3. Example Snippets

```typescript
// In buildComponent.test.ts
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { pathToFileURL } from 'url';
import esbuild from 'esbuild';

// ... inside a test case ...
const mockEsmOutput = 'export default function MyMockComponent() {}; import React from \'react\';';
(esbuild.build as jest.Mock).mockResolvedValue({
  outputFiles: [{ text: mockEsmOutput, path: 'out.js' /* ...other fields */ }],
  // ... warnings, errors
});

const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'esm-test-'));
const tempFilePath = path.join(tempDir, 'test-module.mjs');
await fs.writeFile(tempFilePath, mockEsmOutput);

const importedModule = await import(pathToFileURL(tempFilePath).href);
expect(importedModule.default).toBeDefined();
expect(typeof importedModule.default).toBe('function');

// Clean up tempDir in afterEach
```

## 4. Client-Side Tests: React Component Loading & Rendering

**Locations:**
- `src/hooks/__tests__/useRemoteComponent.test.tsx`
- `src/remotion/components/scenes/__tests__/CustomScene.test.tsx`

### 4.1. Objectives for `useRemoteComponent.tsx` (BAZAAR-256)

- Verify correct usage of `React.lazy()` for dynamic component loading.
- Ensure `<Suspense>` boundary integration for handling loading states.
- Test error handling (e.g., using an `<ErrorBoundary>`) when `React.lazy()` fails to load the component.
- Validate the refresh mechanism (e.g., changing a `key` prop or URL parameter passed to `import()`).

### 4.2. Objectives for `CustomScene.tsx`

- Test that `CustomScene` correctly utilizes the (refactored) `useRemoteComponent`.
- Verify that loading states (e.g., from `<Suspense>`) are rendered appropriately.
- Ensure error states (e.g., from an `<ErrorBoundary>`) are displayed when component loading fails within `useRemoteComponent`.
- Test the `externalRefreshToken` prop's effect on triggering a component refresh.

### 4.3. Key Testing Techniques (React Testing Library)

- **Rendering with `<Suspense>` and `<ErrorBoundary>`:**
  - Wrap the component under test (`CustomScene` or a test harness for `useRemoteComponent`) in `<Suspense>` with a fallback UI and an `<ErrorBoundary>`.
- **Mocking Dynamic `import()` / `React.lazy()`:**
  - `jest.mock('module-path-that-react-lazy-imports')` can be tricky with dynamic URLs. A more robust approach for `useRemoteComponent` might involve mocking the `fetch` call that `React.lazy`'s underlying `import()` would make if it's importing a URL, or mocking the `import()` call itself if a strategy like named chunks or a manifest is used.
  - For unit testing `useRemoteComponent`'s internal logic with `React.lazy`, you might need to mock `React.lazy` itself to control the promise it returns.
  - **Strategy 1: Mocking the dynamically imported component module:**
    ```typescript
    // If React.lazy imports a known module path (less likely for truly dynamic URLs)
    jest.mock('./path/to/actual/LazyComponent', () => ({
      __esModule: true,
      default: () => <div>Mocked Lazy Component</div>,
    }));
    ```
  - **Strategy 2: Mocking `React.lazy` (advanced, for precise control over the promise lifecycle):**
    ```typescript
    const mockLazyComponent = () => <div>Mocked Lazy Loaded Component</div>;
    let resolveLazy: (comp: React.ComponentType<any>) => void;
    const lazyPromise = new Promise<React.ComponentType<any>>(res => {
      resolveLazy = res;
    });
    jest.spyOn(React, 'lazy').mockImplementation(() => {
      return React.memo(() => {
        // This part needs careful implementation to simulate Suspense behavior
        // Or, more simply, ensure the test setup around it triggers suspense correctly.
        throw lazyPromise; // Initial throw to trigger Suspense
      });
    });

    // In test: render(...)
    // await act(() => resolveLazy(mockLazyComponent)); // Resolve to simulate load
    ```
    *Note: Directly mocking `React.lazy` can be complex due to its internal mechanics with Suspense. Often, it's easier to test its effects by controlling the promise of the dynamic `import()` it wraps.* 

- **Simulating Loading & Error States:**
  - Use `await screen.findByText('Loading...')` for Suspense fallbacks.
  - To test error states, make the mocked dynamic `import()` (or the component it resolves to) throw an error, then assert the `<ErrorBoundary>`'s fallback UI is shown.
- **`act()` and Asynchronous Operations:** Wrap state updates and promise resolutions in `act()` from `@testing-library/react`.

### 4.4. Example Snippets (`CustomScene.test.tsx`)

```tsx
import { render, screen, act } from '@testing-library/react';
import CustomScene from '../CustomScene'; // Adjust path
import React, { Suspense } from 'react';

// Mock useRemoteComponent or the dynamic import it uses
let mockRemoteComponentPromise: Promise<{ default: React.ComponentType<any> }>;
const MockActualRemoteComponent = () => <div>Actual Remote Component Content</div>;

jest.mock('../../hooks/useRemoteComponent', () => ({
  __esModule: true,
  default: jest.fn((props) => {
    // This mock needs to simulate React.lazy's behavior for Suspense
    // One way: have a component that throws a promise
    const LazyComponent = React.lazy(() => mockRemoteComponentPromise);
    return <LazyComponent {...props} />;
  }),
}));

describe('CustomScene', () => {
  beforeEach(() => {
    // Reset promise for each test
    mockRemoteComponentPromise = new Promise((resolve) => {
      // Store resolver to trigger load later
      (global as any).resolveRemoteComponent = () => resolve({ default: MockActualRemoteComponent });
    });
  });

  it('should render loading fallback initially', async () => {
    render(
      <Suspense fallback={<div>Loading Scene...</div>}>
        <CustomScene componentId="test" scriptSrc="/test.js" />
      </Suspense>
    );
    expect(screen.getByText('Loading Scene...')).toBeInTheDocument();
  });

  it('should render the component after load', async () => {
    render(
      <Suspense fallback={<div>Loading Scene...</div>}>
        <CustomScene componentId="test" scriptSrc="/test.js" />
      </Suspense>
    );
    await act(async () => {
      (global as any).resolveRemoteComponent(); // Trigger component load
      await mockRemoteComponentPromise; // Wait for promise to resolve
    });
    expect(screen.getByText('Actual Remote Component Content')).toBeInTheDocument();
  });

  // ... tests for error states, refresh token ...
});
```

## 5. Running Tests

- Run all tests: `npm test` or `yarn test`
- Run specific test file: `npm test -- src/server/workers/__tests__/buildCustomComponent.test.ts`

Remember to commit this file and update it as testing strategies evolve or new patterns emerge.
