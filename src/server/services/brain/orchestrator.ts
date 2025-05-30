// src/server/services/brain/orchestrator.ts
import { openai } from "~/server/lib/openai";
import { addSceneTool } from "~/lib/services/mcp-tools/addScene";
import { editSceneTool } from "~/lib/services/mcp-tools/editScene";
import { deleteSceneTool } from "~/lib/services/mcp-tools/deleteScene";
import { askSpecifyTool } from "~/lib/services/mcp-tools/askSpecify";
import { toolRegistry } from "~/lib/services/mcp-tools/registry";
import { type MCPResult } from "~/lib/services/mcp-tools/base";
import { conversationalResponseService } from "~/server/services/conversationalResponse.service";
import { db } from "~/server/db";
import { scenes } from "~/server/db/schema";
import { eq, sql } from "drizzle-orm";

export interface OrchestrationInput {
  prompt: string;
  projectId: string;
  userId: string;
  userContext?: Record<string, unknown>;
  storyboardSoFar?: any[];
  chatHistory?: Array<{role: string, content: string}>;
}

export interface OrchestrationOutput {
  success: boolean;
  result?: any;
  toolUsed?: string;
  reasoning?: string;
  error?: string;
  chatResponse?: string;
  isAskSpecify?: boolean;
  debug?: {
    prompt?: { system: string; user: string };
    response?: string;
    parsed?: any;
  };
}

/**
 * Brain LLM Orchestrator - analyzes user intent and selects appropriate tools
 * Uses GPT-4o-mini for fast, cost-effective intent recognition
 * Now includes conversational responses for better user experience
 */
export class BrainOrchestrator {
  private readonly model = "gpt-4.1-mini";
  private readonly temperature = 0.3; // Low temperature for consistent tool selection
  private toolsRegistered = false;
  
  constructor() {
    // Register the new intelligence-first tools
    if (!this.toolsRegistered) {
      const newSceneTools = [addSceneTool, editSceneTool, deleteSceneTool, askSpecifyTool];
      newSceneTools.forEach(tool => toolRegistry.register(tool));
      this.toolsRegistered = true;
    }
  }
  
  async processUserInput(input: OrchestrationInput): Promise<OrchestrationOutput> {
    try {
      console.log('\n[DEBUG] PROCESSING USER INPUT:', input.prompt);
      console.log(`[DEBUG] PROJECT: ${input.projectId}, SCENES: ${input.storyboardSoFar?.length || 0}`);
      
      if (input.userContext) {
        console.log(`[DEBUG] USER CONTEXT:`, input.userContext);
      }
      
      if (input.chatHistory?.length) {
        console.log(`[DEBUG] CHAT HISTORY (last 3):`, 
          input.chatHistory.slice(-3).map(msg => `${msg.role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`))
      }
      
      // 1. Analyze intent and select tool(s)
      const toolSelection = await this.analyzeIntent(input);
      
      if (!toolSelection.success) {
        console.log(`[DEBUG] INTENT ANALYSIS FAILED:`, toolSelection.error);
        return {
          success: false,
          error: toolSelection.error || "Failed to analyze user intent",
        };
      }
      
      console.log(`[DEBUG] TOOL SELECTED:`, toolSelection.toolName || 'multi-step workflow');
      console.log(`[DEBUG] REASONING:`, toolSelection.reasoning || 'No reasoning provided');
      if (toolSelection.targetSceneId) {
        console.log(`[DEBUG] TARGET SCENE ID:`, toolSelection.targetSceneId);
        // Verify the scene exists
        const sceneExists = input.storyboardSoFar?.some(scene => scene.id === toolSelection.targetSceneId);
        if (!sceneExists) {
          console.warn(`[DEBUG] WARNING: Selected scene ID ${toolSelection.targetSceneId} NOT FOUND in storyboard`);
        }
      }
      
      // 2. Handle multi-step workflow
      if (toolSelection.workflow && toolSelection.workflow.length > 0) {
        return await this.executeWorkflow(input, toolSelection.workflow, toolSelection.reasoning);
      }
      
      // 3. Handle single tool operation (existing logic)
      const tool = toolRegistry.get(toolSelection.toolName!);
      if (!tool) {
        return {
          success: false,
          error: `Tool ${toolSelection.toolName} not found`,
        };
      }
      
      // Execute single tool
      const toolInput = await this.prepareToolInput(input, toolSelection);
      const result = await tool.run(toolInput);
      
      return await this.processToolResult(result, toolSelection.toolName!, input);
      
    } catch (error) {
      console.error("[BrainOrchestrator] Error:", error);
      return await this.handleError(error, input);
    }
  }
  
