# Debugging Component Loading

If components are building successfully but not appearing in the UI, follow these steps:

## 1. Check Browser Console

The browser console contains detailed logs of the component loading process:

```
[CustomScene] Rendering for componentId: 1b812287-...
[CustomScene 1b812287-...] Fetching component metadata from API
[CustomScene 1b812287-...] Metadata: {...}
[CustomScene 1b812287-...] Fetching ADB from /api/animation-design-briefs/...
[CustomScene 1b812287-...] ADB data: {...}
[CustomScene 1b812287-...] RemoteComponentRenderer: [Function]
```

**Look for Errors:**
- Missing metadata or ADB fetch failures
- Script loading errors
- Missing `window.__REMOTION_COMPONENT` after script loads

## 2. Check Network Requests

Examine these key network requests in the Network tab:

1. **`/api/components/[componentId]/metadata`**
   - Should return status 200 with JSON containing `animationDesignBriefId`
   - Check response: `{ "animationDesignBriefId": "..." }`

2. **`/api/animation-design-briefs/[id]`**
   - Should return status 200 with design brief JSON
   - Check response for valid `designBrief` property

3. **`/api/components/[componentId]`**
   - Should return status 200 with JavaScript content
   - Content should start with `window.__REMOTION_COMPONENT=` 

## 3. Check R2 Storage

If proxy requests fail, check if R2 bucket is accessible:

1. Verify the R2 bucket is properly configured
2. Public access should be enabled
3. The environment variable `R2_PUBLIC_URL` should match the correct bucket URL
4. Try accessing a component file directly with the full R2 URL

## 4. Server Logs

Check the server logs for component-related entries:

```
[API:COMPONENT:REQUEST][ID:1b812287-...] Component request received
[API:COMPONENT:DEBUG][ID:1b812287-...] Proxying component from R2
[API:COMPONENT:DEBUG][ID:1b812287-...] Successfully proxied component JS
```

**Error Paths:**
- `[API:COMPONENT:ERROR]` - API route errors
- `[API:ADB:ERROR]` - Animation design brief errors
- `[BUILD:ERROR]` - Component build errors

## 5. Database Checks

Verify component job status:

1. Check that the component job status is "complete"
2. Verify that the job has non-null `tsxCode` and valid `outputUrl`
3. Confirm the `metadata` field includes `animationDesignBriefId`

## 6. Component Addition to Timeline

Make sure components are being added to the video timeline:

1. Verify `customComponentJobs.outputUrl` contains a valid R2 URL
2. Check that the scene in the video props has `type: 'custom'`
3. Verify the scene's `data` includes `componentId` matching the job ID

## 7. Common Issues & Solutions

- **R2 SSL Issues**: Use API proxy approach instead of direct R2 URLs
- **CORS Errors**: Add Cross-Origin-Resource-Policy and Access-Control-Allow-Origin headers
- **Component Not Defined**: Check if script loads and properly defines `window.__REMOTION_COMPONENT`
- **Invalid Component Names**: Ensure component names are valid JS identifiers (no numbers at start)
- **Chat Stuck Pending**: Force refresh video props after component generation

## 8. Step-by-Step Testing

When testing component loading, follow this sequence:

1. Create a new project to start fresh
2. Use a simple prompt that's likely to succeed (e.g., "Create a scene with a blue circle")
3. Wait for the completion of component generation
4. Check browser console for detailed loading logs
5. Examine database entries for successful component jobs
6. Verify the timeline shows the custom component
7. Check that the component is rendered in the preview panel

## 9. Environment Variables

Make sure these environment variables are correctly set:

```
R2_PUBLIC_URL=https://pub-80969e2c6b73496db98ed52f98a48681.r2.dev
R2_ACCOUNT_ID=3a37cf04c89e7483b59120fb95af6468
R2_ACCESS_KEY_ID=...
R2_SECRET_ACCESS_KEY=...
```

The `R2_PUBLIC_URL` is particularly important as it needs to match the URL where your components are hosted. 