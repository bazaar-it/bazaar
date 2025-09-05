# Streaming Scene Generation Implementation Plan

## Overview
Transform the URL-to-video pipeline from batch processing (all 5 scenes at once) to streaming processing (scenes appear one by one with real-time progress messages).

## Current vs Target Experience

### Current (Batch Processing)
```
User: "Create video from https://stripe.com"
💬 Assistant: "I'll analyze Stripe and create a video for you."
[2+ minute silence - user wonders if system crashed]
💬 Assistant: "✨ I've created 5 scenes from Stripe!"
[All 5 scenes appear at once in timeline]
```

### Target (Streaming Processing)
```
User: "Create video from https://stripe.com"
💬 Assistant: "Analyzing Stripe's website and extracting brand data..."

💬 Assistant: "Creating Scene 1/5: The Problem - Complex payments..." ✅
   [Scene 1 appears in timeline immediately]

💬 Assistant: "Creating Scene 2/5: The Discovery - Stripe's API..." ✅  
   [Scene 2 appears in timeline immediately]

💬 Assistant: "Creating Scene 3/5: The Transformation - Integration..." ✅
   [Scene 3 appears in timeline immediately]

💬 Assistant: "Creating Scene 4/5: The Triumph - Scale globally..." ✅
   [Scene 4 appears in timeline immediately]

💬 Assistant: "Creating Scene 5/5: The Invitation - Start building..." ✅
   [Scene 5 appears in timeline immediately]

💬 Assistant: "✨ Complete! Generated 5 branded scenes using Stripe's colors (#635BFF) and messaging."
```

## Implementation Steps

### Step 1: Enhance TemplateCustomizerAI Class
**File**: `/src/server/services/website/template-customizer-ai.ts`
**Estimated Time**: 1 hour
**Complexity**: Low

Add streaming method to existing class:

```typescript
// Add to TemplateCustomizerAI class
async customizeTemplatesStreaming(
  input: TemplateCustomizationInput,
  onSceneComplete?: (scene: CustomizedScene, index: number) => Promise<void>
): Promise<CustomizedScene[]> {
  console.log('🤖 [AI CUSTOMIZER] Starting streaming customization');
  
  const customizedScenes: CustomizedScene[] = [];
  
  for (let i = 0; i < input.templates.length; i++) {
    const template = input.templates[i];
    const narrativeScene = input.narrativeScenes[i];
    
    if (!template || !narrativeScene) {
      console.warn(`🤖 [AI CUSTOMIZER] Missing template or narrative scene at index ${i}`);
      continue;
    }
    
    console.log(`🤖 [AI CUSTOMIZER] Processing scene ${i + 1}/${input.templates.length}: ${narrativeScene.title}`);
    
    // Generate the scene (existing AI logic)
    const customizedCode = await this.customizeWithAI(
      template.templateCode,
      input.brandStyle,
      input.websiteData,
      narrativeScene,
      template
    );
    
    const scene: CustomizedScene = {
      name: narrativeScene.title,
      code: customizedCode,
      duration: narrativeScene.duration
    };
    
    customizedScenes.push(scene);
    
    // ✨ NEW: Stream callback - save scene immediately
    if (onSceneComplete) {
      await onSceneComplete(scene, i);
    }
  }
  
  return customizedScenes;
}
```

**Changes Required:**
- Add new method `customizeTemplatesStreaming()`
- Keep existing `customizeTemplates()` method for backward compatibility
- Add optional callback parameter for streaming updates

### Step 2: Update WebsiteToVideoHandler for Streaming
**File**: `/src/tools/website/websiteToVideoHandler.ts`
**Estimated Time**: 2 hours
**Complexity**: Medium

Modify the execute method to support streaming callbacks:

