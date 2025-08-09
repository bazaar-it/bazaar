// Simplified & Modular Orchestrator - Decision Only (Sprint 41)

import { ContextBuilder } from "./orchestrator_functions/contextBuilder";
import { IntentAnalyzer } from "./orchestrator_functions/intentAnalyzer";
import { parseDurationFromPrompt } from "./utils/durationParser";
import { extractYouTubeUrl, extractDuration, YouTubeAnalyzerTool } from "./tools/youtube-analyzer";
import type { 
  OrchestrationInput, 
  OrchestrationOutput 
} from "~/lib/types/ai/brain.types";

export class Orchestrator {
  private contextBuilder = new ContextBuilder();
  private intentAnalyzer = new IntentAnalyzer();

  async processUserInput(input: OrchestrationInput): Promise<OrchestrationOutput> {
    console.log('\n🧠 [NEW ORCHESTRATOR] === PROCESSING USER INPUT ===');
    console.log('🧠 [NEW ORCHESTRATOR] Input:', {
      prompt: input.prompt,
      projectId: input.projectId,
      hasImages: !!(input.userContext?.imageUrls as string[])?.length,
      hasVideos: !!(input.userContext?.videoUrls as string[])?.length,
      sceneCount: input.storyboardSoFar?.length || 0
    });
    
    try {
      // Check for YouTube URL in the prompt
      const youtubeUrl = extractYouTubeUrl(input.prompt);
      let enhancedPrompt = input.prompt;
      
      if (youtubeUrl) {
        console.log('🧠 [NEW ORCHESTRATOR] YouTube URL detected:', youtubeUrl);
        
        try {
          // Extract duration from user message
          const duration = extractDuration(input.prompt);
          console.log('🧠 [NEW ORCHESTRATOR] Requested duration:', duration, 'seconds');
          
          // Analyze the YouTube video
          input.onProgress?.('🎥 Analyzing YouTube video...', 'building');
          const youtubeAnalyzer = new YouTubeAnalyzerTool();
          const { analysis } = await youtubeAnalyzer.execute({
            youtubeUrl,
            duration,
            additionalInstructions: input.prompt // Pass full prompt for context
          });
          
          console.log('🧠 [NEW ORCHESTRATOR] YouTube analysis successful');
          
          // Extract user modifications (everything except the URL)
          const urlPattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})(?:[&?][\w=]*)?/g;
          const modifications = input.prompt.replace(urlPattern, '').trim();
          
          // Enhance the prompt with the analysis and modifications
          enhancedPrompt = `Create a motion graphics video based on this YouTube video analysis:\n\n${analysis}\n\n${modifications ? `User requirements: ${modifications}` : 'Reproduce this video as accurately as possible.'}`;
          console.log('🧠 [NEW ORCHESTRATOR] Enhanced prompt with YouTube analysis');
          console.log('🧠 [NEW ORCHESTRATOR] Enhanced prompt length:', enhancedPrompt.length);
        } catch (youtubeError) {
          console.error('🧠 [NEW ORCHESTRATOR] YouTube analysis failed:', youtubeError);
          input.onProgress?.('⚠️ Failed to analyze YouTube video, proceeding without analysis', 'building');
          
          // Fall back to original prompt if YouTube analysis fails
          // This allows the user's request to still be processed
          console.log('🧠 [NEW ORCHESTRATOR] Falling back to original prompt');
        }
      }
      
      // Update input with enhanced prompt
      const enhancedInput = {
        ...input,
        prompt: enhancedPrompt
      };
      
      // 1. Build context
      console.log('🧠 [NEW ORCHESTRATOR] Step 1: Building context...');
      input.onProgress?.('🧠 Understanding your request...', 'building');
      const contextPacket = await this.contextBuilder.buildContext(enhancedInput);
      console.log('🧠 [NEW ORCHESTRATOR] Context built successfully');