  /**
   * Execute a multi-step workflow
   */
  private async executeWorkflow(
    input: OrchestrationInput, 
    workflow: Array<{toolName: string, context: string, dependencies?: string[]}>,
    reasoning?: string
  ): Promise<OrchestrationOutput> {
    console.log(`[BrainOrchestrator] Executing workflow with ${workflow.length} steps`);
    
    const workflowResults: Record<string, any> = {};
    let finalResult: any = null;
    let combinedChatResponse = "";
    
    for (let i = 0; i < workflow.length; i++) {
      const step = workflow[i];
      if (!step) {
        throw new Error(`Workflow step ${i + 1} is undefined`);
      }
      
      const stepKey = `step${i + 1}_result`;
      
      console.log(`[BrainOrchestrator] Executing step ${i + 1}: ${step.toolName} - ${step.context}`);
      
      try {
        // Get the tool
        const tool = toolRegistry.get(step.toolName);
        if (!tool) {
          throw new Error(`Tool ${step.toolName} not found in workflow step ${i + 1}`);
        }
        
        // Prepare input with workflow context
        const stepInput = await this.prepareWorkflowStepInput(input, step, workflowResults);
        
        // Execute the tool
        const stepResult = await tool.run(stepInput);
        
        // Process and store result
        const processedResult = await this.processToolResult(stepResult, step.toolName, input);
        workflowResults[stepKey] = processedResult;
        
        // Accumulate chat responses
        if (processedResult.chatResponse) {
          combinedChatResponse += processedResult.chatResponse + " ";
        }
        
        // Update final result with the last successful step
        if (processedResult.success) {
          finalResult = processedResult.result;
        }
        
        console.log(`[BrainOrchestrator] Step ${i + 1} completed: ${processedResult.success ? 'SUCCESS' : 'FAILED'}`);
        
      } catch (stepError) {
        console.error(`[BrainOrchestrator] Workflow step ${i + 1} failed:`, stepError);
        
        // Decide whether to continue or fail the entire workflow
        // For now, we'll fail the entire workflow if any step fails
        return {
          success: false,
          error: `Workflow failed at step ${i + 1} (${step.toolName}): ${stepError instanceof Error ? stepError.message : 'Unknown error'}`,
          chatResponse: combinedChatResponse.trim() || "I started working on your request but encountered an issue.",
        };
      }
    }
    
    console.log(`[BrainOrchestrator] Workflow completed successfully with ${workflow.length} steps`);
    
    return {
      success: true,
      result: finalResult,
      toolUsed: `workflow_${workflow.length}_steps`,
      reasoning: reasoning || "Multi-step workflow completed",
      chatResponse: combinedChatResponse.trim() || "I've completed all the requested changes!",
    };
  }
  
  /**
   * Prepare input for a workflow step
   */
  private async prepareWorkflowStepInput(
    originalInput: OrchestrationInput,
    step: {toolName: string, context: string, dependencies?: string[]},
    workflowResults: Record<string, any>
  ): Promise<Record<string, unknown>> {
    // Start with the original tool input preparation
    const baseInput = await this.prepareToolInput(originalInput, { toolName: step.toolName });
    
    // Add workflow-specific context
    return {
      ...baseInput,
      workflowContext: step.context,
      workflowStep: step.toolName,
      previousResults: workflowResults,
    };
  }
  
