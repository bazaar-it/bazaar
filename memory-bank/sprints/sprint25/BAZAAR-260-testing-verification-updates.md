
//memory-bank/sprints/sprint25/BAZAAR-260-testing-verification-updates.md
# BAZAAR-260: Testing & Verification Updates for ESM Migration

## Goal
Extend the test suite to cover the new ESM (ECMAScript Modules) flow for dynamically loaded components, ensuring reliability and correctness of the build pipeline, component loading mechanism, and component rendering.

## Current Testing Landscape & Gaps

### Existing Tests:
- Tests currently exist under `src/server/workers/__tests__/`, likely focusing on the output of the `buildCustomComponent.ts` worker in its current IIFE (Immediately Invoked Function Expression) format.
- These tests might verify aspects of the IIFE bundle, such as global registration (`window.__REMOTION_COMPONENT`).

### Gaps for ESM Migration:
- **No ESM Output Verification:** Current tests do not validate if the build pipeline can produce valid ESM modules as proposed in BAZAAR-255.
- **No `React.lazy` or `<Suspense>` Testing:** There are no tests for the client-side component loading mechanism using `React.lazy` and `<Suspense>`, as proposed in BAZAAR-256.
- **No Import Map Resolution Testing:** If import maps are used (BAZAAR-258), their effect on module resolution in a testing environment is not covered.
- **Limited Error Handling Tests:** Testing for error states during dynamic ESM import and rendering needs to be specifically addressed.

## Proposed Testing Strategy & Scaffolding

We will adopt a multi-layered testing strategy:

