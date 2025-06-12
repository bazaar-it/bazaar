// src/server/services/data/versionHistory.service.ts
// Version history service for undo/redo functionality

import { db } from '~/server/db';
import { sceneIterations } from '~/server/db/schema';
import { eq, desc, and } from 'drizzle-orm';
import type { SceneVersion } from '~/lib/types/api/brain-contracts';

export class VersionHistoryService {
  /**
   * Save a new version of a scene
   */
  async saveVersion(
    sceneId: string, 
    tsxCode: string, 
    duration: number,
    changeType: 'create' | 'edit' | 'duration',
    changeDescription: string
  ): Promise<SceneVersion> {
    // Get the latest version number
    const latestVersion = await db.query.sceneIterations.findFirst({
      where: eq(sceneIterations.sceneId, sceneId),
      orderBy: [desc(sceneIterations.version)]
    });
    
    const nextVersion = (latestVersion?.version || 0) + 1;
    
    // Save new version
    const [newVersion] = await db.insert(sceneIterations).values({
      sceneId,
      version: nextVersion,
      tsxCode,
      duration,
      createdAt: new Date()
    }).returning();
    
    return {
      id: newVersion.id,
      sceneId: newVersion.sceneId,
      version: newVersion.version,
      tsxCode: newVersion.tsxCode,
      duration: newVersion.duration || duration,
      timestamp: newVersion.createdAt,
      changeType,
      changeDescription
    };
  }
  
  /**
   * Get version history for a scene
   */
  async getVersionHistory(sceneId: string, limit = 10): Promise<SceneVersion[]> {
    const versions = await db.query.sceneIterations.findMany({
      where: eq(sceneIterations.sceneId, sceneId),
      orderBy: [desc(sceneIterations.version)],
      limit
    });
    
    return versions.map((v, index) => ({
      id: v.id,
      sceneId: v.sceneId,
      version: v.version,
      tsxCode: v.tsxCode,
      duration: v.duration || 180,
      timestamp: v.createdAt,
      changeType: index === versions.length - 1 ? 'create' : 'edit',
      changeDescription: this.generateDescription(v, index === 0)
    }));
  }
  
  /**
   * Restore a specific version
   */
  async restoreVersion(sceneId: string, versionId: string): Promise<SceneVersion | null> {
    const version = await db.query.sceneIterations.findFirst({
      where: and(
        eq(sceneIterations.sceneId, sceneId),
        eq(sceneIterations.id, versionId)
      )
    });
    
    if (!version) return null;
    
    // Save current state as a new version before restoring
    const currentScene = await db.query.scenes.findFirst({
      where: eq(scenes.id, sceneId)
    });
    
    if (currentScene) {
      await this.saveVersion(
        sceneId,
        currentScene.tsxCode,
        currentScene.duration,
        'edit',
        'Before undo'
      );
    }
    
    // Update scene with the restored version
    await db.update(scenes)
      .set({
        tsxCode: version.tsxCode,
        duration: version.duration || 180,
        updatedAt: new Date()
      })
      .where(eq(scenes.id, sceneId));
    
    return {
      id: version.id,
      sceneId: version.sceneId,
      version: version.version,
      tsxCode: version.tsxCode,
      duration: version.duration || 180,
      timestamp: version.createdAt,
      changeType: 'edit',
      changeDescription: `Restored to version ${version.version}`
    };
  }
  
  /**
   * Get the previous version (for undo)
   */
  async getPreviousVersion(sceneId: string, currentVersion: number): Promise<SceneVersion | null> {
    const previousVersion = await db.query.sceneIterations.findFirst({
      where: and(
        eq(sceneIterations.sceneId, sceneId),
        lt(sceneIterations.version, currentVersion)
      ),
      orderBy: [desc(sceneIterations.version)]
    });
    
    if (!previousVersion) return null;
    
    return {
      id: previousVersion.id,
      sceneId: previousVersion.sceneId,
      version: previousVersion.version,
      tsxCode: previousVersion.tsxCode,
      duration: previousVersion.duration || 180,
      timestamp: previousVersion.createdAt,
      changeType: 'edit',
      changeDescription: this.generateDescription(previousVersion, false)
    };
  }
  
  /**
   * Clean up old versions (keep last N versions)
   */
  async cleanupVersions(sceneId: string, keepCount = 20): Promise<number> {
    // Get versions to delete
    const versionsToDelete = await db.query.sceneIterations.findMany({
      where: eq(sceneIterations.sceneId, sceneId),
      orderBy: [desc(sceneIterations.version)],
      offset: keepCount
    });
    
    if (versionsToDelete.length === 0) return 0;
    
    // Delete old versions
    const deleteIds = versionsToDelete.map(v => v.id);
    await db.delete(sceneIterations)
      .where(inArray(sceneIterations.id, deleteIds));
    
    return deleteIds.length;
  }
  
  private generateDescription(version: any, isLatest: boolean): string {
    if (isLatest) return 'Current version';
    
    // Analyze changes in code to generate description
    const code = version.tsxCode || '';
    
    if (code.includes('color:')) return 'Color changes';
    if (code.includes('fontSize:')) return 'Text size changes';
    if (code.includes('animation')) return 'Animation updates';
    if (version.duration !== 180) return `Duration changed to ${version.duration / 30}s`;
    
    return `Version ${version.version}`;
  }
}

// Import missing functions
import { scenes } from '~/server/db/schema';
import { lt, inArray } from 'drizzle-orm';

export const versionHistoryService = new VersionHistoryService();