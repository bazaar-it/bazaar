# Bazaar-Vid System Flow: Complete Technical Documentation

## Overview

Bazaar-Vid is a video generation platform that converts user prompts into React/Remotion video scenes. The system uses a hybrid architecture with two generation paths: Legacy System (stable) and MCP System (experimental).

## System Architecture

### Core Components

1. **Frontend**: Next.js with tRPC client
2. **Backend**: Next.js API routes with tRPC server
3. **Database**: Neon PostgreSQL with Drizzle ORM
4. **AI Services**: OpenAI GPT-4o/GPT-4o-mini
5. **Video Engine**: Remotion for React-based video rendering

### Feature Flag System

```typescript
// Feature flag controls which generation system is used
const isMCPEnabled = process.env.ENABLE_MCP === 'true';
```

- **MCP Disabled**: Uses Legacy Generation Service (stable, production-ready)
- **MCP Enabled**: Uses Brain Orchestrator + MCP Tools (experimental)

## User Flow: From Prompt to Video

### 1. User Interface Entry Point

**File**: `src/app/projects/[id]/generate/workspace/panels/ChatPanelG.tsx`

```typescript
// User types message in chat interface
const handleSubmit = async (e: React.FormEvent) => {
  // Auto-tag messages with scene context
  const taggedMessage = autoTagMessage(message);
  
  // Add optimistic UI updates
  const userMessageId = addOptimisticUserMessage(taggedMessage);
  const assistantMessageId = addOptimisticAssistantMessage();
  
  // Call generation endpoint
  generateSceneWithChatMutation.mutate({
    userMessage: taggedMessage,
    projectId,
    sceneId: effectiveSelectedSceneId
  });
};
```

### 2. Message Processing & Context Detection

The chat panel performs intelligent message analysis:

#### Auto-Tagging System
```typescript
const autoTagMessage = (msg: string): string => {
  // 1. Check for scene removal commands
  if (isRemovalCommand(msg)) {
    return `@scene(${sceneId}) ${msg}`;
  }
  
  // 2. Check for scene number references (@scene(1), @scene(2))
  const sceneNumberMatch = /\bscene\s+(\d+)\b/i.exec(msg);
  if (sceneNumberMatch) {
    const targetScene = getSceneByNumber(sceneNumber);
    return `@scene(${targetScene.id}) ${msg}`;
  }
  
  // 3. Auto-detect edit commands for selected scene
  if (selectedScene && isLikelyEdit(msg)) {
    return `@scene(${selectedScene.id}) ${msg}`;
  }
  
  return msg;
};
```

#### Edit Detection Logic
```typescript
const isLikelyEdit = (msg: string) => {
  const editIndicators = ['make', 'change', 'set', 'turn', 'fix', 'update', 'modify'];
  const contextEditPatterns = [
    /^add more/i,     // "add more typewriter effects"
    /^make it/i,      // "make it more animated"
    /^change the/i,   // "change the color"
  ];
  
  // Context-aware: if scene selected, be more liberal with edit detection
  if (hasSelectedScene && contextEditPatterns.some(pattern => pattern.test(msg))) {
    return true;
  }
  
  return editIndicators.some(indicator => msg.includes(indicator));
};
```

### 3. Generation Router (Entry Point)

**File**: `src/server/api/routers/generation.ts`

```typescript
generateScene: protectedProcedure
  .input(generateSceneSchema)
  .mutation(async ({ input, ctx }) => {
    const { userMessage, projectId, sceneId } = input;
    
    // Feature flag check
    if (isMCPEnabled()) {
      // Route to Brain Orchestrator (MCP System)
      return await brainOrchestrator.processUserRequest({
        userMessage,
        projectId,
        sceneId,
        userId: ctx.session.user.id,
        session: ctx.session
      });
    } else {
      // Route to Legacy Generation Service
      return await legacyGenerationService.generateScene({
        userMessage,
        projectId,
        sceneId,
        isEditMode: !!sceneId
      }, {
        session: ctx.session,
        userId: ctx.session.user.id
      });
    }
  })
```

## Generation Systems

### Legacy System (Production)

**File**: `src/server/services/legacyGeneration.service.ts`

