# ChatPanelG Dependency Analysis

## Direct Imports from ChatPanelG.tsx

### React & Framework
- `react` - useState, useEffect, useRef, useCallback, useMemo
- UI Components:
  - `~/components/ui/button`
  - `~/components/ui/input`
  - `~/components/ui/card`
- Icons from `lucide-react`

### Core Dependencies
1. **API Layer**
   - `~/trpc/react` - api object used for:
     - `api.generation.generateScene.useMutation()` (line 145)
     - `api.generation.getProjectScenes.useQuery()` (line 158)
     - `api.useUtils()` (line 161)

2. **State Management**
   - `~/stores/videoState` - useVideoState hook provides:
     - getCurrentProps()
     - replace()
     - forceRefresh()
     - updateAndRefresh()
     - getProjectChatHistory()
     - addUserMessage()
     - addAssistantMessage()
     - updateMessage()
     - updateScene()
     - addScene()

3. **Hooks**
   - `~/hooks/useVoiceToText` - Voice recording functionality

4. **Utilities**
   - `nanoid` - ID generation
   - `sonner` - toast notifications
   - `~/lib/utils` - cn() utility for classNames

## API Endpoints Used

### generation.generateScene
- **Purpose**: Main endpoint for scene generation via Brain Orchestrator
- **Called**: Line 287
- **Parameters**:
  ```typescript
  {
    projectId: string,
    userMessage: string,
    sceneId?: string,
    userContext: {
      sceneId?: string,
      imageUrls?: string[]
    }
  }
  ```

### generation.getProjectScenes
- **Purpose**: Fetch scenes from database
- **Called**: Line 158
- **Parameters**: `{ projectId: string }`

## CRITICAL FINDING: Router Mismatch

**The app is using `generationCleanRouter` but ChatPanelG calls the old API interface!**

- `/src/server/api/root.ts` imports `generation: generationCleanRouter` (line 25)
- But the two routers have different method signatures:

### generation.ts (OLD - what ChatPanelG expects):
```typescript
generateScene: {
  projectId: string,
  userMessage: string,  // <-- ChatPanelG sends this
  sceneId?: string,
  userContext?: Record<string, unknown>
}
```

### generation.clean.ts (NEW - what's actually running):
```typescript
generateScene: {
  projectId: string,
  prompt: string,      // <-- Different field name!
  imageUrls?: string[]
}
```

This means:
1. **ChatPanelG sends `userMessage` but router expects `prompt`**
2. **ChatPanelG sends `sceneId` and `userContext` which are ignored**
3. **Image URLs are nested in `userContext.imageUrls` but should be top-level**
4. **This is causing a TYPE MISMATCH at runtime**

## Key Findings

1. **CRITICAL: API mismatch** - ChatPanelG calls old generation.ts interface but app uses generation.clean.ts
2. **Heavy reliance on VideoState store** - Primary state management
3. **Direct API calls** to wrong router interface
4. **No direct database access** - All through tRPC API
5. **Image upload** goes to `/api/upload` endpoint (line 554)

## Dependencies Actually Being Used

### From generation.clean.ts (the ACTUAL router):
- `~/brain/orchestratorNEW` - Brain decision making
- `~/tools/add/add` - Scene creation
- `~/tools/edit/edit` - Scene editing
- `~/tools/delete/delete` - Scene deletion
- `~/server/api/services/database.service` - DB operations
- `~/server/api/services/background.service` - Background tasks
- `~/lib/api/response-helpers` - Response formatting
- `~/lib/types/api/universal` - Universal response types

### State Management Flow:
1. ChatPanelG → tRPC API → generation.clean.ts
2. generation.clean.ts → orchestratorNEW → decision
3. generation.clean.ts → tools → content generation
4. generation.clean.ts → database.service → DB updates
5. ChatPanelG → videoState → UI updates

## What's NOT Being Used

1. **Original generation.ts** - The old router is no longer imported
2. **SceneBuilder** - Deleted as per TICKET-004
3. **Any direct tool access from UI** - All goes through router

## Action Required

**ChatPanelG needs to be updated to match the new API interface:**
- Change `userMessage` → `prompt`
- Remove `sceneId` and `userContext` from generateScene
- Use separate `editScene` and `deleteScene` endpoints
- Update parameter structures to match generation.clean.ts

## Full Dependency Tree

### 1. ChatPanelG Component
```
ChatPanelG.tsx
├── React & UI Libraries
│   ├── react (hooks)
│   ├── @/components/ui/* (button, input, card)
│   ├── lucide-react (icons)
│   ├── nanoid (ID generation)
│   └── sonner (toast notifications)
├── API Layer (tRPC)
│   ├── api.generation.generateScene → BROKEN (wrong params)
│   └── api.generation.getProjectScenes → BROKEN (doesn't exist in clean router)
├── State Management
│   └── videoState store (Zustand)
│       ├── getCurrentProps()
│       ├── updateScene()
│       ├── addScene()
│       ├── getProjectChatHistory()
│       └── updateAndRefresh()
├── Custom Hooks
│   └── useVoiceToText
│       └── Calls /api/voice/transcribe endpoint
└── Direct API Calls
    └── /api/upload (image uploads)
```

### 2. Backend Dependencies (generation.clean.ts)
```
generation.clean.ts (ACTUAL ROUTER)
├── Brain & Orchestration
│   └── orchestratorNEW
│       ├── ContextBuilder
│       └── IntentAnalyzer
├── Tools (Pure Functions)
│   ├── addTool
│   ├── editTool
│   └── deleteTool
├── Services
│   ├── database.service.ts
│   │   ├── createScene()
│   │   ├── updateScene()
│   │   ├── deleteScene()
│   │   ├── saveMessage()
│   │   └── saveSceneIteration()
│   ├── background.service.ts
│   │   ├── executeTasks()
│   │   └── executeCleanupTasks()
│   └── projectMemory.service.ts
│       └── startAsyncImageAnalysis()
└── Response Helpers
    ├── ResponseBuilder
    └── UniversalResponse types
```

### 3. Other Components Using generation API
- CodePanelG.tsx - uses `api.generation.addScene` (doesn't exist)
- TemplatesPanelG.tsx - likely broken too
- WorkspaceContentAreaG.tsx - likely broken too
- StoryboardPanelG.tsx - likely broken too

## Summary of Issues

1. **API Contract Mismatch**: ChatPanelG expects old generation.ts interface
2. **Missing Endpoints**: Clean router doesn't have `getProjectScenes`, `addScene`
3. **Parameter Mismatches**: `userMessage` vs `prompt`, nested vs flat structure
4. **Type Safety Broken**: TypeScript should catch this but apparently isn't

## What's Actually Working

1. **VideoState Store**: Core state management is fine
2. **Voice Recording**: Uses separate voice router
3. **Image Upload**: Uses Next.js API route, not tRPC
4. **UI Components**: All UI libraries work fine

## Recommendation for TICKET-006

The ChatPanelG optimization ticket needs to:
1. **First fix the API calls** to match generation.clean.ts
2. **Then optimize** with the planned improvements
3. **Consider reverting** to old router temporarily if too many components are broken