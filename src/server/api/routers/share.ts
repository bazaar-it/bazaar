//src/server/api/routers/share.ts
import { z } from "zod";
import { eq, and, desc, isNull, or, asc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { projects, scenes, sharedVideos } from "~/server/db/schema";
import { TRPCError } from "@trpc/server";
import { getShareUrl } from "~/lib/utils/url";
import type { InputProps } from "~/lib/types/video/input-props";

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

      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
      });

      if (!project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Project not found or you don't have permission to share it",
        });
      }

      const projectScenes = await db.query.scenes.findMany({
        where: and(eq(scenes.projectId, projectId), isNull(scenes.deletedAt)),
      });

      if (projectScenes.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No scenes found for this project. Please create some content first.",
        });
      }

      const existingShare = await db.query.sharedVideos.findFirst({
        where: and(
          eq(sharedVideos.projectId, projectId),
          eq(sharedVideos.userId, userId)
        ),
      });

      let shareId: string;

      if (existingShare) {
        await db
          .update(sharedVideos)
          .set({
            title: title || project.title,
            description,
            videoUrl: null, 
            isPublic: true,
          })
          .where(eq(sharedVideos.id, existingShare.id));
        shareId = existingShare.id;
      } else {
        const newShare = await db
          .insert(sharedVideos)
          .values({
            projectId,
            userId,
            title: title || project.title,
            description,
            videoUrl: null, 
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
          or(isNull(sharedVideos.expiresAt), sql`${sharedVideos.expiresAt} > NOW()`)
        ),
        with: {
          project: {
            columns: {
              id: true,
              title: true,
              props: true,
              audio: true,
            },
            with: {
              scenes: {
                where: (scenesTable, { isNull }) => isNull(scenesTable.deletedAt),
                orderBy: (scenesTable, { asc }) => [asc(scenesTable.order)],
                columns: {
                  id: true,
                  tsxCode: true,
                  jsCode: true,        // Include pre-compiled JS for faster loading
                  jsCompiledAt: true,  // To check if compilation is fresh
                  duration: true,
                  name: true,
                  props: true,
                  order: true,
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

      if (!sharedVideo || !sharedVideo.project) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shared video or associated project not found or no longer available",
        });
      }

      await db
        .update(sharedVideos)
        .set({ viewCount: sql`COALESCE("viewCount", 0) + 1` })
        .where(eq(sharedVideos.id, shareId));
        
      const allProjectScenes = sharedVideo.project.scenes;
      let currentStart = 0;
      
      // Map scenes to format compatible with DynamicVideo composition
      const formattedScenes = allProjectScenes.map((dbScene, index) => {
        const sceneDuration = dbScene.duration || 180; // Default if null
        const sceneToAdd = {
          id: dbScene.id,
          type: 'custom' as const, // All database scenes are treated as custom TSX components
          start: currentStart,
          duration: sceneDuration,
          data: {
            code: dbScene.jsCode || dbScene.tsxCode, // Use pre-compiled JS if available, fallback to TSX
            isPreCompiled: !!dbScene.jsCode,         // Flag to skip compilation on client
            name: dbScene.name || `Scene ${(dbScene.order ?? index) + 1}`,
            componentId: dbScene.id, // Use scene ID as component ID
            props: dbScene.props || {},
          },
        };
        currentStart += sceneDuration;
        return sceneToAdd;
      });

      const projectInputProps: InputProps = {
        meta: {
          title: sharedVideo.title || sharedVideo.project.title || "Untitled Video",
          duration: currentStart, // Total duration of all scenes
          backgroundColor: (sharedVideo.project.props as InputProps)?.meta?.backgroundColor || '#000000',
          format: (sharedVideo.project.props as InputProps)?.meta?.format || 'landscape',
          width: (sharedVideo.project.props as InputProps)?.meta?.width || 1920,
          height: (sharedVideo.project.props as InputProps)?.meta?.height || 1080,
        },
        scenes: formattedScenes,
      };

      return {
        id: sharedVideo.id,
        projectId: sharedVideo.projectId,
        userId: sharedVideo.userId,
        title: sharedVideo.title,
        description: sharedVideo.description,
        videoUrl: sharedVideo.videoUrl,
        thumbnailUrl: sharedVideo.thumbnailUrl,
        isPublic: sharedVideo.isPublic,
        viewCount: sharedVideo.viewCount,
        createdAt: sharedVideo.createdAt,
        expiresAt: sharedVideo.expiresAt,
        creator: sharedVideo.user,
        project: {
            id: sharedVideo.project.id,
            title: sharedVideo.project.title,
            inputProps: projectInputProps,
            audio: sharedVideo.project.audio
        }
      };
    }),

  // Get existing share for a specific project
  getProjectShare: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
    }))
    .query(async ({ ctx, input }) => {
      const { projectId } = input;
      const userId = ctx.session.user.id;

      const existingShare = await db.query.sharedVideos.findFirst({
        where: and(
          eq(sharedVideos.projectId, projectId),
          eq(sharedVideos.userId, userId)
        ),
      });

      if (!existingShare) {
        return null;
      }

      return {
        id: existingShare.id,
        shareUrl: getShareUrl(existingShare.id),
      };
    }),

  // Get user's shared videos
  getMyShares: protectedProcedure
    .query(async ({ ctx }) => {
      const userId = ctx.session.user.id;
      const shares = await db.query.sharedVideos.findMany({
        where: eq(sharedVideos.userId, userId),
        with: {
          project: { columns: { title: true } },
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
    .input(z.object({ shareId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { shareId } = input;
      const userId = ctx.session.user.id;
      const result = await db
        .delete(sharedVideos)
        .where(and(eq(sharedVideos.id, shareId), eq(sharedVideos.userId, userId)))
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
