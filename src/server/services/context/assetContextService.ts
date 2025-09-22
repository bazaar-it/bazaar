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
import { sql as rawSql } from "drizzle-orm";
import { randomUUID } from "crypto";
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
      });
      console.log(`[AssetContext] Successfully linked asset ${asset.id} to project ${projectId}`);
    } catch (error: any) {
      const message = error?.message || String(error);
      // Production may lack added_at/added_via columns: fall back to raw INSERT with minimal columns
      if (message.includes('column "added_at"') || message.includes('added_at') || message.includes('added_via')) {
        try {
          const id = randomUUID();
          await db.execute(rawSql`
            INSERT INTO "bazaar-vid_project_asset" ("id", "project_id", "asset_id")
            VALUES (${id}, ${projectId}, ${asset.id})
            ON CONFLICT ("project_id", "asset_id") DO NOTHING
          `);
          console.warn(`[AssetContext] Project link fallback insert succeeded without added_at/added_via for asset ${asset.id}`);
        } catch (fallbackErr) {
          console.error('[AssetContext] Fallback project link insert failed:', fallbackErr);
        }
      } else {
        console.error(`[AssetContext] Failed to link asset to project:`, error);
      }
      // Do not throw — asset is saved, linking is best-effort.
    }
  }

  async linkAssetToProject(projectId: string, assetId: string): Promise<void> {
    try {
      await db.insert(projectAssets).values({ projectId, assetId });
      console.log(`[AssetContext] Linked existing asset ${assetId} to project ${projectId}`);
    } catch (error: any) {
      const message = error?.message || String(error);
      if (message.includes('unique') || message.includes('duplicate')) {
        console.log(`[AssetContext] Asset ${assetId} already linked to project ${projectId}`);
        return;
      }

      if (message.includes('column "added_at"') || message.includes('added_at') || message.includes('added_via')) {
        try {
          const id = randomUUID();
          await db.execute(rawSql`
            INSERT INTO "bazaar-vid_project_asset" ("id", "project_id", "asset_id")
            VALUES (${id}, ${projectId}, ${assetId})
            ON CONFLICT ("project_id", "asset_id") DO NOTHING
          `);
          console.warn(`[AssetContext] Fallback link insert (legacy columns) succeeded for asset ${assetId}`);
        } catch (fallbackErr) {
          console.error('[AssetContext] Fallback link insert failed:', fallbackErr);
          throw fallbackErr;
        }
        return;
      }

      console.error('[AssetContext] Failed to link asset to project:', error);
      throw error;
    }
  }
  
  /**
   * List compact project assets for Media Library (images/videos)
   * Safe, read-only helper that returns only essential fields with lightweight
   * tokenizable metadata for LLM reasoning. Results are ordered by recency.
   */
  async listProjectAssets(
    projectId: string,
    opts?: { types?: Array<'image' | 'video' | 'audio' | 'logo'>; limit?: number }
  ): Promise<Array<{
    id: string;
    url: string;
    originalName: string;
    type: string;
    mimeType: string | null;
    createdAt: string;
    tags: string[];
    nameTokens: string[];
    ordinal: number;
  }>> {
    const limit = Math.min(Math.max(opts?.limit ?? 50, 1), 100);

    // Base query similar to getProjectAssets but with a narrow projection
    let rows = await db
      .select({
        id: assets.id,
        url: assets.url,
        originalName: assets.originalName,
        type: assets.type,
        mimeType: assets.mimeType,
        createdAt: assets.createdAt,
        tags: assets.tags,
      })
      .from(assets)
      .innerJoin(projectAssets, eq(assets.id, projectAssets.assetId))
      .where(and(
        eq(projectAssets.projectId, projectId),
        isNull(assets.deletedAt)
      ))
      .orderBy(desc(assets.createdAt));

    // Optional type filtering
    if (opts?.types && opts.types.length > 0) {
      const allowed = new Set(opts.types);
      rows = rows.filter(r => allowed.has((r.type as any) || ''));
    }

    // Trim to limit and compute nameTokens + ordinal
    const limited = rows.slice(0, limit);
    const out = limited.map((r, idx) => {
      const name = r.originalName || '';
      const base = name.replace(/\.[^/.]+$/, '');
      const tokens = base
        .split(/[^a-zA-Z0-9]+/)
        .map(t => t.trim().toLowerCase())
        .filter(Boolean)
        // Keep numeric tokens; for alphabetic tokens require length ≥3
        .filter(t => /\d/.test(t) || t.length >= 3);
      const deduped = Array.from(new Set(tokens));
      return {
        id: r.id,
        url: r.url,
        originalName: r.originalName,
        type: r.type as any,
        mimeType: r.mimeType || null,
        createdAt: r.createdAt.toISOString(),
        tags: Array.isArray(r.tags) ? (r.tags as any) : [],
        nameTokens: deduped,
        ordinal: idx + 1, // 1 = newest
      };
    });

    return out;
  }

  async listUserAssets(
    userId: string,
    opts?: { types?: Array<'image' | 'video' | 'audio' | 'logo'>; limit?: number }
  ): Promise<Array<{
    id: string;
    url: string;
    originalName: string;
    type: string;
    mimeType: string | null;
    createdAt: string;
    tags: string[];
    nameTokens: string[];
    ordinal: number;
  }>> {
    const limit = Math.min(Math.max(opts?.limit ?? 75, 1), 150);

    let rows = await db
      .select({
        id: assets.id,
        url: assets.url,
        originalName: assets.originalName,
        type: assets.type,
        mimeType: assets.mimeType,
        createdAt: assets.createdAt,
        tags: assets.tags,
      })
      .from(assets)
      .where(and(eq(assets.userId, userId), isNull(assets.deletedAt)))
      .orderBy(desc(assets.createdAt));

    if (opts?.types && opts.types.length > 0) {
      const allowed = new Set(opts.types);
      rows = rows.filter((row) => allowed.has((row.type as any) || ''));
    }

    const limited = rows.slice(0, limit);
    return limited.map((row, idx) => {
      const base = (row.originalName || '').replace(/\.[^/.]+$/, '');
      const tokens = base
        .split(/[^a-zA-Z0-9]+/)
        .map((token) => token.trim().toLowerCase())
        .filter(Boolean)
        .filter((token) => /\d/.test(token) || token.length >= 3);

      return {
        id: row.id,
        url: row.url,
        originalName: row.originalName,
        type: row.type as any,
        mimeType: row.mimeType || null,
        createdAt: row.createdAt.toISOString(),
        tags: Array.isArray(row.tags) ? (row.tags as any) : [],
        nameTokens: Array.from(new Set(tokens)),
        ordinal: idx + 1,
      };
    });
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
      referenceNames: a.customName ? [a.customName, a.customName.toLowerCase()] : [],
      dimensions: a.width && a.height ? { width: a.width, height: a.height } : undefined
    }));
    
    // Identify logos
    const logos = assetList.filter(a => 
      a.type === 'logo' || 
      a.tags?.includes('logo') ||
      a.originalName?.toLowerCase().includes('logo')
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
      referenceNames: a.customName ? [a.customName, a.customName.toLowerCase()] : [],
      dimensions: a.width && a.height ? { width: a.width, height: a.height } : undefined
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
