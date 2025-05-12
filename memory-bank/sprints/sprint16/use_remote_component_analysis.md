// /memory-bank/sprints/sprint16/use_remote_component_analysis.md

# Analysis of `~/hooks/useRemoteComponent.tsx`

This document will detail the analysis of the `useRemoteComponent.tsx` hook and its helper component `RemoteComponent`.

## Core Mechanism:

1.  **Dynamic Script Loading:** Instead of `import()`, it dynamically creates a `<script>` tag.
    *   `src`: `/api/components/${componentId}?t=${timestamp}` (timestamp for cache-busting).
2.  **Global Component Registration:** The loaded script is expected to assign the Remotion component to `window.__REMOTION_COMPONENT`.
3.  **Hook State:** Manages `loading`, `error`, `component` (the fetched React component).
4.  **`useEffect` (main fetching logic, dependency: `componentId`):
    *   Cleans up old script and `window.__REMOTION_COMPONENT`.
    *   Creates and appends the new script tag.
    *   `onload` (`handleScriptLoad`): Retrieves component from `window.__REMOTION_COMPONENT`.
    *   `onerror` (`handleScriptError`): Sets error state.
    *   Cleanup: Removes script and clears global on unmount or `componentId` change.
5.  **`RemoteComponent` (Exported Wrapper):
    *   Used by `CustomScene.tsx`.
    *   Calls `useRemoteComponent(componentId)` internally.
    *   Renders the fetched component or loading/error states.

## Role of `refreshToken` (Indirect via `CustomScene.tsx`):

*   `useRemoteComponent` does not directly use `refreshToken`.
*   `CustomScene.tsx` uses its `externalRefreshToken` to generate a `refreshKey`.
*   This `refreshKey` is part of the `key` prop for `<RemoteComponent />` (`key={component-${componentId}-${refreshKey}}`).
*   A change in `refreshKey` forces `<RemoteComponent />` to unmount and re-mount a new instance.
*   This triggers `useRemoteComponent`'s `useEffect` to run afresh, fetching a new script with a new cache-busting timestamp.

## Key Questions Addressed:

-   **Component Fetching**: Dynamically loads a JS file from `/api/components/${componentId}?t=${timestamp}` via a script tag. The script sets `window.__REMOTION_COMPONENT`.
-   **Role of `componentId`**: Directly used to construct the script URL.
-   **Role of `refreshToken`**: Indirect. Changes to `refreshToken` in `CustomScene.tsx` cause `RemoteComponent` to re-mount (due to a new `key`), which triggers `useRemoteComponent` to re-fetch the script.
-   **Component Rendering**: `RemoteComponent` renders the component obtained by `useRemoteComponent` or shows loading/error UI.
-   **Loading/Error Handling**: The hook manages `loading` and `error` states, providing UI for both. A retry mechanism (`reloadComponent`) is available.
-   **Caching**: Explicit cache-busting is done via a timestamp query parameter in the script URL. No other client-side caching of the component code is apparent within this hook itself.
-   **Dependencies**: React (`useState`, `useEffect`, `useMemo`), Remotion (for types, potentially for `delayRender` though not directly seen in the immediate hook logic for fetching).

## Observations & Findings:

*   The hook uses a global variable (`window.__REMOTION_COMPONENT`) as an interface between the dynamically loaded script and the React component tree. This is a common pattern for this type of dynamic loading but requires the external script to conform to this expectation.
*   The cache-busting timestamp (`?t=${Date.now()}`) in the script URL is crucial and correctly implemented to request a fresh resource from the `/api/components/...` endpoint.
*   The re-mount strategy for `RemoteComponent` via the `key` prop (driven by `CustomScene`'s `refreshKey`) is a standard and effective way to ensure `useRemoteComponent` re-runs its fetching logic when the `refreshToken` changes.
*   Console log interception is present for debugging purposes.
*   The console log `[useRemoteComponent] Loading component: ${componentId} with timestamp: ${timestamp}` is a key indicator for debugging.

## Potential Issues & Hypotheses (related to the original problem):

If the Remotion preview isn't updating despite `refreshToken` changes propagating correctly to `CustomScene` and causing `RemoteComponent` to re-mount:

1.  **API Serving Stale Content (Primary Hypothesis):** The API endpoint `/api/components/${componentId}` might be serving cached/stale JavaScript code, even with the cache-busting timestamp. This could be due to server-side caching (e.g., CDN, R2 file caching layer) that isn't properly invalidated when a new component version is available.
2.  **Script Execution Errors:** The newly fetched script itself might contain errors that prevent it from correctly setting `window.__REMOTION_COMPONENT`, or the component code within the script might be faulty. These errors might be visible in the browser console.
3.  **Global Variable Conflict/Mismanagement:** While `window.__REMOTION_COMPONENT` is cleared on cleanup and before loading a new script, complex scenarios or race conditions (though less likely with `useEffect`'s sequencing) could theoretically interfere.
4.  **Subtle Errors in Load/Error Handling:** An edge case in `handleScriptLoad` or `handleScriptError` might prevent the `component` state from being updated correctly.

## Next Steps:

*   **Verify API Behavior**: The most critical next step is to confirm whether the `/api/components/${componentId}?t=${timestamp}` endpoint actually serves the *updated* JavaScript content when a component is modified and the `refreshToken` triggers a re-fetch.
    *   This can be checked by: 
        *   Manually accessing the URL in a browser (with a new timestamp) after an update and inspecting the served JS.
        *   Checking server-side logs for the API endpoint to see what file it's retrieving from R2.
*   **Inspect Browser Console:** Look for any errors related to script loading or execution when a custom component is supposed to update.

## Code Snippets & Key Logic:

*(To be filled)*
