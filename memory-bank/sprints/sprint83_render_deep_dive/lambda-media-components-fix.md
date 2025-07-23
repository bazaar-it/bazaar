# Lambda Media Components Fix - Critical Export Issue

## Issue Summary
**Date**: 2025-07-22
**Sprint**: 83
**Severity**: CRITICAL
**Impact**: Images not rendering in exported videos

## Problem Description
When exporting videos via AWS Lambda, any scenes containing images would render as blank/empty content. The images would appear correctly in the preview panel but not in the final exported video.

### Symptoms
- Images displayed correctly in local preview
- Exported videos showed blank spaces where images should be
- No errors in Lambda logs
- Scene code contained valid `Img` component references

## Root Cause Analysis

### The Bug
In `MainCompositionSimple.tsx`, the Remotion media components were being stubbed as null functions:

```typescript
// WRONG - This was causing the issue
const Img = () => null; // Stub for Lambda
const Audio = () => null; // Stub for Lambda
const Video = () => null; // Stub for Lambda
const staticFile = (path) => path; // Stub for Lambda
```

This meant that any `Img` components in the scene code would render nothing in the Lambda environment.

### Why This Happened
1. Initial Lambda implementation focused on text/shape animations
2. Media components were stubbed as placeholders
3. Testing didn't include image-heavy scenes
4. The stubs were never replaced with real implementations

## The Fix

### 1. Import Real Remotion Components
```typescript
// MainCompositionSimple.tsx
import { 
  Composition, Series, AbsoluteFill, useCurrentFrame, 
  interpolate, spring, Sequence, 
  Img, Audio, Video, staticFile  // Added these imports
} from "remotion";
```

### 2. Pass Components to Function Constructor
```typescript
// Added to Function parameters
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
  'Img',           // Added
  'Audio',         // Added
  'Video',         // Added
  'staticFile',    // Added
  // ... function body
);
```

### 3. Pass Real Components During Invocation
```typescript
// Pass actual components instead of stubs
const ComponentFactory = createComponent(
  React, 
  AbsoluteFill, 
  useCurrentFrame, 
  interpolate, 
  spring, 
  Sequence,
  // ... other params
  Img,           // Real component
  Audio,         // Real component
  Video,         // Real component
  staticFile     // Real function
);
```

### 4. Deploy New Lambda Site
```bash
# Deploy updated site with media component support
npx remotion lambda sites create --site-name="bazaar-vid-v3-prod-fix"

# Output:
# Serve URL: https://remotionlambda-useast1-yb1vzou9i7.s3.us-east-1.amazonaws.com/sites/bazaar-vid-v3-prod-fix/index.html
```

### 5. Update Configuration
```typescript
// lambda-render.service.ts
const DEPLOYED_SITE_URL = process.env.REMOTION_SERVE_URL || 
  "https://remotionlambda-useast1-yb1vzou9i7.s3.us-east-1.amazonaws.com/sites/bazaar-vid-v3-prod-fix/index.html";

// .env.local
REMOTION_SERVE_URL=https://remotionlambda-useast1-yb1vzou9i7.s3.us-east-1.amazonaws.com/sites/bazaar-vid-v3-prod-fix/index.html
```

## Technical Details

### How Lambda Executes Scene Code
1. Scene code is preprocessed (TypeScript → JavaScript)
2. Code is passed to Lambda as a string
3. Lambda creates a Function constructor with the code
4. Components are injected as parameters
5. The function returns a React component
6. Remotion renders the component frame by frame

### Why Stubs Don't Work
- Remotion's `Img` component handles:
  - Image loading and caching
  - Frame-based visibility
  - Proper sizing and scaling
  - Cross-origin handling
- A null stub means no image element is created
- The browser can't load or display the image

### Media Component Requirements
```typescript
// Img component usage in scenes
<Img 
  src="https://example.com/image.jpg"
  style={{
    width: "100%",
    height: "100%",
    objectFit: "cover"
  }}
/>

// Audio component usage
<Audio 
  src="https://example.com/audio.mp3"
  startFrom={30}
  endAt={180}
/>

// Video component usage
<Video 
  src="https://example.com/video.mp4"
  startFrom={0}
  endAt={150}
/>
```

## Testing Checklist

### Before Deploy
- [x] Test scene with single image
- [x] Test scene with multiple images
- [x] Test scene with animated images
- [x] Test different image formats (JPG, PNG, WebP)
- [x] Test remote URLs (R2, external CDNs)
- [ ] Test Audio component (if used)
- [ ] Test Video component (if used)

### After Deploy
- [x] Export video with image scenes
- [x] Verify images appear in rendered video
- [x] Check image quality and positioning
- [x] Test different export formats (MP4, WebM, GIF)

## Lessons Learned

1. **Never stub Remotion components** - They have complex internal behavior
2. **Test with real content** - Text-only testing misses media issues
3. **Deploy incrementally** - Test each component type separately
4. **Version Lambda sites** - Use descriptive names for tracking

## Related Files
- `/src/remotion/MainCompositionSimple.tsx` - Main composition for Lambda
- `/src/server/services/render/lambda-render.service.ts` - Lambda invocation
- `/src/server/services/render/render.service.ts` - Scene preprocessing
- `/.env.local` - Lambda site URL configuration

## Future Improvements

1. **Add Component Validation**
   - Check if all used components are available
   - Warn if components are missing or stubbed

2. **Automated Testing**
   - Create test scenes with all media types
   - Run automated exports after Lambda deployment

3. **Better Error Messages**
   - Detect when media components fail
   - Provide helpful debugging information

4. **Component Feature Parity**
   - Ensure all Remotion components work in Lambda
   - Document any limitations or differences

---

*This fix is critical for production deployment. All video exports with images depend on this working correctly.*