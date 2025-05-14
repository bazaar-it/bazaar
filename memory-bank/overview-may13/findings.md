# Jest Test Failure Analysis: customComponentFlow.test.ts

## Issue Summary
The end-to-end test in `src/tests/e2e/customComponentFlow.test.ts` fails during the component build stage, preventing full pipeline testing. Specifically, the esbuild compilation process encounters symbol redeclaration errors for React and Remotion components.

## Errors Observed

```
✘ [ERROR] The symbol "AbsoluteFill" has already been declared
✘ [ERROR] The symbol "useCurrentFrame" has already been declared
✘ [ERROR] The symbol "React" has already been declared
✘ [ERROR] Expected "(" but found "!=="
```

The test expects job status to be `"success"` but receives `"error"` due to these compilation failures.

## Root Cause Analysis

After examining the component builder code in `src/server/workers/buildCustomComponent.ts`, we identified that the mismatch occurs between:

1. **The LLM-generated component code format** in the test
2. **The expected format** that the component builder's preprocessing step requires

### The Component Builder's Processing Flow

1. **Code Preprocessing**:
   - Retrieves component TSX from the database
   - Removes import statements via `sanitizeTsx()` function
   - Handles React/Remotion references

2. **Code Wrapping**:
   - Wraps the component code with global declarations:
   ```js
   const { React, AbsoluteFill, useCurrentFrame, /* etc */ } = window.Remotion || {};
   ```

3. **Compilation**:
   - Uses esbuild to compile the modified code
   - Expects component code to use the globals it provides

### Issue Details

The current implementation of `LLM_RESPONSE_PLACEHOLDER` in the test contains React/Remotion import statements:

```js
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import React from 'react';

export default function FireworksEffect() {
  // ...
}
```

Even when these imports are commented out, the compilation process still identifies them and encounters conflicts with the globals the component builder tries to define.

## Required Fix

The `LLM_RESPONSE_PLACEHOLDER` in the test should:

1. **Completely remove import statements** (not just comment them out)
2. **Use the expected format** that relies on globals provided by the component wrapper

### Proper Component Format Example

From examining successful components (like in `/analysis/components/cbd9f87c-6fac-401c-85be-0f88318ff31a/analysis.md`), the expected format is:

```js
// No imports at all - not even commented ones

export default function ComponentName(props) {
  const frame = useCurrentFrame(); // Directly use Remotion globals
  // ...
  return (
    <AbsoluteFill> {/* Directly use Remotion components */}
      {/* ... */}
    </AbsoluteFill>
  );
}
```

## Solution Options

### Option 1: Update Test's LLM_RESPONSE_PLACEHOLDER
Modify the mock LLM response to match the expected format without any import statements.

### Option 2: Mock buildCustomComponent
If testing the full pipeline isn't necessary, mock the `buildCustomComponent` function to return success without actual compilation.

### Option 3: Add Component Preprocessing
Add preprocessing to the test that transforms the LLM output before passing it to the component builder.

## Next Steps

1. Implement Option 1 (most direct solution) by removing all import statements from `LLM_RESPONSE_PLACEHOLDER`
2. Test again to confirm the fix works
3. Update documentation to reflect the expected component code format for future development
4. Consider updating the OpenAI prompt used for component generation to explicitly avoid import statements

## Documentation Implications

This finding should be added to the component generation documentation to clarify that generated components:
- Should not include import statements for React or Remotion
- Should use Remotion components and hooks directly (they'll be available via globals)
- Should export a default function or component

## May 14th - Component Pipeline & `customComponentFlow.test.ts` Analysis

Based on recent testing and verification scripts, the following understanding has been reached:

**Component Pipeline Status:**
*   **Overall:** The core custom component pipeline (generation, DB storage, compilation, R2 upload, API serving) is largely functioning correctly.
*   **Verification Script:** The `verify-pipeline.ts` script successfully:
    *   Generated a canary component.
    *   Stored it in the database.
    *   Compiled the component.
    *   Uploaded it to R2.
    *   Confirmed the API endpoint serves the component JavaScript.
*   **Browser Rendering Test (within verification script):** There's an issue with error capturing in the browser rendering test part of the verification script, but this doesn't seem to indicate a failure in the component generation or serving itself.

**`customComponentFlow.test.ts` Issues:**
*   **Primary Failure:** The E2E test `customComponentFlow.test.ts` is failing during the esbuild compilation step.
*   **Error Messages:**
    *   `The symbol "AbsoluteFill" is already declared`
    *   `The symbol "useCurrentFrame" is already declared`
    *   `The symbol "React" is already declared`
    *   Syntax error: `Expected "(" but found "!=="`
*   **Root Cause:** The `wrapTsxWithGlobals` function in `src/server/workers/buildCustomComponent.ts` injects global declarations (e.g., `const React = global.React;`). These conflict with explicit import statements (e.g., `import React from 'react';`) present in the test component code used by `customComponentFlow.test.ts`. "Real" components generated by the LLM are typically snippets and rely on these globals, hence they work. The test component is structured differently.

**Proposed Solution for `customComponentFlow.test.ts`:**
1.  **Modify Test Component Source:**
    *   Remove the explicit imports for `React`, `AbsoluteFill`, and `useCurrentFrame` from the test component string within `customComponentFlow.test.ts`. The component should rely on the globals provided by `wrapTsxWithGlobals`, mirroring how LLM-generated snippets are expected to work.
    *   Correct the syntax error: `Expected "(" but found "!=="` within the test component string.
2.  **Rationale:**
    *   This aligns the test component's structure with that of typical LLM-generated components.
    *   The success of the verification script with a canary component suggests the pipeline and `wrapTsxWithGlobals` function are fundamentally sound for their intended purpose. The test failure is more likely an artifact of the test's specific implementation.

**Next Steps:**
*   Implement the proposed modifications to `customComponentFlow.test.ts`.
*   Further investigate error capturing in the browser rendering test of the `verify-pipeline.ts` script (lower priority if the core pipeline is confirmed stable).