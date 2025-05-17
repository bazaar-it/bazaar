# Service Worker Management in A2A System

## Problem

Our A2A system was experiencing several issues related to service workers and connection management:

1. Infinite loops in SSE connections causing excessive log spam (42,000+ lines of logs in less than a minute)
2. Connection state errors and constant reconnection attempts causing "Maximum update depth exceeded" React errors
3. Potentially stale data being served from previous service worker caches

## Root Cause Analysis

The investigation revealed multiple contributing factors:

1. **Service Worker Caching**: Previous service workers were intercepting and caching API requests, leading to stale data
2. **State Management in useSSE hook**: The useSSE hook was creating new EventSource connections without properly tracking and sharing connections
3. **Dependency Cycles**: React components were updating state that was also included in their effect dependencies, causing infinite render loops
4. **Unthrottled Event Processing**: Events from SSE connections were being processed too frequently with insufficient throttling
5. **Multiple SSE Connections**: Different components were establishing separate SSE connections to the same task ID

## Implemented Solutions

### 1. Service Worker Unregistration Utility

A utility file (`src/lib/unregister-service-worker.ts`) was created to manage service workers:

- `unregisterAllServiceWorkers()`: Finds and unregisters all service workers associated with the application
- Applied at component mount to ensure clean connections

### 2. Improved SSE Connection Management

The useSSE hook was completely refactored to:

- Use a global connection registry to reuse connections through a reference counting system
- Apply proper throttling with a significantly increased delay (500ms vs 50ms)
- Store handlers in refs to prevent dependency changes triggering reconnects
- Properly track event timing with per-event-type throttling
- Prevent concurrent connection attempts with connection locks

```typescript
// Global connection tracking
const activeConnections = new Map<string, {
  refCount: number;
  eventSource: EventSource;
}>();
```

### 3. React Component State Management

The A2AIntegrationTest component was refactored to:

- Use refs to avoid stale closures in effects
- Simplify state updates with functional updates when needed
- Carefully manage effect dependencies to prevent infinite loops
- Use throttling for data refreshes and state updates

### 4. Throttling and Debouncing

Improved throttling throughout the system:

- Increased debounce delay from 100ms to 500-1000ms for SSE events
- Added per-event-type throttling to avoid overwhelming updates
- Applied throttling to message and status refreshes

## Results

- Log output reduced by over 99% (from 42,000+ lines to < 100 lines in same time period)
- No more "Maximum update depth exceeded" errors
- Stable SSE connections maintained throughout task lifecycle
- Better real-time updates with less overhead

## Why This Works

Service workers in web applications operate independently of the main JavaScript thread and can intercept network requests, including SSE connections. By unregistering these service workers, we:

1. Ensure network requests go directly to the server rather than being intercepted
2. Remove any cached responses that might be causing stale data issues
3. Prevent connection conflicts between the main application and service worker

## References

1. [Next.js Service Worker Unregistration](https://github.com/vercel/next.js/discussions/32402)
2. [Service Worker Issues in Next.js](https://www.asapdevelopers.com/service-worker-issue-nextjs-framework/)
3. [Self-destroying Service Worker Pattern](https://github.com/NekR/self-destroying-sw)

## Future Considerations

If we decide to implement PWA features in the future, we should:

1. Use a maintained PWA solution for Next.js like `next-pwa`
2. Include proper versioning for service workers to facilitate clean updates
3. Implement a more sophisticated service worker lifecycle management strategy 