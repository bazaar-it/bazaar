//src/server/api/routers/debug.ts

import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";
import { TaskProcessor } from "~/server/services/a2a/taskProcessor.service";
import { a2aLogger } from "~/lib/logger";
import { agentRegistry as globalAgentRegistry } from "~/server/services/a2a/initializeAgents";
import { messageBus } from "~/server/agents/message-bus";

export const debugRouter = createTRPCRouter({
  // Get the status of all A2A agents
  getAgentStatus: publicProcedure.query(async () => {
    a2aLogger.info("system", "[DEBUGROUTER] getAgentStatus called", { module: "debug_api" });
    
    try {
      const processor = TaskProcessor.getInstance();
      
      // Get agents from multiple sources to help diagnose registration issues
      // Global agent registry (from initializeAgents.ts)
      const globalRegistryAgentNames = Object.keys(globalAgentRegistry);
      
      // Message bus registered agents
      const messageBusAgents = Array.from(messageBus["agents"]?.keys() || []);
      
      // Safely access processor properties - use object access notation
      // This avoids the need for @ts-expect-error and works better
      const processorInfo = {
        // Use type assertion to safely access private props (only for debugging)
        instanceId: (processor as any).instanceId || 'unknown',
        isPolling: (processor as any).isPolling || false,
        startupTimestamp: (processor as any).startupTimestamp || 0,
        isCoreInitialized: (processor as any).isCoreInitialized || false,
        
        // Public properties and methods
        registeredAgentCount: (processor as any).registeredAgents?.length || 0,
        isActive: processor.isActiveInstance?.() || false
      };
      
      // ScenePlannerAgent diagnostic info
      const scenePlannerConstructed = (globalThis as any).__SCENE_PLANNER_AGENT_CONSTRUCTED || 'unknown';
      const scenePlannerRouteError = (globalThis as any).__SCENE_PLANNER_ROUTE_ERROR || null;
      
      // Enhanced response with agent information from multiple sources
      return {
        success: true,
        processor: processorInfo,
        agentRegistry: {
          globalRegistry: globalRegistryAgentNames,
          messageBusRegistry: messageBusAgents,
          // Detailed information about critical agents
          scenePlanner: {
            inGlobalRegistry: globalRegistryAgentNames.includes('ScenePlannerAgent'),
            inMessageBus: messageBusAgents.includes('scenePlannerAgent') || messageBusAgents.includes('ScenePlannerAgent'),
            constructedAt: scenePlannerConstructed,
            lastRouteError: scenePlannerRouteError
          }
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      a2aLogger.error("system", `[DEBUGROUTER] Error getting agent status: ${error instanceof Error ? error.message : String(error)}`, { 
        error: error instanceof Error ? error.stack : String(error) 
      });
      
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
      a2aLogger.info("system", "[DEBUGROUTER] testScenePlannerAgent called", { message: input.message });
      
      try {
        // Get ScenePlannerAgent from multiple sources to see which one works
        const scenePlannerFromGlobal = globalAgentRegistry['ScenePlannerAgent'];
        const scenePlannerFromBus = (messageBus as any).getAgent?.('ScenePlannerAgent');
        
        // Get processor instance for additional diagnostics
        const processor = TaskProcessor.getInstance();
        
        // Try to get agent from processor's registered agents
        const registeredAgents = (processor as any).registeredAgents || [];
        const scenePlannerFromProcessor = registeredAgents.find(
          (agent: any) => agent.getName?.() === "ScenePlannerAgent"
        );
        
        // Pick the first available agent instance
        const scenePlannerAgent = scenePlannerFromGlobal || scenePlannerFromBus || scenePlannerFromProcessor;
        
        if (!scenePlannerAgent) {
          a2aLogger.error("system", "[DEBUGROUTER] ScenePlannerAgent not found in any registry", {
            globalRegistry: !!globalAgentRegistry['ScenePlannerAgent'],
            messageBus: !!scenePlannerFromBus,
            processor: !!scenePlannerFromProcessor
          });
          
          return { 
            success: false, 
            error: "ScenePlannerAgent not found in any registry",
            agentRegistry: {
              globalRegistry: Object.keys(globalAgentRegistry),
              messageBusRegistry: Array.from(messageBus["agents"]?.keys() || [])
            }
          };
        }
        
        a2aLogger.info("system", "[DEBUGROUTER] ScenePlannerAgent found, creating test message");
        
        // Create a test message with required fields
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
            userId: "debug-user-id",
            message: {
              createdAt: new Date().toISOString(),
              id: `message-${Date.now()}`,
              parts: [{ text: input.message, type: "text" }]
            }
          }
        };
        
        // Use type assertion when passing to processMessage
        const response = await scenePlannerAgent.processMessage(testMessage as any);
        
        return {
          success: true,
          response: response ? {
            type: response.type,
            recipient: response.recipient,
            payloadSummary: {
              taskId: response.payload?.taskId,
              message: response.payload?.message?.parts?.[0]?.text,
              type: response.type
            }
          } : null,
          sceneAgentSource: scenePlannerFromGlobal ? "globalRegistry" : 
                           scenePlannerFromBus ? "messageBus" : 
                           scenePlannerFromProcessor ? "processor" : "unknown",
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        a2aLogger.error("system", `[DEBUGROUTER] Error testing ScenePlannerAgent: ${error instanceof Error ? error.message : String(error)}`, {
          error: error instanceof Error ? error.stack : String(error)
        });
        
        return {
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date().toISOString()
        };
      }
    })
});
