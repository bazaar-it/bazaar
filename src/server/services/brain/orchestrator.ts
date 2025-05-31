// src/server/services/brain/orchestrator.ts
import { openai } from "~/server/lib/openai";
import { addSceneTool } from "~/lib/services/mcp-tools/addScene";
import { editSceneTool } from "~/lib/services/mcp-tools/editScene";
import { deleteSceneTool } from "~/lib/services/mcp-tools/deleteScene";
import { fixBrokenSceneTool } from "~/lib/services/mcp-tools/fixBrokenScene";
import { toolRegistry } from "~/lib/services/mcp-tools/registry";
import { type MCPResult } from "~/lib/services/mcp-tools/base";
import { conversationalResponseService } from "~/server/services/conversationalResponse.service";
import { db } from "~/server/db";
import { scenes, sceneIterations } from "~/server/db/schema";
import { eq, sql } from "drizzle-orm";

// ✅ FIXED: Module-level singleton initialization
let toolsInitialized = false;

function initializeTools() {
  if (!toolsInitialized) {
    const newSceneTools = [addSceneTool, editSceneTool, deleteSceneTool, fixBrokenSceneTool];
    newSceneTools.forEach(tool => toolRegistry.register(tool));
    toolsInitialized = true;
    if (process.env.NODE_ENV === 'development') {
      console.log('[BrainOrchestrator] Tools registered successfully');
    }
  }
}

// Initialize tools immediately when module loads
initializeTools();

export interface OrchestrationInput {
  prompt: string;
  projectId: string;
  userId: string;
  userContext?: Record<string, unknown>;
  storyboardSoFar?: any[];
  chatHistory?: Array<{role: string, content: string}>;
  onProgress?: (stage: string, status: string) => void;
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
  private readonly DEBUG = process.env.NODE_ENV === 'development';
  
  constructor() {
    // ✅ FIXED: No tool registration in constructor
    // Tools are initialized at module level to prevent race conditions
  }
  
