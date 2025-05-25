// src/app/projects/new/page.tsx
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { projects } from "~/server/db/schema";
import { eq, and, like } from "drizzle-orm";
import { analytics } from '~/lib/analytics';

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
  let attempts = 0;
  const MAX_ATTEMPTS = 5; // Prevent infinite loops

  while (!newProject && attempts < MAX_ATTEMPTS) {
    attempts++;
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
        const match = /^New Project (\d+)$/.exec(project.title);
        if (match?.[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > highestNumber) {
            highestNumber = num;
          }
        }
      }
      
      // Generate a unique title with the next available number, adjusted for retries
      const nextNumberBasedOnAttempts = highestNumber + attempts;
      
      let titleToInsert = userProjects.length === 0 && highestNumber === 0 && attempts === 1
                          ? "New Project"
                          : `New Project ${nextNumberBasedOnAttempts}`;

      // If the generated title is "New Project", explicitly check if it already exists.
      // If it does, force a numbered title to avoid collision if numbering should have started.
      if (titleToInsert === "New Project") {
        const existingBaseNewProject = await db
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.userId, session.user.id), eq(projects.title, "New Project")))
          .limit(1);
        
        if (existingBaseNewProject.length > 0) {
          // "New Project" exists, and we might be in a situation where it's the only one
          // or highestNumber was 0. Force numbering based on attempts.
          titleToInsert = `New Project ${nextNumberBasedOnAttempts}`;
        }
      }

      const [insertedProjectAttempt] = await db
        .insert(projects)
        .values({
          userId: session.user.id,
          title: titleToInsert,
          props: {
            meta: {
              duration: 10,
              title: titleToInsert, // Ensure this uses the title being inserted
              backgroundColor: "#111",
            },
            scenes: [],
          },
        })
        .returning();
      
      newProject = insertedProjectAttempt; // Success!

      // Track project creation analytics
      if (newProject) {
        analytics.projectCreated(newProject.id);
      }

    } catch (error: any) {
      // Check for PostgreSQL unique violation error (SQLSTATE 23505)
      if (error.code === '23505' || (error.message && (error.message.includes('violates unique constraint') || error.message.includes('duplicate key value')))) {
        console.warn(`Attempt ${attempts}: Failed to create project with title '${error.values?.title || 'unknown'}'. Retrying. Error: ${error.message}`);
        if (attempts >= MAX_ATTEMPTS) {
          console.error("Max attempts reached. Failed to create new project.");
          // Track error analytics
          analytics.errorOccurred('project_creation_failed', error instanceof Error ? error.message : 'Max attempts reached', '/projects/new');
          // Optionally, redirect to a specific error page or add a query param
          redirect("/projects?error=creation_failed_max_attempts");
          return null; // Exit loop and function
        }
        // Loop will continue for another attempt
      } else {
        // For other, unexpected errors, log and redirect
        console.error("Failed to create new project (non-unique constraint error):", error);
        // Track error analytics
        analytics.errorOccurred('project_creation_failed', error instanceof Error ? error.message : 'Unknown error', '/projects/new');
        redirect("/projects?error=unknown_creation_failure");
        return null; // Exit loop and function
      }
    }
  }

  if (newProject?.id) {
    // Redirect to the new project's generate page
    redirect(`/projects/${newProject.id}/generate`);
  } else {
    // Fallback to projects page if something went wrong (e.g., max attempts reached without success)
    // This path should ideally be covered by the redirect within the catch block for MAX_ATTEMPTS
    console.error("Failed to create new project after multiple attempts or unexpected issue.");
    // Track error analytics
    analytics.errorOccurred('project_creation_failed', 'Fallback creation failure', '/projects/new');
    redirect("/projects?error=fallback_creation_failure");
  }

  // This should never be reached due to the redirects above,
  // but TypeScript requires a return value
  return null;
}
