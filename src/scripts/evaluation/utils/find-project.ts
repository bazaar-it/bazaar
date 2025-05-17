//src/scripts/evaluation/utils/find-project.ts
import { db } from "../../../server/db";
import { projects } from "../../../server/db/schema";
import { desc, eq } from "drizzle-orm";

/**
 * Find a valid project ID for testing
 * 
 * This integrates with the database directly to find an existing project
 * that can be used for component testing, similar to the find-project.js
 * script used in A2A testing.
 */
export async function findValidProjectId(): Promise<string | null> {
  try {
    // Find the most recently updated project
    const recentProjects = await db
      .select({
        id: projects.id,
        name: projects.name,
        userId: projects.userId,
        updatedAt: projects.updatedAt
      })
      .from(projects)
      .orderBy(desc(projects.updatedAt))
      .limit(1);
    
    if (recentProjects.length > 0) {
      const project = recentProjects[0];
      console.log(`Found recent project: ${project.name} (${project.id})`);
      return project.id;
    }
    
    // If no recent projects, find any project
    const anyProjects = await db
      .select({
        id: projects.id,
        name: projects.name
      })
      .from(projects)
      .limit(1);
    
    if (anyProjects.length > 0) {
      const project = anyProjects[0];
      console.log(`Found project: ${project.name} (${project.id})`);
      return project.id;
    }
    
    console.error("No projects found in database");
    return null;
  } catch (error) {
    console.error("Error finding valid project ID:", error);
    return null;
  }
}

// If this file is run directly
if (require.main === module) {
  findValidProjectId()
    .then(projectId => {
      if (projectId) {
        console.log(`Valid project ID for testing: ${projectId}`);
        process.exit(0);
      } else {
        console.error("Failed to find valid project ID");
        process.exit(1);
      }
    })
    .catch(error => {
      console.error("Error:", error);
      process.exit(1);
    });
}
