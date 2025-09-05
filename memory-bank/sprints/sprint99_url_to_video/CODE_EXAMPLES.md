# Code Examples - Streaming Scene Generation

## Complete Code Changes Required

### 1. TemplateCustomizerAI - Add Streaming Method

**File**: `src/server/services/website/template-customizer-ai.ts`

```typescript
// Add to existing TemplateCustomizerAI class (after line 56)

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
    
    // Generate the scene (reuse existing AI logic)
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

### 2. WebsiteToVideoHandler - Enable Streaming

**File**: `src/tools/website/websiteToVideoHandler.ts`

```typescript
// Update the WebsiteToVideoInput interface (around line 25)
export interface WebsiteToVideoInput {
  userPrompt: string;
  projectId: string;
  userId: string;
  websiteUrl: string;
  style?: 'minimal' | 'dynamic' | 'bold';
  duration?: number;
  webContext?: any;
  // ✨ ADD: Streaming callback
  streamingCallback?: (event: StreamingEvent) => Promise<void>;
}

// Add new interface after WebsiteToVideoInput
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

// Replace the scene generation section (around line 190-250)
// Find this existing code:
/*
const customizedScenes = await customizer.customizeTemplates({
  templates: selectedTemplates,
  brandStyle,
  websiteData,
  narrativeScenes: adjustedScenes,
});

// 6. Clear existing scenes and save new ones
console.log('🌐 [WEBSITE HANDLER] Step 6: Saving to project...');
await db.delete(scenes).where(eq(scenes.projectId, input.projectId));
const scenesToInsert = customizedScenes.map((scene, index) => ({...}));
await db.insert(scenes).values(scenesToInsert);
*/

// Replace with this streaming implementation:
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
  
  // Insert into database
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
const customizedScenes = await customizer.customizeTemplatesStreaming({
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
      sceneIndex: customizedScenes.length - 1,
      sceneName: 'Generation Complete',
      totalScenes: customizedScenes.length,
      projectId: input.projectId
    }
  });
}

// Update project metadata
await db.update(projects)
  .set({
    updatedAt: new Date(),
  })
  .where(eq(projects.id, input.projectId));

console.log('🌐 [WEBSITE HANDLER] Generation complete!');

// Get inserted scenes for return value
const insertedScenes = await db.select().from(scenes)
  .where(eq(scenes.projectId, input.projectId))
  .orderBy(asc(scenes.order));
```

### 3. SSE Route - Add Website Pipeline

**File**: `src/app/api/generate-stream/route.ts`

```typescript
// Add websiteUrl to parameter parsing (around line 47)
const websiteUrl = searchParams.get('websiteUrl');

// Import WebsiteToVideoHandler at top of file
import { WebsiteToVideoHandler } from '~/tools/website/websiteToVideoHandler';
import type { StreamingEvent } from '~/tools/website/websiteToVideoHandler';

// Replace the main async function content (around line 100)
// Add this BEFORE the existing generation logic:

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
      const domain = new URL(websiteUrl).hostname;
      const completionMessage = `\n\n✨ Complete! Generated ${event.data.totalScenes} branded scenes using ${domain}'s colors and messaging.`;
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
  // ... existing regular generation logic continues unchanged ...
