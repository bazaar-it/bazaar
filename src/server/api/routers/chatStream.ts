// src/server/api/routers/chatStream.ts
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import { randomUUID } from 'crypto';
import { db } from '@/server/db';
import { messages, projects } from '@/server/db/schema';
import { PromptOrchestrator } from '@/services/orchestrator/promptOrchestrator';
import { eventBufferService } from '@/server/services/eventBuffer.service';
import { logger } from '@/services/shared/logger';
import type { ChatEvent } from '@/types/chat-events';

export enum StreamEventType {
  STATUS = 'status',
  DELTA = 'delta',
  TOOL_START = 'tool_start',
  TOOL_RESULT = 'tool_result',
  FINAL = 'finalized',
  ERROR = 'error',
  RECONNECTED = 'reconnected',
}

export const chatStreamRouter = createTRPCRouter({
  initiateChat: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      message: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const { projectId, message } = input;
      const userId = ctx.session.user.id;
      const proj = await db.query.projects.findFirst({
        columns: { id: true, userId: true },
        where: projects.id.eq(projectId),
      });
      if (!proj || proj.userId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      const userMsgId = randomUUID();
      const assistantMsgId = randomUUID();
      await db.insert(messages).values([
        { id: userMsgId, projectId, role: 'user', content: message },
        {
          id: assistantMsgId,
          projectId,
          role: 'assistant',
          content: '...',
          kind: 'status',
          status: 'pending',
        },
      ]);
      return { assistantMessageId: assistantMsgId, userMessageId: userMsgId };
    }),

  streamResponse: protectedProcedure
    .input(
      z.object({
        projectId: z.string().uuid(),
        assistantMessageId: z.string(),
        clientId: z.string().optional(),
        lastEventId: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { projectId, assistantMessageId, lastEventId } = input;
      const clientId = input.clientId ?? randomUUID();
      const userId = ctx.session.user.id;
      const allowed = await db.query.projects.findFirst({
        columns: { id: true },
        where: projects.id.eq(projectId).and(projects.userId.eq(userId)),
      });
      if (!allowed) throw new TRPCError({ code: 'FORBIDDEN' });

      return observable<ChatEvent>((emit) => {
        if (lastEventId) {
          const replay = eventBufferService.replay(clientId, assistantMessageId, lastEventId);
          replay.forEach(emit.next);
          emit.next({
            type: 'reconnected',
            missedEvents: replay.length,
            lastEventId,
          } as any);
        }

        const sub = eventBufferService.subscribe(clientId, assistantMessageId, emit.next);
        const startIfFirst = eventBufferService.markActiveClient(assistantMessageId, clientId);
        if (startIfFirst) runProcessing().catch((err) => logger.error(err));
        return () => {
          sub.unsubscribe();
          eventBufferService.markDisconnected(clientId);
        };

        async function runProcessing() {
          try {
            emit.next({ type: 'status', status: 'thinking' } as any);
            const history = await PromptOrchestrator.fetchHistory(projectId, assistantMessageId);
            await PromptOrchestrator.processUserMessage({
              projectId,
              assistantMessageId,
              history,
              eventSink: eventBufferService,
            });
            eventBufferService.push(assistantMessageId, { type: 'finalized', status: 'success' } as any);
          } catch (err: any) {
            logger.error('stream processing', err);
            eventBufferService.push(assistantMessageId, { type: 'error', error: err.message ?? 'unknown' } as any);
            eventBufferService.push(assistantMessageId, { type: 'finalized', status: 'error' } as any);
          }
        }
      });
    }),
});
