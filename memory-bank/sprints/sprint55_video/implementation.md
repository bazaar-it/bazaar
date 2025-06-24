# Sprint 55: Video Support Implementation

## Overview
Added full video support to Bazaar-Vid, enabling users to upload video files (MP4, MOV, WebM) and use them in Remotion scenes with animated overlays.

## Implementation Date
January 25, 2025

## Problem Statement
Users wanted to include video files in their motion graphics projects but the system was only handling images. Videos would upload successfully but were ignored during scene generation.

## Root Cause
The Zod validation schemas in the tool input types were missing the `videoUrls` field, causing the validation layer to strip out video URLs before they reached the tools.

## Solution

### 1. Frontend - ImageUpload Component
Already supported video uploads with proper type discrimination:
```typescript
export interface UploadedImage {
  id: string;
  file: File;
  status: 'uploading' | 'uploaded' | 'error';
  url?: string;
  error?: string;
  type?: 'image' | 'video'; // Type discrimination
}
```

### 2. Upload API (`/api/upload/route.ts`)
Already handled video files:
- Accepts video MIME types: `video/mp4`, `video/quicktime`, `video/webm`
- 100MB size limit for videos (vs 10MB for images)
- Stores in R2 under `/videos/` path

### 3. Chat Flow
ChatPanelG properly separated images and videos:
```typescript
const imageUrls = uploadedImages
  .filter(img => img.status === 'uploaded' && img.url && img.type !== 'video')
  .map(img => img.url!);

const videoUrls = uploadedImages
  .filter(img => img.status === 'uploaded' && img.url && img.type === 'video')
  .map(img => img.url!);
```

### 4. The Fix - Zod Schemas
Added missing `videoUrls` to tool input schemas in `/src/tools/helpers/types.ts`:

```typescript
// ADD tool schema
export const addToolInputSchema = baseToolInputSchema.extend({
  // ... other fields ...
  imageUrls: z.array(z.string()).optional().describe("Image URLs for reference"),
  videoUrls: z.array(z.string()).optional().describe("Video URLs for reference"), // ADDED
  // ... rest of schema ...
});

// EDIT tool schema  
export const editToolInputSchema = baseToolInputSchema.extend({
  // ... other fields ...
  imageUrls: z.array(z.string()).optional().describe("Image URLs for reference"),
  videoUrls: z.array(z.string()).optional().describe("Video URLs for reference"), // ADDED
  // ... rest of schema ...
});
```

### 5. Orchestrator Enhancement
Updated orchestrator to pass videoUrls in tool context:
```typescript
toolContext: {
  userPrompt: input.prompt,
  targetSceneId: toolSelection.targetSceneId,
  targetDuration: toolSelection.targetDuration,
  referencedSceneIds: toolSelection.referencedSceneIds,
  imageUrls: (input.userContext?.imageUrls as string[]) || undefined,
  videoUrls: (input.userContext?.videoUrls as string[]) || undefined, // ADDED
  webContext: contextPacket.webContext,
}
```

### 6. Code Generation
The CodeGeneratorNEW service already had video support:
```typescript
async generateCodeWithVideos(input: {
  videoUrls: string[];
  userPrompt: string;
  functionName: string;
}): Promise<CodeGenerationOutput>
```

With proper Remotion Video component instructions:
- Use `const { Video } = window.Remotion;`
- Background videos: `<Video src={videoUrl} style={{ width: "100%", height: "100%", objectFit: "cover" }} />`
- Default to muting background videos with `volume={0}`
- Let videos play for scene duration (no arbitrary `endAt`)

## Files Modified

1. `/src/tools/helpers/types.ts` - Added videoUrls to Zod schemas
2. `/src/brain/orchestratorNEW.ts` - Pass videoUrls in tool context
3. `/src/tools/add/add.ts` - Debug logging for video flow
4. `/src/server/api/routers/generation/helpers.ts` - Debug logging
5. `/src/server/api/routers/generation/scene-operations.ts` - Debug logging

## Testing
Successfully tested with:
- MOV file upload (13MB)
- Scene generation with text overlay animations
- Proper Remotion Video component generation
- Video playing as background with muted audio

## Debug Flow
The debug logs showed the exact point of failure:
```
🧠 [NEW ORCHESTRATOR] hasVideos: true
📝 [HELPERS] hasVideoUrls: true, videoUrls: [...]
🔨 [ADD TOOL] hasVideos: false, videoUrls: undefined  // ❌ Lost here!
```

This pinpointed the Zod validation as the culprit.

## Lessons Learned
1. Always ensure Zod schemas match TypeScript interfaces exactly
2. Validation layers can silently strip fields if not defined in schema
3. Debug logging at each layer helps identify where data is lost
4. The `BaseMCPTool` validation step is critical - it uses `inputSchema.parse()`

## Future Enhancements
- Add video duration detection for automatic scene timing
- Support for video trimming (startFrom/endAt)
- Video thumbnail generation for preview
- Multiple video layers support