// Context builder for the modular orchestrator

import { ContextBuilderService } from "~/server/services/brain/contextBuilder.service";
import { projectMemoryService } from "~/server/services/data/projectMemory.service";
import { db } from "~/server/db";
import { scenes } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import type { OrchestrationInput, ContextPacket } from "./types";

export class ContextBuilder {
  private contextBuilder = ContextBuilderService.getInstance();

  async buildContext(input: OrchestrationInput): Promise<ContextPacket> {

    console.log('==================== ContextBuilder function reached:');
    
    try {
      
      // Get current scene list from database
      const currentScenes = await db
        .select({ id: scenes.id, name: scenes.name, order: scenes.order })
        .from(scenes)
        .where(eq(scenes.projectId, input.projectId));

      // Build enhanced context using ContextBuilder service
      const currentImageUrls = (input.userContext?.imageUrls as string[]) || [];
      const contextBuilderResult = await this.contextBuilder.buildContext({
        projectId: input.projectId,
        userId: input.userId,
        storyboardSoFar: input.storyboardSoFar as any,
        userMessage: input.prompt,
        imageUrls: currentImageUrls,
        chatHistory: input.chatHistory || []
      });

      // Get user preferences and image analyses
      const [userPreferences, imageAnalyses] = await Promise.all([
        projectMemoryService.getUserPreferences(input.projectId),
        projectMemoryService.getProjectImageAnalyses(input.projectId)
      ]);

      // Convert ContextBuilder preferences to string format
      const contextBuilderPrefs = Object.fromEntries(
        Object.entries(contextBuilderResult.userPreferences).map(([key, value]) => [
          key, String(value)
        ])
      );

      // Combine preferences
      const allPreferences = {
        ...userPreferences,
        ...contextBuilderPrefs
      };
      
      return {
        userPreferences: allPreferences,
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
        imageContext: contextBuilderResult.imageContext
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
} 