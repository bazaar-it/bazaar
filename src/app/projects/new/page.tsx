// src/app/projects/new/page.tsx
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { projects } from "~/server/db/schema";
import { eq, and, like } from "drizzle-orm";

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

  let newProject;
  
  try {
    // Get a list of all "New Project" projects with their numbers
    const userProjects = await db
      .select({ title: projects.title })
      .from(projects)
      .where(
        and(
          eq(projects.userId, session.user.id),
          like(projects.title, 'New Project%')
        )
      );
    
    // Find the highest number used in "New Project X" titles
    let highestNumber = 0;
    for (const project of userProjects) {
      const match = project.title.match(/^New Project (\d+)$/);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (!isNaN(num) && num > highestNumber) {
          highestNumber = num;
        }
      }
    }
    
    // Generate a unique title with the next available number
    const nextNumber = highestNumber + 1;
    const title = userProjects.length === 0 ? "New Project" : `New Project ${nextNumber}`;

    const [insertedProject] = await db
      .insert(projects)
      .values({
        userId: session.user.id,
        title: title,
        props: {
          meta: {
            duration: 10,
            title: title,
            backgroundColor: "#111",
          },
          scenes: [],
        },
      })
      .returning();
    
    newProject = insertedProject;
  } catch (error) {
    console.error("Failed to create new project:", error);
    // Redirect to the projects page on error
    redirect("/projects");
  }

  if (newProject?.id) {
    // Redirect to the new project's edit page - moved outside try/catch
    redirect(`/projects/${newProject.id}/edit`);
  } else {
    // Fallback to projects page if something went wrong
    redirect("/projects");
  }

  // This should never be reached due to the redirects above,
  // but TypeScript requires a return value
  return null;
}
