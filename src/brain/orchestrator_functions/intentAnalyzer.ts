// Intent analyzer for tool selection

import { AIClientService } from "~/server/services/ai/aiClient.service";
import { getModel } from "~/config/models.config";
import { SYSTEM_PROMPTS } from "~/config/prompts.config";
import type { OrchestrationInput, ToolSelectionResult, ContextPacket } from "~/lib/types/ai/brain.types";
import { FEATURES } from "~/config/features";

export class IntentAnalyzer {
  private modelConfig = getModel("brain");
  
  async analyzeIntent(input: OrchestrationInput, contextPacket: ContextPacket): Promise<ToolSelectionResult> {
    console.log('\n🎯 [NEW INTENT ANALYZER] === ANALYZING INTENT ===');
    console.log('🎯 [NEW INTENT ANALYZER] User prompt:', input.prompt.substring(0, 50) + '...');
    
    try {
      const systemPrompt = SYSTEM_PROMPTS.BRAIN_ORCHESTRATOR.content;
      const userPrompt = this.buildUserPrompt(input, contextPacket);
      
      const response = await AIClientService.generateResponse(
        this.modelConfig,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        undefined,
        { 
          responseFormat: { type: "json_object" }
        }
      );

      const rawOutput = response.content;
      if (!rawOutput) {
        throw new Error("No response from Brain LLM");
      }

      console.log('🎯 [NEW INTENT ANALYZER] Brain responded, parsing decision...');
      const parsed = this.extractJsonFromResponse(rawOutput);
      
      // Debug log to see what brain actually returned
      console.log('🎯 [NEW INTENT ANALYZER] Raw parsed JSON:', JSON.stringify(parsed, null, 2));
      
      let result = this.processBrainDecision(parsed, input);

      // Soft tie-breaker: if imageAction is undefined and attached images look like UI, prefer 'recreate'
      try {
        if (!result.imageAction && Array.isArray(input.userContext?.imageUrls) && input.userContext!.imageUrls!.length > 0) {
          const urls: string[] = (input.userContext!.imageUrls as string[]) || [];
          const assets = (contextPacket as any)?.assetContext?.allAssets || [];
          const looksLikeUI = urls.some((u) => {
            const a = assets.find((x: any) => x.url === u);
            if (!a) return false;
            const tags: string[] = a.tags || [];
            const isPhotoOrLogo = tags.includes('kind:photo') || tags.includes('kind:logo');
            const uiHints = tags.includes('kind:ui') || tags.includes('layout:dashboard') || tags.includes('layout:screenshot') || tags.includes('layout:mobile-ui') || tags.includes('layout:code-editor');
            return uiHints || !isPhotoOrLogo;
          });
          if (looksLikeUI) {
            result.imageAction = 'recreate';
            console.log('🎯 [INTENT] Defaulting imageAction to "recreate" for UI-like assets (soft tie-breaker)');
          }
        }
      } catch {}
      
      console.log('🎯 [NEW INTENT ANALYZER] Decision:', {
        toolName: result.toolName,
        success: result.success,
        reasoning: result.reasoning?.substring(0, 50) + '...'
      });
      
      return result;

    } catch (error) {
      console.error('[IntentAnalyzer] Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Intent analysis failed",
      };
    }
  }

