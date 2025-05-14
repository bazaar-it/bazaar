// /memory-bank/overview-may13/windsurfoverview.md
Run various analyses using your toolkit:
Check R2 storage.
Compare component statuses in the database versus their actual state in the codebase/R2.
Examine the build process: how imports and exports are handled, the LLM's role in code generation (e.g., are imports included?), and the window.REMOTION_COMPONENT assignment.
Consult Remotion documentation: Are we following best practices?
Analyze logs for errors when adding components to scenes.
Compare components with successful builds versus those with errors.
Ultimately, understand why even successfully built components fail when added to a scene in the PreviewPanel/DynamicVideo.

# Debugging Custom Components in Remotion Preview

## 1. Problem Statement

Custom components, even those marked as "build complete" in the database and present in R2 storage, are not rendering correctly in the Remotion preview (`@PreviewPanel.tsx` / `@DynamicVideo.tsx`). This investigation aims to identify the root cause(s) and implement solutions.

## 2. Key Investigation Areas

### 2.1. Component Generation (LLM & Templating)
    - **LLM Output:**
        - Are necessary imports included (React, Remotion hooks like `useCurrentFrame`, `AbsoluteFill`, etc.)?
        - Is the `window.Remotion?.RemotionPlayer` or `window.REMOTION_COMPONENT` pattern correctly implemented for component registration?
        - Is the component exporting a valid React component?
        - Are props (`inputProps`) correctly defined and utilized?
    - **Templating (`componentTemplate.ts`):**
        - Does the template correctly wrap/integrate the LLM-generated code?
        - Are there any hardcoded elements or assumptions in the template that might conflict with generated code?

### 2.2. Build Process (`buildCustomComponent.ts`)
    - **esbuild Configuration:**
        - Is `format: 'esm'` consistently used? (Ref: MEMORY[bfeed299-f2a1-4d63-a7b6-f1ca00d404e4])
        - Are there any issues with tree-shaking or bundling that might remove essential Remotion exports or React?
        - How are external dependencies (like `react`, `remotion`) handled? Are they correctly marked as external if Remotion expects to provide them?
    - **Error Handling:**
        - Are build errors comprehensively logged and surfaced?
        - Do "successful" builds still contain subtle warnings or issues?

### 2.3. Database and R2 Storage Integrity
    - **DB Status (`components` table):**
        - Does `status: 'complete'` accurately reflect a successful, error-free build?
        - Is `outputUrl` (R2 path) correct and accessible?
        - Is `errorDetails` clear for failed components?
    - **R2 Objects:**
        - Does the JavaScript file in R2 contain the expected bundled code?
        - Is the file size reasonable?
        - Can the R2 file be manually inspected/downloaded?

### 2.4. Remotion Runtime Integration (`DynamicVideo.tsx`, `CustomScene.tsx` or similar)
    - **Loading Mechanism:**
        - How is the component script from R2 fetched and loaded into the browser/Remotion context? (e.g., `<script>` tag, `import()`)
        - Is it loaded *before* Remotion tries to render it?
        - Caching issues? (Ref: MEMORY[c9eec4fb-cdf7-4c38-a9ba-2709017b3404] - though for API, principle might apply to component scripts if served via an endpoint).
        - Script cleanup: `PreviewPanel.tsx` now uses a selective script cleanup (`cleanupComponentScripts`) for individual component refreshes, when components are removed, and also for the main "Refresh Preview" button (via `handleRefresh`). This ensures only relevant scripts are targeted. (See `component-pipeline-fixes.md` for details).
    - **Component Registration & Invocation:**
        - How does Remotion find and instantiate the custom component by its ID/name?
        - Is `window.Remotion.registerComponent` being used, or a similar mechanism if we've evolved?
        - What props are actually passed to the component instance in the scene?
        - Do these props match what the component expects (as defined in its `inputPropsSchema` or internal structure)?
    - **Remotion Version & Compatibility:**
        - Are there any mismatches between the Remotion version used for building components and the one running the player?
        - Any deprecated Remotion APIs being used?

