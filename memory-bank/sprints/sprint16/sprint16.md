make custom code appear in preview panel. live animaiton. connect frontend with backend.

## Sprint Kick-off & Initial Documentation (2025-05-12)

- **Objective**: Understand why the Remotion video preview isn't updating with new custom components.
- **Initial Files Created**:
    - `README.md`: Sprint overview and goals.
    - `TODO.md`: Detailed task list for the investigation.
    - `progress.md`: To log session-by-session progress.
- **System Flow Documented**:
    - `current_system_flow.md` has been created and refined. It details the presumed end-to-end process from custom component generation to its (intended) display in the Remotion player. This document avoids direct memory references and uses contextual information about file paths and system architecture.

## Next Steps: Core Component Analysis

Our primary focus now shifts to analyzing the core Remotion and state management files involved in rendering the video.

1.  **`src/remotion/compositions/DynamicVideo.tsx` Analysis**:
    *   We will investigate how this component receives `inputProps` (especially the `scenes` array).
    *   How it maps these scenes to Remotion components.
    *   How it handles scenes of type `"custom"`.
    *   How it might interact with `src/remotion/components/scenes/CustomScene.tsx` for loading components from an R2 URL.
    *   Findings will be documented in `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/memory-bank/sprints/sprint16/dynamic_video_analysis.md`.

2.  **`src/stores/videoState.ts` Analysis**:
    *   We will examine how the Zustand store manages the video state.
    *   How JSON patches are applied and how these changes are propagated to subscribers like `PreviewPanel.tsx`.
    *   Findings will be documented in `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/memory-bank/sprints/sprint16/video_state_analysis.md`.

3.  **`src/app/projects/[id]/edit/panels/PreviewPanel.tsx` Analysis**:
    *   We will look at how this panel subscribes to `videoState.ts` and passes props to the Remotion `<Player>`.
    *   Findings will be documented in `/Users/markushogne/Documents/APPS/bazaar-vid/bazaar-vid/memory-bank/sprints/sprint16/preview_panel_analysis.md`.

This systematic review should help us pinpoint where the data flow or rendering logic is breaking down.

## Issues Identified and Fixed

After a thorough analysis of the code, we identified several issues that were preventing custom components from appearing in the preview panel:

1. **API Route Caching**: The `/api/components/[componentId]` route was using `Cache-Control: public, max-age=3600`, causing browsers to cache component code for up to an hour. This has been changed to `Cache-Control: no-store`.

2. **Next.js Dynamic Route Parameters**: The API routes were using destructured parameters (`const { componentId } = params;`) which causes errors in Next.js App Router. This has been fixed to use direct property access (`const componentId = params.componentId;`).

3. **Component Detection in Preview Panel**: The `PreviewPanel.tsx` component wasn't effectively detecting new custom components or properly cleaning up old script elements.

4. **Remote Component Loading**: The `useRemoteComponent.tsx` hook had issues with handling componentId parameters, browser cache busting, and global variable cleanup.

5. **Custom Scene Refresh Logic**: The `CustomScene.tsx` component needed improvements in how it handles and propagates the refreshToken to force component remounts.

6. **Duplicate CustomScene.tsx Files**: We discovered two different files with the same name but different implementations:
   - `/src/remotion/components/CustomScene.tsx` - A more complex implementation that fetches its own ADB data
   - `/src/remotion/components/scenes/CustomScene.tsx` - The one actually used in DynamicVideo.tsx

## Solutions Implemented

1. **Fixed API Routes**:
   - Updated dynamic route params handling in both component and metadata routes
   - Changed cache-control headers to prevent stale component data
   - Fixed Next.js App Router errors by using proper parameter access patterns

2. **Enhanced PreviewPanel.tsx**:
   - Improved component ID tracking using refs for better comparison across renders
   - Added more robust script cleanup during refresh
   - Made refresh button visible for easier debugging
   - Added detailed logging of component changes and refresh token updates

3. **Improved useRemoteComponent.tsx**:
   - Added proper handling of componentId with query parameters
   - Improved script cleanup to remove all related script tags
   - Enhanced logging and error handling
   - Restructured the component to better handle loading/error states

4. **Updated CustomScene.tsx**:
   - Better integration with the updated RemoteComponent
   - Proper handling of refreshToken from props
   - Fixed key generation for component remounting
   - Improved error and loading states

5. **Fixed Duplicate CustomScene.tsx Files**:
   - Renamed `/src/remotion/components/CustomScene.tsx` to `/src/remotion/components/AdbFetchingCustomScene.tsx`
   - Updated all references inside the renamed component
   - Added a placeholder in the original location with warning message and re-export for backward compatibility
   - Documented the change to avoid future confusion

## Current Status

The system should now correctly:
1. Detect when new custom components are added to scenes
2. Automatically refresh the preview when components change
3. Properly clean up old scripts and global variables
4. Load the latest version of components from R2 via the API
5. Provide better logging for debugging any remaining issues
6. Have a clear component structure without naming conflicts
7. Use proper Next.js App Router patterns to avoid runtime errors

The various state propagation and refresh mechanisms have been reviewed and enhanced to ensure proper coordination across the frontend components and backend services.

## Next Steps

- Test the end-to-end flow with the enhanced components
- Monitor logs for proper refresh token propagation and component loading
- Consider adding metrics or diagnostics to track component load times and success rates
- Create comprehensive documentation about the custom component refresh mechanism ✓ (completed)

## Documentation Created

1. **Custom Component Refresh Mechanism**: 
   - Created `memory-bank/remotion/custom-component-refresh-mechanism.md`
   - Comprehensive overview of how components are loaded and refreshed
   - Detailed explanation of all key components in the refresh pipeline
   - Common issues and solutions
   - Debugging tips for future reference
   - Best practices for component fetching and caching