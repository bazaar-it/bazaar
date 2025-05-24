// src/server/api/routers/a2a.ts

import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { agentRegistry } from "~/server/services/a2a/agentRegistry.service";
import { taskManager } from "~/server/services/a2a/taskManager.service";
import { TRPCError } from "@trpc/server";
import { observable } from "@trpc/server/observable";
import type { Message, SSEEvent } from "~/types/a2a";
import { db, executeWithRetry } from "~/server/db";
import { agentMessages, customComponentJobs, animationDesignBriefs } from "~/server/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import type { TaskStatus, TaskState, AgentCard } from "~/types/a2a";
import { createTextMessage } from "~/types/a2a";
import { type AgentMessage } from "~/server/agents/base-agent";
import { messageBus } from "~/server/agents/message-bus";
import { getTaskProcessor } from "~/server/services/a2a/taskProcessor.service";
import { animationDesignBriefSchema } from "~/lib/schemas/animationDesignBrief.schema";
import type { AnimationDesignBrief } from "~/lib/schemas/animationDesignBrief.schema";
import { InputPropsSchema, RunGUISchema } from "~/lib/schemas/a2a.schema";

// Define a specific schema for the client-provided task creation parameters
const A2ACreateTaskClientPayloadSchema = z.object({
  projectId: z.string().uuid(), // Enforce UUID format for projectId
  targetAgent: z.string(),
  effect: z.string(),
  message: z.object({
    id: z.string().uuid(),
    createdAt: z.string().datetime(),
    parts: z.array(z.object({ type: z.literal('text'), text: z.string() })),
  }),
  animationDesignBrief: z.object({
    sceneName: z.string(),
    description: z.string(),
  }),
  // Add other expected optional fields here if necessary
  // For example: initialPrompt: z.string().optional(),
});

