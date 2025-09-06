//src/server/api/routers/scenes.ts
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { eq, and, sql } from "drizzle-orm";
import { scenes, sceneIterations, messages } from "~/server/db/schema";
import { messageService } from "~/server/services/data/message.service";
import { formatManualEditMessage } from "~/lib/utils/scene-message-formatter";
import { extractDurationFromCode } from "~/server/services/code/duration-extractor";
import { compileSceneToJS } from "~/server/utils/compile-scene";

// Helpers (module-scope): Not router entries. Avoid placing these inside createTRPCRouter.
// Inject a frame offset into TSX code so that frame 0 maps to original `offset`.
const applyFrameOffset = (code: string, offset: number): string => {
  try {
    if (!code || offset === 0) return code;
    const OFFSET = Math.max(0, Math.floor(offset));

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
    const hasRemotionHeader = /window\.Remotion/.test(code);
    if (usesFrame) {
      // Prepend a safe header after any Remotion destructuring if present
      const header = `\n// Applied frame offset\nconst frame = (typeof useCurrentFrame === 'function' ? useCurrentFrame() : (window.Remotion?.useCurrentFrame?.() ?? 0)) + ${OFFSET};\n`;
      const remotionDecl = /const\s*\{[^}]*\}\s*=\s*window\.Remotion\s*;?/;
      if (remotionDecl.test(code)) {
        return code.replace(remotionDecl, (m) => `${m}${header}`);
      }
      return header + code;
    }

    // No known patterns; return original
    return code;
  } catch {
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
  splitScene: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      sceneId: z.string(),
      frame: z.number().min(1), // split point in frames relative to scene start
      // minFrames is deprecated; left here for backward-compatibility but unused
      minFrames: z.number().min(1).optional(),
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

      // Message
      await messageService.createMessage({
        projectId: input.projectId,
        content: `Split scene "${existingScene.name}" at ${splitAt} frames into parts (${leftDuration}f, ${rightDuration}f)`,
        role: 'assistant',
        kind: 'message',
        status: 'success',
      });

      console.log(`[scenes.splitScene] ✅ Split complete: ${existingScene.id} -> ${newScene?.id}`);
      return { success: true, leftSceneId: existingScene.id, rightSceneId: newScene?.id };
    }),
  reorderScenes: protectedProcedure
    .input(z.object({
      projectId: z.string(),
      sceneIds: z.array(z.string()), // Array of scene IDs in new order
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

      console.log(`[scenes.reorderScenes] ✅ Successfully reordered ${input.sceneIds.length} scenes`);
      
      // Create a message in chat for the reorder action
      const message = await messageService.createMessage({
        projectId: input.projectId,
        content: `Reordered scenes in timeline`,
        role: 'assistant',
        kind: 'message',
        status: 'success'
      });
      
      return {
        success: true,
        message: 'Scenes reordered successfully'
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

      // Update scene code AND recompile to JS
      // Preserve manual trims by default: do NOT change duration unless explicitly requested
      const extracted = extractDurationFromCode(input.code);
      
      // CRITICAL: Recompile TSX to JS for preview to work!
      const compilationResult = compileSceneToJS(input.code);
      
      const updateFields: Record<string, any> = {
        tsxCode: input.code,
        jsCode: compilationResult.success ? compilationResult.jsCode : null,
        jsCompiledAt: compilationResult.success ? compilationResult.compiledAt : null,
        compilationError: compilationResult.success ? null : compilationResult.error,
        // Phase 2 additive fields
        compilationVersion: 1,
        // compileMeta left null in this path (compile-scene util has no timings yet)
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

      // Update scene duration
      const updatedScenes = await ctx.db
        .update(scenes)
        .set({
          duration: input.duration,
          updatedAt: new Date(),
        })
        .where(eq(scenes.id, input.sceneId))
        .returning();

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

      console.log(`[scenes.updateSceneDuration] ✅ Scene duration updated, message created, and tracked`);
      
      return {
        success: true,
        scene: updatedScenes[0]
      };
    }),
});
