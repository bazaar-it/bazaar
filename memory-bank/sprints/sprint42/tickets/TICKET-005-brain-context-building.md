# TICKET-005: Enhance Brain for Smart Context Building

## Overview
Brain should understand user intent perfectly and provide rich context to tools, especially for "make it look like this" scenarios with screenshots.

## Current State

### Problem Areas

1. **Limited context understanding** - might not analyze images properly
2. **Generic responses** - not intelligent or context-aware
3. **Poor tool selection** - might choose wrong tool for intent
4. **No preference learning** - doesn't remember user style

## Implementation Plan

### Step 1: Enhanced Brain Types

Create `/src/brain/types/enhanced.ts`:
```typescript
export interface BrainContext {
  // Project context
  project: {
    id: string;
    sceneCount: number;
    totalDuration: number;
    dominantColors?: string[];
    commonElements?: string[];
  };
  
  // Current scene context (for edits)
  currentScene?: {
    id: string;
    name: string;
    duration: number;
    elements: string[];
    colors: string[];
  };
  
  // User preferences (learned over time)
  userPreferences: {
    preferredStyle?: 'minimal' | 'detailed' | 'animated';
    brandColors?: string[];
    fontPreferences?: string[];
    commonRequests?: string[];
  };
  
  // Conversation context
  recentMessages: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>;
  
  // Visual context (from images)
  visualContext?: {
    dominantColors: string[];
    detectedElements: string[];
    style: string;
    layout: string;
    mood: string;
  };
}

export interface BrainDecision {
  toolName: 'addScene' | 'editScene' | 'deleteScene';
  confidence: number;
  reasoning: string;
  chatResponse: string;
  
  toolContext: {
    // For all tools
    userPrompt: string;
    
    // For edit/delete
    targetSceneId?: string;
    
    // For edit
    editType?: 'surgical' | 'creative' | 'error-fix';
    
    // For add/edit with images
    imageUrls?: string[];
    visionAnalysis?: VisionAnalysis;
    
    // Style hints for generation
    styleHints?: {
      colors?: string[];
      elements?: string[];
      mood?: string;
      reference?: string;
    };
  };
}

export interface VisionAnalysis {
  description: string;
  colors: string[];
  elements: string[];
  style: string;
  suggestions: string[];
}
```

### Step 2: Smart Context Builder

