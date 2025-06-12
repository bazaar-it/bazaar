// src/server/services/mcp/tools/editSceneWithImage.ts
import { z } from "zod";
import { BaseMCPTool } from "~/server/services/mcp/tools/base";
import { codeGeneratorService } from "~/server/services/generation/codeGenerator.service";

const editSceneWithImageInputSchema = z.object({
  imageUrls: z.array(z.string()).describe("Array of image URLs to use as styling reference"),
  userPrompt: z.string().describe("User's description of what to change based on the image"),
  existingCode: z.string().describe("Current scene code to modify"),
  existingName: z.string().describe("Current scene name"),
  existingDuration: z.number().describe("Current scene duration"),
  projectId: z.string().describe("Project ID for context"),
  sceneId: z.string().optional().describe("Scene ID being edited"),
});

type EditSceneWithImageInput = z.infer<typeof editSceneWithImageInputSchema>;

interface EditSceneWithImageOutput {
  sceneCode: string;
  sceneName: string;
  duration: number;
  reasoning: string;
  changes: string[];
  preserved: string[];
  debug?: any;
  chatResponse?: string;
}

export class EditSceneWithImageTool extends BaseMCPTool<EditSceneWithImageInput, EditSceneWithImageOutput> {
  name = "editSceneWithImage";
  description = "Edit an existing scene using image references for styling. Use when user uploads images and wants to apply their visual style to existing scenes.";
  inputSchema = editSceneWithImageInputSchema;
  
  protected async execute(input: EditSceneWithImageInput): Promise<EditSceneWithImageOutput> {
    const { imageUrls, userPrompt, existingCode, existingName, existingDuration, projectId } = input;

    // Convert technical name to user-friendly display name
    const displayName = existingName.replace(/^Scene(\d+)_[a-f0-9]+$/, 'Scene $1') || existingName;

    try {
      console.log(`[EditSceneWithImage] 🎨 Image-guided editing for "${displayName}"`);
      console.log(`[EditSceneWithImage] 📷 Using ${imageUrls.length} reference image(s)`);
      console.log(`[EditSceneWithImage] ✏️ Edit request: "${userPrompt.substring(0, 100)}..."`);

      // Generate function name (keep original)
      const functionName = existingName;

      // Use CodeGenerator's new image-guided edit method
      const result = await codeGeneratorService.editCodeWithImage({
        imageUrls,
        existingCode,
        userPrompt,
        functionName,
      });

      // Analyze what changed (simple diff analysis)
      const changes = this.analyzeChanges(existingCode, result.code);
      const preserved = ["Scene structure", "Existing animations", "Component hierarchy"];

      // Brain will generate chat response if needed
      const chatResponse = undefined;

      console.log(`[EditSceneWithImage] ✅ Image-guided editing completed for "${displayName}"`);

      return {
        sceneCode: result.code,
        sceneName: displayName,
        duration: existingDuration, // Keep original duration
        reasoning: result.reasoning,
        changes: changes,
        preserved: preserved,
        chatResponse,
        debug: result.debug
      };
    } catch (error) {
      console.error("[EditSceneWithImage] Error:", error);
      
      // Brain will handle error messaging
      const errorResponse = undefined;

      return {
        sceneCode: existingCode, // Return original code on error
        sceneName: displayName,
        duration: existingDuration,
        reasoning: "Image-guided edit failed - returned original code",
        changes: [],
        preserved: ["Everything (edit failed)"],
        debug: { error: String(error) },
        chatResponse: errorResponse
      };
    }
  }

  /**
   * Simple analysis of what changed between old and new code
   */
  private analyzeChanges(oldCode: string, newCode: string): string[] {
    const changes: string[] = [];
    
    // Simple heuristics to detect changes
    if (oldCode !== newCode) {
      if (this.containsColorChanges(oldCode, newCode)) {
        changes.push("Updated colors based on image reference");
      }
      if (this.containsLayoutChanges(oldCode, newCode)) {
        changes.push("Adjusted layout to match image structure");
      }
      if (this.containsTypographyChanges(oldCode, newCode)) {
        changes.push("Modified typography based on image styling");
      }
      if (this.containsStyleChanges(oldCode, newCode)) {
        changes.push("Applied visual styling from image reference");
      }
      
      // Fallback if no specific changes detected
      if (changes.length === 0) {
        changes.push("Applied styling changes based on image reference");
      }
    }
    
    return changes;
  }

  private containsColorChanges(oldCode: string, newCode: string): boolean {
    const colorRegex = /#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3}|rgb\(|rgba\(/g;
    const oldColors = oldCode.match(colorRegex) || [];
    const newColors = newCode.match(colorRegex) || [];
    return oldColors.length !== newColors.length || oldColors.some((color, i) => color !== newColors[i]);
  }

  private containsLayoutChanges(oldCode: string, newCode: string): boolean {
    const layoutKeywords = ['position', 'display', 'flexDirection', 'justifyContent', 'alignItems', 'margin', 'padding'];
    return layoutKeywords.some(keyword => {
      const oldCount = (oldCode.match(new RegExp(keyword, 'g')) || []).length;
      const newCount = (newCode.match(new RegExp(keyword, 'g')) || []).length;
      return oldCount !== newCount;
    });
  }

  private containsTypographyChanges(oldCode: string, newCode: string): boolean {
    const typoKeywords = ['fontSize', 'fontWeight', 'fontFamily', 'textAlign', 'lineHeight'];
    return typoKeywords.some(keyword => {
      const oldCount = (oldCode.match(new RegExp(keyword, 'g')) || []).length;
      const newCount = (newCode.match(new RegExp(keyword, 'g')) || []).length;
      return oldCount !== newCount;
    });
  }

  private containsStyleChanges(oldCode: string, newCode: string): boolean {
    const styleKeywords = ['background', 'border', 'shadow', 'borderRadius', 'opacity'];
    return styleKeywords.some(keyword => {
      const oldCount = (oldCode.match(new RegExp(keyword, 'g')) || []).length;
      const newCount = (newCode.match(new RegExp(keyword, 'g')) || []).length;
      return oldCount !== newCount;
    });
  }
}

export const editSceneWithImageTool = new EditSceneWithImageTool(); 