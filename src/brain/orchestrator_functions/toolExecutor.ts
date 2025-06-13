// Tool executor for running selected tools

import { 
  addSceneTool, 
  editSceneTool, 
  deleteSceneTool, 
  fixBrokenSceneTool,
  analyzeImageTool,
  createSceneFromImageTool,
  editSceneWithImageTool,
  changeDurationTool,
  toolRegistry,
} from "~/server/services/mcp/tools";
import { sceneRepositoryService } from "~/server/services/brain/sceneRepository.service";
import { getModel } from "~/brain/config/models.config";
import type { 
  DatabaseOperationContext as DbOpContext,
  ModelUsageData as ModelUsage,
  SceneData as SceneDataType,
  ToolName
} from "~/lib/types/ai/brain.types";
import type { 
  OrchestrationInput, 
  OrchestrationOutput, 
  ToolSelectionResult, 
  ContextPacket
} from "./types";

// Initialize tools
const ALL_TOOLS = [
  addSceneTool, 
  editSceneTool, 
  deleteSceneTool, 
  fixBrokenSceneTool, 
  changeDurationTool,
  analyzeImageTool, 
  createSceneFromImageTool, 
  editSceneWithImageTool
];

let toolsInitialized = false;

function initializeTools() {
  if (!toolsInitialized) {
    ALL_TOOLS.forEach(tool => toolRegistry.register(tool));
    toolsInitialized = true;
  }
}

export class ToolExecutor {
  private modelConfig = getModel('brain');

  constructor() {
    initializeTools();
  }

  async executeTools(
    input: OrchestrationInput,
    toolSelection: ToolSelectionResult,
    contextPacket: ContextPacket
  ): Promise<OrchestrationOutput> {
    
    // Handle clarification requests
    if (toolSelection.needsClarification) {
      return {
        success: true,
        chatResponse: toolSelection.clarificationQuestion,
        reasoning: toolSelection.reasoning || "Clarification needed",
        isAskSpecify: true,
      };
    }

    // Handle multi-step workflows
    if (toolSelection.workflow && toolSelection.workflow.length > 0) {
      return await this.executeWorkflow(input, toolSelection.workflow, toolSelection.reasoning, contextPacket);
    }

    // Handle single tool execution
    if (toolSelection.toolName) {
      return await this.executeSingleTool(input, toolSelection, contextPacket);
    }

    return {
      success: false,
      error: "No tool selected and no clarification provided",
    };
  }

  private async executeSingleTool(
    input: OrchestrationInput,
    toolSelection: ToolSelectionResult,
    contextPacket: ContextPacket
  ): Promise<OrchestrationOutput> {
    
    const tool = toolRegistry.get(toolSelection.toolName!);
    if (!tool) {
      return {
        success: false,
        error: `Tool ${toolSelection.toolName} not found`,
      };
    }

    // Progress update
    input.onProgress?.('⚙️ Processing...', 'building');

    // Prepare tool input
    const toolInput = await this.prepareToolInput(input, toolSelection, contextPacket);

    // Execute tool
    const result = await tool.run(toolInput);
    
    if (result.success) {
      input.onProgress?.('💾 Saving...', 'building');
    }
    
    // Process result and handle database operations
    return await this.processToolResult(result, toolSelection.toolName!, input, {
      targetSceneId: toolSelection.targetSceneId,
      editComplexity: toolSelection.editComplexity,
      reasoning: toolSelection.reasoning,
      requestedDurationSeconds: toolSelection.requestedDurationSeconds,
    });
  }

