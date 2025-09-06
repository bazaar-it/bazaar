// Scaffold: Community Router (tRPC)
// Intended final location: src/server/api/routers/community.ts
// This file is a scaffold placed in the sprint docs so a dev can copy it into the codebase and fill in the TODOs.

import { z } from "zod";
// NOTE: When moving into src/, use these imports:
// import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
// import {
//   communityTemplates,
//   communityTemplateScenes,
//   communityFavorites,
//   communityEvents,
//   communityMetricsDaily,
//   projects,
//   scenes,
// } from "~/server/db/schema";
// import { and, eq, inArray, ilike, desc, sql } from "drizzle-orm";

// Helper: slugify (simple)
const slugify = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

// Zod Schemas
const SupportedFormatEnum = z.enum(["landscape", "portrait", "square"]);
const VisibilityEnum = z.enum(["public", "unlisted"]); // MVP

export const createTemplateInput = z.object({
  projectId: z.string().uuid(),
  sceneIds: z.array(z.string().uuid()).min(1),
  title: z.string().min(1).max(255),
  description: z.string().max(5000).optional(),
  tags: z.array(z.string()).optional(),
  category: z.string().max(100).optional(),
  supportedFormats: z.array(SupportedFormatEnum).default(["landscape", "portrait", "square"]).optional(),
  visibility: VisibilityEnum.default("public").optional(),
  thumbnailUrl: z.string().url().optional(),
});

export const listTemplatesInput = z.object({
  limit: z.number().min(1).max(100).default(24),
  cursor: z.string().optional(), // opaque cursor (e.g., createdAt|id) — TODO implement
  filter: z
    .object({
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      format: SupportedFormatEnum.optional(),
      search: z.string().optional(),
      creatorId: z.string().optional(),
    })
    .optional(),
  sort: z.enum(["recent", "popular", "trending", "most-used"]).default("recent"),
});

export const getTemplateInput = z.object({ templateId: z.string().uuid() });

export const favoriteInput = z.object({ templateId: z.string().uuid() });

export const useTemplateInput = z.object({
  templateId: z.string().uuid(),
  projectId: z.string().uuid().optional(),
  action: z.enum(["copy", "remix"]).default("copy"),
});

export const trackEventInput = z.object({
  templateId: z.string().uuid(),
  eventType: z.enum(["view", "favorite", "unfavorite", "use", "mix", "prompt", "click"]),
  projectId: z.string().uuid().optional(),
  source: z.enum(["in_app_panel", "community_site", "direct"]).optional(),
});

