# Debugging Guide

This document provides guidance for debugging common issues in the Bazaar Vid platform.

## Custom Component Loading Issues

If custom components are not appearing in the preview panel, the following solutions have been implemented:

### 1. Cache-Busting for Component Resources

We've added cache-busting timestamps to all API requests loading components:

- API requests for component metadata include `?t=timestamp`
- API requests for animation design briefs include `?t=timestamp`
- Script loading uses dynamic timestamps to avoid browser caching

### 2. Force Refresh Mechanisms

Several refresh mechanisms have been added:

- `PreviewPanel.tsx` includes a "Refresh Preview" button
- `PreviewPanel` tracks current component IDs and auto-refreshes when new ones appear
- `CustomScene` component includes refresh buttons for all error states
- The `useRemoteComponent` hook includes a `reloadComponent` method

### 3. Player Key Updates

The Remotion Player component now uses a dynamic key:

```tsx
<Player
  key={`player-${refreshKey}`}
  component={DynamicVideo}
  // other props...
/>
```

This ensures the player fully unmounts and remounts when new components are added.

### 4. Script Cleanup

The `useRemoteComponent` hook now properly cleans up scripts:

- Existing script tags are removed before loading new ones
- The global `window.__REMOTION_COMPONENT` variable is reset
- All script loads use a dynamic timestamp to prevent caching

## Common Issues and Solutions

1. **Components won't update**: Try the "Refresh Preview" button
2. **Script loading errors**: Check browser console for network issues
3. **Component renders as error**: Verify the component code is valid 
4. **Animation design brief missing**: Check if the ADB was created correctly

## Debugging Steps

1. Open browser developer tools
2. Check console for any errors
3. Examine network requests for component loading
4. Verify the component is being properly generated in the backend
5. Try reloading the page if all else fails

## API Endpoints

The key endpoints involved in component loading:

- `/api/components/:id` - Returns the component JavaScript bundle
- `/api/components/:id/metadata` - Returns metadata including ADB ID
- `/api/animation-design-briefs/:id` - Returns the animation design brief

All these endpoints now support cache-busting via the `?t=timestamp` query parameter.

## Component Loading Pipeline Debugging

When debugging custom component loading issues, check these areas in sequence:

### 1. Browser Console Logs

Open your browser's developer tools (F12 or Command+Option+I) and check the Console tab. Look for:

- `[CustomScene]` logs: Shows if the CustomScene component is rendering
- `[useRemoteComponent]` logs: Shows component loading status
- Network errors: Failed requests to `/api/components/[id]` or `/api/animation-design-briefs/[id]`

Common errors:
- `Failed to load resource: net::ERR_CERT_AUTHORITY_INVALID` - SSL certificate issue
- `TypeError: window.__REMOTION_COMPONENT is not a function` - Component loaded but has an incorrect export
- No component logs at all - Component may not be included in the timeline

### 2. Server Logs

Check the following log files:
- `logs/combined-[DATE].log` - All logs consolidated
- `logs/components-[DATE].log` - Component generation specific logs
- `logs/error-[DATE].log` - Just error logs

Look for:
- `[COMPONENT:COMPLETE]` - Successful component generation
- `[BUILD:COMPLETE]` - Successful component build
- `[API:COMPONENT:REQUEST]` - API requests for components
- `[API:ADB:REQUEST]` - API requests for animation design briefs

### 3. Database Status

Check the database tables:
- `custom_component_jobs` - Should have status "complete" and a valid outputUrl
- `animation_design_briefs` - Should reference the component job ID

### 4. Testing Individual Parts

Test each part of the pipeline independently:
1. Directly access `/api/components/[id]` in your browser - should return JavaScript
2. Directly access `/api/animation-design-briefs/[id]` - should return JSON
3. Directly access `/api/components/[id]/metadata` - should return JSON

## Quick Fix for Common Issues

### SSL Certificate Issues
If components aren't loading due to SSL issues with R2, the solution is already implemented: the API route now proxies the content instead of redirecting.

### Component Not Appearing in Preview
1. Check if the component is in the timeline (check TimelinePanel.tsx logic)
2. Ensure the CustomScene is receiving the correct componentId
3. Verify useRemoteComponent is loading the component correctly

### Chat UI Stuck in "Pending"
This may be related to the chat orchestration service not receiving completion events from the component generation pipeline. Check:
1. Chat orchestration service event listeners
2. Whether the component generation is properly emitting "complete" events
3. Whether the "pending" state is being updated when components complete

### Common Code Fixes

If the component is built but not appearing:
```typescript
// In src/remotion/components/CustomScene.tsx - add error fallback render
if (error) {
  return (
    <AbsoluteFill style={{ backgroundColor: 'rgba(255,0,0,0.1)', padding: 20 }}>
      <h2>Component Error</h2>
      <p>{error.toString()}</p>
      <pre style={{ overflow: 'auto', maxHeight: '50vh' }}>
        {JSON.stringify({componentId, data}, null, 2)}
      </pre>
    </AbsoluteFill>
  );
}
``` 