```typescript
export interface WebsiteToVideoInput {
  userPrompt: string;
  projectId: string;
  userId: string;
  websiteUrl: string;
  style?: 'minimal' | 'dynamic' | 'bold';
  duration?: number;
  webContext?: any;
  // ✨ NEW: Add streaming callback
  streamingCallback?: (event: StreamingEvent) => Promise<void>;
}

export interface StreamingEvent {
  type: 'scene_completed' | 'all_scenes_complete';
  data: {
    sceneIndex: number;
    sceneName: string;
    totalScenes: number;
    sceneId?: string;
    projectId: string;
  };
}

export class WebsiteToVideoHandler {
  static async execute(input: WebsiteToVideoInput): Promise<ToolExecutionResult> {
    // ... existing steps 1-4 (analysis, brand extraction, narrative generation, template selection) ...
    
    // 5. ✨ MODIFIED: Streaming Scene Generation with Incremental Database Saves
    console.log('🌐 [WEBSITE HANDLER] Step 5: Streaming template customization...');
    const customizer = new TemplateCustomizerAI();
    
    // Clear existing scenes BEFORE starting (safety measure)
    await db.delete(scenes).where(eq(scenes.projectId, input.projectId));
    
    // Define streaming callback for immediate database persistence
    const onSceneComplete = async (scene: CustomizedScene, index: number) => {
      console.log(`🌐 [WEBSITE HANDLER] Scene ${index + 1} completed: ${scene.name}`);
      
      // Save scene to database immediately
      const sceneId = randomUUID();
      const sceneRecord = {
        id: sceneId,
        projectId: input.projectId,
        name: scene.name,
        tsxCode: scene.code,
        duration: scene.duration,
        order: index,
        props: {},
        layoutJson: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      // Insert into database (existing pattern)
      await db.insert(scenes).values([sceneRecord]);
      
      // Send streaming update to frontend
      if (input.streamingCallback) {
        await input.streamingCallback({
          type: 'scene_completed',
          data: {
            sceneIndex: index,
            sceneName: scene.name,
            totalScenes: selectedTemplates.length,
            sceneId,
            projectId: input.projectId
          }
        });
      }
    };
    
    // Use streaming customization instead of batch
    const allScenes = await customizer.customizeTemplatesStreaming({
      templates: selectedTemplates,
      brandStyle,
      websiteData,
      narrativeScenes: adjustedScenes,
    }, onSceneComplete);
    
    // Final completion event
    if (input.streamingCallback) {
      await input.streamingCallback({
        type: 'all_scenes_complete',
        data: {
          sceneIndex: allScenes.length - 1,
          sceneName: 'Generation Complete',
          totalScenes: allScenes.length,
          projectId: input.projectId
        }
      });
    }
    
    // ... existing return logic ...
  }
}
```

**Changes Required:**
- Add `StreamingEvent` interface and `streamingCallback` to input
- Replace batch `customizeTemplates()` with streaming `customizeTemplatesStreaming()`
- Move scene database insertion inside the callback (incremental saves)
- Remove the batch database insertion at the end
- Add completion event emission

### Step 3: Enhance SSE Route for Website Pipeline
**File**: `/src/app/api/generate-stream/route.ts`
**Estimated Time**: 2 hours
**Complexity**: Medium

Add website URL parameter support and streaming event handling:

