// src/app/projects/[id]/edit/page.tsx
import { redirect, notFound } from "next/navigation";
import { auth } from "~/server/auth";
import { getUserProjects } from "~/server/queries/getUserProjects";
import { db } from "~/server/db";
import { projects } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import ProjectEditorRoot from "./ProjectEditorRoot";

export default async function Page({ params }: { params: { id: string } }) {
  const { id: projectId } = await params;

  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (!projectId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId)) {
    notFound();
  }

  try {
    const [projectResult, userProjects] = await Promise.all([
      db.query.projects.findFirst({ where: eq(projects.id, projectId) }),
      getUserProjects(session.user.id),
    ]); 

    if (!projectResult) {
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

    return (
      <ProjectEditorRoot
        projectId={projectId}
        initialProjects={userProjects.map(p => ({ id: p.id, name: p.title }))}
        initialProps={projectResult.props}
      />
    );
  } catch (error) {
    console.error("Error loading project:", error);
    notFound();
  }
}