### 2.5. Props and Data Flow (`handleAddToVideo`, `sceneSchema`)
    - **`handleAddToVideo` (in `Sidebar.tsx` or similar):**
        - Is the scene object created for the custom component correctly structured according to `sceneSchema`? (Ref: MEMORY[6219c0ca-824c-4a26-a228-76597a9b23e1])
        - Specifically, is the `props` (or `data`) field for the scene correctly passing necessary information (like `componentId`, `src` if needed by our loading mechanism)?
    - **`AnimationDesignBrief` & `inputProps`:**
        - Is the information from the `AnimationDesignBrief` correctly translated into the `inputProps` the component expects at runtime?

## 3. Tools & Scripts for Investigation

- **DB Analysis Scripts:**
    - `src/scripts/db-tools/explore-db.js`
    - `src/scripts/db-tools/list-all-components.js`
    - `src/scripts/db-tools/analyze-component.js [componentId]`
    - `src/scripts/db-tools/check-r2-component.js [componentId]`
    - `src/scripts/db-tools/analyze-errors.js`
- **Logs:**
    - Browser Developer Console (Network requests, Console errors/warnings)
    - Server-side logs (Next.js console, any specific worker logs)
    - `logs/error-YYYY-MM-DD.log`
- **Remotion Documentation:**
    - Official Remotion docs on creating and using custom components, dynamic sources, props.
- **Codebase Search & Inspection:**
    - `grep_search` / IDE search.
    - `view_code_item`, `view_line_range`.

## 4. Action Plan & Findings Log

**Step 1: Select a Test Case**
    - Identify a component ID that is:
        - Marked `status: 'complete'` in the `components` table.
        - Has a valid `outputUrl` pointing to an existing R2 object.
        - Fails to render when added to a scene.
    - **Selected Component ID:** `50d8b936-9b5f-4988-b5ad-4be515268e61`
    - **Observed Error (Initial):** `[PASTE_ERROR_MESSAGE_HERE]`

**Step 2: Analyze Component (DB & R2)**
    - Run `analyze-component.js [ID]` and `check-r2-component.js [ID]`.
    - Manually inspect the R2 bundle if possible.
    - **Findings:**
        - `analyze-component.js` output:
        - `check-r2-component.js` output:
        - R2 bundle inspection notes:

**Step 3: Remotion Documentation Review**
    - Focus on:
        - How to correctly define and export a Remotion component.
        - How to register and use dynamically loaded components.
        - Standard props available to components (`durationInFrames`, `fps`, etc.).
    - **Key Remotion Docs Insights:**
        -
        -

**Step 4: Code Review - LLM Output & Build Process**
    - Examine the `sourceCode` and `generatedCode` for the selected component from the DB.
    - Review `buildCustomComponent.ts`, especially `compileWithEsbuild`.
    - **Finding (May 13):** The "Component Error" UI originates as a hardcoded fallback in `generateComponentCode.ts` when LLM generation fails. This fallback is then passed to `applyComponentTemplate`.
    - **Finding (May 13):** The `processComponentJob` function (within `generateComponentCode.ts`) calls `generateComponentCode`. If `generateComponentCode` encounters a syntax error in the LLM's output, it currently creates a `fallbackComponent` (the error UI) and *returns* its code without throwing an error. `processComponentJob` then receives this fallback code, saves it as `code.tsx`, and updates the job status to `generated`. The subsequent build process then successfully builds this error component and marks the job `complete`.
    - **Proposed Fix (May 13):** Modify `generateComponentCode.ts` so that when `validateComponentSyntax` fails, it *throws an error* instead of returning the `fallbackComponent` code. This error would be caught by `processComponentJob`, which would then correctly mark the job as `failed`.

**Step 5: Hypothesis & Experimentation**
    - Formulate hypotheses based on findings.
    - Design small experiments to test hypotheses (e.g., simplify a component, manually create a scene object).
    - **Hypothesis 1:**
        - **Experiment:**
        - **Result:**
    - **Hypothesis 2:**
        - **Experiment:**
        - **Result:**