```typescript
export async function GET(request: NextRequest) {
  // ... existing auth and setup ...
  
  // Parse query params (add websiteUrl)
  const searchParams = request.nextUrl.searchParams;
  const projectId = searchParams.get('projectId');
  const userMessage = searchParams.get('message');
  const imageUrls = searchParams.get('imageUrls');
  const videoUrls = searchParams.get('videoUrls');
  const audioUrls = searchParams.get('audioUrls');
  const modelOverride = searchParams.get('modelOverride');
  const useGitHub = searchParams.get('useGitHub') === 'true';
  const websiteUrl = searchParams.get('websiteUrl'); // ✨ NEW
  
  // ... existing setup ...
  
  // Start the async work
  (async () => {
    try {
      // ... existing user message creation ...
      
      // ✨ NEW: Check if this is a website-to-video request
      if (websiteUrl) {
        console.log('[SSE] Website-to-video pipeline detected:', websiteUrl);
        
        // Send initial analysis message
        await writer.write(encoder.encode(formatSSE({
          type: 'assistant_message_chunk',
          message: `Analyzing ${new URL(websiteUrl).hostname} and extracting brand data...`,
          isComplete: false
        })));
        
        // Setup streaming callback for real-time updates
        let assistantMessageContent = `Analyzing ${new URL(websiteUrl).hostname} and extracting brand data...`;
        
        const streamingCallback = async (event: StreamingEvent) => {
          console.log('[SSE] Streaming event:', event.type);
          
          if (event.type === 'scene_completed') {
            // Send scene progress message
            const progressMessage = `Creating Scene ${event.data.sceneIndex + 1}/${event.data.totalScenes}: ${event.data.sceneName}...`;
            assistantMessageContent += `\n\n${progressMessage} ✅`;
            
            await writer.write(encoder.encode(formatSSE({
              type: 'assistant_message_chunk',
              message: progressMessage,
              isComplete: false
            })));
            
            // Send scene addition event for immediate timeline update
            await writer.write(encoder.encode(formatSSE({
              type: 'scene_added',
              data: {
                sceneId: event.data.sceneId,
                sceneName: event.data.sceneName,
                progress: Math.round(((event.data.sceneIndex + 1) / event.data.totalScenes) * 100)
              }
            })));
          }
          
          if (event.type === 'all_scenes_complete') {
            // Send final completion message
            const completionMessage = `\n\n✨ Complete! Generated ${event.data.totalScenes} branded scenes using real website data.`;
            assistantMessageContent += completionMessage;
            
            await writer.write(encoder.encode(formatSSE({
              type: 'assistant_message_chunk', 
              message: completionMessage,
              isComplete: true
            })));
          }
        };
        
        // Execute website pipeline with streaming
        const result = await WebsiteToVideoHandler.execute({
          userPrompt: userMessage,
          projectId,
          userId,
          websiteUrl,
          streamingCallback
        });
        
        if (result.success) {
          console.log('[SSE] Website pipeline completed successfully');
        } else {
          throw new Error(result.error?.message || 'Website pipeline failed');
        }
        
      } else {
        // ... existing regular generation logic ...
      }
      
    } catch (error) {
      // ... existing error handling ...
    } finally {
      await writer.close();
    }
  })();
  
  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache', 
      'Connection': 'keep-alive',
    },
  });
}
```

**Changes Required:**
- Add `websiteUrl` parameter parsing
- Add website pipeline detection logic
- Implement streaming callback for progress messages
- Add scene completion event emission
- Integrate with existing SSE message flow

### Step 4: Update Frontend Hook for Scene Streaming
**File**: `/src/hooks/use-sse-generation.ts`
**Estimated Time**: 1 hour
**Complexity**: Low

Add scene streaming support to existing hook:

```typescript
export function useSSEGeneration({ projectId, onMessageCreated, onComplete, onError }: UseSSEGenerationOptions) {
  // ... existing code ...
  
  const generate = useCallback(async (
    userMessage: string,
    imageUrls?: string[],
    videoUrls?: string[],
    audioUrls?: string[],
    modelOverride?: string,
    useGitHub?: boolean,
    websiteUrl?: string // ✨ NEW parameter
  ) => {
    // ... existing setup ...
    
    // Build URL with params (add websiteUrl)
    const params = new URLSearchParams({
      projectId,
      message: userMessage,
    });
    
    // ... existing parameter handling ...
    
    // ✨ NEW: Add website URL parameter
    if (websiteUrl) {
      params.append('websiteUrl', websiteUrl);
    }
    
    // ... existing EventSource setup ...
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        switch (data.type) {
          // ... existing cases ...
          
          // ✨ NEW: Handle scene addition events
          case 'scene_added':
            console.log(`Scene ${data.data.progress}% complete:`, data.data.sceneName);
            
            // Trigger immediate video state refresh
            utils.scenes.getByProject.invalidate({ projectId });
            
            // Optional: Show progress notification
            // toast.success(`Scene added: ${data.data.sceneName}`);
            break;
            
          // ... existing cases ...
        }
      } catch (error) {
        console.error('SSE parsing error:', error);
      }
    };
  });
  
  return { generate };
}
```

**Changes Required:**
- Add `websiteUrl` parameter to generate function
- Add `websiteUrl` to URLSearchParams
- Add `scene_added` event case for immediate timeline updates
- Trigger query invalidation for real-time UI updates

### Step 5: Update Chat Component Integration
**File**: `/src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx`
**Estimated Time**: 30 minutes
**Complexity**: Low

Extract website URL from user messages and pass to SSE hook:

