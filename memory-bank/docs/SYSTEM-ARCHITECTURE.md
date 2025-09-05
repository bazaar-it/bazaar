# Bazaar-Vid System Architecture

## Overview
Bazaar-Vid is an AI-powered platform that transforms natural language prompts and images into professional motion graphics videos. Through aggressive simplification and modularization, we've created a system that's both powerful and understandable.

## The Simplification Journey

### Where We Started
- **Problem**: "It works purely by luck" - the team couldn't explain how the system worked
- **Symptoms**: 40+ system prompts, 2+ minute generation times, 1400+ line components
- **Root Cause**: No clear architecture, circular dependencies, scattered logic

### Where We Are Now
- **Clear Flow**: Linear pipeline from user input to video output
- **Modular**: Components do one thing well
- **Fast**: 60-90 second generation (down from 2+ minutes)
- **Maintainable**: New developers understand the flow immediately

## Simplified Architecture Flow

### 1. User Journey
```
User lands on /projects/[id]/generate →
Sees workspace with ChatPanel + PreviewPanel →
Types prompt or uploads image →
Receives generated video in ~60-90 seconds
```

### 2. Technical Flow
```
ChatPanelG (UI) 
    ↓
generation.universal.ts (API Router)
    ↓
orchestratorNEW.ts (Brain)
    ↓
MCP Tools (Code Generation)
    ↓
VideoState + Database (Storage)
    ↓
PreviewPanelG (Display)
```

## Core Components Deep Dive

### Frontend Architecture (`/src/app/projects/[id]/generate/`)

#### The Workspace
The generate page creates a workspace where users interact with the AI to create videos:

```typescript
// page.tsx - Entry point
export default function GeneratePage({ params }) {
  return <GenerateWorkspaceRoot projectId={params.id} />;
}

// GenerateWorkspaceRoot.tsx - Main container
function GenerateWorkspaceRoot() {
  // Manages which panels are visible
  // Coordinates data flow between panels
  // Handles responsive layout
}
```

#### The Five Panels

**1. ChatPanelG** (`/workspace/panels/ChatPanelG.tsx`)
- **Purpose**: Primary user interaction point
- **Responsibilities**: 
  - Accept text prompts
  - Handle image uploads
  - Show conversation history
  - Display AI responses
- **Modularized into**:
  - `ChatMessage`: Individual message display
  - `ImageUpload`: Drag-drop image handling
  - `VoiceInput`: Speech-to-text
  - `AutoFixErrorBanner`: Error recovery

**2. PreviewPanelG** (`/workspace/panels/PreviewPanelG.tsx`)
- **Purpose**: Live video preview using Remotion
- **How it works**:
  ```typescript
  // Watches VideoState for changes
  const scenes = useVideoState(state => state.projects[projectId]?.scenes);
  
  // Compiles scenes into Remotion composition
  useEffect(() => {
    if (scenes.length > 0) {
      compileMultiSceneComposition(scenes);
    }
  }, [scenes]);
  ```

**3. CodePanelG** (`/workspace/panels/CodePanelG.tsx`)
- **Purpose**: Show generated React/Remotion code
- **Features**: Syntax highlighting, copy functionality
- **Why it matters**: Users can learn and modify

**4. TemplatesPanel** (`/workspace/panels/TemplatesPanel.tsx`)
- **Purpose**: Pre-built animations to start from
- **Examples**: "Tech Startup", "Finance Dashboard", "Product Launch"

**5. MyProjectsPanel** (`/workspace/panels/MyProjectsPanel.tsx`)
- **Purpose**: Access previous videos
- **Features**: Preview, duplicate, delete

### Backend Flow

#### 1. API Layer (`/src/server/api/routers/generation.universal.ts`)
```typescript
// Simplified flow
export const generationRouter = router({
  generateScene: protectedProcedure
    .input(generateSceneSchema)
    .mutation(async ({ input, ctx }) => {
      // Validate user
      // Call brain orchestrator
      // Return generated code
    })
});
```

#### 2. Brain Orchestrator (`/src/brain/orchestratorNEW.ts`)