**Ongoing: Log all errors (browser console, server) meticulously.**

---
*(This document will be updated as the investigation progresses)*

## 1. Problem Statement

Custom components, even those marked as "build complete" in the database and present in R2 storage, are not rendering correctly or at all within the Remotion preview (`DynamicVideo.tsx`). This investigation aims to identify the root causes and implement solutions.

## 2. Core Questions
*   Why are components that report successful builds failing at runtime in Remotion?
*   What are the discrepancies between the expected component structure/bundle and what's actually being produced and loaded?
*   Are there issues with how props, context, or imports/exports are handled during component generation, build, or rendering?

## 3. Investigation Areas

### 3.1. Component Status (Database & R2)
*   **Goal:** Verify the true status and integrity of components.
*   **Actions:**
    *   Use `list-all-components.js` to identify components with "complete" status.
    *   Use `check-r2-component.js` to confirm their presence and accessibility in R2.
    *   Use `analyze-component.js` to review database records (errors, input props, generated code).
*   **Hypothesis:** Discrepancies between DB status, R2 availability, and actual build integrity.

### 3.2. Build Process & Bundling (esbuild)
*   **Goal:** Understand if the build process (`compileWithEsbuild` in `buildCustomComponent.ts`) is producing a valid Remotion-compatible bundle.
*   **Actions:**
    *   Review `esbuild` configuration (`format: 'esm'`, entry points, externals).
    *   Manually inspect a "successful" bundle from R2. What does it contain?
    *   Compare the bundle structure with Remotion's expectations (e.g., `Remotion.registerRoot`).
    *   Examine how `react` and `remotion` are handled (externalized vs. bundled).
*   **Hypothesis:** Incorrect esbuild configuration, missing Remotion registration, or issues with external dependencies. The `format: 'esm'` fix (MEMORY[bfeed299-f2a1-4d63-a7b6-f1ca00d404e4]) was a good step, but there might be other issues.

### 3.3. LLM-Generated Code
*   **Goal:** Ensure the code generated by the LLM is valid, import-complete, and adheres to Remotion component structure.
*   **Actions:**
    *   Analyze the TSX code for several "complete" components (from `analyze-component.js` or DB).
    *   Does it include necessary imports (React, Remotion APIs like `AbsoluteFill`)?
    *   Does it define and export a React component correctly?
    *   Is `window.REMOTION_COMPONENT` being assigned correctly as per our template (`src/server/workers/componentTemplate.ts`)?
    *   How are props defined and used?
*   **Hypothesis:** LLM might be generating incomplete or subtly incorrect code (e.g., missing imports, incorrect export structure, misuse of `window.REMOTION_COMPONENT`).

### 3.4. Remotion Integration & Runtime
*   **Goal:** Debug how `DynamicVideo.tsx` (and its underlying custom scene logic) loads and renders custom components.
*   **Actions:**
    *   Trace the `src` URL passed to the custom component scene in `DynamicVideo.tsx`. Is it correct?
    *   Examine browser console logs for errors when attempting to load/render a custom component.
    *   Review how `Remotion.continueRender` and `Remotion.delayRender` might be involved if components are asynchronous or rely on external data.
    *   Check the props being passed to the custom component instance within the Remotion scene. Are they compatible with what the component expects?
*   **Hypothesis:** Issues with component loading (CORS, 404s), runtime errors within the component code itself, or Remotion-specific rendering problems.

### 3.5. Remotion Documentation & Best Practices
*   **Goal:** Cross-reference our implementation with official Remotion documentation for custom components.
*   **Actions:**
    *   Consult Remotion docs on:
        *   Bundling components.
        *   Registering components (`Remotion.registerRoot` or similar patterns for dynamic loading if applicable).
        *   Props and composition.
        *   Lazy loading or dynamic imports if we're using them.
    *   Use the `remotion-documentation` MCP server to query specific topics.
