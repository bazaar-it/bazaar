# Custom Component Refresh Mechanism

## Overview

The custom component refresh mechanism is responsible for ensuring that newly generated Remotion components are properly loaded, displayed in the Custom Components Panel, and inserted into the video timeline when requested. This document explains how the system works and common issues that might prevent proper refreshing.

## Component Flow

1. **Component Generation**: Custom components are generated through the animation pipeline, which creates:
   - An Animation Design Brief (ADB)
   - The component's JavaScript code
   - Metadata about the component

2. **Storage**: Components are:
   - Bundled into JavaScript files
   - Stored in the R2 cloud storage
   - Referenced in the database with status and outputUrl information

3. **Fetching**: Components are fetched through:
   - API routes: `/api/components/[componentId]` and `/api/components/[componentId]/metadata`
   - tRPC procedures: `customComponent.listAllForUser` and `customComponent.getJobStatus`

4. **Rendering**: Components are loaded in the UI through:
   - `useRemoteComponent` hook that dynamically loads JS via script tags
   - `RemoteComponent` wrapper component that renders the loaded component

## Key Components

### API Routes

1. **Component Route** (`app/api/components/[componentId]/route.ts`):
   - Serves the JavaScript code for the component
   - Requires proper cache control headers to prevent stale content
   - Must handle dynamic route params properly

2. **Metadata Route** (`app/api/components/[componentId]/metadata/route.ts`):
   - Provides metadata about the component for UI display
   - Contains ADB ID and other important information
   - Also requires proper cache control

### UI Components

1. **CustomComponentsPanel** (`app/projects/[id]/edit/panels/CustomComponentsPanel.tsx`):
   - Displays all available custom components
   - Uses `customComponent.listAllForUser` to fetch components
   - Handles adding components to the video timeline
   - Calls `forceRefresh` after adding components to trigger reload

2. **CustomComponentStatus** (`components/CustomComponentStatus.tsx`):
   - Shows the current status of each component
   - Polls the backend to check if components are ready
   - Handles both "success" and "complete" status values
   - Provides callbacks when component status changes

3. **useRemoteComponent** (hook):
   - Dynamically loads the component from the API route
   - Uses cache-busting timestamps to ensure fresh content
   - Manages loading and error states

## Common Issues and Solutions

### 1. Next.js Dynamic Route Parameters

**Issue**: In Next.js App Router, dynamic route parameters need to be handled carefully to avoid the error:
```
Error: Route "/api/components/[componentId]" used `params.componentId`. `params` should be awaited before using its properties.
```

**Solution**: 
- Access the parameter directly from `params` object instead of destructuring
- Example: `const componentId = params.componentId;` instead of `const { componentId } = params;`

### 2. Cache Control Headers

**Issue**: API routes using permissive cache-control headers (like `public, max-age=3600`) can cause browsers to serve stale component data even with cache-busting parameters.

**Solution**:
- Use `Cache-Control: no-store` for dynamic content that should never be cached
- This ensures fresh content is always fetched from the R2 storage

### 3. Component Status Handling

**Issue**: Status strings in the database can be inconsistent between "success" and "complete", leading to components not being recognized as ready.

**Solution**:
- Update the CustomComponentStatus component to handle both status values
- Ensure tRPC procedures filter based on the correct status value
- Modify the listAllForUser procedure to filter for "complete" status

### 4. Auto-Add Feature

The CustomComponentsPanel includes an "Auto-add new components" feature that:
- Automatically adds newly completed components to the video timeline
- Tracks processed components to avoid duplicates
- Stores this information in localStorage to persist across sessions

### 5. Manual Refresh Button

To help handle stubborn cache issues, a manual refresh button has been added:
- Located in the PreviewPanel component header
- Calls the `forceRefresh` method from videoState store
- Triggers immediate script reloading without a page refresh

## Debugging Tips

1. **Check Browser Console**: Look for errors related to component loading, particularly failed script loading or CORS issues.

2. **Verify API Responses**: Using browser dev tools, check that API routes are returning fresh data with proper cache headers.

3. **Monitor Component Status**: The status messages in the UI show the progress of component jobs (Queued → Building → Ready or Error).

4. **Clear Browser Cache**: If all else fails, clearing browser cache can resolve stale content issues.

5. **Use Manual Refresh**: The refresh button in the PreviewPanel can force all components to reload without a page refresh.

## Best Practices

1. Always use cache-busting techniques when fetching dynamic content.
2. Set appropriate cache-control headers in API responses.
3. Implement proper error handling and retry logic for fetching component data.
4. Maintain clear separation between component metadata and the actual component code.
5. Use the `forceRefresh` method to reload components when necessary.
6. Keep status handling logic consistent across the codebase. 