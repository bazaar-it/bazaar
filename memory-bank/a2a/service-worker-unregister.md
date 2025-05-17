# Service Worker Unregistration Guide

## Background

The A2A evaluation dashboard may encounter issues with cached service workers. This can manifest as:

- Repeated SSE connection/disconnection cycles
- Browser unresponsiveness 
- "Maximum update depth exceeded" React errors
- Stale UI that doesn't reflect the latest changes

A service worker may continue serving cached content even after application updates. This guide provides solutions for clearing service workers.

## Option 1: Using Chrome DevTools

1. Open Chrome DevTools (F12 or Ctrl+Shift+I)
2. Navigate to the "Application" tab
3. Select "Service Workers" in the left sidebar
4. Click "Unregister" next to any listed service workers
5. Check "Update on reload" to prevent future caching issues

## Option 2: Programmatic Unregistration

Add the following script to your application:

```typescript
// Service worker cleanup script
const unregisterServiceWorkers = async () => {
  if ('serviceWorker' in navigator) {
    try {
      const registrations = await navigator.serviceWorker.getRegistrations();
      console.log(`Found ${registrations.length} service workers to unregister`);
      
      for (const registration of registrations) {
        const unregistered = await registration.unregister();
        console.log(`Unregistered service worker: ${unregistered ? 'success' : 'failed'}`);
      }
      
      // Reload the page to ensure clean state
      if (registrations.length > 0) {
        console.log('Reloading page to apply service worker changes');
        window.location.reload();
      }
    } catch (error) {
      console.error('Error unregistering service workers:', error);
    }
  }
};

// Execute on page load
unregisterServiceWorkers();
```

For a more permanent solution, you can add this script to your application's initialization code.

## Option 3: Browser Settings

If service workers continue to cause issues:

1. Chrome: Visit `chrome://serviceworker-internals` and remove all registrations
2. Firefox: Visit `about:serviceworkers` and unregister all service workers
3. Consider setting "Disable cache" in your browser's developer tools network tab while debugging

## Prevention

To prevent service worker issues in the future:

1. Add clear version identifiers to your application assets
2. Implement proper service worker lifecycle management if you're using them intentionally
3. Consider using the `workbox` library for more reliable service worker behavior
4. Add automatic service worker cleanup on version changes

For the A2A dashboard, we've implemented event throttling and proper connection management to minimize the impact of service worker issues. 