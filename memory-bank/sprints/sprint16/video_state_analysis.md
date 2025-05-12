// /memory-bank/sprints/sprint16/video_state_analysis.md

# Analysis of `src/stores/videoState.ts` (Zustand Store)

This document will detail the analysis of the `videoState.ts` Zustand store, focusing on how it manages the video's state, particularly the `scenes` array and the `refreshToken`, and how it processes updates (e.g., via JSON patches).

## Key Questions to Address:

1.  **State Structure**: What is the overall structure of the state managed by this store? What are the key properties related to video composition (e.g., `scenes`, `meta`, `refreshToken`)?
2.  **Initialization**: How is the video state initialized? Is it loaded from a server, or does it start with default values?
3.  **Update Mechanisms**: How is the state updated?
    *   Are there specific actions/methods for adding/removing/modifying scenes?
    *   How are JSON patches (`applyPatch` from `videoRouter`) integrated? Does the store optimistically apply patches, or wait for server confirmation?
    *   How is the `refreshToken` generated or updated? When does it change?
4.  **Immutability**: When the `scenes` array or other parts of the state are updated, is immutability correctly maintained (i.e., are new array/object instances created)? This is crucial for React's change detection and `useMemo` in components like `DynamicVideo.tsx`.
5.  **Selectors/Subscriptions**: How do components subscribe to this store? Are there specific selectors for accessing parts of the state (e.g., `getCurrentProps` mentioned by the user)?
6.  **Data Flow for Custom Components**: When a custom component is added:
    *   How is the new scene data incorporated into the `scenes` array?
    *   Is the `refreshToken` explicitly changed at this point?
7.  **Error Handling**: Is there any error handling within the store related to state updates?

## Observations & Findings:

Based on the `view_file_outline` and partial content of `src/stores/videoState.ts`:

1.  **State Structure (`VideoState` interface & `useVideoState` store):**
    *   The store manages data on a per-project basis, keyed by `projectId` in the `projects` object.
    *   Each project (`projects[projectId]`) contains:
        *   `props: InputProps`: This object holds the core video data, including the `scenes` array, `meta` (dimensions, duration, fps), etc.
        *   `chatHistory: ChatMessage[]`: Manages chat messages for the project.
        *   `dbMessagesLoaded: boolean`: Tracks if database messages have been loaded.
        *   `activeStreamingMessageId?: string | null`: For managing real-time chat message streaming.
        *   `refreshToken?: string`: A token used to force re-renders of video components.
    *   `currentProjectId: string | null`: Stores the ID of the currently active project.

2.  **Initialization:**
    *   The `projects` object in the store is initialized as empty (`{}`).
    *   The `setProject(projectId, initialProps)` method is used to add a new project to the store or update its initial `InputProps`. When a project is set, it also initializes/updates its `refreshToken` to `Date.now().toString()`.

3.  **Update Mechanisms for `scenes` and `refreshToken`:**
    *   **`applyPatch(projectId, patch: Operation[])`**: This is the primary method for modifying `props` (and thus the `scenes` array within it). It uses `fast-json-patch`'s `applyPatch` function.
        *   **Crucially, if the patch is applied successfully, this method not only updates `state.projects[projectId].props` but also updates `state.projects[projectId].refreshToken` to a new `Date.now().toString()` value.**
        *   This means any change to scenes via a patch inherently triggers a refresh token update.
    *   **`replace(projectId, next: InputProps)`**: This method replaces the entire `InputProps` object for a given project.
        *   **Similar to `applyPatch`, this method also updates the `refreshToken` to `Date.now().toString()` after replacing `props`.**
    *   **`forceRefresh(projectId)`**: This method's sole purpose is to update the `refreshToken` for a project to `Date.now().toString()`. It does not modify `props` or `scenes` directly but is used to explicitly trigger re-renders.

4.  **Immutability:**
    *   Zustand's `set` function is used for state updates. The code consistently uses object spread syntax (`...`) to create new state objects when modifying the `projects` record or individual project data. This ensures that new object references are created, which is essential for React's change detection and `useMemo` dependencies.
    *   `fast-json-patch`'s `applyPatch` function, when successful, returns `newDocument`, which is a new object. This new object is then assigned to `props`.

