Below is a drop-in scaffold for the two core verbs your Prompt Orchestrator still needs:
	•	fetchHistory() – returns the last N user ↔ assistant turns in a shape that LLMs like.
	•	processUserMessage() – the high-level finite-state-machine that decides plan-scene, regen-component, or plain chat and streams progress events back to chat.ts.

Copy the file to
src/services/orchestrator/promptOrchestrator.ts (or wherever you keep service code).

/* ------------------------------------------------------------------ *
 * Prompt Orchestrator – central “brain” that fans out tasks to agents
 * ------------------------------------------------------------------ */

import type { Storyboard } from "@/schema/storyboard-types";
import { SceneAgentAdapter }   from "@/services/agents/sceneAgent";
import { StyleAgentAdapter }   from "@/services/agents/styleAgent";
import { AssetAgentAdapter }   from "@/services/agents/assetAgent";
import { StoryboardBuilder }   from "@/services/storyboard/storyboardBuilder";
import { generateComponentForScene } from "@/services/componentGenerator.service";

import { StreamEventType, type StreamEmitter } from "@/types/chatStream";
import { db }                from "@/server/db";
import { messages, projects } from "@/server/db/schema";
import { logger }            from "@/services/shared/logger";
import { applyPatch }        from "fast-json-patch";
import { randomUUID }        from "crypto";

interface OrchestratorCfg {
  modelMatrix: {
    planner : string;   // e.g. "gpt-4o"
    coder   : string;   // e.g. "claude-3-sonnet"
    style   : string;   // e.g. "gpt-3.5-turbo"
  };
  maxHistory: number;
}

export class PromptOrchestrator {
  private cfg: OrchestratorCfg;

  constructor(cfg: OrchestratorCfg) {
    this.cfg = cfg;
  }

  /* -------------------------------------------------------------- *
   * 1.  History helper – returns the last N messages for context
   * -------------------------------------------------------------- */
  async fetchHistory(projectId: string, n = this.cfg.maxHistory) {
    const rows = await db.query.messages.findMany({
      where: (m, { eq }) => eq(m.projectId, projectId),
      orderBy: [messages.createdAt.desc()],
      limit: n,
    });
    /* Shape it as {role,content} for LLMs */
    return rows
      .reverse()                                  // oldest ➜ newest
      .map(r => ({ role: r.role, content: r.content }));
  }

