import { db } from "~/server/db";
import { projects, scenes } from "~/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Shared utilities for welcome scene detection and management
 * Eliminates duplication between generation.ts and ContextBuilderService
 */
export const welcomeSceneUtils = {
  /**
   * Database state management - clear welcome flag and delete welcome scenes
   * Used in generation.ts when transitioning from welcome to real content
   */
  async clearWelcomeState(projectId: string): Promise<void> {
    console.log(`[WelcomeUtils] Clearing welcome state for project ${projectId}`);
    
    // Clear the welcome flag
    await db.update(projects)
      .set({ isWelcome: false })
      .where(eq(projects.id, projectId));
    
    // Delete any existing welcome scenes
    await db.delete(scenes)
      .where(eq(scenes.projectId, projectId));
      
    console.log(`[WelcomeUtils] Welcome state cleared successfully`);
  },

  /**
   * Context filtering - determine if a scene is a welcome scene
   * Used in ContextBuilderService for filtering context
   */
  isWelcomeScene(scene: any): boolean {
    if (!scene) return false;
    
    // Check multiple welcome scene indicators
    return (
      scene.type === 'welcome' ||
      scene.data?.isWelcomeScene === true ||
      scene.layoutJson?.isWelcomeScene === true ||
      scene.name?.toLowerCase().includes('welcome')
    );
  },

  /**
   * Filter out welcome scenes from an array of scenes
   * Used for getting real scene counts and context
   */
  filterRealScenes<T>(scenes: T[]): T[] {
    return scenes.filter(scene => !this.isWelcomeScene(scene));
  },

  /**
   * Get real scene count (excluding welcome scenes)
   * Used for context building and user feedback
   */
  getRealSceneCount(scenes: any[]): number {
    return this.filterRealScenes(scenes).length;
  },

  /**
   * Check if project is in welcome state based on database project record
   * Used for determining if this is the first real user interaction
   */
  isProjectInWelcomeState(project: { isWelcome?: boolean | null }): boolean {
    return project.isWelcome === true;
  },

  /**
   * Check if storyboard should be treated as empty for brain LLM
   * Returns true if all scenes are welcome scenes (should use AddScene tool)
   */
  shouldTreatAsEmptyStoryboard(scenes: any[]): boolean {
    const realScenes = this.filterRealScenes(scenes);
    return realScenes.length === 0;
  }
};

export type WelcomeSceneUtils = typeof welcomeSceneUtils; 