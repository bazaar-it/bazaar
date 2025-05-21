Below is a “minimum-viable but production-ready” scaffold for a chatStream.ts router that:
	•	streams OpenAI deltas to the browser with tRPC v11 experimental_stream (SSE)
	•	supports reconnection via clientId + lastEventId
	•	emits structured tool-call / tool-result events (so the UI can show build progress)
	•	keeps one DB write per message (final patch)
	•	delegates everything model-specific to a PromptOrchestrator service -– you can hot-swap GPT/Claude/etc. later

File suggestion: src/server/routers/chatStream.ts
(If you already have chat.ts, migrate its logic into the service layer and let this thin router call those services.) - or not

⸻


/* --------------------------------------------------------------------
 * chatStream.ts  – SSE + tRPC router scaffold
 * ------------------------------------------------------------------ */

import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import { randomUUID } from "crypto";

import { db }           from "@/server/db";
import { messages, projects } from "@/server/db/schema";
import { PromptOrchestrator } from "@/services/orchestrator/promptOrchestrator";
import { eventBufferService } from "@/services/chat/eventBuffer.service";
import { logger } from "@/services/shared/logger";

/* ------------------------------------------------------------------ */
/* 1. Stream-level event typing                                       */
/* ------------------------------------------------------------------ */

export enum StreamEventType {
  STATUS       = "status",       // thinking / building …
  DELTA        = "delta",        // LLM partial text
  TOOL_START   = "tool_start",   // e.g. { name:"sceneAgent" }
  TOOL_RESULT  = "tool_result",  // success / error of tool
  FINAL        = "finalized",    // stream done
  ERROR        = "error",
  RECONNECTED  = "reconnected",
}

export type StreamEvent =
  | { type: StreamEventType.STATUS;   status: string }
  | { type: StreamEventType.DELTA;    content: string }
  | { type: StreamEventType.TOOL_START;  name: string }
  | { type: StreamEventType.TOOL_RESULT; name: string; success: boolean; payload?: unknown }
  | { type: StreamEventType.ERROR;    error: string }
  | { type: StreamEventType.RECONNECTED; missedEvents: number; lastEventId: string }
  | { type: StreamEventType.FINAL;    status: "success" | "error" };

/* ------------------------------------------------------------------ */
/* 2. Router                                                          */
/* ------------------------------------------------------------------ */

export const chatStreamRouter = createTRPCRouter({

  /* ---------------------------------------------------------------
   * 2.1 initiateChat  – writes user msg & assistant placeholder
   * ------------------------------------------------------------- */
  initiateChat: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      message:   z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { projectId, message } = input;
      const userId = ctx.session.user.id;

      /* auth guard */
      const proj = await db.query.projects.findFirst({
        columns: { id:true, userId:true },
        where:    projects.id.eq(projectId),
      });
      if (!proj || proj.userId !== userId) {
        throw new TRPCError({ code:"FORBIDDEN" });
      }

      const userMsgId      = randomUUID();
      const assistantMsgId = randomUUID();

      await db.insert(messages).values([
        { id:userMsgId,      projectId, role:"user",      content:message },
        { id:assistantMsgId, projectId, role:"assistant", content:"...", kind:"status", status:"pending" }
      ]);

      return { assistantMessageId: assistantMsgId, userMessageId: userMsgId };
    }),

  /* ---------------------------------------------------------------
   * 2.2 streamResponse – token + tool streaming via SSE
   * ------------------------------------------------------------- */
  streamResponse: protectedProcedure
    .input(z.object({
      projectId:          z.string().uuid(),
      assistantMessageId: z.string(),
      clientId:           z.string().optional(),
      lastEventId:        z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { projectId, assistantMessageId, lastEventId } = input;
      const clientId = input.clientId ?? randomUUID();
      const userId   = ctx.session.user.id;

      /* ------- permission check --------------------------------- */
      const allowed = await db.query.projects.findFirst({
        columns:{ id:true }, where: projects.id.eq(projectId).and(projects.userId.eq(userId))
      });
      if (!allowed) throw new TRPCError({ code:"FORBIDDEN" });

      /* -----------------------------------------------------------
       * Return an observable<tRPC SSE event>
       * --------------------------------------------------------- */
      return observable<StreamEvent>((emit) => {
        /* 1.  replay missed events if client re-connected ---------- */
        if (lastEventId) {
          const replay = eventBufferService.replay(clientId, assistantMessageId, lastEventId);
          replay.forEach(emit.next);
          emit.next({ type:StreamEventType.RECONNECTED, missedEvents: replay.length, lastEventId });
        }

        /* 2.  subscribe to fresh events --------------------------- */
        const sub = eventBufferService.subscribe(clientId, assistantMessageId, emit.next);

        /* 3.  kick off background processing exactly once --------- */
        const startIfFirst = eventBufferService.markActiveClient(assistantMessageId, clientId);
        if (startIfFirst) runProcessing().catch(err => logger.error(err));

        /* 4.  teardown on disconnect ------------------------------ */
        return () => {
          sub.unsubscribe();
          eventBufferService.markDisconnected(clientId);
        };

        /* === back-ground job ==================================== */
        async function runProcessing() {
          try {
            emit.next({ type:StreamEventType.STATUS, status:"thinking" });

            /* pull chat history limited to N messages (omitted) */
            const history = await PromptOrchestrator.fetchHistory(projectId, assistantMessageId);

            /* --- delegate to PromptOrchestrator ----------------- */
            await PromptOrchestrator.processUserMessage({
              projectId,
              assistantMessageId,
              history,
              eventSink: eventBufferService,   // pushes DELTA / TOOL events
            });

            /* final success */
            eventBufferService.push(assistantMessageId, {
              type: StreamEventType.FINAL, status:"success"
            });
          } catch (err:any) {
            logger.error("stream processing", err);
            eventBufferService.push(assistantMessageId, {
              type: StreamEventType.ERROR,  error: err.message ?? "unknown"
            });
            eventBufferService.push(assistantMessageId, {
              type: StreamEventType.FINAL,  status:"error"
            });
          }
        }
      });
    }),
});


⸻

Key points you can flesh out later

Placeholder	What to implement next
PromptOrchestrator.fetchHistory	DB helper that returns the last N user + assistant messages (for context).
PromptOrchestrator.processUserMessage	All the heavy logic → 1 OpenAI streaming call, detects function-calls, calls Scene/Style/Asset agents, pushes events to eventBufferService.
eventBufferService	Simple in-memory (or Redis) map {msgId → [events…]} with helpers:push, subscribe, replay, markActiveClient, markDisconnected. Enables reconnection.
Database update on final	In processUserMessage, after model/tool work finishes, patch the placeholder message (status:"success" and final content) once.
Rate limiting / auth	Use ctx.session or IP counters before hitting the LLM.
Front-end	In your React hook, open the tRPC subscription and pipe events to:• Chat bubble typewriter (DELTA)• Progress bar / toast (TOOL_START / TOOL_RESULT)• Auto-scroll & diff on FINAL.


⸻

Why such a thin router?
	•	Edge-friendly – only tiny logic runs in the router; the orchestrator service can live on a background worker or AWS Lambda.
	•	Re-usable – exactly the same streaming semantics work for WebSockets if you ever migrate (just swap observable transport).
	•	Stateless reconnection – eventBufferService is the single recon source; you can move it to Redis for multi-instance deployments.

Wire this scaffold into your existing project, flesh out the orchestrator + buffer internals, and you’ll have reliable token-level chat streaming that co-exists happily with the Remotion build lane.