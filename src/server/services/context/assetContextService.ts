/**
 * Asset Context Service
 * Updated: User-centric asset management
 * 
 * Manages persistent asset storage using the new assets and projectAssets tables
 * Ensures uploaded assets are available throughout the entire project lifecycle
 */

import { db } from "~/server/db";
import { assets, projectAssets, projects } from "~/server/db/schema";
import { eq, and, desc, isNull, sql } from "drizzle-orm";
import type { Asset, AssetContext, AssetMemoryValue } from "~/lib/types/asset-context";

export class AssetContextService {
  private static MEMORY_TYPE = 'uploaded_asset';
  
  /**
   * Save an uploaded asset to new asset tables
   */
  async saveAsset(projectId: string, asset: Asset, metadata?: any): Promise<void> {
    // Insert into assets table (user-owned)
    const userId = metadata?.uploadedBy || metadata?.userId;
    if (!userId) {
      throw new Error("User ID is required to save asset");
    }

    await db.insert(assets).values({
      id: asset.id,
      userId: userId,
      url: asset.url,
      originalName: asset.originalName,
      customName: asset.customName || null,
      type: asset.type,
      mimeType: asset.mimeType || null,
      fileSize: asset.fileSize || null,
      width: asset.width || null,
      height: asset.height || null,
      duration: asset.duration || null,
      usageCount: asset.usageCount || 0,
      tags: asset.tags || [],
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Link to project
    try {
      await db.insert(projectAssets).values({
        projectId: projectId,
        assetId: asset.id,
        addedVia: 'upload',
        addedAt: new Date()
      });
      
      console.log(`[AssetContext] Successfully linked asset ${asset.id} to project ${projectId}`);
    } catch (error) {
      console.error(`[AssetContext] Failed to link asset to project:`, error);
      // Don't throw - asset is already saved, just not linked to project
    }
  }
  
  /**
   * Get all assets for a project
   */
  async getProjectAssets(projectId: string): Promise<AssetContext> {
    const projectAssetsData = await db
      .select({
        id: assets.id,
        url: assets.url,
        originalName: assets.originalName,
        customName: assets.customName,
        type: assets.type,
        mimeType: assets.mimeType,
        fileSize: assets.fileSize,
        width: assets.width,
        height: assets.height,
        duration: assets.duration,
        usageCount: assets.usageCount,
        tags: assets.tags,
        createdAt: assets.createdAt,
        hash: assets.id, // Use ID as hash for compatibility
        uploadedAt: assets.createdAt,
      })
      .from(assets)
      .innerJoin(projectAssets, eq(assets.id, projectAssets.assetId))
      .where(
        and(
          eq(projectAssets.projectId, projectId),
          isNull(assets.deletedAt) // Only non-deleted assets
        )
      )
      .orderBy(desc(assets.createdAt));

    const assetList: Asset[] = projectAssetsData.map(a => ({
      id: a.id,
      url: a.url,
      originalName: a.originalName,
      customName: a.customName || undefined,
      type: a.type as Asset['type'],
      mimeType: a.mimeType || undefined,
      fileSize: a.fileSize || undefined,
      width: a.width || undefined,
      height: a.height || undefined,
      duration: a.duration || undefined,
      usageCount: a.usageCount || 0,
      tags: a.tags || [],
      hash: a.hash,
      uploadedAt: a.uploadedAt.toISOString(),
      referenceNames: a.customName ? [a.customName, a.customName.toLowerCase()] : []
    }));
    
    // Identify logos
    const logos = assetList.filter(a => 
      a.type === 'logo' || 
      a.tags?.includes('logo') ||
      a.originalName.toLowerCase().includes('logo')
    );
    
    // Get recent assets (last 5)
    const recent = assetList.slice(0, 5);
    
    return {
      projectId,
      assets: assetList,
      logos,
      recent
    };
  }

  /**
   * Get all assets for a user across all of their projects
   */
  async getUserAssets(userId: string): Promise<Omit<AssetContext, 'projectId'>> {
    const userAssetsData = await db
      .select({
        id: assets.id,
        url: assets.url,
        originalName: assets.originalName,
        customName: assets.customName,
        type: assets.type,
        mimeType: assets.mimeType,
        fileSize: assets.fileSize,
        width: assets.width,
        height: assets.height,
        duration: assets.duration,
        usageCount: assets.usageCount,
        tags: assets.tags,
        createdAt: assets.createdAt,
        hash: assets.id, // Use ID as hash for compatibility
        uploadedAt: assets.createdAt,
      })
      .from(assets)
      .where(
        and(
          eq(assets.userId, userId),
          isNull(assets.deletedAt) // Only non-deleted assets
        )
      )
      .orderBy(desc(assets.createdAt));

    const assetList: Asset[] = userAssetsData.map(a => ({
      id: a.id,
      url: a.url,
      originalName: a.originalName,
      customName: a.customName || undefined,
      type: a.type as Asset['type'],
      mimeType: a.mimeType || undefined,
      fileSize: a.fileSize || undefined,
      width: a.width || undefined,
      height: a.height || undefined,
      duration: a.duration || undefined,
      usageCount: a.usageCount || 0,
      tags: a.tags || [],
      hash: a.hash,
      uploadedAt: a.uploadedAt.toISOString(),
      referenceNames: a.customName ? [a.customName, a.customName.toLowerCase()] : []
    }));

    const logos = assetList.filter(a => a.type === 'logo' || a.tags?.includes('logo'));
    const recent = assetList.slice(0, 5);

    return { assets: assetList, logos, recent };
  }
  
  /**
   * Check if an asset URL exists in the project
   */
  async hasAssetUrl(projectId: string, url: string): Promise<boolean> {
    const result = await db
      .select({ count: assets.id })
      .from(assets)
      .innerJoin(projectAssets, eq(assets.id, projectAssets.assetId))
      .where(
        and(
          eq(projectAssets.projectId, projectId),
          eq(assets.url, url),
          isNull(assets.deletedAt)
        )
      )
      .limit(1);
    
    return result.length > 0;
  }
  
  /**
   * Increment usage count for an asset
   */
  async incrementUsage(projectId: string, assetId: string): Promise<void> {
    try {
      await db
        .update(assets)
        .set({ 
          usageCount: sql`${assets.usageCount} + 1`,
          lastUsedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(assets.id, assetId));
    } catch (e) {
      console.error('[AssetContext] Failed to increment usage:', e);
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