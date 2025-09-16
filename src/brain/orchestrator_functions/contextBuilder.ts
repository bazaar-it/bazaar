// Context builder for the modular orchestrator
// Rebuilt to use real context: web analysis, scene history, chat context

import { db } from "~/server/db";
import { scenes, messages } from "~/server/db/schema";
import { eq, desc, and, inArray } from "drizzle-orm";
import type { OrchestrationInput, ContextPacket } from "~/lib/types/ai/brain.types";
import { extractFirstValidUrl, normalizeUrl, isValidWebUrl } from "~/lib/utils/url-detection";
import { assetContext } from "~/server/services/context/assetContextService";
import type { AssetContext } from "~/lib/types/asset-context";
import { templateMatcher } from "~/services/ai/templateMatching.service";
import { templateLoader } from "~/services/ai/templateLoader.service";

export class ContextBuilder {

  async buildContext(input: OrchestrationInput): Promise<ContextPacket> {
    console.log('\n📚 [CONTEXT BUILDER] === BUILDING REAL CONTEXT ===');
    console.log('📚 [CONTEXT BUILDER] Project:', input.projectId);
    console.log('📚 [CONTEXT BUILDER] Has images:', !!(input.userContext?.imageUrls as string[])?.length);
    
          try {
        // 1. Get scenes with FULL TSX code for cross-scene operations
        const attachedSceneIds = (input.userContext?.sceneUrls ?? []) as string[];
        
        let scenesWithCode;
        if ((attachedSceneIds as string[]).length > 0) {
          // Only include attached scenes for context when specific scenes are referenced
          console.log(`📚 [CONTEXT BUILDER] Scene attachments detected: ${(attachedSceneIds as string[]).length} scenes`);
          scenesWithCode = await db
            .select({ 
              id: scenes.id, 
              name: scenes.name, 
              order: scenes.order,
              tsxCode: scenes.tsxCode  // Full code for context
            })
            .from(scenes)
            .where(and(
              eq(scenes.projectId, input.projectId),
              inArray(scenes.id, attachedSceneIds)  // Only attached scenes
            ))
            .orderBy(scenes.order);
        } else {
          // Fallback: include all scenes for general context
          scenesWithCode = await db
            .select({ 
              id: scenes.id, 
              name: scenes.name, 
              order: scenes.order,
              tsxCode: scenes.tsxCode  // Full code for context
            })
            .from(scenes)
            .where(eq(scenes.projectId, input.projectId))
            .orderBy(scenes.order);
        }

      // 2. Build FULL chat context - we have 1M+ context window, use it!
      // Include ALL messages for complete conversation understanding
      const recentChat = (input.chatHistory || []);

      // 3-6. Parallelize independent context ops for performance
      const [
        imageContext,
        webContext,
        projectAssets,
        mediaLibImages,
        mediaLibVideos,
        templateContext
      ] = await Promise.all([
        this.buildImageContext(input),
        this.buildWebContext(input),
        assetContext.getProjectAssets(input.projectId),
        assetContext.listProjectAssets(input.projectId, { types: ['image', 'logo'], limit: 50 }),
        assetContext.listProjectAssets(input.projectId, { types: ['video'], limit: 50 }),
        this.buildTemplateContext(input, scenesWithCode),
      ]);

      console.log(`📚 [CONTEXT BUILDER] Found ${projectAssets.assets.length} persistent assets`);
      console.log(`📚 [CONTEXT BUILDER] Logos: ${projectAssets.logos.length}`);

      let mediaLibrary: ContextPacket['mediaLibrary'] | undefined = undefined;
      try {
        mediaLibrary = { images: mediaLibImages, videos: mediaLibVideos };
        console.log(`📚 [CONTEXT BUILDER] MediaLibrary built: images=${mediaLibImages.length}, videos=${mediaLibVideos.length}`);
      } catch (e) {
        console.warn('📚 [CONTEXT BUILDER] Failed to construct MediaLibrary (non-fatal):', e);
      }
      
      // 6. NEW: Build template context when appropriate
      const templateContext = await this.buildTemplateContext(input, scenesWithCode);
      if (templateContext) {
        console.log(`📚 [CONTEXT BUILDER] Added ${templateContext.examples.length} template examples for better generation`);
      }
      
      return {
        // Real scene history with full TSX for cross-scene operations
        sceneHistory: scenesWithCode.map(scene => ({
          id: scene.id,
          name: scene.name || 'Untitled Scene',
          tsxCode: scene.tsxCode || '', // Full code available for context
          order: scene.order
        })),
        
        // Recent conversation for flow understanding
        conversationContext: this.summarizeConversation(recentChat),
        recentMessages: recentChat,
        
        // Image context from uploads
        imageContext: imageContext,
        
        // Web analysis context from URL detection
        webContext: webContext,
        
        // Scene list for quick reference
        sceneList: scenesWithCode.map(scene => ({
          id: scene.id,
          name: scene.name || 'Untitled Scene',
          order: scene.order
        })),
        
        // Persistent asset context
        assetContext: projectAssets.assets.length > 0 ? {
          allAssets: projectAssets.assets.map(a => ({
            url: a.url,
            type: a.type,
            originalName: a.originalName,
            tags: a.tags || []
          })),
          logos: projectAssets.logos.map(l => l.url),
          assetUrls: projectAssets.assets.map(a => a.url)
        } : undefined,
        
        // NEW: Template context for improved generation
        templateContext: templateContext,

        // NEW: Compact Media Library for Intent Analyzer
        mediaLibrary
      };

    } catch (error) {
      console.error('[ContextBuilder] Error building context:', error);
      
      // Minimal fallback
      return {
        sceneHistory: [],
        conversationContext: 'New conversation',
        recentMessages: input.chatHistory?.slice(-5) || [],
        imageContext: { currentImages: [], recentImagesFromChat: [] },
        webContext: undefined,
        sceneList: []
      };
    }
  }


