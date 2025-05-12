// /memory-bank/sprints/sprint16/current_system_flow.md

# Current System Flow: Custom Component Generation to Video Display

This document outlines the presumed end-to-end flow for generating a custom Remotion component, storing it, and then integrating and displaying it within the video editor's preview. The primary area of concern and investigation for Sprint 16 is **Step 5**, where the frontend fails to update the Remotion player.

## 1. Backend: Component Generation & Storage

1.  **Trigger**: A user action (e.g., chat command, UI button) or an LLM-driven decision (e.g., through a tool named `generateRemotionComponent` used by the LLM in the chat system, as observed in files like `src/server/api/routers/chat.ts`) initiates the creation of a custom Remotion component.
2.  **Brief Generation**: An `AnimationDesignBrief` is generated and stored (persisted in the `animationDesignBriefs` database table, a system detailed in `src/server/services/animationDesigner.service.ts` and related tRPC routers like `src/server/api/routers/animation.ts`).
3.  **Code Generation**: A backend service (e.g., `componentGenerator.service.ts`) takes the brief and generates the necessary Remotion component code (TypeScript/JSX).
4.  **Bundling & Upload**: The generated component code is bundled (e.g., using esbuild or similar Remotion-compatible bundling process).
5.  **Storage**: The bundled component (and any assets) is uploaded to a cloud storage solution (e.g., R2).
6.  **Database Update**: The `customComponents` table (or similar) in the database is updated with:
    *   A reference to the `animationDesignBriefId`.
    *   The `outputUrl` (the URL of the bundled component in R2).
    *   A status indicating completion (e.g., "complete", "ready").
    *   (The system filters for successfully built components with an `outputUrl`, for example, in the `CustomComponentsSidebar` which queries `customComponent.listAllForUser` with a `successfulOnly` flag).

## 2. Frontend: Component Discovery

1.  **Fetching List**: UI elements like the `CustomComponentsSidebar` or `ScenePlanningHistoryPanel.tsx` fetch a list of available custom components.
2.  **Filtering**: This list is typically filtered to show only components that are successfully built and have a valid `outputUrl` (status: "ready" or "complete").

## 3. Frontend: User Action - Inserting Component into Video

1.  **Selection**: The user selects a "ready" custom component from the UI.
2.  **Intent**: The intent is to add this component as a new scene into the currently active video project timeline.
3.  **Logic Trigger**: This action triggers client-side logic to prepare for a video state update.
    *   (User's input mentioned: "Get current video state via `getCurrentProps()`", "Generate a UUID for the new scene", "Determine insertion position").

## 4. Frontend & Backend: State Update via JSON Patch

1.  **Patch Creation (`src/lib/patch.ts` & client logic)**:
    *   A JSON patch array is constructed. This likely includes operations such as:
        *   `add`: To insert a new scene object into the `scenes` array of the video project's data.
        *   The new scene object would define:
            *   `type: "custom"` (or a similar identifier for custom Remotion components).
            *   `componentSourceUrl: "<R2_OUTPUT_URL>"` (or a similar field name for the URL).
            *   `name: "<Component_Name>"`.
            *   `durationInFrames: <duration>`.
            *   A unique `id` for the scene.
    *   (The JSON-Patch system for bidirectional updates, including a `videoRouter` with an `applyPatch` procedure, is a known architectural pattern in this project, with helper functions for patch creation in `src/lib/patch.ts`).
2.  **tRPC Mutation (`videoRouter.applyPatch`)**:
    *   The generated JSON patch is sent to the backend via a tRPC mutation (e.g., `api.video.applyPatch`).
3.  **Server-Side Validation & Application**:
    *   The backend validates the patch against the project's current state and schema.
    *   If valid, the patch is applied to the video project data stored in the database (e.g., within a JSONB field representing the video structure).
    *   Transactions are used for atomicity.
4.  **Client-Side State Update (`src/stores/videoState.ts` - Zustand)**:
    *   The Zustand store (`videoState.ts`) is updated to reflect the change.
    *   This might be an optimistic update (applied immediately on the client) with potential rollback if the server rejects the patch.
    *   Alternatively, it might wait for server confirmation before updating.

## 5. Frontend: Reactivity & Remotion Player Update (THE PROBLEM AREA)

1.  **Zustand Subscription (`PreviewPanel.tsx`)**:
    *   The `PreviewPanel.tsx` component subscribes to changes in the `videoState.ts` Zustand store.
2.  **Re-render Trigger**: When `videoState.ts` (specifically the part containing the video's scenes and properties) is updated with the new custom scene, React should trigger a re-render of `PreviewPanel.tsx` and any other components subscribed to this state.
3.  **Props to Player (`PreviewPanel.tsx` -> `<Player>`)**:
    *   `PreviewPanel.tsx` retrieves the updated video properties (including the full `scenes` array with the newly added custom scene) from `videoState.ts`.
    *   These updated properties are passed as `inputProps` to the Remotion `<Player>` component.
4.  **Props to Composition (`<Player>` -> `DynamicVideo.tsx`)**:
    *   The Remotion `<Player>` component wraps the main Remotion composition (likely defined in `src/remotion/Root.tsx`, which then renders `src/remotion/compositions/DynamicVideo.tsx`).
    *   The `inputProps` (containing the updated scenes) are passed down to `DynamicVideo.tsx`.
5.  **Dynamic Scene Rendering (`DynamicVideo.tsx`)**:
    *   `DynamicVideo.tsx` is responsible for iterating over the `scenes` array in its `inputProps`.
    *   For each scene, it should dynamically render the appropriate Remotion scene component (e.g., using a `<Series>` or by mapping scenes to components).
    *   When it encounters a scene with `type: "custom"`, it should use a specific component designed to handle these, such as `src/remotion/components/CustomScene.tsx` or `src/remotion/components/scenes/CustomScene.tsx`.
6.  **Custom Scene Handling (`CustomScene.tsx`)**:
    *   This component receives props specific to the custom scene, crucially including the `componentSourceUrl` (the R2 URL).
    *   It would then be responsible for dynamically importing or fetching the bundled component code from this URL.
    *   Remotion's `lazyComponent`, `continueRender`, and `delayRender` APIs might be involved here to handle the asynchronous loading of the external component.
    *   Once loaded, the custom component is rendered as part of the Remotion composition.

**Hypothesized Breakdown Point**: The process appears to fail at step 5. The `PreviewPanel.tsx` may not be receiving updates correctly, or `DynamicVideo.tsx` may not be processing the new `inputProps` in a way that includes the new custom scene, or `CustomScene.tsx` might be failing to load/render the component from R2, or there's a fundamental issue in how Remotion's `<Player>` is being re-rendered or its `inputProps` updated.
