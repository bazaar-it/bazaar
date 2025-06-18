# Bazaar-Vid Complete Pipeline Analysis

## 1. Database Schema (Source of Truth)

### Scene Table (`server/db/schema.ts`)
```typescript
export const scenes = createTable("scene", (d) => ({
  id: d.uuid().primaryKey().defaultRandom(),
  projectId: d.uuid().notNull(),
  order: d.integer().notNull().default(0),
  name: d.varchar({ length: 255 }).default("Scene").notNull(),
  tsxCode: d.text().notNull(),              // ✅ The actual React code
  props: d.jsonb(),                          // Animation parameters
  duration: d.integer().default(150).notNull(), // Frames (5s at 30fps)
  layoutJson: d.text("layout_json"),        // ❌ Two-step pipeline (to remove)
  // ... publishing fields
}));
```

**Key Fields:**
- `tsxCode`: The React/Remotion code for the scene
- `duration`: Always in frames (not seconds)
- `layoutJson`: Currently used for 2-step generation (should be removed)

## 2. Generated Types (`generated/entities.ts`)

Auto-generated from DB schema via `npm run generate:types`:

```typescript
export interface SceneEntity {
  readonly id: string;
  tsxCode: string;              // ✅ Correctly named
  duration: number;             // Always in frames
  layoutJson?: string | null;   // Optional layout
  // ... other fields
}
```

## 3. User Interface Flow

### ChatPanelG (`app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx`)

**User Actions:**
1. Types message
2. Uploads images (optional)
3. Clicks send

**Code Flow:**
```typescript
// Line 148: API mutation setup
const generateSceneMutation = api.generation.generateScene.useMutation();

// Line 270: Submit handler
const handleSubmit = async (e: React.FormEvent) => {
  // Get message and images
  const trimmedMessage = message.trim();
  const imageUrls = uploadedImages.filter(img => img.url).map(img => img.url!);
  
  // Line 342: Call API
  const result = await generateSceneMutation.mutateAsync({
    projectId,
    userMessage: trimmedMessage,
    sceneId: selectedSceneId || undefined,
    userContext: {
      sceneId: selectedSceneId || undefined,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
    }
  });
};
```

## 4. API Router (`server/api/routers/generation.universal.ts`)

### Input Validation
```typescript
generateScene: protectedProcedure
  .input(z.object({
    projectId: z.string(),
    userMessage: z.string(),
    userContext: z.object({
      imageUrls: z.array(z.string()).optional(),
    }).optional(),
  }))
```

### Main Flow
```typescript
.mutation(async ({ input, ctx }) => {
  // 1. Verify project ownership
  const project = await db.query.projects.findFirst({
    where: and(
      eq(projects.id, projectId),
      eq(projects.userId, userId)
    ),
  });

  // 2. Build context (scenes, chat history)
  const storyboardForBrain = existingScenes.map(scene => ({
    id: scene.id,
    name: scene.name,
    tsxCode: scene.tsxCode,  // ✅ Full code passed to brain
  }));

  // 3. Call Brain Orchestrator
  const orchestrationResult = await orchestrator.processUserInput({
    prompt: userMessage,
    projectId,
    userId,
    storyboardSoFar: storyboardForBrain,
    chatHistory,
    userContext: {
      imageUrls: input.userContext?.imageUrls,
    },
  });

  // 4. Execute tool based on brain decision
  const toolResult = await executeToolFromDecision(
    decision,
    projectId,
    userId,
    storyboard
  );

  // 5. Save to database
  const scene = await db.insert(scenes).values({
    projectId,
    name: result.name || `Scene ${sceneOrder}`,
    tsxCode: result.tsxCode,  // ✅ Correct field
    duration: result.duration || 150,
    props: result.props || {},
    order: sceneOrder,
    layoutJson: result.layoutJson,
  }).returning();

  // 6. Return response
  return {
    data: { scene: savedScene },
    meta: { ... }
  };
});
```

## 5. Brain/Orchestrator (`brain/orchestratorNEW.ts`)

### Purpose
Decides which tool to use based on user input.

### Flow
```typescript
async processUserInput(input: OrchestrationInput) {
  // 1. Build context (lightweight metadata)
  const contextPacket = await this.contextBuilder.buildContext(input);
  
  // 2. Analyze intent with LLM
  const toolSelection = await this.intentAnalyzer.analyzeIntent(
    input, 
    contextPacket
  );
  
  // 3. Return decision (no execution)
  return {
    toolUsed: toolSelection.toolName,  // 'addScene' | 'editScene' | 'deleteScene'
    reasoning: toolSelection.reasoning,
    result: { ... }
  };
}
```

## 6. Tools (`tools/`)

### AddTool (`tools/add/add.ts`)
```typescript
execute(input: AddToolInput) {
  if (input.imageUrls?.length > 0) {
    // Direct image → code generation
    return imageToCodeGenerator.generateCodeFromImage();
  }
  
  if (input.previousSceneContext?.tsxCode) {
    // Skip layout, use reference
    return codeGenerator.generateCodeWithReference();
  }
  
  // Two-step: layout → code (to be removed)
  const layout = await layoutGenerator.generateLayout();
  const code = await codeGenerator.generateCode(layout);
}
```

## Pipeline Summary

```
User Input (ChatPanel)
    ↓
tRPC Router (generation.universal.ts)
    ↓
Brain/Orchestrator (decides tool)
    ↓
Tool Execution (generates code)
    ↓
Database Save
    ↓
Response to UI
```

## Current Issues

1. **Two-step generation** (layout → code) takes 75 seconds
2. **Complex context building** adds overhead
3. **Expensive models** (GPT-4.1 for brain)
4. **No streaming** for multi-step operations

## Optimization Opportunities

1. **Remove layout JSON step** - Direct prompt → code
2. **Simplify brain** - Use GPT-4o-mini
3. **Stream responses** - Show progress
4. **Cache context** - Don't rebuild every time
5. **Parallel operations** - When possible