  private summarizeConversation(chatHistory: Array<{role: string, content: string}>): string {
    if (chatHistory.length === 0) return 'New conversation';
    
    // Now we have ALL messages, not just last 5
    const recentMessages = chatHistory;
    const topics: string[] = [];
    
    for (const message of recentMessages) {
      if (message.role === 'user') {
        if (message.content.includes('create') || message.content.includes('generate')) {
          topics.push('scene creation');
        }
        if (message.content.includes('edit') || message.content.includes('change')) {
          topics.push('scene editing');
        }
        if (message.content.includes('color') || message.content.includes('background')) {
          topics.push('styling');
        }
      }
    }
    
    const uniqueTopics = Array.from(new Set(topics));
    return uniqueTopics.length > 0 ? `Conversation about: ${uniqueTopics.join(', ')}` : 'General conversation';
  }

  private async buildImageContext(input: OrchestrationInput) {
    // Simple: Check current request for images and videos
    const currentImages = input.userContext?.imageUrls as string[] || [];
    const currentVideos = input.userContext?.videoUrls as string[] || [];
    
    // Extract images from ALL chat history now that we include everything
    const recentImagesFromChat: any[] = [];
    const recentVideosFromChat: any[] = [];
    const recentChat = input.chatHistory || [];
    
    for (let i = 0; i < recentChat.length; i++) {
      const msg = recentChat[i];
      if (msg && msg.role === 'user') {
        if ((msg as any).imageUrls?.length > 0) {
          recentImagesFromChat.push({
            position: i + 1,
            userPrompt: msg.content,
            imageUrls: (msg as any).imageUrls
          });
        }
        if ((msg as any).videoUrls?.length > 0) {
          recentVideosFromChat.push({
            position: i + 1,
            userPrompt: msg.content,
            videoUrls: (msg as any).videoUrls
          });
        }
      }
    }

    return { 
      currentImages,
      currentVideos,
      recentImagesFromChat,
      recentVideosFromChat
    };
  }

