//src/server/api/routers/debug.ts

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TaskProcessor } from "~/server/services/a2a/taskProcessor.service";
import { a2aLogger } from "~/lib/logger";

export const debugRouter = createTRPCRouter({
  // Get the status of all A2A agents
  getAgentStatus: publicProcedure.query(async () => {
    // Get TaskProcessor instance
    const processor = TaskProcessor.getInstance();
    
    // Log activity for debugging
    console.log("[DEBUG] Getting agent status");
    a2aLogger.info("debug_endpoint", "[DEBUG] getAgentStatus called");
    
    try {
      // Get all agents registered with the TaskProcessor
      // @ts-expect-error - Accessing private property for debugging
      const registeredAgents = processor.registeredAgents || [];
      
      // Get agent details
      const agents = registeredAgents.map(agent => ({
        name: agent.getName(),
        constructedAt: (globalThis as any).__SCENE_PLANNER_AGENT_CONSTRUCTED || "unknown",
      }));
      
      // Get TaskProcessor details
      // @ts-expect-error - Accessing private properties for debugging
      const processorInfo = {
        instanceId: processor.instanceId,
        pollingStarted: processor.isPolling,
        startupTime: processor.startupTime,
        coreInitialized: processor.isCoreInitialized,
        registeredAgentCount: registeredAgents.length
      };
      
      return {
        success: true,
        processor: processorInfo,
        agents: agents,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error("[DEBUG] Error getting agent status:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      };
    }
  }),
  
  // Send a test message to the ScenePlannerAgent
  testScenePlannerAgent: publicProcedure
    .input(z.object({
      message: z.string().default("Create a short intro animation for a tech company called TestCo")
    }))
    .mutation(async ({ input }) => {
      try {
        console.log("[DEBUG] Testing ScenePlannerAgent with message:", input.message);
        a2aLogger.info("debug_endpoint", "[DEBUG] testScenePlannerAgent called", { message: input.message });
        
        // Get TaskProcessor instance
        const processor = TaskProcessor.getInstance();
        
        // @ts-expect-error - Accessing private property for debugging
        const agents = processor.registeredAgents || [];
        const scenePlannerAgent = agents.find(agent => agent.getName() === "ScenePlannerAgent");
        
        if (!scenePlannerAgent) {
          console.error("[DEBUG] ScenePlannerAgent not found in registered agents!");
          return { success: false, error: "ScenePlannerAgent not found" };
        }
        
        console.log("[DEBUG] Found ScenePlannerAgent, creating test message");
        
        // Create a test message
        const testMessage = {
          id: `test-message-${Date.now()}`,
          type: "CREATE_SCENE_PLAN_REQUEST",
          sender: "DebugEndpoint",
          recipient: "ScenePlannerAgent",
          timestamp: new Date().toISOString(),
          payload: {
            taskId: `test-task-${Date.now()}`,
            prompt: input.message,
            projectId: "debug-project-id",
            message: {
              createdAt: new Date().toISOString(),
              id: `message-${Date.now()}`,
              parts: [{ text: input.message, type: "text" }]
            },
            metadata: {
              animationDesignBrief: {
                description: input.message,
                sceneName: "DebugRequest"
              }
            }
          }
        };
        
        // Send the message directly to the agent
        console.log("[DEBUG] Sending test message to ScenePlannerAgent");
        // @ts-expect-error - Test message may not exactly match AgentMessage type
        const response = await scenePlannerAgent.processMessage(testMessage);
        
        return {
          success: true,
          response: response ? {
            type: response.type,
            recipient: response.recipient,
            payload: response.payload
          } : null,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        console.error("[DEBUG] Error testing ScenePlannerAgent:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        };
      }
    })
});
