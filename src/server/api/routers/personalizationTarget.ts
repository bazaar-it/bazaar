import { TRPCError } from "@trpc/server";
import { desc, eq, and } from "drizzle-orm";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { personalizationTargets, projects } from "~/server/db/schema";
import { WebAnalysisAgentV4 } from "~/tools/webAnalysis/WebAnalysisAgentV4";
import { convertV4ToSimplified } from "~/tools/webAnalysis/brandDataAdapter";
import { createBrandThemeFromExtraction } from "~/lib/theme/brandTheme";

const listInput = z.object({
  projectId: z.string().uuid(),
});

const createFromUrlInput = z.object({
  projectId: z.string().uuid(),
  websiteUrl: z.string().url(),
  companyName: z.string().min(1).max(120).optional(),
  contactEmail: z.string().email().optional(),
  notes: z.string().max(500).optional(),
});

function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Website URL is required" });
  }
  try {
    const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
    url.hash = "";
    return url.toString();
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid website URL" });
  }
}

export const personalizationTargetRouter = createTRPCRouter({
  list: protectedProcedure
    .input(listInput)
    .query(async ({ ctx, input }) => {
      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, input.projectId),
      });

      if (!project || (project.userId !== ctx.session.user.id && !ctx.session.user.isAdmin)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or access denied" });
      }

      return ctx.db
        .select()
        .from(personalizationTargets)
        .where(eq(personalizationTargets.projectId, input.projectId))
        .orderBy(desc(personalizationTargets.createdAt));
    }),

  createFromUrl: protectedProcedure
    .input(createFromUrlInput)
    .mutation(async ({ ctx, input }) => {
      const { projectId } = input;
      const project = await ctx.db.query.projects.findFirst({
        where: eq(projects.id, projectId),
      });

      if (!project || (project.userId !== ctx.session.user.id && !ctx.session.user.isAdmin)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Project not found or access denied" });
      }

      if (!process.env.BROWSERLESS_URL) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Browserless connection is not configured",
        });
      }

      const normalizedUrl = normalizeUrl(input.websiteUrl);
      const now = new Date();

      const existing = await ctx.db.query.personalizationTargets.findFirst({
        where: and(
          eq(personalizationTargets.projectId, projectId),
          eq(personalizationTargets.websiteUrl, normalizedUrl),
        ),
      });

      let targetId: string;

      if (existing) {
        await ctx.db
          .update(personalizationTargets)
          .set({
            status: "extracting",
            errorMessage: null,
            companyName: input.companyName?.trim() || existing.companyName,
            contactEmail: input.contactEmail ?? existing.contactEmail,
            notes: input.notes ?? existing.notes,
            updatedAt: now,
          })
          .where(eq(personalizationTargets.id, existing.id));
        targetId = existing.id;
      } else {
        const [created] = await ctx.db
          .insert(personalizationTargets)
          .values({
            projectId,
            websiteUrl: normalizedUrl,
            companyName: input.companyName?.trim() ?? null,
            contactEmail: input.contactEmail ?? null,
            notes: input.notes ?? null,
            status: "extracting",
            createdAt: now,
            updatedAt: now,
          })
          .returning({ id: personalizationTargets.id });
        targetId = created.id;
      }

      try {
        const analyzer = new WebAnalysisAgentV4(projectId);
        const extracted = await analyzer.analyze(normalizedUrl);
        const simplified = convertV4ToSimplified(extracted);
        const brandTheme = createBrandThemeFromExtraction(simplified);

        const displayName = input.companyName?.trim() || simplified.page?.title || project.title;

        await ctx.db
          .update(personalizationTargets)
          .set({
            status: "ready",
            companyName: displayName,
            brandProfile: simplified,
            brandTheme,
            errorMessage: null,
            extractedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(personalizationTargets.id, targetId));

        return { id: targetId, status: "ready" as const };
      } catch (error) {
        console.error("[personalizationTarget.createFromUrl] Extraction failed", error);
        const message = error instanceof Error ? error.message : "Brand extraction failed";

        await ctx.db
          .update(personalizationTargets)
          .set({
            status: "failed",
            errorMessage: message,
            updatedAt: new Date(),
          })
          .where(eq(personalizationTargets.id, targetId));

        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message });
      }
    }),
});
