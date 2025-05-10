# Component Name Validation Fix

## Issue

Component generation was failing with esbuild errors when component names started with numbers.

In the logs we found this specific error:

```
[BUILD:ERROR][JOB:6ecd9e02-6b92-4759-9d01-5d98d9fd1951] Build failed with 1 error:
../../../../../../private/var/folders/6n/l8_rdhx56gx3qk8vk9_s_54h0000gn/T/bazaar-components-6ecd9e02-6b92-4759-9d01-5d98d9fd1951/component.tsx:74:14: ERROR: Syntax error "d"
```

The problematic code section was:

```javascript
export const 3dModelsSpinScene: React.FC<{ brief: AnimationDesignBrief }> = ({ brief }) => {
```

The issue is that JavaScript/TypeScript variable names cannot start with numbers. In this case, the component name "3dModelsSpinScene" starts with a digit, which is invalid.

## Root Cause

Component names were being generated from scene descriptions, sometimes starting with numbers which isn't valid in JavaScript. There was insufficient validation to ensure component names were valid JavaScript identifiers.

## Solution

1. Created a `sanitizeComponentName` function that:
   - Checks if a name starts with a number and prefixes it with "Scene" in that case
   - Removes invalid characters (keeping only letters, numbers, $ and _)
   - Provides a default name ("CustomScene") if the result is empty

2. Applied this function in three key locations where component names are generated:
   - `componentGenerator.service.ts` (for components generated from ADBs)
   - `generateComponentCode.ts` (for components generated from LLM code)
   - `sceneAnalyzer.service.ts` (for component names from scene descriptions)

## SSL Certificate Issue with R2 URLs

After fixing the component name validation, we discovered another critical issue: SSL certificate problems with the R2 bucket URLs. When the browser tried to load JavaScript from the R2 bucket (https://bazaar-vid-components.3a37cf04c89e7483b59120fb95af6468.r2.dev/), it failed with a "Safari Can't Open the Page" error due to SSL certificate validation failures.

### Issue
The direct R2 URLs have SSL certificate issues when accessed from the browser, preventing components from loading even when they're successfully built.

### Solution
1. **Update the R2 Public URL**:
   - Previous URL `https://bazaar-vid-components.3a37cf04c89e7483b59120fb95af6468.r2.dev` was not working
   - Enabled public access in Cloudflare R2 dashboard
   - Updated environment variable to new URL: `https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev`

2. **API Proxy Fallback**:
   - In case of SSL issues, the API route (`/api/components/[componentId]/route.ts`) acts as a proxy:
   - Fetches the component JS from R2 on the server side
   - Serves the content directly to avoid browser SSL validation issues

## Verification
After applying these fixes:
1. Component names are properly sanitized before code generation
2. Components are built successfully with esbuild
3. The new R2 public URL allows direct access to the JavaScript files
4. The proxy fallback ensures reliability even with SSL certificate changes
5. The full pipeline from ADB to rendered component is complete

## Additional Fixes for Component Loading

### 1. Race Condition Fix

We identified a race condition where the build worker would try to access the component's TSX code before it was fully saved to the database.

Solution:
- Modified `src/server/workers/generateComponentCode.ts` to properly await the database update before triggering the direct build.
- Changed `await db.update(customComponentJobs)` to ensure it completes before the build is triggered.
- Changed direct build trigger to use `await import()` followed by `await buildModule.buildCustomComponent(jobId)` for proper sequencing.

### 2. Cron Worker Interference

Temporarily modified the cron worker to avoid interference with our testing:
- Changed `where: eq(customComponentJobs.status, "pending")` to `where: eq(customComponentJobs.status, "manual_build_retry")` to effectively disable the cron worker.

### 3. Improved Debugging

Added extensive debug logging to track the component loading process:

- Added console logging to `CustomScene.tsx` to track component rendering and data fetching.
- Enhanced `useRemoteComponent.tsx` with detailed logs to track script loading and component registration.
- Updated API routes (`[componentId]/route.ts` and `[componentId]/metadata/route.ts`) with more verbose logging.

## Testing Strategy

Using a focused test approach with a single simple component to trace through the entire process:

1. Component generation with direct build triggering
2. TSX code correctly saved to the database
3. Component successfully built by esbuild
4. JS bundle URL saved to the database
5. API route correctly serving the component code
6. Frontend loading and rendering the component

All these fixes ensure components with any name (even those starting with numbers) will build successfully, and we can better track any issues in the component loading process.

## Usage

No changes are needed to the user-facing functionality. The system now gracefully handles any component name, automatically converting invalid identifiers to valid ones.

## SSL Certificate Issue with R2 URLs

After fixing the component name validation, we discovered another critical issue: SSL certificate problems with the R2 bucket URLs. When the browser tried to load JavaScript from the R2 bucket (https://bazaar-vid-components.3a37cf04c89e7483b59120fb95af6468.r2.dev/), it failed with a "Safari Can't Open the Page" error due to SSL certificate validation failures.

### Issue
The direct R2 URLs have SSL certificate issues when accessed from the browser, preventing components from loading even when they're successfully built.

### Solution
Instead of redirecting the browser to the R2 URL, we modified the API route to act as a proxy:

1. The API route (`/api/components/[componentId]/route.ts`) now:
   - Fetches the component JS from R2 on the server side
   - Serves the content directly with proper Content-Type headers
   - Falls back to redirect if the proxy approach fails

2. This fixes the SSL issue because:
   - The server-to-R2 request doesn't have SSL certificate validation problems
   - The browser only needs to trust the app's domain certificate, not the R2 bucket's

### Code Changes

```typescript
// Modified API route to proxy R2 content instead of redirecting
export async function GET(
  request: Request,
  { params }: { params: { componentId: string } }
) {
  // ...existing code...

  try {
    // CHANGED: Instead of redirecting to the R2 URL, fetch it and serve it directly
    // This works around SSL issues with the R2 bucket
    const response = await fetch(job.outputUrl);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch component from R2: ${response.statusText}`);
    }
    
    const jsContent = await response.text();
    
    return new NextResponse(jsContent, {
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      }
    });
  } catch (error) {
    // Fall back to redirect if proxy fails
    apiRouteLogger.error(componentId, "Error proxying component, falling back to redirect", { 
      error: error.message,
      outputUrl: job.outputUrl 
    });
    
    return NextResponse.redirect(job.outputUrl);
  }
}
```

### Impact
This change ensures that successfully built components can actually be loaded by the browser, completing the full pipeline from prompt to rendered component. 