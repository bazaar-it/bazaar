// src/app/api/a2a/check-agent-registry/route.ts
import { NextResponse } from 'next/server';
import { agentRegistry, registerAgent } from '~/server/services/a2a/initializeAgents';

export async function GET() {
  try {
    // Import agentRegistry and registerAgent dynamically to ensure we're getting the latest state
    // const { agentRegistry, registerAgent } = await import("~/server/services/a2a/initializeAgents");
    
    // Get the list of registered agents
    const agents = Object.keys(agentRegistry);
    
    // Check if ScenePlannerAgent exists and get its info
    let scenePlannerAgent = agentRegistry.ScenePlannerAgent;
    
    // Check for global instance marker
    const globalInstanceExists = !!(globalThis as any).__SCENE_PLANNER_AGENT_INSTANCE;
    let fixApplied = false;
    
    // FIX: If the global instance exists but the agent isn't registered, register it now
    if (globalInstanceExists && !scenePlannerAgent) {
      console.log(`[CRITICAL_FIX] Found ScenePlannerAgent global instance but it's not in the registry. Registering now.`);
      const globalInstance = (globalThis as any).__SCENE_PLANNER_AGENT_INSTANCE;
      
      if (globalInstance) {
        // Register the global instance
        registerAgent(globalInstance);
        
        // Update our local reference
        scenePlannerAgent = globalInstance;
        fixApplied = true;
        
        console.log(`[CRITICAL_FIX] ScenePlannerAgent successfully registered from global instance. Name: ${globalInstance.getName()}`);
      }
    }
    
    // Get ScenePlannerAgent info if it exists
    const scenePlannerInfo = scenePlannerAgent ? {
      name: scenePlannerAgent.getName(),
      hasProcessMessage: typeof scenePlannerAgent.processMessage === 'function',
      constructor: scenePlannerAgent.constructor.name
    } : null;
    
    // Return information about the agent registry
    return NextResponse.json({
      success: true,
      agents,
      scenePlannerAgent: {
        exists: !!scenePlannerAgent,
        info: scenePlannerInfo,
        globalInstanceExists,
        fixApplied
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Error checking agent registry:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
