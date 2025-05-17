// src/scripts/test-scene-planner.ts
import { randomUUID } from "crypto";
import { TaskManager } from "~/server/services/a2a/taskManager.service";
import { ScenePlannerAgent } from "~/server/agents/scene-planner-agent";
import { CoordinatorAgent } from "~/server/agents/coordinator-agent";
import { a2aLogger } from "~/lib/logger";
import { createTextMessage } from "~/types/a2a";

async function testScenePlannerAgent() {
  console.log("Starting ScenePlannerAgent direct test");
  
  // Initialize TaskManager
  const taskManager = TaskManager.getInstance();
  
  // Create the agents directly
  const scenePlannerAgent = new ScenePlannerAgent(taskManager);
  const coordinatorAgent = new CoordinatorAgent(taskManager);
  
  console.log("Agents created");
  console.log(`ScenePlannerAgent name: ${scenePlannerAgent.getName()}`);
  console.log(`CoordinatorAgent name: ${coordinatorAgent.getName()}`);
  
  // Create a test task ID
  const taskId = `test-task-${randomUUID()}`;
  console.log(`Created test task ID: ${taskId}`);
  
  // Create a test message
  const testMessage = {
    id: `test-message-${randomUUID()}`,
    type: "CREATE_SCENE_PLAN_REQUEST",
    sender: "CoordinatorAgent",
    recipient: "ScenePlannerAgent",
    taskId: taskId,
    payload: {
      taskId: taskId,
      prompt: "Create a short intro animation for a tech company called banana",
      message: {
        createdAt: new Date().toISOString(),
        id: `message-${randomUUID()}`,
        parts: [{ text: "Create a short intro animation for a tech company called banana", type: "text" }]
      },
      metadata: {
        animationDesignBrief: {
          description: "Create a short intro animation for a tech company called banana",
          sceneName: "TestRequest"
        }
      }
    }
  };
  
  console.log("Sending test message to ScenePlannerAgent");
  try {
    // Send the message directly
    const response = await scenePlannerAgent.processMessage(testMessage);
    
    if (response) {
      console.log("✅ ScenePlannerAgent responded successfully");
      console.log(`Response type: ${response.type}`);
      console.log(`Response recipient: ${response.recipient}`);
      console.log("Response payload:", JSON.stringify(response.payload, null, 2).substring(0, 500) + "...");
    } else {
      console.log("❌ ScenePlannerAgent did not return a response");
    }
  } catch (error) {
    console.error("Error sending message to ScenePlannerAgent:", error);
  }
  
  console.log("Test completed");
}

// Run the test
testScenePlannerAgent()
  .then(() => {
    console.log("Test script completed, exiting...");
    setTimeout(() => process.exit(0), 1000); // Allow time for logs to flush
  })
  .catch(error => {
    console.error("Test failed with error:", error);
    process.exit(1);
  });
