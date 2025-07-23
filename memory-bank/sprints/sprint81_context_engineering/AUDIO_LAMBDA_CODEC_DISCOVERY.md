# Critical Discovery: Lambda Audio Codec Configuration

**Date**: 2025-07-22
**Sprint**: 81
**Severity**: HIGH
**Impact**: All Lambda video exports missing audio

## The Hidden Bug

### What We Thought Was The Problem
1. Audio not persisting (client-side state issue)
2. Server couldn't access audio (needed database storage)
3. Audio not being passed to Lambda (data flow issue)

### What Was Actually The Problem
**Lambda requires explicit audio codec configuration!**

## The Fix That Made It Work

```typescript
// ❌ BEFORE - No audio in exports
const { renderId, bucketName } = await renderMediaOnLambda({
  // ... other config
  codec: format === 'gif' ? 'gif' : 'h264',
  imageFormat: format === 'gif' ? 'png' : 'jpeg',
  jpegQuality: settings.jpegQuality,
  crf: format === 'gif' ? undefined : settings.crf,
  privacy: "public",
  // ... rest of config
});

// ✅ AFTER - Audio works perfectly!
const { renderId, bucketName } = await renderMediaOnLambda({
  // ... other config
  codec: format === 'gif' ? 'gif' : 'h264',
  imageFormat: format === 'gif' ? 'png' : 'jpeg',
  jpegQuality: settings.jpegQuality,
  crf: format === 'gif' ? undefined : settings.crf,
  // CRITICAL ADDITIONS:
  audioCodec: format === 'gif' ? undefined : 'aac',
  audioBitrate: format === 'gif' ? undefined : '128k',
  privacy: "public",
  // ... rest of config
});
```

## Why This Wasn't Obvious

### 1. Remotion Documentation
- The docs show `codec: 'h264'` includes audio by default
- This is TRUE for local rendering
- But Lambda has different requirements!

### 2. Silent Failure
- No errors thrown
- No warnings in logs
- Video renders successfully (just without audio)
- Audio component renders but produces no sound

### 3. Misleading Success Indicators
- Audio data was passed correctly
- Lambda logs showed audio being received
- Remotion composition had Audio component
- Everything looked correct!

## Technical Explanation

### Local vs Lambda Rendering

**Local Remotion Rendering:**
```bash
npx remotion render MyComp out.mp4
# FFmpeg automatically includes audio with H.264
```

**Lambda Remotion Rendering:**
```typescript
renderMediaOnLambda({
  codec: 'h264',
  // Without audioCodec, FFmpeg might not include audio stream
  // Lambda environment needs explicit instructions
})
```

### Why Lambda Is Different

1. **Isolated Environment**
   - Lambda runs in a containerized environment
   - Different FFmpeg configuration
   - More explicit settings required

2. **FFmpeg Behavior**
   - Local FFmpeg might auto-detect audio streams
   - Lambda FFmpeg needs explicit codec specification
   - Security and performance optimizations

3. **Remotion's Lambda Implementation**
   - Optimized for performance
   - Doesn't make assumptions about content
   - Requires explicit configuration

## Codec Compatibility Matrix

| Video Format | Video Codec | Audio Codec | Bitrate    |
|-------------|-------------|-------------|------------|
| MP4         | h264        | aac         | 128k       |
| WebM        | vp8         | opus        | 128k       |
| WebM        | vp9         | opus        | 128k       |
| GIF         | gif         | none        | -          |
| MOV         | prores      | pcm_s16le   | 1536k      |

## Complete Working Configuration

```typescript
// For MP4 with audio
{
  codec: 'h264',
  audioCodec: 'aac',
  audioBitrate: '128k',
  imageFormat: 'jpeg',
  jpegQuality: 80,
  crf: 18,
}

// For WebM with audio
{
  codec: 'vp8',
  audioCodec: 'opus',
  audioBitrate: '128k',
  imageFormat: 'png',
}

// For high-quality MP4
{
  codec: 'h264',
  audioCodec: 'aac',
  audioBitrate: '320k',  // Higher quality
  imageFormat: 'jpeg',
  jpegQuality: 95,
  crf: 16,  // Lower = better quality
}
```

## Debug Strategies That Led to Discovery

### 1. Process of Elimination
- ✓ Audio data in database
- ✓ Audio passed to Lambda
- ✓ Audio component in composition
- ✓ Audio URL accessible
- ✗ Audio in final video

### 2. Comparison Testing
- Local render: Audio works
- Lambda render: No audio
- Conclusion: Lambda-specific issue

### 3. Configuration Deep Dive
- Reviewed all renderMediaOnLambda options
- Found audioCodec and audioBitrate parameters
- Not mentioned in basic examples!

## Lessons for Future

### 1. Always Specify Audio Settings
```typescript
// Create a standard configuration
const AUDIO_CONFIG = {
  audioCodec: 'aac',
  audioBitrate: '128k',
};

// Apply to all non-GIF renders
const renderConfig = {
  ...baseConfig,
  ...(format !== 'gif' ? AUDIO_CONFIG : {}),
};
```

### 2. Test Matrix
- [ ] Local preview with audio
- [ ] Local render with audio
- [ ] Lambda render with audio
- [ ] Different audio formats (MP3, WAV, M4A)
- [ ] Different video formats (MP4, WebM)

### 3. Enhanced Logging
```typescript
console.log('[LambdaRender] Codec config:', {
  videoCodec: codec,
  audioCodec: audioCodec || 'not specified',
  audioBitrate: audioBitrate || 'not specified',
});
```

## Prevention Checklist

When implementing video features:
1. ✅ Check local rendering
2. ✅ Check Lambda rendering
3. ✅ Verify audio/video codec compatibility
4. ✅ Test with actual media files
5. ✅ Add comprehensive logging
6. ✅ Document Lambda-specific requirements

## Related Issues This Might Solve

- "Audio cuts off in export"
- "Background music not included"
- "Voice over missing from video"
- "Audio works in preview but not export"
- "Silent video exports"

## The One-Line Fix

If anyone else encounters this issue:
```typescript
// Just add these two lines to your renderMediaOnLambda config:
audioCodec: 'aac',
audioBitrate: '128k',
```

---

**Key Takeaway**: Never assume Lambda behaves the same as local Remotion. Always explicitly configure audio settings for Lambda renders, even when using video codecs that "include audio by default."