  /**
   * Process tool result and handle database operations
   */
  private async processToolResult(result: any, toolName: string, input: OrchestrationInput): Promise<OrchestrationOutput> {
    // 🚨 SPECIAL HANDLING for askSpecify - SIMPLIFIED (no duplicate message saving)
    if (toolName === 'askSpecify') {
      console.log(`[BrainOrchestrator] 🤔 askSpecify tool executed, result:`, result);
      
      let clarificationMessage: string;
      
      if (result.success && result.data?.chatResponse) {
        clarificationMessage = result.data.chatResponse;
        console.log(`[BrainOrchestrator] ✅ Using askSpecify chatResponse`);
      } else if (result.success && result.data?.clarificationQuestion) {
        clarificationMessage = result.data.clarificationQuestion;
        console.log(`[BrainOrchestrator] ✅ Using askSpecify clarificationQuestion`);
      } else {
        // Fallback for failed askSpecify
        clarificationMessage = "I need more information to help you better. Could you please clarify what you'd like me to do?";
        console.log(`[BrainOrchestrator] ⚠️ askSpecify failed, using fallback message`);
      }
      
      // ✅ SIMPLIFIED: Let Generation Router handle ALL message saving (single source of truth)
      // Removed duplicate conversationalResponseService.sendChatMessage() call
      
      return {
        success: true, // Always return success for askSpecify
        result: result.data,
        toolUsed: toolName,
        reasoning: result.data?.reasoning || "Clarification requested",
        chatResponse: clarificationMessage,
        isAskSpecify: true, // NEW: Flag to distinguish from scene generation
      };
    }
    
    // 🚨 CRITICAL FIX: Save generated scene to database
    if (result.success && toolName === 'addScene' && result.data) {
      const sceneData = result.data as any;
      if (sceneData.sceneCode && sceneData.sceneName) {
        console.log(`[BrainOrchestrator] Saving scene to database: ${sceneData.sceneName}`);
        
        try {
          // Get next order for the scene
          const maxOrderResult = await db
            .select({ maxOrder: sql<number>`COALESCE(MAX("order"), -1)` })
            .from(scenes)
            .where(eq(scenes.projectId, input.projectId));
          
          const nextOrder = (maxOrderResult[0]?.maxOrder ?? -1) + 1;
          
          // Save scene to database
          const [newScene] = await db.insert(scenes)
            .values({
              projectId: input.projectId,
              name: sceneData.sceneName,
              order: nextOrder,
              tsxCode: sceneData.sceneCode,
              duration: sceneData.duration || 180,
              layoutJson: sceneData.layoutJson,
              props: {}, // Empty props for now
            })
            .returning();
          
          console.log(`[BrainOrchestrator] Scene saved successfully: ${newScene?.id}`);
          
          // Update result to include scene database record
          result.data = {
            ...result.data,
            scene: {
              id: newScene?.id,
              name: newScene?.name,
              tsxCode: newScene?.tsxCode,
              duration: newScene?.duration,
              order: newScene?.order,
            }
          };
          
        } catch (dbError) {
          console.error(`[BrainOrchestrator] Failed to save scene to database:`, dbError);
          // Don't fail the entire operation, but log the error
        }
      }
    }
    
    // 🚨 NEW: Update edited scene in database
    if (result.success && toolName === 'editScene' && result.data) {
      const sceneData = result.data as any;
      const sceneId = input.userContext?.sceneId as string;
      
      if (sceneData.sceneCode && sceneData.sceneName && sceneId && typeof sceneId === 'string') {
        console.log(`[BrainOrchestrator] Updating edited scene in database: ${sceneData.sceneName}`);
        console.log(`[BrainOrchestrator] Applied changes: ${sceneData.changes?.join(', ') || 'none'}`);
        console.log(`[BrainOrchestrator] Preserved: ${sceneData.preserved?.join(', ') || 'none'}`);
        
        try {
          // Update existing scene in database
          const updateData: any = {
            name: sceneData.sceneName,
            tsxCode: sceneData.sceneCode,
            duration: sceneData.duration || 180,
            updatedAt: new Date(),
          };
          
          // Only update layoutJson if it exists (DirectCodeEditor doesn't generate it)
          if (sceneData.layoutJson) {
            updateData.layoutJson = sceneData.layoutJson;
          }
          
          const [updatedScene] = await db.update(scenes)
            .set(updateData)
            .where(eq(scenes.id, sceneId))
            .returning();
          
          console.log(`[BrainOrchestrator] Scene updated successfully: ${updatedScene?.id}`);
          
          // Update result to include updated scene database record
          result.data = {
            ...result.data,
            scene: {
              id: updatedScene?.id,
              name: updatedScene?.name,
              tsxCode: updatedScene?.tsxCode,
              duration: updatedScene?.duration,
              order: updatedScene?.order,
            }
          };
          
        } catch (dbError) {
          console.error(`[BrainOrchestrator] Failed to update scene in database:`, dbError);
          // Don't fail the entire operation, but log the error
        }
      }
    }
    
    // 🚨 NEW: Delete scene from database
    if (result.success && toolName === 'deleteScene' && result.data) {
      const deleteData = result.data as any;
      const sceneIdToDelete = deleteData.deletedSceneId;
      
      if (sceneIdToDelete && typeof sceneIdToDelete === 'string') {
        console.log(`[BrainOrchestrator] Deleting scene from database: ${deleteData.deletedSceneName || sceneIdToDelete}`);
        
        try {
          // Delete the scene from database
          const deletedScenes = await db.delete(scenes)
            .where(eq(scenes.id, sceneIdToDelete))
            .returning();
          
          if (deletedScenes.length > 0) {
            console.log(`[BrainOrchestrator] Scene deleted successfully: ${deletedScenes[0]?.name}`);
            
            // Update result to confirm deletion
            result.data = {
              ...result.data,
              success: true,
              deletedScene: {
                id: deletedScenes[0]?.id,
                name: deletedScenes[0]?.name,
              }
            };
          } else {
            console.warn(`[BrainOrchestrator] No scene found to delete with ID: ${sceneIdToDelete}`);
            result.data = {
              ...result.data,
              success: false,
              error: `Scene not found: ${sceneIdToDelete}`
            };
          }
          
        } catch (dbError) {
          console.error(`[BrainOrchestrator] Failed to delete scene from database:`, dbError);
          result.data = {
            ...result.data,
            success: false,
            error: `Database error: ${dbError instanceof Error ? dbError.message : 'Unknown error'}`
          };
        }
      } else {
        console.warn(`[BrainOrchestrator] Invalid scene ID for deletion: ${sceneIdToDelete}`);
        result.data = {
          ...result.data,
          success: false,
          error: 'Invalid scene ID provided for deletion'
        };
      }
    }
    
    // 5. Extract conversational response from tool result
    let chatResponse: string | undefined;
    if (result.data && typeof result.data === 'object' && 'chatResponse' in result.data) {
      chatResponse = (result.data as any).chatResponse;
      
      // ✅ SIMPLIFIED: Let Generation Router handle ALL message saving (single source of truth)
      // Removed duplicate conversationalResponseService.sendChatMessage() call
    }
    
    // Propagate debug info if present
    let debug = undefined;
    if (result.data && typeof result.data === 'object' && 'debug' in result.data) {
      debug = (result.data as any).debug;
    }
    
    return {
      success: result.success,
      result: result.data,
      toolUsed: toolName,
      reasoning: result.reasoning,
      error: result.error?.message,
      chatResponse,
    };
  }
  
