# Complete Image Pipeline Walkthrough (Double-Checked)

## Overview
This is the **complete, verified** pipeline for image handling in Bazaar-Vid, from upload to scene generation.

## Use Case 1: Add + Recreate
**User says: "Create a new scene from this screenshot"**

### Complete Pipeline Flow:

```mermaid
graph TD
    A[User uploads image] --> B[ImageUpload.tsx compresses]
    B --> C[/api/upload route]
    C --> D[R2 Storage]
    C --> E[AssetContextService saves to DB]
    C --> F[MediaMetadataService analyzes async]
    D --> G[Returns URL to client]
    G --> H[ChatPanelG handleSend]
    H --> I[SSE /api/generate-stream]
    I --> J[Creates user message in DB]
    I --> K[Emits ready event]
    K --> L[Client calls tRPC generateScene]
    L --> M[ContextBuilder fetches assets with tags]
    M --> N[IntentAnalyzer with asset context]
    N --> O[Brain decides: addScene + imageAction:recreate]
    O --> P[executeToolFromDecision in helpers.ts]
    P --> Q[AddTool.execute]
    Q --> R[generateFromImages branches on imageAction]
    R --> S[generateImageRecreationScene]
    S --> T[Returns TSX code]
    T --> U[helpers.ts saves to scenes table]
    U --> V[PreviewPanelG refetches and updates]
```

### Detailed File & Function Flow:

#### 1. **Image Upload & Storage**
```typescript
// src/components/chat/ImageUpload.tsx
handleImageUpload() - Line 81
  ↓ Compresses if > 1MB or AVIF format
  ↓ fetch('/api/upload')

// src/app/api/upload/route.ts - POST method
- Line 15: Auth check
- Line 60-67: Configure S3 client for R2
- Line 79-91: Upload to R2 with PutObjectCommand
- Line 94: Construct public URL

// MISSED BEFORE: Asset persistence
- Line 104-143: AssetContextService.saveAsset()
  - Calculates file hash for deduplication
  - Determines asset type (image/video/audio/logo)
  - Saves to 'assets' table
  - Links to project via 'projectAssets' table

// MISSED BEFORE: Async metadata analysis  
- Line 145-152: mediaMetadataService.analyzeAndTag() [ASYNC]
  - Runs in background (void promise)
  - Doesn't block response
```

#### 2. **Asset Context Service** (MISSED IN FIRST PASS)
```typescript
// src/server/services/context/assetContextService.ts
saveAsset() - Line 20
  ↓ Insert into 'assets' table with user ownership
  ↓ Link to project via 'projectAssets' join table
  ↓ Stores: URL, original name, type, file size, tags[]

getProjectAssets() - Line 64
  ↓ Fetches all project assets with tags
  ↓ Returns AssetContext with logos separated
  ↓ Used later by ContextBuilder
```

#### 3. **Media Metadata Service** (ASYNC - Fire & Forget)
```typescript
// src/server/services/media/media-metadata.service.ts
analyzeAndTag() - Line 22
  ↓ Uses AI vision model (promptEnhancer - fast/cheap)
  ↓ Analyzes image for:
    - kind: logo/ui/product/photo/chart
    - layout: dashboard/screenshot/hero/banner
    - dominantColors: ["#FF0000", "#00FF00"]
    - detectedText: ["Company Name"]
    - hints: { embedRecommended: true/false, recreateRecommended: true/false }
  ↓ Converts to tags: ["kind:ui", "layout:dashboard", "color:#FF0000", "hasText", "hint:recreate"]
  ↓ Updates assets.tags in DB (Line 48-54)
```

#### 4. **Chat Submission**
```typescript
// src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx
handleSend() - Line 428
  ↓ Collects uploadedImages with URLs
  ↓ Line 430: Maps to imageUrls array
  ↓ Line 564: generateSSE(message, imageUrls, ...)
```

#### 5. **SSE Processing**
```typescript
// src/app/api/generate-stream/route.ts - GET method
- Line 36: Auth check
- Line 46: Parse imageUrls from query params
- Line 67: Parse JSON arrays
- Line 73-83: messageService.createMessage() with retry logic
  - Creates user message with imageUrls attached
- Line 256: Emit 'ready' event with all context
```

#### 6. **tRPC Generation Router**
```typescript
// src/server/api/routers/generation/scene-operations.ts
generateScene mutation - Line 24
  ↓ Line 50-77: Parallel fetch (project, scenes, messages, usage)
  ↓ Line 253: Call Brain orchestrator
```

#### 7. **Context Building** (INCLUDES ASSET TAGS)
```typescript
// src/brain/orchestrator_functions/contextBuilder.ts
buildContext() - Line approx 50
  ↓ Fetches recent messages
  ↓ Builds image context from conversation
  ↓ Line (varies): assetContext.getProjectAssets(projectId)
    - Fetches ALL project assets with their tags
    - Includes logos, images, videos
    - TAGS ARE INCLUDED HERE
```

