// src/server/api/routers/a2a-test.ts
import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { agentRegistry } from "~/server/services/a2a/agentRegistry.service";
import { taskManager, TaskManager } from "~/server/services/a2a/taskManager.service";
import { a2aLogger, initializeA2AFileTransport } from "~/lib/logger";
import { createTextMessage, type Message, type TaskState } from "~/types/a2a";
import { TRPCError } from "@trpc/server";
import { env } from "~/env";
import crypto from "crypto";

// Import agent classes directly
import { BaseAgent } from "~/server/agents/base-agent";
import { CoordinatorAgent } from "~/server/agents/coordinator-agent";
import { BuilderAgent } from "~/server/agents/builder-agent";
import { UIAgent } from "~/server/agents/ui-agent";
import { ErrorFixerAgent } from "~/server/agents/error-fixer-agent";
import { R2StorageAgent } from "~/server/agents/r2-storage-agent";

// Ensure A2A logging is initialized
initializeA2AFileTransport();

// Manually register agents if they don't exist in registry
function ensureAgentsExist(): BaseAgent[] {
  a2aLogger.info("system", "A2A Test Router: Checking for registered agents");
  
  // Get existing agents
  const existingAgents = agentRegistry.getAllAgents();
  if (existingAgents.length > 0) {
    a2aLogger.info("system", `A2A Test Router: Found ${existingAgents.length} existing agents`, {
      agentNames: existingAgents.map(a => a.getName())
    });
    return existingAgents;
  }
  
  // Create new agents
  a2aLogger.info("system", "A2A Test Router: No agents found, creating test agents");
  const newAgents: BaseAgent[] = [];
  
  try {
    // Create test agents
    const coordinatorAgent = new CoordinatorAgent(taskManager);
    agentRegistry.registerAgent(coordinatorAgent);
    newAgents.push(coordinatorAgent);
    a2aLogger.info("system", "A2A Test Router: Registered CoordinatorAgent");
  } catch (error) {
    a2aLogger.error("system", "A2A Test Router: Failed to create CoordinatorAgent", { error });
  }
  
  try {
    const builderAgent = new BuilderAgent({ modelName: env.DEFAULT_ADB_MODEL || 'gpt-4' }, taskManager);
    agentRegistry.registerAgent(builderAgent);
    newAgents.push(builderAgent);
    a2aLogger.info("system", "A2A Test Router: Registered BuilderAgent");
  } catch (error) {
    a2aLogger.error("system", "A2A Test Router: Failed to create BuilderAgent", { error });
  }
  
  try {
    const uiAgent = new UIAgent(taskManager);
    agentRegistry.registerAgent(uiAgent);
    newAgents.push(uiAgent);
    a2aLogger.info("system", "A2A Test Router: Registered UIAgent");
  } catch (error) {
    a2aLogger.error("system", "A2A Test Router: Failed to create UIAgent", { error });
  }
  
  try {
    const errorFixerAgent = new ErrorFixerAgent({ modelName: env.DEFAULT_ADB_MODEL || 'gpt-4' }, taskManager);
    agentRegistry.registerAgent(errorFixerAgent);
    newAgents.push(errorFixerAgent);
    a2aLogger.info("system", "A2A Test Router: Registered ErrorFixerAgent");
  } catch (error) {
    a2aLogger.error("system", "A2A Test Router: Failed to create ErrorFixerAgent", { error });
  }
  
  try {
    const r2StorageAgent = new R2StorageAgent(taskManager);
    agentRegistry.registerAgent(r2StorageAgent);
    newAgents.push(r2StorageAgent);
    a2aLogger.info("system", "A2A Test Router: Registered R2StorageAgent");
  } catch (error) {
    a2aLogger.error("system", "A2A Test Router: Failed to create R2StorageAgent", { error });
  }
  
  a2aLogger.info("system", `A2A Test Router: Created and registered ${newAgents.length} new agents`);
  return newAgents;
}

// Initialize agents on router load
const testAgents = ensureAgentsExist();

/**
 * Router for testing A2A functionality without authentication
 * IMPORTANT: This should only be enabled in development environments
 */
