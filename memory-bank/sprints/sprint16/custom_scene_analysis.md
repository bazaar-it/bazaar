// /memory-bank/sprints/sprint16/custom_scene_analysis.md

# Analysis of [src/remotion/components/scenes/CustomScene.tsx](cci:7://file:///Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/remotion/components/scenes/CustomScene.tsx:0:0-0:0)

This document will detail the analysis of the [CustomScene.tsx](cci:7://file:///Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/remotion/components/scenes/CustomScene.tsx:0:0-0:0) component. This component is rendered by `DynamicVideo.tsx` for scenes of type `custom`.

Its primary responsibility is likely to fetch the actual custom component code (or a reference to it) from a remote source (e.g., R2 storage) using the `componentId` and potentially leverage the `refreshToken` to ensure it fetches the latest version or to manage its internal state/re-rendering.

## Key Props Received (from `DynamicVideo.tsx`):

-   `data`: An object containing:
    *   `componentId: string`: The unique identifier for the custom component to be rendered.
    *   `refreshToken?: string`: The token passed down to potentially trigger re-fetches or re-renders. (Aliased as `externalRefreshToken` internally).
    *   `...scene.data`: Other data associated with the scene.


## Key Questions to Address:

1.  **Component Fetching**: How does [CustomScene.tsx](cci:7://file:///Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/remotion/components/scenes/CustomScene.tsx:0:0-0:0) fetch the custom component's code or bundle?
2.  **Role of `refreshToken`**: How is the `refreshToken` prop utilized within this component?
3.  **Component Rendering**: Once fetched, how is the custom component dynamically rendered?
4.  **Loading State**: How does [CustomScene.tsx](cci:7://file:///Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/remotion/components/scenes/CustomScene.tsx:0:0-0:0) handle the loading state while the custom component is being fetched?
5.  **Error Handling**: What happens if the component fails to fetch or if the fetched component encounters an error during rendering?
6.  **Caching**: Is there any client-side caching mechanism for fetched custom components?
7.  **Dependencies**: What are the key dependencies?

## Observations & Findings:

Based on the `view_file_outline` and content of [src/remotion/components/scenes/CustomScene.tsx](cci:7://file:///Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/remotion/components/scenes/CustomScene.tsx:0:0-0:0):

1.  **Props Reception**:
    *   It correctly receives `data` including `componentId` and an optional `refreshToken` (internally aliased as `externalRefreshToken`).

2.  **State Management**:
    *   `adbData: AnimationDesignBrief | null`: Stores the fetched Animation Design Brief.
    *   `error: string | null`: Stores error messages from fetching.
    *   `loading: boolean`: Indicates data fetching status.
    *   `refreshKey: string`: This is a critical piece of state.
        *   Initialized using `externalRefreshToken` (if present) combined with `Date.now()`, or just `Date.now()`.
        *   Updated via `useEffect` if `externalRefreshToken` changes.
        *   Explicitly changed on "Retry Loading".
        *   Acts as a dependency for the main data-fetching `useEffect` and is part of `RemoteComponent`'s `key` prop.

3.  **Data Fetching ([fetchAdbData](cci:1://file:///Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/remotion/components/scenes/CustomScene.tsx:70:4-115:5) in `useEffect`)**:
    *   This effect triggers on changes to `componentId` or `refreshKey`.
    *   **Step 1**: Fetches component metadata from `/api/components/${componentId}/metadata` (with cache-busting) to get an `animationDesignBriefId`.
    *   **Step 2**: Uses `animationDesignBriefId` to fetch the full `AnimationDesignBrief` from `/api/animation-design-briefs/${animationDesignBriefId}` (with cache-busting).
    *   Uses Remotion's `delayRender` and `continueRender` to manage rendering flow during async operations.

4.  **Role of `externalRefreshToken`**:
    *   The `externalRefreshToken` (from `DynamicVideo.tsx` via [videoState.ts](cci:7://file:///Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/stores/videoState.ts:0:0-0:0)) directly influences the internal `refreshKey`.
    *   A change in `externalRefreshToken` updates `refreshKey`, which in turn:
        1.  Triggers a re-fetch of the Animation Design Brief data.
        2.  Forces a re-mount of the `RemoteComponent` (because `refreshKey` is part of its `key` prop).
    *   This ensures the scene reflects the latest data and component version.

5.  **Component Rendering (`RemoteComponent`)**:
    *   Rendering of the actual custom Remotion component is delegated to `<RemoteComponent />` (imported from `~/hooks/useRemoteComponent`).
    *   [CustomScene.tsx](cci:7://file:///Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/remotion/components/scenes/CustomScene.tsx:0:0-0:0) passes `componentId`, the fetched `adbData` (as `brief`), the `refreshToken`, and other scene-specific data to `RemoteComponent`.
    *   The `key` prop of `RemoteComponent` includes `refreshKey`, ensuring it unmounts and re-mounts if `refreshKey` changes. This is a standard React pattern to force re-initialization.

6.  **Loading and Error States**:
    *   Displays "Loading Component Data..." during fetches.
    *   If an error occurs, it shows the error message and a "Retry Loading" button. Retrying updates `refreshKey` to trigger a new fetch.

7.  **Caching**:
    *   API calls for fetching metadata and ADB data include a cache-busting query parameter (`?t=${Date.now()}`), indicating an attempt to bypass browser/intermediate caches for these specific requests. The `RemoteComponent` itself might have its own caching for the component code.

## Potential Issues & Hypotheses (related to the original problem):

*   The [CustomScene](cci:1://file:///Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/remotion/components/scenes/CustomScene.tsx:16:0-208:2) component seems robust in its use of `externalRefreshToken` (via `refreshKey`) to trigger data re-fetches and re-mounts of `RemoteComponent`.
*   **If `externalRefreshToken` is correctly changing when new components are added/updated (as it should, given [videoState.ts](cci:7://file:///Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/stores/videoState.ts:0:0-0:0)'s logic), then the issue most likely lies downstream:**
    1.  **Within `RemoteComponent` (`~/hooks/useRemoteComponent`)**: This component is now the primary suspect. It might not be correctly re-fetching or re-rendering the actual Remotion component code from R2 despite its props (including `refreshToken` or `key`) changing.
    2.  **Backend API Issues**: The APIs (`/api/components/.../metadata` or `/api/animation-design-briefs/...`) might not be serving the latest/correct data, even if [CustomScene](cci:1://file:///Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/remotion/components/scenes/CustomScene.tsx:16:0-208:2) re-fetches.
    3.  **Errors During Fetch**: Although error handling exists, subtle errors in the fetch logic or API responses could cause problems. The console log `[CustomScene] Mounting/rendering with componentId: ${componentId}, refreshToken: ${externalRefreshToken}` is key. If this log shows the refreshToken IS changing, then the problem is likely beyond `DynamicVideo` and `videoState` regarding the refresh token propagation.

## Code Snippets & Key Logic:

**`refreshKey` and its relation to `externalRefreshToken`:**
\`\`\`typescript
// Initialize refreshKey
const [refreshKey, setRefreshKey] = useState<string>(() => 
  externalRefreshToken ? \`\${externalRefreshToken}-\${Date.now()}\` : \`\${Date.now()}\`
);

// Update refreshKey if externalRefreshToken changes
useEffect(() => {
  if (externalRefreshToken) {
    setRefreshKey(\`\${externalRefreshToken}-\${Date.now()}\`);
  }
}, [externalRefreshToken]);
\`\`\`

**Main data fetching `useEffect` dependency on `refreshKey`:**
\`\`\`typescript
useEffect(() => {
  // ...
  async function fetchAdbData() {
    // ... fetches metadata and ADB ...
  }
  fetchAdbData();
  // ...
}, [componentId, handle, refreshKey]); // refreshKey triggers re-fetch
\`\`\`

**`RemoteComponent` using `refreshKey` in its `key` prop:**
\`\`\`typescript
return (
  <AbsoluteFill>
    <RemoteComponent 
      key={\`component-\${componentId}-\${refreshKey}\`} // Forces re-mount
      componentId={componentId} 
      brief={adbData}
      {...(data.refreshToken ? {refreshToken: data.refreshToken} : {})}
      {/* ... other props ... */}
    />
  </AbsoluteFill>
);
\`\`\`
The design of [CustomScene.tsx](cci:7://file:///Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/src/remotion/components/scenes/CustomScene.tsx:0:0-0:0) seems to correctly use the `refreshToken` to propagate updates. The next step is to investigate `~/hooks/useRemoteComponent.tsx`.