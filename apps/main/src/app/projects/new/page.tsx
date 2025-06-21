// src/app/projects/new/page.tsx
import { redirect } from "next/navigation";
import { auth } from "@bazaar/auth";
import { db } from "@bazaar/database";
import { projects } from "@bazaar/database";
import { eq, and, like } from "drizzle-orm";
import { analytics } from '~/lib/utils/analytics';
import { createDefaultProjectProps } from "~/lib/types/video/remotion-constants";

/**
 * Special route that automatically creates a new project and redirects to it
 * This allows direct navigation to /projects/new to work as expected
 * 
 * UNIFIED WITH tRPC ROUTE: Now uses same title generation, default props, and NO welcome message
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
      // Get a list of all "Untitled Video" projects with their numbers (UNIFIED NAMING)
      const userProjects = await db
        .select({ title: projects.title })
        .from(projects)
        .where(
          and(
            eq(projects.userId, session.user.id),
            like(projects.title, 'Untitled Video%')
          )
        );
      
      // Find the highest number used in "Untitled Video X" titles (UNIFIED LOGIC)
      let highestNumber = 0;
      for (const project of userProjects) {
        const match = /^Untitled Video (\d+)$/.exec(project.title);
        if (match?.[1]) {
          const num = parseInt(match[1], 10);
          if (!isNaN(num) && num > highestNumber) {
            highestNumber = num;
          }
        }
      }
      
      // Generate a unique title with the next available number, adjusted for retries (UNIFIED LOGIC)
      const nextNumberBasedOnAttempts = highestNumber + attempts;
      
      let titleToInsert = userProjects.length === 0 && highestNumber === 0 && attempts === 1
                          ? "Untitled Video"
                          : `Untitled Video ${nextNumberBasedOnAttempts}`;

      // If the generated title is "Untitled Video", explicitly check if it already exists (UNIFIED LOGIC)
      if (titleToInsert === "Untitled Video") {
        const existingBaseProject = await db
          .select({ id: projects.id })
          .from(projects)
          .where(and(eq(projects.userId, session.user.id), eq(projects.title, "Untitled Video")))
          .limit(1);
        
        if (existingBaseProject.length > 0) {
          // "Untitled Video" exists, force numbering based on attempts
          titleToInsert = `Untitled Video ${nextNumberBasedOnAttempts}`;
        }
      }

      const [insertedProjectAttempt] = await db
        .insert(projects)
        .values({
          userId: session.user.id,
          title: titleToInsert,
          props: createDefaultProjectProps(), // UNIFIED: Use same welcome video props as tRPC route
        })
        .returning();
      
      newProject = insertedProjectAttempt; // Success!

      // Track project creation analytics
      if (newProject) {
        analytics.projectCreated(newProject.id);
      }

      // NO WELCOME MESSAGE CREATION - Let UI show the nice default instead (UNIFIED)

    } catch (error: any) {
      // Check for PostgreSQL unique violation error (SQLSTATE 23505)
      if (error.code === '23505' || (error.message && (error.message.includes('violates unique constraint') || error.message.includes('duplicate key value')))) {
        console.warn(`Attempt ${attempts}: Failed to create project with title '${error.values?.title || 'unknown'}'. Retrying. Error: ${error.message}`);
        if (attempts >= MAX_ATTEMPTS) {
          console.error("Max attempts reached. Failed to create new project.");
          // Track error analytics
          analytics.errorOccurred('project_creation_failed', error instanceof Error ? error.message : 'Max attempts reached', '/projects/new');
          redirect("/projects?error=creation_failed_max_attempts");
          return null;
        }
      } else {
        // For other, unexpected errors, log and redirect
        console.error("Failed to create new project (non-unique constraint error):", error);
        // Track error analytics
        analytics.errorOccurred('project_creation_failed', error instanceof Error ? error.message : 'Unknown error', '/projects/new');
        redirect("/projects?error=unknown_creation_failure");
        return null;
      }
    }
  }

  if (newProject?.id) {
    // Redirect to the new project's generate page
    redirect(`/projects/${newProject.id}/generate`);
  } else {
    // Fallback to projects page if something went wrong
    console.error("Failed to create new project after multiple attempts or unexpected issue.");
    // Track error analytics
    analytics.errorOccurred('project_creation_failed', 'Fallback creation failure', '/projects/new');
    redirect("/projects?error=fallback_creation_failure");
  }

  // This should never be reached due to the redirects above,
  // but TypeScript requires a return value
  return null;
}
