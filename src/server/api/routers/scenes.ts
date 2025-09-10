//src/server/api/routers/scenes.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { eq, and, sql } from "drizzle-orm";
import { scenes, sceneIterations, messages, projects, sceneOperations } from "~/server/db/schema";
import { TRPCError } from "@trpc/server";
import { messageService } from "~/server/services/data/message.service";
import { formatManualEditMessage } from "~/lib/utils/scene-message-formatter";
import { extractDurationFromCode } from "~/server/services/code/duration-extractor";

// Helpers (module-scope): Not router entries. Avoid placing these inside createTRPCRouter.
// Inject a frame offset into TSX code so that frame 0 maps to original `offset`.
export const applyFrameOffset = (code: string, offset: number): string => {
  try {
    if (typeof code !== 'string' || code.length === 0) return code;
    if (!Number.isFinite(offset)) return code;
    const OFFSET = Math.max(0, Math.min(999999, Math.floor(offset)));
    if (OFFSET === 0) return code;

    // Case 1: const frame = useCurrentFrame()
    const reFrameDecl = /(const\s+frame\s*=\s*)useCurrentFrame\s*\(\s*\)\s*;?/;
    if (reFrameDecl.test(code)) {
      return code.replace(reFrameDecl, `$1(() => { const __f = useCurrentFrame(); return __f + ${OFFSET}; })()`);
    }

    // Case 2: direct calls useCurrentFrame() in expressions
    const reDirectCall = /useCurrentFrame\s*\(\s*\)/g;
    if (reDirectCall.test(code)) {
      return code.replace(reDirectCall, `(useCurrentFrame() + ${OFFSET})`);
    }

    // Case 3: if code uses variable `frame` elsewhere but not defined, inject one
    const usesFrame = /\bframe\b/.test(code);
    if (usesFrame) {
      // Prepend a safe header after any Remotion destructuring if present
      const header = `\n// Applied frame offset (auto)\nconst frame = (typeof useCurrentFrame === 'function' ? useCurrentFrame() : (window.Remotion?.useCurrentFrame?.() ?? 0)) + ${OFFSET};\n`;
      const remotionDecl = /const\s*\{[^}]*\}\s*=\s*window\.Remotion\s*;?/;
      if (remotionDecl.test(code)) {
        return code.replace(remotionDecl, (m) => `${m}${header}`);
      }
      return header + code;
    }

    // No known patterns; return original
    return code;
  } catch (err) {
    console.warn('[applyFrameOffset] Failed to apply frame offset:', err);
    return code;
  }
};

// Rename scene-specific suffix tokens to avoid duplicate declarations after split
const renameSceneSuffix = (code: string): { code: string; newSuffix?: string; oldSuffix?: string } => {
  try {
    if (!code) return { code };
    // Try to detect generator-style suffix used across identifiers
    const suffixMatch =
      code.match(/Scene_([a-z0-9]{4,})/i) ||
      code.match(/durationInFrames_([a-z0-9]{4,})/i) ||
      code.match(/script_([a-z0-9]{4,})/i) ||
      code.match(/sequences_([a-z0-9]{4,})/i);
    const oldSuffix = suffixMatch?.[1];
    if (!oldSuffix) return { code };

    // Generate a new random suffix different from old
    const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const rand = (n: number) => Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('');
    let newSuffix = rand(8);
    if (newSuffix === oldSuffix) newSuffix = rand(8);

    // Replace all occurrences of _<oldSuffix> with _<newSuffix>
    const re = new RegExp(`_${oldSuffix}\\b`, 'g');
    let replaced = code.replace(re, `_${newSuffix}`);
    // Also replace possible component names like export default Scene<Old> without underscore (safety)
    const reScene = new RegExp(`Scene${oldSuffix}\\b`, 'g');
    replaced = replaced.replace(reScene, `Scene${newSuffix}`);

    return { code: replaced, newSuffix, oldSuffix };
  } catch {
    return { code };
  }
};