*   **Hypothesis:** We might be missing a key step or best practice recommended by Remotion.

## 4. Tools & Scripts for Investigation
*   `src/scripts/db-tools/list-all-components.js`
*   `src/scripts/db-tools/analyze-component.js --componentId <ID>`
*   `src/scripts/db-tools/check-r2-component.js --componentId <ID>`
*   `src/scripts/db-tools/run-analysis.sh` (for broader checks)
*   Browser Developer Tools (Network tab, Console)
*   VS Code debugger (if applicable for server-side build/load steps)
*   Manual inspection of R2 bundles.
*   `remotion-documentation` MCP server.

## 5. Action Plan & Findings Log (Timeline)

*   **Step 1 (Today - May 13th): Initial Setup & Component Selection**
    *   **Action:** Populate this document with the initial investigation framework. (DONE by Cascade)
    *   **Action (USER/Cascade):** Identify 1-2 specific `componentId`s that are:
        *   Marked "complete" or "success" in the `components` table.
        *   Have no `buildErrors` or `generationErrors`.
        *   Are confirmed to exist in R2 via `check-r2-component.js`.
        *   Still FAIL to render in the `PreviewPanel`.
    *   **Log:**
        *   Selected Component ID 1: `50d8b936-9b5f-4988-b5ad-4be515268e61` (Selected by Cascade from `list-all-components` output)
        *   Selected Component ID 2: `31ba948d-4aef-4f7e-8d82-17e872dcabfa` (Selected by Cascade from `list-all-components` output)
        *   **Note (2025-05-13):** Previous attempts to select component IDs failed as they were not found in the DB by scripts. `list-all-components.js` was run. Cascade selected the two most recent 'complete' components from its output for analysis: `50d8b936-9b5f-4988-b5ad-4be515268e61` and `31ba948d-4aef-4f7e-8d82-17e872dcabfa`.

*   **Step 2: Deep Dive into Selected Components**
    *   **Action (USER/Cascade):** For each selected component:
        *   Run `analyze-component.js --componentId <ID> --outputDir analysis/component_debug_may13`.
        *   Review the generated TSX code.
        *   Manually download and inspect the `bundle.js` from R2.
        *   Attempt to add it to a video and capture ALL browser console errors and any relevant server logs.
    *   **Findings:**
        *   Component `50d8b936-9b5f-4988-b5ad-4be515268e61` (TheRedBubbleScene):
            *   Status (DB): `complete`
            *   `analyze-component.js` (`analysis/components/50d8b936-9b5f-4988-b5ad-4be515268e61/analysis.md`):
                *   Has "use client" directive.
                *   Has destructured imports.
                *   **Correction:** `useVideoConfig` IS imported in the `code.tsx`. The script's finding was incorrect for this component.
            *   `check-r2-component.js`:
                *   Exists in R2: `https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev/custom-components/50d8b936-9b5f-4988-b5ad-4be515268e61.js`
                *   Script Error: `TypeError: fs.createWriteStream is not a function` (prevents bundle download by script, but R2 existence confirmed).
            *   TSX Code Analysis (Manual Review of `.../code.tsx`):
                *   `useVideoConfig` is correctly imported.
                *   Component renders an internal error message: "Component Error", "The component could not be generated correctly."
                *   Contains comment: `// Original implementation had syntax errors: Cannot use import statement outside a module`.
                *   This suggests the component is a fallback/error display.
            *   R2 Bundle Inspection (Manual if script fixed, or via direct download): Downloaded via fixed `check-r2-component.js` to `analysis/r2/50d8b936-9b5f-4988-b5ad-4be515268e61/50d8b936-9b5f-4988-b5ad-4be515268e61.js`. **Review of the bundle confirms it IS the static "Component Error" UI (minified).**
            *   Browser Console Errors (When attempting to render): ...
            *   Server Logs (When attempting to render): ...
        *   Component `31ba948d-4aef-4f7e-8d82-17e872dcabfa` (ASmallRedScene):
            *   Status (DB): `complete`
            *   `analyze-component.js` (`analysis/components/31ba948d-4aef-4f7e-8d82-17e872dcabfa/analysis.md`):
                *   Has "use client" directive.
                *   Has destructured imports.
                *   **Correction:** `useVideoConfig` IS imported in the `code.tsx`. The script's finding was incorrect for this component as well.
            *   `check-r2-component.js`:
                *   Exists in R2: `https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev/custom-components/31ba948d-4aef-4f7e-8d82-17e872dcabfa.js`
                *   Script Error: `TypeError: fs.createWriteStream is not a function` (prevents bundle download by script, but R2 existence confirmed).
            *   TSX Code Analysis (Manual Review of `.../code.tsx`):
                *   `useVideoConfig` is correctly imported.
                *   Component renders an internal error message: "Component Error", "The component could not be generated correctly."
                *   Contains comment: `// Original implementation had syntax errors: Cannot use import statement outside a module`.
                *   This also suggests the component is a fallback/error display.
            *   R2 Bundle Inspection (Manual if script fixed, or via direct download): ...
            *   Browser Console Errors (When attempting to render): ...
            *   Server Logs (When attempting to render): ...

