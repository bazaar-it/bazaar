//src/server/api/routers/generation/template-operations.ts
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { scenes, projects, templateUsages } from "~/server/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { messageService } from "~/server/services/data/message.service";
import { ResponseBuilder } from "~/lib/api/response-helpers";
import { generateTemplateSuffix } from "~/lib/utils/uniquifyTemplateCode";
import { sceneCompiler } from "~/server/services/compilation/scene-compiler.service";
import { randomUUID } from "crypto";


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
        where: and(eq(scenes.projectId, projectId), isNull(scenes.deletedAt)),
      });

      const sceneOrder = existingScenes.length;

      // 3. Generate unique suffix for this template instance
      const uniqueSuffix = generateTemplateSuffix();
      const sceneName = `${templateName}_${uniqueSuffix}`;

      // 4. Get template code
      const { templateCode } = input;
      
      console.log(`[${response.getRequestId()}] Using template with unique scene name suffix: ${uniqueSuffix}`);

      // 5. ALWAYS compile templates through sceneCompiler for conflict detection
      // This ensures duplicate templates get auto-namespaced components
      const newSceneId = randomUUID();
      const compilationResult = await sceneCompiler.compileScene(templateCode, {
        projectId,
        sceneId: newSceneId,
        existingScenes: existingScenes.map(s => ({ id: s.id, tsxCode: s.tsxCode, name: s.name }))
      });
      
      // Log if conflicts were auto-fixed
      if (compilationResult.conflicts && compilationResult.conflicts.length > 0) {
        console.log(`[${response.getRequestId()}] Auto-fixed ${compilationResult.conflicts.length} conflicts in template:`, 
          compilationResult.conflicts.map(c => `${c.originalName} → ${c.newName}`)
        );
      }
      
      // 6. Save template as a new scene with compiled JS
      console.log(`[${response.getRequestId()}] Saving template to database`, {
        name: sceneName,
        order: sceneOrder,
        duration: templateDuration,
        uniqueSuffix,
        hasCompiledJS: compilationResult.success,
      });

      const [newScene] = await db.insert(scenes).values({
        id: newSceneId,
        projectId,
        name: sceneName,
        tsxCode: compilationResult.tsxCode, // Use potentially auto-fixed code
        jsCode: compilationResult.jsCode,    // Always has a value (compiled or fallback)
        jsCompiledAt: compilationResult.compiledAt,
        compilationError: compilationResult.compilationError || null,
        compilationVersion: 1,
        compileMeta: compilationResult.metadata?.compile_meta || {
          timings: { ms: 0 },
          tool: 'scene-compiler-v1',
          timestamp: new Date().toISOString(),
        },
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

      // 7. Clear welcome flag if this is the first scene
      if (project.isWelcome && existingScenes.length === 0) {
        await db.update(projects)
          .set({ isWelcome: false })
          .where(eq(projects.id, projectId));
      }

      // 8. Track template usage for analytics
      // TODO: Uncomment when templateUsages table is created
      // await db.insert(templateUsages).values({
      //   templateId,
      //   userId,
      //   projectId,
      //   sceneId: newScene.id,
      // });

      // 9. Add chat message for context
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
