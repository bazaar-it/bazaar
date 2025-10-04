import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import {
  brandRepository,
  projectBrandUsage,
  users,
} from "~/server/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { normalizeBrandUrl } from "~/lib/utils/brand-url";

export const brandProfileRouter = createTRPCRouter({
  getByProject: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const result = await ctx.db
          .select({
            brand: brandRepository,
            usage: projectBrandUsage,
          })
          .from(projectBrandUsage)
          .innerJoin(
            brandRepository,
            eq(projectBrandUsage.brandRepositoryId, brandRepository.id),
          )
          .where(eq(projectBrandUsage.projectId, input.projectId))
          .orderBy(desc(projectBrandUsage.usedAt))
          .limit(1);

        return result[0]?.brand ?? null;
      } catch (error) {
        if ((error as { code?: string })?.code === "42P01") {
          console.warn('[brandProfile.getByProject] Table missing; returning null');
          return null;
        }
        throw error;
      }
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
        .update(brandRepository)
        .set({
          brandData: input.brandData,
          colors: input.brandData?.colors ?? {},
          typography: input.brandData?.typography ?? {},
          logos: input.brandData?.logos ?? {},
          copyVoice: input.brandData?.copyVoice ?? {},
          productNarrative: input.brandData?.productNarrative ?? {},
          socialProof: input.brandData?.socialProof ?? {},
          updatedAt: new Date(),
        })
        .where(eq(brandRepository.id, input.id))
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
      const normalizedUrl = normalizeBrandUrl(input.websiteUrl);
      if (!normalizedUrl) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid website URL",
        });
      }

      const ttlDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const [brand] = await ctx.db
        .insert(brandRepository)
        .values({
          normalizedUrl,
          originalUrl: input.websiteUrl,
          brandData: input.brandData,
          colors: input.brandData?.colors ?? {},
          typography: input.brandData?.typography ?? {},
          logos: input.brandData?.logos ?? {},
          copyVoice: input.brandData?.copyVoice ?? {},
          productNarrative: input.brandData?.productNarrative ?? {},
          socialProof: input.brandData?.socialProof ?? {},
          screenshots: input.brandData?.screenshots ?? [],
          mediaAssets: input.brandData?.mediaAssets ?? [],
          extractionVersion: "1.0.0",
          usageCount: 0,
          lastUsedAt: new Date(),
          lastExtractedAt: new Date(),
          ttl: ttlDate,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: brandRepository.normalizedUrl,
          set: {
            brandData: input.brandData,
            colors: input.brandData?.colors ?? {},
            typography: input.brandData?.typography ?? {},
            logos: input.brandData?.logos ?? {},
            copyVoice: input.brandData?.copyVoice ?? {},
            productNarrative: input.brandData?.productNarrative ?? {},
            socialProof: input.brandData?.socialProof ?? {},
            screenshots: input.brandData?.screenshots ?? [],
            mediaAssets: input.brandData?.mediaAssets ?? [],
            updatedAt: new Date(),
          },
        })
        .returning();

      await ctx.db
        .insert(projectBrandUsage)
        .values({
          projectId: input.projectId,
          brandRepositoryId: brand.id,
        })
        .onConflictDoUpdate({
          target: [projectBrandUsage.projectId, projectBrandUsage.brandRepositoryId],
          set: { usedAt: new Date() },
        });

      const usageCountResult = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(projectBrandUsage)
        .where(eq(projectBrandUsage.brandRepositoryId, brand.id));

      const usageCount = usageCountResult[0]?.count ?? 0;

      await ctx.db
        .update(brandRepository)
        .set({ usageCount, lastUsedAt: new Date(), ttl: ttlDate })
        .where(eq(brandRepository.id, brand.id));

      return brand;
    }),
});
