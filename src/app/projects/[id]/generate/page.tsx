//src/app/projects/[id]/generate/page.tsx
import { redirect, notFound } from "next/navigation";
import { auth } from "~/server/auth";
import { getUserProjects } from "~/server/queries/getUserProjects";
import { db } from "~/server/db";
import { projects, scenes } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import GenerateWorkspaceRoot from "./workspace/GenerateWorkspaceRoot";
import { analytics } from '~/lib/utils/analytics';
import type { InputProps } from '~/lib/types/video/input-props';

// Force dynamic rendering to prevent caching issues
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function GeneratePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id: projectId } = params;
  console.log('GeneratePage accessed with projectId:', projectId);
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!projectId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
    notFound();
  }

  try {
    console.log('Fetching project and user projects...');
    const [projectResult, userProjects] = await Promise.all([
      db.query.projects.findFirst({ where: eq(projects.id, projectId) }),
      getUserProjects(session.user.id),
    ]); 

    console.log('Project result:', projectResult ? 'found' : 'null');
    console.log('User projects count:', userProjects?.length || 0);

    if (!projectResult) {
      console.log('Project not found, calling notFound()');
      notFound();
    }

    if (projectResult.userId !== session.user.id) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50/30">
          <div className="text-center p-8 max-w-md bg-white/95 rounded-[15px] shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
            <p className="mb-4">You don't have permission to view this project.</p>
          </div>
        </div>
      );
    }

    // 🚨 CRITICAL FIX: Check for existing scenes FIRST to avoid welcome video override
    console.log('[GeneratePage] Checking for existing scenes in database...');
    const existingScenes = await db.query.scenes.findMany({
      where: eq(scenes.projectId, projectId),
      orderBy: [scenes.order],
    });
    console.log('[GeneratePage] Found scenes:', existingScenes.length, existingScenes.map(s => ({ id: s.id, name: s.name })));
    
    let actualInitialProps: InputProps;
    
    if (existingScenes.length > 0) {
      // ✅ HAS REAL SCENES: Convert database scenes to props format
      // console.log('[GeneratePage] Found', existingScenes.length, 'existing scenes, building props from database');
      
      let currentStart = 0;
      const convertedScenes = existingScenes.map((dbScene) => {
        const sceneDuration = dbScene.duration || 150; // Fallback to 5s
        const scene = {
          id: dbScene.id,
          type: 'custom' as const,
          start: currentStart,
          duration: sceneDuration,
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
          backgroundColor: projectResult.props?.meta?.backgroundColor || '#000000'
        },
        scenes: convertedScenes
      };
      
      // console.log('[GeneratePage] ✅ Built initial props from', convertedScenes.length, 'database scenes');
    } else {
      // ✅ NEW PROJECT: Use stored props (welcome video for new projects)
      // console.log('[GeneratePage] No existing scenes found, using stored project props (welcome video)');
      actualInitialProps = projectResult.props;
    }

    // Track project opening analytics
    analytics.projectOpened(projectId);

    return (
      <GenerateWorkspaceRoot
        projectId={projectId}
        initialProjects={userProjects.map(p => ({ id: p.id, name: p.title }))}
        initialProps={actualInitialProps}
      />
    );
  } catch (error) {
    console.error("Error loading project:", error);
    console.error("Error details:", error instanceof Error ? error.message : 'Unknown error');
    notFound();
  }
} 