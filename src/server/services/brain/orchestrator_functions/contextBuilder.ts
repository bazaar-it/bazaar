// src/server/services/brain/orchestrator_functions/contextBuilder.ts
// Builds context for brain decisions with smart caching

import { db } from '~/server/db';
import { scenes, messages, projects } from '~/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { 
  ProjectContext, 
  CachedContext, 
  ContextOptions,
  SceneContext,
  ChatMessage,
  UserPreferences 
} from './types';

class ContextBuilder {
  private cache = new Map<string, CachedContext>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  async getContext(
    projectId: string, 
    options: ContextOptions = {
      includeChat: true,
      includeStoryboard: true,
      includePreferences: true,
      forceRefresh: false
    }
  ): Promise<ProjectContext> {
    const cacheKey = `${projectId}`;
    const cached = this.cache.get(cacheKey);

    // Use cache if valid and not forcing refresh
    if (cached && !options.forceRefresh && this.isCacheValid(cached)) {
      console.log('[ContextBuilder] Using cached context for', projectId);
      return this.incrementalUpdate(cached, projectId, options);
    }

    console.log('[ContextBuilder] Building fresh context for', projectId);
    
    // Build context in parallel for speed
    const [chatHistory, sceneList, preferences] = await Promise.all([
      options.includeChat ? this.getChatHistory(projectId) : [],
      options.includeStoryboard ? this.getStoryboard(projectId, options.includeFullCode) : [],
      options.includePreferences ? this.getPreferences(projectId) : {}
    ]);

    const context: ProjectContext = {
      projectId,
      chatHistory,
      scenes: sceneList,
      preferences,
      timestamp: Date.now()
    };

    // Cache the context
    const cachedContext: CachedContext = {
      ...context,
      cacheKey,
      expiresAt: Date.now() + this.CACHE_TTL
    };
    
    this.cache.set(cacheKey, cachedContext);
    return context;
  }

  private isCacheValid(cached: CachedContext): boolean {
    return Date.now() < cached.expiresAt;
  }

  private async incrementalUpdate(
    cached: CachedContext, 
    projectId: string,
    options: ContextOptions
  ): Promise<ProjectContext> {
    // Just get latest messages since cache timestamp
    const newMessages = await db.query.messages.findMany({
      where: eq(messages.projectId, projectId),
      orderBy: [desc(messages.createdAt)],
      limit: 5
    });

    // Merge new messages if any
    if (newMessages.length > 0) {
      const formattedMessages = newMessages.map(msg => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
        timestamp: msg.createdAt.toISOString()
      }));
      
      cached.chatHistory = [...formattedMessages.reverse(), ...cached.chatHistory].slice(0, 20);
    }

    return cached;
  }

  private async getChatHistory(projectId: string): Promise<ChatMessage[]> {
    const recentMessages = await db.query.messages.findMany({
      where: eq(messages.projectId, projectId),
      orderBy: [desc(messages.createdAt)],
      limit: 10
    });

    return recentMessages.reverse().map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: msg.content,
      timestamp: msg.createdAt.toISOString()
    }));
  }

  private async getStoryboard(projectId: string, includeFullCode = false): Promise<SceneContext[]> {
    const projectScenes = await db.query.scenes.findMany({
      where: eq(scenes.projectId, projectId),
      orderBy: [scenes.order]
    });

    return projectScenes.map(scene => ({
      id: scene.id,
      name: scene.name,
      duration: scene.duration,
      order: scene.order,
      description: this.extractSceneDescription(scene.tsxCode),
      // Only include full code if specifically requested
      ...(includeFullCode && { tsxCode: scene.tsxCode })
    }));
  }

  private extractSceneDescription(tsxCode: string): string {
    // Extract a brief description from the code
    // Look for main text content or component type
    const textMatch = tsxCode.match(/<h[1-6][^>]*>([^<]+)<\/h[1-6]>|<p[^>]*>([^<]+)<\/p>/);
    if (textMatch) {
      return textMatch[1] || textMatch[2] || 'Custom scene';
    }
    
    // Check for common patterns
    if (tsxCode.includes('button')) return 'Scene with button';
    if (tsxCode.includes('image')) return 'Scene with image';
    if (tsxCode.includes('video')) return 'Scene with video';
    
    return 'Custom animated scene';
  }

  private async getPreferences(projectId: string): Promise<UserPreferences> {
    // TODO: Implement preference loading from project memory
    // For now, return defaults
    return {
      style: 'modern',
      animationSpeed: 'normal',
      complexity: 'moderate'
    };
  }

  // Clear cache for a specific project
  clearProjectCache(projectId: string): void {
    this.cache.delete(projectId);
  }

  // Clear all cache
  clearAllCache(): void {
    this.cache.clear();
  }
}

// Export singleton instance
export const contextBuilder = new ContextBuilder();