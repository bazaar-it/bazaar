import { db } from "~/server/db";
import { projectMemory } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";

export const webContextService = {
  /**
   * Save web analysis context to project memory for future reference
   */
  async saveWebContext(
    projectId: string,
    url: string,
    webContext: {
      screenshotUrls: {
        desktop?: string;
        mobile?: string;
      };
      pageData: {
        title: string;
        description?: string;
        headings: string[];
        url: string;
      };
      analyzedAt: string;
    },
    sourcePrompt: string
  ) {
    try {
      // Save the complete web context as project memory
      const memoryEntry = await db.insert(projectMemory).values({
        projectId,
        memoryType: 'web_analysis',
        memoryKey: url,
        memoryValue: JSON.stringify(webContext),
        confidence: 1.0, // High confidence as this is direct data
        sourcePrompt,
      }).returning();

      console.log(`💾 [WEB CONTEXT SERVICE] Saved web analysis for ${url} to project memory`);
      return memoryEntry[0];
    } catch (error) {
      console.error('💾 [WEB CONTEXT SERVICE] Failed to save web context:', error);
      throw error;
    }
  },

  /**
   * Retrieve web context from project memory
   */
  async getWebContext(projectId: string, url: string) {
    try {
      const memory = await db.query.projectMemory.findFirst({
        where: and(
          eq(projectMemory.projectId, projectId),
          eq(projectMemory.memoryType, 'web_analysis'),
          eq(projectMemory.memoryKey, url)
        ),
        orderBy: (memory, { desc }) => [desc(memory.createdAt)],
      });

      if (memory) {
        return JSON.parse(memory.memoryValue);
      }
      return null;
    } catch (error) {
      console.error('💾 [WEB CONTEXT SERVICE] Failed to retrieve web context:', error);
      return null;
    }
  },

  /**
   * Get all web analyses for a project
   */
  async getAllWebAnalyses(projectId: string) {
    try {
      const memories = await db.query.projectMemory.findMany({
        where: and(
          eq(projectMemory.projectId, projectId),
          eq(projectMemory.memoryType, 'web_analysis')
        ),
        orderBy: (memory, { desc }) => [desc(memory.createdAt)],
      });

      return memories.map(m => ({
        url: m.memoryKey,
        webContext: JSON.parse(m.memoryValue),
        analyzedAt: m.createdAt,
        sourcePrompt: m.sourcePrompt,
      }));
    } catch (error) {
      console.error('💾 [WEB CONTEXT SERVICE] Failed to get all web analyses:', error);
      return [];
    }
  }
};