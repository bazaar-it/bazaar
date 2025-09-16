// Simplified & Modular Orchestrator - Decision Only (Sprint 41)

import { ContextBuilder } from "./orchestrator_functions/contextBuilder";
import { IntentAnalyzer } from "./orchestrator_functions/intentAnalyzer";
import { parseDurationFromPrompt } from "./utils/durationParser";
import { youTubeContextStore } from "~/server/services/media/youtube-context.store";
// YouTube imports removed - analysis will be handled by tools when brain decides
import type { 
  OrchestrationInput, 
  OrchestrationOutput 
} from "~/lib/types/ai/brain.types";
import { FEATURES } from "~/config/features";

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
      hasAudio: !!(input.userContext?.audioUrls as string[])?.length,
      sceneCount: input.storyboardSoFar?.length || 0
    });
    
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

      // Prepare planned media (IDs → URLs) if Brain provided a mediaPlan
      // Declare ahead so later blocks can safely mutate
      let computedImageAction: 'embed' | 'recreate' | undefined = undefined;
      let plannedImageUrls: string[] | undefined = undefined;
      let plannedVideoUrls: string[] | undefined = undefined;
      let mappedImageDirectives: Array<{ url: string; action: 'embed' | 'recreate'; target?: any }>| undefined = undefined;
      try {
        const hasUserImages = !!(input.userContext?.imageUrls as string[])?.length;
        const hasUserVideos = !!(input.userContext?.videoUrls as string[])?.length;
        const plan = (toolSelection as any).mediaPlan as {
          imagesOrdered?: string[];
          videosOrdered?: string[];
          rationale?: string;
          imageDirectives?: Array<{ url: string; action: 'embed'|'recreate'; target?: any }>;
        } | undefined;
        const lib = (contextPacket as any).mediaLibrary as {
          images?: Array<{id: string; url: string}>;
          videos?: Array<{id: string; url: string}>;
        } | undefined;
        if (plan && lib) {
          const idToUrl = new Map<string, string>();
          (lib.images || []).forEach(a => idToUrl.set(a.id, a.url));
          (lib.videos || []).forEach(a => idToUrl.set(a.id, a.url));
          if (Array.isArray(plan.imagesOrdered) && plan.imagesOrdered.length > 0) {
            plannedImageUrls = plan.imagesOrdered.map(id => idToUrl.get(id) || (id.startsWith('http') ? id : undefined)).filter((u): u is string => !!u);
          }
          if (Array.isArray(plan.videosOrdered) && plan.videosOrdered.length > 0) {
            plannedVideoUrls = plan.videosOrdered.map(id => idToUrl.get(id) || (id.startsWith('http') ? id : undefined)).filter((u): u is string => !!u);
          }
          // Map imageDirectives urls from IDs → URLs when present
          if (Array.isArray((plan as any).imageDirectives) && (plan as any).imageDirectives.length > 0) {
            mappedImageDirectives = (plan as any).imageDirectives.map((d: any) => {
              const u = typeof d?.url === 'string' ? (idToUrl.get(d.url) || (d.url.startsWith('http') ? d.url : undefined)) : undefined;
              return u && (d.action === 'embed' || d.action === 'recreate') ? { url: u, action: d.action, target: d.target } : undefined;
            }).filter((x: any): x is { url: string; action: 'embed'|'recreate'; target?: any } => !!x);
          }
          if ((plannedImageUrls?.length || 0) > 0 || (plannedVideoUrls?.length || 0) > 0) {
            console.log('🧠 [NEW ORCHESTRATOR][MediaPlan] Using planned media', {
              images: plannedImageUrls?.length || 0,
              videos: plannedVideoUrls?.length || 0,
              rationale: (plan as any)?.rationale || 'n/a'
            });
          }
        }

        // Guardrail: If user DID NOT attach media and the prompt doesn't clearly ask for media,
        // do NOT inject planned media into a plain "add a new scene" request.
        if (!hasUserImages && !hasUserVideos) {
          const isEdit = toolSelection.toolName === 'editScene';
          const p = (enhancedInput.prompt || '').toLowerCase();
          const mediaIntent = /\b(image|images|screenshot|screenshots|photo|photos|logo|icon|background|overlay|ui)\b/.test(p)
            || /use\s+(my|the|previous|this|that)\b/.test(p)
            || /\bembed\b/.test(p);
          // For editScene, trust the Brain's plan if present
          if (!mediaIntent && !isEdit) {
            if ((plannedImageUrls?.length || 0) > 0 || (plannedVideoUrls?.length || 0) > 0) {
              console.log('🛑 [NEW ORCHESTRATOR][MediaPlan] Suppressing planned media (no media intent in prompt, no attachments)');
            }
            plannedImageUrls = undefined;
            plannedVideoUrls = undefined;
            mappedImageDirectives = undefined;
            computedImageAction = undefined;
          }
        }
      } catch (e) {
        console.warn('🧠 [NEW ORCHESTRATOR] Failed to map mediaPlan IDs to URLs (non-fatal):', e);
      }

      // Heuristic: if editing and plan includes UI-like assets, prefer recreate mode for edits
      try {
        if (toolSelection.toolName === 'editScene') {
          const lib = (contextPacket as any).mediaLibrary as { images?: Array<{id: string; tags: string[]}> } | undefined;
          const plan = (toolSelection as any).mediaPlan as { imagesOrdered?: string[] } | undefined;
          if (lib && plan && Array.isArray(plan.imagesOrdered)) {
            const tagsOfPlanned = plan.imagesOrdered
              .map(id => (lib.images || []).find(a => a.id === id)?.tags || [])
              .flat()
              .map(t => String(t));
            const hasUiLike = tagsOfPlanned.some(t => t.startsWith('kind:ui') || t.startsWith('layout:')) || false;
            if (hasUiLike) computedImageAction = 'recreate';
          }
        }
      } catch {}

      const result = {
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
            imageUrls: (() => {
              const a = Array.isArray(plannedImageUrls) ? plannedImageUrls : [];
              const b = Array.isArray(input.userContext?.imageUrls) ? (input.userContext!.imageUrls as string[]) : [];
              const merged = [...a, ...b].filter((u) => typeof u === 'string' && u.startsWith('http'));
              return merged.length ? Array.from(new Set(merged)) : undefined;
            })(),
            videoUrls: (() => {
              const a = Array.isArray(plannedVideoUrls) ? plannedVideoUrls : [];
              const b = Array.isArray(input.userContext?.videoUrls) ? (input.userContext!.videoUrls as string[]) : [];
              const merged = [...a, ...b].filter((u) => typeof u === 'string' && u.startsWith('http'));
              return merged.length ? Array.from(new Set(merged)) : undefined;
            })(),
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
            imageAction: (computedImageAction
              || (toolSelection.imageAction === 'embed' || toolSelection.imageAction === 'recreate' ? toolSelection.imageAction : undefined)
            ) as any,
            // Pass mapped directives if available
            imageDirectives: mappedImageDirectives && mappedImageDirectives.length ? mappedImageDirectives : undefined
          },
          workflow: toolSelection.workflow,
        }
      };
      
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
        const imgUrlsForLog = (result.result.toolContext as any)?.imageUrls as string[] | undefined;
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
