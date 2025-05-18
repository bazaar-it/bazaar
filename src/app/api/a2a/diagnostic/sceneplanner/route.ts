// src/app/api/a2a/diagnostic/sceneplanner/route.ts
import { NextResponse } from "next/server";
import { agentRegistry } from "~/server/services/a2a/initializeAgents";
import { a2aLogger } from "~/lib/logger";
import { TaskProcessor } from "~/server/services/a2a/taskProcessor.service";
import { messageBus } from "~/server/agents/message-bus";

// Global variable to track if we ever see an error here
// This helps with diagnostics since errors in API routes can be hard to see
declare global {
  var __SCENE_PLANNER_ROUTE_ERROR: string | null;
}

export async function GET(req: Request) {
  const taskId = "diagnostic-" + Date.now().toString();
  a2aLogger.info(taskId, "[API] ScenePlannerAgent diagnostic endpoint called", { 
    module: "api_diagnostic", 
    url: req.url 
  });

  try {
    // Get the agent from multiple registries to track down registration issues
    const scenePlannerFromRegistry = agentRegistry["ScenePlannerAgent"];
    const scenePlannerFromBus = messageBus.getAgent?.("ScenePlannerAgent");
    
    // Get from processor - this is the most authoritative source in old arch
    const processor = TaskProcessor.getInstance();
    const registeredAgents = (processor as any).registeredAgents || [];
    const scenePlannerFromProcessor = registeredAgents.find(
      (agent: any) => agent?.getName?.() === "ScenePlannerAgent"
    );
    
    // Pick the first available agent instance
    const scenePlannerAgent = scenePlannerFromRegistry || scenePlannerFromBus || scenePlannerFromProcessor;

    if (!scenePlannerAgent) {
      const errorMessage = "ScenePlannerAgent not found in any registry";
      a2aLogger.error(taskId, errorMessage, {
        module: "api_diagnostic", 
        globalRegistry: !!agentRegistry["ScenePlannerAgent"],
        messageBus: !!scenePlannerFromBus,
        processor: !!scenePlannerFromProcessor,
        registryKeys: Object.keys(agentRegistry), 
        processorAgentCount: registeredAgents.length
      });
      
      // Record the error for later diagnostic retrieval
      globalThis.__SCENE_PLANNER_ROUTE_ERROR = errorMessage;

      return NextResponse.json({
        success: false,
        error: errorMessage,
        constructedAt: globalThis.__SCENE_PLANNER_AGENT_CONSTRUCTED || "unknown",
        registries: {
          globalRegistry: Object.keys(agentRegistry),
          processorAgentCount: registeredAgents.length,
          messageBusAgents: Array.from(messageBus["agents"]?.keys() || [])
        }
      }, { status: 404 });
    }

    // Test message - simple diagnostic ping
    const testMessage = {
      id: `diagnostic-message-${Date.now()}`,
      type: "DIAGNOSTIC_PING",
      sender: "DiagnosticAPI",
      recipient: "ScenePlannerAgent",
      timestamp: new Date().toISOString(),
      payload: {
        taskId,
        prompt: "This is a diagnostic ping. If you can see this, the agent is accessible.",
        projectId: "diagnostic-project",
        userId: "system"
      }
    };

    a2aLogger.info(taskId, "Sending diagnostic message to ScenePlannerAgent", { 
      module: "api_diagnostic", 
      messageId: testMessage.id,
      agentSource: scenePlannerFromRegistry ? "registry" : 
                  scenePlannerFromBus ? "messageBus" : 
                  "processor"
    });

    // Clear any previous error
    globalThis.__SCENE_PLANNER_ROUTE_ERROR = null;

    // Simple response type check, error will be caught if agent malfunctions
    const response = await scenePlannerAgent.processMessage(testMessage as any);
    const agentName = scenePlannerAgent.getName();
    
    a2aLogger.info(taskId, "ScenePlannerAgent diagnostic successful", { 
      module: "api_diagnostic", 
      agentName,
      responseId: response?.id,
      responseType: response?.type
    });

    return NextResponse.json({
      success: true,
      agentName,
      modelName: (scenePlannerAgent as any).modelName || "unknown",
      temperature: (scenePlannerAgent as any).temperature || 0,
      response: response ? {
        id: response.id,
        type: response.type,
        recipient: response.recipient
      } : null,
      constructedAt: globalThis.__SCENE_PLANNER_AGENT_CONSTRUCTED || "unknown",
      source: scenePlannerFromRegistry ? "registry" : 
              scenePlannerFromBus ? "messageBus" : 
              "processor"
    });
  } catch (error) {
    const errorMsg = error instanceof Error ? `${error.message}\n${error.stack}` : String(error);
    a2aLogger.error(taskId, `ScenePlannerAgent diagnostic failed with error: ${errorMsg}`, { 
      module: "api_diagnostic", 
      error: error instanceof Error ? error.stack : String(error)
    });
    
    // Record the error for later diagnostic retrieval
    globalThis.__SCENE_PLANNER_ROUTE_ERROR = errorMsg;

    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : null,
      constructedAt: globalThis.__SCENE_PLANNER_AGENT_CONSTRUCTED || "unknown"
    }, { status: 500 });
  }
}