  private async executeWorkflow(
    input: OrchestrationInput,
    workflow: Array<{toolName: string, context: string, dependencies?: string[], targetSceneId?: string}>,
    reasoning?: string,
    contextPacket?: ContextPacket
  ): Promise<OrchestrationOutput> {
    
    const workflowResults: Record<string, any> = {};
    let finalResult: any = null;
    let combinedChatResponse = "";
    
    for (let i = 0; i < workflow.length; i++) {
      const step = workflow[i];
      if (!step) {
        throw new Error(`Workflow step ${i + 1} is undefined`);
      }
      
      try {
        const tool = toolRegistry.get(step.toolName);
        if (!tool) {
          throw new Error(`Tool ${step.toolName} not found in workflow step ${i + 1}`);
        }
        
        const stepInput = await this.prepareWorkflowStepInput(input, step, workflowResults, contextPacket);
        const stepResult = await tool.run(stepInput);
        
        const processedResult = await this.processToolResult(stepResult, step.toolName as any, input, {
          reasoning: `Workflow step ${i + 1}: ${step.context}`,
          targetSceneId: step.targetSceneId,
        });
        
        workflowResults[`step${i + 1}_result`] = processedResult;
        
        if (processedResult.chatResponse) {
          combinedChatResponse += processedResult.chatResponse + " ";
        }
        
        if (processedResult.success) {
          finalResult = processedResult.result;
        }
        
      } catch (stepError) {
        return {
          success: false,
          error: `Workflow failed at step ${i + 1} (${step.toolName}): ${stepError instanceof Error ? stepError.message : 'Unknown error'}`,
          chatResponse: combinedChatResponse.trim() || "I started working on your request but encountered an issue.",
        };
      }
    }
    
    return {
      success: true,
      result: finalResult,
      toolUsed: `workflow_${workflow.length}_steps`,
      reasoning: reasoning || "Multi-step workflow completed",
      chatResponse: combinedChatResponse.trim() || "I've completed all the requested changes!",
    };
  }

  private async prepareToolInput(
    input: OrchestrationInput,
    toolSelection: ToolSelectionResult,
    contextPacket: ContextPacket
  ): Promise<Record<string, unknown>> {
    
    const baseInput = {
      userPrompt: input.prompt,
      sessionId: input.projectId,
      userId: input.userId,
      userContext: input.userContext || {},
    };
    
    // Tool-specific input preparation (simplified)
    switch (toolSelection.toolName) {
      case "addScene":
        return {
          ...baseInput,
          projectId: input.projectId,
          storyboardSoFar: input.storyboardSoFar || [],
          sceneNumber: (input.storyboardSoFar?.length || 0) + 1,
        };
        
      case "editScene":
        const sceneId = toolSelection.targetSceneId || input.userContext?.sceneId;
        const scene = input.storyboardSoFar?.find(s => s.id === sceneId);
        
        return {
          ...baseInput,
          projectId: input.projectId,
          sceneId: sceneId,
          existingCode: scene?.tsxCode || "",
          existingName: scene?.name || "Untitled Scene",
          existingDuration: scene?.duration || 180,
          storyboardSoFar: input.storyboardSoFar || [],
          editComplexity: toolSelection.editComplexity,
        };
        
      case "deleteScene":
        const deleteSceneId = toolSelection.targetSceneId || input.userContext?.sceneId;
        const sceneToDelete = input.storyboardSoFar?.find(s => s.id === deleteSceneId);
        
        return {
          ...baseInput,
          sceneId: deleteSceneId,
          sceneName: sceneToDelete?.name || "Untitled Scene",
          projectId: input.projectId,
        };
        
      default:
        return baseInput;
    }
  }

  private async prepareWorkflowStepInput(
    originalInput: OrchestrationInput,
    step: {toolName: string, context: string, dependencies?: string[], targetSceneId?: string},
    workflowResults: Record<string, any>,
    contextPacket?: ContextPacket
  ): Promise<Record<string, unknown>> {
    
    const toolSelection: ToolSelectionResult = { 
      success: true,
      toolName: step.toolName,
      targetSceneId: step.targetSceneId
    };
    const baseInput = await this.prepareToolInput(originalInput, toolSelection, contextPacket!);
    
    return {
      ...baseInput,
      workflowContext: step.context,
      workflowStep: step.toolName,
      previousResults: workflowResults,
    };
  }