      // 2. Analyze intent and select tool
      console.log('🧠 [NEW ORCHESTRATOR] Step 2: Analyzing intent...');
      input.onProgress?.('🎯 Choosing the right approach...', 'building');
      const toolSelection = await this.intentAnalyzer.analyzeIntent(enhancedInput, contextPacket);
      console.log('🧠 [NEW ORCHESTRATOR] Tool selected:', {
        tool: toolSelection.toolName,
        reasoning: toolSelection.reasoning?.substring(0, 100) + '...'
      });

      if (!toolSelection.success) {
        return { 
          success: false, 
          error: toolSelection.error ?? 'Failed to understand request',
          chatResponse: "I couldn't understand your request. Could you please rephrase it?"
        };
      }
      
      // Handle clarification as a valid response, not an error
      if (toolSelection.needsClarification) {
        console.log('🧠 [NEW ORCHESTRATOR] Clarification needed:', toolSelection.clarificationQuestion);
        return {
          success: true,  // Clarification is a valid outcome
          needsClarification: true,
          chatResponse: toolSelection.clarificationQuestion || "Could you provide more details about what you'd like to create?",
          reasoning: toolSelection.reasoning
        };
      }
      
      // 3. Return decision (NO EXECUTION!)
      console.log('🧠 [NEW ORCHESTRATOR] Decision complete! Returning to router...');
      
      if (!toolSelection.toolName) {
        // This should rarely happen now with proper clarification handling
        console.error('🧠 [NEW ORCHESTRATOR] No tool selected and no clarification - this is a bug!');
        return {
          success: false,
          error: "No tool selected",
          chatResponse: "I need more information to help you."
        };
      }

      // Parse duration from user prompt
      const requestedDurationFrames = parseDurationFromPrompt(input.prompt);
      if (requestedDurationFrames) {
        console.log(`🧠 [ORCHESTRATOR] Parsed duration from prompt: ${requestedDurationFrames} frames`);
      }

      const result = {
        success: true,
        toolUsed: toolSelection.toolName,
        reasoning: toolSelection.reasoning,
        chatResponse: toolSelection.userFeedback || toolSelection.reasoning, // Use AI-generated feedback
        // Pass along the tool selection details for execution in generation.ts
        result: {
          toolName: toolSelection.toolName,
          toolContext: {
            userPrompt: input.prompt,
            targetSceneId: toolSelection.targetSceneId,
            targetDuration: toolSelection.targetDuration,
            requestedDurationFrames, // ADD THIS - explicit duration from prompt
            referencedSceneIds: toolSelection.referencedSceneIds,
            imageUrls: (input.userContext?.imageUrls as string[]) || undefined,
            videoUrls: (input.userContext?.videoUrls as string[]) || undefined,
            webContext: contextPacket.webContext,
            modelOverride: input.userContext?.modelOverride, // Pass model override if provided
            // Include persistent asset URLs for context
            assetUrls: contextPacket.assetContext?.assetUrls || []
          },
          workflow: toolSelection.workflow,
        }
      };
      
      // Debug logging for video URLs
      console.log('🧠 [NEW ORCHESTRATOR] Tool context being passed:', {
        hasImageUrls: !!(input.userContext?.imageUrls as string[])?.length,
        hasVideoUrls: !!(input.userContext?.videoUrls as string[])?.length,
        videoUrls: (input.userContext?.videoUrls as string[]),
      });
      
      console.log('🧠 [NEW ORCHESTRATOR] === ORCHESTRATION COMPLETE ===\n');
      return result;

    } catch (error) {
      console.error('[Orchestrator] Error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : String(error),
        chatResponse: "I encountered an issue processing your request. Please try again."
      };
    }
  }

}

// Singleton export
export const orchestrator = new Orchestrator();

// Export types for external use
export type { 
  OrchestrationInput, 
  OrchestrationOutput 
} from "~/lib/types/ai/brain.types";