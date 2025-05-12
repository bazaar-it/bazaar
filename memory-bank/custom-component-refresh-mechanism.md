# Custom Component Refresh Mechanism

## Overview

This document describes how the Bazaar-Vid system updates the preview panel when custom components are added or changed. Understanding this mechanism is essential for maintaining and extending the application's live preview capabilities.

## Component Flow Architecture

The custom component refresh mechanism involves several components working together:

1. **videoState.ts (Zustand Store)**:
   - Manages global state including scenes and refreshToken
   - Updates refreshToken when scenes are modified via applyPatch() or replace()
   - Provides forceRefresh() method to explicitly update refreshToken

2. **PreviewPanel.tsx**:
   - Subscribes to videoState and passes props to the Remotion Player
   - Detects changes in custom components and triggers refreshes
   - Cleans up browser script elements during refresh
   - Provides a manual refresh button for debugging

3. **DynamicVideo.tsx (Remotion Composition)**:
   - Receives scenes and refreshToken from PreviewPanel
   - Maps scene data to appropriate components, including CustomScene
   - Passes refreshToken to CustomScene for custom component types
   - Creates unique keys for sequences to force remounts

4. **CustomScene.tsx**:
   - Located at `src/remotion/components/scenes/CustomScene.tsx`
   - Receives componentId and refreshToken from DynamicVideo
   - Fetches Animation Design Brief (ADB) data from API
   - Uses refreshToken to generate refreshKey for forcing remounts
   - Renders the RemoteComponent with appropriate props

   > **Note**: Previously, there was a naming conflict with another component at `src/remotion/components/CustomScene.tsx`. This has been renamed to `AdbFetchingCustomScene.tsx` to avoid confusion. Only the component in the `scenes/` directory is used in the main video rendering pipeline.

5. **useRemoteComponent.tsx (Hook)**:
   - Dynamically loads JS code for custom components via script tags
   - Uses timestamp-based cache busting to ensure fresh content
   - Handles loading and error states
   - Provides reload functionality for retrying failed loads

6. **API Routes**:
   - `/api/components/[componentId]`: Serves JS code for custom components
   - `/api/components/[componentId]/metadata`: Provides metadata including ADB ID
   - `/api/animation-design-briefs/[id]`: Serves the Animation Design Brief

## Refresh Token Propagation

The refreshToken is a critical mechanism for forcing updates:

1. **Generation**: When scenes change in videoState.ts, a new refreshToken is created using `Date.now().toString()`
2. **Propagation**: This token flows from videoState → PreviewPanel → DynamicVideo → CustomScene
3. **Effect**: 
   - In DynamicVideo, the refreshToken is part of sequence keys, forcing remounts
   - In CustomScene, it's used to generate refreshKey which:
     - Triggers re-fetching of ADB data
     - Forces remounting of the RemoteComponent

## Cache Busting Strategy

Multiple levels of cache busting ensure fresh content:

1. **API Routes**: Use `Cache-Control: no-store` to prevent browser caching
2. **API Requests**: Add timestamp parameters (`?t=${Date.now()}`) to API calls
3. **Script Loading**: The useRemoteComponent hook adds timestamps to script URLs
4. **Component Mounting**: Components use keys with refreshToken to force remounts

## Debugging the Refresh Mechanism

If custom components aren't updating correctly:

1. **Check Console Logs**:
   - `[PreviewPanel]` logs show component detection and refresh attempts
   - `[DynamicVideo]` logs show received scenes and refreshToken
   - `[CustomScene]` logs show fetch attempts and ADB loading
   - `[useRemoteComponent]` logs show script loading and component mounting

2. **Manual Refresh**:
   - Use the "Refresh Preview" button in the PreviewPanel
   - This button is now visible for easier access during development

3. **Inspect Network Requests**:
   - Check that requests to `/api/components/[componentId]` have unique timestamps
   - Verify responses have `Cache-Control: no-store` header
   - Ensure component JS code in the response is the latest version

4. **Inspect DOM**:
   - Look for script tags with src containing "components" to ensure old scripts are removed
   - Check that new script tags are being added with fresh timestamps

## Common Issues and Solutions

1. **Component Not Updating**:
   - Verify refreshToken is changing in videoState (check console logs)
   - Check that API is returning fresh content (network tab)
   - Look for script loading errors in console

2. **Script Loading Errors**:
   - Check network requests for 404/500 errors
   - Verify the componentId is correct
   - Check R2 storage to ensure file exists

3. **Component Rendering Errors**:
   - Look for errors in the console from the loaded component
   - Check that ADB data is correct and complete
   - Verify the component code is valid and exports a valid component

4. **Component Name Confusion**:
   - If you encounter import errors or component mismatches, ensure you're using the correct CustomScene component from `src/remotion/components/scenes/CustomScene.tsx` 
   - The component at `src/remotion/components/CustomScene.tsx` has been renamed to `AdbFetchingCustomScene.tsx` for clarity

## Testing Component Updates

To test the component refresh mechanism:

1. Make a change to a custom component
2. Submit it to the backend (this creates a new component job)
3. When the job completes, the component should be added to the video state
4. The PreviewPanel should detect the new component and refresh automatically
5. The CustomScene should fetch the new ADB data and component code
6. The component should appear in the preview with the latest changes

## Maintenance Considerations

When modifying any part of this system:

1. Maintain the refreshToken propagation chain
2. Preserve cache busting mechanisms at all levels
3. Ensure script cleanup is comprehensive
4. Keep detailed logging for debugging
5. Test with both automatic and manual refreshes
6. Be aware of the two separate CustomScene implementations and their different purposes

This document should be updated as the system evolves to maintain an accurate reference for developers. 