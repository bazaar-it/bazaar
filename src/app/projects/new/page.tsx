// src/app/projects/new/page.tsx
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { projects } from "~/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * Special route that automatically creates a new project and redirects to it
 * This allows direct navigation to /projects/new to work as expected
 */
export default async function NewProjectPage() {
  const session = await auth();
  
  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  // Create a new project in the database
  try {
    const [newProject] = await db
      .insert(projects)
      .values({
        userId: session.user.id,
        title: "New Project",
        props: {
          meta: {
            duration: 10,
            title: "New Project",
            backgroundColor: "#111",
          },
          scenes: [],
        },
      })
      .returning();

    if (newProject?.id) {
      // Redirect to the new project's edit page
      redirect(`/projects/${newProject.id}/edit`);
    } else {
      // Fallback to projects page if something went wrong
      redirect("/projects");
    }
  } catch (error) {
    console.error("Failed to create new project:", error);
    // Redirect to the projects page on error
    redirect("/projects");
  }

  // This should never be reached due to the redirects above,
  // but TypeScript requires a return value
  return null;
}