The Brain is the intelligence layer that understands what users want and coordinates the right tools:

```typescript
class BrainOrchestrator {
  async process(input: GenerateSceneInput) {
    // Step 1: Build comprehensive context
    const context = await this.buildContext({
      chatHistory: input.messages,
      currentScenes: input.currentState.scenes,
      userPreferences: input.preferences,
      projectMemory: await this.getProjectMemory(input.projectId)
    });
    
    // Step 2: Analyze user intent with AI
    const intent = await this.aiClient.chat({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: BRAIN_INTENT_PROMPT },
        { role: "user", content: JSON.stringify({ prompt: input.prompt, context }) }
      ]
    });
    
    // Step 3: Select appropriate MCP tools
    const selectedTools = this.selectTools(intent);
    // Examples:
    // "create a dashboard" → [AddScene]
    // "change color and add animation" → [EditScene]
    // "remove the second scene" → [DeleteScene]
    
    // Step 4: Execute tools with full context
    const results = await Promise.all(
      selectedTools.map(tool => tool.execute(input, context))
    );
    
    return results;
  }
  
  private buildContext(params) {
    // Centralizes all context building
    // Includes chat history, current video state, user patterns
    // This prevents each tool from rebuilding context
  }
}

#### 3. MCP Tools (`/src/tools/`)

MCP (Model Context Protocol) tools are specialized AI agents for specific tasks:

**AddScene Tool** (`/src/tools/addScene.ts`)
```typescript
export const addSceneTool = {
  name: "addScene",
  description: "Creates a new scene for the video",
  
  async execute(params, context) {
    if (params.imageUrls?.length > 0) {
      // Image path: Direct generation from visual
      return await generateFromImage(params.imageUrls, params.prompt);
    } else {
      // Text path: Two-step process
      // 1. Generate structured layout
      const layout = await generateLayout(params.prompt, context);
      
      // 2. Convert layout to Remotion code
      const code = await generateCode(layout, params.prompt);
      
      return { code, metadata: { duration: 150 } };
    }
  }
};
```

**EditScene Tool** (`/src/tools/editScene.ts`)
```typescript
export const editSceneTool = {
  name: "editScene",
  
  async execute(params, context) {
    const editType = await analyzeEditType(params.prompt);
    
    if (editType === 'surgical') {
      // Precise edits: "make the button blue"
      return await makeSurgicalEdit(params.currentCode, params.prompt);
    } else {
      // Creative edits: "make it more dynamic"
      return await enhanceCreatively(params.currentCode, params.prompt);
    }
  }
};
```

**DeleteScene Tool** (`/src/tools/deleteScene.ts`)
```typescript
export const deleteSceneTool = {
  name: "deleteScene",
  
  async execute(params) {
    // Simple and direct
    return { action: 'delete', sceneId: params.sceneId };
  }
};
```

#### 4. State Management (`/src/stores/videoState.ts`)

The heart of our simplified state management:

```typescript
interface VideoState {
  projects: Record<string, Project>;
  
  // Direct update methods - no complexity
  updateScene: (projectId: string, sceneId: string, scene: Scene) => void;
  addScene: (projectId: string, scene: Scene) => void;
  deleteScene: (projectId: string, sceneId: string) => void;
  setProject: (projectId: string, project: Project) => void;
}