The legacy system uses direct OpenAI calls with comprehensive system prompts:

```typescript
export class LegacyGenerationService {
  async generateScene(input: LegacyGenerateSceneInput, context: LegacyGenerationContext) {
    // 1. Determine if this is create or edit
    const isEdit = input.isEditMode && input.sceneId;
    
    // 2. Build context from chat history
    const chatHistory = await this.getChatHistory(input.projectId);
    
    // 3. Get existing scene data if editing
    const existingScene = isEdit ? await this.getExistingScene(input.sceneId) : null;
    
    // 4. Generate with appropriate system prompt
    const systemPrompt = isEdit ? this.getEditSystemPrompt() : this.getCreateSystemPrompt();
    
    // 5. Call OpenAI with full context
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        ...chatHistory,
        { role: "user", content: input.userMessage }
      ]
    });
    
    // 6. Parse and validate response
    // 7. Save to database
    // 8. Return structured result
  }
}
```

### MCP System (Experimental)

**File**: `src/server/services/brain/orchestrator.ts`

The MCP system uses a two-layer approach:

#### Layer 1: Brain Orchestrator (Intent Analysis)
```typescript
export class BrainOrchestrator {
  async processUserRequest(input: BrainInput): Promise<BrainOutput> {
    // 1. Analyze user intent
    const intent = await this.analyzeIntent(input.userMessage);
    
    // 2. Determine appropriate tool
    const toolName = this.selectTool(intent, input.sceneId);
    
    // 3. Execute MCP tool with context
    return await this.executeTool(toolName, {
      userPrompt: input.userMessage,
      projectId: input.projectId,
      sceneId: input.sceneId
    });
  }
}
```

#### Layer 2: MCP Tools (Code Generation)

**File**: `src/lib/services/mcp-tools/addScene.ts`

```typescript
export class AddSceneTool extends BaseMCPTool {
  protected async execute(input: AddSceneInput): Promise<AddSceneOutput> {
    // STEP 1: Generate enriched context using Brain analysis
    const brainContext = await this.generateBrainContext({
      userPrompt: input.userPrompt,
      storyboardSoFar: input.storyboardSoFar || []
    });
    
    // STEP 2: Generate React/Remotion code with enriched context
    const result = await sceneBuilderService.generateDirectCode({
      userPrompt: input.userPrompt,
      projectId: input.projectId,
      brainContext
    });
    
    return {
      sceneCode: result.code,
      sceneName: result.name,
      duration: result.duration,
      reasoning: result.reasoning
    };
  }
}
```

## Chat History & Context Management

### Message Persistence

**Database Schema**: `src/server/db/schema/messages.ts`
```typescript
export const messages = pgTable("messages", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull(),
  content: text("content").notNull(),
  role: text("role").notNull(), // 'user' | 'assistant'
  createdAt: timestamp("created_at").defaultNow(),
  status: text("status"), // 'success' | 'error' | 'pending'
});
```

### Context Building Strategy

#### For Iteration 7+ Scenarios:
```typescript
// Legacy system builds full chat history
const chatHistory = await db.select()
  .from(messages)
  .where(eq(messages.projectId, projectId))
  .orderBy(messages.createdAt);

// Convert to OpenAI format
const openAIMessages = chatHistory.map(msg => ({
  role: msg.role as 'user' | 'assistant',
  content: msg.content
}));
```

#### Context Truncation (Smart):
```typescript
// Keep last N messages to stay within token limits
const MAX_CONTEXT_MESSAGES = 20;
const recentMessages = chatHistory.slice(-MAX_CONTEXT_MESSAGES);
```

### Edit Request Handling

When user submits multiple edit requests:

1. **Auto-tagging**: System automatically tags with `@scene(id)`
2. **Context preservation**: Previous edits are included in chat history
3. **Incremental changes**: Each edit builds on the previous version
4. **State management**: Video state is updated optimistically

```typescript
// Example: User iteration flow
// User: "Create a login form"
// → Creates Scene 1

// User: "Make it red" (with Scene 1 selected)
// → Auto-tagged as "@scene(scene1-id) Make it red"
// → Edits Scene 1

// User: "Add animation"
// → Auto-tagged as "@scene(scene1-id) Add animation"  
// → Further edits Scene 1

// User: "Create a dashboard"
// → Creates Scene 2 (no scene selected, so new scene)
```

