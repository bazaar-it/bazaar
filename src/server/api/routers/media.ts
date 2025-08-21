/**
 * Media Management API Routes
 * Handles renaming, tagging, and managing uploaded media
 */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { assets, projectAssets } from "~/server/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { mediaContext } from "~/server/services/media/mediaContext.service";

export const mediaRouter = createTRPCRouter({
  /**
   * Rename a media asset (user-centric)
   */
  renameAsset: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      assetId: z.string(),
      newName: z.string().min(1).max(100),
    }))
    .mutation(async ({ input, ctx }) => {
      console.log('[Media] Attempting to rename asset:', {
        projectId: input.projectId,
        assetId: input.assetId,
        newName: input.newName
      });
      
      // Find the asset in the new assets table
      const asset = await db.query.assets.findFirst({
        where: and(
          eq(assets.id, input.assetId),
          eq(assets.userId, ctx.session.user.id),
          isNull(assets.deletedAt)
        )
      });
      
      if (!asset) {
        throw new Error("Asset not found");
      }
      
      const oldName = asset.customName || asset.originalName;
      
      // Update the asset's custom name
      await db
        .update(assets)
        .set({
          customName: input.newName,
          updatedAt: new Date()
        })
        .where(eq(assets.id, input.assetId));
      
      console.log(`[Media] Renamed asset: "${oldName}" → "${input.newName}"`);
      
      return {
        success: true,
        assetId: input.assetId,
        oldName,
        newName: input.newName
      };
    }),
  
  /**
   * Add tags to a media asset
   */
  addTags: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      assetId: z.string(),
      tags: z.array(z.string()).max(10),
    }))
    .mutation(async ({ input, ctx }) => {
      const asset = await db.query.assets.findFirst({
        where: and(
          eq(assets.id, input.assetId),
          eq(assets.userId, ctx.session.user.id),
          isNull(assets.deletedAt)
        )
      });
      
      if (!asset) {
        throw new Error("Asset not found");
      }
      
      // Add new tags (avoid duplicates)
      const existingTags = new Set(asset.tags || []);
      input.tags.forEach(tag => existingTags.add(tag.toLowerCase()));
      const newTags = Array.from(existingTags);
      
      // Update in database
      await db
        .update(assets)
        .set({
          tags: newTags,
          updatedAt: new Date()
        })
        .where(eq(assets.id, input.assetId));
      
      return {
        success: true,
        assetId: input.assetId,
        tags: newTags
      };
    }),
  
  /**
   * Delete a media asset (soft delete)
   */
  deleteAsset: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      assetId: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Soft delete the asset
      const result = await db
        .update(assets)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date()
        })
        .where(and(
          eq(assets.id, input.assetId),
          eq(assets.userId, ctx.session.user.id),
          isNull(assets.deletedAt)
        ));
      
      return {
        success: true,
        assetId: input.assetId
      };
    }),
  
  /**
   * Get enhanced media context with all metadata
   */
  getMediaContext: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const context = await mediaContext.getProjectMediaContext(input.projectId);
      
      // Convert to serializable format
      return {
        projectId: context.projectId,
        allMedia: context.allMedia,
        images: context.images,
        videos: context.videos,
        audio: context.audio,
        logos: context.logos,
        youtube: context.youtube,
        recent: context.recent,
        // Maps can't be serialized, so convert to arrays
        urlCount: context.byUrl.size,
        nameCount: context.byName.size,
        tagGroups: Array.from(context.byTag.entries()).map(([tag, assets]) => ({
          tag,
          count: assets.length
        }))
      };
    }),
});