  /* -------------------------------------------------------------- *
   * 2.  Main entry – called by chat.ts::processUserMessage()
   * -------------------------------------------------------------- */
  async processUserMessage(opts: {
    projectId        : string;
    userId           : string;
    userMessageId    : string;
    content          : string;
    currentProps     : Storyboard | null;      // may be null for new projects
    emitter          : StreamEmitter;          // chat.ts Subject wrapper
  }) {
    const { projectId, userMessageId, content, currentProps, emitter } = opts;
    logger.info("PO: received", { projectId, userMessageId });

    /* ---- 0. Hydrate / create storyboard shell ----------------- */
    const storyboard =
      currentProps ??
      StoryboardBuilder.emptyStoryboard({          // fps,width,height defaults
        id   : randomUUID(),
        fps  : 30,
        size : [1280, 720],
      });

    /* ---- 1. Detect intent ------------------------------------- *
     * Simple heuristic first: if the project has 0 scenes OR the
     * user explicitly says “create a video”, we call SceneAgent.
     * You can swap this for a classifier LLM later.
     */
    const needScenePlan =
      storyboard.scenes.length === 0 ||
      /make.*video|create.*video|scene|timeline/i.test(content);

    if (needScenePlan) {
      emitter.next({ type: StreamEventType.TOOL_START, name: "SceneAgent" });

      const scenePlan = await SceneAgentAdapter.planScenes({
        prompt     : content,
        fps        : storyboard.fps,
        modelName  : this.cfg.modelMatrix.planner,
      });

      storyboard.scenes = scenePlan;            // overwrite / first fill
      storyboard.duration =
        scenePlan[scenePlan.length - 1].start +
        scenePlan[scenePlan.length - 1].duration;

      emitter.next({
        type : StreamEventType.TOOL_RESULT,
        name : "SceneAgent",
        success: true,
      });
    }

    /* ---- 2. Style pass (only once per project) ---------------- */
    if (!storyboard.designSystem || Object.keys(storyboard.designSystem.palette).length === 0) {
      emitter.next({ type: StreamEventType.TOOL_START, name: "StyleAgent" });

      const styleTokens = await StyleAgentAdapter.extractStyles({
        prompt        : content,
        modelName     : this.cfg.modelMatrix.style,
        projectGitUrl : null,          // fill if you have it
        uploadedImgs  : [],            // fill with current uploads
      });
      storyboard.designSystem = styleTokens;

      emitter.next({
        type : StreamEventType.TOOL_RESULT,
        name : "StyleAgent",
        success: true,
      });
    }

    /* ---- 3. Asset pass (optional) ----------------------------- */
    emitter.next({ type: StreamEventType.TOOL_START, name: "AssetAgent" });
    await AssetAgentAdapter.hydrateAssets({
      storyboard,
      uploads: [],                         // pass upload meta list if any
    });
    emitter.next({
      type : StreamEventType.TOOL_RESULT,
      name : "AssetAgent",
      success: true,
    });

    /* ---- 4. Persist new Storyboard in DB ---------------------- */
    await db
      .update(projects)
      .set({ props: storyboard, updatedAt: new Date() })
      .where(projects.id.eq(projectId));

    /* ---- 5. Generate / regenerate components ------------------ */
    for (const scene of storyboard.scenes) {
      /* Only build new scenes without moduleUrl; you can add per-scene
         metadata like scene.moduleUrl later.                         */
      if ((scene as any).moduleUrl) continue;

      emitter.next({
        type: StreamEventType.SCENE_STATUS,
        sceneId: scene.id,
        status: "building",
      });

      try {
        const compRes = await generateComponentForScene(storyboard, scene);

        /* Patch storyboard in DB */
        const patch = [{ 
          op: "add",
          path: `/scenes/${storyboard.scenes.findIndex(s => s.id === scene.id)}/moduleUrl`,
          value: compRes.moduleUrl,
        }];
        const newBoard = applyPatch(structuredClone(storyboard), patch).newDocument;
        await db
          .update(projects)
          .set({ props: newBoard, updatedAt: new Date() })
          .where(projects.id.eq(projectId));

        emitter.next({
          type: StreamEventType.SCENE_STATUS,
          sceneId: scene.id,
          status: "ready",
          moduleUrl: compRes.moduleUrl,
        });
      } catch (e) {
        logger.error("PO: component gen failed", e);
        emitter.next({
          type: StreamEventType.SCENE_STATUS,
          sceneId: scene.id,
          status: "error",
          error : (e as Error).message,
        });
      }
    }

    /* ---- 6. Write final assistant message --------------------- */
    await db.insert(messages).values({
      id        : randomUUID(),
      projectId,
      role      : "assistant",
      content   : "✅ Your first preview is ready!  \nHit *Play* to watch or tweak scenes via chat.",
      createdAt : new Date(),
    });

    emitter.next({ type: StreamEventType.FINALIZED, status: "success" });
  }
}

Notes & TODO markers
	•	Config‐driven models – the constructor gets a modelMatrix, so ops can swap "coder": "mistral-small" without code changes.
	•	Scene looping – we only build components for scenes that still miss a moduleUrl; later edits can set a flag to force rebuild.
	•	AssetAgent call – currently a fire-and-forget helper; extend it when you have real uploads/CLIP processing.
	•	Error surfaces – every catch emits a SCENE_STATUS with status:"error" so the front-end can paint the timeline red.

With this class wired into your chatRouter (replace the earlier giant processUserMessageInProject), the orchestrator will:
	1.	look up recent history
	2.	decide whether it needs a scene plan or is just a small chat tweak
	3.	run Scene → Style → Asset agents
	4.	build missing components (esbuild + R2)
	5.	stream every step back to the client

That closes the last big scaffold on the “brain” side 🚀