import { BaseMCPTool } from "~/tools/helpers/base";
import type { TrimToolInput, TrimToolOutput } from "~/tools/helpers/types";
import { trimToolInputSchema } from "~/tools/helpers/types";

/**
 * TRIM Tool - Fast duration adjustment without AI
 * Used for simple cuts, extensions, or duration changes
 * NO AI PROCESSING - just metadata update
 */

export class TrimTool extends BaseMCPTool<TrimToolInput, TrimToolOutput> {
  name = "TRIM";
  description = "Fast duration adjustment for scenes without modifying animations";
  inputSchema = trimToolInputSchema;

  protected async execute(input: TrimToolInput): Promise<TrimToolOutput> {
    try {
      console.log('✂️ [TRIM TOOL] Executing trim:', {
        prompt: input.userPrompt,
        sceneId: input.sceneId,
        newDuration: input.newDuration,
        trimFrames: input.trimFrames,
        trimType: input.trimType
      });

      // Parse the user prompt to extract duration intent
      const durationInfo = this.parseDurationFromPrompt(input.userPrompt);
      
      // Determine the new duration
      let newDuration: number;
      const currentDuration = input.currentDuration;
      
      if (input.newDuration) {
        newDuration = input.newDuration;
      } else if (input.trimFrames) {
        newDuration = Math.max(1, currentDuration + input.trimFrames);
      } else if (durationInfo) {
        newDuration = durationInfo.frames;
      } else {
        throw new Error("Could not determine new duration from input");
      }

      const trimmedFrames = currentDuration - newDuration;

      console.log('✂️ [TRIM TOOL] Duration change:', {
        from: currentDuration,
        to: newDuration,
        trimmed: trimmedFrames
      });

      // Return the trim instruction - NO CODE GENERATION
      return {
        success: true,
        duration: newDuration,
        trimmedFrames: trimmedFrames,
        reasoning: `${trimmedFrames > 0 ? 'Trimmed' : 'Extended'} scene by ${Math.abs(trimmedFrames)} frames`,
        chatResponse: trimmedFrames > 0 
          ? `I'll cut ${Math.abs(trimmedFrames / 30).toFixed(1)} seconds from the ${input.trimType} of the scene`
          : `I'll extend the scene by ${Math.abs(trimmedFrames / 30).toFixed(1)} seconds`,
      };
      
    } catch (error) {
      console.error('✂️ [TRIM TOOL] Error:', error);
      return {
        success: false,
        reasoning: `Trim failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as TrimToolOutput;
    }
  }

  private parseDurationFromPrompt(prompt: string): { frames: number; seconds: number } | null {
    // Match patterns like "3 seconds", "90 frames", "make it 5s"
    const secondsMatch = prompt.match(/(\d+(?:\.\d+)?)\s*(?:seconds?|secs?|s)/i);
    const framesMatch = prompt.match(/(\d+)\s*(?:frames?|f)/i);
    
    if (secondsMatch && secondsMatch[1]) {
      const seconds = parseFloat(secondsMatch[1]);
      return { seconds, frames: Math.round(seconds * 30) }; // 30fps
    }
    
    if (framesMatch && framesMatch[1]) {
      const frames = parseInt(framesMatch[1]);
      return { frames, seconds: frames / 30 };
    }
    
    return null;
  }
}

// Export singleton instance
export const trimTool = new TrimTool();