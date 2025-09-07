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
  users,
  communityAdminRatings,
} from "~/server/db/schema";
import { and, desc, eq, ilike, inArray, sql } from "drizzle-orm";

const SupportedFormatEnum = z.enum(["landscape", "portrait", "square"]);

export const communityRouter = createTRPCRouter({
  // Admin: set editorial rating (0-10)
  setAdminRating: protectedProcedure
    .input(z.object({ templateId: z.string().uuid(), score: z.number().int().min(0).max(10) }))
    .mutation(async ({ ctx, input }) => {
      // Verify admin
      const me = await db.query.users.findFirst({ where: eq(users.id, ctx.session.user.id) });
      if (!me?.isAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });

      await db
        .insert(communityAdminRatings)
        .values({ templateId: input.templateId, adminUserId: ctx.session.user.id, score: input.score })
        .onConflictDoUpdate({
          target: [communityAdminRatings.templateId, communityAdminRatings.adminUserId],
          set: { score: input.score, createdAt: new Date() },
        });

      return { ok: true };
    }),
  // Create a community template from selected project scenes
  createTemplateFromScenes: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      sceneIds: z.array(z.string().uuid()).min(1),
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      tags: z.array(z.string()).optional(),
      category: z.string().max(100).optional(),
      supportedFormats: z.array(SupportedFormatEnum).default(["landscape", "portrait", "square"]).optional(),
      thumbnailUrl: z.string().url().optional(),
      visibility: z.enum(["public", "unlisted"]).default("public").optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership of project
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, input.projectId), eq(projects.userId, ctx.session.user.id)),
      });
      if (!project) throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or access denied" });

      // Fetch scenes and ensure they belong to project
      const rows = await db
        .select({ id: scenes.id, name: scenes.name, tsxCode: scenes.tsxCode, duration: scenes.duration })
        .from(scenes)
        .where(and(eq(scenes.projectId, input.projectId), inArray(scenes.id, input.sceneIds)));

      if (rows.length !== input.sceneIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "One or more scenes not found in project" });
      }

      // Generate unique slug
      const baseSlug = input.title
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

      let slug = baseSlug || `template-${Date.now()}`;
      let suffix = 1;
      // ensure unique slug by checking existing
      while (
        await db.query.communityTemplates.findFirst({ where: eq(communityTemplates.slug, slug) })
      ) {
        slug = `${baseSlug}-${suffix++}`;
      }

      // Insert template
      const [template] = await db
        .insert(communityTemplates)
        .values({
          slug,
          title: input.title,
          description: input.description,
          ownerUserId: ctx.session.user.id,
          sourceProjectId: input.projectId,
          thumbnailUrl: input.thumbnailUrl,
          supportedFormats: input.supportedFormats ?? ["landscape", "portrait", "square"],
          tags: input.tags ?? [],
          category: input.category,
          visibility: input.visibility ?? "public",
          status: "active",
        })
        .returning();

      // Insert scenes in the order provided by sceneIds
      const sceneIdOrder = new Map(input.sceneIds.map((id, idx) => [id, idx] as const));
      const ordered = [...rows].sort((a, b) => (sceneIdOrder.get(a.id)! - sceneIdOrder.get(b.id)!));

      if (ordered.length) {
        await db.insert(communityTemplateScenes).values(
          ordered.map((s) => ({
            templateId: template.id,
            sceneIndex: sceneIdOrder.get(s.id)!,
            title: s.name ?? undefined,
            tsxCode: s.tsxCode,
            duration: s.duration,
            previewFrame: 15,
            codeHash: null,
            sourceSceneId: s.id,
          }))
        );
      }

      // Emit initial event (optional)
      await db.insert(communityEvents).values({
        templateId: template.id,
        userId: ctx.session.user.id,
        eventType: "click",
        source: "in_app_panel",
      });

      return { templateId: template.id, slug: template.slug };
    }),
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
          // For MVP, prioritize uses, then favorites, then views
          orderBy = [
            desc(communityTemplates.usesCount),
            desc(communityTemplates.favoritesCount),
            desc(communityTemplates.viewsCount),
            desc(communityTemplates.createdAt),
          ];
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
