// /memory-bank/sprints/sprint16/api_component_route_analysis.md

# Analysis of `app/api/components/[componentId]/route.ts`

This API route is responsible for serving the JavaScript code for custom Remotion components.

## Request Flow:

1.  **Receives `componentId`**: From the URL path.
2.  **Database Lookup**: Queries `customComponentJobs` table for the job's `status` and `outputUrl` (expected R2 URL).
    *   Handles cases: not found (404), error status (500), not yet complete (202).
3.  **Proxy from R2 (Primary Logic)**:
    *   If job is `complete` with an `outputUrl`, it fetches the component JS from this `outputUrl`.
    *   Uses `fetch(job.outputUrl, { cache: "no-store" })`. This ensures the Next.js API route itself gets fresh content from R2 for each request it processes.
    *   If fetch from R2 is successful, returns the JS content with `Content-Type: application/javascript`.
    *   **Client-Side Caching Instructions**: The response to the client includes the header `'Cache-Control': 'public, max-age=3600'`. This instructs the client's browser (and any intermediary public caches) to cache this API route's response for 1 hour.
4.  **Fallback to Redirect**: If proxying from R2 fails, it redirects the client directly to `job.outputUrl`.

## Relevance to Stale Component Issue:

*   The server-side `fetch(..., { cache: "no-store" })` is good; it ensures this API route gets fresh data from R2.
*   **The `'Cache-Control': 'public, max-age=3600'` header on the response *sent to the client* is the most likely cause of stale components being rendered.**
    *   `useRemoteComponent.tsx` uses a `?t=${timestamp}` cache-buster in its request to `/api/components/...`. This aims to get a fresh response *from the API route*.
    *   However, if the browser or a CDN has cached the API route's response for that `componentId` (due to the `max-age=3600`), it might serve that cached API response, even if the `?t=` parameter is different. This would bypass the Next.js server logic for that specific request, leading to stale content being served from the cache.

## Recommended Change:

Modify the `Cache-Control` header in the API response (when proxying successfully) to prevent or discourage client-side/CDN caching of the API route's response. Options include:

*   `'Cache-Control': 'no-store'` (strongest: don't cache at all)
*   `'Cache-Control': 'no-cache'` (revalidate with origin server)
*   `'Cache-Control': 'public, max-age=0, must-revalidate'` (force revalidation)

Using `'no-store'` is likely the most robust way to ensure `useRemoteComponent.tsx` always receives the absolute latest code when its cache-busting request hits this API route. The `useRemoteComponent` hook already adds a cache-busting query parameter to its request, so this API route doesn't need to provide strong caching hints for its own response.
