# Export Functionality Documentation

## Overview

Bazaar-Vid now supports cloud-based video export using AWS Lambda and Remotion. Users can export their video projects in multiple formats (MP4, WebM, GIF) with different quality settings.

## How It Works

### 1. Export Flow
1. User clicks the export button in the preview panel
2. Selects format and quality options
3. Video is rendered in the cloud using AWS Lambda
4. Automatic download starts when rendering completes

### 2. Technical Architecture

#### Scene Preprocessing
- TypeScript/JSX code is converted to JavaScript using Sucrase
- React hooks and Remotion components are properly injected
- Window references are replaced with Lambda-compatible stubs

#### Lambda Rendering
- Uses Remotion Lambda for scalable cloud rendering
- Supports concurrent rendering with multiple Lambda functions
- Public S3 URLs for direct video access

#### Key Components
- `MainCompositionSimple.tsx` - Executes scene code in Lambda environment
- `render.service.ts` - Preprocesses scenes for Lambda compatibility
- `lambda-cli.service.ts` - Interfaces with Remotion CLI
- `ExportButton.tsx` - UI component for export functionality

## Setup Instructions

### 1. AWS Configuration

Set up your AWS credentials and Lambda function:

```bash
# Configure AWS CLI
aws configure

# Deploy Remotion Lambda function
npx remotion lambda functions deploy

# Deploy your Remotion site
npx remotion lambda sites create src/remotion/index.tsx
```

### 2. Environment Variables

Add to your `.env.local`:

```env
# Lambda Configuration
RENDER_MODE=lambda
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
REMOTION_FUNCTION_NAME=remotion-render-4-0-320-mem3008mb-disk10240mb-300sec
REMOTION_BUCKET_NAME=remotionlambda-useast1-xxxxxxx
REMOTION_SERVE_URL=https://remotionlambda-useast1-xxxxxxx.s3.us-east-1.amazonaws.com/sites/your-site/index.html

# Optional limits
USER_DAILY_EXPORT_LIMIT=10
MAX_RENDER_DURATION_MINUTES=30
```

### 3. S3 Public Access

Run the setup script to configure S3 bucket for public access:

```bash
npm run setup:s3-public
```

This is a one-time setup that allows rendered videos to be publicly accessible.

## Usage

### For Users

1. Navigate to your project workspace
2. Click the export button (download icon) in the preview panel header
3. Choose your export settings:
   - **Format**: MP4 (recommended), WebM, or GIF
   - **Quality**: Low (720p), Medium (1080p), or High (1080p, higher bitrate)
4. Click "Start Export"
5. Wait for rendering to complete (progress shown in real-time)
6. Video automatically downloads when ready

### Export Limits
- 10 exports per day per user (configurable)
- Maximum video duration: 30 minutes
- Concurrent exports: 1 per user

## Troubleshooting

### Common Issues

1. **"AWS credentials not configured"**
   - Run `aws configure` and ensure credentials are set
   - Verify AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local

2. **"Lambda function not found"**
   - Deploy the Lambda function: `npx remotion lambda functions deploy`
   - Update REMOTION_FUNCTION_NAME in .env.local

3. **"Access Denied" when downloading**
   - Run `npm run setup:s3-public` to configure bucket permissions
   - Wait a few minutes for AWS to propagate changes

4. **Black video output**
   - Ensure REMOTION_SERVE_URL points to the latest deployed site
   - Redeploy site after code changes: `npx remotion lambda sites create`

### Debugging

Check server logs for detailed error messages:
- `[LambdaRender]` - Lambda execution logs
- `[Preprocess]` - Scene preprocessing logs
- `[ExportTracking]` - Export tracking and limits

## Development

### Updating MainCompositionSimple

When modifying `MainCompositionSimple.tsx`:

1. Make your changes
2. Deploy the updated site:
   ```bash
   npx remotion lambda sites create src/remotion/index.tsx --site-name="bazaar-vid-updated"
   ```
3. Update REMOTION_SERVE_URL in .env.local with the new URL

### Adding New Export Formats

To add new export options:
1. Update format options in `ExportOptionsModal.tsx`
2. Add codec mapping in `lambda-cli.service.ts`
3. Update quality settings in `render.service.ts`

## Performance

- Lambda Memory: 3008 MB (configurable via LAMBDA_MEMORY_MB)
- Lambda Disk: 10 GB (configurable via LAMBDA_DISK_SIZE_MB)
- Typical render times:
  - 30-second video: ~10-15 seconds
  - 2-minute video: ~30-45 seconds
  - 5-minute video: ~1-2 minutes

## Security

- Rendered videos are stored in S3 with public read access
- Each render gets a unique ID preventing URL guessing
- Export limits prevent abuse
- AWS credentials should have minimal required permissions

## Cost Considerations

AWS Lambda charges based on:
- Execution time (billed per 100ms)
- Memory allocation
- S3 storage and bandwidth

Estimated costs:
- ~$0.002-0.005 per minute of rendered video
- S3 storage: ~$0.023/GB/month
- Bandwidth: ~$0.09/GB transferred