export const a2aTestRouter = createTRPCRouter({
  ping: publicProcedure.query(() => {
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
      message: "A2A test router is available"
    };
  }),
  
  agentExists: publicProcedure
    .input(z.object({ agentName: z.string() }))
    .query(({ input }) => {
      const { agentName } = input;
      
      try {
        const agent = agentRegistry.getAgent(agentName);
        return {
          name: agentName,
          exists: !!agent,
          type: agent ? agent.constructor.name : null
        };
      } catch (error) {
        return {
          name: agentName,
          exists: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }),
  
  listAgents: publicProcedure.query(() => {
    try {
      const agents = agentRegistry.getAllAgents();
      return agents.map(agent => ({
        name: agent.getName(),
        type: agent.constructor.name,
      }));
    } catch (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }),
  
  pingAgent: publicProcedure
    .input(z.object({
      agentName: z.string(),
      message: z.string()
    }))
    .mutation(async ({ input }) => {
      const { agentName, message } = input;
      
      try {
        // Create a test task
        a2aLogger.info("test", `Sending test message to ${agentName}: ${message}`);
        
        // Get agent from registry
        const agent = agentRegistry.getAgent(agentName);
        
        if (!agent) {
          throw new Error(`Agent not found: ${agentName}`);
        }
        
        // Generate a valid UUID for the task
        const taskId = crypto.randomUUID();
        
        // Create text message for the agent
        const textMessage = createTextMessage(message);
        
        // Create a task with the message
        const task = await taskManager.createTask("test-project", {
          taskId,
          messages: [textMessage],
          artifacts: [],
          metadata: {
            isTest: true,
            source: "a2a-test-router"
          }
        });
        
        a2aLogger.info("test", `Created test task: ${task.id}`, { taskId: task.id });
        
        // The message is already included in the task creation
        // No need to add it separately
        
        // Mark the task as working initially
        const initialState: TaskState = 'working';
        // Update the task status with appropriate message
        const workingMessage = createTextMessage(`Processing message to ${agentName}...`);
        await taskManager.updateTaskStatus(task.id, initialState, workingMessage, []);
        
        // Attempt to notify the agent about the new message
        let response = false;
        try {
          // Try to route message to the agent
          if (typeof (agent as any).handleMessage === 'function') {
            response = await (agent as any).handleMessage(textMessage, task);
          } else if (typeof (agent as any).processMessage === 'function') {
            response = await (agent as any).processMessage(task.id, textMessage);
          } else if (typeof (agent as any).onMessage === 'function') {
            response = await (agent as any).onMessage(task.id, message);
          }
        } catch (agentError) {
          a2aLogger.warn("test", `Agent ${agentName} couldn't process message normally: ${(agentError as Error).message}`);
        }
        
        return {
          taskId: task.id,
          status: initialState,
          statusMessage: `Test message sent to ${agentName}`,
          agentResponse: response ? "Message accepted" : "No immediate response"
        };
      } catch (error) {
        a2aLogger.error("test", `Error sending test message to ${agentName}`, error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }),
    
  getTaskStatus: publicProcedure
    .input(z.object({
      taskId: z.string(),
    }))
    .query(async ({ input }) => {
      const { taskId } = input;
      
      try {
        const taskStatus = await taskManager.getTaskStatus(taskId);
        
        if (!taskStatus) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Task with ID ${taskId} not found`
          });
        }
        
        return {
          taskId: taskStatus.id,
          status: taskStatus.state,
          statusMessage: `Status for task ${taskId}`,
          artifacts: taskStatus.artifacts || []
        };
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : String(error)
        });
      }
    }),
    
  listAgents: publicProcedure.query(() => {
    // Only allow in development environment
    if (env.NODE_ENV === 'production') {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "This endpoint is only available in development mode"
      });
    }
    
    const agents = agentRegistry.getAllAgents();
    return agents.map(agent => {
      const agentCard = agent.getAgentCard();
      return {
        name: agent.getName(),
        description: agentCard.description || agent.getName(),
        capabilities: agentCard.capabilities || {}
      };
    });
  }),
  
  getMessageBusLogs: publicProcedure
    .input(z.object({ 
      taskId: z.string(),
      maxMessages: z.number().default(50)
    }))
    .query(async ({ input }) => {
      // Only allow in development environment
      if (env.NODE_ENV === 'production') {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This endpoint is only available in development mode"
        });
      }
      
      try {
        // Attempt to fetch messages from the database
        const task = await taskManager.getTaskById(input.taskId);
        
        if (!task) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: `Task ${input.taskId} not found`
          });
        }
        
        // This implementation depends on if you have message history
        // For now, we'll just return the latest message
        return {
          messages: task.taskState?.message ? [task.taskState.message] : [],
          note: "Complete message history not implemented yet"
        };
      } catch (error) {
        a2aLogger.error(input.taskId, "Error fetching message bus logs:", error);
        return {
          messages: [],
          error: error instanceof Error ? error.message : String(error)
        };
      }
    })
});