```

### 4. Frontend Hook - Add Scene Streaming

**File**: `src/hooks/use-sse-generation.ts`

```typescript
// Update the generate function signature (around line 19)
const generate = useCallback(async (
  userMessage: string,
  imageUrls?: string[],
  videoUrls?: string[],
  audioUrls?: string[],
  modelOverride?: string,
  useGitHub?: boolean,
  websiteUrl?: string // ✨ ADD: website URL parameter
) => {
  // ... existing connection cleanup and params setup ...
  
  // Add websiteUrl to URLSearchParams (around line 56)
  if (websiteUrl) {
    params.append('websiteUrl', websiteUrl);
  }
  
  // ... existing EventSource setup ...
  
  // Update the onmessage handler (around line 65) - add new case:
  eventSource.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'ready':
          // ... existing ready case ...
          break;
          
        case 'assistant_message_created':
          // ... existing case ...
          break;
          
        case 'assistant_message_chunk':
          // ... existing case ...
          break;
          
        // ✨ NEW: Handle scene addition events
        case 'scene_added':
          console.log(`Scene ${data.data.progress}% complete:`, data.data.sceneName);
          
          // Trigger immediate video state refresh
          utils.scenes.getByProject.invalidate({ projectId });
          
          // Optional: Show progress notification
          // toast.success(`Scene added: ${data.data.sceneName}`);
          break;
          
        case 'generation_complete':
          // ... existing case ...
          break;
          
        // ... other existing cases ...
      }
    } catch (error) {
      console.error('SSE parsing error:', error);
    }
  };
  
  // ... rest of existing function ...
}, [projectId, addAssistantMessage, updateMessage, utils, onMessageCreated]);

// Update return to include websiteUrl parameter
return { generate };
```

### 5. Chat Component - Extract Website URLs

**File**: `src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx`

```typescript
// Find the handleSendMessage function (around line 200-300) and update it:

const handleSendMessage = async (content: string, media?: MediaFiles) => {
  if (!content.trim() && (!media?.images?.length && !media?.videos?.length && !media?.audios?.length)) {
    return;
  }

  setIsGenerating(true);
  setCurrentMessage('');
  
  try {
    // ✨ NEW: Extract website URL from message
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = content.match(urlRegex);
    const websiteUrl = urls?.find(url => 
      !url.includes('youtube.com') && 
      !url.includes('youtu.be') &&
      !url.includes('localhost') &&
      !url.includes('127.0.0.1')
    );
    
    // Start SSE generation with website URL
    await generate(
      content,
      media?.images?.map(img => img.url),
      media?.videos?.map(vid => vid.url),
      media?.audios?.map(aud => aud.url),
      modelOverride,
      useGitHub,
      websiteUrl // ✨ NEW: Pass website URL for streaming
    );

    // Clear input
    setInputValue('');
    setMedia({ images: [], videos: [], audios: [] });
    
  } catch (error) {
    console.error('Generation failed:', error);
    // ... existing error handling ...
  } finally {
    setIsGenerating(false);
  }
};
```

## Testing the Implementation

### Manual Test Script

1. **Start the dev server**: `npm run dev`

2. **Open browser to**: `http://localhost:3000/projects/[some-project-id]/generate`

3. **Type in chat**: `"Create video from https://stripe.com"`

4. **Expected behavior**:
   ```
   💬 "Analyzing stripe.com and extracting brand data..."
   [~20 seconds later]
   💬 "Creating Scene 1/5: The Problem - Complex payments..." ✅
   [Scene 1 appears in timeline]
   [~20 seconds later] 
   💬 "Creating Scene 2/5: The Discovery - Stripe's API..." ✅
   [Scene 2 appears in timeline]
   [Continue for all 5 scenes...]
   💬 "✨ Complete! Generated 5 branded scenes using Stripe's colors and messaging."
   ```

### Debug Console Logs

Look for these console messages:
```
🤖 [AI CUSTOMIZER] Starting streaming customization
🤖 [AI CUSTOMIZER] Processing scene 1/5: The Problem
🌐 [WEBSITE HANDLER] Scene 1 completed: The Problem
[SSE] Streaming event: scene_completed
[SSE] Website pipeline completed successfully
```

### Quick Test API Endpoint

```bash
# Test streaming directly
curl -N "http://localhost:3000/api/generate-stream?projectId=test-id&message=test&websiteUrl=https://stripe.com"
```

Should return Server-Sent Events with scene progress messages.

## Rollback Commands

If you need to quickly disable streaming:

```typescript
// In WebsiteToVideoHandler.ts, replace streaming line with:
const customizedScenes = await customizer.customizeTemplates({
  templates: selectedTemplates,
  brandStyle,
  websiteData,
  narrativeScenes: adjustedScenes,
});
// And restore the original batch database insertion
```

This reverts to the original batch processing behavior while keeping all new code intact.