  private buildUserPrompt(input: OrchestrationInput, contextPacket: ContextPacket): string {
    const { prompt, storyboardSoFar } = input;
    
    // Build storyboard context with clear ordering and recency
    let storyboardInfo = "No scenes yet";
    if (storyboardSoFar && storyboardSoFar.length > 0) {
      storyboardInfo = storyboardSoFar.map((scene, i) => {
        const sceneNum = i + 1;
        const isNewest = i === storyboardSoFar.length - 1;
        const isFirst = i === 0;
        const durationSec = (scene.duration / 30).toFixed(1); // Convert frames to seconds
        return `Scene ${sceneNum}: "${scene.name}" (ID: ${scene.id}, Duration: ${scene.duration} frames / ${durationSec}s)${isNewest ? ' [NEWEST/LAST ADDED]' : ''}${isFirst ? ' [FIRST]' : ''}`;
      }).join('\n');
      
      // Add helpful context about recent actions
      if (storyboardSoFar.length > 0) {
        storyboardInfo += `\n\nIMPORTANT: When user says "it" or "the scene" right after adding content, they usually mean the NEWEST scene (Scene ${storyboardSoFar.length}).`;
      }
      
      if (input.userContext?.sceneId) {
        const selected = storyboardSoFar.find(s => s.id === input.userContext?.sceneId);
        if (selected) storyboardInfo += `\nUSER SELECTED: "${selected.name}"`;
      }
    }
    
    // 🚨 CRITICAL: Add attached scenes context
    let attachedScenesInfo = "";
    const attachedSceneIds = (input.userContext?.sceneUrls as string[]) || [];
    if (attachedSceneIds.length > 0) {
      attachedScenesInfo = `\n\n🚨 ATTACHED SCENES (User dragged these into chat):`;
      attachedSceneIds.forEach((sceneId, idx) => {
        const scene = storyboardSoFar?.find(s => s.id === sceneId);
        if (scene) {
          attachedScenesInfo += `\n${idx + 1}. "${scene.name}" (ID: ${sceneId})`;
        } else {
          attachedScenesInfo += `\n${idx + 1}. Scene ID: ${sceneId}`;
        }
      });
      attachedScenesInfo += `\n\n🚨 CRITICAL: These attached scenes MUST be used as targetSceneId for any edit/delete/trim operations. The user explicitly selected these scenes by dragging them into the chat.`;
      attachedScenesInfo += `\n\nsceneUrls contains: [${attachedSceneIds.join(', ')}]`;
    }
    
    // Add image context
    let imageInfo = "";
    if (contextPacket.imageContext && contextPacket.imageContext.recentImagesFromChat && contextPacket.imageContext.recentImagesFromChat.length > 0) {
      const images = contextPacket.imageContext.recentImagesFromChat;
      imageInfo = `\nIMAGES IN CONVERSATION:`;
      images.forEach((img: any) => {
        imageInfo += `\n${img.position}. "${img.userPrompt}" [${img.imageUrls.length} image(s)]`;
      });
      imageInfo += `\n\nWhen user references images:
- "the image" or "this image" → most recent image (position ${images.length})
- "first/second/third image" → by position number
- "image 1/2/3" → by position number
- "earlier image" → previous images in conversation

NOTE: All tools are multimodal. When images are referenced, include them in the tool's imageUrls parameter.`;
    }
    
    // Check if current prompt has images and add metadata hints
    const currentImageUrls = (input.userContext?.imageUrls as string[]) || [];
    if (currentImageUrls.length > 0) {
      imageInfo += `\n\nCURRENT MESSAGE: Includes ${currentImageUrls.length} image(s) uploaded with this request.`;
      
      // Be explicit about which image is "this image" and add metadata-based intelligence
      if (currentImageUrls.length > 1) {
        imageInfo += `\n\n🚨 MULTIPLE IMAGES UPLOADED - USE METADATA FOR INTELLIGENT DECISIONS:`;
        imageInfo += `\nWhen user says "this image" without specifics:`;
        imageInfo += `\n- If context suggests background/embed → choose image with hint:embed or kind:photo`;
        imageInfo += `\n- If context suggests UI/interface → choose image with hint:recreate or kind:ui`;
        imageInfo += `\n- If ambiguous → use the LAST image (most recent)\n`;
        
        imageInfo += `\nImage list with metadata:`;
        currentImageUrls.forEach((url, index) => {
          const isLast = index === currentImageUrls.length - 1;
          const label = isLast ? ' <- MOST RECENT' : '';
          imageInfo += `\n  ${index + 1}. ${url.split('/').pop()?.substring(0, 50)}${label}`;
        });
      }
      
      // Check if we have metadata hints for these images
      console.log('🔍 [INTENT] Looking for metadata hints for', currentImageUrls.length, 'images');
      if (contextPacket.assetContext && (contextPacket.assetContext as any).allAssets) {
        const assets = (contextPacket.assetContext as any).allAssets || [];
        console.log('🔍 [INTENT] Found', assets.length, 'assets in context');
        
        currentImageUrls.forEach((url, index) => {
          console.log('🔍 [INTENT] Searching for metadata for URL:', url);
          const asset = assets.find((a: any) => a.url === url);
          
          if (asset) {
            console.log('🔍 [INTENT] Found asset with tags:', asset.tags);
            if (asset.tags?.length > 0) {
              const relevantTags = asset.tags.filter((t: string) => 
                t.startsWith('kind:') || t.startsWith('layout:') || t.startsWith('hint:')
              );
              if (relevantTags.length > 0) {
                const hasEmbedHint = relevantTags.some((t: string) => t.includes('embed'));
                const hasRecreateHint = relevantTags.some((t: string) => t.includes('recreate'));
                const isPhoto = relevantTags.some((t: string) => t.includes('photo'));
                const isUI = relevantTags.some((t: string) => t.includes('ui'));
                
                imageInfo += `\nImage ${index + 1} metadata: ${relevantTags.join(', ')}`;
                
                // Add specific guidance based on metadata
                // Conservative default: prefer recreate for UI/unknown; embed only for photos/logos
                if (hasRecreateHint || isUI || (!isPhoto && !relevantTags.some((t: string) => t.includes('logo')))) {
                  imageInfo += ` → BEST FOR: recreating as components, NOT backgrounds`;
                } else if (hasEmbedHint || isPhoto) {
                  imageInfo += ` → BEST FOR: backgrounds, decorative elements, direct display`;
                }
                
                console.log('✅ [INTENT] Added metadata hints with guidance:', relevantTags);
              } else {
                console.log('⚠️ [INTENT] Asset has tags but none are relevant:', asset.tags);
              }
            } else {
              console.log('⚠️ [INTENT] Asset found but has no tags');
            }
          } else {
            console.log('❌ [INTENT] No asset found for URL:', url);
          }
        });
      } else {
        console.log('❌ [INTENT] No asset context available');
      }
    }
    
    // Add conversation context with recent action detection
    let chatInfo = "";
    const recentMessages = contextPacket.recentMessages || [];
    if (recentMessages.length > 0) {
      chatInfo = "\nRECENT CONVERSATION:";
      // Include last 3 message pairs for context
      const messagesToShow = recentMessages.slice(-6);
      messagesToShow.forEach((msg, idx) => {
        chatInfo += `\n${msg.role.toUpperCase()}: "${msg.content.substring(0, 100)}${msg.content.length > 100 ? '...' : ''}"`;
      });
    }

    // Add web analysis context
    let webInfo = "";
    if (contextPacket.webContext) {
      const web = contextPacket.webContext;
      webInfo = `\nWEB ANALYSIS CONTEXT:
Website: ${web.pageData.title} (${web.originalUrl})
Description: ${web.pageData.description || 'No description'}
Key Headings: ${web.pageData.headings.slice(0, 3).join(', ')}
Screenshots: Desktop (${web.screenshotUrls.desktop}) & Mobile (${web.screenshotUrls.mobile})
Analyzed: ${new Date(web.analyzedAt).toLocaleString()}

The AI has access to visual screenshots of this website and can reference them for brand matching, design inspiration, and style consistency.`;
    }
    
    // Add project assets context (with tags/hints if available)
    let assetInfo = "";
    if (contextPacket.assetContext && contextPacket.assetContext.assetUrls.length > 0) {
      const assets = (contextPacket.assetContext as any).allAssets || [];
      const logos = (contextPacket.assetContext as any).logos || [];
      assetInfo = `\n\nPROJECT ASSETS (Previously uploaded): ${assets.length} asset(s)`;

      assets.slice(0, 5).forEach((asset: any, index: number) => {
        const tags = Array.isArray(asset.tags) && asset.tags.length ? ` [tags: ${asset.tags.slice(0,5).join(', ')}]` : '';
        assetInfo += `\n${index + 1}. ${asset.originalName} (${asset.type})${tags}`;
      });
      if (logos.length > 0) {
        assetInfo += `\nLOGOS: ${logos.length} logo(s) available`;
      }
      assetInfo += `\nHint tags may include kind:logo/ui, layout:*, color:#xxxxxx, hasText, hint:embed/hint:recreate.`;
    }

    return `USER: "${prompt}"

STORYBOARD:
${storyboardInfo}${attachedScenesInfo}${imageInfo}${chatInfo}${webInfo}${assetInfo}

Respond with JSON only.`;
  }

