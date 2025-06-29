# Bazaar-Vid Export Architecture Analysis

## Executive Summary

This document analyzes the implementation options for adding video export functionality to Bazaar-Vid. Based on research and existing infrastructure, we recommend a phased approach starting with server-side rendering (SSR) for MVP and eventually migrating to AWS Lambda for production scale.

## Current State

### What We Have
- **Remotion packages installed**: All necessary packages (`@remotion/bundler`, `@remotion/cli`, `@remotion/lambda`, `@remotion/player`)
- **Preview system working**: Real-time preview using Remotion Player
- **Render router stub**: Basic `/src/server/api/routers/render.ts` with no implementation
- **Comprehensive documentation**: Detailed Lambda implementation guide in `/memory-bank/remotion/lambda-rendering.md`
- **No actual rendering**: No export buttons, no rendering logic, no cloud infrastructure

### What's Missing
1. Video rendering implementation
2. Export UI components
3. Cloud infrastructure (if using Lambda)
4. Database schema for tracking renders
5. File storage solution for rendered videos

## Architecture Options

### Option 1: Server-Side Rendering (SSR) - Recommended for MVP

**Implementation Approach:**
```
User clicks Export → tRPC call → Node.js renders video → Upload to R2 → Return download URL
```

**Pros:**
- Simpler to implement
- No AWS setup required
- Uses existing infrastructure (Node.js, R2)
- Good for low-medium volume
- Easier to debug

**Cons:**
- Limited scalability
- Blocks server resources during render
- Slower for concurrent renders
- Memory constraints on server

**Implementation Steps:**
1. Implement `renderMedia()` in render router
2. Add progress tracking with SSE
3. Store rendered videos in R2
4. Add export button to UI
5. Handle download/preview of rendered videos

### Option 2: AWS Lambda - Recommended for Production

**Implementation Approach:**
```
User clicks Export → Deploy to Lambda → Parallel rendering → S3 storage → Webhook notification
```

**Pros:**
- Highly scalable
- Cost-effective (pay per use)
- Parallel rendering
- No server resource blocking
- Battle-tested by Remotion

**Cons:**
- Complex AWS setup
- Additional infrastructure costs
- More moving parts
- Harder to debug

**Implementation Steps:**
1. Set up AWS infrastructure (Lambda, S3, IAM)
2. Deploy Remotion site to S3
3. Create Lambda function for rendering
4. Implement webhook handlers
5. Add progress tracking UI

### Option 3: GitHub Actions - Not Recommended

**Pros:**
- Free for public repos
- No infrastructure management

**Cons:**
- Not suitable for user-triggered exports
- Limited to 6 hours per job
- Complex user authentication
- Poor user experience

## Recommended Implementation Plan

### Phase 1: MVP with SSR (1-2 weeks)

```typescript
// 1. Update render router with actual implementation
export const renderRouter = createTRPCRouter({
  startRender: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      format: z.enum(['mp4', 'webm', 'gif']),
      quality: z.enum(['low', 'medium', 'high']),
    }))
    .mutation(async ({ ctx, input }) => {
      // Get project scenes
      const scenes = await getProjectScenes(input.projectId);
      
      // Start render process
      const { outputPath } = await renderMedia({
        composition: 'MainComposition',
        serveUrl: bundleLocation,
        inputProps: { scenes },
        codec: 'h264',
        outputLocation: tmpFile,
      });
      
      // Upload to R2
      const url = await uploadToR2(outputPath);
      
      // Save to database
      await saveRenderRecord(url, ctx.user.id);
      
      return { downloadUrl: url };
    }),
});
```

```tsx
// 2. Add Export Button Component
export function ExportButton({ projectId }: { projectId: string }) {
  const [isExporting, setIsExporting] = useState(false);
  const exportVideo = api.render.startRender.useMutation();
  
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const result = await exportVideo.mutateAsync({
        projectId,
        format: 'mp4',
        quality: 'high',
      });
      
      // Trigger download
      window.open(result.downloadUrl, '_blank');
    } finally {
      setIsExporting(false);
    }
  };
  
  return (
    <Button onClick={handleExport} disabled={isExporting}>
      {isExporting ? 'Exporting...' : 'Export Video'}
    </Button>
  );
}
```

