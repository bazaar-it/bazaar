// Context builder for the modular orchestrator

import { projectMemoryService } from "~/server/services/data/projectMemory.service";
import { db } from "~/server/db";
import { scenes, messages } from "~/server/db/schema";
import { eq, desc } from "drizzle-orm";
import type { OrchestrationInput, ContextPacket } from "~/lib/types/ai/brain.types";

export class ContextBuilder {

  async buildContext(input: OrchestrationInput): Promise<ContextPacket> {
    console.log('\n📚 [NEW CONTEXT BUILDER] === BUILDING CONTEXT ===');
    console.log('📚 [NEW CONTEXT BUILDER] Project:', input.projectId);
    console.log('📚 [NEW CONTEXT BUILDER] Has images:', !!(input.userContext?.imageUrls as string[])?.length);
    
    try {
      
      // Get current scene list from database
      const currentScenes = await db
        .select({ id: scenes.id, name: scenes.name, order: scenes.order })
        .from(scenes)
        .where(eq(scenes.projectId, input.projectId));

      // Get user preferences and image analyses
      const [userPreferences, imageAnalyses] = await Promise.all([
        projectMemoryService.getUserPreferences(input.projectId),
        projectMemoryService.getProjectImageAnalyses(input.projectId)
      ]);

      // Build image context from conversation history
      const imageContext = await this.buildImageContext(input);
      
      return {
        userPreferences: userPreferences,
        sceneHistory: currentScenes.map(scene => ({
          id: scene.id,
          name: scene.name || 'Untitled Scene',
          type: `Scene ${scene.order + 1}`
        })),
        imageAnalyses: imageAnalyses.map(analysis => ({
          id: analysis.traceId,
          imageUrls: (analysis.imageUrls as string[]) || [],
          palette: (analysis.palette as string[]) || [],
          typography: analysis.typography || 'Unknown',
          mood: analysis.mood || 'Unknown',
          layoutJson: analysis.layoutJson,
          processingTimeMs: analysis.processingTimeMs || 0,
          timestamp: analysis.createdAt.toISOString(),
        })),
        conversationContext: this.summarizeConversation(input.chatHistory || []),
        last5Messages: (input.chatHistory || []).slice(-5),
        sceneList: currentScenes.map(scene => ({
          id: scene.id,
          name: scene.name || 'Untitled Scene'
        })),
        pendingImageIds: [],
        imageContext: imageContext
      };

    } catch (error) {
      console.error('[ContextBuilder] Error building context:', error);
      
      // Fallback context
      return {
        userPreferences: {},
        sceneHistory: [],
        imageAnalyses: [],
        conversationContext: this.summarizeConversation(input.chatHistory || []),
        last5Messages: (input.chatHistory || []).slice(-5),
        sceneList: [],
        pendingImageIds: [],
      };
    }
  }

  private summarizeConversation(chatHistory: Array<{role: string, content: string}>): string {
    if (chatHistory.length === 0) return 'New conversation';
    
    const recentMessages = chatHistory.slice(-10);
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
    
    const uniqueTopics = [...new Set(topics)];
    return uniqueTopics.length > 0 ? `Conversation about: ${uniqueTopics.join(', ')}` : 'General conversation';
  }

  private async buildImageContext(input: OrchestrationInput) {
    // Get recent messages to find image references
    const recentMessages = await db
      .select()
      .from(messages)
      .where(eq(messages.projectId, input.projectId))
      .orderBy(desc(messages.sequence))
      .limit(20);

    const conversationImages: any[] = [];
    let position = 1;

    for (const msg of recentMessages.reverse()) {
      if (msg.metadata && typeof msg.metadata === 'object' && 'imageUrls' in msg.metadata) {
        const imageUrls = (msg.metadata as any).imageUrls;
        if (Array.isArray(imageUrls) && imageUrls.length > 0) {
          conversationImages.push({
            position,
            userPrompt: msg.content,
            imageCount: imageUrls.length,
            imageUrls
          });
          position++;
        }
      }
    }

    return { conversationImages };
  }
} 