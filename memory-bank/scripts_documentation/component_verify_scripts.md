# Documentation: `src/scripts/component-verify/`

This directory contains a suite of scripts designed to test, verify, and help maintain the custom component pipeline in the Bazaar-Vid application.

## 1. `verify-pipeline.ts`

**Purpose:**
This is the main script for end-to-end verification of the custom component pipeline. It tests each critical stage:
1.  **Component Generation:** Creates a predefined "canary" test component (`canary-component.js`).
2.  **Database Storage:** Inserts the canary component's metadata into the database.
3.  **Compilation & R2 Upload:** Triggers the compilation process for the canary component and uploads the resulting JavaScript bundle to R2 cloud storage.
4.  **API Access:** Verifies that the component's JavaScript can be successfully retrieved via its API endpoint (`/api/components/[componentId]`).
5.  **UI Rendering (Simulated):** Uses Puppeteer to launch a headless browser, load the component into a test HTML page (`simple-test.html` as a template), and checks for successful rendering and any critical errors. It specifically ignores common, non-critical React warnings like missing 'key' props or devtools suggestions.

**Key Functionality & Recent Fixes:**
*   Uses `canary-component.js` as a stable, pre-written component for consistent testing.
*   Simulates rendering in a headless browser using Puppeteer.
*   Includes detailed logging for each step.
*   Saves a screenshot of the rendered component and a JSON summary of results in the `output/` directory.
*   Recent troubleshooting involved addressing a `ts-node` caching issue where an older version of an error-checking function was being used. This was resolved by renaming the function (`analyzePageForCriticalErrors_V135`) to force a cache break.

**Usage:**
```bash
cd src/scripts/component-verify
npm install # If not already done
npm run verify
```
**Prerequisites:**
*   Requires Node.js and npm.
*   Environment variables for R2 (`R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, etc.) and the database (`DATABASE_URL`) must be configured.
*   The main application (Next.js server) should be running to test the API endpoint.

## 2. `canary-component.js`

**Purpose:**
A simple, pre-written Remotion component used by `verify-pipeline.ts` as a consistent test subject. It's designed to be a valid component that *should* always render successfully if the pipeline is working.

**Content:**
Contains basic Remotion boilerplate, including `React`, `AbsoluteFill`, `useCurrentFrame`, `useVideoConfig`, etc., and renders a simple visual output (e.g., text changing over time).

## 3. `check-component.ts`

**Purpose:**
A utility script to inspect a *specific* existing component by its ID. It fetches component data from the database, checks its status, saves its TSX code and R2 content (if available) to the `output/` directory for inspection, performs static analysis on the TSX code for common issues, and verifies the R2 URL and its content (checking for fallbacks).

**Key Current Capabilities:**
*   Takes a single component ID as a command-line argument.
*   Fetches and displays component details from the database.
*   Saves the component's `tsxCode` and fetched R2 content to local files.
*   Performs static analysis on the `tsxCode` (checks exports, Remotion hook usage, `window.React`/`window.Remotion` usage, `window.__REMOTION_COMPONENT` assignment).
*   Verifies accessibility of the R2 `outputUrl` and checks if the served content is a fallback error component or the actual component bundle.
*   **Note:** Currently, it does *not* perform automated browser rendering (e.g., via Puppeteer).

**Usage (Requires `ts-node` or compilation to JS):
```bash
# Ensure dependencies like pg, dotenv, chalk are installed in its context
# From the root of the 'bazaar-vid' project, you might run:
# npx ts-node src/scripts/component-verify/check-component.ts <your-component-id>
# Or, if you have a script in component-verify/package.json:
# cd src/scripts/component-verify
# npm run check-component -- <your-component-id>
```
This script is useful for diagnosing issues with individual components that might have failed in the main pipeline by providing detailed information and local copies of their code/bundles.

## 4. `fix-missing-components.ts` (and `.js`)

**Purpose:**
This script (likely with a compiled `.js` version) is designed to address situations where components are marked as 'success' or 'complete' in the database but their corresponding JavaScript bundle is missing from R2 storage. 

**Functionality (Typical):**
1.  Scans the database for components that meet the criteria (e.g., status 'complete' but `outputUrl` is invalid or file not found in R2).
2.  For each such component, it attempts to re-trigger the build process (`buildCustomComponent` worker).
3.  Verifies successful upload to R2.
4.  Updates the database record with the correct `outputUrl` and status.

**Usage:** Usually run manually when R2/DB inconsistencies are suspected or identified.

## 5. `check-tables.js`

**Purpose:**
A utility script, likely written in JavaScript for direct Node execution, to perform basic checks or queries on relevant database tables (e.g., `CustomComponentJob`, `Animation`). It might be used for:
*   Counting records.
*   Checking for specific statuses.
*   Identifying orphaned records or inconsistencies not covered by `fix-missing-components`.

**Usage:** Run directly with Node.js.
```bash
node src/scripts/component-verify/check-tables.js
```

## 6. `simple-test.html`

**Purpose:**
A template HTML file used by `verify-pipeline.ts` and `check-component.ts` for Puppeteer rendering tests. 

**Content:**
*   Includes script tags for React, ReactDOM, and Remotion.
*   Has a placeholder script tag (`<script id="component-script" src=""></script>`) where the URL of the component to be tested is dynamically inserted.
*   Contains a root DOM element (e.g., `<div id="root"></div>`) for Remotion to render into.
*   Includes JavaScript logic to initialize the Remotion player and render the component referenced by `window.__REMOTION_COMPONENT`.

## 7. `package.json`

**Purpose:**
Defines the Node.js package for the `component-verify` scripts. 

**Content:**
*   Dependencies: `axios`, `chalk`, `dotenv`, `puppeteer`, `ts-node`, `typescript`, and database client (`pg` or similar).
*   Scripts: Notably, the `verify` script (`node --loader ts-node/esm verify-pipeline.ts`) and potentially others for running `check-component.ts`, etc.

## 8. `README.md` (in `component-verify` directory)

**Purpose:**
Provides an overview, usage instructions, and implementation details primarily focused on the `verify-pipeline.ts` script and the broader project goals for pipeline reliability. Parts of this document were used to generate this consolidated documentation.

## 9. `output/` (Directory)

**Purpose:**
This directory is used by `verify-pipeline.ts` (and potentially `check-component.ts`) to store the results of test runs. For each component test:
*   A temporary HTML file (e.g., `[componentId]_render_test.html`) is created.
*   A screenshot of the Puppeteer rendering (e.g., `[componentId]_screenshot.png`) is saved.
*   A JSON file with detailed results (e.g., `[componentId]_results.json`) might be saved.
This directory should typically be in `.gitignore`.

## Notes on `.js` vs `.ts` files:
Some scripts might have both `.ts` (TypeScript source) and `.js` (compiled JavaScript) versions. Typically, the `.ts` files are the source of truth, and `.js` files are either compiled artifacts or older scripts written directly in JavaScript.
