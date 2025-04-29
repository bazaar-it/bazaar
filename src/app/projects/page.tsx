// src/app/projects/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { getUserProjects } from "~/server/queries/getUserProjects";
import { NewProjectButton } from "~/components/client/NewProjectButton";

/**
 * Projects dashboard that lists all projects for the logged-in user
 * This is now a fallback view for users with no projects or when direct access is needed
 */
export default async function ProjectsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  const userProjects = await getUserProjects(session.user.id);

  // If there are projects, redirect to the most recently updated one
  const latestProject = userProjects[0];
  if (latestProject?.id) {
    redirect(`/projects/${latestProject.id}/edit`);
  }

  // Otherwise, show the empty state with project creation
  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-8">Welcome to Bazaar-Vid</h1>
      
      <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-md mb-8">
        <p>You don't have any projects yet.</p>
        <p className="mt-2">
          Click the button below to create your first project.
        </p>
      </div>
      
      <NewProjectButton />
    </div>
  );
}