  private async buildWebContext(input: OrchestrationInput) {
    try {
      // Respect feature flag: disable website analysis entirely when off
      const { FEATURES } = await import('~/config/features');
      if (!FEATURES.WEBSITE_TO_VIDEO_ENABLED) {
        // console.log('📚 [CONTEXT BUILDER] Website analysis disabled by feature flag');
        return undefined;
      }

      // ONLY analyze websites if explicitly provided with http/https
      let targetUrl = extractFirstValidUrl(input.prompt);
      
      // Skip YouTube URLs - they're handled separately
      if (targetUrl && (targetUrl.includes('youtube.com') || targetUrl.includes('youtu.be'))) {
        console.log('📚 [CONTEXT BUILDER] Skipping YouTube URL - handled by YouTube analyzer');
        return undefined;
      }
      
      // DO NOT extract random domains from text! Only explicit URLs
      // This prevents crawling random websites mentioned in videos or text
      if (!targetUrl) {
        console.log('📚 [CONTEXT BUILDER] No explicit website URL provided');
        return undefined;
      }
      
      // SKIP analysis if the prompt is ONLY a URL (websiteToVideo will handle it)
      // Extract just the first line (the actual user input) before any [CONTEXT: ...] additions
      const firstLine = (input.prompt ?? '').split('\n')[0]?.trim() ?? '';
      const cleanPrompt = firstLine.replace(/[.,;!?)+\s]+$/, '');
      const cleanUrl = targetUrl.replace(/[.,;!?)+]+$/, '');
      
      // Debug logging
      console.log('📚 [CONTEXT BUILDER] URL Detection Debug:', {
        originalPrompt: input.prompt ?? '',
        firstLine,
        cleanPrompt,
        targetUrl,
        cleanUrl,
        isPlainUrl: cleanPrompt === targetUrl || cleanPrompt === cleanUrl || firstLine === targetUrl,
      });
      
      const promptIsJustUrl = cleanPrompt === targetUrl || 
                              cleanPrompt === cleanUrl ||
                              firstLine === targetUrl;
      
      if (promptIsJustUrl) {
        console.log('📚 [CONTEXT BUILDER] ✅ Plain URL detected - skipping analysis (websiteToVideo tool will handle)');
        return undefined;
      }
      
      console.log(`📚 [CONTEXT BUILDER] Analyzing website: ${targetUrl}`);
      
      // Dynamic import to ensure server-side only execution
      const { WebAnalysisAgentV4 } = await import('~/tools/webAnalysis/WebAnalysisAgentV4');
      const webAgent = new WebAnalysisAgentV4(input.projectId);
      
      // Perform web analysis with V4
      let analysis;
      try {
        analysis = await webAgent.analyze(targetUrl);
      } catch (error: any) {
        console.log(`📚 [CONTEXT BUILDER] Web analysis failed: ${error.message}`);
        return undefined;
      }
      
      // Save to brand profile table
      try {
        const { saveBrandProfile } = await import('~/server/services/website/save-brand-profile');
        await saveBrandProfile(input.projectId, targetUrl, analysis);
        console.log(`📚 [CONTEXT BUILDER] 💾 Brand profile saved to database`);
      } catch (error) {
        console.error(`📚 [CONTEXT BUILDER] Failed to save brand profile:`, error);
        // Continue even if save fails
      }
      
      // Return structured web context for V4
      if (analysis.screenshots && (analysis.brand || analysis.product)) {
        console.log(`📚 [CONTEXT BUILDER] ✅ Web context created for ${analysis.brand?.identity?.name || 'website'}`);
        
        // Debug: Check if extraction data is present
        console.log(`📚 [CONTEXT BUILDER] V4 Data structure:`, {
          hasBrand: !!analysis.brand,
          hasProduct: !!analysis.product,
          hasScreenshots: !!analysis.screenshots,
          screenshotCount: analysis.screenshots?.length || 0,
          brandKeys: analysis.brand ? Object.keys(analysis.brand).slice(0, 5) : 'none'
        });
        
        // Create V4-compatible web context that matches the expected type
        const webContext = {
          originalUrl: analysis.metadata?.url || targetUrl,
          screenshotUrls: {
            desktop: analysis.screenshots?.find(s => s.type === 'desktop')?.url || 
                    analysis.screenshots?.[0]?.url || '',
            mobile: analysis.screenshots?.find(s => s.type === 'mobile')?.url || 
                   analysis.screenshots?.[1]?.url || ''
          },
          pageData: {
            title: analysis.brand?.identity?.name || 'Untitled',
            description: analysis.brand?.identity?.tagline,
            headings: [],
            url: analysis.metadata?.url || targetUrl
          },
          analyzedAt: new Date().toISOString()
        };
        
        // Fire-and-forget async save to database
        (async () => {
          try {
            const { webContextService } = await import('~/server/services/data/web-context.service');
            await webContextService.saveWebContext(
              input.projectId,
              analysis.metadata?.url || targetUrl,
              webContext,
              input.prompt ?? ''
            );
            console.log(`📚 [CONTEXT BUILDER] 💾 Web context saved to database for future reference`);
          } catch (error) {
            console.error(`📚 [CONTEXT BUILDER] Failed to save web context to database:`, error);
            // Silent failure - don't block the main flow
          }
        })();
        
        return webContext;
      }
      
