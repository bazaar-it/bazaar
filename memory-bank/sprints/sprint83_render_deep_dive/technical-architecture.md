# Technical Architecture: Video Rendering System

## System Components Overview

### 1. Frontend Layer

#### Export UI Components
```typescript
// Component hierarchy
<PreviewPanelG>
  <ExportButton onClick={openModal} />
  <ExportModal>
    <FormatSelector />
    <QualitySelector />
    <DurationEstimate />
    <ExportButton onClick={startExport} />
  </ExportModal>
  <ExportProgress>
    <ProgressBar percentage={progress} />
    <StatusMessage />
    <DownloadHandler />
  </ExportProgress>
</PreviewPanelG>
```

#### Key Frontend Services
- **tRPC Client**: Type-safe API calls
- **React Query**: Caching and polling
- **Zustand**: Local state management
- **Auto-download**: Browser download API

### 2. API Layer (tRPC)

#### Render Router Endpoints
```typescript
// /src/server/api/routers/render.ts
export const renderRouter = createTRPCRouter({
  // Main rendering endpoint
  startRender: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      format: z.enum(['mp4', 'webm', 'gif']),
      quality: z.enum(['low', 'medium', 'high'])
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Validate user quota
      // 2. Fetch project data
      // 3. Prepare render config
      // 4. Invoke Lambda
      // 5. Return render ID
    }),

  // Progress polling endpoint
  getRenderStatus: protectedProcedure
    .input(z.object({ renderId: z.string() }))
    .query(async ({ ctx, input }) => {
      // 1. Check memory state
      // 2. Query Lambda if active
      // 3. Update database
      // 4. Return progress
    }),

  // Analytics endpoints
  getExportStats: protectedProcedure.query(),
  trackDownload: protectedProcedure.mutation()
});
```

### 3. Service Layer

#### Render Service Architecture
```typescript
// /src/server/services/render/render.service.ts

// Core preprocessing pipeline
export async function prepareRenderConfig({
  projectId,
  scenes,
  format,
  quality,
  projectProps
}: RenderConfig) {
  // 1. Calculate dimensions
  const { renderWidth, renderHeight } = calculateDimensions(
    projectProps.meta.format,
    projectProps.meta.width,
    projectProps.meta.height,
    qualitySettings[quality]
  );

  // 2. Preprocess all scenes in parallel
  const processedScenes = await Promise.all(
    scenes.map(scene => preprocessSceneForLambda(scene))
  );

  // 3. Return complete configuration
  return {
    projectId,
    scenes: processedScenes,
    format,
    quality,
    renderWidth,
    renderHeight,
    totalDuration,
    inputProps: { /* Lambda input */ }
  };
}

// Scene preprocessing pipeline
async function preprocessSceneForLambda(scene: Scene) {
  // 1. Compile TypeScript to JavaScript
  const jsCode = compileTypeScript(scene.tsxCode);
  
  // 2. Replace Iconify icons with SVGs
  const codeWithSvgs = await replaceIconifyIcons(jsCode);
  
  // 3. Remove export statements
  const cleanCode = removeExports(codeWithSvgs);
  
  // 4. Validate and wrap component
  const finalCode = wrapComponent(cleanCode);
  
  return { ...scene, jsCode: finalCode };
}
```

#### Lambda Integration Service
```typescript
// /src/server/services/render/lambda-render.service.ts

export async function renderVideoOnLambda({
  projectId,
  scenes,
  format,
  quality,
  webhookUrl,
  renderWidth,
  renderHeight
}: LambdaRenderConfig) {
  // 1. Validate Lambda configuration
  checkLambdaConfig();
  
  // 2. Import Remotion SDK dynamically
  const { renderMediaOnLambda } = await import("@remotion/lambda/client");
  
  // 3. Invoke Lambda function
  const { renderId, bucketName } = await renderMediaOnLambda({
    region: process.env.AWS_REGION,
    functionName: process.env.REMOTION_FUNCTION_NAME,
    serveUrl: DEPLOYED_SITE_URL,
    composition: "MainComposition",
    inputProps: {
      scenes,
      projectId,
      width: renderWidth,
      height: renderHeight
    },
    codec: getCodec(format),
    quality: getQualitySettings(quality),
    privacy: "public",
    maxRetries: 3
  });
  
  return { renderId, bucketName };
}
```

### 4. Lambda Layer

#### Remotion Site Structure
```
remotion-site/
├── src/
│   ├── index.tsx          # Entry point
│   ├── MainCompositionSimple.tsx  # Main component
│   └── Video.tsx          # Root component
├── package.json
└── remotion.config.ts
```