  async processUserInput(input: OrchestrationInput): Promise<OrchestrationOutput> {
    try {
      if (this.DEBUG) console.log('\n[DEBUG] PROCESSING USER INPUT:', input.prompt);
      if (this.DEBUG) console.log(`[DEBUG] PROJECT: ${input.projectId}, SCENES: ${input.storyboardSoFar?.length || 0}`);
      
      if (input.userContext) {
        if (this.DEBUG) console.log(`[DEBUG] USER CONTEXT:`, input.userContext);
      }
      
      if (input.chatHistory?.length) {
        if (this.DEBUG) console.log(`[DEBUG] CHAT HISTORY (last 3):`, 
          input.chatHistory.slice(-3).map(msg => `${msg.role}: ${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}`))
      }
      
      // 🎯 PROGRESS UPDATE: Starting intent analysis
      input.onProgress?.('🧠 Analyzing your request...', 'building');
      
      // 1. Analyze intent and select tool(s)
      const toolSelection = await this.analyzeIntent(input);
      
      if (!toolSelection.success) {
        if (this.DEBUG) console.log(`[DEBUG] INTENT ANALYSIS FAILED:`, toolSelection.error);
        return {
          success: false,
          error: toolSelection.error || "Failed to analyze user intent",
        };
      }
      
      if (this.DEBUG) console.log(`[DEBUG] TOOL SELECTED:`, toolSelection.toolName || 'multi-step workflow');
      if (this.DEBUG) console.log(`[DEBUG] REASONING:`, toolSelection.reasoning || 'No reasoning provided');
      if (toolSelection.targetSceneId) {
        if (this.DEBUG) console.log(`[DEBUG] TARGET SCENE ID:`, toolSelection.targetSceneId);
        // Verify the scene exists
        const sceneExists = input.storyboardSoFar?.some(scene => scene.id === toolSelection.targetSceneId);
        if (!sceneExists) {
          if (this.DEBUG) console.warn(`[DEBUG] WARNING: Selected scene ID ${toolSelection.targetSceneId} NOT FOUND in storyboard`);
        }
      }
      
      // 2. Handle clarification responses directly (NEW)
      if (toolSelection.needsClarification) {
        if (this.DEBUG) console.log(`[DEBUG] CLARIFICATION NEEDED:`, toolSelection.clarificationQuestion);
        return {
          success: true,
          chatResponse: toolSelection.clarificationQuestion,
          reasoning: toolSelection.reasoning || "Clarification needed",
          isAskSpecify: true, // Keep this flag for compatibility
        };
      }

      // 3. Handle multi-step workflow
      if (toolSelection.workflow && toolSelection.workflow.length > 0) {
        return await this.executeWorkflow(input, toolSelection.workflow, toolSelection.reasoning);
      }
      
      // 4. Handle single tool operation (existing logic)
      if (!toolSelection.toolName) {
        return {
          success: false,
          error: "No tool selected and no clarification provided",
        };
      }

      // 🎯 PROGRESS UPDATE: Tool execution starting
      const toolDisplayName = {
        'addScene': '🎬 Creating your scene...',
        'editScene': '✏️ Editing your scene...',
        'deleteScene': '🗑️ Deleting scene...',
        'fixBrokenScene': '🔧 Fixing broken scene...'
      }[toolSelection.toolName] || '⚙️ Processing...';
      
      input.onProgress?.(toolDisplayName, 'building');

      // 5. Execute single tool
      const tool = toolRegistry.get(toolSelection.toolName!);
      if (!tool) {
        return {
          success: false,
          error: `Tool ${toolSelection.toolName} not found`,
        };
      }
      
      // Execute single tool
      const toolInput = await this.prepareToolInput(input, toolSelection);
      
      // 🎯 NEW: Pass progress callback to tools that support it
      if (toolSelection.toolName === 'addScene' && input.onProgress) {
        (tool as any).setProgressCallback?.(input.onProgress);
      }
      
      // 🎯 NEW: Show complexity-based feedback for editScene
      if (toolSelection.toolName === 'editScene' && input.onProgress && toolSelection.userFeedback) {
        input.onProgress(toolSelection.userFeedback, 'generating');
      }
      
      const result = await tool.run(toolInput);
      
      // 🎯 PROGRESS UPDATE: Tool completed, saving to database
      if (result.success) {
        input.onProgress?.('💾 Saving your scene...', 'building');
      }
      
      return await this.processToolResult(result, toolSelection.toolName!, input, {
        targetSceneId: toolSelection.targetSceneId,
        editComplexity: toolSelection.editComplexity,
        reasoning: toolSelection.reasoning,
      });
      
    } catch (error) {
      if (this.DEBUG) console.error("[BrainOrchestrator] Error:", error);
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
    if (this.DEBUG) console.log(`[BrainOrchestrator] Executing workflow with ${workflow.length} steps`);
    
    const workflowResults: Record<string, any> = {};
    let finalResult: any = null;
    let combinedChatResponse = "";
    
    for (let i = 0; i < workflow.length; i++) {
      const step = workflow[i];
      if (!step) {
        throw new Error(`Workflow step ${i + 1} is undefined`);
      }
      
      const stepKey = `step${i + 1}_result`;
      
      if (this.DEBUG) console.log(`[BrainOrchestrator] Executing step ${i + 1}: ${step.toolName} - ${step.context}`);
      
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
        const processedResult = await this.processToolResult(stepResult, step.toolName, input, {
          reasoning: `Workflow step ${i + 1}: ${step.context}`,
        });
        workflowResults[stepKey] = processedResult;
        
        // Accumulate chat responses
        if (processedResult.chatResponse) {
          combinedChatResponse += processedResult.chatResponse + " ";
        }
        
        // Update final result with the last successful step
        if (processedResult.success) {
          finalResult = processedResult.result;
        }
        
        if (this.DEBUG) console.log(`[BrainOrchestrator] Step ${i + 1} completed: ${processedResult.success ? 'SUCCESS' : 'FAILED'}`);
        
      } catch (stepError) {
        if (this.DEBUG) console.error(`[BrainOrchestrator] Workflow step ${i + 1} failed:`, stepError);
        
        // Decide whether to continue or fail the entire workflow
        // For now, we'll fail the entire workflow if any step fails
        return {
          success: false,
          error: `Workflow failed at step ${i + 1} (${step.toolName}): ${stepError instanceof Error ? stepError.message : 'Unknown error'}`,
          chatResponse: combinedChatResponse.trim() || "I started working on your request but encountered an issue.",
        };
      }
    }
    
    if (this.DEBUG) console.log(`[BrainOrchestrator] Workflow completed successfully with ${workflow.length} steps`);
    
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
  private async processToolResult(result: any, toolName: string, input: OrchestrationInput, toolSelection?: { targetSceneId?: string; editComplexity?: string; reasoning?: string }): Promise<OrchestrationOutput> {
    const startTime = Date.now(); // Track processing time

    // 🚨 CRITICAL FIX: Save generated scene to database
    if (result.success && toolName === 'addScene' && result.data) {
      const sceneData = result.data as any;
      if (sceneData.sceneCode && sceneData.sceneName) {
        if (this.DEBUG) console.log(`[BrainOrchestrator] Saving scene to database: ${sceneData.sceneName}`);
        
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
          
          if (this.DEBUG) console.log(`[BrainOrchestrator] Scene saved successfully: ${newScene?.id}`);
          
          // ✅ NEW: Log scene iteration for tracking
          if (newScene?.id) {
            const processingTime = Date.now() - startTime;
            await this.logSceneIteration({
              sceneId: newScene.id,
              projectId: input.projectId,
              operationType: 'create',
              userPrompt: input.prompt,
              brainReasoning: toolSelection?.reasoning,
              toolReasoning: sceneData.reasoning,
              codeAfter: sceneData.sceneCode,
              generationTimeMs: processingTime,
              modelUsed: this.model,
              temperature: this.temperature,
              sessionId: input.userId, // Using userId as session identifier
            });
          }
          
          // ✅ NEW: Log the complete scene save result
          if (this.DEBUG) {
            console.log(`\n[BrainOrchestrator] 💾 SCENE SAVED TO DATABASE:`);
            console.log(`[BrainOrchestrator] 🆔 Scene ID: ${newScene?.id}`);
            console.log(`[BrainOrchestrator] 📛 Scene name: ${newScene?.name}`);
            console.log(`[BrainOrchestrator] 🎬 Duration: ${newScene?.duration} frames`);
            console.log(`[BrainOrchestrator] 📊 Order: ${newScene?.order}`);
            console.log(`[BrainOrchestrator] 📝 Code length: ${newScene?.tsxCode.length} characters`);
            console.log(`[BrainOrchestrator] 📋 Has layout JSON: ${result.data.layoutJson ? 'YES' : 'NO'}\n`);
          }
          
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
          if (this.DEBUG) console.error(`[BrainOrchestrator] Failed to save scene to database:`, dbError);
          // ✅ FIXED: Return proper error instead of ignoring database failure
          return {
            success: false,
            error: `Failed to create your scene. Please try again.`,
            chatResponse: "I couldn't create your scene right now. Please try again in a moment.",
            toolUsed: toolName,
            reasoning: "Database save operation failed"
          };
        }
      }
    }
    
    // 🚨 NEW: Update edited scene in database
    if (result.success && toolName === 'editScene' && result.data) {
      const sceneData = result.data as any;
      // 🚨 CRITICAL FIX: Use Brain LLM's targetSceneId instead of frontend userContext
      const sceneId = toolSelection?.targetSceneId || input.userContext?.sceneId as string;
      
      if (sceneData.sceneCode && sceneData.sceneName && sceneId && typeof sceneId === 'string') {
        // ✅ CONVERT: Technical name to user-friendly display name
        const displayName = sceneData.sceneName.replace(/^Scene(\d+)_[a-f0-9]+$/, 'Scene $1') || sceneData.sceneName;
        
        if (this.DEBUG) console.log(`[BrainOrchestrator] 🎯 Brain selected scene ID: ${toolSelection?.targetSceneId || 'none'}`);
        if (this.DEBUG) console.log(`[BrainOrchestrator] 🖱️ Frontend selected scene ID: ${input.userContext?.sceneId || 'none'}`);
        if (this.DEBUG) console.log(`[BrainOrchestrator] ✅ Using scene ID for update: ${sceneId}`);
        if (this.DEBUG) console.log(`[BrainOrchestrator] Updating edited scene in database: ${displayName}`);
        if (this.DEBUG) console.log(`[BrainOrchestrator] Applied changes: ${sceneData.changes?.join(', ') || 'none'}`);
        if (this.DEBUG) console.log(`[BrainOrchestrator] Preserved: ${sceneData.preserved?.join(', ') || 'none'}`);
        
        try {
          // Get the current scene for "before" tracking
          const currentScene = await db.query.scenes.findFirst({
            where: eq(scenes.id, sceneId),
          });

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
          
          if (this.DEBUG) console.log(`[BrainOrchestrator] Scene updated successfully: ${updatedScene?.id}`);
          
          // ✅ NEW: Log scene iteration for tracking
          if (updatedScene?.id) {
            const processingTime = Date.now() - startTime;
            await this.logSceneIteration({
              sceneId: updatedScene.id,
              projectId: input.projectId,
              operationType: 'edit',
              editComplexity: toolSelection?.editComplexity as 'surgical' | 'creative' | 'structural',
              userPrompt: input.prompt,
              brainReasoning: toolSelection?.reasoning,
              toolReasoning: sceneData.reasoning,
              codeBefore: currentScene?.tsxCode,
              codeAfter: sceneData.sceneCode,
              changesApplied: sceneData.changes,
              changesPreserved: sceneData.preserved,
              generationTimeMs: processingTime,
              modelUsed: this.model,
              temperature: this.temperature,
              sessionId: input.userId,
            });

            // ✅ NEW: Check for re-editing patterns (user dissatisfaction)
            await this.markReEditedScenes(sceneId, input.projectId);
          }
          
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
          if (this.DEBUG) console.error(`[BrainOrchestrator] Failed to update scene in database:`, dbError);
          // ✅ FIXED: Return proper error instead of ignoring database failure
          return {
            success: false,
            error: `Failed to update your scene. Please try again.`,
            chatResponse: "I couldn't update your scene right now. Please try again in a moment.",
            toolUsed: toolName,
            reasoning: "Database update operation failed"
          };
        }
      }
    }
    
    // 🚨 NEW: Delete scene from database
    if (result.success && toolName === 'deleteScene' && result.data) {
      const deleteData = result.data as any;
      const sceneIdToDelete = deleteData.deletedSceneId;
      
      if (sceneIdToDelete && typeof sceneIdToDelete === 'string') {
        // ✅ CONVERT: Technical name to user-friendly display name  
        const displayName = deleteData.deletedSceneName?.replace(/^Scene(\d+)_[a-f0-9]+$/, 'Scene $1') || deleteData.deletedSceneName || sceneIdToDelete;
        
        if (this.DEBUG) console.log(`[BrainOrchestrator] Deleting scene from database: ${displayName}`);
        
        try {
          // Get the scene before deletion for tracking
          const sceneToDelete = await db.query.scenes.findFirst({
            where: eq(scenes.id, sceneIdToDelete),
          });

          // Delete the scene from database
          const deletedScenes = await db.delete(scenes)
            .where(eq(scenes.id, sceneIdToDelete))
            .returning();
          
          if (deletedScenes.length > 0) {
            if (this.DEBUG) console.log(`[BrainOrchestrator] Scene deleted successfully: ${deletedScenes[0]?.name}`);
            
            // ✅ NEW: Log scene iteration for tracking
            const processingTime = Date.now() - startTime;
            await this.logSceneIteration({
              sceneId: sceneIdToDelete,
              projectId: input.projectId,
              operationType: 'delete',
              userPrompt: input.prompt,
              brainReasoning: toolSelection?.reasoning,
              toolReasoning: deleteData.reasoning,
              codeBefore: sceneToDelete?.tsxCode,
              generationTimeMs: processingTime,
              modelUsed: this.model,
              temperature: this.temperature,
              sessionId: input.userId,
            });
            
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
            if (this.DEBUG) console.warn(`[BrainOrchestrator] No scene found to delete with ID: ${sceneIdToDelete}`);
            result.data = {
              ...result.data,
              success: false,
              error: `Scene not found: ${sceneIdToDelete}`
            };
          }
          
        } catch (dbError) {
          if (this.DEBUG) console.error(`[BrainOrchestrator] Failed to delete scene from database:`, dbError);
          result.data = {
            ...result.data,
            success: false,
            error: `Failed to delete your scene. Please try again.`,
            chatResponse: "I couldn't delete your scene right now. Please try again in a moment.",
          };
        }
      } else {
        if (this.DEBUG) console.warn(`[BrainOrchestrator] Invalid scene ID for deletion: ${sceneIdToDelete}`);
        result.data = {
          ...result.data,
          success: false,
          error: 'Invalid scene ID provided for deletion'
        };
      }
    }
    
    // 🚨 NEW: Fix broken scene in database
    if (result.success && toolName === 'fixBrokenScene' && result.data) {
      const fixData = result.data as any;
      const fixSceneId = fixData.sceneId;
      
      if (fixSceneId && typeof fixSceneId === 'string') {
        // ✅ CONVERT: Technical name to user-friendly display name  
        const displayName = fixData.sceneName?.replace(/^Scene(\d+)_[a-f0-9]+$/, 'Scene $1') || fixData.sceneName || fixSceneId;
        
        if (this.DEBUG) console.log(`[BrainOrchestrator] Fixing broken scene in database: ${displayName}`);
        
        try {
          // Update the scene in the database
          const updateData: any = {
            name: fixData.sceneName,
            tsxCode: fixData.fixedCode,
            duration: fixData.duration || 180,
            updatedAt: new Date(),
          };
          
          // Only update tsxCode if it exists (DirectCodeEditor doesn't generate it)
          if (fixData.fixedCode) {
            updateData.tsxCode = fixData.fixedCode;
          }
          
          const [fixedScene] = await db.update(scenes)
            .set(updateData)
            .where(eq(scenes.id, fixSceneId))
            .returning();
          
          if (this.DEBUG) console.log(`[BrainOrchestrator] Scene fixed successfully: ${fixedScene?.id}`);
          
          // Update result to include fixed scene database record
          result.data = {
            ...result.data,
            scene: {
              id: fixedScene?.id,
              name: fixedScene?.name,
              tsxCode: fixedScene?.tsxCode,
              duration: fixedScene?.duration,
              order: fixedScene?.order,
            }
          };
          
        } catch (dbError) {
          if (this.DEBUG) console.error(`[BrainOrchestrator] Failed to fix scene in database:`, dbError);
          result.data = {
            ...result.data,
            success: false,
            error: `Failed to fix your scene. Please try again.`,
            chatResponse: "I couldn't fix your scene right now. Please try again in a moment.",
          };
        }
      } else {
        if (this.DEBUG) console.warn(`[BrainOrchestrator] Invalid scene ID for fixing: ${fixSceneId}`);
        result.data = {
          ...result.data,
          success: false,
          error: 'Invalid scene ID provided for fixing'
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
    needsClarification?: boolean;
    clarificationQuestion?: string;
    editComplexity?: string;
    userFeedback?: string;
  }> {
    // Build prompts for the LLM
    const systemPrompt = this.buildIntentAnalysisPrompt();
    const userPrompt = this.buildUserPrompt(input);
    
    // Log the prompt information (summarized)
    if (this.DEBUG) console.log(`[DEBUG] LLM SYSTEM PROMPT LENGTH: ${systemPrompt.length} chars`);
    if (this.DEBUG) console.log(`[DEBUG] LLM USER PROMPT: ${userPrompt.substring(0, 200)}...`);
    
    // Log storyboard info (if available)
    if (input.storyboardSoFar?.length) {
      if (this.DEBUG) console.log(`[DEBUG] STORYBOARD SCENE IDS:`, 
        input.storyboardSoFar.map(scene => {
          return { id: scene.id, name: scene.name, order: scene.order || '?' };
        }));
    }
    
    try {
      // Log the LLM call parameters
      if (this.DEBUG) console.log(`[DEBUG] CALLING LLM: ${this.model} }`);
      
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
      if (this.DEBUG) console.log(`[DEBUG] RAW LLM RESPONSE: ${rawOutput}`);
      
      const parsed = JSON.parse(rawOutput);
      
      // Log detailed parsed data
      if (this.DEBUG) console.log(`[DEBUG] PARSED TOOL_NAME: ${parsed.toolName || 'none'}`);
      if (this.DEBUG) console.log(`[DEBUG] PARSED REASONING: ${parsed.reasoning || 'none'}`);
      if (this.DEBUG) console.log(`[DEBUG] PARSED TARGET_SCENE_ID: ${parsed.targetSceneId || 'none'}`);
      if (this.DEBUG) console.log(`[DEBUG] PARSED CLARIFICATION_NEEDED: ${parsed.clarificationNeeded || 'none'}`);
      if (this.DEBUG) console.log(`[DEBUG] PARSED EDIT_COMPLEXITY: ${parsed.editComplexity || 'none'}`);
      if (this.DEBUG) console.log(`[DEBUG] PARSED USER_FEEDBACK: ${parsed.userFeedback || 'none'}`);
      
      // Check if input contains a reference to modifying existing content
      const editKeywords = ['edit', 'change', 'modify', 'update', 'fix', 'adjust', 'revise'];
      const containsEditKeyword = editKeywords.some(keyword => 
        input.prompt.toLowerCase().includes(keyword));
      
      if (containsEditKeyword && parsed.toolName === 'addScene') {
        if (this.DEBUG) console.log(`[DEBUG] POTENTIAL MISMATCH: User prompt contains edit keywords, but LLM selected 'addScene'`);
        if (this.DEBUG) console.log(`[DEBUG] USER CONTEXT SCENE ID: ${input.userContext?.sceneId || 'none'}`);
      }
      
      // Check if this is a multi-step workflow
      if (parsed.workflow && Array.isArray(parsed.workflow)) {
        if (this.DEBUG) console.log(`[DEBUG] Multi-step workflow detected: ${parsed.workflow.length} steps`);
        if (this.DEBUG) console.log(`[DEBUG] WORKFLOW DETAILS:`, JSON.stringify(parsed.workflow, null, 2));
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
        if (this.DEBUG) console.log(`[DEBUG] EXTRACTED CLARIFICATION_NEEDED: ${parsed.clarificationNeeded}`);
      }
      
      // CRITICAL FIX: Extract targetSceneId from Brain LLM response
      if (parsed.targetSceneId) {
        result.targetSceneId = parsed.targetSceneId;
        if (this.DEBUG) console.log(`[DEBUG] BRAIN SELECTED SCENE: ${parsed.targetSceneId}`);
        
        // Double-check if the scene actually exists in the storyboard
        const sceneExists = input.storyboardSoFar?.some(scene => scene.id === parsed.targetSceneId);
        if (!sceneExists) {
          if (this.DEBUG) console.warn(`[DEBUG] WARNING: Selected scene ID ${parsed.targetSceneId} NOT FOUND in storyboard`);
        }
      } else if (parsed.toolName === 'editScene') {
        if (this.DEBUG) console.warn(`[DEBUG] WARNING: editScene selected but no targetSceneId provided`);
      }
      
      // Log the final decision
      if (this.DEBUG) console.log(`[DEBUG] FINAL DECISION:`, result);
      
      // 🚨 NEW: Handle clarification responses directly
      if (parsed.needsClarification) {
        result.needsClarification = true;
        result.clarificationQuestion = parsed.clarificationQuestion;
        if (this.DEBUG) console.log(`[DEBUG] CLARIFICATION QUESTION: ${parsed.clarificationQuestion}`);
      }
      
      // 🚨 NEW: Handle edit complexity classification
      if (parsed.editComplexity) {
        result.editComplexity = parsed.editComplexity;
        if (this.DEBUG) console.log(`[DEBUG] EDIT COMPLEXITY: ${parsed.editComplexity}`);
      }
      
      // 🚨 NEW: Handle user feedback
      if (parsed.userFeedback) {
        result.userFeedback = parsed.userFeedback;
        if (this.DEBUG) console.log(`[DEBUG] USER FEEDBACK: ${parsed.userFeedback}`);
      }
      
      return result;
      
    } catch (error) {
      if (this.DEBUG) console.error("[BrainOrchestrator] Intent analysis error:", error);
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
1. If user says "edit scene 1" or "change scene 2" → Look at CURRENT STORYBOARD to find scene with that order/number, then use its REAL UUID
2. If user references "the title" or "that animation" → Look at CHAT HISTORY to see which scene they're discussing
3. If user says "make it blue" or "add text" without specifying → Look at CHAT HISTORY for recent scene context
4. If user says "create new scene" or describes something completely new → Use addScene
5. If user says "delete scene X" → Use deleteScene
6. If user says "delete scene" - Use AskSpecify to clarify which scene to delete

🎯 **TEMPLATE & RECENT SCENE PRIORITY** (HIGH PRIORITY):
7. If CHAT HISTORY shows "I've added the [X] template" or "template as Scene [Y]" → That template scene is now the CURRENT SCENE
8. If user makes edit requests immediately after template addition → Target the template scene for editing
9. If CHAT HISTORY shows recent scene addition/creation → Prioritize that scene for subsequent edit requests
10. **"Current Scene" Context**: The most recently mentioned scene in chat history is the implied target for edits

🕐 DURATION & TIMING RULES:
11. If user mentions duration/timing (e.g., "make it 3 seconds", "shorter", "longer") → Check for clarification context first!
12. 🚨 NEW: If CLARIFICATION CONTEXT indicates this is a follow-up to askSpecify → DON'T use askSpecify again, proceed with editScene
13. 🚨 NEW: If user request is AMBIGUOUS and NOT a follow-up → DON'T use tools, instead respond with clarification question

AMBIGUITY DETECTION - When to ask clarification (respond directly, don't use tools):
- Duration requests without clear context: "make it 3 seconds", "make it shorter", "slow it down"
  Could mean: trim duration OR speed up animations OR extend timing
- Scene references without clear target: "change the background" when multiple scenes exist
- Vague edit requests: "make it better", "fix it", "change the style"

TOOL SELECTION RULES:
1. **addScene**: Use when user wants to create a NEW scene or describes something completely different
2. **editScene**: Use when user wants to modify an EXISTING scene (based on context clues or explicit references)
3. **deleteScene**: Use when user explicitly wants to remove a scene
4. **CLARIFICATION**: If request is ambiguous and NOT a follow-up → Respond with clarification question directly (don't use tools)

🎯 EDIT COMPLEXITY DETECTION - For editScene requests, classify the edit type:

**SURGICAL EDITS** (Fast ~2-3s):
- Simple, specific changes: "change text color to blue", "update title to X", "make font bigger"
- Single element modifications: "change background color", "update button text"
- Clear, atomic requests with no ambiguity

USER FEEDBACK EXAMPLES:
- **Surgical**: "Quick fix coming up!" or "Making that change now..."

**CREATIVE EDITS** (Medium ~5-7s):
- Style improvements: "make it more modern", "make it more elegant", "improve the design"
- Visual enhancements: "add some flair", "make it look better", "polish the UI"
- Holistic style changes that may affect multiple visual properties

USER FEEDBACK EXAMPLES:
- **Creative**: "Let me see what I can do to improve this!" or "Working on some creative magic..."

**STRUCTURAL EDITS** (Slower ~8-12s):
- Layout changes: "move text A under text B", "rearrange elements", "change the layout"
- Multi-element coordination: "swap the title and subtitle", "reorganize the content"
- Changes that affect element relationships and positioning

USER FEEDBACK EXAMPLES:
- **Structural**: "This is a bigger change, going through several steps..." or "Restructuring the layout..."

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
  "toolName": "addScene|editScene|deleteScene",
  "reasoning": "Brief explanation of why this tool was selected and which scene (if editing)",
  "targetSceneId": "ACTUAL_SCENE_ID_FROM_STORYBOARD", // ONLY for editScene - use REAL ID from CURRENT STORYBOARD
  "editComplexity": "surgical|creative|structural", // ONLY for editScene - classify edit type
  "userFeedback": "Quick fix coming up!" // ONLY for editScene - progress message based on complexity
}

FOR CLARIFICATION NEEDED - Use clarification JSON format:
{
  "needsClarification": true,
  "clarificationQuestion": "Specific question to ask the user",
  "reasoning": "Why clarification is needed"
}

CLARIFICATION EXAMPLES:
- User: "make it 3 seconds" + NO clarification context → 
  {"needsClarification": true, "clarificationQuestion": "I can help with that! Do you want to:\n1. Trim the scene to 3 seconds total, or\n2. Speed up the animations to fit in 3 seconds?\n\nPlease let me know which option you prefer.", "reasoning": "Ambiguous duration intent"}
- User: "make it 3 seconds" + HAS clarification context → editScene (user already clarified)
- User: "make it shorter" → 
  {"needsClarification": true, "clarificationQuestion": "I can make it shorter! Would you like me to:\n1. Reduce the total scene duration, or\n2. Speed up the animation timing?\n\nWhich approach would work better for you?", "reasoning": "Unclear duration modification method"}
- User: "change the background" + multiple scenes → 
  {"needsClarification": true, "clarificationQuestion": "I see you have multiple scenes. Which scene's background would you like me to change?\n\n[List scenes here]", "reasoning": "Ambiguous scene reference"}

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

    // 🎯 NEW: Extract template and current scene context
    let currentSceneContext = "";
    const lastAssistantMsg = filteredChatHistory.filter(msg => msg.role === 'assistant').pop();
    if (lastAssistantMsg?.content && lastAssistantMsg.content.includes('template as Scene')) {
      // Extract scene number from template message
      const templateSceneMatch = lastAssistantMsg.content.match(/template as Scene (\d+)/);
      if (templateSceneMatch && templateSceneMatch[1] && storyboardSoFar) {
        const sceneNumber = parseInt(templateSceneMatch[1]);
        const templateScene = storyboardSoFar[sceneNumber - 1]; // 0-indexed
        if (templateScene) {
          currentSceneContext = `\n\n🎯 CURRENT SCENE CONTEXT: Recently added template scene "${templateScene.name}" (ID: ${templateScene.id}) is the implied target for edit requests.`;
        }
      }
    }
    
    // 🚨 NEW: If no template context but user has selected scene, highlight it
    if (!currentSceneContext && input.userContext?.sceneId && storyboardSoFar) {
      const selectedScene = storyboardSoFar.find(s => s.id === input.userContext?.sceneId);
      if (selectedScene) {
        currentSceneContext = `\n\n🎯 CURRENT SCENE CONTEXT: User has selected scene "${selectedScene.name}" (ID: ${selectedScene.id}) - this should be the target for edit requests.`;
      }
    }

    return `USER MESSAGE: "${prompt}"${storyboardInfo}${chatContext}${clarificationContext}${currentSceneContext}

Analyze the user's intent and select the appropriate tool and parameters. For editScene operations, use the EXACT scene ID from the storyboard above.

Respond with valid JSON only.`;
  }
  
  private async prepareToolInput(
    input: OrchestrationInput, 
    toolSelection: { toolName?: string; toolInput?: Record<string, unknown>; targetSceneId?: string; clarificationNeeded?: string; editComplexity?: string; userFeedback?: string }
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
        
        // ✅ CONVERT: Technical name to user-friendly display name
        const displayName = scene.name?.replace(/^Scene(\d+)_[a-f0-9]+$/, 'Scene $1') || scene.name || "Untitled Scene";
        
        if (this.DEBUG) console.log(`[BrainOrchestrator] Editing scene: ${displayName} (${sceneId})`);
        
        return {
          ...baseInput,
          projectId: input.projectId,
          sceneId: sceneId,
          existingCode: scene.tsxCode || "",
          existingName: scene.name || "Untitled Scene",
          existingDuration: scene.duration || 180,
          storyboardSoFar: input.storyboardSoFar || [],
          chatHistory: input.chatHistory || [],
          editComplexity: toolSelection.editComplexity,
        };
        
      case "deleteScene":
        // Use targetSceneId for deletion as well
        const deleteSceneId = toolSelection.targetSceneId || input.userContext?.sceneId;
        if (!deleteSceneId) {
          throw new Error("Scene ID required for deletion - Brain LLM must provide targetSceneId or user must have scene selected");
        }

        // Find scene data to pass to deleteScene tool
        const sceneToDelete = input.storyboardSoFar?.find(s => s.id === deleteSceneId);
        if (!sceneToDelete) {
          throw new Error(`Scene with ID ${deleteSceneId} not found in storyboard`);
        }

        return {
          ...baseInput,
          sceneId: deleteSceneId,
          sceneName: sceneToDelete.name || "Untitled Scene",
          projectId: input.projectId,
          remainingScenes: (input.storyboardSoFar || [])
            .filter(s => s.id !== deleteSceneId)
            .map(s => ({ id: s.id, name: s.name || "Untitled Scene" }))
        };
        
      case "fixBrokenScene":
        // fixBrokenScene requires scene ID and error information
        const fixSceneId = toolSelection.targetSceneId || input.userContext?.sceneId;
        if (!fixSceneId) {
          throw new Error("Scene ID required for fixing - Brain LLM must provide targetSceneId or user must have scene selected");
        }

        // Find the broken scene data
        const brokenScene = input.storyboardSoFar?.find(s => s.id === fixSceneId);
        if (!brokenScene) {
          throw new Error(`Scene with ID ${fixSceneId} not found in storyboard`);
        }

        // Extract error message from user context if available
        const errorMessage = input.userContext?.errorMessage as string || "Unknown error occurred";

        return {
          ...baseInput,
          brokenCode: brokenScene.tsxCode || "",
          errorMessage: errorMessage,
          sceneId: fixSceneId,
          sceneName: brokenScene.name || "Untitled Scene",
          projectId: input.projectId,
        };
        
      default:
        return baseInput;
    }
  }

  private async handleError(error: any, input: OrchestrationInput): Promise<OrchestrationOutput> {
    if (this.DEBUG) console.error("[BrainOrchestrator] Error:", error);
    
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

  // 🎯 NEW: Scene Iteration Tracking for Data-Driven Improvement
  private async logSceneIteration(input: {
    sceneId: string;
    projectId: string;
    operationType: 'create' | 'edit' | 'delete';
    editComplexity?: 'surgical' | 'creative' | 'structural';
    userPrompt: string;
    brainReasoning?: string;
    toolReasoning?: string;
    codeBefore?: string;
    codeAfter?: string;
    changesApplied?: string[];
    changesPreserved?: string[];
    generationTimeMs: number;
    modelUsed: string;
    temperature: number;
    tokensUsed?: number;
    sessionId?: string;
  }) {
    try {
      await db.insert(sceneIterations).values({
        sceneId: input.sceneId,
        projectId: input.projectId,
        operationType: input.operationType,
        editComplexity: input.editComplexity,
        userPrompt: input.userPrompt,
        brainReasoning: input.brainReasoning,
        toolReasoning: input.toolReasoning,
        codeBefore: input.codeBefore,
        codeAfter: input.codeAfter,
        changesApplied: input.changesApplied,
        changesPreserved: input.changesPreserved,
        generationTimeMs: input.generationTimeMs,
        modelUsed: input.modelUsed,
        temperature: input.temperature,
        tokensUsed: input.tokensUsed,
        sessionId: input.sessionId,
      });

      if (this.DEBUG) {
        console.log(`[SceneIterationTracker] 📊 Logged ${input.operationType} operation:`, {
          sceneId: input.sceneId,
          complexity: input.editComplexity,
          timeMs: input.generationTimeMs,
          model: input.modelUsed,
          promptLength: input.userPrompt.length,
        });
      }
    } catch (error) {
      if (this.DEBUG) {
        console.error('[SceneIterationTracker] ❌ Failed to log iteration:', error);
      }
      // Don't throw - tracking failure shouldn't break the main operation
    }
  }

  // 🎯 NEW: Background job to detect re-editing patterns (user dissatisfaction)
  private async markReEditedScenes(sceneId: string, projectId: string) {
    try {
      // Check if this scene was edited within the last 5 minutes
      const recentEdits = await db
        .select()
        .from(sceneIterations)
        .where(
          sql`${sceneIterations.sceneId} = ${sceneId} 
              AND ${sceneIterations.operationType} = 'edit' 
              AND ${sceneIterations.createdAt} > NOW() - INTERVAL '5 minutes'`
        );

      if (recentEdits.length > 1) {
        // Mark all but the most recent as "user edited again"
        const editsToMark = recentEdits.slice(0, -1);
        for (const edit of editsToMark) {
          await db
            .update(sceneIterations)
            .set({ userEditedAgain: true })
            .where(eq(sceneIterations.id, edit.id));
        }

        if (this.DEBUG) {
          console.log(`[SceneIterationTracker] 📈 Marked ${editsToMark.length} iterations as re-edited (user dissatisfaction signal)`);
        }
      }
    } catch (error) {
      if (this.DEBUG) {
        console.error('[SceneIterationTracker] ❌ Failed to mark re-edited scenes:', error);
      }
    }
  }
}

// Export singleton instance
export const brainOrchestrator = new BrainOrchestrator(); 