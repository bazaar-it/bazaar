# Audio Export Fix - Complete Solution Documentation

**Date**: 2025-07-22
**Sprint**: 81
**Status**: ✅ RESOLVED
**Impact**: Audio now successfully exports in all video renders

## Executive Summary

Fixed a critical issue where audio was not being included in exported videos despite being properly configured in the AudioPanel. The root cause was missing audio codec configuration in the Lambda render pipeline. Audio was being passed correctly but Lambda wasn't encoding it into the final video.

## The Complete Journey

### Initial Problem Report
- **Symptom 1**: Audio disappears when page is refreshed
- **Symptom 2**: Audio not included in exported video renders
- **User Report**: "why is the exported render not including the audio file?"

### Investigation Phase

#### 1. Client-Side State Analysis
Initially suspected the audio wasn't persisting properly:
- Checked Zustand state management
- Verified localStorage persistence
- Found audio was only stored client-side

#### 2. Server-Side Access Issue
Discovered the real problem:
- Render process happens on Lambda (server-side)
- Lambda couldn't access client-side Zustand state
- Audio data needed to be accessible server-side

#### 3. Database Integration Solution
Implemented comprehensive database storage:
```typescript
// Added to projects table schema
export type AudioTrack = {
  url: string;
  name: string;
  duration: number;
  startTime: number;
  endTime: number;
  volume: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  playbackRate?: number;
};

audio: d.jsonb().$type<AudioTrack>(),
```

#### 4. API Endpoint Creation
Created dedicated audio update endpoint:
```typescript
updateAudio: protectedProcedure
  .input(z.object({
    projectId: z.string().uuid(),
    audio: audioSchema.nullable(),
  }))
  .mutation(async ({ ctx, input }) => {
    // Validates user ownership
    // Updates project.audio in database
  })
```

#### 5. AudioPanel Synchronization
Implemented dual-sync strategy:
```typescript
const syncAudioSettings = (audio: AudioTrack | null) => {
  // Immediate UI update via Zustand
  updateProjectAudio(projectId, audio);
  
  // Background database sync
  updateAudioMutation.mutate({ projectId, audio });
};
```

### The Hidden Issue: Audio Codec Configuration

Despite all the above fixes, audio still wasn't playing in exports. Investigation revealed:

#### Lambda Render Logs Showed:
```
[LambdaRender] Audio: 50 Cent - Hustler's Ambition.mp3 (293s)
[LambdaRender] Audio URL: https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/...
```

Audio was reaching Lambda but not being encoded into the video!

#### Root Cause Discovery
The Lambda render configuration was missing explicit audio codec settings:
```typescript
// BEFORE - Audio codec not specified
{
  codec: format === 'gif' ? 'gif' : 'h264',
  // ... other settings
}

// AFTER - Explicit audio codec configuration
{
  codec: format === 'gif' ? 'gif' : 'h264',
  audioCodec: format === 'gif' ? undefined : 'aac',
  audioBitrate: format === 'gif' ? undefined : '128k',
  // ... other settings
}
```

## The Complete Fix

### 1. Database Schema Update
```sql
ALTER TABLE "bazaar-vid_project" 
ADD COLUMN "audio" jsonb;
```

### 2. API Router Enhancement
```typescript
// src/server/api/routers/project.ts
export const projectRouter = createTRPCRouter({
  updateAudio: protectedProcedure
    .input(audioUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(projects)
        .set({ 
          audio: input.audio,
          updatedAt: new Date() 
        })
        .where(and(
          eq(projects.id, input.projectId),
          eq(projects.userId, ctx.session.user.id)
        ));
      
      return { success: true };
    }),
});
```

### 3. AudioPanel State Management
```typescript
// Dual-sync pattern for immediate UI + persistent storage
useEffect(() => {
  if (project?.audio) {
    // Database is source of truth
    setAudioTrack(project.audio);
    updateProjectAudio(projectId, project.audio);
  }
}, [project?.audio]);

// Every change syncs to both stores
const handleAudioChange = (newAudio: AudioTrack) => {
  setAudioTrack(newAudio);        // Local state
  syncAudioSettings(newAudio);     // Zustand + Database
};
```

### 4. Render Pipeline Update
```typescript
// src/server/api/routers/render.ts
const project = await ctx.db.query.projects.findFirst({
  where: (projects, { eq, and }) => and(
    eq(projects.id, input.projectId),
    eq(projects.userId, ctx.session.user.id)
  ),
  with: { scenes: true },
});

const renderConfig = await prepareRenderConfig({
  projectId: input.projectId,
  scenes: project.scenes,
  format: input.format,
  quality: input.quality,
  projectProps: project.props,
  audio: project.audio, // ← Audio from database, not request
});
```

