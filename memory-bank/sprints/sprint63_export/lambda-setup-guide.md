# AWS Lambda Setup Guide for Bazaar-Vid Export

## Overview

This guide walks through setting up AWS Lambda for video rendering with Remotion. Lambda provides:
- Parallel rendering (much faster than sequential)
- Serverless architecture (no infrastructure to manage)
- Pay-per-use pricing
- Automatic scaling

## Prerequisites

1. **AWS Account** with billing enabled
2. **AWS CLI** installed and configured
3. **Node.js 18+** installed locally
4. **Remotion License** (for commercial use)

## Step 1: AWS Setup

### 1.1 Install AWS CLI
```bash
# macOS
brew install awscli

# Or download from https://aws.amazon.com/cli/
```

### 1.2 Configure AWS Credentials
```bash
aws configure
# Enter your Access Key ID, Secret Access Key, and preferred region
```

### 1.3 Check/Increase Lambda Quotas
```bash
# Check current quotas
npx remotion lambda quotas

# Request increase if needed (default is 1000, Remotion needs up to 200 per render)
# Go to AWS Service Quotas console and request increase for:
# - Concurrent executions: 5000 (recommended)
# - Unreserved concurrent executions: 5000
```

## Step 2: Remotion Lambda Setup

### 2.1 Install Remotion Lambda CLI
```bash
npm install @remotion/lambda-cli --save-dev
```

### 2.2 Deploy Remotion Lambda Function
```bash
# Choose your region (us-east-1 recommended for best performance)
export AWS_REGION=us-east-1

# Deploy the Lambda function
npx remotion lambda functions deploy --memory=3008 --timeout=300 --disk=10240

# This will output:
# - Function name (e.g., remotion-render-2025-01-27-abcdef)
# - Function ARN
# Save these for later!
```

### 2.3 Create S3 Bucket for Renders
```bash
# Create bucket
npx remotion lambda buckets create

# This will output your bucket name (e.g., remotionlambda-useast1-abcdef123456)
# Save this for later!
```

## Step 3: Update Bazaar-Vid Configuration

### 3.1 Environment Variables
Add to your `.env.local`:
```env
# Lambda Configuration
RENDER_MODE=lambda
AWS_REGION=us-east-1
REMOTION_FUNCTION_NAME=remotion-render-2025-01-27-abcdef
REMOTION_BUCKET_NAME=remotionlambda-useast1-abcdef123456

# Optional: Webhook secret for security
WEBHOOK_SECRET=your-random-secret-here

# Lambda settings
LAMBDA_DISK_SIZE_MB=10240
LAMBDA_MEMORY_MB=3008
```

### 3.2 Update Lambda Render Service
Update `src/server/services/render/lambda-render.service.ts`:

```typescript
import { renderMediaOnLambda, getRenderProgress } from "@remotion/lambda/client";
import { deploySite, getOrCreateBucket } from "@remotion/lambda/client";

export async function renderVideoOnLambda({
  projectId,
  scenes,
  format,
  quality,
  webhookUrl,
}: LambdaRenderConfig) {
  // Deploy your Remotion site (do this once, cache the URL)
  const { serveUrl } = await deploySite({
    entryPoint: "./src/remotion/index.tsx",
    bucketName: process.env.REMOTION_BUCKET_NAME!,
    region: process.env.AWS_REGION as any,
  });

  // Start render
  const { renderId, bucketName } = await renderMediaOnLambda({
    region: process.env.AWS_REGION as any,
    functionName: process.env.REMOTION_FUNCTION_NAME!,
    serveUrl,
    composition: "MainComposition",
    inputProps: {
      scenes,
      projectId,
    },
    codec: format === 'gif' ? 'gif' : 'h264',
    imageFormat: "jpeg",
    jpegQuality: qualitySettings[quality].jpegQuality,
    crf: qualitySettings[quality].crf,
    privacy: "public",
    downloadBehavior: {
      type: "download",
      fileName: `bazaar-vid-${projectId}.${format}`,
    },
    webhook: webhookUrl ? {
      url: webhookUrl,
      secret: process.env.WEBHOOK_SECRET,
    } : undefined,
    maxRetries: 3,
    memorySizeInMb: parseInt(process.env.LAMBDA_MEMORY_MB || "3008"),
    diskSizeInMb: parseInt(process.env.LAMBDA_DISK_SIZE_MB || "10240"),
    timeoutInSeconds: 900,
  });

  return { renderId, bucketName };
}
```

## Step 4: Create Webhook Handler

Create `src/app/api/webhooks/render/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { renderState } from "~/server/services/render/render-state";

export async function POST(req: NextRequest) {
  const body = await req.json();
  
  // Verify webhook signature
  const signature = req.headers.get('X-Remotion-Signature');
  // TODO: Implement signature verification
  
  // Update render state
  const job = renderState.get(body.renderId);
  if (job) {
    renderState.set(body.renderId, {
      ...job,
      status: body.type === 'success' ? 'completed' : 'failed',
      outputUrl: body.outputUrl,
      error: body.errors?.[0]?.message,
    });
  }
  
  return NextResponse.json({ success: true });
}
```

## Step 5: Test Your Setup

### 5.1 Deploy a Test Composition
```bash
# Deploy your Remotion project
npx remotion lambda sites create --site-name="bazaar-vid"
```

### 5.2 Test Render
```bash
# Test render from CLI
npx remotion lambda render MainComposition --props='{"scenes":[]}''
```

### 5.3 Monitor Costs
- Lambda costs: ~$0.02 per minute of video
- S3 storage: $0.023 per GB/month
- Data transfer: First 100GB free/month

## Step 6: Production Checklist

- [ ] Enable CloudWatch logging for debugging
- [ ] Set up billing alerts
- [ ] Configure CORS for your domain
- [ ] Test webhook signature verification
- [ ] Set up error alerting
- [ ] Configure CDN for faster downloads
- [ ] Test with various video lengths
- [ ] Implement render quotas per user

## Troubleshooting

### "Function not found"
- Check `REMOTION_FUNCTION_NAME` matches deployed function
- Verify AWS region is correct

### "Access Denied"
- Check IAM permissions for Lambda
- Ensure S3 bucket policy allows Lambda access

### Out of Memory
- Increase `LAMBDA_MEMORY_MB` (max 10240)
- Reduce video resolution or quality

### Timeout Errors
- Increase timeout (max 900 seconds)
- Split long videos into segments

## Cost Optimization

1. **Use appropriate memory**: 3GB for 1080p, 6GB for 4K
2. **Enable S3 lifecycle rules**: Delete old renders after 7 days
3. **Implement user quotas**: Limit renders per user/day
4. **Cache static assets**: Deploy once, reuse serveUrl

## Next Steps

1. Test with a real project export
2. Monitor CloudWatch for performance
3. Set up alerting for failures
4. Optimize costs based on usage patterns

## Resources

- [Remotion Lambda Docs](https://www.remotion.dev/docs/lambda)
- [AWS Lambda Pricing](https://aws.amazon.com/lambda/pricing/)
- [Remotion Discord](https://remotion.dev/discord) for support