```typescript
// In ChatPanelG.tsx - enhance handleSendMessage
const handleSendMessage = async (content: string, media?: MediaFiles) => {
  // ... existing logic ...
  
  // ✨ NEW: Detect website URL in message
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = content.match(urlRegex);
  const websiteUrl = urls?.find(url => 
    !url.includes('youtube.com') && 
    !url.includes('youtu.be')
  );
  
  // Start SSE generation with website URL
  await generateWithSSE(
    projectId,
    content,
    {
      imageUrls: media?.images?.map(img => img.url),
      videoUrls: media?.videos?.map(vid => vid.url),
      audioUrls: media?.audios?.map(aud => aud.url),
      modelOverride,
      useGitHub,
      websiteUrl // ✨ NEW: Pass website URL for streaming
    }
  );
};
```

**Changes Required:**
- Add URL detection logic
- Pass websiteUrl to generateWithSSE function
- Filter out YouTube URLs (handled by different tool)

## Testing Strategy

### Unit Tests
1. **TemplateCustomizerAI.customizeTemplatesStreaming()**
   - Test callback execution for each scene
   - Test scene generation without callback (backward compatibility)
   - Test error handling during streaming

2. **WebsiteToVideoHandler streaming**
   - Test incremental database saves
   - Test streaming event emission
   - Test fallback behavior when streaming fails

### Integration Tests
1. **SSE Route with websiteUrl**
   - Test complete streaming flow from URL detection to scene completion
   - Test message sequencing and formatting
   - Test error handling and graceful degradation

2. **Frontend Hook Integration**
   - Test EventSource connection with websiteUrl parameter
   - Test scene_added event handling
   - Test timeline refresh behavior

### Manual Testing Scenarios
1. **Happy Path**: `"Create video from https://stripe.com"`
   - Verify 5 progress messages appear in real-time
   - Verify scenes appear in timeline incrementally
   - Verify final completion message

2. **Error Handling**: Invalid URL or network failure
   - Verify graceful degradation to fallback data
   - Verify appropriate error messages to user

3. **Performance**: Large website with complex extraction
   - Verify streaming doesn't block UI
   - Verify memory usage remains reasonable

## Risk Mitigation

### Backward Compatibility
- Keep existing `customizeTemplates()` method unchanged
- New streaming method is additive, not replacing existing logic
- Fallback behavior if streaming callback fails

### Database Safety
- Use existing transaction-safe insertion patterns
- Clear existing scenes before starting (prevents partial state)
- Each scene insertion is isolated (failure doesn't affect others)

### Error Handling
- Wrap streaming callbacks in try-catch blocks
- Log streaming errors without breaking generation flow
- Fallback to batch processing if streaming fails

### Performance Considerations
- Incremental database saves spread load over time
- Each SSE event is small and fast
- No additional memory overhead (same processing, different timing)

## Success Metrics

### User Experience
- **Perceived Speed**: Users see first scene within 30 seconds (vs 2+ minutes currently)
- **Engagement**: Users don't leave during generation process
- **Clarity**: Users understand system is working through progress messages

### Technical Performance
- **Database Load**: Spread evenly over generation time instead of single bulk insert
- **Memory Usage**: Lower peak memory usage
- **Error Rate**: No increase in generation failures

### Business Impact
- **User Satisfaction**: Real-time feedback improves perceived performance
- **System Reliability**: Incremental saves provide better error recovery
- **Competitive Advantage**: Streaming UX differentiates from competitors

## Rollback Plan

If streaming implementation causes issues:

1. **Quick Rollback**: Comment out streaming callback in WebsiteToVideoHandler
2. **Feature Toggle**: Add environment variable to enable/disable streaming
3. **Graceful Degradation**: System falls back to existing batch processing
4. **Data Safety**: No database schema changes, easy to revert

## Timeline

- **Day 1**: Implement TemplateCustomizerAI streaming method (1 hour)
- **Day 1**: Update WebsiteToVideoHandler for streaming (2 hours)
- **Day 2**: Enhance SSE route for website pipeline (2 hours)  
- **Day 2**: Update frontend hook and chat integration (1.5 hours)
- **Day 3**: Testing and refinement (4 hours)

**Total Estimated Time: 10.5 hours over 3 days**

## Implementation Priority

1. **High Priority**: Core streaming logic (Steps 1-3)
2. **Medium Priority**: Frontend integration (Steps 4-5)
3. **Low Priority**: Advanced progress indicators and notifications

This implementation plan leverages existing architecture patterns and requires minimal changes to achieve significant UX improvements.