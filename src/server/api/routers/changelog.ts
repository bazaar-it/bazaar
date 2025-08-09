// src/server/api/routers/changelog.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure, protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { changelogEntries, users } from "~/server/db/schema";
import { and, asc, count, desc, eq, ilike, or, sql, gte, lt } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

// Admin-only guard middleware (local to this router)
const adminOnly = protectedProcedure.use(async ({ ctx, next }) => {
  const current = await db
    .select({ isAdmin: users.isAdmin })
    .from(users)
    .where(eq(users.id, ctx.session.user.id))
    .limit(1);
  if (!current[0]?.isAdmin) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next();
});

export const changelogRouter = createTRPCRouter({
  // Public list with filters and pagination
  list: publicProcedure
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
      type: z.enum(['feature', 'fix', 'refactor', 'docs', 'style', 'test', 'chore', 'all']).default('all'),
      query: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { page, pageSize, type, query } = input;
      const offset = (page - 1) * pageSize;

      const whereClauses: any[] = [];
      if (type !== 'all') whereClauses.push(eq(changelogEntries.type, type));
      if (query && query.trim()) {
        whereClauses.push(or(
          ilike(changelogEntries.title, `%${query}%`),
          ilike(changelogEntries.description, `%${query}%`),
          ilike(changelogEntries.repositoryFullName, `%${query}%`)
        ));
      }

      const whereExpr = whereClauses.length > 0 ? and(...whereClauses) : undefined;

      const [rows, totalRow] = await Promise.all([
        db.select({
          id: changelogEntries.id,
          prNumber: changelogEntries.prNumber,
          repository: changelogEntries.repositoryFullName,
          title: changelogEntries.title,
          description: changelogEntries.description,
          type: changelogEntries.type,
          authorUsername: changelogEntries.authorUsername,
          authorAvatar: changelogEntries.authorAvatar,
          videoUrl: changelogEntries.videoUrl,
          thumbnailUrl: changelogEntries.thumbnailUrl,
          status: changelogEntries.status,
          mergedAt: changelogEntries.mergedAt,
          viewCount: changelogEntries.viewCount,
          createdAt: changelogEntries.createdAt,
        })
          .from(changelogEntries)
          .where(whereExpr)
          .orderBy(desc(changelogEntries.mergedAt), desc(changelogEntries.createdAt))
          .limit(pageSize)
          .offset(offset),
        db.select({ count: count() }).from(changelogEntries).where(whereExpr)
      ]);

      return {
        items: rows,
        page,
        pageSize,
        total: totalRow[0]?.count || 0,
      };
    }),

  // Public detail + increment viewCount
  getById: publicProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input }) => {
      const [row] = await db
        .select()
        .from(changelogEntries)
        .where(eq(changelogEntries.id, input.id))
        .limit(1);

      if (!row) return null;

      // Increment view count asynchronously (no await)
      void db.update(changelogEntries)
        .set({ viewCount: sql`COALESCE(${changelogEntries.viewCount}, 0) + 1` })
        .where(eq(changelogEntries.id, input.id));

      return row;
    }),

  // Admin list
  adminList: adminOnly
    .input(z.object({
      page: z.number().min(1).default(1),
      pageSize: z.number().min(1).max(100).default(20),
      status: z.enum(['queued', 'processing', 'completed', 'failed', 'all']).default('all'),
      type: z.enum(['feature', 'fix', 'refactor', 'docs', 'style', 'test', 'chore', 'all']).default('all'),
      query: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { page, pageSize, status, type, query } = input;
      const offset = (page - 1) * pageSize;
      const clauses: any[] = [];
      if (status !== 'all') clauses.push(eq(changelogEntries.status, status));
      if (type !== 'all') clauses.push(eq(changelogEntries.type, type));
      if (query && query.trim()) {
        clauses.push(or(
          ilike(changelogEntries.title, `%${query}%`),
          ilike(changelogEntries.description, `%${query}%`),
          ilike(changelogEntries.repositoryFullName, `%${query}%`)
        ));
      }
      const whereExpr = clauses.length > 0 ? and(...clauses) : undefined;

      const [items, totalRow] = await Promise.all([
        db.select().from(changelogEntries).where(whereExpr)
          .orderBy(desc(changelogEntries.createdAt))
          .limit(pageSize).offset(offset),
        db.select({ count: count() }).from(changelogEntries).where(whereExpr)
      ]);
      return { items, total: totalRow[0]?.count || 0, page, pageSize };
    }),

  create: adminOnly
    .input(z.object({
      title: z.string().min(1),
      description: z.string().default(''),
      type: z.enum(['feature', 'fix', 'refactor', 'docs', 'style', 'test', 'chore']),
      repositoryFullName: z.string().min(1),
      prNumber: z.number().int().positive().optional(),
      videoUrl: z.string().url().optional(),
      thumbnailUrl: z.string().url().optional(),
      status: z.enum(['queued', 'processing', 'completed', 'failed']).default('completed'),
      mergedAt: z.date().default(new Date()),
    }))
    .mutation(async ({ input }) => {
      const id = crypto.randomUUID();
      await db.insert(changelogEntries).values({
        id,
        prNumber: input.prNumber || 0,
        repositoryFullName: input.repositoryFullName,
        repositoryOwner: input.repositoryFullName.split('/')[0] || '',
        repositoryName: input.repositoryFullName.split('/')[1] || '',
        title: input.title,
        description: input.description,
        type: input.type,
        authorUsername: 'admin',
        mergedAt: input.mergedAt,
        videoUrl: input.videoUrl,
        thumbnailUrl: input.thumbnailUrl,
        status: input.status,
      });
      return { id };
    }),

  update: adminOnly
    .input(z.object({
      id: z.string().uuid(),
      title: z.string().optional(),
      description: z.string().optional(),
      type: z.enum(['feature', 'fix', 'refactor', 'docs', 'style', 'test', 'chore']).optional(),
      videoUrl: z.string().url().optional().nullable(),
      thumbnailUrl: z.string().url().optional().nullable(),
      status: z.enum(['queued', 'processing', 'completed', 'failed']).optional(),
    }))
    .mutation(async ({ input }) => {
      const update: any = {};
      if (input.title !== undefined) update.title = input.title;
      if (input.description !== undefined) update.description = input.description;
      if (input.type !== undefined) update.type = input.type;
      if (input.videoUrl !== undefined) update.videoUrl = input.videoUrl;
      if (input.thumbnailUrl !== undefined) update.thumbnailUrl = input.thumbnailUrl;
      if (input.status !== undefined) update.status = input.status;
      if (Object.keys(update).length === 0) return { success: true };
      await db.update(changelogEntries).set(update).where(eq(changelogEntries.id, input.id));
      return { success: true };
    }),

  delete: adminOnly
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input }) => {
      await db.delete(changelogEntries).where(eq(changelogEntries.id, input.id));
      return { success: true };
    }),
});
