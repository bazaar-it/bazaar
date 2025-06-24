# Video Handling Technical Notes

## Remotion Video Component Usage

### Basic Video Implementation
```typescript
const { Video } = window.Remotion;

// Full-screen background video
<Video 
  src={videoUrl} 
  style={{ 
    width: "100%", 
    height: "100%", 
    objectFit: "cover" 
  }} 
/>
```

### Important Defaults

1. **Muted by Default**: Background videos should use `volume={0}` to prevent autoplay issues
   - Located in: `/src/tools/add/add_helpers/CodeGeneratorNEW.ts` line 370
   - Reasoning: Browsers block autoplay of videos with sound

2. **No Arbitrary Duration**: Videos play for the full scene duration
   - Previous issue: Hard-coded `endAt={150}` 
   - Fixed: Let videos play naturally within scene bounds

3. **Z-Index Layering**: Videos typically serve as background
   - Video gets lower z-index
   - Text and graphics overlay with higher z-index

### Video URL Structure
Videos are stored in R2 with this pattern:
```
https://pub-[hash].r2.dev/projects/[projectId]/videos/[timestamp]-[uuid].[ext]
```

Example:
```
https://pub-f970b0ef1f2e418e8d902ba0973ff5cf.r2.dev/projects/c3f847fe-15a4-42ab-9270-4cd89690ca41/videos/1750697522324-bb0194d4-acc2-4c64-b148-46c2033ad465.MOV
```

## File Type Support

### Accepted Formats
- `video/mp4` - Most compatible
- `video/quicktime` - MOV files from iOS
- `video/webm` - Modern web format

### Size Limits
- Videos: 100MB max
- Images: 10MB max

## Data Flow

1. **Upload**: File → ImageUpload → `/api/upload` → R2 Storage
2. **Chat**: Separate `imageUrls` and `videoUrls` arrays
3. **SSE**: Pass both arrays to generation endpoint
4. **Generation**: Router → Orchestrator → Tools
5. **Validation**: Zod schemas must include `videoUrls` field
6. **Code Gen**: Special `generateCodeWithVideos` method

## Common Patterns

### Video with Text Overlay
```typescript
<AbsoluteFill>
  <Video 
    src={videoUrl} 
    style={{ 
      position: "absolute",
      width: "100%", 
      height: "100%", 
      objectFit: "cover" 
    }} 
    volume={0}
  />
  <AbsoluteFill style={{ 
    zIndex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  }}>
    <h1 style={{ fontSize: "4rem", color: "white" }}>
      {animatedText}
    </h1>
  </AbsoluteFill>
</AbsoluteFill>
```

### Video with Fade In
```typescript
const opacity = interpolate(
  frame,
  [0, 30],
  [0, 1],
  { extrapolateRight: "clamp" }
);

<Video 
  src={videoUrl} 
  style={{ 
    opacity,
    width: "100%", 
    height: "100%", 
    objectFit: "cover" 
  }} 
  volume={0}
/>
```

## Debugging Video Issues

### Check Points
1. Upload successful? Check network tab for 200 response
2. Video URL in chat logs? `[ChatPanelG] 🎥 Including videos`
3. Orchestrator receiving? `[NEW ORCHESTRATOR] hasVideos: true`
4. Tools receiving? `[ADD TOOL] Video URLs received: [...]`
5. Generated code includes Video component?

### Common Issues
1. **Videos ignored**: Zod schema missing `videoUrls` field
2. **Autoplay blocked**: Ensure `volume={0}` for background videos
3. **Black screen**: Check video format compatibility
4. **Performance**: Large videos may cause preview lag