## System Prompts Architecture

### Legacy System Prompts

**File**: `src/server/services/legacyGeneration.service.ts`

#### Create System Prompt (Lines 100-200):
```typescript
const createSystemPrompt = `
You are an expert React/Remotion video scene generator.

CRITICAL ESM REQUIREMENTS:
- NEVER use: import React from 'react';
- NEVER use: import { ... } from 'remotion';
- ALWAYS use: const { AbsoluteFill, useCurrentFrame, ... } = window.Remotion;

COMPONENT LIBRARIES:
- Flowbite React components for UI
- Tailwind CSS for styling
- Custom animations with interpolate()

RESPONSE FORMAT:
{
  "tsxCode": "// React component code",
  "name": "Scene name",
  "duration": 5,
  "reasoning": "Explanation"
}
`;
```

#### Edit System Prompt (Lines 300-400):
```typescript
const editSystemPrompt = `
You are editing an existing React/Remotion scene.

EXISTING SCENE:
{existingCode}

USER REQUEST: {userMessage}

EDIT GUIDELINES:
- Preserve working functionality
- Make targeted changes only
- Maintain ESM compliance
- Keep existing animations unless specifically requested to change

RESPONSE FORMAT: Same as create
`;
```

### MCP System Prompts

**File**: `src/lib/services/sceneBuilder.service.ts`

#### Brain Context Generation (Lines 50-150):
```typescript
const contextPrompt = `
You are an AI Brain analyzing user intent for video code generation.

USER REQUEST: "${userPrompt}"
EXISTING SCENES: ${storyboardSoFar.length} scenes

Analyze and provide strategic guidance:

RESPONSE FORMAT (JSON):
{
  "userIntent": "What the user really wants",
  "technicalRecommendations": ["Use Flowbite Table", "Add typewriter animation"],
  "uiLibraryGuidance": "Specific component recommendations",
  "animationStrategy": "Detailed animation approach",
  "focusAreas": ["Text animation", "Form interaction"]
}
`;
```

#### Code Generation Prompt (Lines 500-800):
```typescript
const codeGenerationPrompt = `
You are a React/Remotion code generator.

BRAIN CONTEXT:
- User Intent: ${brainContext.userIntent}
- Recommendations: ${brainContext.technicalRecommendations}
- Animation Strategy: ${brainContext.animationStrategy}

CRITICAL ESM REQUIREMENTS:
- Use window.Remotion destructuring ONLY
- No React imports

Generate working React/Remotion component code.
`;
```

## Self-Reflection & Intelligence Strategies

### Current System Limitations

1. **No Error Recovery**: System doesn't learn from failed generations
2. **No Quality Assessment**: No feedback loop on generated code quality
3. **Limited Context**: Doesn't analyze previous successful patterns
4. **No User Preference Learning**: Doesn't adapt to user style preferences

### Proposed Intelligence Enhancements

#### 1. Generation Quality Feedback Loop
```typescript
// Add to generation response
interface GenerationResult {
  scene: Scene;
  assistantMessage: Message;
  qualityMetrics: {
    compilationSuccess: boolean;
    renderSuccess: boolean;
    userSatisfaction?: number; // 1-5 rating
    errorCount: number;
  };
}

// Track and learn from patterns
class QualityTracker {
  async recordGeneration(result: GenerationResult) {
    // Store quality metrics
    // Analyze patterns in successful vs failed generations
    // Adjust future prompts based on success patterns
  }
}
```

#### 2. User Preference Learning
```typescript
class UserPreferenceEngine {
  async analyzeUserPatterns(userId: string) {
    // Analyze user's previous prompts and edits
    // Identify preferred UI libraries (Flowbite vs HTML)
    // Identify preferred animation styles
    // Identify common edit patterns
    
    return {
      preferredUILibrary: 'flowbite',
      preferredAnimationStyle: 'smooth',
      commonEditPatterns: ['color changes', 'text modifications']
    };
  }
  
  async enhancePromptWithPreferences(prompt: string, preferences: UserPreferences) {
    // Inject user preferences into system prompts
    // "This user typically prefers Flowbite components and smooth animations"
  }
}
```

