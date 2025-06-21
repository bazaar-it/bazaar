// src/app/projects/page.tsx
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@bazaar/auth";
import { getUserProjects } from "~/server/queries/getUserProjects";
import { NewProjectButton } from "~/components/client/NewProjectButton";

/**
 * Projects dashboard that lists all projects for the logged-in user
 * Redirects to last project if user has projects, or shows project creation if they have none
 */
export default async function ProjectsPage() {
  const session = await auth();
  
  if (!session?.user) {
    redirect("/login");
  }

  const userProjects = await getUserProjects(session.user.id);

  // If user has no projects, redirect to create a new one
  if (userProjects.length === 0) {
    redirect("/projects/new");
  }

  // If user has exactly one project, redirect to it
  if (userProjects.length === 1) {
    redirect(`/projects/${userProjects[0]!.id}/generate`);
  }

  // If user has multiple projects, redirect to the most recently updated one
  const mostRecentProject = userProjects
    .sort((a, b) => {
      const dateA = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const dateB = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return dateB - dateA;
    })[0];
  
  if (mostRecentProject) {
    redirect(`/projects/${mostRecentProject.id}/generate`);
  }

  // Fallback (should never reach here)
  redirect("/projects/new");
}