Update `/src/brain/services/contextBuilder.ts`:
```typescript
import { databaseService } from "~/server/api/services/database.service";
import { openai } from "~/server/services/ai/client";
import type { BrainContext, VisionAnalysis } from "../types/enhanced";

export class SmartContextBuilder {
  /**
   * Build comprehensive context for decision making
   */
  async buildContext(input: {
    projectId: string;
    userId: string;
    imageUrls?: string[];
  }): Promise<BrainContext> {
    // Fetch all relevant data in parallel
    const [
      scenes,
      messages,
      userPreferences,
      visualContext
    ] = await Promise.all([
      databaseService.getProjectScenes(input.projectId),
      this.getRecentMessages(input.projectId),
      this.getUserPreferences(input.userId),
      input.imageUrls ? this.analyzeImages(input.imageUrls) : undefined,
    ]);
    
    // Analyze project patterns
    const projectAnalysis = this.analyzeProject(scenes);
    
    return {
      project: {
        id: input.projectId,
        sceneCount: scenes.length,
        totalDuration: scenes.reduce((sum, s) => sum + s.duration, 0),
        dominantColors: projectAnalysis.colors,
        commonElements: projectAnalysis.elements,
      },
      userPreferences,
      recentMessages: messages,
      visualContext,
    };
  }
  
  /**
   * Analyze uploaded images for style and content
   */
  private async analyzeImages(imageUrls: string[]): Promise<VisionAnalysis> {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: `Analyze these images for motion graphics generation. Extract:
            1. Dominant colors (hex codes)
            2. Visual elements and shapes
            3. Overall style (minimal, detailed, corporate, playful, etc)
            4. Layout structure
            5. Mood/feeling
            Return as JSON.`
        },
        {
          role: "user",
          content: [
            { type: "text", text: "Analyze these reference images:" },
            ...imageUrls.map(url => ({
              type: "image_url" as const,
              image_url: { url }
            }))
          ]
        }
      ],
      response_format: { type: "json_object" }
    });
    
    return JSON.parse(response.choices[0].message.content!);
  }
  
  /**
   * Analyze project for patterns and style
   */
  private analyzeProject(scenes: SceneEntity[]): {
    colors: string[];
    elements: string[];
  } {
    if (scenes.length === 0) {
      return { colors: [], elements: [] };
    }
    
    // Extract colors and elements from existing scenes
    const colors = new Set<string>();
    const elements = new Set<string>();
    
    scenes.forEach(scene => {
      // Simple pattern matching for colors
      const colorMatches = scene.tsxCode.match(/#[0-9A-Fa-f]{6}/g) || [];
      colorMatches.forEach(c => colors.add(c));
      
      // Extract common elements
      const elementMatches = scene.tsxCode.match(/<(\w+)/g) || [];
      elementMatches.forEach(e => elements.add(e.slice(1)));
    });
    
    return {
      colors: Array.from(colors).slice(0, 5),
      elements: Array.from(elements).slice(0, 10),
    };
  }
  
  /**
   * Get user preferences from history
   */
  private async getUserPreferences(userId: string): Promise<BrainContext['userPreferences']> {
    // TODO: Implement preference learning from user history
    // For now, return defaults
    return {
      preferredStyle: 'minimal',
      brandColors: ['#000000', '#FFFFFF'],
    };
  }
  
  private async getRecentMessages(projectId: string): Promise<BrainContext['recentMessages']> {
    const messages = await databaseService.getRecentMessages(projectId, 10);
    return messages.map(m => ({
      role: m.role,
      content: m.content,
      timestamp: m.createdAt,
    }));
  }
}
```

### Step 3: Intelligent Decision Maker

Update `/src/brain/services/decisionMaker.ts`:
```typescript
import { openai } from "~/server/services/ai/client";
import type { BrainContext, BrainDecision } from "../types/enhanced";

export class IntelligentDecisionMaker {
  /**
   * Make smart decisions based on context
   */
  async decide(
    prompt: string,
    context: BrainContext
  ): Promise<BrainDecision> {
    const systemPrompt = this.buildSystemPrompt(context);
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: this.buildUserPrompt(prompt, context) }
      ],
      response_format: { type: "json_object" },
      temperature: 0.3, // Lower for more consistent decisions
    });
    
    const decision = JSON.parse(response.choices[0].message.content!);
    
    // Post-process decision
    return this.enhanceDecision(decision, context);
  }
  
  private buildSystemPrompt(context: BrainContext): string {
    return `You are an intelligent motion graphics assistant. Analyze user requests and decide:
    
1. Which tool to use:
   - addScene: Creating new scenes
   - editScene: Modifying existing scenes (including "make it look like this")
   - deleteScene: Removing scenes

2. For "make it look like this" + image:
   - ALWAYS use editScene with creative type
   - Extract style from uploaded image
   - Provide detailed style hints

3. Understand context:
   - Current project has ${context.project.sceneCount} scenes
   - Dominant colors: ${context.project.dominantColors?.join(', ') || 'none'}
   - User prefers: ${context.userPreferences.preferredStyle} style
   ${context.visualContext ? `- Uploaded image shows: ${context.visualContext.style} style` : ''}

4. Generate intelligent responses:
   - Be specific about what you're doing
   - Reference the user's actual request
   - Sound natural and helpful