#### 3. Error Recovery System
```typescript
class ErrorRecoveryService {
  async handleGenerationError(error: GenerationError, context: GenerationContext) {
    // 1. Analyze error type (compilation, runtime, validation)
    // 2. Apply known fixes for common error patterns
    // 3. Retry with modified prompt
    // 4. If still failing, fall back to simpler approach
    
    const errorPattern = this.classifyError(error);
    const fix = this.getKnownFix(errorPattern);
    
    if (fix) {
      return await this.retryWithFix(context, fix);
    }
    
    // Fallback to minimal working scene
    return await this.generateFallbackScene(context);
  }
}
```

#### 4. Context-Aware Prompt Enhancement
```typescript
class ContextEnhancer {
  async enhancePrompt(userMessage: string, context: GenerationContext) {
    // Analyze current project themes
    const projectThemes = await this.analyzeProjectThemes(context.projectId);
    
    // Analyze successful patterns from similar projects
    const similarPatterns = await this.findSimilarSuccessfulPatterns(userMessage);
    
    // Enhance prompt with contextual guidance
    return {
      enhancedPrompt: userMessage,
      contextualGuidance: {
        projectThemes,
        similarPatterns,
        recommendedApproach: 'Based on similar successful generations...'
      }
    };
  }
}
```

#### 5. Multi-Attempt Generation with Learning
```typescript
class IntelligentGenerator {
  async generateWithLearning(input: GenerationInput) {
    const attempts = [];
    let bestResult = null;
    
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        // Enhance prompt based on previous attempts
        const enhancedInput = await this.enhanceBasedOnAttempts(input, attempts);
        
        const result = await this.generate(enhancedInput);
        
        // Validate and score result
        const quality = await this.assessQuality(result);
        
        if (quality.score > 0.8) {
          return result; // Good enough
        }
        
        attempts.push({ result, quality, attempt });
        bestResult = this.selectBestResult(attempts);
        
      } catch (error) {
        attempts.push({ error, attempt });
      }
    }
    
    return bestResult || this.generateFallbackScene(input);
  }
}
```

## Best Practices Implementation

### 1. Separation of Concerns
- **Brain Layer**: Intent analysis and strategic decisions
- **Tool Layer**: Code generation and execution
- **Service Layer**: Business logic and data persistence
- **UI Layer**: User interaction and state management

### 2. Error Handling
```typescript
// Graceful degradation at each layer
try {
  return await mcpGeneration(input);
} catch (mcpError) {
  console.warn('MCP failed, falling back to legacy:', mcpError);
  return await legacyGeneration(input);
}
```

### 3. Performance Optimization
```typescript
// Optimistic UI updates
const optimisticMessage = addOptimisticMessage(userInput);
generateScene(input).then(result => {
  updateOptimisticMessage(optimisticMessage.id, result);
});
```

### 4. Type Safety
```typescript
// Strict TypeScript throughout
interface GenerationInput {
  userMessage: string;
  projectId: string;
  sceneId?: string;
}

interface GenerationOutput {
  scene: Scene;
  assistantMessage: Message;
  isEdit: boolean;
}
```

### 5. Monitoring & Observability
```typescript
// Comprehensive logging
console.log(`[Generation] Starting: ${input.userMessage.substring(0, 50)}...`);
console.log(`[Generation] Context: ${scenes.length} scenes, edit=${!!sceneId}`);
console.log(`[Generation] Result: ${result.scene.name}, ${result.scene.duration}s`);
```

## File Responsibilities Summary

| File | Responsibility |
|------|----------------|
| `ChatPanelG.tsx` | User interface, message handling, context detection |
| `generation.ts` | Routing between legacy/MCP systems |
| `legacyGeneration.service.ts` | Stable production generation logic |
| `orchestrator.ts` | MCP intent analysis and tool selection |
| `addScene.ts` | MCP scene creation tool |
| `sceneBuilder.service.ts` | Code generation with brain context |
| `messages.ts` | Database schema for chat persistence |

This architecture provides a robust foundation for video generation while maintaining flexibility for future enhancements and intelligence improvements.