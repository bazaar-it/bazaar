# Component Loading Fixes

## Problem: Custom Components Not Appearing in Preview

We identified and fixed several critical issues that were preventing custom components from showing up in the PreviewPanel after they were successfully generated in the backend:

## Root Causes

1. **Browser Caching Issues**: Components were generating correctly but browser caching was preventing fresh content from loading
2. **No Force Refresh Mechanism**: There was no way to force the Remotion Player to reload when new components were added
3. **Incorrect Script Loading**: The useRemoteComponent hook wasn't properly handling script loading and unloading
4. **Path Issues**: API endpoints weren't being called with cache-busting parameters

## Solutions Implemented

### 1. In `useRemoteComponent.tsx`
- Added unique timestamps to every script request to prevent caching
- Improved script tag handling with explicit ID-based script removal
- Added better logging to track component loading
- Added proper cleanup to remove stale scripts

### 2. In `CustomScene.tsx`
- Added cache-busting timestamps to API requests
- Added a retry button to allow manual refresh of components
- Added a refreshKey state to force remounts when needed
- Added detailed logging to track loading progress

### 3. In `DynamicVideo.tsx`
- Added a refreshToken prop to force remounts of all components
- Added unique keys to all scene components based on the refresh token
- Improved component lifecycle management with useMemo for better performance

### 4. In `PreviewPanel.tsx`
- Added a refresh button to manually force reloads
- Added automatic detection of new components to trigger refreshes
- Added key prop to Player component to force full remounts when needed
- Fixed API parameter order to match videoState implementation

## How It Works Now

1. When a new custom component is generated, the PreviewPanel detects this change
2. The PreviewPanel triggers a refresh with a new timestamp
3. This causes the Player component to remount with a new key
4. The DynamicVideo component passes the refresh token to all scenes
5. Each CustomScene component uses the refresh token to force fresh API requests
6. The useRemoteComponent hook loads fresh scripts with cache-busting parameters

## Manual Refresh Process

If components still don't appear, users can click the "Refresh" button in the top right corner of the preview panel, which will force:

1. A complete remount of the Player component
2. Fresh API requests with new timestamps
3. Reloading of all script tags with cache-busting parameters

## Debugging Tools Added

- Added extensive console logging at each step of the component loading process
- Added visual indicators when components are loading or encounter errors
- Added retry buttons to error states

## Testing This Fix

To test if the fix is working:
1. Create a new project
2. Add a custom component via the chat interface
3. Verify the component appears in the preview
4. If not, click the refresh button
5. Check the browser console for detailed loading logs

## Key Changes

### PreviewPanel.tsx

```tsx
// Before
setProject({ id: projectId });
replace(initial);

// After
setProject(projectId, initial);
replace(projectId, initial);
```

### CustomScene.tsx

```tsx
// Before
const RemoteComponentRenderer = useRemoteComponent(`${componentId}?t=${refreshKey}`);
return <RemoteComponentRenderer brief={adbData} sceneData={data} onRefresh={forceRefresh} />;

// After
const remoteComponentData = useRemoteComponent(`${componentId}?t=${refreshKey}`);
const { Component: RemoteComponent } = remoteComponentData;
return (
  <RemoteComponent 
    brief={adbData} 
    sceneData={data} 
    onRefresh={forceRefresh} 
  />
);
```

## Additional Improvements

1. **Manual Refresh Button**
   - Added a button in the PreviewPanel to force refresh the player component
   - This allows users to manually trigger a refresh when they suspect components aren't updating

2. **Dynamic Cache Busting**
   - Added timestamp parameters to all API requests and script loading
   - Ensures the browser always loads the latest version of components and data

3. **Better Error Handling**
   - Improved error states with retry buttons throughout the component pipeline
   - Makes debugging easier by showing specific error messages

## Testing Recommendations

After making these changes, the components should now appear properly in the preview panel without requiring a full page refresh. If you continue to experience issues:

1. Check browser console for error messages
2. Try clicking the "Refresh Player" button in the preview panel
3. Ensure all API endpoints are correctly responding with the expected data
4. Verify that custom component files are being properly generated and stored

The most common cause of component loading failure is incorrect handling of the component data structure. The `useRemoteComponent` hook returns an object with properties, not a direct component.

# Component Loading Refresh Debugging

## Issues Identified
- Clicking the refresh button in the PreviewPanel doesn't trigger component updates
- Hydration errors occurring due to inconsistent rendering between server and client
- Cache issues preventing proper script refreshing
- Potential disconnect between refresh tokens across components

## Changes Implemented

### 1. Enhanced Debug Logging
Added extensive debug logs throughout the component refresh chain:

- **PreviewPanel.tsx**:
  - Added detailed logs for component ID changes
  - Added logs for refresh button clicks
  - Added logs for script tag removal during refresh
  - Added logging of Player mounting and unmounting
  
- **DynamicVideo.tsx**:
  - Added detailed scene information logs
  - Added refreshToken change detection and logging
  - Added logging for scene component creation with keys

- **CustomScene.tsx**:
  - Added logs for component mounting with componentId and refreshToken
  
- **useRemoteComponent.tsx**:
  - Enhanced script element tracking
  - Added logging for script tag removal and debugging
  - Added inventory logging of all script tags

### 2. VideoState Store Improvements
- Added a `forceRefresh` function to the videoState store
- Added `refreshToken` storage at the project level
- Modified the PreviewPanel to use store-based refresh tokens
- Ensured tokens propagate correctly through the component chain

### 3. Manual Cache Clearing
- Added code to manually remove script tags during refresh
- Enhanced the refresh functionality to force browser cache invalidation
- Fixed component key generation to ensure proper remounting

## Testing Steps
1. Open a project with custom components
2. Check browser console for detailed logs
3. Click refresh button in the Preview panel
4. Observe logs to confirm:
   - Old scripts are being removed
   - New refresh token is generated
   - Components are re-mounting
   - New scripts are loading
5. Component should appear in preview panel

## Known Issues
- Hydration errors may still occur on initial load due to Date.now() timestamps
- Some components might require multiple refreshes in certain edge cases

## Future Improvements
- Consider implementing a more robust versioning system for components
- Add a polling mechanism to detect new components automatically
- Implement a more explicit dependency tracking system 