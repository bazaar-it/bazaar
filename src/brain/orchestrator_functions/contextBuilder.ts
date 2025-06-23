// Context builder for the modular orchestrator
// Rebuilt to use real context: web analysis, scene history, chat context

import { db } from "~/server/db";
import { scenes, messages } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import type { OrchestrationInput, ContextPacket } from "~/lib/types/ai/brain.types";
import { WebAnalysisAgent } from "~/tools/webAnalysis/WebAnalysisAgent";
import { extractFirstValidUrl, normalizeUrl, isValidWebUrl } from "~/lib/utils/url-detection";

export class ContextBuilder {

  async buildContext(input: OrchestrationInput): Promise<ContextPacket> {
    console.log('\n📚 [CONTEXT BUILDER] === BUILDING REAL CONTEXT ===');
    console.log('📚 [CONTEXT BUILDER] Project:', input.projectId);
    console.log('📚 [CONTEXT BUILDER] Has images:', !!(input.userContext?.imageUrls as string[])?.length);
    
    try {
      // 1. Get scenes with FULL TSX code for cross-scene operations
      const scenesWithCode = await db
        .select({ 
          id: scenes.id, 
          name: scenes.name, 
          order: scenes.order,
          tsxCode: scenes.tsxCode  // CRITICAL: Full code for context
        })
        .from(scenes)
        .where(eq(scenes.projectId, input.projectId))
        .orderBy(scenes.order);

      // 2. Build recent chat context
      const recentChat = (input.chatHistory || []).slice(-5);

      // 3. Build image context from conversation
      const imageContext = await this.buildImageContext(input);
      
      // 4. Build web analysis context from URL detection
      const webContext = await this.buildWebContext(input);
      
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
        }))
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
    
    const recentMessages = chatHistory.slice(-5);
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
    // Simple: Check current request for images
    const currentImages = input.userContext?.imageUrls as string[] || [];
    
    // Extract images from recent chat history  
    const recentImagesFromChat: any[] = [];
    const recentChat = input.chatHistory?.slice(-10) || [];
    
    for (let i = 0; i < recentChat.length; i++) {
      const msg = recentChat[i];
      if (msg && msg.role === 'user' && (msg as any).imageUrls?.length > 0) {
        recentImagesFromChat.push({
          position: i + 1,
          userPrompt: msg.content,
          imageUrls: (msg as any).imageUrls
        });
      }
    }

    return { 
      currentImages,
      recentImagesFromChat
    };
  }

  private async buildWebContext(input: OrchestrationInput) {
    try {
      // First try to extract a URL with protocol
      let targetUrl = extractFirstValidUrl(input.prompt);
      
      // If no URL found, look for domain patterns within the text
      if (!targetUrl) {
        // Look for domains with common patterns like www.example.com or example.com
        // Updated regex to be more flexible and catch domains in various contexts
        const domainPattern = /(?:^|[\s,.:;!?'"(]|is\s+)((?:www\.)?(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,})(?:[\s,.:;!?'")]|$)/i;
        const match = input.prompt.match(domainPattern);
        
        if (match && match[1]) {
          const domain = match[1];
          // Normalize the URL by adding https://
          const normalizedUrl = normalizeUrl(domain);
          if (isValidWebUrl(normalizedUrl)) {
            targetUrl = normalizedUrl;
            console.log(`📚 [CONTEXT BUILDER] Found and normalized domain "${domain}" to "${targetUrl}"`);
          }
        }
      }
      
      if (!targetUrl) {
        console.log('📚 [CONTEXT BUILDER] No valid URL found in prompt');
        return undefined;
      }
      
      console.log(`📚 [CONTEXT BUILDER] Analyzing website: ${targetUrl}`);
      
      // Initialize web analysis agent
      const webAgent = new WebAnalysisAgent();
      
      // Validate URL first
      const validation = await webAgent.validateUrl(targetUrl);
      if (!validation.valid) {
        console.log(`📚 [CONTEXT BUILDER] URL validation failed: ${validation.error}`);
        return undefined;
      }
      
      // Perform web analysis with R2 upload
      const analysis = await webAgent.analyzeWebsite(targetUrl, input.projectId, input.userId);
      
      if (!analysis.success) {
        console.log(`📚 [CONTEXT BUILDER] Web analysis failed: ${analysis.error}`);
        return undefined;
      }
      
      // Return structured web context
      if (analysis.screenshotUrls && analysis.pageData) {
        console.log(`📚 [CONTEXT BUILDER] ✅ Web context created for ${analysis.pageData.title}`);
        
        const webContext = {
          originalUrl: analysis.url!,
          screenshotUrls: analysis.screenshotUrls,
          pageData: analysis.pageData,
          analyzedAt: analysis.analyzedAt!
        };
        
        // Fire-and-forget async save to database
        (async () => {
          try {
            const { webContextService } = await import('~/server/services/data/web-context.service');
            await webContextService.saveWebContext(
              input.projectId,
              analysis.url!,
              {
                screenshotUrls: analysis.screenshotUrls!,
                pageData: analysis.pageData!,
                analyzedAt: analysis.analyzedAt!
              },
              input.prompt
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
} 