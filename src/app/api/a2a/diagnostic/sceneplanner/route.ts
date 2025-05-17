// src/app/api/a2a/diagnostic/sceneplanner/route.ts
import { NextResponse } from 'next/server';
import { __runScenePlannerDiagnostic, __testScenePlannerProcessMessage } from '~/server/agents/scene-planner-agent';

// POST endpoint to run scene planner diagnostic
export async function POST() {
  try {
    console.log("[API] Running ScenePlannerAgent diagnostic...");
    
    // Run the diagnostic function
    const diagnosticResult = await __runScenePlannerDiagnostic();
    console.log("[API] Diagnostic result:", diagnosticResult);
    
    // Test the process message function
    const testMessage = {
      id: "test-message",
      type: "CREATE_SCENE_PLAN_REQUEST",
      payload: {
        prompt: "Test prompt for scene planning",
        taskId: "test-task-id"
      }
    };
    
    console.log("[API] Testing ScenePlannerAgent.processMessage...");
    const processResult = await __testScenePlannerProcessMessage(testMessage);
    console.log("[API] Process test result:", processResult);
    
    return NextResponse.json({
      success: true,
      diagnosticResult,
      processResult
    });
  } catch (error: any) {
    console.error("[API] Error running ScenePlannerAgent diagnostic:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
