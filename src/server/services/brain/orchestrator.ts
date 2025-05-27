import { openai } from "~/server/lib/openai";
import { sceneTools } from "~/lib/services/mcp-tools/scene-tools";
import { toolRegistry } from "~/lib/services/mcp-tools/registry";
import { type MCPResult } from "~/lib/services/mcp-tools/base";

export interface OrchestrationInput {
  prompt: string;
  projectId: string;
  userId: string;
  userContext?: Record<string, unknown>;
  storyboardSoFar?: any[];
}

export interface OrchestrationOutput {
  success: boolean;
  result?: any;
  toolUsed?: string;
  reasoning?: string;
  error?: string;
}

/**
 * Brain LLM Orchestrator - analyzes user intent and selects appropriate tools
 * Uses GPT-4o-mini for fast, cost-effective intent recognition
 */
export class BrainOrchestrator {
  private readonly model = "gpt-4o-mini";
  private readonly temperature = 0.1; // Low temperature for consistent tool selection
  private toolsRegistered = false;
  
  constructor() {
    // Register tools only once to prevent duplicates
    if (!this.toolsRegistered) {
      sceneTools.forEach(tool => toolRegistry.register(tool));
      this.toolsRegistered = true;
    }
  }
  
  async processUserInput(input: OrchestrationInput): Promise<OrchestrationOutput> {
    try {
      // 1. Analyze intent and select tool
      const toolSelection = await this.analyzeIntent(input);
      
      if (!toolSelection.success) {
        return {
          success: false,
          error: toolSelection.error || "Failed to analyze user intent",
        };
      }
      
      // 2. Execute selected tool
      const tool = toolRegistry.get(toolSelection.toolName!);
      if (!tool) {
        return {
          success: false,
          error: `Tool ${toolSelection.toolName} not found`,
        };
      }
      
      // 3. Prepare tool input
      const toolInput = this.prepareToolInput(input, toolSelection);
      
      // 4. Execute tool
      const result = await tool.run(toolInput);
      
      return {
        success: result.success,
        result: result.data,
        toolUsed: toolSelection.toolName,
        reasoning: toolSelection.reasoning,
        error: result.error?.message,
      };
      
    } catch (error) {
      console.error("[BrainOrchestrator] Error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown orchestration error",
      };
    }
  }
  
  private async analyzeIntent(input: OrchestrationInput): Promise<{
    success: boolean;
    toolName?: string;
    reasoning?: string;
    toolInput?: Record<string, unknown>;
    error?: string;
  }> {
    const systemPrompt = this.buildIntentAnalysisPrompt();
    const userPrompt = this.buildUserPrompt(input);
    
    try {
      const response = await openai.chat.completions.create({
        model: this.model,
        temperature: this.temperature,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        response_format: { type: "json_object" },
      });
      
      const rawOutput = response.choices[0]?.message?.content;
      if (!rawOutput) {
        throw new Error("No response from Brain LLM");
      }
      
      const parsed = JSON.parse(rawOutput);
      
      return {
        success: true,
        toolName: parsed.toolName,
        reasoning: parsed.reasoning,
        toolInput: parsed.toolInput || {},
      };
      
    } catch (error) {
      console.error("[BrainOrchestrator] Intent analysis error:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Intent analysis failed",
      };
    }
  }
  
  private buildIntentAnalysisPrompt(): string {
    const availableTools = toolRegistry.getToolDefinitions();
    
    return `You are an intelligent intent analyzer for a motion graphics creation system. Your job is to analyze user requests and select the appropriate tool.

AVAILABLE TOOLS:
${availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

TOOL SELECTION RULES:
1. addScene: Use when user wants to create a new scene, or this is the first scene
2. editScene: Use when user wants to modify an existing scene  
3. deleteScene: Use when user explicitly wants to remove a scene
4. askSpecify: Use when the request is ambiguous (max 2 clarifications per session)

DECISION CRITERIA:
- New scene keywords: "create", "add", "new scene", "make a", "I want"
- Edit keywords: "change", "modify", "edit", "update", "make it", "adjust"
- Delete keywords: "remove", "delete", "get rid of", "take out"
- Ambiguous: Multiple interpretations, missing details, unclear intent

RESPONSE FORMAT (JSON only):
{
  "toolName": "addScene|editScene|deleteScene|askSpecify",
  "reasoning": "Brief explanation of why this tool was selected",
  "confidence": 0.0-1.0,
  "ambiguityType": "multiple_options|missing_details|unclear_intent" // only for askSpecify
}

EXAMPLES:
- "Black background with white text" → addScene (new scene request)
- "Make the text bigger" → editScene (modify existing)
- "Remove the second scene" → deleteScene (explicit removal)
- "Do something cool" → askSpecify (unclear intent)

Be decisive but accurate. When in doubt, prefer askSpecify over guessing.`;
  }
  
  private buildUserPrompt(input: OrchestrationInput): string {
    const contextInfo = input.userContext && Object.keys(input.userContext).length > 0
      ? `\nUSER CONTEXT: ${JSON.stringify(input.userContext, null, 2)}`
      : "";
      
    const storyboardInfo = input.storyboardSoFar && input.storyboardSoFar.length > 0
      ? `\nEXISTING SCENES: ${input.storyboardSoFar.length} scenes in project`
      : "\nFIRST SCENE: No existing scenes";
      
    return `USER REQUEST: "${input.prompt}"${contextInfo}${storyboardInfo}

Analyze this request and select the appropriate tool. Consider the context and existing scenes when making your decision.`;
  }
  
  private prepareToolInput(
    input: OrchestrationInput, 
    toolSelection: { toolName?: string; toolInput?: Record<string, unknown> }
  ): Record<string, unknown> {
    const baseInput = {
      userPrompt: input.prompt,
      sessionId: input.projectId,
      userId: input.userId,
      userContext: input.userContext || {},
    };
    
    // Add tool-specific inputs
    switch (toolSelection.toolName) {
      case "addScene":
        return {
          ...baseInput,
          storyboardSoFar: input.storyboardSoFar || [],
        };
        
      case "editScene":
        // TODO PHASE2: Get current scene from database instead of placeholder
        return {
          ...baseInput,
          sceneId: "current-scene", // TODO PHASE2: Replace with actual scene ID from DB
          currentScene: input.storyboardSoFar?.[0] || {},
        };
        
      case "deleteScene":
        return {
          ...baseInput,
          sceneId: "scene-to-delete", // TODO PHASE2: Extract scene ID from prompt or ask user
        };
        
      case "askSpecify":
        return {
          ...baseInput,
          ambiguityType: toolSelection.toolInput?.ambiguityType || "unclear_intent",
          clarificationCount: 0, // TODO PHASE2: Track in userContext/session
        };
        
      default:
        return baseInput;
    }
  }
}

// Export singleton instance
export const brainOrchestrator = new BrainOrchestrator(); 