*   **Summary of Component Analysis (May 13):**
    *   The `analyze-component.js` script incorrectly reported that `useVideoConfig` was not imported for both selected components (`50d8...` and `31ba...`). Manual inspection of their `code.tsx` files confirms the import is present.
    *   Both components, despite being `complete` in the DB and present in R2, are actually rendering a static, pre-defined error UI ("Component Error", "The component could not be generated correctly."). This indicates the original LLM generation or subsequent processing failed, and this error display is the fallback.
    *   The `check-r2-component.js` script (now fixed) successfully downloaded the R2 bundle for component `50d8b936-9b5f-4988-b5ad-4be515268e61`. **Inspection of this bundle confirms it is the minified version of the static error component UI.**
    *   Further investigation needed for `analyze-component.js` import checking logic, as it yielded incorrect results for the test cases.
    *   **Key Finding:** The issue is not that correctly generated components are failing to render, but that components representing an error state are being successfully built, uploaded to R2, and marked 'complete' in the database.

*   **Step 3: Build Process Review**
    *   **Action (Cascade/USER):** Review `src/server/workers/buildCustomComponent.ts` (`compileWithEsbuild`) against Remotion bundling best practices.
    *   **Findings:** ...

*   **Step 4: Component Generation Logic Review**
    *   **Question:** Where does the "Component Error" UI originate if LLM generation or patching fails?
    *   **Action:** Review `src/server/workers/generateComponentCode.ts` for hardcoded fallback/error templates.
    *   **Finding (May 13):** The "Component Error" UI originates as a hardcoded fallback in `generateComponentCode.ts` when LLM generation fails. This fallback is then passed to `applyComponentTemplate`.
    *   **Question:** How is a component that is essentially an error display being marked 'complete' and 'successful' in the database?
    *   **Action:** Review logic in `src/server/workers/buildCustomComponent.ts` (and related job update functions, likely the caller of `generateComponentCode`) that determines success/completion based on the output of `generateComponentCode.ts`.
    *   **Finding (May 13):** The `processComponentJob` function (within `generateComponentCode.ts`) calls `generateComponentCode`. If `generateComponentCode` encounters a syntax error in the LLM's output, it currently creates a `fallbackComponent` (the error UI) and *returns* its code without throwing an error. `processComponentJob` then receives this fallback code, saves it as `code.tsx`, and updates the job status to `generated`. The subsequent build process then successfully builds this error component and marks the job `complete`.
    *   **Proposed Fix (May 13):** Modify `generateComponentCode.ts` so that when `validateComponentSyntax` fails, it *throws an error* instead of returning the `fallbackComponent` code. This error would be caught by `processComponentJob`, which would then correctly mark the job as `failed`.