// Define the expected output structure for a single brief item
type TaskDesignBriefOutputItem = {
  id: string;
  projectId: string;
  sceneId: string; // Non-nullable based on DB schema
  componentJobId: string | null;
  status: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  originalTsxCode: string | null;
  lastFixAttempt: Date | null;
  fixIssues: string | null;
  llmModel: string | null;
  briefData: AnimationDesignBrief | null; // Corrected type
};

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
    .query(async () => {
      try {
        // Get all registered agents from the messageBus
        const agentList = [];
        
        // Get all registered agents and their agent cards
        for (const agentName of ['CoordinatorAgent', 'BuilderAgent', 'ADBAgent', 'ErrorFixerAgent', 
                               'R2StorageAgent', 'UIAgent', 'ComponentLoadingFixer']) {
          const agent = messageBus.getAgent(agentName);
          if (agent) {
            const agentCard = agent.getAgentCard();
            agentList.push(agentCard);
          }
        }
        
        return agentList;
      } catch (error) {
        console.error("Failed to fetch agent directory:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch agent directory: ${String(error)}`,
        });
      }
    }),

  /**
   * Get agent lifecycle statuses
   */
  getAgentStatuses: publicProcedure.query(() => {
    return agentRegistry.getAgentStatuses();
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
  createTask: publicProcedure
    .input(z.object({
      prompt: z.string(), // This top-level prompt can perhaps be deprecated if covered by params.effect or params.message
      model: z.string().optional(),
      params: A2ACreateTaskClientPayloadSchema // Use the new specific schema
    }))
    .mutation(async ({ input, ctx }) => {
      const { prompt, model, params } = input; // params is now strictly typed
      
      // TODO: Add project access validation using ctx.session.user.id if changed back to protectedProcedure
      // if (!ctx.session?.user) {
      //   throw new TRPCError({ code: "UNAUTHORIZED" });
      // }
      // const userId = ctx.session.user.id;
      // Add logic here to check if userId has access to projectId
      
      // Create the task
      const task = await taskManager.createTask(params.projectId, params);
      
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
    .query(async ({ input, ctx }) => {
      const { taskId } = input;
      
      // Check cache first before hitting database
      try {
        // Use ctx.session?.user?.id for proper access control once we switch back to protectedProcedure
        return await taskManager.getTaskStatus(taskId);
      } catch (error) {
        console.error(`Error fetching task status for task ${taskId}:`, error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch task status: ${String(error)}`
        });
      }
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

  // Get agent message history for a specific task
  getAgentMessages: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
        limit: z.number().min(1).max(100).default(50),
      })
    )
    .query(async ({ input, ctx }) => {
      try {
        // Find the component job first to ensure the task exists
        const componentJob = await db.query.customComponentJobs.findFirst({
          where: eq(customComponentJobs.taskId, input.taskId),
        });

        if (!componentJob) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Task ${input.taskId} not found.`
          });
        }

        // Query the agent_messages table for messages related to this task
        const rawMessages = await db.query.agentMessages.findMany({
          where: and(
            // Filter by taskId in the JSONB payload
            sql`(${agentMessages.payload} ->> 'taskId' = ${input.taskId} OR ${agentMessages.payload} -> 'taskContext' ->> 'taskId' = ${input.taskId})`
          ),
          orderBy: [desc(agentMessages.createdAt)],
          limit: input.limit,
        });

        // Transform the raw messages to ensure null correlationId is converted to undefined
        const messages: AgentMessage[] = rawMessages.map(msg => ({
          ...msg,
          correlationId: msg.correlationId ?? undefined
        }));

        return messages;
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Failed to fetch agent messages:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch agent messages: ${String(error)}`,
        });
      }
    }),

  // Get agent activity for a task
  getAgentActivity: publicProcedure
    .input(
      z.object({
        taskId: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        // Get the most recently active agents for this task
        // This would be based on recent messages in a real implementation
        
        // Placeholder implementation - to be replaced with actual DB queries
        const activeAgents = ['CoordinatorAgent', 'BuilderAgent']; // Example
        
        // Get recent messages for this task
        // In a real implementation, you'd query the database
        const messages: AgentMessage[] = []; // Would contain actual message data
        
        return {
          activeAgents,
          messages
        };
      } catch (error) {
        console.error("Failed to fetch agent activity:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch agent activity: ${String(error)}`,
        });
      }
    }),

  /**
   * Get animation design briefs for a specific task
   */
  getTaskDesignBriefs: publicProcedure
    .input(z.object({ taskId: z.string() }))
    // Define an explicit output schema that allows null for briefData
    .output(z.array(z.object({
      id: z.string().uuid(),
      projectId: z.string().uuid(),
      sceneId: z.string(), 
      componentJobId: z.string().uuid().nullable(), 
      status: z.string().nullable(), 
      createdAt: z.date(),
      updatedAt: z.date().nullable(),
      originalTsxCode: z.string().nullable(), 
      lastFixAttempt: z.date().nullable(),   
      fixIssues: z.string().nullable(),     
      llmModel: z.string().nullable(),
      briefData: z.union([animationDesignBriefSchema, z.null()]), 
    })))
    .query(async ({ ctx, input }) => {
      try {
        // Step 1: Find customComponentJobs for the given taskId
        const jobs = await ctx.db.query.customComponentJobs.findMany({
          columns: { id: true }, // We only need the ID (which is componentJobId for animationDesignBriefs)
          where: eq(customComponentJobs.taskId, input.taskId),
        });

        if (!jobs || jobs.length === 0) {
          return []; // No jobs found for this taskId, so no briefs
        }

        const componentJobIds = jobs.map(job => job.id).filter(id => id !== null);

        if (componentJobIds.length === 0) {
          return []; // No valid componentJobIds found
        }

        // Step 2: Query animationDesignBriefs using the componentJobIds
        const briefsFromDb = await ctx.db.query.animationDesignBriefs.findMany({
          columns: { // Explicitly select columns that exist on animationDesignBriefs
            id: true,
            projectId: true,
            sceneId: true,
            componentJobId: true,
            designBrief: true, 
            status: true,
            createdAt: true,
            updatedAt: true,
            originalTsxCode: true,
            lastFixAttempt: true,
            fixIssues: true,
            llmModel: true,
          },
          where: inArray(animationDesignBriefs.componentJobId, componentJobIds),
          orderBy: [desc(animationDesignBriefs.createdAt)],
        });

        if (!briefsFromDb || briefsFromDb.length === 0) {
          return [];
        }

        return briefsFromDb.map((brief): TaskDesignBriefOutputItem => { // Explicit return type for map callback
          let parsedBriefData = brief.designBrief; 
            
          if (parsedBriefData && typeof parsedBriefData === 'string') {
            try {
              // Attempt to parse the string but handle failure gracefully
              parsedBriefData = JSON.parse(parsedBriefData) as AnimationDesignBrief;
            } catch (e) {
              console.error("Failed to parse string designBrief for brief ID:", brief.id, e);
              // Create a fallback minimal AnimationDesignBrief object instead of null
              parsedBriefData = {
                briefVersion: '1.0.0',
                sceneId: brief.sceneId,
                scenePurpose: 'Could not parse brief data',
                overallStyle: 'Unknown',
                durationInFrames: 60,
                dimensions: { width: 1920, height: 1080 },
                colorPalette: { background: '#000000' },
                elements: [],
                audioTracks: []
              };
            }
          }

          // Explicitly construct the object to match TaskDesignBriefOutputItem
          return {
            id: brief.id,
            projectId: brief.projectId,
            sceneId: brief.sceneId,
            componentJobId: brief.componentJobId,
            status: brief.status,
            createdAt: brief.createdAt,
            updatedAt: brief.updatedAt,
            originalTsxCode: brief.originalTsxCode,
            lastFixAttempt: brief.lastFixAttempt,
            fixIssues: brief.fixIssues,
            llmModel: brief.llmModel,
            // If parsedBriefData is null or undefined, explicitly set briefData to null
            briefData: parsedBriefData as (AnimationDesignBrief | null)
          };
        });
      } catch (error) {
        console.error("Failed to fetch animation design briefs:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `Failed to fetch animation design briefs: ${String(error)}`,
        });
      }
    }),

  // Add a health check procedure to verify database connectivity
  healthCheck: publicProcedure
    .query(async ({ ctx }) => {
      try {
        // First check database connectivity
        const result = await executeWithRetry(() => ctx.db.execute(sql`SELECT 1 as health_check`));
        
        // Get agent counts
        const agentCount = agentRegistry.getAllAgents().length;
          
        return {
          status: 'ok',
          database: 'connected',
          timestamp: new Date().toISOString(),
          agentCount,
          taskManagerInitialized: !!taskManager,
        };
      } catch (error) {
        console.error('Health check failed:', error);
        throw new TRPCError({
          code: 'INTERNAL_SERVER_ERROR',
          message: `Database connection error: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }),
});
