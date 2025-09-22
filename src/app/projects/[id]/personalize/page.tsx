// src/app/projects/[id]/personalize/page.tsx
import { notFound, redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { api } from "~/trpc/server";
import { PersonalizePageClient } from "./personalize-page-client";
import { createBrandThemeFromProfile } from "~/lib/theme/brandTheme";
import type { BrandProfileLike } from "~/lib/theme/brandTheme";
import type { BrandTheme } from "~/lib/theme/brandTheme";

type PersonalizationTargetDTO = {
  id: string;
  companyName: string | null;
  websiteUrl: string;
  contactEmail: string | null;
  sector: string | null;
  status: "pending" | "extracting" | "ready" | "failed";
  notes: string | null;
  errorMessage: string | null;
  createdAt: string;
  extractedAt: string | null;
  brandTheme: BrandTheme | null;
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

export default async function PersonalizePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!projectId || !isUuid(projectId)) {
    notFound();
  }

  try {
    const [fullProject, brandProfile, targetRows] = await Promise.all([
      api.project.getFullProject({ id: projectId, include: ["scenes"] }),
      api.brandProfile.getByProject({ projectId }),
      api.personalizationTargets.list({ projectId }),
    ]);

    const project = fullProject.project;
    const scenes = fullProject.scenes;
    const projectProps = (project.props ?? {}) as Record<string, any>;

    const approxDurationFrames = scenes.reduce((total, scene) => total + (scene.duration ?? 0), 0);
    const approxDurationSeconds = scenes.length === 0 ? 0 : Math.max(1, Math.round(approxDurationFrames / 30));
    const tokenizedRegex = /(brandThemeRuntime|theme\?\.)/;
    const isTokenized = scenes.length > 0 && scenes.every((scene) => {
      const code = scene.tsxCode ?? '';
      return tokenizedRegex.test(code);
    });

    const brandTheme = createBrandThemeFromProfile(
      (brandProfile?.brandData as BrandProfileLike | undefined) ?? undefined,
      {
        name: brandProfile?.websiteUrl ?? project.title,
      },
    );

    const targets: PersonalizationTargetDTO[] = targetRows.map((target) => ({
      id: target.id,
      companyName: target.companyName ?? null,
      websiteUrl: target.websiteUrl,
      contactEmail: target.contactEmail ?? null,
      sector: target.sector ?? null,
      status: target.status,
      notes: target.notes ?? null,
      errorMessage: target.errorMessage ?? null,
      createdAt: target.createdAt?.toISOString?.() ?? new Date().toISOString(),
      extractedAt: target.extractedAt?.toISOString?.() ?? null,
      brandTheme: (target.brandTheme as BrandTheme | null) ?? null,
    }));

    return (
      <PersonalizePageClient
        project={{
          id: project.id,
          title: project.title,
          updatedAt: project.updatedAt?.toISOString(),
          sceneCount: scenes.length,
          approxDurationSeconds,
          format: projectProps?.meta?.format ?? null,
          isTokenized,
        }}
        brandTheme={brandTheme}
        targets={targets}
      />
    );
  } catch (error) {
    console.error("[personalize.page] Failed to load:", error);
    notFound();
  }
}
