# R2 Storage Integration for Custom Component Pipeline

## Overview
This document outlines the integration of Cloudflare R2 storage with the Bazaar-Vid application for storing and serving custom Remotion components as part of Sprint 5-6.

## Configuration

### Environment Variables
The following environment variables have been configured in `.env.local`:

```
R2_ENDPOINT=https://3a37cf04c89e7483b59120fb95af6468.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=ec29e309df0ec86c81010249652f7adc  
R2_SECRET_ACCESS_KEY=<redacted>
R2_BUCKET_NAME=bazaar-vid-components
R2_PUBLIC_URL=https://bazaar-vid-components.3a37cf04c89e7483b59120fb95af6468.r2.dev
CRON_SECRET=<redacted>
```

### Storage Location
- **Region**: Eastern North America (ENAM)
- **Bucket Name**: bazaar-vid-components
- **Access Type**: Account API Token (for production stability)

## Integration Points

1. **Component Build Worker** (`src/server/workers/buildCustomComponent.ts`)
   - Uses AWS S3 SDK to upload compiled JS files to R2
   - Sanitizes and compiles TSX code using esbuild
   - Updates component job status in database

2. **Dynamic Component Loading** (`src/hooks/useRemoteComponent.tsx`)
   - Uses React.lazy with dynamic imports to load components at runtime
   - Components are fetched directly from R2 public URL

3. **Cron Job** (`src/app/api/cron/process-component-jobs/route.ts`)
   - Protected by CRON_SECRET for security
   - Regularly processes pending component build jobs

## Security Considerations

- R2 bucket configured with appropriate CORS settings
- Access credentials stored securely in environment variables
- Input sanitization for TSX code to prevent unsafe imports
- API endpoints protected with appropriate authentication

## Testing

To validate the R2 integration:
1. Create a test component job
2. Run the worker to compile and upload
3. Verify the component is accessible at the public URL
4. Test loading the component in the Remotion player

## Next Steps

1. Complete the database migration for the `customComponentJobs` table
2. Implement OpenAI function calling for component generation
3. Update the chat UI to display component status