Return JSON with:
{
  "toolName": "addScene|editScene|deleteScene",
  "confidence": 0.0-1.0,
  "reasoning": "Why this tool and approach",
  "chatResponse": "Natural, specific response to user",
  "editType": "surgical|creative|error-fix",
  "targetSceneId": "scene-id-if-editing",
  "styleHints": {
    "colors": ["#hex"],
    "elements": ["element names"],
    "mood": "energetic|calm|professional|playful",
    "reference": "description of style reference"
  }
}`;
  }
  
  private buildUserPrompt(prompt: string, context: BrainContext): string {
    let fullPrompt = `User request: "${prompt}"`;
    
    if (context.visualContext) {
      fullPrompt += `\n\nUploaded image analysis:
- Style: ${context.visualContext.style}
- Colors: ${context.visualContext.colors.join(', ')}
- Elements: ${context.visualContext.elements.join(', ')}
- Mood: ${context.visualContext.mood}`;
    }
    
    if (context.recentMessages.length > 0) {
      const lastUserMessage = context.recentMessages
        .filter(m => m.role === 'user')
        .slice(-1)[0];
      
      if (lastUserMessage && lastUserMessage.content !== prompt) {
        fullPrompt += `\n\nPrevious request: "${lastUserMessage.content}"`;
      }
    }
    
    return fullPrompt;
  }
  
  private enhanceDecision(
    decision: any,
    context: BrainContext
  ): BrainDecision {
    // Smart scene selection for edits
    if (decision.toolName === 'editScene' && !decision.targetSceneId) {
      // If no specific scene mentioned, edit the last one
      const lastScene = context.project.sceneCount > 0 
        ? context.currentScene?.id 
        : undefined;
      
      decision.targetSceneId = lastScene;
    }
    
    // Enhance style hints with project context
    if (decision.styleHints && context.project.dominantColors) {
      decision.styleHints.colors = [
        ...(decision.styleHints.colors || []),
        ...context.project.dominantColors
      ].slice(0, 5);
    }
    
    // Add context to tool parameters
    return {
      toolName: decision.toolName,
      confidence: decision.confidence || 0.9,
      reasoning: decision.reasoning,
      chatResponse: decision.chatResponse,
      toolContext: {
        userPrompt: context.recentMessages[0]?.content || '',
        targetSceneId: decision.targetSceneId,
        editType: decision.editType,
        imageUrls: context.visualContext ? context.imageUrls : undefined,
        visionAnalysis: context.visualContext,
        styleHints: decision.styleHints,
      }
    };
  }
}
```

### Step 4: Update Brain Orchestrator

Update `/src/brain/orchestratorNEW.ts`:
```typescript
import { SmartContextBuilder } from "./services/contextBuilder";
import { IntelligentDecisionMaker } from "./services/decisionMaker";
import type { BrainDecision } from "./types/enhanced";

export class BrainOrchestrator {
  private contextBuilder = new SmartContextBuilder();
  private decisionMaker = new IntelligentDecisionMaker();
  
  async decide(input: {
    prompt: string;
    imageUrls?: string[];
    projectId: string;
    userId: string;
    context?: any;
  }): Promise<BrainDecision> {
    // Build comprehensive context
    const context = await this.contextBuilder.buildContext({
      projectId: input.projectId,
      userId: input.userId,
      imageUrls: input.imageUrls,
    });
    
    // Add any additional context from input
    if (input.context?.currentScene) {
      context.currentScene = input.context.currentScene;
    }
    
    // Make intelligent decision
    const decision = await this.decisionMaker.decide(
      input.prompt,
      context
    );
    
    // Log for debugging
    console.log('[Brain] Decision:', {
      prompt: input.prompt,
      tool: decision.toolName,
      confidence: decision.confidence,
      hasImages: !!input.imageUrls,
      reasoning: decision.reasoning,
    });
    
    return decision;
  }
}

export const orchestrator = new BrainOrchestrator();
```

## Example Flows