  private async analyzeIntent(input: OrchestrationInput): Promise<{
    success: boolean;
    toolName?: string;
    reasoning?: string;
    toolInput?: Record<string, unknown>;
    targetSceneId?: string;
    workflow?: Array<{toolName: string, context: string, dependencies?: string[]}>;
    error?: string;
    clarificationNeeded?: string;
  }> {
    // Build prompts for the LLM
    const systemPrompt = this.buildIntentAnalysisPrompt();
    const userPrompt = this.buildUserPrompt(input);
    
    // Log the prompt information (summarized)
    console.log(`[DEBUG] LLM SYSTEM PROMPT LENGTH: ${systemPrompt.length} chars`);
    console.log(`[DEBUG] LLM USER PROMPT: ${userPrompt.substring(0, 200)}...`);
    
    // Log storyboard info (if available)
    if (input.storyboardSoFar?.length) {
      console.log(`[DEBUG] STORYBOARD SCENE IDS:`, 
        input.storyboardSoFar.map(scene => {
          return { id: scene.id, name: scene.name, order: scene.order || '?' };
        }));
    }
    
    try {
      // Log the LLM call parameters
      console.log(`[DEBUG] CALLING LLM: ${this.model} }`);
      
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
      
      // Log the raw LLM response
      console.log(`[DEBUG] RAW LLM RESPONSE: ${rawOutput}`);
      
      const parsed = JSON.parse(rawOutput);
      
      // Log detailed parsed data
      console.log(`[DEBUG] PARSED TOOL_NAME: ${parsed.toolName || 'none'}`);
      console.log(`[DEBUG] PARSED REASONING: ${parsed.reasoning || 'none'}`);
      console.log(`[DEBUG] PARSED TARGET_SCENE_ID: ${parsed.targetSceneId || 'none'}`);
      console.log(`[DEBUG] PARSED CLARIFICATION_NEEDED: ${parsed.clarificationNeeded || 'none'}`);
      
      // Check if input contains a reference to modifying existing content
      const editKeywords = ['edit', 'change', 'modify', 'update', 'fix', 'adjust', 'revise'];
      const containsEditKeyword = editKeywords.some(keyword => 
        input.prompt.toLowerCase().includes(keyword));
      
      if (containsEditKeyword && parsed.toolName === 'addScene') {
        console.log(`[DEBUG] POTENTIAL MISMATCH: User prompt contains edit keywords, but LLM selected 'addScene'`);
        console.log(`[DEBUG] USER CONTEXT SCENE ID: ${input.userContext?.sceneId || 'none'}`);
      }
      
      // Check if this is a multi-step workflow
      if (parsed.workflow && Array.isArray(parsed.workflow)) {
        console.log(`[DEBUG] Multi-step workflow detected: ${parsed.workflow.length} steps`);
        console.log(`[DEBUG] WORKFLOW DETAILS:`, JSON.stringify(parsed.workflow, null, 2));
        return {
          success: true,
          workflow: parsed.workflow,
          reasoning: parsed.reasoning || "Multi-step workflow planned",
        };
      }
      
      // Single tool operation - extract targetSceneId AND clarificationNeeded
      const result: any = {
        success: true,
        toolName: parsed.toolName,
        reasoning: parsed.reasoning,
        toolInput: parsed.toolInput || {},
      };
      
      // 🚨 CRITICAL FIX: Extract clarificationNeeded from top-level parsed response
      if (parsed.clarificationNeeded) {
        result.clarificationNeeded = parsed.clarificationNeeded;
        console.log(`[DEBUG] EXTRACTED CLARIFICATION_NEEDED: ${parsed.clarificationNeeded}`);
      }
      
      // CRITICAL FIX: Extract targetSceneId from Brain LLM response
      if (parsed.targetSceneId) {
        result.targetSceneId = parsed.targetSceneId;
        console.log(`[DEBUG] BRAIN SELECTED SCENE: ${parsed.targetSceneId}`);
        
        // Double-check if the scene actually exists in the storyboard
        const sceneExists = input.storyboardSoFar?.some(scene => scene.id === parsed.targetSceneId);
        if (!sceneExists) {
          console.warn(`[DEBUG] WARNING: Selected scene ID ${parsed.targetSceneId} NOT FOUND in storyboard`);
        }
      } else if (parsed.toolName === 'editScene') {
        console.warn(`[DEBUG] WARNING: editScene selected but no targetSceneId provided`);
      }
      
      // Log the final decision
      console.log(`[DEBUG] FINAL DECISION:`, result);
      
      return result;
      
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
    
    return `You are an intelligent intent analyzer for a motion graphics creation system. Your job is to analyze user requests and select the appropriate tool(s).

AVAILABLE TOOLS:
${availableTools.map(tool => `- ${tool.name}: ${tool.description}`).join('\n')}

CRITICAL: You are responsible for SCENE TARGETING based on conversation context. DO NOT rely on frontend tagging.

SCENE TARGETING RULES:
1. If user says "edit scene 1" or "change scene 2" → Look at CURRENT STORYBOARD to find scene with that order/number
2. If user references "the title" or "that animation" → Look at CHAT HISTORY to see which scene they're discussing
3. If user says "make it blue" or "add text" without specifying → Look at CHAT HISTORY for recent scene context
4. If user says "create new scene" or describes something completely new → Use addScene
5. If user says "delete scene X" → Use deleteScene
6. If user says "delete scene" - Use AskSpecify to clarify which scene to delete

🕐 DURATION & TIMING RULES:
7. If user mentions duration/timing (e.g., "make it 3 seconds", "shorter", "longer") → Check for clarification context first!
8. 🚨 NEW: If CLARIFICATION CONTEXT indicates this is a follow-up to askSpecify → DON'T use askSpecify again, proceed with editScene
9. Duration ambiguity examples that REQUIRE askSpecify (ONLY if NOT a follow-up):
   - "make it 3 seconds" → Could mean: truncate to 3s OR compress animations to fit 3s
   - "make it shorter" → Could mean: reduce total duration OR speed up animations
   - "slow it down" → Could mean: extend duration OR slower animation speed

TOOL SELECTION RULES:
1. **addScene**: Use when user wants to create a NEW scene or describes something completely different
2. **editScene**: Use when user wants to modify an EXISTING scene (based on context clues or explicit references)
3. **deleteScene**: Use when user explicitly wants to remove a scene
4. **askSpecify**: Use when the request is ambiguous (max 2 clarifications per session)
   - Duration/timing requests (see examples above)
   - Unclear scene references
   - Ambiguous edit requests
   - 🚨 NEVER use askSpecify if CLARIFICATION CONTEXT is present (user already responded to clarification)

CONTEXT ANALYSIS:
- **CHAT HISTORY**: Shows recent conversation about specific scenes
- **CURRENT STORYBOARD**: Shows existing scenes with their IDs, names, and content
- **USER CONTEXT**: May contain sceneId if scene is selected in UI
- **CLARIFICATION CONTEXT**: Indicates user is responding to a previous clarification request

COMPLEX REQUEST DETECTION:
Some user requests require MULTIPLE sequential operations. Examples:
- "take X from scene Y and add it to a new scene" → editScene + addScene
- "remove Y from scene Z and create scene W with Z" → editScene + addScene  
- "delete scene A and merge its content with scene B" → deleteScene + editScene

FOR COMPLEX REQUESTS - Use workflow JSON format:
{
  "workflow": [
    {
      "toolName": "editScene",
      "context": "Remove X from scene Y",
      "dependencies": []
    },
    {
      "toolName": "addScene", 
      "context": "Create new scene with X",
      "dependencies": ["step1_result"]
    }
  ],
  "reasoning": "Complex request requires editing existing scene then creating new scene"
}

FOR SIMPLE REQUESTS - Use single tool JSON format:
{
  "toolName": "addScene|editScene|deleteScene|askSpecify",
  "reasoning": "Brief explanation of why this tool was selected and which scene (if editing)",
  "targetSceneId": "ACTUAL_SCENE_ID_FROM_STORYBOARD", // ONLY for editScene - use REAL ID from CURRENT STORYBOARD
  "clarificationNeeded": "duration_intent|scene_reference|edit_scope" // ONLY for askSpecify
}

CRITICAL: For editScene operations, you MUST extract the REAL scene ID from the CURRENT STORYBOARD data, not placeholder text.

SCENE TARGETING EXAMPLES:
- If storyboard shows: [{"id": "93a47963-06f7-4b8d-8d7c-7f7f4e731a8e", "name": "Scene1_mb9tb465mb1hi"}]
- And user says "change the background" → Use: "targetSceneId": "93a47963-06f7-4b8d-8d7c-7f7f4e731a8e"
- If user has sceneId in context → Use that specific ID
- If multiple scenes exist and user doesn't specify → Use latest scene ID from storyboard

DURATION CLARIFICATION EXAMPLES:
- User: "make it 3 seconds" + NO clarification context → askSpecify with clarificationNeeded: "duration_intent"
- User: "make it 3 seconds" + HAS clarification context → editScene (user already clarified)
- User: "make it shorter" → askSpecify with clarificationNeeded: "duration_intent"  
- User: "slow down the animation" → askSpecify with clarificationNeeded: "duration_intent"

SCENE IDENTIFICATION EXAMPLES:
- "edit scene 1" → Find scene with order:0 in storyboard, use its id as targetSceneId
- "change the title" + recent chat about specific scene → Use that scene's id
- "make the text blue" + user context has sceneId → Use that sceneId

Analyze the user's request and respond with the appropriate JSON format.`;
  }
  
  private buildUserPrompt(input: OrchestrationInput): string {
    const { prompt, storyboardSoFar, chatHistory } = input;
    
    // Filter out the initial welcome message to reduce token bloat
    const filteredChatHistory = chatHistory?.filter(msg => 
      !(msg.role === 'assistant' && msg.content.includes('👋 **Welcome to your new project!**'))
    ) || [];
    
    // 🚨 NEW: Check if this is a follow-up to askSpecify
    const recentMessages = filteredChatHistory.slice(-4); // Last 4 messages
    const lastAssistantMessage = recentMessages.filter(msg => msg.role === 'assistant').pop();
    const isFollowUpToAskSpecify = lastAssistantMessage?.content.includes('do you want to:') || 
                                   lastAssistantMessage?.content.includes('Could you please clarify') ||
                                   lastAssistantMessage?.content.includes('Which scene are you') ||
                                   lastAssistantMessage?.content.includes('more information');
    
    // 🚨 CRITICAL FIX: Provide detailed storyboard information with REAL IDs
    let storyboardInfo = "\nCURRENT STORYBOARD: No scenes yet";
    if (storyboardSoFar && storyboardSoFar.length > 0) {
      storyboardInfo = `\nCURRENT STORYBOARD: ${storyboardSoFar.length} scene(s) exist:`;
      storyboardSoFar.forEach((scene, index) => {
        storyboardInfo += `\n  Scene ${index + 1}: ID="${scene.id}", Name="${scene.name || 'Untitled'}", Order=${scene.order || index}`;
      });
      
      // Add context about selected scene (with null checking)
      if (input.userContext?.sceneId) {
        const selectedScene = storyboardSoFar.find(s => s.id === input.userContext?.sceneId);
        if (selectedScene) {
          storyboardInfo += `\n  SELECTED SCENE: "${selectedScene.name}" (ID: ${selectedScene.id})`;
        }
      }
    }
    
    // Only include chat history if there are meaningful messages (not just welcome)
    const chatContext = filteredChatHistory.length > 0
      ? `\nCHAT HISTORY (for context):\n${filteredChatHistory.slice(-3).map(msg => `${msg.role}: ${msg.content.substring(0, 200)}${msg.content.length > 200 ? '...' : ''}`).join('\n')}`
      : "";

    // 🚨 NEW: Add clarification context if this is a follow-up
    const clarificationContext = isFollowUpToAskSpecify 
      ? `\n\n🤔 CLARIFICATION CONTEXT: The user is responding to a previous clarification request. Analyze their response and proceed with the appropriate tool (addScene, editScene, deleteScene).`
      : "";

    return `USER MESSAGE: "${prompt}"${storyboardInfo}${chatContext}${clarificationContext}

Analyze the user's intent and select the appropriate tool and parameters. For editScene operations, use the EXACT scene ID from the storyboard above.

Respond with valid JSON only.`;
  }
  
  private async prepareToolInput(
    input: OrchestrationInput, 
    toolSelection: { toolName?: string; toolInput?: Record<string, unknown>; targetSceneId?: string; clarificationNeeded?: string }
  ): Promise<Record<string, unknown>> {
    const baseInput = {
      userPrompt: input.prompt,
      sessionId: input.projectId,
      userId: input.userId,
      userContext: input.userContext || {},
    };
    
    // Add tool-specific inputs
    switch (toolSelection.toolName) {
      case "addScene":
        // Calculate proper scene number based on existing scenes
        const nextSceneNumber = (input.storyboardSoFar?.length || 0) + 1;
        
        return {
          ...baseInput,
          projectId: input.projectId,
          storyboardSoFar: input.storyboardSoFar || [],
          sceneNumber: nextSceneNumber, // CRITICAL: Pass calculated scene number
        };
        
      case "editScene":
        // CRITICAL FIX: Use targetSceneId from intent analysis instead of frontend tagging
        const sceneId = toolSelection.targetSceneId || input.userContext?.sceneId;
        if (!sceneId) {
          throw new Error("Scene ID required for editing - Brain LLM should provide targetSceneId");
        }
        
        // Find scene data from storyboard
        const scene = input.storyboardSoFar?.find(s => s.id === sceneId);
        if (!scene) {
          throw new Error(`Scene with ID ${sceneId} not found in storyboard`);
        }
        
        console.log(`[BrainOrchestrator] Editing scene: ${scene.name} (${sceneId})`);
        
        return {
          ...baseInput,
          projectId: input.projectId,
          sceneId: sceneId,
          existingCode: scene.tsxCode || "",
          existingName: scene.name || "Untitled Scene",
          existingDuration: scene.duration || 180,
          storyboardSoFar: input.storyboardSoFar || [],
          chatHistory: input.chatHistory || [],
        };
        
      case "deleteScene":
        // Use targetSceneId for deletion as well
        const deleteSceneId = toolSelection.targetSceneId || input.userContext?.sceneId;
        return {
          ...baseInput,
          sceneId: deleteSceneId || "scene-to-delete",
        };
        
      case "askSpecify":
        // 🚨 CRITICAL FIX: Use clarificationNeeded from top-level LLM response, not toolInput
        const ambiguityTypeFromLLM = toolSelection.clarificationNeeded ||
                                     (toolSelection.toolInput?.clarificationNeeded as string) || 
                                     (toolSelection.toolInput?.ambiguityType as string) || 
                                     "action-unclear";
        
        console.log(`[DEBUG] MAPPED AMBIGUITY TYPE: ${ambiguityTypeFromLLM} (from clarificationNeeded: ${toolSelection.clarificationNeeded})`);
        
        return {
          userPrompt: input.prompt,
          projectId: input.projectId,
          userId: input.userId,
          ambiguityType: ambiguityTypeFromLLM,
          availableScenes: (input.storyboardSoFar || []).map(scene => ({
            id: scene.id,
            name: scene.name || `Scene ${scene.order || '?'}`,
            number: scene.order
          })),
          context: input.userContext || {},
        };  
        
      default:
        return baseInput;
    }
  }

  /**
   * Generate enriched context for code generation
   * Analyzes user intent and provides strategic guidance
   */
  // private async generateCodeGenerationContext(input: OrchestrationInput): Promise<{
  //   userIntent: string;
  //   technicalRecommendations: string[];
  //   uiLibraryGuidance: string;
  //   animationStrategy: string;
  //   previousContext?: string;
  //   focusAreas: string[];
  // }> {
  //   const contextPrompt = `You are an AI Brain analyzing user intent for video code generation.

  // USER REQUEST: "${input.prompt}"

  // EXISTING SCENES: ${input.storyboardSoFar?.length || 0} scenes already created

  // Analyze the user's request and provide strategic guidance for code generation.

  // RESPONSE FORMAT (JSON):
  // {
  //   "userIntent": "What the user really wants to achieve",
  //   "technicalRecommendations": [
  //     "Specific technical approaches to use",
  //     "Recommended patterns or libraries"
  //   ],
  //   "uiLibraryGuidance": "Specific UI library recommendations (e.g., 'Use Flowbite Table component for data display')",
  //   "animationStrategy": "Animation approach and timing strategy",
  //   "focusAreas": [
  //     "Key areas to focus on",
  //     "Most important visual elements"
  //   ],
  //   "previousContext": "Context from existing scenes (if any)"
  // }

  // Provide specific, actionable guidance that will help generate better code.`;

  //   try {
  //     const response = await openai.chat.completions.create({
  //       model: this.model,
  //       messages: [
  //         { role: "system", content: contextPrompt },
  //         { role: "user", content: input.prompt }
  //       ],
  //       temperature: 0.3,
  //       response_format: { type: "json_object" }
  //     });

  //     const content = response.choices[0]?.message?.content;
  //     if (!content) {
  //       throw new Error("No context response from Brain");
  //     }

  //     const parsed = JSON.parse(content);
      
  //     return {
  //       userIntent: parsed.userIntent || "Generate video scene",
  //       technicalRecommendations: parsed.technicalRecommendations || [],
  //       uiLibraryGuidance: parsed.uiLibraryGuidance || "Use appropriate UI components",
  //       animationStrategy: parsed.animationStrategy || "Smooth fade-in animations",
  //       previousContext: parsed.previousContext,
  //       focusAreas: parsed.focusAreas || ["Visual appeal", "Smooth animations"]
  //     };
  //   } catch (error) {
  //     console.warn("[Brain] Failed to generate context, using fallback:", error);
      
  //     // Fallback context
  //     return {
  //       userIntent: "Generate video scene based on user request",
  //       technicalRecommendations: ["Use modern React patterns", "Implement smooth animations"],
  //       uiLibraryGuidance: "Use Flowbite components when appropriate for UI elements",
  //       animationStrategy: "Use interpolate() for smooth transitions with proper timing",
  //       focusAreas: ["Visual appeal", "User experience", "Smooth animations"]
  //     };
  //   }
  // }

  private async handleError(error: any, input: OrchestrationInput): Promise<OrchestrationOutput> {
    console.error("[BrainOrchestrator] Error:", error);
    
    // Generate error response for user
    const errorResponse = await conversationalResponseService.generateContextualResponse({
      operation: 'addScene', // Default operation for error
      userPrompt: input.prompt,
      result: { error: String(error) },
      context: {
        sceneCount: input.storyboardSoFar?.length || 0,
        projectId: input.projectId
      }
    });
    
    // Send error response as chat message
    await conversationalResponseService.sendChatMessage(
      errorResponse, 
      input.projectId, 
      'error'
    );
    
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown orchestration error",
      chatResponse: errorResponse,
    };
  }
}

// Export singleton instance
export const brainOrchestrator = new BrainOrchestrator(); 