// src/server/services/mcp/tools/editScene.ts
import { z } from "zod";
import { BaseMCPTool } from "~/server/services/mcp/tools/base";
import { directCodeEditorService } from "~/server/services/generation/directCodeEditor.service";

const editSceneInputSchema = z.object({
  userPrompt: z.string().describe("User's description of how to modify the scene"),
  existingCode: z.string().describe("Current scene code to modify"),
  existingName: z.string().describe("Current scene name"),
  existingDuration: z.number().describe("Current scene duration"),
  projectId: z.string().describe("Project ID for context"),
  sceneId: z.string().optional().describe("Scene ID being edited"),
  storyboardSoFar: z.array(z.any()).optional().describe("Existing scenes for context"),
  chatHistory: z.array(z.object({
    role: z.string(),
    content: z.string()
  })).optional().describe("Chat history for edit context"),
  editComplexity: z.enum(["surgical", "creative", "structural"]).optional().describe("Edit complexity level from Brain LLM"),
  visionAnalysis: z.any().optional().describe("Vision analysis from analyzeImage tool"),
});

type EditSceneInput = z.infer<typeof editSceneInputSchema>;

interface EditSceneOutput {
  sceneCode: string;
  sceneName: string;
  duration: number;
  reasoning: string;
  changes: string[];
  preserved: string[];
  debug?: any;
  chatResponse?: string;
}

export class EditSceneTool extends BaseMCPTool<EditSceneInput, EditSceneOutput> {
  name = "editScene";
  description = "Edit an existing scene based on user modifications. Use when user wants to change, update, or modify an existing scene.";
  inputSchema = editSceneInputSchema;
  
  protected async execute(input: EditSceneInput): Promise<EditSceneOutput> {
    const { userPrompt, existingCode, existingName, existingDuration, projectId, storyboardSoFar, chatHistory, editComplexity, visionAnalysis } = input;

    // CONVERT: Technical name to user-friendly display name (available throughout function)
    const displayName = existingName.replace(/^Scene(\d+)_[a-f0-9]+$/, 'Scene $1') || existingName;

    try {
      console.log(`[EditScene] Starting ${editComplexity || 'standard'} edit for "${displayName}": ${userPrompt}`);
      
      // Use DirectCodeEditor for surgical code modifications
      const result = await directCodeEditorService.editCode({
        userPrompt,
        existingCode,
        existingName,
        chatHistory: chatHistory || [],
        editComplexity: editComplexity || 'surgical', // Default to surgical if not specified
        visionAnalysis, // 🚨 NEW: Pass vision analysis for image-guided editing
      });

      // DURATION DETECTION: Use LLM reasoning from DirectCodeEditor instead of regex
      let newDuration = existingDuration;
      
      // Check if DirectCodeEditor detected a duration change
      if (result.newDurationFrames && typeof result.newDurationFrames === 'number') {
        newDuration = result.newDurationFrames;
        console.log(`[EditScene] Using DirectCodeEditor duration: ${result.newDurationFrames} frames (${(result.newDurationFrames / 30).toFixed(1)}s)`);
      } else {
        // Fallback: Check for relative duration changes (shorter/longer)
        const shorterRegex = /(?:make it|make)\s*(?:much\s+)?(?:shorter|faster|quicker)/i;
        const longerRegex = /(?:make it|make)\s*(?:much\s+)?(?:longer|slower)/i;
        
        if (shorterRegex.test(userPrompt)) {
          newDuration = Math.round(existingDuration * 0.6); // 40% shorter
          console.log(`[EditScene] Making scene shorter: ${existingDuration} → ${newDuration} frames`);
        } else if (longerRegex.test(userPrompt)) {
          newDuration = Math.round(existingDuration * 1.5); // 50% longer
          console.log(`[EditScene] Making scene longer: ${existingDuration} → ${newDuration} frames`);
        }
      }

      console.log(`[EditScene] Surgical edit completed:`, {
        changes: result.changes.length,
        preserved: result.preserved.length,
        reasoning: result.reasoning
      });

      return {
        sceneCode: result.code,
        sceneName: displayName,
        duration: newDuration,
        reasoning: result.reasoning,
        changes: result.changes,
        preserved: result.preserved,
        debug: result.debug,
        chatResponse: undefined // Brain will generate this if needed
      };
      
    } catch (error) {
      console.error("[EditScene] Surgical edit failed:", error);
      
      return {
        sceneCode: existingCode, // Return original code on error
        sceneName: displayName,
        duration: existingDuration,
        reasoning: "Surgical edit failed - returned original code",
        changes: [],
        preserved: ["Everything (edit failed)"],
        debug: { error: String(error) },
        chatResponse: undefined // Brain will handle error messaging
      };
    }
  }
}

export const editSceneTool = new EditSceneTool();