// src/server/queries/getUserProjects.ts
import { db } from "@bazaar/database";
import { projects } from "@bazaar/database";
import { eq, desc } from "drizzle-orm";
import type { Project } from "~/lib/types/database/project";

/**
 * Fetches all projects for a given user ID, sorted by most recently updated
 */
export async function getUserProjects(userId: string): Promise<Project[]> {
  return await db
    .select({
      id: projects.id,
      title: projects.title,
      updatedAt: projects.updatedAt,
      userId: projects.userId,
    })
    .from(projects)
    .where(eq(projects.userId, userId))
    .orderBy(desc(projects.updatedAt));
} 