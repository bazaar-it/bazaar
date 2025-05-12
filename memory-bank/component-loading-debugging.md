# Component Loading Debugging Guide

## Issue Summary
Custom components are not appearing in the video preview panel despite being successfully generated in the backend. The "Refresh" button does not seem to trigger a refresh of the components, and nothing is showing up in the preview panel.

## Common Causes

1. **Network/API Issues**: Components are loaded from R2 via an API proxy, and issues with this proxy can prevent components from loading
2. **Script Loading/Cache Issues**: Browser caching can prevent new scripts from being loaded, or scripts might not be properly injected into the DOM
3. **React Hydration Issues**: Next.js hydration issues can occur due to time-based values like `Date.now()` that differ between server and client
4. **Refresh Token Propagation**: The refresh token might not be properly propagated through the component tree
5. **Mismatched Environment Variables**: API URLs might be misconfigured between environments

## Debugging Approach

### 1. Check Browser Console for Errors

The most important first step is to examine the browser console for any errors related to:
- Network requests failing (404, 500 errors)
- Script loading errors
- React hydration errors

### 2. Check Component Loading Process

We've implemented detailed logging throughout the component loading process:

1. **PreviewPanel → videoState.forceRefresh()**: 
   - Calling `forceRefresh(projectId)` should generate a new refreshToken and trigger component reloading

2. **DynamicVideo Component**:
   - Should receive the new refreshToken prop
   - Should recreate custom scene components with new keys
   - Check if `customSceneIds` array in logs is populated

3. **CustomScene Component**:
   - Should fetch metadata and ADB data via API
   - Should pass componentId and refreshToken to RemoteComponent
   - Look for errors in API responses

4. **useRemoteComponent Hook**:
   - Should load component script from API proxy
   - Should set `window.__REMOTION_COMPONENT` global
   - Look for script loading errors

### 3. API Endpoint Check

Verify that these API endpoints are accessible and returning proper data:

- `/api/components/[componentId]` - Serves the component JS bundle
- `/api/components/[componentId]/metadata` - Provides metadata about the component
- `/api/animation-design-briefs/[id]` - Returns the animation design brief data

### 4. Key Logging Events to Look For

In the console logs, look for:

1. `🔄 Refresh button clicked` - Confirms the refresh button was clicked
2. `[PreviewPanel] Calling forceRefresh on videoState store` - Confirms forceRefresh was called
3. `[DynamicVideo] 🔄 RefreshToken changed: old -> new` - Confirms refreshToken propagation
4. `[DynamicVideo] Custom scenes that will get new refreshToken` - Shows affected scenes
5. `[DynamicVideo] 🎬 Creating custom scene component for [id]` - Shows scene creation
6. `[CustomScene] Mounting/rendering with componentId: [id], refreshToken: [token]` - Shows CustomScene rendering
7. `[useRemoteComponent] Loading component: [id]` - Shows component loading attempt
8. `[useRemoteComponent] Loading script from: [url]` - Shows script URL being used
9. `[useRemoteComponent] Successfully loaded component: [id]` - Shows successful loading

### 5. Network Tab Check

In the browser's Network tab:
1. Look for requests to `/api/components/[componentId]`
2. Check response codes and content
3. Verify content type is `application/javascript`
4. Check for CORS headers
5. Look for proper cache directives

## Quick Fixes to Try

1. **Force Browser Cache Clear**:
   - Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
   - Clear browser cache for the site
   - Try in incognito/private browsing mode

2. **Check Network Connection**:
   - Ensure R2 bucket is accessible
   - Verify API endpoints are responding correctly

3. **Try Direct Script Loading**:
   - Modify `useRemoteComponent` to use direct R2 URL if API proxy isn't working
   - Add timeout detection to identify slow requests

4. **Debug Component Bundle Content**:
   - Check if the component JS file contains valid code
   - Verify `window.__REMOTION_COMPONENT` is properly set in the bundle

5. **Fix Hydration Issues**:
   - Use stable keys that don't rely on `Date.now()`
   - Ensure server and client render identical content

## Recent Improvements

We've made several improvements to help diagnose these issues:

1. **Enhanced Logging**:
   - Added extensive logging throughout the component loading flow
   - Added emoji indicators for better visibility
   - Intercepted console methods to highlight component-related logs

2. **UI Feedback**:
   - Added visual feedback for refresh button click
   - Added component counter for better status visibility
   - Improved loading states for all components

3. **API Improvements**:
   - Used API proxy instead of direct R2 URLs to avoid CORS issues
   - Added CORS headers to all API responses
   - Added timeouts to detect network issues

4. **Debugging Utilities**:
   - Added global variable inspection
   - Enhanced error states with better information
   - Added timeout detection for API requests

## Next Steps

If components still aren't appearing after these changes:

1. **Create a minimal test case**
2. **Run network diagnostics** to check connectivity to R2 bucket
3. **Check server-side logs** for any errors in the API routes
4. **Verify animation design brief data** is properly fetched
5. **Recheck build process** to ensure components are being properly built and uploaded

Remember to keep an eye on the browser console and use the extended debugging tools added in these updates. 