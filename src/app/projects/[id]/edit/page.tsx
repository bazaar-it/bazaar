import { notFound } from "next/navigation";
import { ChatInterface } from "~/components/client/ChatInterface";
import { PlayerShell } from "~/components/client/PlayerShell";
import { db } from "~/server/db";
import { projects } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "~/server/auth";

/**
 * Project Edit Page
 * Server Component that fetches project data and hydrates the client components
 */
export default async function ProjectEditPage({
  params,
}: {
  params: { id: string };
}) {
  // Get session to check auth and user ID
  const session = await auth();
  
  if (!session?.user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="mb-4">You need to be signed in to view this project.</p>
        </div>
      </div>
    );
  }

  // Fetch project by ID
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, params.id));

  // Handle not found
  if (!project) {
    notFound();
  }

  // Ensure the user has access to this project
  if (project.userId !== session.user.id) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-2xl font-bold mb-4">Access Denied</h2>
          <p className="mb-4">You don't have permission to view this project.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid h-screen gap-px bg-border grid-cols-1 md:grid-cols-3">
      {/* Chat panel — 1/3 on md+ */}
      <section className="md:col-span-1 h-full overflow-hidden bg-background p-4">
        <ChatInterface projectId={project.id} />
      </section>

      {/* Preview panel — 2/3 on md+ */}
      <section className="md:col-span-2 h-full overflow-hidden bg-muted p-4">
        <PlayerShell 
          projectId={project.id} 
          initial={project.props}
        />
      </section>
    </div>
  );
} 