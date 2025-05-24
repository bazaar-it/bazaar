// @ts-nocheck
// src/scripts/debug-scene-planner-agent.ts
import { OpenAIAdapter } from "../server/services/a2a/openai.adapter";
import { ScenePlannerAgent } from "../server/agents/scene-planner-agent";
import { a2aLogger } from "../lib/logger";

// Load environment variables
import '../env.js';

// Initialize logging
console.log("Initializing diagnostic tool for ScenePlannerAgent");
console.log(`Using A2A_LOG_DIR: ${process.env.A2A_LOG_DIR || 'not set'}`);

async function main() {
  try {
    // Create OpenAI adapter for the agent
    const openai = new OpenAIAdapter({
      apiKey: process.env.OPENAI_API_KEY || "",
      modelName: "gpt-4o-mini",
    });

    console.log("Creating ScenePlannerAgent instance...");
    const agent = new ScenePlannerAgent(openai);
    
    // Run a health check 
    console.log("\n--- HEALTH CHECK ---");
    const healthResult = agent.healthCheck();
    console.log("Health check complete");
    
    // Create a dummy message
    const dummyMessage = {
      id: "test-message-" + Date.now(),
      type: "CREATE_SCENE_PLAN_REQUEST",
      sender: "TestHarness",
      recipient: "ScenePlannerAgent",
      timestamp: new Date().toISOString(),
      payload: {
        taskId: "test-task-" + Date.now(),
        prompt: "Create a short intro animation for a tech company called CodeVision",
        projectId: "test-project-id",
        message: {
          createdAt: new Date().toISOString(),
          id: "test-message-id",
          parts: [
            {
              text: "Create a short intro animation for a tech company called CodeVision",
              type: "text"
            }
          ]
        },
        metadata: {
          animationDesignBrief: {
            description: "Create a short intro animation for a tech company called CodeVision",
            sceneName: "VideoGenerationRequest"
          }
        }
      }
    };
    
    console.log("\n--- SENDING TEST MESSAGE ---");
    console.log(`Message type: ${dummyMessage.type}`);
    console.log(`TaskId: ${dummyMessage.payload.taskId}`);
    
    // Process the message
    try {
      console.log("Calling processMessage...");
      const response = await agent.processMessage(dummyMessage);
      console.log("\n--- RESPONSE RECEIVED ---");
      if (response) {
        console.log(`Response type: ${response.type}`);
        console.log(`Response recipient: ${response.recipient}`);
        console.log("Response payload:", response.payload);
      } else {
        console.log("No response received (null returned)");
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
    
    console.log("\nDiagnostic test complete.");
  } catch (error) {
    console.error("Error in diagnostic script:", error);
  }
}

// Run the main function
main().catch(error => {
  console.error("Fatal error in diagnostic script:", error);
});
