//src/app/projects/[id]/generate/page.tsx
import { redirect, notFound } from "next/navigation";
import { auth } from "~/server/auth";
import { getUserProjects } from "~/server/queries/getUserProjects";
import GenerateWorkspaceRoot from "./workspace/GenerateWorkspaceRoot";
import { analytics } from '~/lib/utils/analytics';
import type { InputProps } from '~/lib/types/video/input-props';
import { api } from "~/trpc/server";

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GeneratePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id: projectId } = params;
  // console.log('GeneratePage accessed with rojectId:', projectId);
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!projectId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
    notFound();
  }

  try {
    // Use consolidated query to fetch everything in parallel
    const [fullProjectData, userProjects] = await Promise.all([
      api.project.getFullProject({ id: projectId }),
      getUserProjects(session.user.id),
    ]);

    if (!fullProjectData) {
      notFound();
    }

    const { project: projectResult, scenes: existingScenes, audio } = fullProjectData;
    
    let actualInitialProps: InputProps;
    
    if (existingScenes.length > 0) {
      // ✅ HAS REAL SCENES: Convert database scenes to props format
      let currentStart = 0;
      const convertedScenes = existingScenes
        .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
        .map((dbScene) => {
        const sceneDuration = dbScene.duration || 150; // Fallback to 5s
        const scene = {
          id: dbScene.id,
          type: 'custom' as const,
          start: currentStart,
          duration: sceneDuration,
          order: dbScene.order ?? 0,
          revision: dbScene.revision ?? 1,
          data: {
            code: dbScene.tsxCode,
            name: dbScene.name,
            componentId: dbScene.id,
            props: dbScene.props || {}
          }
        };
        currentStart += sceneDuration;
        return scene;
      });
      
      actualInitialProps = {
        meta: {
          title: projectResult.title,
          duration: currentStart,
          backgroundColor: projectResult.props?.meta?.backgroundColor || '#000000',
          format: projectResult.props?.meta?.format || 'landscape',
          width: projectResult.props?.meta?.width || 1920,
          height: projectResult.props?.meta?.height || 1080
        },
        scenes: convertedScenes
      };
    } else {
      // ✅ NEW PROJECT: Use stored props (welcome video for new projects)
      actualInitialProps = projectResult.props;
    }

    // Track project opening analytics
    analytics.projectOpened(projectId);

    return (
      <GenerateWorkspaceRoot
        projectId={projectId}
        userId={session.user.id}
        initialProjects={userProjects.map(p => ({ id: p.id, name: p.title }))}
        initialProps={actualInitialProps}
        initialAudio={audio}
        initialRevision={projectResult.revision ?? 1}
      />
    );
  } catch (error) {
    console.error("Error loading project:", error);
    console.error("Error details:", error instanceof Error ? error.message : 'Unknown error');
    notFound();
  }
} 
