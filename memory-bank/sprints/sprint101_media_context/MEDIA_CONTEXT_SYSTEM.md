# Media Context System - Sprint 101

## Overview
Comprehensive media management system that tracks ALL uploaded assets (images, videos, audio, logos, YouTube links) and ensures the LLM never hallucinates URLs.

## Problem Solved
- **Before**: LLM would often generate fake URLs like `/api/placeholder/123` or `https://example.com/image.jpg` instead of using real uploaded media
- **After**: All media is tracked, resolved, and validated - LLM can only use real URLs

## Architecture

### 1. Core Services

#### MediaContextService (`/src/server/services/media/mediaContext.service.ts`)
- Central registry for ALL media assets
- Tracks: images, videos, audio, logos, YouTube links
- Provides quick lookup maps (by URL, name, tag)
- Generates LLM-safe reference prompts

#### MediaResolver (`/src/server/services/media/mediaResolver.ts`)
- Intelligent reference resolution ("the logo" → actual URL)
- Fuzzy matching for user references
- Confidence scoring for matches
- Prompt enhancement with resolved URLs

#### MediaValidation (`/src/tools/add/add_helpers/mediaValidation.ts`)
- Post-generation validation
- Automatic URL fixing
- Placeholder pattern detection
- Remotion component syntax fixing

### 2. Integration Points

#### Upload Flow
1. User uploads file → `ImageUpload.tsx`
2. File compressed & uploaded to R2 → `/api/upload/route.ts`
3. Asset saved to context → `AssetContextService`
4. Available in MediaContext for all future generations

#### YouTube Integration
1. User shares YouTube URL
2. `/api/youtube/extract/route.ts` extracts metadata
3. Saved as media asset with thumbnail, title, channel
4. Available for embedding in scenes

#### Generation Flow
1. User prompt analyzed for media references
2. MediaResolver finds matching assets
3. Enhanced prompt sent to LLM with exact URLs
4. Generated code validated & fixed if needed
5. Only real URLs make it to final code

## Key Features

### 1. Smart Reference Resolution
```typescript
// User says: "use the logo"
// System finds: Logo asset → https://r2.dev/projects/123/images/logo.png

// User says: "that image"
// System finds: Most recent image upload

// User says: "the youtube video"
// System finds: YouTube link with metadata
```

### 2. Validation Rules for LLM
```
CRITICAL RULES:
1. You MUST use exactly 3 media asset(s) in your code
2. The URLs you use MUST be from this exact list:
   1. https://r2.dev/projects/123/images/photo1.jpg
   2. https://r2.dev/projects/123/videos/clip.mp4
   3. https://youtube.com/watch?v=abc123
3. DO NOT use placeholder URLs
```

### 3. Automatic Fixing
```typescript
// Before (LLM generated):
<Img src="/api/placeholder/0" />

// After (auto-fixed):
<Img src="https://r2.dev/projects/123/images/photo1.jpg" />
```

## Implementation Status

✅ **Completed**:
- MediaContext service for tracking all uploads
- MediaResolver for intelligent reference matching
- MediaValidation for post-generation fixing
- YouTube metadata extraction
- Integration with CodeGenerator
- Validation in image recreation flows

⏳ **Next Steps**:
1. Integrate MediaContextIntegration into Brain Orchestrator
2. Add media context to Edit tool
3. Create UI for media library viewing
4. Add support for external CDN URLs
5. Implement media usage analytics

## Usage Example

```typescript
// In Brain Orchestrator or Tool:
const resolution = await mediaResolver.resolveMediaReferences(
  projectId,
  "Add our logo to the corner",
  currentImageUrls,
  currentVideoUrls
);

// resolution.resolvedMedia contains:
// [{ reference: "our logo", resolved: {...logoAsset}, confidence: 0.9 }]

// resolution.enhancedPrompt includes:
// "RESOLVED MEDIA: 'our logo' → https://r2.dev/.../logo.png"
// "You MUST use this exact URL in your code"
```

## Benefits

1. **Zero Hallucination**: LLM can only use real URLs
2. **Smart Resolution**: Natural language → actual assets
3. **Automatic Fixing**: Catches and fixes any mistakes
4. **YouTube Support**: Embed YouTube videos easily
5. **Future Proof**: Extensible for new media types

## Technical Details

### Media Asset Structure
```typescript
interface MediaAsset {
  id: string;
  url: string;
  type: 'image' | 'video' | 'audio' | 'logo' | 'youtube';
  originalName?: string;
  referenceNames: string[]; // ["logo", "company logo", "brand"]
  tags: string[];
  metadata?: {
    youtubeTitle?: string;
    dimensions?: { width: number; height: number };
    duration?: number;
  };
}
```

### Validation Process
1. Extract all URLs from generated code
2. Check each against MediaContext registry
3. Replace unknown URLs with best matches
4. Log all fixes for debugging
5. Return validated code

## Debugging

Watch for these console logs:
- `📸 [MEDIA CONTEXT] Resolved media references`
- `🔧 [MEDIA VALIDATION] Fixed URL issues`
- `✅ [MEDIA VALIDATION] Code validation passed`

## Future Enhancements

1. **Media Library UI**: Visual browser for all project assets
2. **Smart Suggestions**: "You have a logo, want to add it?"
3. **CDN Support**: Track external CDN URLs
4. **Usage Analytics**: Which assets are used most?
5. **Auto-Tagging**: AI-powered asset categorization