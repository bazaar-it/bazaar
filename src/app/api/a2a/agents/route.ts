import { NextResponse } from "next/server";
import { agentRegistry } from "~/server/services/a2a/agentRegistry.service";

/**
 * Agent Discovery API endpoint
 * 
 * Returns a list of all available A2A-compliant agents in the system.
 * 
 * @see https://github.com/google/A2A/blob/main/docs/agent-discovery.md
 */
export async function GET() {
  try {
    const agents = agentRegistry.getAllAgentCards();
    
    return NextResponse.json({
      agents,
      count: agents.length
    });
  } catch (error: any) {
    console.error("Error retrieving agent directory:", error);
    
    return NextResponse.json(
      { error: "Failed to retrieve agent directory", detail: error.message },
      { status: 500 }
    );
  }
} 