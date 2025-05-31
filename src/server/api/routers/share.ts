//src/server/api/routers/share.ts
import { z } from "zod";
import { eq, and, desc, isNull, or } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { projects, scenes, sharedVideos } from "~/server/db/schema";
import { TRPCError } from "@trpc/server";
import { getShareUrl } from "~/lib/utils";

export const shareRouter = createTRPCRouter({
  // Create a shared video link
  createShare: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      title: z.string().optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { projectId, title, description } = input;
      const userId = ctx.session.user.id;

      // 1. Verify project ownership
      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, projectId),
          eq(projects.userId, userId)
        ),
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or you don't have permission to share it",
        });
      }

      // 2. Get the latest scene from this project (no need for it to be published/rendered)
      const latestScene = await db.query.scenes.findFirst({
        where: and(
          eq(scenes.projectId, projectId)
        ),
        orderBy: (scenes, { desc }) => [desc(scenes.createdAt)],
      });

      if (!latestScene) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No scenes found for this project. Please create some content first.",
        });
      }

      // 3. Create or update shared video record
      const existingShare = await db.query.sharedVideos.findFirst({
        where: and(
          eq(sharedVideos.projectId, projectId),
          eq(sharedVideos.userId, userId)
        ),
      });

      let shareId: string;

      if (existingShare) {
        // Update existing share
        await db.update(sharedVideos)
          .set({
            title: title || project.title,
            description,
            videoUrl: null, // Will be rendered live on the share page
            isPublic: true,
          })
          .where(eq(sharedVideos.id, existingShare.id));
        
        shareId = existingShare.id;
      } else {
        // Create new share
        const newShare = await db.insert(sharedVideos)
          .values({
            projectId,
            userId,
            title: title || project.title,
            description,
            videoUrl: null, // Will be rendered live on the share page
            isPublic: true,
          })
          .returning({ id: sharedVideos.id });
        
        shareId = newShare[0]!.id;
      }

      return {
        shareId,
        shareUrl: getShareUrl(shareId),
      };
    }),

  // Get shared video by ID (public endpoint)
  getSharedVideo: publicProcedure
    .input(z.object({
      shareId: z.string().uuid(),
    }))
    .query(async ({ input }) => {
      const { shareId } = input;

      const sharedVideo = await db.query.sharedVideos.findFirst({
        where: and(
          eq(sharedVideos.id, shareId),
          eq(sharedVideos.isPublic, true),
          or(
            isNull(sharedVideos.expiresAt),
            sql`${sharedVideos.expiresAt} > NOW()`
          )
        ),
        with: {
          project: {
            columns: {
              id: true,
              title: true,
            },
            with: {
              scenes: {
                orderBy: (scenes, { desc }) => [desc(scenes.createdAt)],
                limit: 1,
                columns: {
                  id: true,
                  tsxCode: true,
                  duration: true,
                  createdAt: true,
                },
              },
            },
          },
          user: {
            columns: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!sharedVideo) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared video not found or no longer available",
        });
      }

      // Increment view count atomically (prevents race conditions)
      await db.update(sharedVideos)
        .set({
          viewCount: sql`COALESCE("viewCount", 0) + 1`,
        })
        .where(eq(sharedVideos.id, shareId));

      return {
        ...sharedVideo,
        creator: sharedVideo.user,
        latestScene: sharedVideo.project.scenes[0] || null,
      };
    }),

  // Get user's shared videos
  getMyShares: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;

      const shares = await db.query.sharedVideos.findMany({
        where: eq(sharedVideos.userId, userId),
        with: {
          project: {
            columns: {
              title: true,
            }
          }
        },
        orderBy: (sharedVideos, { desc }) => [desc(sharedVideos.createdAt)],
      });

      return shares.map(share => ({
        id: share.id,
        title: share.title,
        description: share.description,
        viewCount: share.viewCount ?? 0,
        createdAt: share.createdAt,
        shareUrl: getShareUrl(share.id),
        project: share.project,
      }));
    }),

  // Delete shared video
  deleteShare: protectedProcedure
    .input(z.object({
      shareId: z.string().uuid(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { shareId } = input;
      const userId = ctx.session.user.id;

      const result = await db.delete(sharedVideos)
        .where(and(
          eq(sharedVideos.id, shareId),
          eq(sharedVideos.userId, userId)
        ))
        .returning({ id: sharedVideos.id });

      if (result.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared video not found or you don't have permission to delete it",
        });
      }

      return { success: true };
    }),
});
