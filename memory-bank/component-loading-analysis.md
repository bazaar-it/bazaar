# Custom Component Loading Analysis

## Issue Summary

Components being stuck in the "loading component" state is primarily caused by a mismatch between the component status in the database and the actual availability of the component's output URL (bundle) in the R2 storage. This document details the root causes and solutions to this problem.

## Root Causes Identified

1. **Status-URL Mismatch**: Components can be marked as "ready" or "complete" in the database but have missing `outputUrl` fields.
   - This prevents the UI from loading the component bundle from R2 storage.
   - When a component is added to the timeline, the system attempts to use this missing URL, resulting in the perpetual loading state.

2. **Component Refresh Issues**: 
   - The refresh mechanism in `CustomComponentsPanel` and `useRemoteComponent` might not effectively clear cached component bundles.
   - When a component is rebuilt, browsers might still load the old (or non-existent) bundle from cache.

3. **Database-R2 Synchronization**: 
   - Inconsistency between the database status and actual R2 storage content.
   - Components marked as "complete" but with bundles not properly uploaded to R2.

## Component Loading Flow

The component loading process follows this sequence:

1. `CustomComponentsPanel` displays components from the database via the `listAllForUser` tRPC query.
2. When a component is added to the timeline, its `outputUrl` is used in the scene data.
3. `CustomScene` component uses `useRemoteComponent` to dynamically load the component from the specified URL.
4. The `useRemoteComponent` hook uses dynamic imports to fetch and evaluate the JavaScript bundle.
5. If the bundle URL is missing or invalid, the loading state persists indefinitely.

## Diagnostic Tools

Several tools have been developed to diagnose and fix these issues:

1. **fix-ready-components.ts**:
   - Identifies components marked as "ready" but missing `outputUrl`.
   - Resets these components to "pending" status to trigger a rebuild.
   - Usage: `npx tsx src/scripts/fix-ready-components.ts`

2. **fix-component-by-id.ts**:
   - Fixes specific components by their ID.
   - Addresses common issues like 'use client' directives and import statement normalization.
   - Usage: `npx tsx src/scripts/fix-component-by-id.ts <component-id>`

3. **UI Debug Function**:
   - The `checkAndFixInconsistentComponents` function in `CustomComponentsPanel` provides a user interface for identifying and fixing inconsistent components.
   - Available via a debug button in the UI (when enabled).

## Fix Strategies

### 1. Reset Inconsistent Components

Components marked as "ready" but missing an `outputUrl` can be fixed by:

```typescript
// Reset component to "pending" status
await db.update(customComponentJobs)
  .set({
    status: 'pending',
    errorMessage: 'Component was marked as ready but had no output URL. Rebuilding.',
    updatedAt: new Date()
  })
  .where(eq(customComponentJobs.id, component.id));
```

### 2. Force Refresh Component Loading

When adding components to the timeline, ensure a forced refresh:

```typescript
// Force refresh the component loading to ensure the new component appears
forceRefresh(projectId);
```

### 3. Browser Cache Handling

Add cache-busting parameters to component URLs:

```typescript
const RemoteComponentRenderer = useRemoteComponent(`${componentId}?t=${refreshKey}`);
```

## Monitoring & Verification

To monitor component loading:

1. Check browser console logs for:
   - `[CustomComponentsPanel] Component now ready: id=<componentId>, outputUrl=<url|null>`
   - `[useRemoteComponent] Loading component: <url>`
   - `[useRemoteComponent] Component loaded successfully: <url>`

2. Component metadata:
   - When adding components to the timeline, examine whether the `outputUrl` is present:
   ```
   [CustomComponentsPanel] Attempting to add component to video: {
     componentId: "...",
     componentEffect: "...",
     retrievedOutputUrl: "..." or undefined
   }
   ```

## Recommended Actions

1. Run `npx tsx src/scripts/fix-ready-components.ts` to identify and reset components with status-URL mismatches.
2. Implement the debug function in the UI to allow users to easily fix inconsistent components.
3. Add additional logging to the component loading process to better track failures.
4. Consider implementing a health check system to periodically verify the consistency between database statuses and R2 storage.

## References

- `CustomComponentsPanel.tsx`: Main panel for component management
- `useRemoteComponent`: Hook responsible for dynamic loading
- `fix-ready-components.ts`: Script to reset components marked as "ready" but missing outputUrl
- `fix-component-by-id.ts`: Script to fix specific components by their ID