export const scenesRouter = createTRPCRouter({
  duplicateScene: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      sceneId: z.string(),
      position: z.enum(['after', 'end']).optional().default('after'),
      name: z.string().optional(),
      clientRevision: z.number().optional(),
      idempotencyKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`[scenes.duplicateScene] Duplicating scene ${input.sceneId} (${input.position})`);

      // Verify source scene + ownership
      const src = await ctx.db.query.scenes.findFirst({
        where: and(eq(scenes.id, input.sceneId), eq(scenes.projectId, input.projectId)),
        with: { project: true },
      });
      if (!src) throw new Error('Scene not found');
      if (src.project.userId !== ctx.session.user.id) throw new Error("Unauthorized: You don't own this project");

      // Optional revision/idempotency checks
      if (input.clientRevision !== undefined) {
        const proj = await ctx.db.query.projects.findFirst({ where: eq(projects.id, input.projectId) });
        if (proj && proj.revision !== input.clientRevision) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Stale client revision' });
        }
      }
      if (input.idempotencyKey) {
        const existingOp = await ctx.db.query.sceneOperations.findFirst({
          where: and(eq(sceneOperations.projectId, input.projectId), eq(sceneOperations.idempotencyKey, input.idempotencyKey)),
        });
        if (existingOp) {
          const proj = await ctx.db.query.projects.findFirst({ where: eq(projects.id, input.projectId) });
          return { success: true, newScene: null, newRevision: proj?.revision } as any;
        }
      }

      // Compute insertion order
      let newOrder = src.order + 1;
      if (input.position === 'end') {
        const last = await ctx.db.query.scenes.findMany({
          where: eq(scenes.projectId, input.projectId),
          orderBy: (s, { asc }) => [asc(s.order)],
        });
        newOrder = (last[last.length - 1]?.order ?? -1) + 1;
      } else {
        // Shift scenes after src.order
        await ctx.db
          .update(scenes)
          .set({ order: sql`${scenes.order} + 1`, updatedAt: new Date() })
          .where(and(eq(scenes.projectId, input.projectId), sql`${scenes.order} > ${src.order}`));
      }

      // Name strategy
      const baseName = input.name?.trim() || src.name || 'Scene';
      const name = baseName.match(/\(Copy\)$/) ? baseName : `${baseName} (Copy)`;

      // Insert duplicate
      const [dup] = await ctx.db
        .insert(scenes)
        .values({
          projectId: input.projectId,
          order: newOrder,
          name,
          tsxCode: src.tsxCode,
          props: src.props,
          duration: src.duration,
          layoutJson: src.layoutJson,
          slug: src.slug,
          dominantColors: src.dominantColors as any,
          firstH1Text: src.firstH1Text,
        })
        .returning();

      await messageService.createMessage({
        projectId: input.projectId,
        content: `Duplicated scene "${src.name ?? 'Scene'}"`,
        role: 'assistant',
        kind: 'message',
        status: 'success',
      });

      const updatedProj = await ctx.db
        .update(projects)
        .set({ revision: sql`${projects.revision} + 1` })
        .where(eq(projects.id, input.projectId))
        .returning();

      if (input.idempotencyKey) {
        await ctx.db.insert(sceneOperations).values({
          projectId: input.projectId,
          idempotencyKey: input.idempotencyKey,
          operationType: 'duplicate',
          payload: { sceneId: input.sceneId, position: input.position },
          result: { newSceneId: dup?.id },
        });
      }

      console.log(`[scenes.duplicateScene] ✅ Duplicated ${src.id} -> ${dup?.id}`);
      return { success: true, newScene: dup, newRevision: updatedProj[0]?.revision };
    }),
  splitScene: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      sceneId: z.string(),
      frame: z.number().min(1), // split point in frames relative to scene start
      // minFrames is deprecated; left here for backward-compatibility but unused
      minFrames: z.number().min(1).optional(),
      clientRevision: z.number().optional(),
      idempotencyKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // No enforced minimum segment size beyond 1 frame
      console.log(`[scenes.splitScene] Splitting scene ${input.sceneId} at frame ${input.frame}`);

      // Verify scene + ownership
      const existingScene = await ctx.db.query.scenes.findFirst({
        where: and(eq(scenes.id, input.sceneId), eq(scenes.projectId, input.projectId)),
        with: { project: true },
      });

      if (!existingScene) {
        throw new Error("Scene not found");
      }
      if (existingScene.project.userId !== ctx.session.user.id) {
        throw new Error("Unauthorized: You don't own this project");
      }

      // Optional optimistic concurrency and idempotency
      if (input.clientRevision !== undefined) {
        const proj = await ctx.db.query.projects.findFirst({ where: eq(projects.id, input.projectId) });
        if (proj && proj.revision !== input.clientRevision) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Stale client revision' });
        }
      }
      if (input.idempotencyKey) {
        const existingOp = await ctx.db.query.sceneOperations.findFirst({
          where: and(eq(sceneOperations.projectId, input.projectId), eq(sceneOperations.idempotencyKey, input.idempotencyKey)),
        });
        if (existingOp) {
          const proj = await ctx.db.query.projects.findFirst({ where: eq(projects.id, input.projectId) });
          return { success: true, leftSceneId: undefined, rightSceneId: undefined, newRevision: proj?.revision } as any;
        }
      }

      const total = existingScene.duration;
      // Ensure both segments have at least 1 frame
      const splitAt = Math.max(1, Math.min(total - 1, Math.floor(input.frame)));
      const leftDuration = splitAt;
      const rightDuration = total - splitAt; // guaranteed >= 1

      // Bump order for scenes after this one
      await ctx.db
        .update(scenes)
        .set({ order: sql`${scenes.order} + 1`, updatedAt: new Date() })
        .where(and(eq(scenes.projectId, input.projectId), sql`${scenes.order} > ${existingScene.order}`));

      // Insert new right-hand scene after current
      // Render-range strategy: Do NOT mutate code for offset. Keep original code,
      // but store a startOffset prop and clamp via Sequence in Preview.
      // Still rename suffixes to prevent duplicate identifier collisions when both halves are rendered.
      const { code: renamedTsx } = renameSceneSuffix(existingScene.tsxCode);
      const mergedProps: any = {
        ...(existingScene.props as any),
        startOffset: splitAt,
      };

      // Smart name for right-hand part: increment existing (Part N) if present, else Part 2
      const nextPartName = (name: string | null): string => {
        const raw = name?.trim() || 'Scene';
        const m = raw.match(/^(.*)\s*\(Part\s+(\d+)\)\s*$/i);
        if (m) {
          const base = m[1].trim() || 'Scene';
          const n = Math.max(1, parseInt(m[2], 10)) + 1;
          return `${base} (Part ${n})`;
        }
        return `${raw} (Part 2)`;
      };

      const rightName = nextPartName(existingScene.name);

      const [newScene] = await ctx.db
        .insert(scenes)
        .values({
          projectId: input.projectId,
          order: existingScene.order + 1,
          name: rightName,
          tsxCode: renamedTsx,
          props: mergedProps,
          duration: rightDuration,
          layoutJson: existingScene.layoutJson,
          slug: existingScene.slug,
          dominantColors: existingScene.dominantColors as any,
          firstH1Text: existingScene.firstH1Text,
        })
        .returning();

      // Update original scene duration (left part)
      await ctx.db
        .update(scenes)
        .set({ duration: leftDuration, updatedAt: new Date() })
        .where(eq(scenes.id, existingScene.id));

      // Normalize orders 0..n-1 (belt-and-suspenders)
      const orderedAfterSplit = await ctx.db.query.scenes.findMany({
        where: eq(scenes.projectId, input.projectId),
      });
      orderedAfterSplit
        .sort((a: any, b: any) => ((a.order ?? 0) - (b.order ?? 0)) || (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
        .forEach(async (s, idx) => {
          await ctx.db.update(scenes).set({ order: idx, updatedAt: new Date() }).where(eq(scenes.id, s.id));
        });

      // Message
      await messageService.createMessage({
        projectId: input.projectId,
        content: `Split scene "${existingScene.name}" at ${splitAt} frames into parts (${leftDuration}f, ${rightDuration}f)`,
        role: 'assistant',
        kind: 'message',
        status: 'success',
      });

      // Increment project revision and record operation
      const updated = await ctx.db
        .update(projects)
        .set({ revision: sql`${projects.revision} + 1` })
        .where(eq(projects.id, input.projectId))
        .returning();

      if (input.idempotencyKey) {
        await ctx.db.insert(sceneOperations).values({
          projectId: input.projectId,
          idempotencyKey: input.idempotencyKey,
          operationType: 'split',
          payload: { sceneId: input.sceneId, frame: input.frame },
          result: { leftSceneId: existingScene.id, rightSceneId: newScene?.id },
        });
      }

      console.log(`[scenes.splitScene] ✅ Split complete: ${existingScene.id} -> ${newScene?.id}`);
      return { success: true, leftSceneId: existingScene.id, rightSceneId: newScene?.id, newRevision: updated[0]?.revision };
    }),
  reorderScenes: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      sceneIds: z.array(z.string()), // Array of scene IDs in new order
      clientRevision: z.number().optional(),
      idempotencyKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`[scenes.reorderScenes] Reordering scenes for project ${input.projectId}`);
      
      // Verify project ownership
      const projectScenes = await ctx.db.query.scenes.findMany({
        where: eq(scenes.projectId, input.projectId),
        with: {
          project: true
        }
      });

      if (!projectScenes.length) {
        throw new Error("No scenes found for this project");
      }

      const project = projectScenes[0]?.project;
      if (!project || project.userId !== ctx.session.user.id) {
        throw new Error("Unauthorized: You don't own this project");
      }

      // Verify all scene IDs belong to this project
      const existingSceneIds = new Set(projectScenes.map(s => s.id));
      const allScenesValid = input.sceneIds.every(id => existingSceneIds.has(id));
      
      if (!allScenesValid) {
        throw new Error("Invalid scene IDs provided");
      }

      // Optional revision/idempotency checks
      if (input.clientRevision !== undefined) {
        const proj = await ctx.db.query.projects.findFirst({ where: eq(projects.id, input.projectId) });
        if (proj && proj.revision !== input.clientRevision) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Stale client revision' });
        }
      }
      if (input.idempotencyKey) {
        const existingOp = await ctx.db.query.sceneOperations.findFirst({
          where: and(eq(sceneOperations.projectId, input.projectId), eq(sceneOperations.idempotencyKey, input.idempotencyKey)),
        });
        if (existingOp) {
          const proj = await ctx.db.query.projects.findFirst({ where: eq(projects.id, input.projectId) });
          return { success: true, message: 'Scenes reordered successfully', newRevision: proj?.revision };
        }
      }

      // Update the order field for each scene
      const updatePromises = input.sceneIds.map((sceneId, index) => 
        ctx.db
          .update(scenes)
          .set({
            order: index,
            updatedAt: new Date(),
          })
          .where(eq(scenes.id, sceneId))
      );

      await Promise.all(updatePromises);

      // Normalize orders 0..n-1 for safety
      const orderedAfterReorder = await ctx.db.query.scenes.findMany({
        where: eq(scenes.projectId, input.projectId),
      });
      orderedAfterReorder
        .sort((a: any, b: any) => ((a.order ?? 0) - (b.order ?? 0)) || (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
        .forEach(async (s, idx) => {
          await ctx.db.update(scenes).set({ order: idx, updatedAt: new Date() }).where(eq(scenes.id, s.id));
        });

      console.log(`[scenes.reorderScenes] ✅ Successfully reordered ${input.sceneIds.length} scenes`);
      
      // Create a message in chat for the reorder action
      const message = await messageService.createMessage({
        projectId: input.projectId,
        content: `Reordered scenes in timeline`,
        role: 'assistant',
        kind: 'message',
        status: 'success'
      });
      
      const updated = await ctx.db
        .update(projects)
        .set({ revision: sql`${projects.revision} + 1` })
        .where(eq(projects.id, input.projectId))
        .returning();

      if (input.idempotencyKey) {
        await ctx.db.insert(sceneOperations).values({
          projectId: input.projectId,
          idempotencyKey: input.idempotencyKey,
          operationType: 'reorder',
          payload: { sceneIds: input.sceneIds },
          result: {},
        });
      }

      return {
        success: true,
        message: 'Scenes reordered successfully',
        newRevision: updated[0]?.revision,
      };
    }),

  updateSceneCode: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      sceneId: z.string(),
      code: z.string(),
      // New: Only allow duration updates when explicitly requested
      overwriteDuration: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`[scenes.updateSceneCode] Updating scene ${input.sceneId} in project ${input.projectId}`);
      
      // Verify project ownership
      const existingScene = await ctx.db.query.scenes.findFirst({
        where: and(
          eq(scenes.id, input.sceneId),
          eq(scenes.projectId, input.projectId)
        ),
        with: {
          project: true
        }
      });

      if (!existingScene) {
        throw new Error("Scene not found");
      }

      if (existingScene.project.userId !== ctx.session.user.id) {
        throw new Error("Unauthorized: You don't own this project");
      }

      // Store the "before" code for tracking changes
      const codeBefore = existingScene.tsxCode;

      // Update scene code
      // Preserve manual trims by default: do NOT change duration unless explicitly requested
      const extracted = extractDurationFromCode(input.code);
      const updateFields: Record<string, any> = {
        tsxCode: input.code,
        updatedAt: new Date(),
      };
      if (input.overwriteDuration && extracted && extracted > 0) {
        updateFields.duration = extracted;
        console.log('[scenes.updateSceneCode] Overwriting duration from code on request', {
          sceneId: input.sceneId,
          extracted,
        });
      } else if (!input.overwriteDuration && extracted && extracted > 0) {
        console.log('[scenes.updateSceneCode] Duration found in code but NOT applied (overwriteDuration=false)', {
          sceneId: input.sceneId,
          extracted,
        });
      }

      const updatedScenes = await ctx.db
        .update(scenes)
        .set(updateFields)
        .where(eq(scenes.id, input.sceneId))
        .returning();

      // Create a descriptive message for the manual edit
      const sceneName = existingScene.name || `Scene ${existingScene.order + 1}`;
      const editMessage = formatManualEditMessage('code', sceneName);
      
      // Create message in chat
      const message = await messageService.createMessage({
        projectId: input.projectId,
        content: editMessage,
        role: 'assistant',
        kind: 'message',
        status: 'success'
      });

      // Track manual edit in scene iterations for version control, linked to the message
      await ctx.db.insert(sceneIterations).values({
        sceneId: input.sceneId,
        projectId: input.projectId,
        operationType: 'edit',
        editComplexity: 'manual', // Mark as manual edit
        userPrompt: 'Manual code edit via Code Editor',
        codeBefore: codeBefore,
        codeAfter: input.code,
        generationTimeMs: 0, // Instant for manual edits
        modelUsed: null,
        temperature: null,
        userEditedAgain: false,
        changeSource: 'user', // Mark as user-initiated change
        messageId: message?.id, // Link to the message for restore functionality
      });

      console.log(`[scenes.updateSceneCode] ✅ Scene code updated, message created, and tracked in iterations`);
      
      return {
        success: true,
        scene: updatedScenes[0]
      };
    }),

  updateSceneDuration: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      sceneId: z.string(),
      duration: z.number().min(1), // Allow very short clips; UI can enforce UX limits
      clientRevision: z.number().optional(),
      idempotencyKey: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      console.log(`[scenes.updateSceneDuration] Updating scene ${input.sceneId} duration to ${input.duration} frames`);
      
      // Verify project ownership
      const existingScene = await ctx.db.query.scenes.findFirst({
        where: and(
          eq(scenes.id, input.sceneId),
          eq(scenes.projectId, input.projectId)
        ),
        with: {
          project: true
        }
      });

      if (!existingScene) {
        throw new Error("Scene not found");
      }

      if (existingScene.project.userId !== ctx.session.user.id) {
        throw new Error("Unauthorized: You don't own this project");
      }

      if (input.clientRevision !== undefined) {
        const proj = await ctx.db.query.projects.findFirst({ where: eq(projects.id, input.projectId) });
        if (proj && proj.revision !== input.clientRevision) {
          throw new TRPCError({ code: 'CONFLICT', message: 'Stale client revision' });
        }
      }
      if (input.idempotencyKey) {
        const existingOp = await ctx.db.query.sceneOperations.findFirst({
          where: and(eq(sceneOperations.projectId, input.projectId), eq(sceneOperations.idempotencyKey, input.idempotencyKey)),
        });
        if (existingOp) {
          const proj = await ctx.db.query.projects.findFirst({ where: eq(projects.id, input.projectId) });
          return { success: true, scene: existingScene, newRevision: proj?.revision } as any;
        }
      }

      // Update scene duration
      const updatedScenes = await ctx.db
        .update(scenes)
        .set({
          duration: input.duration,
          updatedAt: new Date(),
        })
        .where(eq(scenes.id, input.sceneId))
        .returning();

      // Normalize orders 0..n-1 (defensive, even though duration change shouldn't affect order)
      const orderedAfterDuration = await ctx.db.query.scenes.findMany({
        where: eq(scenes.projectId, input.projectId),
      });
      orderedAfterDuration
        .sort((a: any, b: any) => ((a.order ?? 0) - (b.order ?? 0)) || (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()))
        .forEach(async (s, idx) => {
          await ctx.db.update(scenes).set({ order: idx, updatedAt: new Date() }).where(eq(scenes.id, s.id));
        });

      // Create a descriptive message for the duration change
      const sceneName = existingScene.name || `Scene ${existingScene.order + 1}`;
      const durationMessage = formatManualEditMessage('duration', sceneName, {
        previousDuration: existingScene.duration,
        newDuration: input.duration
      });
      
      // Create message in chat
      const message = await messageService.createMessage({
        projectId: input.projectId,
        content: durationMessage,
        role: 'assistant',
        kind: 'message',
        status: 'success'
      });

      // Track duration change in iterations
      await ctx.db.insert(sceneIterations).values({
        sceneId: input.sceneId,
        projectId: input.projectId,
        operationType: 'edit',
        editComplexity: 'duration', // Duration-only change
        userPrompt: `Duration changed from ${existingScene.duration} to ${input.duration} frames`,
        codeBefore: existingScene.tsxCode,
        codeAfter: existingScene.tsxCode, // Code doesn't change
        generationTimeMs: 0,
        modelUsed: null,
        temperature: null,
        userEditedAgain: false,
        changeSource: 'user', // User-initiated change
        messageId: message?.id, // Link to the message for restore functionality
      });

      const updatedProj = await ctx.db
        .update(projects)
        .set({ revision: sql`${projects.revision} + 1` })
        .where(eq(projects.id, input.projectId))
        .returning();

      if (input.idempotencyKey) {
        await ctx.db.insert(sceneOperations).values({
          projectId: input.projectId,
          idempotencyKey: input.idempotencyKey,
          operationType: 'updateDuration',
          payload: { sceneId: input.sceneId, duration: input.duration },
          result: {},
        });
      }

      console.log(`[scenes.updateSceneDuration] ✅ Scene duration updated, message created, and tracked`);
      
      return {
        success: true,
        scene: updatedScenes[0],
        newRevision: updatedProj[0]?.revision,
      };
    }),
});