### Phase 2: Production with Lambda (2-3 weeks)

1. **Infrastructure Setup**
   - Create AWS account and configure credentials
   - Deploy Lambda function using Remotion CLI
   - Set up S3 bucket for renders
   - Configure CloudFront for CDN delivery

2. **Code Migration**
   - Update render router to use `renderMediaOnLambda()`
   - Implement webhook handlers for progress
   - Add real-time progress tracking
   - Update UI for async rendering

3. **Database Schema**
   ```sql
   CREATE TABLE video_renders (
     id TEXT PRIMARY KEY,
     user_id TEXT NOT NULL,
     project_id UUID NOT NULL,
     status TEXT NOT NULL,
     output_url TEXT,
     error_message TEXT,
     created_at TIMESTAMP DEFAULT NOW(),
     updated_at TIMESTAMP
   );
   ```

## Technical Considerations

### 1. Video Formats & Quality

```typescript
interface RenderOptions {
  format: 'mp4' | 'webm' | 'gif';
  resolution: '720p' | '1080p' | '4k';
  fps: 24 | 30 | 60;
  codec: 'h264' | 'h265' | 'vp8' | 'vp9';
  bitrate: 'low' | 'medium' | 'high' | 'custom';
}

const QUALITY_PRESETS = {
  low: { crf: 28, bitrate: '1M' },
  medium: { crf: 23, bitrate: '2.5M' },
  high: { crf: 18, bitrate: '5M' },
};
```

### 2. Progress Tracking

For SSR: Use Server-Sent Events (SSE)
```typescript
// API endpoint
export async function GET(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      // Send progress updates
      controller.enqueue(`data: ${JSON.stringify({ progress: 0.5 })}\n\n`);
    },
  });
  
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
```

For Lambda: Use polling or webhooks
```typescript
// Poll for progress
const { data } = useQuery({
  queryKey: ['render-progress', renderId],
  queryFn: () => api.render.getProgress({ renderId }),
  refetchInterval: 2000,
  enabled: isRendering,
});
```

### 3. Error Handling

Common errors to handle:
- Out of memory (increase Lambda/server memory)
- Timeout (split into smaller chunks)
- Asset loading failures (preload or embed)
- Invalid compositions (validate before render)
- Storage failures (retry with exponential backoff)

### 4. Cost Optimization

**For SSR:**
- Implement render queue to prevent overload
- Cache common renders
- Limit concurrent renders per user

**For Lambda:**
- Use appropriate memory sizes (2GB for simple, 4GB+ for complex)
- Implement render quotas per user
- Offer different quality tiers
- Cache rendered segments

## Implementation Timeline

### Week 1: SSR Implementation
- Day 1-2: Implement basic renderMedia in router
- Day 3-4: Add R2 upload and storage
- Day 5: Create Export button UI
- Day 6-7: Testing and error handling

### Week 2: Polish and Optimization
- Day 1-2: Add progress tracking
- Day 3-4: Implement quality options
- Day 5-6: Add download management
- Day 7: Performance optimization

### Week 3-4: Lambda Migration (if needed)
- Week 3: AWS setup and Lambda deployment
- Week 4: Migration and production testing

## Security Considerations

1. **Authentication**: Ensure only project owners can export
2. **Rate Limiting**: Prevent render abuse
3. **File Access**: Use signed URLs for downloads
4. **Input Validation**: Sanitize all render parameters
5. **Resource Limits**: Set maximum render duration/resolution

## Monitoring & Analytics

Track these metrics:
- Render success/failure rates
- Average render time by video length
- Popular export formats
- User engagement with exports
- Infrastructure costs

## Conclusion

Start with SSR for quick MVP deployment, then migrate to Lambda when you need:
- More than 10 concurrent renders
- Renders longer than 2 minutes
- 4K resolution support
- Cost optimization at scale

The existing documentation provides a complete Lambda implementation guide when ready to scale.