// Example router structure (uncomment imports when moving into src/ and wrap with createTRPCRouter)
// export const communityRouter = createTRPCRouter({
export const communityRouterScaffold = {
  // Create a community template from selected scenes
  createTemplateFromScenes: {
    input: createTemplateInput,
    // protectedProcedure.mutation
    async resolve({ ctx, input }: any) {
      const userId = ctx.session.user.id;

      // 1) Verify ownership
      // const project = await ctx.db.query.projects.findFirst({
      //   where: (p, { eq, and }) => and(eq(p.id, input.projectId), eq(p.userId, userId)),
      // });
      // if (!project) throw new TRPCError({ code: 'FORBIDDEN' });

      // 2) Fetch scenes (preserve requested order)
      // const rows = await ctx.db.select().from(scenes).where(and(
      //   eq(scenes.projectId, input.projectId),
      //   inArray(scenes.id, input.sceneIds)
      // ));
      // TODO: sort rows according to input.sceneIds order

      // 3) Create template
      // const baseSlug = slugify(input.title);
      // const slug = await ensureUniqueSlug(ctx.db, baseSlug);
      // const [template] = await ctx.db.insert(communityTemplates).values({
      //   slug,
      //   title: input.title,
      //   description: input.description,
      //   ownerUserId: userId,
      //   sourceProjectId: input.projectId,
      //   thumbnailUrl: input.thumbnailUrl,
      //   supportedFormats: input.supportedFormats ?? ["landscape","portrait","square"],
      //   tags: input.tags ?? [],
      //   category: input.category,
      //   visibility: input.visibility ?? 'public',
      // }).returning();

      // 4) Insert scenes snapshots (tsxCode, duration)
      // await ctx.db.insert(communityTemplateScenes).values(rows.map((s, i) => ({
      //   templateId: template.id,
      //   sceneIndex: i,
      //   title: s.title ?? `Scene ${i+1}`,
      //   tsxCode: s.tsxCode,
      //   duration: s.duration,
      //   previewFrame: 15,
      //   codeHash: sql<string>`md5(${s.tsxCode})`,
      // })));

      // 5) Optionally emit an event (e.g., 'click' on publish) — skipped here

      // return { templateId: template.id, slug: template.slug };
      return { templateId: "TODO", slug: "todo-slug" };
    },
  },

  // List public templates (with filters/sorting)
  listTemplates: {
    input: listTemplatesInput,
    // publicProcedure.query
    async resolve({ ctx, input }: any) {
      // Build query with optional filters (category/tags/format/search/creatorId)
      // JOINs not required; counters are on template row.
      // TODO: implement cursor (created_at|id) and sort modes.
      // const items = await ctx.db.select({
      //   id: communityTemplates.id,
      //   slug: communityTemplates.slug,
      //   title: communityTemplates.title,
      //   thumbnailUrl: communityTemplates.thumbnailUrl,
      //   views: communityTemplates.viewsCount,
      //   favorites: communityTemplates.favoritesCount,
      //   uses: communityTemplates.usesCount,
      // }).from(communityTemplates)
      //   .where(eq(communityTemplates.visibility, 'public'))
      //   .orderBy(desc(communityTemplates.createdAt))
      //   .limit(input.limit);
      return { items: [], nextCursor: undefined };
    },
  },

  // Get full template details including scenes
  getTemplate: {
    input: getTemplateInput,
    // publicProcedure.query
    async resolve({ ctx, input }: any) {
      // const tpl = await ctx.db.query.communityTemplates.findFirst({
      //   where: (t, { eq }) => eq(t.id, input.templateId),
      // });
      // if (!tpl || tpl.status !== 'active') throw new TRPCError({ code: 'NOT_FOUND' });
      // const scenesRows = await ctx.db.select().from(communityTemplateScenes)
      //   .where(eq(communityTemplateScenes.templateId, input.templateId))
      //   .orderBy(communityTemplateScenes.sceneIndex);
      // return { template: tpl, scenes: scenesRows };
      return { template: null, scenes: [] };
    },
  },

  // Favorite a template
  favorite: {
    input: favoriteInput,
    // protectedProcedure.mutation
    async resolve({ ctx, input }: any) {
      const userId = ctx.session.user.id;
      // await ctx.db.insert(communityFavorites)
      //   .values({ userId, templateId: input.templateId })
      //   .onConflictDoNothing();
      // await ctx.db.update(communityTemplates)
      //   .set({ favoritesCount: sql<number>`"favorites_count" + 1` })
      //   .where(eq(communityTemplates.id, input.templateId));
      // await ctx.db.insert(communityEvents).values({
      //   templateId: input.templateId,
      //   userId,
      //   eventType: 'favorite',
      //   source: 'in_app_panel',
      // });
      return { ok: true };
    },
  },

  // Unfavorite a template
  unfavorite: {
    input: favoriteInput,
    // protectedProcedure.mutation
    async resolve({ ctx, input }: any) {
      const userId = ctx.session.user.id;
      // await ctx.db.delete(communityFavorites)
      //   .where(and(
      //     eq(communityFavorites.userId, userId),
      //     eq(communityFavorites.templateId, input.templateId)
      //   ));
      // await ctx.db.update(communityTemplates)
      //   .set({ favoritesCount: sql<number>`GREATEST("favorites_count" - 1, 0)` })
      //   .where(eq(communityTemplates.id, input.templateId));
      // await ctx.db.insert(communityEvents).values({
      //   templateId: input.templateId,
      //   userId,
      //   eventType: 'unfavorite',
      //   source: 'in_app_panel',
      // });
      return { ok: true };
    },
  },

  // List current user's favorites
  getUserFavorites: {
    // protectedProcedure.query
    async resolve({ ctx }: any) {
      const userId = ctx.session.user.id;
      // const rows = await ctx.db.select({
      //   id: communityTemplates.id,
      //   slug: communityTemplates.slug,
      //   title: communityTemplates.title,
      //   thumbnailUrl: communityTemplates.thumbnailUrl,
      //   views: communityTemplates.viewsCount,
      //   favorites: communityTemplates.favoritesCount,
      //   uses: communityTemplates.usesCount,
      // }).from(communityFavorites)
      //   .innerJoin(communityTemplates, eq(communityFavorites.templateId, communityTemplates.id))
      //   .where(eq(communityFavorites.userId, userId));
      return { items: [] };
    },
  },

  // Use a template: copy scenes into a target project
  useTemplate: {
    input: useTemplateInput,
    // protectedProcedure.mutation
    async resolve({ ctx, input }: any) {
      const userId = ctx.session.user.id;
      // 1) Resolve target project (require provided projectId for MVP)
      // const project = await ctx.db.query.projects.findFirst({
      //   where: (p, { eq, and }) => and(eq(p.id, input.projectId!), eq(p.userId, userId))
      // });
      // if (!project) throw new TRPCError({ code: 'FORBIDDEN' });

      // 2) Load template scenes
      // const tplScenes = await ctx.db.select().from(communityTemplateScenes)
      //   .where(eq(communityTemplateScenes.templateId, input.templateId))
      //   .orderBy(communityTemplateScenes.sceneIndex);

      // 3) For each scene, uniquify component names and insert into scenes table
      // TODO: reuse existing generator/import utils

      // 4) Emit 'use' event + increment uses_count
      // await ctx.db.insert(communityEvents).values({ templateId: input.templateId, userId, eventType: 'use', source: 'in_app_panel', projectId: input.projectId });
      // await ctx.db.update(communityTemplates)
      //   .set({ usesCount: sql<number>`"uses_count" + 1` })
      //   .where(eq(communityTemplates.id, input.templateId));

      // return { sceneIds: insertedSceneIds };
      return { sceneIds: [] };
    },
  },

  // Track an event explicitly (optional)
  trackEvent: {
    input: trackEventInput,
    // publicProcedure.mutation (can be protected if you prefer)
    async resolve({ ctx, input, session }: any) {
      const userId = session?.user?.id;
      // await ctx.db.insert(communityEvents).values({
      //   templateId: input.templateId,
      //   userId,
      //   eventType: input.eventType,
      //   source: input.source ?? 'in_app_panel',
      //   projectId: input.projectId,
      // });
      return { ok: true };
    },
  },
};

