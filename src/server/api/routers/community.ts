import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import {
  communityTemplates,
  communityTemplateScenes,
  communityFavorites,
  communityEvents,
  projects,
  scenes,
} from "~/server/db/schema";
import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";

const SupportedFormatEnum = z.enum(["landscape", "portrait", "square"]);

export const communityRouter = createTRPCRouter({
  // Browse templates
  listTemplates: publicProcedure
    .input(z.object({
      limit: z.number().min(1).max(100).default(24),
      cursor: z.string().optional(),
      filter: z.object({
        category: z.string().optional(),
        tags: z.array(z.string()).optional(),
        format: SupportedFormatEnum.optional(),
        search: z.string().optional(),
        creatorId: z.string().optional(),
      }).optional(),
      sort: z.enum(["recent", "popular", "trending", "most-used"]).default("recent"),
    }))
    .query(async ({ input }) => {
      const whereClauses = [
        eq(communityTemplates.visibility, "public"),
        eq(communityTemplates.status, "active"),
      ];

      if (input.filter?.category) {
        whereClauses.push(eq(communityTemplates.category, input.filter.category));
      }

      if (input.filter?.creatorId) {
        whereClauses.push(eq(communityTemplates.ownerUserId, input.filter.creatorId));
      }

      // Basic search on title
      if (input.filter?.search) {
        whereClauses.push(ilike(communityTemplates.title, `%${input.filter.search}%`));
      }

      let orderBy = [desc(communityTemplates.createdAt)];
      switch (input.sort) {
        case "most-used":
          orderBy = [desc(communityTemplates.usesCount), desc(communityTemplates.createdAt)];
          break;
        case "popular":
          orderBy = [desc(communityTemplates.favoritesCount), desc(communityTemplates.createdAt)];
          break;
        case "trending":
          // For MVP, use viewsCount as proxy
          orderBy = [desc(communityTemplates.viewsCount), desc(communityTemplates.createdAt)];
          break;
        case "recent":
        default:
          orderBy = [desc(communityTemplates.createdAt)];
      }

      const items = await db.query.communityTemplates.findMany({
        where: and(...whereClauses),
        orderBy,
        limit: input.limit,
      });

      // Client can further filter by format; do it on server too when provided
      const filtered = input.filter?.format
        ? items.filter((t) => (t.supportedFormats as string[] | null)?.includes(input.filter!.format!))
        : items;

      return { items: filtered, nextCursor: undefined };
    }),

  // Get full template with scenes
  getTemplate: publicProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .query(async ({ input }) => {
      const template = await db.query.communityTemplates.findFirst({
        where: eq(communityTemplates.id, input.templateId),
      });
      if (!template || template.status !== "active" || template.visibility !== "public") {
        throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });
      }

      const scenesRows = await db
        .select()
        .from(communityTemplateScenes)
        .where(eq(communityTemplateScenes.templateId, input.templateId))
        .orderBy(communityTemplateScenes.sceneIndex);

      // Increment view counter lazily (no await required for UI speed)
      void db
        .update(communityTemplates)
        .set({ viewsCount: sql`"views_count" + 1`, updatedAt: new Date() })
        .where(eq(communityTemplates.id, input.templateId));
      void db.insert(communityEvents).values({
        templateId: input.templateId,
        eventType: "view",
        source: "in_app_panel",
      });

      return { template, scenes: scenesRows };
    }),

  // Favorite
  favoriteTemplate: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .insert(communityFavorites)
        .values({ userId: ctx.session.user.id, templateId: input.templateId })
        .onConflictDoNothing();

      await db
        .update(communityTemplates)
        .set({ favoritesCount: sql`"favorites_count" + 1`, updatedAt: new Date() })
        .where(eq(communityTemplates.id, input.templateId));

      await db.insert(communityEvents).values({
        templateId: input.templateId,
        userId: ctx.session.user.id,
        eventType: "favorite",
        source: "in_app_panel",
      });

      return { ok: true };
    }),

  // Unfavorite
  unfavoriteTemplate: protectedProcedure
    .input(z.object({ templateId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await db
        .delete(communityFavorites)
        .where(
          and(
            eq(communityFavorites.userId, ctx.session.user.id),
            eq(communityFavorites.templateId, input.templateId),
          ),
        );

      await db
        .update(communityTemplates)
        .set({ favoritesCount: sql`GREATEST("favorites_count" - 1, 0)`, updatedAt: new Date() })
        .where(eq(communityTemplates.id, input.templateId));

      await db.insert(communityEvents).values({
        templateId: input.templateId,
        userId: ctx.session.user.id,
        eventType: "unfavorite",
        source: "in_app_panel",
      });

      return { ok: true };
    }),

  // Current user's favorites
  getUserFavorites: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(100).default(50) }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await db
        .select({
          id: communityTemplates.id,
          slug: communityTemplates.slug,
          title: communityTemplates.title,
          thumbnailUrl: communityTemplates.thumbnailUrl,
          viewsCount: communityTemplates.viewsCount,
          favoritesCount: communityTemplates.favoritesCount,
          usesCount: communityTemplates.usesCount,
          supportedFormats: communityTemplates.supportedFormats,
          category: communityTemplates.category,
          createdAt: communityTemplates.createdAt,
        })
        .from(communityFavorites)
        .innerJoin(communityTemplates, eq(communityFavorites.templateId, communityTemplates.id))
        .where(eq(communityFavorites.userId, ctx.session.user.id))
        .orderBy(desc(communityTemplates.createdAt))
        .limit(input?.limit ?? 50);

      return rows;
    }),

  // Current user's templates
  getUserTemplates: protectedProcedure
    .query(async ({ ctx }) => {
      const items = await db.query.communityTemplates.findMany({
        where: and(eq(communityTemplates.ownerUserId, ctx.session.user.id)),
        orderBy: [desc(communityTemplates.createdAt)],
      });
      return items;
    }),

  // Use template: copy scenes into user's project
  useTemplate: protectedProcedure
    .input(z.object({ templateId: z.string().uuid(), projectId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify project ownership
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.session.user.id)),
      });
      if (!project) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or access denied" });
      }

      const tpl = await db.query.communityTemplates.findFirst({
        where: eq(communityTemplates.id, input.templateId),
      });
      if (!tpl) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

      const tplScenes = await db
        .select()
        .from(communityTemplateScenes)
        .where(eq(communityTemplateScenes.templateId, input.templateId))
        .orderBy(communityTemplateScenes.sceneIndex);

      // Get current scene count for ordering
      const existing = await db.query.scenes.findMany({ where: eq(scenes.projectId, input.projectId) });
      let order = existing.length;

      const insertedIds: string[] = [];
      for (const s of tplScenes) {
        const [row] = await db
          .insert(scenes)
          .values({
            projectId: input.projectId,
            name: s.title ?? `${tpl.title} Scene ${s.sceneIndex + 1}`,
            tsxCode: s.tsxCode,
            duration: s.duration,
            order,
            props: {},
          })
          .returning();
        if (row?.id) insertedIds.push(row.id);
        order += 1;
      }

      // Update counters and emit event
      await db
        .update(communityTemplates)
        .set({ usesCount: sql`"uses_count" + 1`, updatedAt: new Date() })
        .where(eq(communityTemplates.id, input.templateId));

      await db.insert(communityEvents).values({
        templateId: input.templateId,
        userId: ctx.session.user.id,
        eventType: "use",
        source: "in_app_panel",
        projectId: input.projectId,
        sceneCount: insertedIds.length,
      });

      return { sceneIds: insertedIds };
    }),
});