  private extractJsonFromResponse(content: string): any {
    if (!content || typeof content !== 'string') {
      throw new Error('Empty or invalid response content');
    }

    const cleaned = content.trim();

    if (cleaned.startsWith('```')) {
      const lines = cleaned.split('\n');
      const startIndex = lines.findIndex(line => line.includes('```json') || line === '```');
      const endIndex = lines.findIndex((line, index) => index > startIndex && line.includes('```'));
      
      if (startIndex !== -1 && endIndex !== -1) {
        const jsonLines = lines.slice(startIndex + 1, endIndex);
        const jsonString = jsonLines.join('\n').trim();
        
        if (!jsonString) {
          throw new Error('Empty JSON content in markdown block');
        }
        
        return JSON.parse(jsonString);
      }
    }

    return JSON.parse(cleaned);
  }

  private processBrainDecision(parsed: any, input: OrchestrationInput): ToolSelectionResult {
    // Check for multi-step workflow
    if (parsed.workflow && Array.isArray(parsed.workflow)) {
      return {
        success: true,
        workflow: parsed.workflow,
        reasoning: parsed.reasoning || "Multi-step workflow planned",
      };
    }
    
    // Handle clarification responses
    if (parsed.needsClarification) {
      // If brain provided both tool and clarification, prefer the tool
      if (parsed.toolName) {
        console.log('🎯 [INTENT] Brain wants clarification but chose tool - proceeding with tool:', parsed.toolName);
        // Continue to normal processing
      } else {
        // Only clarification, no tool
        return {
          success: true,
          needsClarification: true,
          clarificationQuestion: parsed.clarificationQuestion,
          reasoning: parsed.reasoning,
          toolName: undefined  // Optional field, use undefined instead of null
        };
      }
    }

    // Single tool operation
    let result: ToolSelectionResult = {
      success: true,
      toolName: parsed.toolName,
      reasoning: parsed.reasoning,
      targetSceneId: parsed.targetSceneId,
      targetDuration: parsed.targetDuration, // Pass through targetDuration for trim
      referencedSceneIds: parsed.referencedSceneIds, // Pass through referenced scenes
      websiteUrl: parsed.websiteUrl, // Pass through website URL for websiteToVideo tool
      imageAction: parsed.imageAction, // Brain-driven image intent
      imageDirectives: parsed.imageDirectives, // Optional per-image actions
      userFeedback: parsed.userFeedback,
    };

    // Guard: disable website tool when the feature flag is off
    if (!FEATURES.WEBSITE_TO_VIDEO_ENABLED && result.toolName === 'websiteToVideo') {
      // Fallback to a safe default (addScene) and strip website specifics
      result = {
        ...result,
        toolName: 'addScene',
        websiteUrl: undefined,
        reasoning: (parsed.reasoning ? `${parsed.reasoning} ` : '') + '[Website tool disabled] Proceeding with standard scene generation.',
        userFeedback: parsed.userFeedback || 'Proceeding with a standard scene (website pipeline is temporarily disabled).'
      };
    }

    // Extract requested duration
    const requestedDurationSeconds = this.extractRequestedDuration(input.prompt);
    if (requestedDurationSeconds) {
      result.requestedDurationSeconds = requestedDurationSeconds;
    }

    return result;
  }

  private extractRequestedDuration(prompt: string): number | undefined {
    const durationMatch = prompt.match(/\b(\d+)\s*(?:seconds?|sec|se[ocn]{1,3}ds?)\b/i);
    if (durationMatch && durationMatch[1]) {
      const seconds = parseInt(durationMatch[1], 10);
      if (!isNaN(seconds) && seconds > 0) {
        return seconds;
      }
    }
    return undefined;
  }
} 