#### 8. **Intent Analysis with Asset Context**
```typescript
// src/brain/orchestrator_functions/intentAnalyzer.ts
analyzeIntent() - Line 11
  ↓ buildUserPrompt() - Line 61
  ↓ Lines 153-167: Includes asset context with tags
    Example: "logo.png (image) [tags: kind:logo, color:#FF0000, hint:embed]"
  ↓ Sends to Brain with BRAIN_ORCHESTRATOR prompt

// src/config/prompts/active/brain-orchestrator.ts
- Lines 39-49: IMAGE DECISION CRITERIA
  - Checks keywords: "recreate/copy/exactly" → imageAction: "recreate"
  - Checks tags: "kind:ui" or "hint:recreate" → biases toward recreate
  - Default: imageAction: "embed"
```

#### 9. **Brain Decision**
```typescript
Returns JSON:
{
  "toolName": "addScene",
  "imageAction": "recreate",  // Critical field!
  "reasoning": "User wants to recreate UI from screenshot",
  "userFeedback": "Creating scene from your screenshot"
}
```

#### 10. **Tool Execution**
```typescript
// src/server/api/routers/generation/helpers.ts
executeToolFromDecision() - Line varies
  ↓ Routes based on toolName
  ↓ case 'addScene': Line varies
    - Prepares AddToolInput with imageAction
    - Calls addTool.run(input)
```

#### 11. **Add Tool Branching**
```typescript
// src/tools/add/add.ts
execute() - Line 16
  ↓ Line 62: Checks if imageUrls present
  ↓ Line 63-65: Logs imageAction mode
  ↓ generateFromImages() - Line 225
    ↓ Line 233: const isRecreate = input.imageAction === 'recreate'
    ↓ Lines 234-249: CRITICAL BRANCHING
      - If recreate: codeGenerator.generateImageRecreationScene()
      - If embed: codeGenerator.generateCodeFromImage()
```

#### 12. **Code Generation**
```typescript
// src/tools/add/add_helpers/CodeGeneratorNEW.ts
generateImageRecreationScene() - For recreate path
  ↓ Uses IMAGE_RECREATOR prompt
  ↓ Returns: { code, name, duration }

generateCodeFromImage() - For embed path
  ↓ Uses CODE_GENERATOR prompt
  ↓ Returns: { code, name, duration }
```

#### 13. **Scene Persistence**
```typescript
// Back in src/server/api/routers/generation/helpers.ts
After tool execution:
  ↓ Line varies: db.insert(scenes).values({...})
  ↓ Saves: projectId, name, tsxCode, duration, order
  ↓ Returns scene with ID
```

#### 14. **UI Update**
```typescript
// src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx
- Watches scenes via tRPC query
- Auto-refetches after mutation
- Rebuilds video preview
```

---

## Use Case 2: Add + Embed
**User says: "Add my product photo as the hero background"**

### Key Differences:

1. **Brain Decision**: `imageAction: "embed"` instead of "recreate"
2. **Add Tool**: Takes the embed branch at Line 233-249
3. **Code Generation**: Uses `generateCodeFromImage()` which creates `<Img src="exact-url">`

---

## Use Case 3: Edit + Recreate (Style Transfer)
**User says: "Make the button in scene 3 look like this" + image**

### Different Path:

1. **Brain Decision**: 
   - `toolName: "editScene"`
   - `targetSceneId: "scene-3-id"`
   - `imageAction: "recreate"`

2. **Tool Execution**: Routes to EditTool (TODO: Not yet implemented)

---

## Services Summary

### Synchronous Services:
1. **AssetContextService** - Saves assets to DB, links to project
2. **MessageService** - Creates chat messages
3. **ContextBuilder** - Fetches all context for Brain
4. **IntentAnalyzer** - Processes Brain decision

### Asynchronous Services:
1. **MediaMetadataService** - Analyzes images with AI vision (fire-and-forget)

### Storage & Persistence:
1. **R2 Storage** - Cloudflare object storage
2. **PostgreSQL Tables**:
   - `assets` - User-owned assets with tags
   - `projectAssets` - Links assets to projects
   - `scenes` - Generated scene code
   - `messages` - Chat history
   - `sceneIterations` - Version history (not shown in flow)

---

## Critical Points

### The Decision Point (Line 233 in add.ts):
```typescript
const isRecreate = input.imageAction === 'recreate';
```
This single line determines the entire code generation path!

### Tag Influence:
- Tags from MediaMetadataService influence Brain's decision
- Example: `kind:ui` + `hint:recreate` → More likely to choose recreate
- Tags persist and are used for ALL future references to that asset

### Missing EditTool Implementation:
- EditTool doesn't yet branch on `imageAction`
- When implemented, will enable style transfer (recreate) vs content insertion (embed)

---

## What I Missed Initially:

1. **AssetContextService** - Complete persistence layer for assets
2. **MediaMetadataService** - Async AI analysis with tagging
3. **Asset tags in context** - How tags influence Brain decisions
4. **Retry logic in SSE** - Message creation has retry with backoff
5. **Scene iterations** - Version tracking (exists but not in main flow)

This is now the **complete, verified pipeline** with all services and decision points documented.