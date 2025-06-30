// src/app/projects/new/page.tsx
import { redirect } from "next/navigation";
import { auth } from "~/server/auth";
import { db } from "~/server/db";
import { projects, users } from "~/server/db/schema";
import { eq, and, like, desc } from "drizzle-orm";
import { analytics } from '~/lib/utils/analytics';
import { createDefaultProjectProps } from "~/lib/types/video/remotion-constants";

/**
 * IDEMPOTENT route that ensures users have a project
 * - If user has existing projects, redirect to most recent
 * - If user has no projects, create ONE
 * This prevents duplicate creation during race conditions
 * 
 * UNIFIED WITH tRPC ROUTE: Now uses same title generation, default props, and NO welcome message
 */
export default async function NewProjectPage() {
  const session = await auth();
  
  // Redirect to login if not authenticated
  if (!session?.user) {
    redirect("/login");
  }

  // CRITICAL: Ensure user exists in database before creating projects
  // This handles race conditions where auth session exists but user record doesn't
  const existingUser = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (existingUser.length === 0) {
    console.error(`[NewProjectPage] User ${session.user.id} not found in database!`);
    console.log(`[NewProjectPage] Creating user record for ${session.user.email}`);
    
    // Create the user record
    try {
      await db.insert(users).values({
        id: session.user.id,
        email: session.user.email!,
        name: session.user.name || session.user.email?.split('@')[0],
        emailVerified: new Date(), // Mark as verified since they're authenticated
      });
      console.log(`[NewProjectPage] User record created successfully`);
    } catch (error) {
      console.error(`[NewProjectPage] Failed to create user:`, error);
      // If user creation fails (e.g., race condition where another request created it)
      // continue anyway as the user might exist now
    }
  }

  // FAST PATH: Check if user has ANY project (limit 1 for speed)
  const mostRecentProject = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.userId, session.user.id))
    .orderBy(desc(projects.updatedAt))
    .limit(1);

  // If user has at least one project, redirect to it immediately
  if (mostRecentProject.length > 0) {
    console.log(`[NewProjectPage] Fast path: User has projects, redirecting to: ${mostRecentProject[0]!.id}`);
    redirect(`/projects/${mostRecentProject[0]!.id}/generate`);
  }

  // User has no projects, proceed with creation

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
      console.log(`[NewProjectPage] Created new project: ${newProject!.id} with title: ${titleToInsert}`);

      // Track project creation analytics
      if (newProject) {
        analytics.projectCreated(newProject.id);
      }

      // NO WELCOME MESSAGE CREATION - Let UI show the nice default instead (UNIFIED)

    } catch (error: any) {
      console.error(`[NewProjectPage] Creation attempt ${attempts} failed:`, error);
      
      // RACE CONDITION CHECK: Another request might have created a project
      // Check again if user now has projects
      const checkAgain = await db
        .select()
        .from(projects)
        .where(eq(projects.userId, session.user.id))
        .orderBy(projects.updatedAt);
      
      if (checkAgain.length > 0) {
        // A project was created by another request!
        const mostRecent = checkAgain[checkAgain.length - 1];
        console.log(`[NewProjectPage] Race condition detected - found project created by another request: ${mostRecent!.id}`);
        redirect(`/projects/${mostRecent!.id}/generate`);
      }
      
      // Check for PostgreSQL unique violation error (SQLSTATE 23505)
      if (error.code === '23505' || (error.message && (error.message.includes('violates unique constraint') || error.message.includes('duplicate key value')))) {
        console.warn(`Attempt ${attempts}: Failed to create project with title '${error.values?.title || 'unknown'}'. Retrying. Error: ${error.message}`);
        if (attempts >= MAX_ATTEMPTS) {
          console.error("Max attempts reached. Failed to create new project.");
          // Final check before giving up
          const finalCheck = await db
            .select()
            .from(projects)
            .where(eq(projects.userId, session.user.id))
            .orderBy(projects.updatedAt);
          
          if (finalCheck.length > 0) {
            const mostRecent = finalCheck[finalCheck.length - 1];
            console.log(`[NewProjectPage] Final check found existing project: ${mostRecent!.id}`);
            redirect(`/projects/${mostRecent!.id}/generate`);
          }
          
          // Track error analytics
          analytics.errorOccurred('project_creation_failed', error instanceof Error ? error.message : 'Max attempts reached', '/projects/new');
          // Redirect to landing page instead of non-existent /projects
          redirect("/?error=creation_failed");
          return null;
        }
      } else {
        // For other, unexpected errors, log and redirect
        console.error("Failed to create new project (non-unique constraint error):", error);
        // Track error analytics
        analytics.errorOccurred('project_creation_failed', error instanceof Error ? error.message : 'Unknown error', '/projects/new');
        // Redirect to landing page instead of non-existent /projects
        redirect("/?error=creation_failed");
        return null;
      }
    }
  }

  if (newProject?.id) {
    // Redirect to the new project's generate page
    redirect(`/projects/${newProject.id}/generate`);
  } else {
    // One final check before giving up completely
    const finalCheck = await db
      .select()
      .from(projects)
      .where(eq(projects.userId, session.user.id))
      .orderBy(projects.updatedAt);
    
    if (finalCheck.length > 0) {
      const mostRecent = finalCheck[finalCheck.length - 1];
      console.log(`[NewProjectPage] Final fallback check found existing project: ${mostRecent!.id}`);
      redirect(`/projects/${mostRecent!.id}/generate`);
    }
    
    // Fallback to landing page if something went wrong
    console.error("Failed to create new project after multiple attempts or unexpected issue.");
    // Track error analytics
    analytics.errorOccurred('project_creation_failed', 'Fallback creation failure', '/projects/new');
    redirect("/?error=creation_failed");
  }

  // This should never be reached due to the redirects above,
  // but TypeScript requires a return value
  return null;
}
