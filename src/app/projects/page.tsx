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

  // If user has no projects, redirect to create a new one
  if (userProjects.length === 0) {
    redirect("/projects/new");
  }

  // If user has projects, redirect to the most recent one
  const mostRecentProject = userProjects[0]; // getUserProjects likely returns them sorted by creation date
  if (mostRecentProject?.id) {
    redirect(`/projects/${mostRecentProject.id}/generate`);
  }

  // Fallback - this shouldn't normally be reached
  redirect("/projects/new");
}