5.  **Selectors/Subscriptions:**
    *   The store provides `getCurrentProps()` to get the `InputProps` for the `currentProjectId`.
    *   Components would subscribe to this store using `useVideoState()` and select the necessary parts of the state (e.g., `currentProjectId`, `projects[currentProjectId].props`, `projects[currentProjectId].refreshToken`).

6.  **Data Flow for Custom Components & `refreshToken`:**
    *   When a new custom component is meant to be added to the video, its corresponding scene data would typically be sent as a JSON patch (e.g., an 'add' operation to the `scenes` array).
    *   This patch would be processed by `applyPatch` in the `videoState` store.
    *   Upon successful application, both the `scenes` array (within `props`) and the `refreshToken` for that project are updated.
    *   This dual update is designed to ensure that `DynamicVideo.tsx` (or any component consuming these values) receives both the new scene data and a changed `refreshToken`, prompting it to re-render and re-evaluate its `useMemo` hooks that depend on these.

7.  **Error Handling:**
    *   The `applyPatch` method includes a `try...catch` block. If `fast-json-patch`'s `applyPatch` throws an error, it's caught, and an error message is logged to the console (`console.error("Error applying patch:", error);`). The state remains unchanged in this error case for the `props` and `refreshToken` related to the failed patch attempt.

## Potential Issues & Hypotheses based on this analysis (related to the original problem):

Given that the `videoState.ts` store *does* update the `refreshToken` whenever `scenes` (via `props`) are changed through `applyPatch` or `replace`:

*   **Patches Not Reaching `applyPatch`**: The primary hypothesis is that the JSON patches intended to update scenes (especially for new custom components) might not be reaching the `videoState.ts`'s `applyPatch` method correctly or at all. This could be due to issues in the tRPC router handling patch submissions, client-side logic calling the tRPC mutation, or incorrect `projectId`.
*   **Incorrect `projectId`**: If `applyPatch` is called with a `projectId` that doesn't match the `currentProjectId` being observed by the UI, the UI won't reflect the changes.
*   **Errors During Patch Application**: While there's a `catch` block, if an error occurs silently before even calling `applyPatch` or if the `console.error` is missed, the state update might fail without obvious indication elsewhere.
*   **Subscription Issues in Consuming Components**: The component that passes `props` and `refreshToken` to `DynamicVideo.tsx` might not be correctly subscribing to `useVideoState`, or there might be an intermediate memoization layer that prevents prop propagation even if the store updates.
*   **Issues within `CustomScene.tsx`**: Even if `DynamicVideo.tsx` re-renders with the correct scene data and `refreshToken`, the `CustomScene.tsx` component itself might have logic issues preventing it from fetching or displaying the new custom component based on the `componentId` or `refreshToken` it receives.

## Code Snippets & Key Logic:

**`applyPatch` method showing props and refreshToken update:**
```typescript
applyPatch: (projectId: string, patch: Operation[]) =>
  set((state) => {
    // ... (project existence check)
    const projectData = state.projects[projectId];
    const currentProps = projectData.props;
    try {
      const newProps = applyPatch(currentProps, patch).newDocument as InputProps;
      // Ensure scenes array exists
      if (!newProps.scenes) {
        newProps.scenes = [];
      }
      return {
        projects: {
          ...state.projects,
          [projectId]: {
            ...projectData,
            props: newProps, // Updated props
            refreshToken: Date.now().toString(), // Updated refreshToken
          },
        },
      };
    } catch (error) {
      console.error("Error applying patch:", error);
      return state; // Return original state on error
    }
  }),
```

**`forceRefresh` method:**
```typescript
forceRefresh: (projectId) =>
  set((state) => {
    if (!state.projects[projectId]) return state;
    const newRefreshToken = Date.now().toString();
    return {
      ...state,
      projects: {
        ...state.projects,
        [projectId]: {
          ...state.projects[projectId],
          refreshToken: newRefreshToken, // Only refreshToken updated
        },
      },
    };
  }),
```

This store seems to be correctly designed to handle `refreshToken` updates in conjunction with `scenes` modifications. The investigation should now focus on how patches are generated and delivered to this store, and then how `CustomScene.tsx` consumes its props.
