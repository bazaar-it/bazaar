import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { scenes, projects } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * GET PROJECT SCENES - Query all scenes for a project
 */
export const getProjectScenes = protectedProcedure
  .input(z.object({
    projectId: z.string(),
  }))
  .query(async ({ input, ctx }) => {
    const { projectId } = input;
    const userId = ctx.session.user.id;

    // Verify project access: owners or admins can access
    let project = await db.query.projects.findFirst({
      where: and(
        eq(projects.id, projectId),
        eq(projects.userId, userId)
      ),
    });

    if (!project && ctx.session.user.isAdmin) {
      project = await db.query.projects.findFirst({
        where: eq(projects.id, projectId),
      });
    }

    if (!project) {
      throw new Error("Project not found or access denied");
    }

    // Get scenes
    const projectScenes = await db.query.scenes.findMany({
      where: eq(scenes.projectId, projectId),
      orderBy: [scenes.order],
    });

    // Debug: Log if jsCode is present
    console.log('[getProjectScenes] First scene jsCode status:', {
      sceneId: projectScenes[0]?.id,
      hasJsCode: !!projectScenes[0]?.jsCode,
      jsCodeLength: projectScenes[0]?.jsCode?.length,
    });

    return projectScenes;
  });

