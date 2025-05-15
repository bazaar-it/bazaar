import { NextRequest, NextResponse } from "next/server";
import { agentRegistry } from "~/server/services/a2a/agentRegistry.service";

/**
 * Individual Agent Card API endpoint
 * 
 * Returns details about a specific agent based on the name parameter.
 * 
 * @see https://github.com/google/A2A/blob/main/docs/agent-discovery.md
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { name: string } }
) {
  try {
    const { name } = params;
    const agentCard = agentRegistry.getAgentCard(name);
    
    if (!agentCard) {
      return NextResponse.json(
        { error: "Agent not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(agentCard);
  } catch (error: any) {
    console.error(`Error retrieving agent '${params.name}':`, error);
    
    return NextResponse.json(
      { error: "Failed to retrieve agent details", detail: error.message },
      { status: 500 }
    );
  }
} 