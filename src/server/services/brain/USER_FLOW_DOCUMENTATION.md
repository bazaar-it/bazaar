# Complete User Flow Documentation - 6 Scenarios

## Overview
This document traces the complete flow of 6 different user interactions within a single session, showing exactly what happens at each layer of the system.

## Initial State
- User has project `proj_123` open
- Project is empty (no scenes yet)
- VideoState (Zustand) is initialized with empty scenes array
- Brain context cache is empty
- Database has project record but no scenes

---

## Scenario 1: Add First Scene
**User types:** "Create a welcome screen with animated text saying Hello World"

### 1. Client Layer (ChatPanelG.tsx)
```typescript
// User hits enter → handleSubmit() called
1. addUserMessage(projectId, "Create a welcome screen...", [])
   → VideoState immediately shows user message in chat
   → Timestamp: T+0ms

2. addAssistantMessage(projectId, assistantId, "🧠 Processing...")
   → VideoState shows loading message
   → Timestamp: T+10ms

3. generateSceneMutation.mutateAsync({
     projectId: "proj_123",
     userMessage: "Create a welcome screen...",
     userContext: { imageUrls: [] }
   })
   → tRPC call initiated
   → Timestamp: T+20ms
```

### 2. Server Layer (generation.simplified.ts)
```typescript
// tRPC endpoint receives request
1. Verify project ownership
   → Database query: SELECT * FROM projects WHERE id = 'proj_123'
   → Timestamp: T+50ms

2. Store user message
   → INSERT INTO messages (projectId, content, role) 
   → Database write
   → Timestamp: T+80ms

3. Call Brain Orchestrator
   → brainOrchestrator.orchestrate({
       prompt: "Create a welcome screen...",
       projectId: "proj_123",
       userId: "user_456"
     })
   → Timestamp: T+100ms
```

### 3. Brain Layer (orchestrator.simplified.ts)
```typescript
// Brain makes decision
1. Context Building (contextBuilder.ts)
   → Cache miss - builds fresh context
   → Database queries:
     - SELECT * FROM scenes WHERE projectId = 'proj_123' → 0 scenes
     - SELECT * FROM messages WHERE projectId = 'proj_123' LIMIT 10
   → Builds ProjectContext: {
       scenes: [],
       chatHistory: [{role: 'user', content: '...'}],
       preferences: {style: 'modern', animationSpeed: 'normal'}
     }
   → Caches context with 5min TTL
   → Timestamp: T+150ms

2. Intent Analysis (intentAnalyzer.ts)
   → Quick detect: No match
   → AI Analysis via GPT-4o-mini:
     System: "Analyze user intent..."
     User: "User request: 'Create a welcome screen...'"
   → Response: {
       type: 'create',
       confidence: 0.95,
       reasoning: "User wants new scene, no existing scenes"
     }
   → Timestamp: T+400ms

3. Tool Selection (toolSelector.ts)
   → Input: intent.type = 'create'
   → Output: tool = 'addScene'
   → Timestamp: T+410ms

4. Context Preparation (contextPreparer.ts)
   → Prepares AddSceneContext: {
       tool: 'addScene',
       projectId: 'proj_123',
       prompt: 'Create a welcome screen with animated text saying Hello World',
       previousSceneJson: null,
       storyboardContext: [],
       userPreferences: {style: 'modern'}
     }
   → Timestamp: T+420ms

5. Return BrainDecision: {
     tool: 'addScene',
     reasoning: 'Creating the first scene for your video',
     context: {...},
     confidence: 0.95
   }
```

### 4. Tool Execution (back in generation.ts)
```typescript
// Execute chosen tool
1. sceneService.addScene({
     projectId: 'proj_123',
     prompt: 'Create a welcome screen...',
     imageUrls: undefined,
     previousSceneJson: null
   })
   → Timestamp: T+450ms
```

