//src/server/api/routers/generation/template-operations.ts
import { z } from "zod";
import { protectedProcedure } from "~/server/api/trpc";
import { db } from "~/server/db";
import { scenes, projects, templates, templateScenes, templateUsages } from "~/server/db/schema";
import { eq, and, asc, isNull } from "drizzle-orm";
import { messageService } from "~/server/services/data/message.service";
import { ResponseBuilder } from "~/lib/api/response-helpers";
import { generateTemplateSuffix } from "~/lib/utils/uniquifyTemplateCode";
import { sceneCompiler } from "~/server/services/compilation/scene-compiler.service";
import { randomUUID } from "crypto";

const UUID_REGEX = /^(?:[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})$/;

interface TemplateScenePayload {
  name: string;
  duration: number;
  tsxCode: string;
}

/**
 * ADD TEMPLATE - Add a pre-made template as one or many scenes
 */
export const addTemplate = protectedProcedure
  .input(z.object({
    projectId: z.string(),
    templateId: z.string(),
    templateName: z.string(),
    templateCode: z.string().optional(),
    templateDuration: z.number().optional(),
  }))
  .mutation(async ({ input, ctx }) => {
    const response = new ResponseBuilder();
    const { projectId, templateId, templateName, templateCode, templateDuration } = input;
    const userId = ctx.session.user.id;

    console.log(`[${response.getRequestId()}] Adding template`, { projectId, templateId, templateName });

    try {
      // 1. Verify project ownership
      const project = await db.query.projects.findFirst({
        where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
      });

      if (!project) {
        return {
          success: false,
          message: "Project not found or access denied",
        } as const;
      }

      // 2. Fetch existing scenes for compilation context
      const existingScenes = await db.query.scenes.findMany({
        where: and(eq(scenes.projectId, projectId), isNull(scenes.deletedAt)),
        columns: {
          id: true,
          name: true,
          tsxCode: true,
          order: true,
        },
        orderBy: asc(scenes.order),
      });

      const compileContext = existingScenes.map((scene) => ({
        id: scene.id,
        tsxCode: scene.tsxCode,
        name: scene.name,
      }));

      // 3. Resolve template payload (database multi-scene vs inline single scene)
      let resolvedTemplateName = templateName;
      let trackedTemplateId: string | null = null;
      let scenesToApply: TemplateScenePayload[] = [];

      if (UUID_REGEX.test(templateId)) {
        const dbTemplate = await db.query.templates.findFirst({
          where: eq(templates.id, templateId),
          columns: {
            id: true,
            name: true,
            duration: true,
            tsxCode: true,
            sceneCount: true,
            adminOnly: true,
          },
        });

        if (dbTemplate) {
          if (dbTemplate.adminOnly && !ctx.session.user.isAdmin) {
            return {
              success: false,
              message: "Template requires admin access",
            } as const;
          }
          trackedTemplateId = dbTemplate.id;
          resolvedTemplateName = dbTemplate.name;

          if ((dbTemplate.sceneCount ?? 1) > 1) {
            const childScenes = await db.query.templateScenes.findMany({
              where: eq(templateScenes.templateId, dbTemplate.id),
              columns: {
                name: true,
                duration: true,
                tsxCode: true,
              },
              orderBy: asc(templateScenes.order),
            });

            if (childScenes.length === 0) {
              return {
                success: false,
                message: "Template scenes missing",
              } as const;
            }

            scenesToApply = childScenes.map((scene, index) => ({
              name: scene.name ?? `${dbTemplate.name} Scene ${index + 1}`,
              duration: scene.duration ?? dbTemplate.duration,
              tsxCode: scene.tsxCode,
            }));
          } else {
            scenesToApply = [
              {
                name: dbTemplate.name,
                duration: dbTemplate.duration ?? templateDuration ?? 150,
                tsxCode: dbTemplate.tsxCode,
              },
            ];
          }
        }
      }

      if (scenesToApply.length === 0) {
        if (!templateCode) {
          return {
            success: false,
            message: "Template code missing for non-database template",
          } as const;
        }

        scenesToApply = [
          {
            name: templateName,
            duration: templateDuration ?? 150,
            tsxCode: templateCode,
          },
        ];
      }

      // 4. Compile and persist scenes sequentially
      const uniqueSuffix = generateTemplateSuffix();
      const createdScenes: typeof scenes.$inferSelect[] = [];
      let orderCursor = existingScenes.length;

      for (let index = 0; index < scenesToApply.length; index++) {
        const templateScene = scenesToApply[index];
        const baseName = templateScene.name || `${resolvedTemplateName} Scene ${index + 1}`;
        const sceneName = `${baseName}_${uniqueSuffix}`;
        const newSceneId = randomUUID();

        const compilationResult = await sceneCompiler.compileScene(templateScene.tsxCode, {
          projectId,
          sceneId: newSceneId,
          existingScenes: compileContext,
        });

        if (compilationResult.conflicts?.length) {
          console.log(
            `[${response.getRequestId()}] Auto-fixed ${compilationResult.conflicts.length} conflicts in template scene`,
            compilationResult.conflicts.map((c) => `${c.originalName} → ${c.newName}`)
          );
        }

        const [newScene] = await db
          .insert(scenes)
          .values({
            id: newSceneId,
            projectId,
            name: sceneName,
            tsxCode: compilationResult.tsxCode,
            jsCode: compilationResult.jsCode,
            jsCompiledAt: compilationResult.compiledAt,
            compilationError: compilationResult.compilationError ?? null,
            compilationVersion: 1,
            compileMeta:
              compilationResult.metadata?.compile_meta ?? {
                timings: { ms: 0 },
                tool: "scene-compiler-v1",
                timestamp: new Date().toISOString(),
              },
            duration: templateScene.duration ?? 150,
            order: orderCursor,
            props: {},
            layoutJson: null,
          })
          .returning();

        if (!newScene) {
          return {
            success: false,
            message: "Failed to save template scene",
          } as const;
        }

        createdScenes.push(newScene);
        orderCursor += 1;
        compileContext.push({ id: newScene.id, tsxCode: newScene.tsxCode, name: newScene.name });
      }

      // 5. Clear welcome flag if this is the first real scene batch
      if (project.isWelcome && existingScenes.length === 0) {
        await db
          .update(projects)
          .set({ isWelcome: false })
          .where(eq(projects.id, projectId));
      }

      // 6. Track template usage (kept quiet if insert fails)
      if (trackedTemplateId && createdScenes.length > 0) {
        try {
          await db.insert(templateUsages).values({
            templateId: trackedTemplateId,
            userId,
            projectId,
            sceneId: createdScenes[0].id,
          });
        } catch (err) {
          console.warn(
            `[${response.getRequestId()}] Failed to record template usage for ${trackedTemplateId}:`,
            err instanceof Error ? err.message : err
          );
        }
      }

      // 7. Add chat message for context
      const messageSuffix = scenesToApply.length > 1 ? `${scenesToApply.length} scenes` : "1 scene";
      await messageService.createMessage({
        projectId,
        content: `Added ${resolvedTemplateName} template (${messageSuffix})`,
        role: "assistant",
      });

      return {
        success: true,
        message: "",
        scenes: createdScenes,
        scene: createdScenes[0] ?? null,
      } as const;
    } catch (error) {
      console.error(`[${response.getRequestId()}] Template addition error:`, error);

      return {
        success: false,
        message: error instanceof Error ? error.message : "Failed to add template",
      } as const;
    }
  });
