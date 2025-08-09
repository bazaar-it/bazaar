/**
 * Asset Context Service
 * Sprint 81: Context Engineering
 * 
 * Manages persistent asset storage using the existing projectMemory table
 * Ensures uploaded assets are available throughout the entire project lifecycle
 */

import { db } from "~/server/db";
import { projectMemory, projects } from "~/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import type { Asset, AssetContext, AssetMemoryValue } from "~/lib/types/asset-context";

export class AssetContextService {
  private static MEMORY_TYPE = 'uploaded_asset';
  
  /**
   * Save an uploaded asset to project memory
   */
  async saveAsset(projectId: string, asset: Asset, metadata?: any): Promise<void> {
    const memoryValue: AssetMemoryValue = {
      asset,
      metadata
    };
    
    await db.insert(projectMemory).values({
      projectId,
      memoryType: AssetContextService.MEMORY_TYPE,
      memoryKey: `asset_${asset.id}`,
      memoryValue: JSON.stringify(memoryValue),
      confidence: 1.0, // Uploaded assets have 100% confidence
      sourcePrompt: `User uploaded: ${asset.originalName}`,
      createdAt: new Date(),
      updatedAt: new Date()
    });
    
    console.log(`[AssetContext] Saved asset ${asset.id} for project ${projectId}`);
  }
  
  /**
   * Get all assets for a project
   */
  async getProjectAssets(projectId: string): Promise<AssetContext> {
    const memories = await db.query.projectMemory.findMany({
      where: and(
        eq(projectMemory.projectId, projectId),
        eq(projectMemory.memoryType, AssetContextService.MEMORY_TYPE)
      ),
      orderBy: [desc(projectMemory.createdAt)]
    });
    
    const assets: Asset[] = memories
      .map(m => {
        try {
          const value = JSON.parse(m.memoryValue) as AssetMemoryValue;
          return value.asset;
        } catch (e) {
          console.error('[AssetContext] Failed to parse asset memory:', e);
          return null;
        }
      })
      .filter((a): a is Asset => a !== null);
    
    // Identify logos
    const logos = assets.filter(a => 
      a.type === 'logo' || 
      a.tags?.includes('logo') ||
      a.originalName.toLowerCase().includes('logo')
    );
    
    // Get recent assets (last 5)
    const recent = assets.slice(0, 5);
    
    return {
      projectId,
      assets,
      logos,
      recent
    };
  }

  /**
   * Get all assets for a user across all of their projects
   */
  async getUserAssets(userId: string): Promise<Omit<AssetContext, 'projectId'>> {
    const rows = await db
      .select({
        memoryValue: projectMemory.memoryValue,
        createdAt: projectMemory.createdAt,
      })
      .from(projectMemory)
      .innerJoin(projects, eq(projects.id, projectMemory.projectId))
      .where(
        and(
          eq(projectMemory.memoryType, AssetContextService.MEMORY_TYPE),
          eq(projects.userId, userId)
        )
      )
      .orderBy(desc(projectMemory.createdAt));

    const assets: Asset[] = rows
      .map((r) => {
        try {
          const value = JSON.parse(r.memoryValue as unknown as string) as AssetMemoryValue;
          return value.asset;
        } catch (e) {
          console.error('[AssetContext] Failed to parse user asset memory:', e);
          return null;
        }
      })
      .filter((a): a is Asset => a !== null);

    const logos = assets.filter(a => a.type === 'logo' || a.tags?.includes('logo'));
    const recent = assets.slice(0, 5);

    return { assets, logos, recent };
  }
  
  /**
   * Check if an asset URL exists in the project
   */
  async hasAssetUrl(projectId: string, url: string): Promise<boolean> {
    const context = await this.getProjectAssets(projectId);
    return context.assets.some(a => a.url === url);
  }
  
  /**
   * Increment usage count for an asset
   */
  async incrementUsage(projectId: string, assetId: string): Promise<void> {
    const memory = await db.query.projectMemory.findFirst({
      where: and(
        eq(projectMemory.projectId, projectId),
        eq(projectMemory.memoryType, AssetContextService.MEMORY_TYPE),
        eq(projectMemory.memoryKey, `asset_${assetId}`)
      )
    });
    
    if (memory) {
      try {
        const value = JSON.parse(memory.memoryValue) as AssetMemoryValue;
        value.asset.usageCount++;
        
        await db.update(projectMemory)
          .set({ 
            memoryValue: JSON.stringify(value),
            updatedAt: new Date()
          })
          .where(eq(projectMemory.id, memory.id));
      } catch (e) {
        console.error('[AssetContext] Failed to increment usage:', e);
      }
    }
  }
  
  /**
   * Detect if an image might be a logo
   */
  static isLikelyLogo(filename: string, metadata?: any): boolean {
    const logoIndicators = ['logo', 'brand', 'mark', 'icon'];
    const lowercaseName = filename.toLowerCase();
    
    return logoIndicators.some(indicator => lowercaseName.includes(indicator));
  }
}

// Export singleton instance
export const assetContext = new AssetContextService();