### 5. Scene Service Layer (scene.service.ts)
```typescript
// SceneService coordinates creation
1. Route to LayoutGenerator
   → generateLayout("Create a welcome screen...")
   → AI call to GPT-4o-mini with layout prompt
   → Returns: {
       sceneType: "text-animation",
       elements: [{type: "text", content: "Hello World"}],
       animations: ["fadeIn", "bounce"]
     }
   → Timestamp: T+800ms

2. Route to CodeGenerator  
   → generateCode(layoutJson, "Create a welcome screen...")
   → AI call to Claude-3.5-sonnet with code generation prompt
   → Returns: {
       tsxCode: "export default function Scene1_abc() {...}",
       name: "Scene1_abc",
       duration: 180
     }
   → Timestamp: T+1200ms

3. Save to Database
   → INSERT INTO scenes (id, projectId, name, tsxCode, duration, order)
   → Scene ID: 'scene_001'
   → Timestamp: T+1250ms

4. Upload to R2 Storage
   → PUT to Cloudflare R2: /components/scene_001.js
   → Timestamp: T+1400ms

5. Return StandardApiResponse: {
     success: true,
     operation: 'create',
     data: {
       scene: {id: 'scene_001', name: 'Scene1_abc', ...}
     },
     metadata: {
       timestamp: 1234567890,
       affectedIds: ['scene_001'],
       chatResponse: 'Created welcome screen with animated Hello World!'
     }
   }
```

### 6. Response Handling (generation.ts)
```typescript
1. Store assistant response
   → INSERT INTO messages (content: 'Created welcome screen...')
   → Timestamp: T+1450ms

2. Return to client with enhanced metadata
```

### 7. Client Update (ChatPanelG.tsx)
```typescript
// Handle mutation response
1. updateMessage(projectId, assistantId, {
     content: 'Created welcome screen with animated Hello World!',
     status: 'success'
   })
   → VideoState updates assistant message
   → Timestamp: T+1500ms

2. updateScene(projectId, 'scene_001', transformedScene)
   → VideoState adds new scene to props.scenes array
   → Triggers re-render in ALL panels:
     - PreviewPanelG: Shows new scene
     - CodePanelG: Shows generated code
     - TimelinePanelG: Shows scene block
   → Timestamp: T+1510ms
```

### State Changes Summary
- **Database**: Added 1 scene, 2 messages
- **VideoState**: scenes array [scene_001], chat has 2 messages
- **Brain Cache**: Context cached for 5 minutes
- **R2 Storage**: Component uploaded
- **Total Time**: ~1.5 seconds

---

## Scenario 2: Edit Scene (Surgical)
**User types:** "Change the text color to blue"

### 1. Client Layer
```typescript
1. VideoState already has scene_001 loaded
2. addUserMessage() → Instant UI update
3. Call generateSceneMutation with selectedSceneId: 'scene_001'
```

### 2. Brain Layer
```typescript
1. Context Building
   → Cache HIT! Uses cached context (saved 50ms)
   → Incremental update: Adds latest message
   → Context now has: 1 scene, 3 messages

2. Intent Analysis
   → Quick detect: No match for duration
   → AI Analysis: {
       type: 'edit',
       editType: 'surgical',
       targetSceneId: 'scene_001',
       specificChange: 'Change text color to blue',
       confidence: 0.98
     }

3. Context Preparation
   → Loads scene code from DB (cache miss)
   → SELECT tsxCode FROM scenes WHERE id = 'scene_001'
   → Prepares minimal surgical context
```

### 3. Tool Execution
```typescript
sceneService.editScene({
  sceneId: 'scene_001',
  prompt: 'Change text color to blue',
  editType: 'surgical'
})
```

### 4. Scene Service - Surgical Editor
```typescript
1. Routes to SurgicalEditor
   → Analyzes existing code
   → Makes minimal change: color: "#000" → color: "#0000FF"
   → Preserves ALL animations, layout, timing

2. Updates database
   → UPDATE scenes SET tsxCode = '...', updatedAt = NOW()

3. Uploads to R2 (overwrites)

4. Returns success with changes: ['Changed text color to blue']
```

### State Changes
- **Database**: Scene updated, 2 new messages
- **VideoState**: Scene code updated, preview refreshes instantly
- **Brain Cache**: Still valid, context enriched
- **Total Time**: ~800ms (faster due to cache)

---

## Scenario 3: Add Second Scene
**User types:** "Add a new scene showing our product features"

### 1. Brain Analysis
```typescript
1. Context has 1 scene now
2. Intent: type = 'create' (keywords: "add", "new scene")
3. Tool: 'addScene'
4. Context includes previousSceneJson from Scene1
```

### 2. Scene Creation
```typescript
1. LayoutGenerator uses previous scene for style consistency
2. CodeGenerator creates Scene2_def
3. Database: INSERT with order = 1
4. Scene starts at: scene1.start + scene1.duration
```

### State Changes
- **VideoState**: scenes array now [scene_001, scene_002]
- **Timeline**: Shows 2 blocks
- **Total Duration**: 360 frames (12 seconds)

---

