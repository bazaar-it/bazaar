# Component Loading Troubleshooting Guide

## Diagnosing "Loading Component" Issues

This guide provides a step-by-step approach to diagnosing and fixing components that are stuck in the "loading component" state.

## Quick Diagnostic Steps

### 1. Identify Affected Components

First, identify which components are failing to load:

1. Open your project in the browser.
2. Open the browser's Developer Tools (F12 or Ctrl+Shift+I).
3. Check the console for error messages related to component loading:
   ```
   [useRemoteComponent] Error loading component: <URL>
   [useRemoteComponent] Failed to import module: <error details>
   ```

### 2. Check Component Database Status

Run the following command to check the status of all components in the database:

```bash
npx tsx src/scripts/list-components.ts
```

Look for inconsistencies:
- Components with "ready" or "complete" status but `null` or missing `outputUrl`
- Components with error messages that don't match their status

### 3. Verify R2 Storage Content

Ensure the component bundles actually exist in R2 storage:

```bash
npx tsx src/scripts/verify-r2-components.ts
```

This will check if each component marked as "ready" or "complete" has a corresponding bundle in R2 storage.

## Fixing Specific Issues

### Issue 1: Components Marked as "ready" but Missing outputUrl

These components are in an inconsistent state. Run:

```bash
npx tsx src/scripts/fix-ready-components.ts
```

This will:
1. Identify components with "ready" status but missing `outputUrl`
2. Reset them to "pending" status to trigger a rebuild
3. Log the IDs and effects of affected components

### Issue 2: Component Bundles Not Loading in Browser

If components have valid `outputUrl` but still fail to load:

1. Check browser network tab to see if the bundle request is:
   - Not being made (script loading issue)
   - Returning 404 (missing bundle)
   - Returning 200 but with invalid content (corrupt bundle)

2. Try adding a cache-busting parameter:
   ```js
   // In CustomScene component
   const refreshKey = Date.now();
   const RemoteComponentRenderer = useRemoteComponent(`${componentId}?t=${refreshKey}`);
   ```

3. Fix specific components with syntax issues:
   ```bash
   npx tsx src/scripts/fix-component-by-id.ts <component-id>
   ```

### Issue 3: "stuck-in-building" Components

Components that remain in "building" status for too long:

```bash
npx tsx src/scripts/reset-stuck-building.ts
```

This script:
1. Identifies components that have been in "building" status for more than 30 minutes
2. Resets them to "pending" to trigger a new build attempt

## Component Verification Process

To verify if a component can actually render:

1. Use the component render test tool:
   ```bash
   open src/tools/component-render-test.html
   ```

2. Enter the component ID and click "Test"
3. If the component renders successfully in the test tool but not in the main app:
   - The issue is likely with the component integration, not the component itself
   - Check the `CustomScene` component and `useRemoteComponent` hook

## Performance Optimization

If many components are loading slowly:

1. Check if components are being loaded in parallel (which can cause rate limiting):
   ```js
   // Consider implementing a queue system in useRemoteComponent
   const loadQueue = useRef<Array<{ id: string, callback: () => void }>>([]);
   // Process queue with controlled concurrency
   ```

2. Implement caching for successfully loaded components:
   ```js
   // In useRemoteComponent
   const componentCache = useRef(new Map<string, React.ComponentType>());
   // Check cache before loading
   if (componentCache.current.has(componentId)) {
     setComponent(componentCache.current.get(componentId)!);
     return;
   }
   ```

## Advanced Debugging with Proxy

To capture and debug the actual content of component bundles:

1. Set up a local proxy for R2 requests:
   ```bash
   npx tsx src/scripts/setup-r2-proxy.ts
   ```

2. Modify the application to use the local proxy
3. Examine the exact content being served for component bundles

## Post-Fix Verification

After applying fixes:

1. Run the component verification script:
   ```bash
   npx tsx src/scripts/verify-components.ts
   ```

2. Check if the previously affected components load correctly
3. Monitor the console logs for any remaining loading issues

## Conclusion

Following this troubleshooting guide should help identify and resolve most component loading issues. If problems persist, deeper investigation into the component building pipeline may be necessary.
