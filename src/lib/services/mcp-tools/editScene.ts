// src/lib/services/mcp-tools/editScene.ts

import { z } from "zod";
import { BaseMCPTool } from "./base";
import { sceneBuilderService } from "../sceneBuilder.service";
import { openai } from "~/server/lib/openai";
import { compare, type Operation } from "fast-json-patch";

const editSceneInputSchema = z.object({
  sceneId: z.string().describe("ID of scene to edit"),
  userPrompt: z.string().min(1).describe("User's edit request"),
  currentScene: z.any().describe("Current scene specification"),
  userContext: z.record(z.any()).optional().describe("Additional user context"),
  sessionId: z.string().describe("Project/session identifier"),
  userId: z.string().describe("User identifier"),
});

type EditSceneInput = z.infer<typeof editSceneInputSchema>;

interface EditSceneOutput {
  patch: import("~/types/json-patch").JsonPatch;
  reasoning: string;
  brainContext?: any;
  debug?: any;
}

export class EditSceneTool extends BaseMCPTool<
  EditSceneInput,
  EditSceneOutput
> {
  name = "editScene";
  description =
    "Edit an existing scene based on user request. Uses Brain analysis for strategic code modifications.";
  inputSchema = editSceneInputSchema;
  
  protected async execute(input: EditSceneInput): Promise<EditSceneOutput> {
    const { userPrompt, currentScene, sceneId } = input;

    try {
      // STEP 1: Generate enriched context for editing
      const brainContext = await this.generateEditContext({
        userPrompt,
        currentScene,
        sceneId,
      });

      // STEP 2: Generate updated scene spec with enriched context
      const result = await sceneBuilderService.buildScene({
        userMessage: `EDIT REQUEST: ${userPrompt}\n\nCURRENT SCENE: ${JSON.stringify(currentScene, null, 2)}`,
        userContext: input.userContext || {},
        storyboardSoFar: [currentScene],
        projectId: input.sessionId,
        userId: input.userId,
      });

      // Convert fast-json-patch Operations to our JsonPatch format
      const operations = compare(currentScene, result.sceneSpec);
      const patch = operations
        .filter(op => op.op !== '_get')
        .map(op => {
          // Create base operation object
          const patchOp: import("~/types/json-patch").JsonPatchOperation = {
            path: op.path,
            op: op.op as 'add' | 'remove' | 'replace' | 'move' | 'copy' | 'test'
          };
          
          // Add value property for operations that support it
          if (['add', 'replace', 'test'].includes(op.op) && 'value' in op) {
            patchOp.value = op.value;
          }
          
          // Add from property for operations that support it
          if (['move', 'copy'].includes(op.op) && 'from' in op) {
            patchOp.from = op.from;
          }
          
          return patchOp;
        });

      return {
        patch,
        reasoning: result.reasoning,
        brainContext,
        debug: result.debug,
      };
    } catch (error) {
      return {
        patch: [],
        reasoning: "Failed to edit scene",
        debug: { error: String(error) },
      };
    }
  }
  
  /**
   * Generate enriched Brain context for strategic scene editing
   */
  private async generateEditContext(input: {
    userPrompt: string;
    currentScene: any;
    sceneId: string;
  }): Promise<{
    userIntent: string;
    technicalRecommendations: string[];
    uiLibraryGuidance: string;
    animationStrategy: string;
    previousContext?: string;
    focusAreas: string[];
  }> {
    const contextPrompt = `You are an AI Brain analyzing user intent for video scene editing.

EDIT REQUEST: "${input.userPrompt}"

CURRENT SCENE: ${JSON.stringify(input.currentScene, null, 2)}

Analyze the user's edit request and provide strategic guidance for modifying the existing scene.

FOCUS ON:
- What specific changes the user wants
- How to preserve good elements while making improvements
- What UI libraries or patterns would work best for the changes
- How to maintain visual consistency

RESPONSE FORMAT (JSON):
{
  "userIntent": "What the user wants to change or improve",
  "technicalRecommendations": [
    "Specific technical approaches for the modifications",
    "Recommended patterns or libraries for the changes"
  ],
  "uiLibraryGuidance": "Specific UI library recommendations for the modifications",
  "animationStrategy": "How to modify or enhance animations",
  "focusAreas": [
    "Key areas to modify",
    "Elements to preserve or enhance"
  ],
  "previousContext": "What to keep from the existing scene"
}

Be specific about what should change while preserving the scene's good qualities.`;

    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: contextPrompt },
          { role: "user", content: input.userPrompt },
        ],
        temperature: 0.3,
        response_format: { type: "json_object" },
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No context response from Brain");
      }

      const parsed = JSON.parse(content);

      return {
        userIntent: parsed.userIntent || "Modify the existing scene",
        technicalRecommendations: parsed.technicalRecommendations || [],
        uiLibraryGuidance:
          parsed.uiLibraryGuidance ||
          "Use appropriate UI components for modifications",
        animationStrategy:
          parsed.animationStrategy || "Enhance existing animations",
        previousContext: parsed.previousContext,
        focusAreas: parsed.focusAreas || [
          "User-requested changes",
          "Visual consistency",
        ],
      };
    } catch (error) {
      console.warn(
        "[EditScene] Failed to generate Brain context, using fallback:",
        error,
      );

      return {
        userIntent: "Modify the existing scene based on user request",
        technicalRecommendations: [
          "Preserve existing structure",
          "Apply user-requested changes",
        ],
        uiLibraryGuidance:
          "Use appropriate UI components for the modifications",
        animationStrategy: "Enhance or modify existing animations as needed",
        focusAreas: [
          "User-requested changes",
          "Visual consistency",
          "Smooth transitions",
        ],
      };
    }
  }
}

export const editSceneTool = new EditSceneTool();