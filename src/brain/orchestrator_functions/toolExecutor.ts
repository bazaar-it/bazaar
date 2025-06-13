// Tool executor for running selected tools

import { sceneBuilderNEW } from "~/tools/sceneBuilderNEW";
import { getModel } from "~/brain/config/models.config";
import type { 
  AddToolInput,
  EditToolInput,
  DeleteToolInput,
  BaseToolOutput
} from "~/tools/helpers/types";
import type { 
  OrchestrationInput, 
  OrchestrationOutput, 
  ToolSelectionResult, 
  ContextPacket
} from "./types";

export class ToolExecutor {
  private modelConfig = getModel('brain');

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
    
    // Progress update
    input.onProgress?.('⚙️ Processing...', 'building');

    // Prepare tool input
    const toolInput = await this.prepareToolInput(input, toolSelection, contextPacket);

    // Execute tool using sceneBuilderNEW
    let result: BaseToolOutput;
    
    try {
      switch (toolSelection.toolName) {
        case "addScene":
        case "createSceneFromImage":
          result = await sceneBuilderNEW.addScene(toolInput as AddToolInput);
          break;
          
        case "editScene":
        case "editSceneWithImage":
        case "fixBrokenScene":
          result = await sceneBuilderNEW.editScene(toolInput as EditToolInput);
          break;
          
        case "deleteScene":
          result = await sceneBuilderNEW.deleteScene(toolInput as DeleteToolInput);
          break;
          
        default:
          return {
            success: false,
            error: `Tool ${toolSelection.toolName} not supported`,
          };
      }
    } catch (error) {
      return {
        success: false,
        error: `Tool execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        toolUsed: toolSelection.toolName,
      };
    }
    
    if (result.success) {
      input.onProgress?.('✅ Complete!', 'success');
    }
    
    // Convert result to OrchestrationOutput format
    return this.convertToOrchestrationOutput(result, toolSelection.toolName!);
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
        input.onProgress?.(`⚙️ Step ${i + 1}/${workflow.length}: ${step.context}`, 'building');
        
        const stepInput = await this.prepareWorkflowStepInput(input, step, workflowResults, contextPacket);
        let stepResult: BaseToolOutput;
        
        // Execute step using sceneBuilderNEW
        switch (step.toolName) {
          case "addScene":
          case "createSceneFromImage":
            stepResult = await sceneBuilderNEW.addScene(stepInput as AddToolInput);
            break;
            
          case "editScene":
          case "editSceneWithImage":
          case "fixBrokenScene":
            stepResult = await sceneBuilderNEW.editScene(stepInput as EditToolInput);
            break;
            
          case "deleteScene":
            stepResult = await sceneBuilderNEW.deleteScene(stepInput as DeleteToolInput);
            break;
            
          default:
            throw new Error(`Tool ${step.toolName} not supported in workflow`);
        }
        
        const processedResult = this.convertToOrchestrationOutput(stepResult, step.toolName);
        workflowResults[`step${i + 1}_result`] = processedResult;
        
        if (stepResult.chatResponse) {
          combinedChatResponse += stepResult.chatResponse + " ";
        }
        
        if (stepResult.success) {
          finalResult = stepResult;
        }
        
      } catch (stepError) {
        return {
          success: false,
          error: `Workflow failed at step ${i + 1} (${step.toolName}): ${stepError instanceof Error ? stepError.message : 'Unknown error'}`,
          chatResponse: combinedChatResponse.trim() || "I started working on your request but encountered an issue.",
        };
      }
    }
    
    input.onProgress?.('✅ Workflow complete!', 'success');
    
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
  ): Promise<AddToolInput | EditToolInput | DeleteToolInput> {
    
    const baseInput = {
      userPrompt: input.prompt,
      projectId: input.projectId,
      userId: input.userId,
    };
    
    // Tool-specific input preparation
    switch (toolSelection.toolName) {
      case "addScene":
      case "createSceneFromImage":
        return {
          ...baseInput,
          sceneNumber: (input.storyboardSoFar?.length || 0) + 1,
          storyboardSoFar: input.storyboardSoFar || [],
          visionAnalysis: this.extractVisionAnalysis(contextPacket),
          imageUrls: this.extractImageUrls(contextPacket),
        } as AddToolInput;
        
      case "editScene":
      case "editSceneWithImage":
      case "fixBrokenScene":
        const sceneId = toolSelection.targetSceneId || input.userContext?.sceneId;
        const scene = input.storyboardSoFar?.find(s => s.id === sceneId);
        
        return {
          ...baseInput,
          sceneId: sceneId as string,
          existingCode: scene?.tsxCode || "",
          editType: this.mapEditComplexity(toolSelection.editComplexity, toolSelection.toolName),
          visionAnalysis: this.extractVisionAnalysis(contextPacket),
          imageUrls: this.extractImageUrls(contextPacket),
          errorDetails: toolSelection.toolName === "fixBrokenScene" ? "Scene has errors that need fixing" : undefined,
        } as EditToolInput;
        
      case "deleteScene":
        const deleteSceneId = toolSelection.targetSceneId || input.userContext?.sceneId;
        const sceneToDelete = input.storyboardSoFar?.find(s => s.id === deleteSceneId);
        
        return {
          ...baseInput,
          sceneId: deleteSceneId as string,
          sceneName: sceneToDelete?.name || "Untitled Scene",
          confirmDeletion: true, // Auto-confirm since user already requested deletion
        } as DeleteToolInput;
        
      default:
        throw new Error(`Unknown tool: ${toolSelection.toolName}`);
    }
  }

  private async prepareWorkflowStepInput(
    originalInput: OrchestrationInput,
    step: {toolName: string, context: string, dependencies?: string[], targetSceneId?: string},
    workflowResults: Record<string, any>,
    contextPacket?: ContextPacket
  ): Promise<AddToolInput | EditToolInput | DeleteToolInput> {
    
    const toolSelection: ToolSelectionResult = { 
      success: true,
      toolName: step.toolName,
      targetSceneId: step.targetSceneId
    };
    
    const baseInput = await this.prepareToolInput(originalInput, toolSelection, contextPacket!);
    
    // Add workflow context to the input
    return {
      ...baseInput,
      userPrompt: `${originalInput.prompt} (Workflow step: ${step.context})`,
    };
  }

  private convertToOrchestrationOutput(result: BaseToolOutput, toolName: string): OrchestrationOutput {
    return {
      success: result.success,
      result: result,
      toolUsed: toolName,
      reasoning: result.reasoning,
      error: result.error,
      chatResponse: result.chatResponse,
      debug: result.debug,
    };
  }

  private extractVisionAnalysis(contextPacket: ContextPacket): any {
    // Extract vision analysis from the latest image analysis
    const latestAnalysis = contextPacket.imageAnalyses?.[0];
    return latestAnalysis ? {
      palette: latestAnalysis.palette,
      typography: latestAnalysis.typography,
      mood: latestAnalysis.mood,
      layoutJson: latestAnalysis.layoutJson,
    } : undefined;
  }

  private extractImageUrls(contextPacket: ContextPacket): string[] | undefined {
    // Extract image URLs from context
    const imageUrls: string[] = [];
    
    // From image analyses
    contextPacket.imageAnalyses?.forEach(analysis => {
      imageUrls.push(...analysis.imageUrls);
    });
    
    // From conversation context
    contextPacket.imageContext?.conversationImages?.forEach(img => {
      imageUrls.push(...img.imageUrls);
    });
    
    return imageUrls.length > 0 ? imageUrls : undefined;
  }

  private mapEditComplexity(complexity?: string, toolName?: string): 'creative' | 'surgical' | 'error-fix' {
    if (toolName === "fixBrokenScene") {
      return 'error-fix';
    }
    
    switch (complexity) {
      case 'surgical':
        return 'surgical';
      case 'creative':
      case 'structural':
        return 'creative';
      default:
        return 'creative';
    }
  }
} 