### 1. "Make it look like this" + Screenshot
```typescript
// User uploads screenshot of blue gradient design
Input: {
  prompt: "Make it look like this",
  imageUrls: ["https://example.com/screenshot.png"]
}

// Brain analyzes image
visualContext: {
  style: "modern gradient",
  colors: ["#0066FF", "#00CCFF"],
  elements: ["gradient", "circle", "text"],
  mood: "professional"
}

// Decision
{
  toolName: "editScene",
  editType: "creative",
  confidence: 0.95,
  reasoning: "User wants to match the uploaded design style",
  chatResponse: "I'll update your scene to match that modern gradient style with blue tones",
  styleHints: {
    colors: ["#0066FF", "#00CCFF"],
    mood: "professional",
    reference: "modern gradient design with circular elements"
  }
}
```

### 2. "Add intro scene"
```typescript
// With existing project context
context: {
  project: {
    sceneCount: 3,
    dominantColors: ["#FF0000", "#FFFFFF"],
    commonElements: ["Logo", "Text", "Shape"]
  }
}

// Decision
{
  toolName: "addScene",
  confidence: 0.98,
  reasoning: "User wants to add an intro scene to existing project",
  chatResponse: "I'll create an intro scene that matches your project's red and white theme",
  styleHints: {
    colors: ["#FF0000", "#FFFFFF"],
    elements: ["Logo", "Title"],
    mood: "energetic"
  }
}
```

### 3. "No, make it faster"
```typescript
// With conversation context
recentMessages: [
  { role: "user", content: "Create a transition" },
  { role: "assistant", content: "I've created a smooth transition scene" },
  { role: "user", content: "No, make it faster" }
]

// Decision
{
  toolName: "editScene",
  editType: "surgical",
  targetSceneId: "last-created-scene-id",
  confidence: 0.92,
  reasoning: "User wants to adjust the duration of the just-created transition",
  chatResponse: "I'll speed up that transition for you",
  styleHints: {
    reference: "reduce duration to 50% of current"
  }
}
```

## Testing Plan

### 1. Context Building Tests
```typescript
describe('SmartContextBuilder', () => {
  it('analyzes images correctly', async () => {
    const context = await contextBuilder.buildContext({
      projectId: '123',
      userId: '456',
      imageUrls: ['test-image.png']
    });
    
    expect(context.visualContext).toBeDefined();
    expect(context.visualContext.colors).toBeInstanceOf(Array);
    expect(context.visualContext.style).toBeTruthy();
  });
  
  it('extracts project patterns', async () => {
    // Create scenes with common colors
    await createTestScenes([
      { tsxCode: '<div style={{ color: "#FF0000" }}>Red</div>' },
      { tsxCode: '<div style={{ color: "#FF0000" }}>Also Red</div>' }
    ]);
    
    const context = await contextBuilder.buildContext({ projectId: '123' });
    expect(context.project.dominantColors).toContain('#FF0000');
  });
});
```

### 2. Decision Making Tests
```typescript
describe('IntelligentDecisionMaker', () => {
  it('correctly identifies "make it look like this" intent', async () => {
    const decision = await decisionMaker.decide(
      "Make it look like this",
      mockContextWithImage
    );
    
    expect(decision.toolName).toBe('editScene');
    expect(decision.toolContext.editType).toBe('creative');
    expect(decision.toolContext.visionAnalysis).toBeDefined();
  });
  
  it('provides intelligent chat responses', async () => {
    const decision = await decisionMaker.decide(
      "Add a blue intro",
      mockContext
    );
    
    expect(decision.chatResponse).toContain('blue');
    expect(decision.chatResponse).not.toBe('I will add a scene'); // Not generic
  });
});
```

## Success Criteria

- [ ] "Make it look like this" + image works 95% of the time
- [ ] Context includes previous scenes and styles
- [ ] Chat responses are specific and helpful
- [ ] Correct tool selection 95% of the time
- [ ] Image analysis provides actionable style hints

## Dependencies

- OpenAI API with GPT-4 Vision
- Database service for context fetching
- Type definitions from previous tickets

## Time Estimate

- Enhanced types: 1 hour
- Context builder: 3 hours
- Decision maker: 3 hours
- Testing: 1 hour
- **Total: 8 hours**