#### MainCompositionSimple Component
```typescript
// Key component that runs in Lambda
export const MainCompositionSimple: React.FC = () => {
  return (
    <Composition
      id="MainComposition"
      component={VideoComposition}
      calculateMetadata={({ props }) => {
        // Dynamic duration calculation
        const totalDuration = props.scenes.reduce(
          (sum, scene) => sum + extractSceneDuration(scene),
          0
        );
        
        return {
          durationInFrames: totalDuration,
          fps: 30,
          width: props.width,
          height: props.height
        };
      }}
    />
  );
};

// Scene execution component
const DynamicScene: React.FC<{ scene: any }> = ({ scene }) => {
  // Create sandboxed execution environment
  const createComponent = new Function(
    'React', 'AbsoluteFill', 'useCurrentFrame', /* ... */,
    `
    try {
      ${scene.jsCode}
      return Component;
    } catch (e) {
      console.error('Scene error:', e);
      return null;
    }
    `
  );
  
  const Component = createComponent(/* inject dependencies */);
  return Component ? <Component /> : <FallbackScene />;
};
```

### 5. Infrastructure Layer

#### AWS Services
```
┌─────────────────────┐
│   AWS Lambda        │
│  - 2048MB Memory    │
│  - 15 min timeout   │
│  - Node.js 18.x     │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   Amazon S3         │
│  - Video storage    │
│  - Public access    │
│  - Lifecycle rules  │
└──────────┬──────────┘
           │
┌──────────▼──────────┐
│   CloudFront CDN    │
│  - Global delivery  │
│  - HTTPS only       │
│  - Caching rules    │
└─────────────────────┘
```

#### Environment Configuration
```env
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=xxx
AWS_SECRET_ACCESS_KEY=xxx

# Remotion Lambda
REMOTION_FUNCTION_NAME=remotion-render-xxx
REMOTION_BUCKET_NAME=remotionlambda-xxx
REMOTION_SERVE_URL=https://xxx.s3.amazonaws.com/sites/xxx/index.html

# Application
RENDER_MODE=lambda
USER_DAILY_EXPORT_LIMIT=10
MAX_RENDER_DURATION_MINUTES=30
```

### 6. Database Schema

#### Export Tracking Table
```sql
CREATE TABLE export_tracking (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  render_id TEXT UNIQUE NOT NULL,
  format TEXT NOT NULL,
  quality TEXT NOT NULL,
  duration INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  progress INTEGER DEFAULT 0,
  output_url TEXT,
  error TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  download_count INTEGER DEFAULT 0,
  
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (project_id) REFERENCES projects(id)
);

-- Indexes for performance
CREATE INDEX idx_export_user_created ON export_tracking(user_id, created_at);
CREATE INDEX idx_export_render_id ON export_tracking(render_id);
```

## Security Architecture

### 1. Authentication & Authorization
```typescript
// All render endpoints are protected
protectedProcedure.mutation(async ({ ctx }) => {
  // ctx.session.user is guaranteed to exist
  // User can only render their own projects
});
```

### 2. S3 Security
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::bucket-name/renders/*"
    }
  ]
}
```

### 3. Rate Limiting
- Daily export limit: 10 per user
- Concurrent renders: 1 per user
- API rate limiting: Via Vercel/CloudFlare

## Performance Architecture

### 1. Preprocessing Optimizations
- **Parallel Processing**: All scenes processed concurrently
- **Icon Caching**: SVGs cached after first load
- **Code Minification**: Reduced Lambda payload

### 2. Lambda Optimizations
- **Memory**: 2048MB for optimal CPU allocation
- **Layers**: Shared dependencies in Lambda layers
- **Cold Start**: Provisioned concurrency for popular times

### 3. Network Optimizations
- **Direct S3 Downloads**: No proxy through application
- **CloudFront CDN**: Edge caching for global users
- **Compression**: Brotli/Gzip for all responses

## Monitoring & Observability

### 1. Application Metrics
```typescript
// Track render metrics
await ExportTrackingService.trackExportStart({
  userId,
  projectId,
  renderId,
  format,
  quality,
  duration
});

// Track downloads
await ExportTrackingService.trackDownload(
  renderId,
  userAgent,
  ipAddress
);
```

### 2. AWS CloudWatch
- Lambda execution metrics
- S3 request metrics
- Error logs and alarms

### 3. Error Tracking
- Sentry for application errors
- CloudWatch for infrastructure errors
- Custom error categorization

## Scalability Considerations

### 1. Horizontal Scaling
- Lambda: Auto-scales to 1000 concurrent executions
- Database: Connection pooling via Prisma
- API: Serverless functions scale automatically

### 2. Vertical Scaling
- Lambda memory: Can increase to 10GB if needed
- Database: Can upgrade RDS instance class
- CDN: Unlimited bandwidth capacity

### 3. Cost Optimization
- S3 lifecycle policies for old renders
- Lambda reserved capacity for predictable load
- CloudFront caching to reduce origin requests

---

This architecture ensures a robust, scalable, and maintainable video rendering system that can handle growth while maintaining performance and reliability.