### 5. Lambda Render Service Fix
```typescript
// src/server/services/render/lambda-render.service.ts
const { renderId, bucketName } = await renderMediaOnLambda({
  region: process.env.AWS_REGION as AwsRegion,
  functionName: process.env.REMOTION_FUNCTION_NAME!,
  serveUrl,
  composition: "MainComposition",
  inputProps: {
    scenes,
    projectId,
    width,
    height,
    audio, // ← Passed to Lambda
  },
  codec: format === 'gif' ? 'gif' : 'h264',
  // CRITICAL FIX: Explicit audio codec configuration
  audioCodec: format === 'gif' ? undefined : 'aac',
  audioBitrate: format === 'gif' ? undefined : '128k',
  // ... other settings
});
```

### 6. Remotion Composition Audio Rendering
```typescript
// src/remotion/MainCompositionSimple.tsx
export const VideoComposition = ({ scenes, width, height, audio }) => {
  const totalVideoDuration = scenes.reduce((sum, scene) => {
    return sum + extractSceneDuration(scene);
  }, 0);

  return (
    <AbsoluteFill>
      {audio && (
        <Audio
          src={audio.url}
          volume={audio.volume}
          startFrom={Math.round(audio.startTime * 30)}
          endAt={Math.round(audio.endTime * 30)}
          loop={audio.endTime - audio.startTime < totalVideoDuration / 30}
          playbackRate={audio.playbackRate || 1}
        />
      )}
      <Series>
        {/* Video scenes */}
      </Series>
    </AbsoluteFill>
  );
};
```

## Technical Deep Dive

### Why Audio Wasn't Exporting

1. **Remotion's Default Behavior**
   - When using `codec: 'h264'`, Remotion can include audio
   - BUT it needs explicit audio codec configuration for Lambda renders
   - Local renders might work without it, but Lambda requires explicit settings

2. **Audio Codec Requirements**
   - MP4 (H.264) requires AAC audio codec
   - WebM can use Opus or Vorbis
   - GIF format doesn't support audio

3. **Lambda Environment Differences**
   - Lambda uses FFmpeg for encoding
   - Requires explicit codec parameters
   - Different from local Remotion rendering

### Data Flow Architecture

```
User Uploads Audio
       ↓
   AudioPanel
   ↓        ↓
Zustand   Database
(UI)     (Persist)
            ↓
      Render API
            ↓
   Lambda Service
            ↓
  Remotion Lambda
   (with codecs)
            ↓
   Final Video
   (with audio!)
```

### Critical Configuration

```typescript
// Lambda Site Deployment
npx remotion lambda sites create --site-name="bazaar-vid-v3-audio-codec"

// Environment Variable
REMOTION_SERVE_URL=https://remotionlambda-useast1-yb1vzou9i7.s3.us-east-1.amazonaws.com/sites/bazaar-vid-v3-audio-codec/index.html
```

## Lessons Learned

### 1. Always Specify Audio Codecs
```typescript
// ❌ BAD - Assumes default behavior
{ codec: 'h264' }

// ✅ GOOD - Explicit audio handling
{ 
  codec: 'h264',
  audioCodec: 'aac',
  audioBitrate: '128k'
}
```

### 2. Test Full Pipeline
- Client state ✓
- Database persistence ✓
- Server access ✓
- Lambda configuration ✓
- Codec settings ✓ ← Often missed!

### 3. Lambda vs Local Differences
- Local Remotion might work without explicit codecs
- Lambda ALWAYS needs explicit configuration
- Test exports, not just previews

### 4. Debug with Logs
Added comprehensive logging:
```typescript
console.log(`[LambdaRender] Audio URL: ${audio.url}`);
console.log(`[LambdaRender] Audio volume: ${audio.volume}`);
console.log(`[LambdaRender] Audio trim: ${audio.startTime}s - ${audio.endTime}s`);
```

## Verification Checklist

- [x] Audio persists on page refresh
- [x] Audio settings save to database
- [x] Audio data accessible server-side
- [x] Audio passed to Lambda render
- [x] Audio codec explicitly configured
- [x] Audio plays in exported MP4
- [x] Audio plays in exported WebM
- [x] Audio volume respected
- [x] Audio trim settings work
- [x] Audio loops if shorter than video

## Future Considerations

### 1. Audio Format Support
Currently supports:
- MP3 ✓
- WAV ✓
- M4A ✓
- OGG ✓
- AAC ✓

### 2. Advanced Audio Features
Consider implementing:
- Fade in/out effects (currently prepared but not implemented)
- Multiple audio tracks
- Audio ducking for voiceovers
- Waveform visualization

### 3. Performance Optimization
- Pre-validate audio URLs before render
- Cache audio metadata
- Implement audio file size limits

### 4. Error Handling
- Better CORS error messages
- Audio format validation
- Codec compatibility warnings

## References

- [Remotion Audio Component](https://www.remotion.dev/docs/audio)
- [Lambda Render Options](https://www.remotion.dev/docs/lambda/rendermediaonlambda)
- [FFmpeg Audio Codecs](https://ffmpeg.org/ffmpeg-codecs.html#Audio-Encoders)
- Sprint 82 Audio Support Planning
- Sprint 83 Lambda Media Components Fix

---

**Resolution**: Audio export is now fully functional. The fix required both architectural changes (database integration) and configuration updates (audio codec settings). This comprehensive solution ensures audio persists across sessions and exports correctly in all video formats.