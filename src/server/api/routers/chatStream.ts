// src/server/api/routers/chatStream.ts
import { z } from 'zod';
import { createTRPCRouter, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';
import { observable } from '@trpc/server/observable';
import { randomUUID } from 'crypto';
import { db } from '~/server/db';
import { messages, projects } from '~/server/db/schema';
import { eq, and } from 'drizzle-orm';
import logger from '~/lib/simpleLogger';

export enum StreamEventType {
  STATUS = 'status',
  DELTA = 'delta',
  TOOL_START = 'tool_start',
  TOOL_RESULT = 'tool_result',
  FINAL = 'finalized',
  ERROR = 'error',
  RECONNECTED = 'reconnected',
}

export interface ChatEvent {
  type: StreamEventType;
  content?: string;
  status?: string;
  error?: string;
  data?: any;
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
      
      // Verify project ownership
      const proj = await db.query.projects.findFirst({
        columns: { id: true, userId: true },
        where: eq(projects.id, projectId),
      });
      
      if (!proj || proj.userId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      
      // Create message records
      const userMsgId = randomUUID();
      const assistantMsgId = randomUUID();
      
      await db.insert(messages).values([
        { 
          id: userMsgId, 
          projectId, 
          role: 'user', 
          content: message 
        },
        {
          id: assistantMsgId,
          projectId,
          role: 'assistant',
          content: 'Processing your request...',
          kind: 'status',
          status: 'pending',
        },
      ]);
      
      return { 
        assistantMessageId: assistantMsgId, 
        userMessageId: userMsgId 
      };
    }),

  streamResponse: protectedProcedure
    .input(z.object({
      projectId: z.string().uuid(),
      assistantMessageId: z.string(),
      clientId: z.string().optional(),
    }))
    .subscription(async ({ ctx, input }) => {
      const { projectId, assistantMessageId } = input;
      const clientId = input.clientId ?? randomUUID();
      const userId = ctx.session.user.id;
      
      // Verify project ownership
      const allowed = await db.query.projects.findFirst({
        columns: { id: true },
        where: and(eq(projects.id, projectId), eq(projects.userId, userId)),
      });
      
      if (!allowed) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      return observable<ChatEvent>((emit) => {
        // For Sprint 26, we'll use a simple mock response
        // The real orchestration happens client-side
        
        const simulateResponse = async () => {
          try {
            // Simulate thinking
            emit.next({ 
              type: StreamEventType.STATUS, 
              status: 'thinking',
              content: 'Analyzing your prompt...'
            });
            
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Simulate planning
            emit.next({ 
              type: StreamEventType.STATUS, 
              status: 'planning',
              content: 'Planning video scenes...'
            });
            
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // Simulate completion
            emit.next({ 
              type: StreamEventType.DELTA, 
              content: 'I\'ve analyzed your prompt and created a video plan. The storyboard will be generated using the client-side orchestrator.'
            });
            
            await new Promise(resolve => setTimeout(resolve, 500));
            
            emit.next({ 
              type: StreamEventType.FINAL, 
              status: 'success',
              content: 'Ready to generate your video!'
            });
            
            // Update the assistant message in the database
            await db.update(messages)
              .set({ 
                content: 'I\'ve analyzed your prompt and created a video plan. Ready to generate your video!',
                status: 'completed'
              })
              .where(eq(messages.id, assistantMessageId));
              
          } catch (error) {
            logger.error('Stream processing error:', error);
            emit.next({ 
              type: StreamEventType.ERROR, 
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        };
        
        // Start the simulation
        simulateResponse().catch(error => {
          logger.error('Simulation error:', error);
          emit.next({ 
            type: StreamEventType.ERROR, 
            error: 'Failed to process request'
          });
        });
        
        // Cleanup function
        return () => {
          logger.info(`Client ${clientId} disconnected from stream ${assistantMessageId}`);
        };
      });
    }),
});
