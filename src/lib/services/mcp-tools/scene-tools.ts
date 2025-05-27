import { z } from "zod";
import { BaseMCPTool, type MCPResult } from "./base";
import { sceneBuilderService, type SceneBuilderInput } from "../sceneBuilder.service";
import { type SceneSpec } from "~/lib/types/storyboard";
import crypto from "crypto";

/**
 * Input schema for addScene tool
 */
const AddSceneInput = z.object({
  userPrompt: z.string().min(1).describe("User's scene request"),
  userContext: z.record(z.any()).optional().describe("Additional user context"),
  sessionId: z.string().describe("Project/session identifier"),
  userId: z.string().describe("User identifier"),
  storyboardSoFar: z.array(z.any()).default([]).describe("Existing scenes in project"),
});

type AddSceneInputType = z.infer<typeof AddSceneInput>;

/**
 * Output schema for addScene tool
 */
interface AddSceneOutput {
  sceneSpec: SceneSpec;
  reasoning: string;
  sceneId: string;
  debug: {
    prompt: { system: string; user: string };
    response: string;
    parsed: any;
  };
}

/**
 * AddScene Tool - Creates new scenes from user prompts
 */
export class AddSceneTool extends BaseMCPTool<any, any> {
  name = "addScene";
  description = "Create a new scene from user prompt. Use when user requests a new scene or this is the first scene.";
  inputSchema = AddSceneInput;

  protected async execute(input: AddSceneInputType): Promise<AddSceneOutput> {
    const sceneBuilderInput: SceneBuilderInput = {
      userMessage: input.userPrompt,
      userContext: input.userContext || {},
      storyboardSoFar: input.storyboardSoFar,
      projectId: input.sessionId,
      userId: input.userId,
    };

    const result = await sceneBuilderService.buildScene(sceneBuilderInput);
    
    // Generate a cryptographically secure scene ID
    const sceneId = crypto.randomUUID();
    
    return {
      sceneSpec: result.sceneSpec,
      reasoning: result.reasoning,
      sceneId,
      debug: result.debug,
    };
  }
}

/**
 * Input schema for editScene tool
 */
const EditSceneInput = z.object({
  sceneId: z.string().describe("ID of scene to edit"),
  userPrompt: z.string().min(1).describe("User's edit request"),
  currentScene: z.any().describe("Current scene specification"),
  userContext: z.record(z.any()).optional().describe("Additional user context"),
  sessionId: z.string().describe("Project/session identifier"),
  userId: z.string().describe("User identifier"),
});

type EditSceneInputType = z.infer<typeof EditSceneInput>;

/**
 * Output schema for editScene tool
 */
interface EditSceneOutput {
  sceneSpec: SceneSpec;
  reasoning: string;
  changes: string[];
  debug: {
    prompt: { system: string; user: string };
    response: string;
    parsed: any;
  };
}

/**
 * EditScene Tool - Modifies existing scenes with patches
 */
export class EditSceneTool extends BaseMCPTool<any, any> {
  name = "editScene";
  description = "Edit an existing scene based on user request. Use for modifications to existing scenes.";
  inputSchema = EditSceneInput;

  protected async execute(input: EditSceneInputType): Promise<EditSceneOutput> {
    // TODO PHASE2: Implement proper patch-based editing instead of full regeneration
    // WARNING: Current implementation regenerates the entire scene, which loses component IDs
    // This breaks motion targets on the frontend. Need to implement JSON patch diffing.
    const sceneBuilderInput: SceneBuilderInput = {
      userMessage: `EDIT REQUEST: ${input.userPrompt}\n\nCURRENT SCENE: ${JSON.stringify(input.currentScene, null, 2)}`,
      userContext: input.userContext || {},
      storyboardSoFar: [input.currentScene],
      projectId: input.sessionId,
      userId: input.userId,
    };

    const result = await sceneBuilderService.buildScene(sceneBuilderInput);
    
    return {
      sceneSpec: result.sceneSpec,
      reasoning: result.reasoning,
      changes: ["Scene regenerated with modifications"], // TODO PHASE2: Implement proper diff detection
      debug: result.debug,
    };
  }
}