const useVideoState = create<VideoState>((set) => ({
  projects: {},
  
  updateScene: (projectId, sceneId, scene) => {
    set((state) => ({
      projects: {
        ...state.projects,
        [projectId]: {
          ...state.projects[projectId],
          scenes: state.projects[projectId].scenes.map(s =>
            s.id === sceneId ? scene : s
          )
        }
      }
    }));
    // That's it! Zustand notifies all subscribers
    // PreviewPanelG re-renders automatically
    // No manual refresh needed
  },
  
  // Similar direct updates for add/delete
}));
```

**Why This Works**:
1. **Single Source of Truth**: State lives in one place
2. **Reactive**: Components subscribe to state slices
3. **Simple**: Just update state, UI follows
4. **No Side Effects**: Pure state updates only

## Modularization Success

### Before (Monolithic)
```
ChatPanelG.tsx (1400+ lines)
- Message handling
- UI rendering  
- Error handling
- File uploads
- Voice input
- State management
- API calls
```

### After (Modular)
```
ChatPanelG.tsx (~760 lines) - Orchestration only
├── components/chat/
│   ├── ChatMessage.tsx - Message display
│   ├── ChatWelcome.tsx - Welcome UI
│   ├── GeneratingMessage.tsx - Loading states
│   ├── ImageUpload.tsx - Image handling
│   ├── VoiceInput.tsx - Voice transcription
│   └── AutoFixErrorBanner.tsx - Error handling
└── hooks/
    ├── use-sse-generation.ts - Real-time streaming
    └── use-auto-fix.ts - Error recovery
```

## Key Simplifications

### 1. Direct State Updates
```typescript
// Before: Complex refresh patterns
updateScene(scene);
forceRefresh();
dispatchEvent('scene-updated');
await refetchFromDatabase();

// After: Trust Zustand
updateScene(projectId, sceneId, scene);
// That's it! React handles the rest
```

### 2. Single Responsibility
Each component/service does ONE thing:
- Brain: Intent + tool selection
- Tools: Code generation only
- State: Data storage only
- UI: Display only

### 3. Clear Context Flow
```
Chat History → Brain builds context once →
Passes to selected tool → Tool uses context →
Returns generated code → Updates state
```

### 4. Simplified Tool System
- No nested sub-tools
- No tool-specific agents
- Clear input/output contracts
- Tools don't manage their own state

## Performance Improvements

### Current: ~60-90 seconds
- Removed redundant LLM calls
- Simplified context building
- Direct state updates
- Eliminated race conditions

### Goal: <30 seconds
- Cache common patterns
- Optimize prompts
- Parallel processing where possible
- Smarter context selection

## System Prompts

### Active Prompts (Simplified from 40+ to ~5)
1. **Brain Intent Analysis** - Understands what user wants
2. **Layout Generation** - Creates design structure
3. **Code Generation** - Generates Remotion code
4. **Edit Analysis** - Understands edit requirements
5. **Image Analysis** - Processes uploaded images

### Prompt Location
All active prompts in: `/src/config/prompts/active/`

## Future Architecture Goals

1. **Further Modularization**
   - Break down remaining large files
   - Extract more reusable components
   - Clearer service boundaries

2. **Faster Generation**
   - Optimize LLM calls
   - Better caching strategies
   - Smarter context windows

3. **Multi-Format Support**
   - YouTube (16:9)
   - TikTok (9:16)
   - Instagram (1:1)
   - Custom dimensions

4. **Enhanced Tools**
   - Audio support
   - Video imports
   - External library support
   - Third-party integrations

## Developer Guidelines

### Adding New Features
1. Identify the appropriate layer (UI/API/Brain/Tool)
2. Keep components small and focused
3. Follow existing patterns
4. Update types in `/src/lib/types/`
5. Test with evaluation framework

### Debugging Flow
1. Check browser console for UI errors
2. Check network tab for API responses
3. Check server logs for brain/tool execution
4. Verify state updates in React DevTools
5. Check database for persistence issues

### Common Patterns
```typescript
// UI Component Pattern
export function MyComponent({ projectId }: Props) {
  const { data, updateData } = useVideoState();
  
  const handleAction = async () => {
    const result = await api.generation.doAction();
    updateData(result); // Direct update
  };
  
  return <UI />;
}

// Tool Pattern
export const myTool = {
  name: 'myTool',
  description: 'Does something',
  parameters: schema,
  execute: async (params, context) => {
    // Single responsibility
    return generatedCode;
  }
};
```

## Conclusion

The system has been dramatically simplified:
- **44% code reduction** through modularization
- **Clear, linear flow** from user input to video output
- **Single responsibility** for each component
- **Direct state management** without complex patterns
- **Understandable architecture** that new developers can grasp

The magic isn't in complexity - it's in simplicity and clear separation of concerns.