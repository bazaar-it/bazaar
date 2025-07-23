# Sprint 83: Video Rendering Deep Dive - The Complete Journey

## Overview
This document provides an exhaustive explanation of Bazaar-Vid's video rendering pipeline, from user clicking "Export" to receiving a downloadable video file. This is the definitive guide to understanding how our AWS Lambda-based rendering system works.

## Table of Contents
1. [High-Level Architecture](#high-level-architecture)
2. [The User Journey](#the-user-journey)
3. [Component Breakdown](#component-breakdown)
4. [The Rendering Pipeline](#the-rendering-pipeline)
5. [Scene Preprocessing](#scene-preprocessing)
6. [Lambda Execution](#lambda-execution)
7. [Progress Tracking](#progress-tracking)
8. [Error Handling](#error-handling)
9. [Format Support](#format-support)
10. [Performance Considerations](#performance-considerations)
11. [Troubleshooting Guide](#troubleshooting-guide)

## High-Level Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│   Frontend      │────▶│   tRPC API      │────▶│  AWS Lambda     │
│   (Next.js)     │     │   (render.ts)   │     │  (Remotion)     │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  Export Modal   │     │ Render Service  │     │   S3 Bucket     │
│  (UI/UX)        │     │ (Preprocessing) │     │  (Storage)      │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## The User Journey

### 1. Initiating Export
When a user clicks the export button in the preview panel:

```typescript
// PreviewPanelG.tsx
<Button onClick={() => setIsExportModalOpen(true)}>
  <Download className="h-4 w-4" />
  Export
</Button>
```

### 2. Export Modal
The `ExportModal` component presents format and quality options:

```typescript
// ExportModal.tsx
- Format: MP4 (default), WebM, GIF
- Quality: Low (480p), Medium (720p), High (1080p)
- Shows estimated duration and file size
```

### 3. API Request
When user confirms export:

```typescript
// Calls tRPC mutation
exportMutation.mutate({
  projectId: currentProjectId,
  format: selectedFormat,
  quality: selectedQuality
})
```

## Component Breakdown

### 1. Frontend Components

#### ExportModal (`/src/components/modals/ExportModal.tsx`)
- Presents export options
- Calculates estimated duration
- Shows daily quota (10 exports/day)
- Handles loading states and errors

#### ExportProgress (`/src/components/modals/ExportProgress.tsx`)
- Real-time progress tracking
- Shows rendering percentage
- Auto-downloads on completion
- Error display with retry options

### 2. Backend Services

#### Render Router (`/src/server/api/routers/render.ts`)
- **startRender**: Initiates rendering process
- **getRenderStatus**: Polls render progress
- **listRenders**: Shows user's render history
- **trackDownload**: Analytics for downloads

Key validations:
```typescript
// Daily quota check
if (todayRenderCount >= USER_DAILY_EXPORT_LIMIT) {
  throw new TRPCError({
    code: 'TOO_MANY_REQUESTS',
    message: `Daily export limit reached`
  });
}

// Duration check
if (estimatedDuration > MAX_RENDER_DURATION_MINUTES) {
  throw new TRPCError({
    code: 'BAD_REQUEST',
    message: `Video too long`
  });
}
```

#### Render Service (`/src/server/services/render/render.service.ts`)
Core preprocessing logic:
- TypeScript to JavaScript compilation
- Icon replacement (Iconify → SVG)
- Format-aware dimension calculation
- Scene validation and cleanup

#### Lambda Render Service (`/src/server/services/render/lambda-render.service.ts`)
AWS Lambda integration:
- Remotion SDK invocation
- Progress tracking
- Error handling
- S3 output management

## The Rendering Pipeline

### Step 1: Project Retrieval
```typescript
const project = await ctx.db.query.projects.findFirst({
  where: (projects, { eq, and }) => and(
    eq(projects.id, input.projectId),
    eq(projects.userId, ctx.session.user.id)
  ),
  with: {
    scenes: {
      orderBy: (scenes, { asc }) => asc(scenes.order),
    },
  },
});
```

### Step 2: Render Configuration
```typescript
const renderConfig = await prepareRenderConfig({
  projectId: input.projectId,
  scenes: project.scenes,
  format: input.format,
  quality: input.quality,
  projectProps: project.props, // Contains format info
});
```

The `prepareRenderConfig` function:
1. Calculates render dimensions based on project format
2. Preprocesses all scenes
3. Validates scene code
4. Returns complete configuration

### Step 3: Dimension Calculation
```typescript
// render.service.ts - prepareRenderConfig
const projectFormat = projectProps?.meta?.format || 'landscape';
const projectWidth = projectProps?.meta?.width || 1920;
const projectHeight = projectProps?.meta?.height || 1080;

// Calculate render dimensions based on format and quality
if (projectFormat === 'portrait') {
  // For portrait (9:16), prioritize height
  renderHeight = Math.min(projectHeight, qualityMaxDimension);
  renderWidth = Math.round(renderHeight * projectAspectRatio);
} else if (projectFormat === 'square') {
  // For square (1:1), use the smaller dimension
  const maxSquareSize = Math.min(settings.resolution.width, settings.resolution.height);
  renderWidth = renderHeight = Math.min(projectWidth, maxSquareSize);
} else {
  // For landscape (16:9), prioritize width
  renderWidth = Math.min(projectWidth, settings.resolution.width);
  renderHeight = Math.round(renderWidth / projectAspectRatio);
}
```

### Step 4: Lambda Invocation
```typescript
const result = await renderVideoOnLambda({
  ...renderConfig,
  webhookUrl: `${process.env.NEXTAUTH_URL}/api/webhooks/render`,
  renderWidth: renderConfig.renderWidth,
  renderHeight: renderConfig.renderHeight,
});
```

## Scene Preprocessing

The most complex part of the pipeline is preprocessing scenes for Lambda execution.

### 1. TypeScript to JavaScript Compilation
```typescript
// Using Sucrase for fast compilation
const { transform } = require('sucrase');
let { code: transformedCode } = transform(tsxCode, {
  transforms: ['typescript', 'jsx'],
  jsxRuntime: 'classic',
  production: true,
});
```

### 2. Remotion Component Handling
```typescript
// Extract Remotion components being used
const remotionComponents = [];
const remotionMatch = transformedCode.match(/const\s*{\s*([^}]+)\s*}\s*=\s*window\.Remotion\s*;?/);
if (remotionMatch) {
  remotionComponents.push(...remotionMatch[1].split(',').map(h => h.trim()));
}

// Remove window.Remotion destructuring (we provide it differently)
transformedCode = transformedCode.replace(
  /const\s*{\s*[^}]+\s*}\s*=\s*window\.Remotion\s*;?\n?/g,
  ''
);
```

### 3. Icon Replacement
The most critical preprocessing step - replacing Iconify icons with inline SVGs:

```typescript
async function replaceIconifyIcons(code: string): Promise<string> {
  const { loadNodeIcon } = await import('@iconify/utils/lib/loader/node-loader');
  
  // Find all IconifyIcon references
  const jsxIconRegex = /<window\.IconifyIcon\s+icon="([^"]+)"([^>]*?)\/>/g;
  const createElementRegex = /React\.createElement\(window\.IconifyIcon,\s*\{[^}]*icon:\s*"([^"]+)"[^}]*\}[^)]*\)/g;
  
  // Process each icon
  for (const match of jsxMatches) {
    const [fullMatch, iconName, attrs = ''] = match;
    const [collection, icon] = iconName.split(':');
    
    // Load icon SVG
    const svgString = await loadNodeIcon(collection, icon);
    
    if (!svgString) {
      // Fallback to placeholder
      code = code.replace(fullMatch, '<span style={{display:"inline-block",width:"1em",height:"1em",background:"currentColor",borderRadius:"50%"}} />');
      continue;
    }
    
    // Convert to React-compatible SVG
    let reactSvg = svgString
      .replace(/class=/g, 'className=')
      .replace(/(\w+)-(\w+)=/g, (match, p1, p2) => 
        `${p1}${p2.charAt(0).toUpperCase() + p2.slice(1)}=`
      );
    
    code = code.replace(fullMatch, reactSvg);
  }
  
  return code;
}
```

### 4. Export Statement Removal
Lambda execution context doesn't support ES6 exports:

```typescript
// Remove export statements that can't be used inside Function constructor
transformedCode = transformedCode
  .replace(/export\s+default\s+Component;?/g, '')
  .replace(/export\s+default\s+\w+;?/g, '')
  .replace(/export\s+const\s+\w+\s*=\s*[^;]+;?/g, '')
  .replace(/export\s+{\s*[^}]*\s*};?/g, '');
```

### 5. Component Wrapping
Ensure the component is available for execution:

```typescript
// Replace export default with direct assignment
transformedCode = transformedCode.replace(
  /export\s+default\s+function\s+(\w+)/g,
  'const Component = function $1'
);

// Ensure component is returned
if (transformedCode.includes('const Component') && !transformedCode.includes('return Component')) {
  transformedCode = transformedCode + '\n\nreturn Component;';
}
```

## Lambda Execution

### 1. Lambda Site Deployment
Before Lambda can render, a site must be deployed:

```bash
npx remotion lambda sites create --site-name="bazaar-vid-v3-prod"
```

This creates a static site on S3 containing:
- MainCompositionSimple.tsx (compiled)
- All Remotion dependencies
- React runtime

### 2. Lambda Function Invocation
```typescript
const { renderMediaOnLambda } = await import("@remotion/lambda/client");

const { renderId, bucketName } = await renderMediaOnLambda({
  region: process.env.AWS_REGION as AwsRegion,
  functionName: process.env.REMOTION_FUNCTION_NAME!,
  serveUrl: DEPLOYED_SITE_URL,
  composition: "MainComposition",
  inputProps: {
    scenes,
    projectId,
    width: width,
    height: height,
  },
  codec: format === 'gif' ? 'gif' : 'h264',
  imageFormat: format === 'gif' ? 'png' : 'jpeg',
  jpegQuality: settings.jpegQuality,
  crf: format === 'gif' ? undefined : settings.crf,
  privacy: "public",
  downloadBehavior: {
    type: "download",
    fileName: `bazaar-vid-${projectId}.${format}`,
  },
  maxRetries: 3,
  frameRange: totalDuration > 0 ? [0, totalDuration - 1] : undefined,
  outName: `${projectId}.${format}`,
});
```

### 3. MainCompositionSimple Execution
In Lambda, the `MainCompositionSimple.tsx` component:

1. Receives scenes with preprocessed JavaScript code
2. Creates a Function constructor for each scene
3. Executes the code in a sandboxed environment
4. Renders the React components frame by frame

```typescript
// DynamicScene component in MainCompositionSimple.tsx
const createComponent = new Function(
  'React',
  'AbsoluteFill',
  'useCurrentFrame',
  'interpolate',
  'spring',
  'Sequence',
  'useVideoConfig',
  'random',
  'useEffect',
  'useState',
  'videoWidth',
  'videoHeight',
  'videoDuration',
  `
  try {
    // Scene code is injected here
    ${scene.jsCode}
    
    // Return the component
    if (typeof Component !== 'undefined') {
      return Component;
    }
  } catch (e) {
    console.error('Scene component factory error:', e);
    return null;
  }
  `
);
```

## Progress Tracking

### 1. Polling Mechanism
The frontend polls for progress every 500ms:

```typescript
// ExportProgress.tsx
const { data: status } = api.render.getRenderStatus.useQuery(
  { renderId },
  {
    enabled: !!renderId && !isCompleted,
    refetchInterval: 500,
  }
);
```

### 2. Lambda Progress API
```typescript
// lambda-render.service.ts
export async function getLambdaRenderProgress(renderId: string, bucketName: string) {
  const { getRenderProgress } = await import("@remotion/lambda/client");
  
  const progress = await getRenderProgress({
    renderId,
    bucketName,
    region: process.env.AWS_REGION as AwsRegion,
    functionName: process.env.REMOTION_FUNCTION_NAME!,
  });
  
  return {
    overallProgress: progress.overallProgress,
    renderedFrames: progress.framesRendered,
    encodedFrames: progress.encodingStatus?.framesEncoded || 0,
    currentTime: progress.costs?.accruedSoFar,
    done: progress.done,
    outputFile: progress.outputFile,
    errors: progress.errors,
  };
}
```

### 3. State Management
Render state is maintained in memory and database:

```typescript
// In-memory state for fast access
renderState.set(result.renderId, {
  id: result.renderId,
  status: 'rendering',
  progress: 0,
  userId: ctx.session.user.id,
  projectId: input.projectId,
  format: input.format,
  quality: input.quality,
  createdAt: Date.now(),
  bucketName: result.bucketName,
});

// Database persistence for reliability
await ExportTrackingService.trackExportStart({
  userId: ctx.session.user.id,
  projectId: input.projectId,
  renderId: result.renderId,
  format: input.format,
  quality: input.quality,
  duration: totalDuration,
});
```

## Error Handling

### 1. Common Errors and Solutions

#### Scene Compilation Errors
- **Cause**: Invalid JavaScript syntax after preprocessing
- **Solution**: Auto-fix system attempts progressive fixes
- **Fallback**: Show error placeholder in rendered video

#### Icon Loading Failures
- **Cause**: Icon not found in Iconify database
- **Solution**: Replace with circular placeholder
- **Prevention**: Validate icons during generation

#### Lambda Timeout
- **Cause**: Video too long or complex scenes
- **Solution**: 30-minute maximum duration limit
- **User feedback**: Clear error message with suggestions

#### S3 Access Denied
- **Cause**: Incorrect bucket permissions
- **Solution**: Run `npm run setup:s3-public`
- **Prevention**: Automated setup script

### 2. Error Recovery
```typescript
// Automatic retry logic
maxRetries: 3,

// User-friendly error messages
if (error.message.includes("UnrecognizedClientException")) {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: "AWS credentials not configured properly. Please contact support."
  });
}
```

## Format Support

### 1. Video Formats
- **MP4 (H.264)**: Default, best compatibility
- **WebM (VP8)**: Open format, smaller files
- **GIF**: Animated images, limited quality

### 2. Resolution Support
- **Portrait (9:16)**: 1080x1920, 720x1280, 480x854
- **Landscape (16:9)**: 1920x1080, 1280x720, 854x480
- **Square (1:1)**: 1080x1080, 720x720, 480x480

### 3. Quality Settings
```typescript
export const qualitySettings = {
  low: { 
    crf: 28, 
    jpegQuality: 70,
    resolution: { width: 854, height: 480 },
    videoBitrate: '1M',
  },
  medium: { 
    crf: 23, 
    jpegQuality: 80,
    resolution: { width: 1280, height: 720 },
    videoBitrate: '2.5M',
  },
  high: { 
    crf: 18, 
    jpegQuality: 90,
    resolution: { width: 1920, height: 1080 },
    videoBitrate: '5M',
  },
};
```

## Performance Considerations

### 1. Preprocessing Optimization
- **Parallel Processing**: All scenes preprocessed concurrently
- **Caching**: Icon SVGs cached after first load
- **Code Minification**: Reduced payload size to Lambda

### 2. Lambda Optimization
- **Cold Start Mitigation**: Keep-warm function calls
- **Memory Allocation**: 2048MB for optimal performance
- **Timeout Settings**: 15 minutes per render

### 3. Network Optimization
- **S3 Direct Downloads**: Client downloads directly from S3
- **CloudFront CDN**: Global distribution for fast downloads
- **Compression**: Gzip for API responses

## Troubleshooting Guide

### 1. Export Button Not Working
```bash
# Check environment variables
echo $RENDER_MODE  # Should be "lambda"
echo $AWS_REGION   # Should be set
echo $REMOTION_FUNCTION_NAME  # Should be set
```

### 2. Render Fails Immediately
```bash
# Check Lambda function status
aws lambda get-function --function-name $REMOTION_FUNCTION_NAME

# Check S3 bucket permissions
aws s3api get-bucket-acl --bucket $REMOTION_BUCKET_NAME
```

### 3. Wrong Format/Dimensions
```typescript
// Check project props
console.log(project.props?.meta?.format);  // Should be 'portrait', 'landscape', or 'square'
console.log(project.props?.meta?.width);   // Should match expected dimensions
console.log(project.props?.meta?.height);
```

### 4. Slow Rendering
- Check scene complexity (number of animations)
- Verify Lambda memory allocation
- Monitor CloudWatch logs for errors

### 5. Download Fails
```bash
# Ensure S3 public access
npm run setup:s3-public

# Check CORS configuration
aws s3api get-bucket-cors --bucket $REMOTION_BUCKET_NAME
```

## Summary

The Bazaar-Vid rendering pipeline is a sophisticated system that:

1. **Preprocesses** TypeScript React components into Lambda-executable JavaScript
2. **Handles** complex transformations (icons, imports, exports)
3. **Calculates** appropriate dimensions based on project format
4. **Executes** rendering in AWS Lambda for scalability
5. **Tracks** progress in real-time
6. **Delivers** videos directly from S3 with proper access controls

The system is designed for reliability, scalability, and user experience, with extensive error handling and recovery mechanisms at every step.

---

*Last Updated: 2025-07-22*
*Sprint: 83 - Render Deep Dive*