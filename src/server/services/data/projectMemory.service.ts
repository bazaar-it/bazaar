// src/server/services/data/projectMemory.service.ts
import { eq, and, desc } from "drizzle-orm";
import { db } from "~/server/db";
import { 
  projectMemory, 
  imageAnalysis, 
  MEMORY_TYPES,
  type ProjectMemory,
  type InsertProjectMemory,
  type ImageAnalysis,
  type InsertImageAnalysis,
  type MemoryType,
} from "~/server/db/schema";
import type { ImageFacts } from "~/server/services/brain/orchestrator";

/**
 * Project Memory Service
 * Phase 2: Provides persistent storage for async context-driven architecture
 * Handles user preferences, scene relationships, and image analysis facts
 */
export class ProjectMemoryService {
  
  // ===== PROJECT MEMORY OPERATIONS =====
  
  /**
   * Save a user preference or conversation context to project memory
   */
  async saveMemory(data: {
    projectId: string;
    memoryType: MemoryType;
    memoryKey: string;
    memoryValue: string;
    confidence?: number;
    sourcePrompt?: string;
    expiresAt?: Date;
  }): Promise<ProjectMemory> {
    const [result] = await db.insert(projectMemory).values({
      projectId: data.projectId,
      memoryType: data.memoryType,
      memoryKey: data.memoryKey,
      memoryValue: data.memoryValue,
      confidence: data.confidence || 0.8,
      sourcePrompt: data.sourcePrompt,
      expiresAt: data.expiresAt,
    }).returning();

    if (!result) {
      throw new Error("Failed to save project memory");
    }

    return result;
  }

  /**
   * Retrieve all project memory entries for a project
   */
  async getProjectMemory(projectId: string): Promise<ProjectMemory[]> {
    return await db
      .select()
      .from(projectMemory)
      .where(eq(projectMemory.projectId, projectId))
      .orderBy(desc(projectMemory.updatedAt));
  }

  /**
   * Get specific memory entries by type and key
   */
  async getMemoryByTypeAndKey(
    projectId: string, 
    memoryType: MemoryType, 
    memoryKey: string
  ): Promise<ProjectMemory | null> {
    const [result] = await db
      .select()
      .from(projectMemory)
      .where(
        and(
          eq(projectMemory.projectId, projectId),
          eq(projectMemory.memoryType, memoryType),
          eq(projectMemory.memoryKey, memoryKey)
        )
      )
      .orderBy(desc(projectMemory.updatedAt))
      .limit(1);

    return result || null;
  }

  /**
   * Update or create a memory entry (upsert behavior)
   */
  async upsertMemory(data: {
    projectId: string;
    memoryType: MemoryType;
    memoryKey: string;
    memoryValue: string;
    confidence?: number;
    sourcePrompt?: string;
  }): Promise<ProjectMemory> {
    // Check if entry exists
    const existing = await this.getMemoryByTypeAndKey(
      data.projectId, 
      data.memoryType, 
      data.memoryKey
    );

    if (existing) {
      // Update existing
      const [updated] = await db
        .update(projectMemory)
        .set({
          memoryValue: data.memoryValue,
          confidence: data.confidence || existing.confidence,
          sourcePrompt: data.sourcePrompt,
          updatedAt: new Date(),
        })
        .where(eq(projectMemory.id, existing.id))
        .returning();

      if (!updated) {
        throw new Error("Failed to update project memory");
      }
      return updated;
    } else {
      // Create new
      return await this.saveMemory(data);
    }
  }

  // ===== IMAGE ANALYSIS OPERATIONS =====

  /**
   * Save image analysis facts to database
   */
  async saveImageFacts(data: {
    projectId: string;
    traceId: string;
    imageFacts: ImageFacts;
  }): Promise<ImageAnalysis> {
    const [result] = await db.insert(imageAnalysis).values({
      projectId: data.projectId,
      traceId: data.traceId,
      imageUrls: data.imageFacts.imageUrls,
      palette: data.imageFacts.palette,
      typography: data.imageFacts.typography,
      mood: data.imageFacts.mood,
      layoutJson: data.imageFacts.layoutJson,
      processingTimeMs: data.imageFacts.processingTimeMs,
      usedInScenes: [],
    }).returning();

    if (!result) {
      throw new Error("Failed to save image analysis");
    }

    return result;
  }

  /**
   * Retrieve image analysis by trace ID
   */
  async getImageAnalysisByTraceId(traceId: string): Promise<ImageAnalysis | null> {
    const [result] = await db
      .select()
      .from(imageAnalysis)
      .where(eq(imageAnalysis.traceId, traceId))
      .limit(1);

    return result || null;
  }

  /**
   * Get all image analyses for a project
   */
  async getProjectImageAnalyses(projectId: string): Promise<ImageAnalysis[]> {
    return await db
      .select()
      .from(imageAnalysis)
      .where(eq(imageAnalysis.projectId, projectId))
      .orderBy(desc(imageAnalysis.createdAt));
  }

  /**
   * Mark an image analysis as used in a scene
   */
  async markImageUsedInScene(traceId: string, sceneId: string): Promise<void> {
    const analysis = await this.getImageAnalysisByTraceId(traceId);
    if (!analysis) {
      throw new Error(`Image analysis not found for trace ID: ${traceId}`);
    }

    const currentScenes = (analysis.usedInScenes as string[]) || [];
    if (!currentScenes.includes(sceneId)) {
      const updatedScenes = [...currentScenes, sceneId];
      
      await db
        .update(imageAnalysis)
        .set({ usedInScenes: updatedScenes })
        .where(eq(imageAnalysis.traceId, traceId));
    }
  }

  // ===== HELPER METHODS =====

  /**
   * Extract user preferences from project memory for context building
   */
  async getUserPreferences(projectId: string): Promise<Record<string, string>> {
    const preferences = await db
      .select()
      .from(projectMemory)
      .where(
        and(
          eq(projectMemory.projectId, projectId),
          eq(projectMemory.memoryType, MEMORY_TYPES.USER_PREFERENCE)
        )
      );

    const result: Record<string, string> = {};
    for (const pref of preferences) {
      result[pref.memoryKey] = pref.memoryValue;
    }
    
    return result;
  }

  /**
   * Get scene relationships for context building
   */
  async getSceneRelationships(projectId: string): Promise<Record<string, string>> {
    const relationships = await db
      .select()
      .from(projectMemory)
      .where(
        and(
          eq(projectMemory.projectId, projectId),
          eq(projectMemory.memoryType, MEMORY_TYPES.SCENE_RELATIONSHIP)
        )
      );

    const result: Record<string, string> = {};
    for (const rel of relationships) {
      result[rel.memoryKey] = rel.memoryValue;
    }
    
    return result;
  }

  /**
   * Clean up expired memory entries
   */
  async cleanupExpiredMemory(): Promise<number> {
    // For now, just return 0 - we'll implement proper cleanup later
    // when we have more specific requirements for expiration handling
    return 0;
  }
}

// Export singleton instance
export const projectMemoryService = new ProjectMemoryService(); 