  private async processToolResult(
    result: any, 
    toolName: string, 
    input: OrchestrationInput, 
    toolSelection?: { 
      targetSceneId?: string; 
      editComplexity?: any; 
      reasoning?: string;
      requestedDurationSeconds?: number;
    }
  ): Promise<OrchestrationOutput> {
    
    if (!result.success) {
      return {
        success: false,
        error: result.error?.message || "Tool execution failed",
        toolUsed: toolName,
        reasoning: result.reasoning || "Tool operation failed",
      };
    }

    // Handle database operations for scene tools
    const modelUsage: ModelUsage = {
      model: this.modelConfig.model,
      temperature: this.modelConfig.temperature ?? 0.3,
      generationTimeMs: 0,
      sessionId: input.userId,
    };

    const operationContext: DbOpContext = {
      operationType: this.getOperationType(toolName),
      toolName: toolName as ToolName,
      editComplexity: toolSelection?.editComplexity,
      projectId: input.projectId,
      userId: input.userId,
      userPrompt: input.prompt,
      reasoning: toolSelection?.reasoning,
    };

    let sceneOperationResult;
    
    switch (toolName) {
      case 'addScene':
      case 'createSceneFromImage':
        sceneOperationResult = await this.handleSceneCreation(result.data, operationContext, modelUsage);
        break;
        
      case 'editScene':
      case 'editSceneWithImage':
      case 'fixBrokenScene':
        sceneOperationResult = await this.handleSceneUpdate(result.data, toolSelection?.targetSceneId, operationContext, modelUsage);
        break;
        
      case 'deleteScene':
        sceneOperationResult = await this.handleSceneDeletion(result.data, operationContext, modelUsage);
        break;
        
      default:
        // Non-scene operations don't need database handling
        break;
    }

    // Extract chat response and debug info
    let chatResponse: string | undefined;
    if (result.data && typeof result.data === 'object' && 'chatResponse' in result.data) {
      chatResponse = (result.data as any).chatResponse;
    }

    let debug = undefined;
    if (result.data && typeof result.data === 'object' && 'debug' in result.data) {
      debug = (result.data as any).debug;
    }

    return {
      success: true,
      result: sceneOperationResult ? { ...result.data, scene: sceneOperationResult.scene } : result.data,
      toolUsed: toolName,
      reasoning: result.reasoning,
      chatResponse,
      debug,
    };
  }

  private getOperationType(toolName: string): 'create' | 'edit' | 'delete' {
    switch (toolName) {
      case 'addScene':
      case 'createSceneFromImage':
        return 'create';
      case 'editScene':
      case 'editSceneWithImage':
      case 'fixBrokenScene':
      case 'changeDuration':
        return 'edit';
      case 'deleteScene':
        return 'delete';
      default:
        return 'create';
    }
  }

  private async handleSceneCreation(sceneData: any, context: DbOpContext, modelUsage: ModelUsage) {
    if (!sceneData?.sceneCode || !sceneData?.sceneName) {
      return null;
    }

    const standardizedData: SceneDataType = {
      sceneName: sceneData.sceneName,
      sceneCode: sceneData.sceneCode,
      duration: sceneData.duration || 180,
      layoutJson: sceneData.layoutJson,
      reasoning: sceneData.reasoning,
      chatResponse: sceneData.chatResponse,
    };

    return await sceneRepositoryService.createScene(standardizedData, context, modelUsage);
  }

  private async handleSceneUpdate(sceneData: any, targetSceneId: string | undefined, context: DbOpContext, modelUsage: ModelUsage) {
    const sceneId = targetSceneId || sceneData?.sceneId;
    const code = context.toolName === 'fixBrokenScene' ? sceneData?.fixedCode : sceneData?.sceneCode;

    if (!sceneId || !code || !sceneData?.sceneName) { 
      return null;
    }

    const standardizedData: SceneDataType = {
      sceneId,
      sceneName: sceneData.sceneName,
      sceneCode: code,
      duration: sceneData.duration || 180,
      layoutJson: sceneData.layoutJson,
      reasoning: sceneData.reasoning,
      changes: sceneData.changes,
      preserved: sceneData.preserved,
      chatResponse: sceneData.chatResponse,
    };

    return await sceneRepositoryService.updateScene(standardizedData, context, modelUsage);
  }

  private async handleSceneDeletion(deleteData: any, context: DbOpContext, modelUsage: ModelUsage) {
    const sceneId = deleteData?.deletedSceneId;
    const sceneName = deleteData?.deletedSceneName;
    
    if (!sceneId) {
      return null;
    }

    return await sceneRepositoryService.deleteScene(sceneId, sceneName || sceneId, context, modelUsage);
  }
} 