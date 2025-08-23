import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { brandProfiles } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const brandProfileRouter = createTRPCRouter({
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      const brandProfile = await ctx.db
        .select()
        .from(brandProfiles)
        .where(eq(brandProfiles.projectId, input.projectId))
        .limit(1);

      return brandProfile[0] || null;
    }),

  update: protectedProcedure
    .input(z.object({
      id: z.string(),
      brandData: z.any(), // Allow any JSON data for flexibility
    }))
    .mutation(async ({ ctx, input }) => {
      // Check if user is admin
      const user = await ctx.db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.session.user.id),
      });

      if (!user?.isAdmin) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only admins can update brand profiles",
        });
      }

      const updated = await ctx.db
        .update(brandProfiles)
        .set({
          brandData: input.brandData,
          updatedAt: new Date(),
        })
        .where(eq(brandProfiles.id, input.id))
        .returning();

      return updated[0];
    }),

  create: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      websiteUrl: z.string(),
      brandData: z.any(),
    }))
    .mutation(async ({ ctx, input }) => {
      const created = await ctx.db
        .insert(brandProfiles)
        .values({
          projectId: input.projectId,
          websiteUrl: input.websiteUrl,
          brandData: input.brandData,
          extractionVersion: "1.0.0",
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return created[0];
    }),
});