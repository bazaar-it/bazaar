// Simplified & Modular Orchestrator - Decision Only (Sprint 41)

import { ContextBuilder } from "./orchestrator_functions/contextBuilder";
import { IntentAnalyzer } from "./orchestrator_functions/intentAnalyzer";
import { parseDurationFromPrompt } from "./utils/durationParser";
import { youTubeContextStore } from "~/server/services/media/youtube-context.store";
import { shouldResolveMediaPlan } from "./utils/shouldResolveMediaPlan";
// YouTube imports removed - analysis will be handled by tools when brain decides
import type {
  OrchestrationInput,
  OrchestrationOutput,
  ToolSelectionResult,
} from "~/lib/types/ai/brain.types";
import { FEATURES } from "~/config/features";
import { mediaPlanService } from "./services/media-plan.service";

export class Orchestrator {
  private contextBuilder = new ContextBuilder();
  private intentAnalyzer = new IntentAnalyzer();

  async processUserInput(input: OrchestrationInput, options?: { requestId?: string }): Promise<OrchestrationOutput> {
    console.log('\n🧠 [NEW ORCHESTRATOR] === PROCESSING USER INPUT ===');
    console.log('🧠 [NEW ORCHESTRATOR] Input:', {
      prompt: input.prompt,
      projectId: input.projectId,
      hasImages: !!(input.userContext?.imageUrls as string[])?.length,
      hasVideos: !!(input.userContext?.videoUrls as string[])?.length,
      hasAudio: !!(input.userContext?.audioUrls as string[])?.length,
      sceneCount: input.storyboardSoFar?.length || 0
    });

    const requestId = options?.requestId;
    const shouldLogStructured = process.env.NODE_ENV !== 'production';
    
    // Define enhancedPrompt at the beginning of the function
    let enhancedPrompt = input.prompt;
    
    try {
      // Check for website URL first (before YouTube) — DISABLED via feature flag
      if (FEATURES.WEBSITE_TO_VIDEO_ENABLED) {
        const { WebsiteToVideoTool } = await import("~/tools/website/websiteToVideo");
        if (WebsiteToVideoTool.isWebsiteRequest(input.prompt)) {
          const websiteUrl = WebsiteToVideoTool.extractUrl(input.prompt);
          if (websiteUrl && !websiteUrl.includes('youtube.com') && !websiteUrl.includes('youtu.be')) {
            console.log('🧠 [NEW ORCHESTRATOR] Website URL detected:', websiteUrl);
            // For website requests, we could let the intent analyzer decide to use the website tool
            // Add a hint to the context
            enhancedPrompt = `${input.prompt}\n\n[CONTEXT: User provided website URL: ${websiteUrl}]`;
          }
        }
      } else {
        // Explicitly skip website detection when disabled
        // console.log('🧠 [NEW ORCHESTRATOR] Website pipeline disabled by feature flag');
      }
      
      // Check if this is a YouTube URL with time specification
      // Only do YouTube analysis if we have both URL and time
      
      // Check for GitHub component reference - only if explicitly enabled via toggle
      const shouldUseGitHub = input.userContext?.useGitHub === true;
      
      if (shouldUseGitHub && input.userContext?.githubConnected) {
        console.log('🧠 [NEW ORCHESTRATOR] GitHub component reference detected');
        
        try {
          const { GitHubComponentAnalyzerTool } = await import("./tools/github-component-analyzer");
          const analyzer = new GitHubComponentAnalyzerTool();
          
          // Extract component reference from prompt
          const componentRef = analyzer.extractComponentReference(input.prompt);
          
          if (componentRef) {
            console.log(`🧠 [NEW ORCHESTRATOR] Looking for component:`, componentRef);
            
            // Get GitHub context
            const context = await analyzer.analyze(
              input.userId,
              componentRef, // Pass the full reference object
              input.userContext.githubAccessToken as string
            );
            
            if (context) {
              // Enhance prompt with GitHub context
              enhancedPrompt = analyzer.createEnhancedPrompt(input.prompt, context);
              console.log('🧠 [NEW ORCHESTRATOR] Enhanced prompt with GitHub component context');
            } else {
              // Check if it's because no repos are selected
              const { GitHubComponentSearchService } = await import("~/server/services/github/component-search.service");
              const selectedRepos = await GitHubComponentSearchService.getUserRepositories(input.userId);
              
              if (selectedRepos.length === 0) {
                // User has GitHub connected but no repos selected
                console.log('🧠 [NEW ORCHESTRATOR] No repositories selected for GitHub search');
                return {
                  success: true,
                  needsClarification: true,
                  chatResponse: `I noticed you're trying to animate "${componentRef.name}" from your GitHub, but you haven't selected any repositories to search yet.\n\nPlease go to Settings → GitHub Integration and select which repositories you want me to search for components.`,
                  reasoning: "User needs to select repositories first"
                };
              } else {
                // Component not found in selected repos
                console.log(`🧠 [NEW ORCHESTRATOR] Component "${componentRef.name}" not found in selected repos`);
                return {
                  success: true,
                  needsClarification: true,
                  chatResponse: `I couldn't find a component called "${componentRef.name}" in your selected repositories.\n\nMake sure the component exists in one of your selected repos, or try a different component name.`,
                  reasoning: "Component not found in selected repositories"
                };
              }
            }
          }
        } catch (error) {
          console.error('🧠 [NEW ORCHESTRATOR] GitHub component analysis failed:', error);
          // Continue without GitHub context
        }
      }
      
      // Simple check for YouTube URL with time specification
      const hasYouTube = /youtube\.com|youtu\.be/.test(input.prompt);
      const hasTimeSpec = /first\s+\d+|^\d+[-–]\d+|\d+:\d+|seconds?\s+\d+/i.test(input.prompt);
      
      if (hasYouTube && hasTimeSpec) {
        // We have both URL and time - safe to analyze
        console.log('🧠 [NEW ORCHESTRATOR] YouTube URL with time specification detected');
        
        // Dynamic import to avoid issues
        const { extractYouTubeUrl, YouTubeAnalyzerTool } = await import("./tools/youtube-analyzer");
        const youtubeUrl = extractYouTubeUrl(input.prompt);
        
        if (youtubeUrl) {
          try {
            console.log('🧠 [NEW ORCHESTRATOR] Analyzing YouTube video with specified time range');
            const youtubeAnalyzer = new YouTubeAnalyzerTool();
            
            // Extract time range from the prompt
            const timeMatch = input.prompt.match(/(\d+)[-–](\d+)|first\s+(\d+)/i);
            let startSec = 0;
            let endSec = 10;
            
            if (timeMatch) {
              if (timeMatch[1] && timeMatch[2]) {
                // Range like "26-30"
                startSec = parseInt(timeMatch[1]);
                endSec = parseInt(timeMatch[2]);
              } else if (timeMatch[3]) {
                // "first N seconds"
                endSec = parseInt(timeMatch[3]);
              }
            }
            
            // Enforce 10 second cap
            const duration = Math.min(endSec - startSec, 10);
            
            const { analysis } = await youtubeAnalyzer.execute({
              youtubeUrl,
              duration, // Just pass duration in seconds
              additionalInstructions: `Analyze seconds ${startSec} to ${startSec + duration}`
            });
            
            // Pass the description directly - no JSON, just natural language
            enhancedPrompt = `Recreate this video based on the following description:\n\n${analysis}\n\nThis is a description of what appears in the video. Create Remotion code that brings this description to life.`;
            console.log('🧠 [NEW ORCHESTRATOR] Enhanced prompt with YouTube analysis');
          } catch (error) {
            console.error('🧠 [NEW ORCHESTRATOR] YouTube analysis failed:', error);
            // Continue without analysis
          }
        }
      }
      
      const enhancedInput = {
        ...input,
        prompt: enhancedPrompt
      };
      
      // 0.5. Add YouTube context if available
      const youtubeContext = youTubeContextStore.getFormattedContext(input.projectId);
      if (youtubeContext) {
        console.log('🧠 [NEW ORCHESTRATOR] Found YouTube reference context:', youtubeContext);
        // Append YouTube context to the enhanced prompt
        enhancedInput.prompt = enhancedInput.prompt + youtubeContext;
      }
      
      // 1. Build context
      console.log('🧠 [NEW ORCHESTRATOR] Step 1: Building context...');
      input.onProgress?.('🧠 Understanding your request...', 'building');
      const contextPacket = await this.contextBuilder.buildContext(enhancedInput);
      console.log('🧠 [NEW ORCHESTRATOR] Context built successfully');

      // 2. Analyze intent and select tool
      console.log('🧠 [NEW ORCHESTRATOR] Step 2: Analyzing intent...');
      input.onProgress?.('🎯 Choosing the right approach...', 'building');
      let toolSelection = await this.intentAnalyzer.analyzeIntent(enhancedInput, contextPacket);
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

      const attachmentImageCount = Array.isArray(enhancedInput.userContext?.imageUrls)
        ? (enhancedInput.userContext?.imageUrls as string[]).filter(
            (url): url is string => typeof url === 'string' && /^https?:\/\//i.test(url ?? '')
          ).length
        : 0;
      const attachmentVideoCount = Array.isArray(enhancedInput.userContext?.videoUrls)
        ? (enhancedInput.userContext?.videoUrls as string[]).filter(
            (url): url is string => typeof url === 'string' && /^https?:\/\//i.test(url ?? '')
          ).length
        : 0;

      const shouldResolve = shouldResolveMediaPlan(
        toolSelection,
        contextPacket,
        {
          imageCount: attachmentImageCount,
          videoCount: attachmentVideoCount,
        }
      );

      const planned = shouldResolve
        ? mediaPlanService.resolvePlan(
            toolSelection,
            contextPacket,
            input.prompt,
            { imageUrls: input.userContext?.imageUrls as string[] | undefined, videoUrls: input.userContext?.videoUrls as string[] | undefined },
            { requestId, projectId: input.projectId }
          )
        : ({ suppressed: false } as ReturnType<typeof mediaPlanService.resolvePlan>);

      if (!shouldResolve) {
        const projectCounts = contextPacket.mediaLibrary?.meta ?? {
          projectImageCount: 0,
          projectVideoCount: 0,
        };
        console.log('🧠 [NEW ORCHESTRATOR][MediaPlan] Skipping resolvePlan — no actionable media.', {
          planImages: toolSelection.mediaPlan?.imagesOrdered?.length || 0,
          planVideos: toolSelection.mediaPlan?.videosOrdered?.length || 0,
          planDirectives: Array.isArray((toolSelection.mediaPlan as any)?.imageDirectives)
            ? (toolSelection.mediaPlan as any).imageDirectives.length
            : 0,
          projectImages: projectCounts.projectImageCount,
          projectVideos: projectCounts.projectVideoCount,
          attachmentImages: attachmentImageCount,
          attachmentVideos: attachmentVideoCount,
        });
      }
      if (!planned.suppressed && ((planned.imageUrls?.length || 0) > 0 || (planned.videoUrls?.length || 0) > 0)) {
        console.log('🧠 [NEW ORCHESTRATOR][MediaPlan] Using planned media', {
          images: planned.imageUrls?.length || 0,
          videos: planned.videoUrls?.length || 0,
          rationale: toolSelection.mediaPlan?.rationale || 'n/a'
        });
      } else if (planned.suppressed) {
        console.log('🛑 [NEW ORCHESTRATOR][MediaPlan] Suppressing planned media', { reason: planned.reason });
      }

      const mediaPlanDebug = planned.debug;

      if (shouldLogStructured) {
        try {
          const attachments = {
            images: (input.userContext?.imageUrls as string[] | undefined)?.length || 0,
            videos: (input.userContext?.videoUrls as string[] | undefined)?.length || 0,
            audio: (input.userContext?.audioUrls as string[] | undefined)?.length || 0,
          };
          const summary = {
            type: 'orchestrator.mediaPlan.summary',
            requestId,
            projectId: input.projectId,
            promptPreview: input.prompt.slice(0, 160),
            tool: toolSelection.toolName,
            mediaPlan: toolSelection.mediaPlan ? {
              hasPlan: true,
              imagesOrdered: toolSelection.mediaPlan.imagesOrdered?.length || 0,
              videosOrdered: toolSelection.mediaPlan.videosOrdered?.length || 0,
              directives: Array.isArray((toolSelection as any).mediaPlan?.imageDirectives)
                ? (toolSelection as any).mediaPlan.imageDirectives.length
                : 0,
            } : { hasPlan: false },
            attachments,
            resolved: {
              suppressed: planned.suppressed,
              reason: planned.reason,
              imageUrls: planned.imageUrls?.length || 0,
              videoUrls: planned.videoUrls?.length || 0,
              imageAction: planned.imageAction || (toolSelection.imageAction ?? null),
              directives: planned.imageDirectives?.length || 0,
              sourceMap: mediaPlanDebug?.sourceMap?.length || 0,
              skippedPlan: planned.skippedPlanUrls?.length || 0,
            },
            debug: mediaPlanDebug ? {
              planImagesOrdered: mediaPlanDebug.plan?.imagesOrdered || [],
              planVideosOrdered: mediaPlanDebug.plan?.videosOrdered || [],
              planMapping: mediaPlanDebug.plan?.mapping,
              sourceMap: mediaPlanDebug.sourceMap,
              plannedImages: mediaPlanDebug.plannedImages,
              plannedVideos: mediaPlanDebug.plannedVideos,
              attachments: mediaPlanDebug.attachments,
              mappedDirectives: mediaPlanDebug.mappedDirectives,
              skippedPlanUrls: mediaPlanDebug.skippedPlanUrls,
            } : undefined,
          };
          console.log('[MEDIA_PLAN_SUMMARY]', JSON.stringify(summary));
        } catch (err) {
          console.warn('🧠 [NEW ORCHESTRATOR] Failed to log media plan summary:', err);
        }
      }

      // Heuristics for imageAction are handled inside mediaPlanService

      const result: OrchestrationOutput & {
        result: OrchestrationOutput['result'] & { workflow?: any };
      } = {
        success: true,
        toolUsed: toolSelection.toolName,
        reasoning: toolSelection.reasoning,
        chatResponse: toolSelection.userFeedback || toolSelection.reasoning, // Use AI-generated feedback
        // Pass along the tool selection details for execution in generation.ts
        result: {
          toolName: toolSelection.toolName,
          toolContext: {
            userPrompt: enhancedPrompt, // Use the ENHANCED prompt with YouTube analysis
            targetSceneId: toolSelection.targetSceneId,
            targetDuration: toolSelection.targetDuration,
            requestedDurationFrames, // ADD THIS - explicit duration from prompt
            referencedSceneIds: toolSelection.referencedSceneIds,
            // Website pipeline disabled: do not pass websiteUrl
            websiteUrl: FEATURES.WEBSITE_TO_VIDEO_ENABLED ? toolSelection.websiteUrl : undefined,
            // Prefer Brain mediaPlan; merge with any user attachments (dedup)
            imageUrls: planned.suppressed ? ((input.userContext?.imageUrls as string[]) || undefined) : planned.imageUrls || ((input.userContext?.imageUrls as string[]) || undefined),
            videoUrls: planned.suppressed ? ((input.userContext?.videoUrls as string[]) || undefined) : planned.videoUrls || ((input.userContext?.videoUrls as string[]) || undefined),
            audioUrls: (input.userContext?.audioUrls as string[]) || undefined,
            webContext: contextPacket.webContext,
            modelOverride: input.userContext?.modelOverride, // Pass model override if provided
            // Include persistent asset URLs for context
            assetUrls: contextPacket.assetContext?.assetUrls || [],
            // Add YouTube analysis flag
            isYouTubeAnalysis: hasYouTube && hasTimeSpec,
            // Include template context for better first-scene generation
            templateContext: contextPacket.templateContext,
            // Only pass a valid imageAction enum; drop 'mixed' or unknown
            imageAction: planned.imageAction || (toolSelection.imageAction === 'embed' || toolSelection.imageAction === 'recreate' ? toolSelection.imageAction : undefined),
            imageDirectives: planned.imageDirectives && planned.imageDirectives.length ? planned.imageDirectives : undefined
          },
          workflow: toolSelection.workflow,
        },
      };

      if (mediaPlanDebug) {
        result.mediaPlanDebug = {
          plan: mediaPlanDebug.plan,
          sourceMap: mediaPlanDebug.sourceMap,
          plannedImages: mediaPlanDebug.plannedImages,
          plannedVideos: mediaPlanDebug.plannedVideos,
          attachments: mediaPlanDebug.attachments,
          mappedDirectives: mediaPlanDebug.mappedDirectives,
          skippedPlanUrls: mediaPlanDebug.skippedPlanUrls,
        };
      }
      
      // Debug logging for video URLs and template context
      console.log('🧠 [NEW ORCHESTRATOR] Tool context being passed:', {
        hasImageUrls: !!(input.userContext?.imageUrls as string[])?.length,
        hasVideoUrls: !!(input.userContext?.videoUrls as string[])?.length,
        videoUrls: (input.userContext?.videoUrls as string[]),
        hasTemplateContext: !!contextPacket.templateContext,
        templateCount: contextPacket.templateContext?.examples?.length || 0,
        templateNames: contextPacket.templateContext?.examples?.map(t => t.name) || [],
      }); 
      
      // Log actual image URLs being passed to tools (from toolContext)
      try {
        const imgUrlsForLog = (result.result.toolContext)?.imageUrls as string[] | undefined;
        if (imgUrlsForLog?.length) {
          console.log('📸 [NEW ORCHESTRATOR] Image URLs being passed to tool:', imgUrlsForLog);
        }
      } catch {}
      
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
