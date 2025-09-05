# Quick Implementation Guide - Streaming Scene Generation

## TL;DR - What We're Building

Transform this experience:
```
❌ Old: 2+ minute silence → "Here are 5 scenes!" (all at once)
✅ New: Live progress → Scenes appear one by one with messages
```

## 5 Files to Modify (Total: ~6 hours)

### 1. TemplateCustomizerAI - Add Streaming Method
**File**: `src/server/services/website/template-customizer-ai.ts`
**Time**: 1 hour

```typescript
// Add this method to existing class
async customizeTemplatesStreaming(
  input: TemplateCustomizationInput,
  onSceneComplete?: (scene: CustomizedScene, index: number) => Promise<void>
): Promise<CustomizedScene[]> {
  const customizedScenes: CustomizedScene[] = [];
  
  for (let i = 0; i < input.templates.length; i++) {
    // ... existing scene generation logic ...
    
    customizedScenes.push(scene);
    
    // ✨ NEW: Stream callback
    if (onSceneComplete) {
      await onSceneComplete(scene, i);
    }
  }
  
  return customizedScenes;
}
```

### 2. WebsiteToVideoHandler - Replace Batch with Streaming
**File**: `src/tools/website/websiteToVideoHandler.ts`  
**Time**: 2 hours

```typescript
// Add streaming callback to input interface
export interface WebsiteToVideoInput {
  // ... existing properties ...
  streamingCallback?: (event: StreamingEvent) => Promise<void>;
}

// In execute method, replace this:
const customizedScenes = await customizer.customizeTemplates(input);
await db.insert(scenes).values(scenesToInsert); // Batch insert

// With this:
const onSceneComplete = async (scene: CustomizedScene, index: number) => {
  const sceneId = randomUUID();
  await db.insert(scenes).values([{...scene, id: sceneId}]); // Individual insert
  input.streamingCallback?.({
    type: 'scene_completed',
    data: { sceneIndex: index, sceneName: scene.name, sceneId, ... }
  });
};

const customizedScenes = await customizer.customizeTemplatesStreaming(input, onSceneComplete);
```

### 3. SSE Route - Add Website Pipeline Support
**File**: `src/app/api/generate-stream/route.ts`
**Time**: 2 hours

```typescript
// Add websiteUrl parameter parsing
const websiteUrl = searchParams.get('websiteUrl');

// Add website pipeline detection
if (websiteUrl) {
  await writer.write(encoder.encode(formatSSE({
    type: 'assistant_message_chunk',
    message: `Analyzing ${new URL(websiteUrl).hostname}...`,
  })));
  
  const streamingCallback = async (event: StreamingEvent) => {
    if (event.type === 'scene_completed') {
      await writer.write(encoder.encode(formatSSE({
        type: 'assistant_message_chunk',
        message: `Creating Scene ${event.data.sceneIndex + 1}/5: ${event.data.sceneName}... ✅`,
      })));
      
      await writer.write(encoder.encode(formatSSE({
        type: 'scene_added',
        data: event.data
      })));
    }
  };
  
  await WebsiteToVideoHandler.execute({...input, streamingCallback});
}
```

### 4. Frontend Hook - Add Scene Streaming Events
**File**: `src/hooks/use-sse-generation.ts`
**Time**: 30 minutes

```typescript
// Add websiteUrl parameter
const generate = useCallback(async (
  userMessage: string,
  // ... existing params ...
  websiteUrl?: string
) => {
  // Add to URLSearchParams
  if (websiteUrl) {
    params.append('websiteUrl', websiteUrl);
  }
  
  // Add event handler
  eventSource.onmessage = (event) => {
    const data = JSON.parse(event.data);
    
    switch (data.type) {
      // ... existing cases ...
      case 'scene_added':
        // Trigger timeline refresh
        utils.scenes.getByProject.invalidate({ projectId });
        break;
    }
  };
});
```

### 5. Chat Component - Extract Website URLs
**File**: `src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx`
**Time**: 30 minutes  

```typescript
const handleSendMessage = async (content: string, media?: MediaFiles) => {
  // Extract website URL
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = content.match(urlRegex);
  const websiteUrl = urls?.find(url => 
    !url.includes('youtube.com') && !url.includes('youtu.be')
  );
  
  // Pass to SSE generation
  await generateWithSSE(projectId, content, {
    // ... existing params ...
    websiteUrl
  });
};
```

## Testing Checklist

### Quick Manual Test
1. Type: `"Create video from https://stripe.com"`
2. Watch for messages appearing every ~20 seconds:
   - "Analyzing stripe.com..."
   - "Creating Scene 1/5: The Problem..." ✅
   - "Creating Scene 2/5: The Discovery..." ✅
   - etc.
3. Verify scenes appear in timeline immediately (not all at once)

### Integration Test
```bash
# Test the streaming endpoint directly
curl -N "http://localhost:3000/api/generate-stream?projectId=test&message=test&websiteUrl=https://stripe.com"
```

## Common Issues & Fixes

### Issue: Scenes Don't Stream
**Fix**: Check `onSceneComplete` callback is being called in `customizeTemplatesStreaming`

### Issue: Database Errors
**Fix**: Ensure `randomUUID()` import and scene schema matches

### Issue: Frontend Not Updating
**Fix**: Verify `scene_added` event case in `useSSEGeneration` hook

### Issue: Messages Out of Order
**Fix**: Use `formatSSE()` helper for proper event formatting

## Success Verification

✅ **User sees progress messages every ~20 seconds**  
✅ **Scenes appear in timeline one by one (not batch)**  
✅ **No silent periods longer than 30 seconds**  
✅ **Final "Complete!" message appears**  
✅ **Existing non-website generation still works**

## Rollback Strategy

If something breaks, comment out these lines:
```typescript
// In WebsiteToVideoHandler.ts
// const customizedScenes = await customizer.customizeTemplatesStreaming(input, onSceneComplete);
const customizedScenes = await customizer.customizeTemplates(input); // Fallback to batch
```

System reverts to original batch processing behavior.

## Time Estimate

- **Experienced Developer**: 4-6 hours
- **Junior Developer**: 6-8 hours  
- **Testing & Refinement**: 2-4 hours

**Total**: 6-12 hours for complete implementation and testing.