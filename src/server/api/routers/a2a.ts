// src/server/api/routers/a2a.ts

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { agentRegistry } from "~/server/services/a2a/agentRegistry.service";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import type { Message, SSEEvent } from "~/types/a2a";

/**
 * A2A Router
 * 
 * Provides tRPC endpoints for A2A protocol functionality
 */
export const a2aRouter = createTRPCRouter({
  /**
   * Get the list of available agents and their capabilities
   */
  getAgentDirectory: publicProcedure
    .query(() => {
      return agentRegistry.getAllAgentCards();
    }),
  
  /**
   * Get detailed information about a specific agent
   */
  getAgentCard: publicProcedure
    .input(z.object({
      agentName: z.string(),
    }))
    .query(({ input }) => {
      const { agentName } = input;
      const card = agentRegistry.getAgentCard(agentName);
      
      if (!card) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Agent not found: ${agentName}`
        });
      }
      
      return card;
    }),
  
  /**
   * Create a new A2A task
   * TEMPORARILY public for testing harness - REMEMBER TO CHANGE BACK TO protectedProcedure
   */
  createTask: publicProcedure // Changed from protectedProcedure for testing
    .input(z.object({
      projectId: z.string(),
      params: z.record(z.any())
    }))
    .mutation(async ({ input, ctx }) => {
      const { projectId, params } = input;
      
      // TODO: Add project access validation using ctx.session.user.id if changed back to protectedProcedure
      // if (!ctx.session?.user) {
      //   throw new TRPCError({ code: "UNAUTHORIZED" });
      // }
      // const userId = ctx.session.user.id;
      // Add logic here to check if userId has access to projectId
      
      // Create the task
      const task = await taskManager.createTask(projectId, params);
      
      return task;
    }),
  
  /**
   * Get task status
   * TEMPORARILY public for testing harness - REMEMBER TO CHANGE BACK TO protectedProcedure
   */
  getTaskStatus: publicProcedure // Changed from protectedProcedure for testing
    .input(z.object({
      taskId: z.string(),
    }))
    .query(async ({ input }) => {
      const { taskId } = input;
      return await taskManager.getTaskStatus(taskId);
    }),
  
  /**
   * Cancel a task
   * TEMPORARILY public for testing harness - REMEMBER TO CHANGE BACK TO protectedProcedure
   */
  cancelTask: publicProcedure // Changed from protectedProcedure for testing
    .input(z.object({
      taskId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { taskId } = input;
      await taskManager.cancelTask(taskId);
      return { success: true };
    }),
  
  /**
   * Submit input for a task that requires it
   * TEMPORARILY public for testing harness - REMEMBER TO CHANGE BACK TO protectedProcedure
   */
  submitTaskInput: publicProcedure // Changed from protectedProcedure for testing
    .input(z.object({
      taskId: z.string(),
      message: z.object({
        parts: z.array(z.object({
          text: z.string().optional(),
          data: z.record(z.any()).optional(),
          file: z.object({
            mimeType: z.string(),
            data: z.string().optional(),
            url: z.string().optional(),
          }).optional(),
        }))
      }).transform(val => val as Message), 
    }))
    .mutation(async ({ input }) => {
      const { taskId, message } = input;
      await taskManager.submitTaskInput(taskId, message);
      return { success: true };
    }),
  
  /**
   * Subscribe to task status updates via SSE
   * TEMPORARILY public for testing harness - REMEMBER TO CHANGE BACK TO protectedProcedure
   */
  subscribeToTaskStatus: publicProcedure // Changed from protectedProcedure for testing
    .input(z.object({
      taskId: z.string(),
    }))
    .subscription(({ input }) => {
      const { taskId } = input;
      
      return observable<SSEEvent>((emit) => {
        const stream = taskManager.createTaskStream(taskId);
        
        const subscription = stream.subscribe({
          next: (event) => emit.next(event),
          error: (err) => emit.error(err),
          complete: () => emit.complete()
        });
        
        return () => {
          subscription.unsubscribe();
        };
      });
    }),
});