## Scenario 4: Edit Scene with Image
**User types:** "Make the background look like this" + uploads gradient.jpg

### 1. Client Layer
```typescript
1. Image upload handled
   → POST to /api/upload → Returns URL
   → uploadedImages state: [{url: 'https://r2.../gradient.jpg'}]

2. generateSceneMutation.mutateAsync({
     userContext: {
       imageUrls: ['https://r2.../gradient.jpg'],
       selectedSceneId: 'scene_002'
     }
   })
```

### 2. Brain Layer
```typescript
1. Intent Analysis detects image context
   → type: 'edit', editType: 'creative'
   → AI also analyzes user intent with image context

2. Context includes imageUrls for tool
```

### 3. Creative Editor with Image
```typescript
1. Analyzes image via Vision API
   → Extracts: gradient colors, style, mood

2. Updates scene code to match image aesthetic
   → Changes background gradient
   → Adjusts text colors for contrast
   → Preserves animations but enhances visual style
```

### State Changes
- **Scene visually transformed while keeping functionality**
- **Image URL stored in message history**

---

## Scenario 5: Change Duration
**User types:** "Make it 3 seconds"

### 1. Brain Layer - Fast Path
```typescript
1. Intent Analysis - Quick Detect SUCCESS!
   → Regex matches "make it 3 seconds"
   → Returns immediately: {
       type: 'edit',
       editType: 'duration',
       durationSeconds: 3,
       targetSceneId: 'scene_002' // last edited
     }
   → Saves 300ms by skipping AI
```

### 2. Minimal Context
```typescript
// Only sends:
{
  tool: 'editScene',
  sceneId: 'scene_002',
  duration: 90  // 3 seconds * 30fps
}
```

### 3. Database Update
```typescript
UPDATE scenes SET duration = 90 WHERE id = 'scene_002'
// No code generation needed!
```

### State Changes
- **Only duration field updated**
- **Preview timeline adjusts**
- **Total Time**: ~200ms (very fast)

---

## Scenario 6: Delete Scene
**User types:** "Delete the second scene"

### 1. Brain Analysis
```typescript
1. Intent: type = 'delete'
2. Target: 'second scene' → scene_002
3. Minimal context needed
```

### 2. Deletion Flow
```typescript
1. sceneService.deleteScene({sceneId: 'scene_002'})

2. Database: DELETE FROM scenes WHERE id = 'scene_002'

3. R2: DELETE /components/scene_002.js

4. Returns deletedScene data for undo capability
```

### 3. Client Updates
```typescript
1. VideoState removes scene from array
2. Timeline reflows remaining scenes
3. Total duration updates to 180 frames
```

---

## System State Throughout Session

### Brain Context Cache Evolution
```
T+0:    Empty
T+150:  Initial context cached (0 scenes)
T+1500: Cache has 1 scene (still valid)
T+2300: Cache has 1 scene + new messages
T+3800: Cache has 2 scenes
T+5min: Cache expires, will rebuild on next request
```

### VideoState (Zustand) Evolution
```typescript
// Initial
{ scenes: [], messages: [] }

// After Scene 1
{ 
  scenes: [{id: 'scene_001', tsxCode: '...', duration: 180}],
  messages: [user1, assistant1]
}

// After all operations
{
  scenes: [{id: 'scene_001', ...}],  // scene_002 deleted
  messages: [12 total messages],
  refreshToken: '1234567'  // Changed 6 times
}
```

### Database State
```sql
-- Projects: 1 record
-- Scenes: 1 record (1 deleted)
-- Messages: 12 records
-- Scene iterations: 6 records (version history)
```

### Performance Optimizations

1. **Context Caching**: Saved ~100ms per request after first
2. **Quick Intent Detection**: Saved ~300ms on duration change
3. **Parallel Queries**: Context building loads in parallel
4. **Optimistic UI**: User sees updates instantly (0ms perceived latency)
5. **Incremental Context Updates**: Only fetches new messages

### Memory Management

1. **Brain Context Cache**: 5-minute TTL, ~10KB per project
2. **VideoState**: Kept in memory during session, ~50KB
3. **R2 Component Cache**: CDN cached for 1 hour
4. **Database Connection Pool**: Reused connections

### Total Session Metrics
- **6 Operations**: Create, Edit, Create, Edit+Image, Duration, Delete
- **Total Time**: ~5 seconds of processing
- **Database Queries**: ~25 total
- **AI API Calls**: 8 (could be 10 without cache)
- **User Perceived Time**: Near instant due to optimistic UI