//src/server/api/routers/generation/template-operations.ts
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { scenes, projects, templateUsages } from "~/server/db/schema";
import { eq, and } from "drizzle-orm";
import { messageService } from "~/server/services/data/message.service";
import { ResponseBuilder } from "~/lib/api/response-helpers";
import { uniquifyTemplateCode, generateTemplateSuffix } from "~/lib/utils/uniquifyTemplateCode";


/**
 * ADD TEMPLATE - Add a pre-made template as a new scene
 */
export const addTemplate = protectedProcedure
  .input(z.object({
    projectId: z.string(),
    templateId: z.string(),
    templateName: z.string(),
    templateCode: z.string(),
    templateDuration: z.number(),
  }))
  .mutation(async ({ input, ctx }) => {
    const response = new ResponseBuilder();
    const { projectId, templateId, templateName, templateDuration } = input;
    const userId = ctx.session.user.id;

    console.log(`[${response.getRequestId()}] Adding template`, { projectId, templateId, templateName });

    try {
      // 1. Verify project ownership
      const project = await db.query.projects.findFirst({
        where: and(
          eq(projects.id, projectId),
          eq(projects.userId, userId)
        ),
      });

      if (!project) {
        return {
          success: false,
          message: "Project not found or access denied",
        };
      }

      // 2. Get current scene count for order
      const existingScenes = await db.query.scenes.findMany({
        where: eq(scenes.projectId, projectId),
      });

      const sceneOrder = existingScenes.length;

      // 3. Generate unique suffix for this template instance
      const uniqueSuffix = generateTemplateSuffix();
      const sceneName = `${templateName}_${uniqueSuffix}`;

      // 4. Apply comprehensive uniquification to prevent all conflicts
      const { templateCode } = input;
      const uniqueTemplateCode = uniquifyTemplateCode(templateCode, uniqueSuffix);
      
      console.log(`[${response.getRequestId()}] Applied comprehensive uniquification with suffix: ${uniqueSuffix}`);

      // 5. Save template as a new scene
      console.log(`[${response.getRequestId()}] Saving template to database`, {
        name: sceneName,
        order: sceneOrder,
        duration: templateDuration,
        uniqueSuffix,
      });

      const [newScene] = await db.insert(scenes).values({
        projectId,
        name: sceneName,
        tsxCode: uniqueTemplateCode,
        duration: templateDuration,
        order: sceneOrder,
        props: {},
        layoutJson: null,
      }).returning();

      if (!newScene) {
        return {
          success: false,
          message: "Failed to save template to database",
        };
      }

      console.log(`[${response.getRequestId()}] Template saved successfully`, {
        sceneId: newScene.id,
        name: newScene.name,
        uniqueSuffix,
      });

      // 6. Clear welcome flag if this is the first scene
      if (project.isWelcome && existingScenes.length === 0) {
        await db.update(projects)
          .set({ isWelcome: false })
          .where(eq(projects.id, projectId));
      }

      // 7. Track template usage for analytics
      // TODO: Uncomment when templateUsages table is created
      // await db.insert(templateUsages).values({
      //   templateId,
      //   userId,
      //   projectId,
      //   sceneId: newScene.id,
      // });

      // 8. Add chat message for context
      await messageService.createMessage({
        projectId,
        content: `Added ${templateName} template to scene ${sceneOrder + 1}`,
        role: "assistant",
      });

      return {
        success: true,
        message: "",
        scene: newScene as any, // Cast to avoid props type issue
      };

    } catch (error) {
      console.error(`[${response.getRequestId()}] Template addition error:`, error);
      
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to add template',
      };
    }
  });