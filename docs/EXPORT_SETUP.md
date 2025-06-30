# Bazaar-Vid Export Functionality Setup Guide

## Overview
The export functionality in Bazaar-Vid uses AWS Lambda and Remotion to render videos in the cloud. This guide explains how to set up the export feature for production.

## Current Status
- ✅ Export functionality is fully implemented
- ✅ Works locally with proper environment variables
- ⚠️ UI shows export button but needs production config
- ⚠️ Auto-download works when Lambda is configured

## Required Environment Variables

Add these to your production environment (e.g., Vercel):

```bash
# Enable Lambda rendering
RENDER_MODE=lambda

# AWS Configuration
AWS_REGION=us-east-1

# Remotion Lambda Configuration
REMOTION_FUNCTION_NAME=remotion-render-4-0-320-mem3008mb-disk10240mb-300sec
REMOTION_BUCKET_NAME=remotionlambda-useast1-yb1vzou9i7

# Optional: Daily export limits
USER_DAILY_EXPORT_LIMIT=10
MAX_RENDER_DURATION_MINUTES=30

# Optional: Webhook secret for secure callbacks
WEBHOOK_SECRET=your-secret-here
```

## How It Works

1. **User clicks Export button** in the preview panel
2. **Server preprocesses scenes** - TypeScript is compiled to JavaScript
3. **Lambda render triggered** via Remotion CLI
4. **Progress tracked** via polling (1-second intervals)
5. **S3 URL returned** when complete
6. **Auto-download triggered** in browser

## Local Testing

When testing locally, the export URL appears in terminal logs:
```
[LambdaRender] CLI stdout: + S3 https://s3.amazonaws.com/your-bucket/your-video.mp4
```

## Production Setup Steps

1. **Deploy Remotion Lambda Function**
   ```bash
   npx remotion lambda deploy
   ```

2. **Note the function name and bucket**
   The deploy command will output:
   - Function name (e.g., `remotion-render-4-0-320-mem3008mb-disk10240mb-300sec`)
   - Bucket name (e.g., `remotionlambda-useast1-yb1vzou9i7`)

3. **Add environment variables to production**
   In Vercel or your hosting platform, add all required variables

4. **Test the export**
   The Export button should now work in production

## Troubleshooting

### "Video export is currently being set up"
This error means `RENDER_MODE` is not set to `lambda` in production.

### "Video export requires AWS Lambda setup"
This error means the Lambda function name or bucket is not configured.

### Export works locally but not in production
Check that all environment variables are set in your production environment.

### Finding the export URL during development
Look for this pattern in terminal logs:
```
+ S3 https://s3.amazonaws.com/...
```

## Architecture Details

- **Lambda Service**: `/src/server/services/render/lambda-cli.service.ts`
- **API Router**: `/src/server/api/routers/render.ts`
- **UI Component**: `/src/components/export/ExportButton.tsx`
- **Scene Preprocessing**: Converts TypeScript/JSX to Lambda-compatible JavaScript

## Limitations

- Maximum 10 exports per day per user (configurable)
- Maximum video duration: 30 minutes (configurable)
- Formats supported: MP4, WebM, GIF
- Quality levels: Low, Medium, High