      return undefined;
      
    } catch (error) {
      console.error('📚 [CONTEXT BUILDER] Error in web analysis:', error);
      return undefined;
    }
  }
  
  /**
   * Build template context when appropriate for better generation
   */
  private async buildTemplateContext(
    input: OrchestrationInput,
    existingScenes: any[]
  ) {
    // Determine if we should add template context
    const shouldUseTemplates = this.shouldAddTemplateContext(input, existingScenes);
    
    if (!shouldUseTemplates) {
      return undefined;
    }
    
    console.log('📚 [CONTEXT BUILDER] Selecting template examples for context engineering');
    
    // Get best matching templates
    const matches = templateMatcher.findBestTemplates(input.prompt, 2);
    
    if (matches.length === 0) {
      console.log('📚 [CONTEXT BUILDER] No matching templates found');
      return undefined;
    }
    
    console.log(`📚 [CONTEXT BUILDER] Found ${matches.length} matching templates:`, 
      matches.map(m => `${m.metadata.name} (score: ${m.score})`).join(', '));
    
    // Load actual template code
    const examples = await Promise.all(matches.map(async (match) => {
      // Load the actual template code
      const code = await templateLoader.loadTemplateCode(match.templateId);
      
      if (!code) {
        console.warn(`📚 [CONTEXT BUILDER] Failed to load template code for ${match.templateId}`);
      }
      
      // Format the template for context
      const formattedCode = code ? 
        templateLoader.formatTemplateForContext(code, match.metadata) : 
        `// Template: ${match.metadata.name}\n// Could not load template code`;
      
      return {
        id: match.templateId,
        name: match.metadata.name,
        description: match.metadata.primaryUse,
        keywords: match.metadata.keywords,
        style: match.metadata.styles[0] || 'modern',
        reasoning: match.reasoning,
        code: formattedCode,  // Actual template code
        codePreview: formattedCode.substring(0, 200) + '...' // Preview for logging
      };
    }));
    
    return {
      examples,
      message: `Using ${matches.length} template(s) as style reference: ${matches.map(m => m.metadata.name).join(', ')}`,
      matchDetails: templateMatcher.explainSelection(matches)
    };
  }
  
  /**
   * Determine if template context should be added
   */
  private shouldAddTemplateContext(
    input: OrchestrationInput,
    existingScenes: any[]
  ): boolean {
    const promptLower = input.prompt.toLowerCase();
    
    // Add templates when:
    // 1. No existing scenes (first scene in project)
    if (existingScenes.length === 0) {
      console.log('📚 [CONTEXT BUILDER] First scene in project - adding template context');
      return true;
    }
    
    // 2. User explicitly asks for style reference
    const styleKeywords = ['style', 'like', 'similar', 'inspired', 'based on', 'example'];
    if (styleKeywords.some(keyword => promptLower.includes(keyword))) {
      console.log('📚 [CONTEXT BUILDER] Style reference requested - adding template context');
      return true;
    }
    
    // 3. User is creating specific types of content that benefit from templates
    const templateBenefitKeywords = [
      'text animation', 'particles', 'background', 'chart', 'graph',
      'mobile app', 'ui demo', 'interface', 'transition', 'effect'
    ];
    if (templateBenefitKeywords.some(keyword => promptLower.includes(keyword))) {
      console.log('📚 [CONTEXT BUILDER] Content type benefits from templates - adding context');
      return true;
    }
    
    // 4. Previous generation failed (if we track this)
    // This would require tracking generation success/failure
    
    // Default: Don't add templates if scenes already exist
    return false;
  }
} 