/**
 * Input schema for deleteScene tool
 */
const DeleteSceneInput = z.object({
  sceneId: z.string().describe("ID of scene to delete"),
  userPrompt: z.string().describe("User's delete request for context"),
  sessionId: z.string().describe("Project/session identifier"),
  userId: z.string().describe("User identifier"),
});

type DeleteSceneInputType = z.infer<typeof DeleteSceneInput>;

/**
 * Output schema for deleteScene tool
 */
interface DeleteSceneOutput {
  success: boolean;
  deletedSceneId: string;
  message: string;
}

/**
 * DeleteScene Tool - Removes scenes by ID
 */
export class DeleteSceneTool extends BaseMCPTool<any, any> {
  name = "deleteScene";
  description = "Delete a scene by ID. Use when user explicitly requests scene removal.";
  inputSchema = DeleteSceneInput;

  protected async execute(input: DeleteSceneInputType): Promise<DeleteSceneOutput> {
    // TODO PHASE2: Implement actual database deletion
    return {
      success: true,
      deletedSceneId: input.sceneId,
      message: `Scene ${input.sceneId} marked for deletion`,
    };
  }
}

/**
 * Input schema for askSpecify tool
 */
const AskSpecifyInput = z.object({
  userPrompt: z.string().describe("User's ambiguous request"),
  ambiguityType: z.enum(["multiple_options", "missing_details", "unclear_intent"]).describe("Type of ambiguity"),
  sessionId: z.string().describe("Project/session identifier"),
  userId: z.string().describe("User identifier"),
  clarificationCount: z.number().default(0).describe("Number of clarifications already asked"),
});

type AskSpecifyInputType = z.infer<typeof AskSpecifyInput>;

/**
 * Output schema for askSpecify tool
 */
interface AskSpecifyOutput {
  question: string;
  options?: string[];
  suggestedAction: string;
}

/**
 * AskSpecify Tool - Requests clarification for ambiguous requests
 */
export class AskSpecifyTool extends BaseMCPTool<any, any> {
  name = "askSpecify";
  description = "Ask user for clarification when request is ambiguous. Max 2 clarifications per session.";
  inputSchema = AskSpecifyInput;

  protected async execute(input: AskSpecifyInputType): Promise<AskSpecifyOutput> {
    // TODO PHASE2: Save clarificationCount in userContext to persist across calls
    // Prevent infinite clarification loops
    if (input.clarificationCount >= 2) {
      return {
        question: "I'll proceed with my best interpretation of your request.",
        suggestedAction: "proceed_with_best_guess",
      };
    }

    // Generate contextual clarification questions
    switch (input.ambiguityType) {
      case "multiple_options":
        return {
          question: "I see multiple ways to interpret your request. Which would you prefer?",
          options: [
            "Option A: Create a new scene",
            "Option B: Edit the current scene", 
            "Option C: Something else (please specify)",
          ],
          suggestedAction: "wait_for_user_choice",
        };
        
      case "missing_details":
        return {
          question: "Could you provide more details about what you'd like to see?",
          suggestedAction: "wait_for_more_details",
        };
        
      case "unclear_intent":
        return {
          question: "I'm not sure what you'd like me to do. Could you rephrase your request?",
          suggestedAction: "wait_for_clarification",
        };
        
      default:
        return {
          question: "Could you provide more specific details about what you'd like?",
          suggestedAction: "wait_for_clarification",
        };
    }
  }
}

// Export tool instances
export const addSceneTool = new AddSceneTool();
export const editSceneTool = new EditSceneTool();
export const deleteSceneTool = new DeleteSceneTool();
export const askSpecifyTool = new AskSpecifyTool();

// Export all scene tools as array
export const sceneTools = [
  addSceneTool,
  editSceneTool,
  deleteSceneTool,
  askSpecifyTool,
]; 