### 1. Build Output Verification (Server-Side / Node.js Environment)
   This ensures the core build process (BAZAAR-255) correctly produces ESM modules.

   - **Location:** Update existing tests or add new ones in `src/server/workers/__tests__/buildCustomComponent.test.ts` (or equivalent).
   - **What to Test & Why:**
       - **Valid ESM Output:** Verify that `buildCustomComponent.ts` (after BAZAAR-255 modifications) outputs a string that is syntactically valid ESM. (Why: Fundamental check for ESM correctness).
       - **Dynamic `import()`:** Use Node.js's dynamic `import('file:///path/to/output.js')` (or a similar mechanism using a temporary file) to load the built ESM output. (Why: Simulates runtime loading of an ESM module).
       - **`module.default` Export:** Check that the imported module has a `default` export (`module.default`) and that this export is a function (the React component). (Why: `React.lazy` expects a module with a default export).
       - **External Dependencies:** Ensure that `react` and `remotion` (and other specified externals like `react-dom`, `@remotion/*`) are NOT bundled into the output. This can be verified by checking for the presence of `import 'react';` statements in the output string, rather than their full code. (Why: Critical for using shared dependencies via import maps or host provision, as per BAZAAR-258).
       - **R2 `ContentType`:** While not directly tested in the build output, ensure related logic for setting `ContentType: 'application/javascript'` for R2 uploads is testable or verified. (Why: Correct MIME type is crucial for browser ESM loading).
   - **Tools:** Jest (assuming it's the current test runner).

### 2. Component Loading & Rendering (Client-Side / React Testing Environment)
   This ensures the modernized component loading (BAZAAR-256) and rendering with `React.lazy` and `<Suspense>` works correctly.

   - **Location:** New test files, likely:
       - `src/hooks/__tests__/useRemoteComponent.test.tsx`
       - `src/remotion/components/scenes/__tests__/CustomScene.test.tsx`
   - **What to Test for `useRemoteComponent` (after BAZAAR-256 refactor) & Why:**
       - **`React.lazy` Wrapping:** Verify the hook correctly wraps the dynamic `import()` call with `React.lazy`. (Why: Core of the new loading mechanism).
       - **Loading State with `<Suspense>`:** Test that when the component is loading, a `<Suspense fallback={...}>` correctly displays the fallback UI. (Why: Ensures correct user experience during load).
       - **Successful Component Rendering:** Mock the dynamic `import()` to resolve with a mock React component. Verify that this mock component is rendered successfully after loading. (Why: Confirms the happy path).
       - **Error State & Error Boundaries:** Mock the dynamic `import()` to reject. Verify that an encompassing React `<ErrorBoundary>` catches this error and displays an error UI. (Why: Ensures graceful failure handling).
       - **Refresh Mechanism:** If refresh is implemented via URL parameters (e.g., `?version=timestamp`), test that changing the parameter triggers a re-evaluation or new import. (Why: Validates component update/refresh logic).
   - **What to Test for `CustomScene` & Why:**
       - **Correct `useRemoteComponent` Usage:** Ensure `CustomScene` correctly invokes the (mocked) lazy-loading `useRemoteComponent`. (Why: Validates integration between scene and hook).
       - **`<Suspense>` and `<ErrorBoundary>` Integration:** Verify that `CustomScene` correctly places `<Suspense>` and `<ErrorBoundary>` components around the dynamically loaded component. (Why: Ensures scene-level handling of loading/error states).
   - **Tools:** Jest, React Testing Library (`@testing-library/react`) for rendering components and interacting with them in a way that resembles user behavior.

### 3. Documentation of Testing Steps & Strategies
   This ensures developers can understand, run, and contribute to the new tests.

   - **Location:** Create a new documentation file, e.g., `memory-bank/testing/esm-component-testing.md`.
   - **Content & Why:**
       - **Running Tests:** Instructions on how to execute the new ESM-related tests. (Why: Developer usability).
       - **Writing New Tests:** Guidelines and examples for writing tests for new ESM components or features. (Why: Maintainability and consistency).
       - **Mocking Strategies:** Document common mocking strategies, especially for:
           - Dynamic `import()` calls in Jest.
           - R2 client interactions (if build tests involve mock uploads/downloads).
           - Browser features like `fetch` if used by `useRemoteComponent` directly. (Why: Reduces friction for test writers).

## Implementation Outline (Corresponds to User Request)

1.  **Update `src/server/workers/__tests__/`:** Modify existing tests (or create new ones) to:
    *   Validate that `buildCustomComponent.ts` produces ESM output.
    *   Use dynamic `import()` to load this ESM output in the test environment.
    *   Assert that `module.default` exists and is a function.
    *   Verify that specified dependencies (`react`, `remotion`) are treated as external and not bundled.
2.  **Add React Component Tests:**
    *   Create tests for `useRemoteComponent.tsx` using `@testing-library/react`:
        *   Mock dynamic `import(url)`.
        *   Test rendering with `<Suspense fallback={...}>` during load.
        *   Test successful rendering of the resolved component.
        *   Test error handling with `<ErrorBoundary>` when import fails.
    *   Create tests for `CustomScene.tsx`:
        *   Ensure it correctly uses the lazy-loading hook.
        *   Verify its own `<Suspense>` and `<ErrorBoundary>` setup around the dynamic component.
3.  **Document Testing in `memory-bank/testing`:**
    *   Create `memory-bank/testing/esm-component-testing.md`.
    *   Detail how to run the new test suites.
    *   Provide examples and best practices for mocking dynamic `import()`.
    *   Explain how to test components utilizing `React.lazy` and `<Suspense>`.

## Affected Areas

-   `src/server/workers/__tests__/*` (updates to existing, potentially new files)
-   `src/hooks/__tests__/*` (new test files, e.g., `useRemoteComponent.test.tsx`)
-   `src/remotion/components/scenes/__tests__/*` (new test files, e.g., `CustomScene.test.tsx`)
-   `memory-bank/testing/esm-component-testing.md` (new documentation file)
-   Jest configuration (`jest.config.js` or `package.json`) might need updates for ESM, moduleNameMapper for dynamic imports, or specific transformIgnorePatterns if not already handled.
-   CI/CD pipeline configuration files (e.g., GitHub Actions workflows) to include execution of new test suites.

## Integration with Other Tickets

-   **BAZAAR-255 (ESM Build Pipeline):** Tests in `src/server/workers/__tests__/` will directly validate the outputs and success criteria of BAZAAR-255.
-   **BAZAAR-256 (Modernize Component Loading):** Tests for `useRemoteComponent` and `CustomScene` will verify the correct implementation of `React.lazy`, `<Suspense>`, and error handling as defined in BAZAAR-256.
-   **BAZAAR-257 (Update Component Generation Templates):** The components used or mocked in tests should adhere to the new ESM-compliant template structure.
-   **BAZAAR-258 (Runtime Dependency Resolution Strategy):** While direct testing of import maps in Jest is complex, the server-side tests verifying externalization of dependencies are a prerequisite for import maps to function correctly.

## Implementation Checklist

-   [x] **Build Verification Tests (`src/server/workers/__tests__/`):**
    -   [x] Test for valid ESM output from `buildCustomComponent.ts`.
    -   [x] Test dynamic `import()` of the built ESM.
    -   [x] Assert `module.default` is a function.
    -   [x] Verify `react` & `remotion` are external (not bundled).
-   [ ] **`useRemoteComponent` Tests (`src/hooks/__tests__/`):**
    -   [ ] Mock dynamic `import(url)`.
    -   [ ] Test `<Suspense>` fallback rendering.
    -   [ ] Test successful component rendering post-load.
    -   [ ] Test error handling via `<ErrorBoundary>` on import failure.
    -   [ ] Test refresh mechanism (if applicable).
-   [ ] **`CustomScene` Tests (`src/remotion/components/scenes/__tests__/`):**
    -   [ ] Verify integration with mocked lazy `useRemoteComponent`.
    -   [ ] Test scene-level `<Suspense>` and `<ErrorBoundary>`.
-   [x] **Documentation (`memory-bank/testing/esm-component-testing.md`):**
    -   [x] Document how to run new tests.
    -   [x] Document mocking strategies for dynamic `import()`.
    -   [x] Document testing patterns for `React.lazy` & `<Suspense>`.
-   [ ] **Configuration & CI:**
    -   [ ] Update Jest config if necessary (e.g., for ESM, `moduleNameMapper`).
    -   [ ] Integrate new test suites into CI pipeline.

## Risks and Mitigations

-   **Risk:** Complexity in reliably mocking dynamic `import()` across different test environments or Jest versions.
    -   **Mitigation:** Standardize on `jest.mock()` for module mocking. Clearly document the chosen approach. Ensure Jest is configured correctly for ESM if tests themselves are ESM.
-   **Risk:** Tests for `React.lazy` and `<Suspense>` can be tricky due to their asynchronous nature.
    -   **Mitigation:** Use `@testing-library/react`'s `waitFor` and `findBy*` async utilities to handle state changes and asynchronous rendering. Ensure tests `await` necessary operations.
-   **Risk:** Over-mocking, leading to tests that don't reflect real behavior or are too brittle.
    -   **Mitigation:** Mock at the boundaries (e.g., the dynamic `import()` itself) rather than internal implementation details of `React.lazy`. Focus on testing component behavior as the user or consuming code would see it.
-   **Risk:** Test environment (Node.js for Jest) differs significantly from browser environment where ESM components run.
    -   **Mitigation:** Unit/integration tests will cover logical correctness. Consider a minimal set of E2E smoke tests (using Playwright/Cypress if available) for critical user flows if high fidelity browser testing is paramount, though this is a larger undertaking. For now, robust unit/integration tests are the primary goal.
