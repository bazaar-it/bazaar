// src/lib/services/mcp-tools/editScene.ts

import { z } from "zod";
import { BaseMCPTool } from "./base";
import { directCodeEditorService } from "../directCodeEditor.service";
import { conversationalResponseService } from "~/server/services/conversationalResponse.service";

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
    const { userPrompt, existingCode, existingName, existingDuration, projectId, storyboardSoFar, chatHistory } = input;

    try {
      console.log(`[EditScene] Starting surgical edit for "${existingName}": ${userPrompt}`);
      
      // Use DirectCodeEditor for surgical code modifications
      const result = await directCodeEditorService.editCode({
        userPrompt,
        existingCode,
        existingName,
        chatHistory: chatHistory || []
      });

      // 🚨 CRITICAL FIX: Detect duration changes and calculate new duration
      let newDuration = existingDuration; // Default to existing duration
      
      // Check if user is requesting a duration change
      const durationChangeRegex = /(?:make it|last|duration|time|seconds?|minutes?)\s*(?:for|to be|of)?\s*(\d+(?:\.\d+)?)\s*(seconds?|second|sec|s|minutes?|minute|min|m)/i;
      const durationMatch = userPrompt.match(durationChangeRegex);
      
      if (durationMatch && durationMatch[1] && durationMatch[2]) {
        const value = parseFloat(durationMatch[1]);
        const unit = durationMatch[2].toLowerCase();
        
        // Convert to frames (assuming 30 fps)
        const fps = 30;
        if (unit.startsWith('s')) { // seconds
          newDuration = Math.round(value * fps);
        } else if (unit.startsWith('m')) { // minutes
          newDuration = Math.round(value * 60 * fps);
        }
        
        console.log(`[EditScene] Detected duration change: ${value} ${unit} = ${newDuration} frames`);
      }
      
      // Also check for relative duration changes
      const shorterRegex = /(?:make it|make)\s*(?:much\s+)?(?:shorter|faster|quicker)/i;
      const longerRegex = /(?:make it|make)\s*(?:much\s+)?(?:longer|slower)/i;
      
      if (shorterRegex.test(userPrompt)) {
        newDuration = Math.round(existingDuration * 0.6); // 40% shorter
        console.log(`[EditScene] Making scene shorter: ${existingDuration} → ${newDuration} frames`);
      } else if (longerRegex.test(userPrompt)) {
        newDuration = Math.round(existingDuration * 1.5); // 50% longer
        console.log(`[EditScene] Making scene longer: ${existingDuration} → ${newDuration} frames`);
      }

      // Generate conversational response for user
      const chatResponse = await conversationalResponseService.generateContextualResponse({
        operation: 'editScene',
        userPrompt,
        result: {
          sceneName: existingName,
          duration: newDuration,
          changes: result.changes,
          preserved: result.preserved
        },
        context: {
          sceneName: existingName,
          sceneCount: storyboardSoFar?.length || 1,
          projectId
        }
      });

      console.log(`[EditScene] Surgical edit completed:`, {
        changes: result.changes.length,
        preserved: result.preserved.length,
        reasoning: result.reasoning
      });

      return {
        sceneCode: result.code,
        sceneName: existingName, // Keep original name
        duration: newDuration,
        reasoning: result.reasoning,
        changes: result.changes,
        preserved: result.preserved,
        debug: result.debug,
        chatResponse
      };
      
    } catch (error) {
      console.error("[EditScene] Surgical edit failed:", error);
      
      // Generate error response for user
      const errorResponse = await conversationalResponseService.generateContextualResponse({
        operation: 'editScene',
        userPrompt,
        result: { error: String(error) },
        context: {
          sceneName: existingName,
          sceneCount: storyboardSoFar?.length || 1,
          projectId
        }
      });

      return {
        sceneCode: existingCode, // Return original code on error
        sceneName: existingName,
        duration: existingDuration,
        reasoning: "Surgical edit failed - returned original code",
        changes: [],
        preserved: ["Everything (edit failed)"],
        debug: { error: String(error) },
        chatResponse: errorResponse
      };
    }
  }
}

export const editSceneTool = new EditSceneTool();