import crypto from 'crypto';

// Mock the necessary imports
const mockDb = {
  insert: () => ({ values: () => Promise.resolve({ id: 'mock-id' }) }),
  update: () => ({ set: () => ({ where: () => Promise.resolve() }) }),
  select: () => ({ from: () => ({ where: () => Promise.resolve([{ id: 'mock-id' }]) }) }),
};

// Mock TaskManager for tracking state without database
class MockTaskManager {
  constructor() {
    this.tasks = new Map();
    this.artifacts = new Map();
    this.messages = [];
  }

  async createTask(taskData) {
    const taskId = taskData.id || crypto.randomUUID();
    this.tasks.set(taskId, { 
      id: taskId, 
      state: 'submitted',
      message: taskData.message,
      createdAt: new Date().toISOString() 
    });
    return { id: taskId };
  }

  async updateTaskStatus(taskId, state, message, artifacts = [], componentStatus) {
    const task = this.tasks.get(taskId) || { id: taskId };
    task.state = state;
    task.message = message;
    task.updatedAt = new Date().toISOString();
    if (componentStatus) task.componentStatus = componentStatus;
    this.tasks.set(taskId, task);
    
    console.log(`Task ${taskId} updated to state: ${state}`);
    if (message) console.log(`Message: ${JSON.stringify(message)}`);
    if (componentStatus) console.log(`Component status: ${componentStatus}`);
    
    return task;
  }

  async addTaskArtifact(taskId, artifact) {
    if (!this.artifacts.has(taskId)) {
      this.artifacts.set(taskId, []);
    }
    this.artifacts.get(taskId).push(artifact);
    console.log(`Added artifact to task ${taskId}: ${artifact.name}`);
    return artifact;
  }

  async logTaskMessage(taskId, message) {
    message.taskId = taskId;
    message.timestamp = new Date().toISOString();
    this.messages.push(message);
    console.log(`Logged message for task ${taskId}: ${message.type}`);
    return message;
  }
}

// Simplified version of ADBAgent for testing
class TestADBAgent {
  constructor(taskManager) {
    this.name = "ADBAgent";
    this.taskManager = taskManager;
  }

  createSimpleTextMessage(text) {
    return {
      role: "agent",
      parts: [{ type: "text", text }]
    };
  }

  async updateTaskState(taskId, state, message, artifacts, componentStatus) {
    return this.taskManager.updateTaskStatus(taskId, state, message, artifacts, componentStatus);
  }

  async addTaskArtifact(taskId, artifact) {
    return this.taskManager.addTaskArtifact(taskId, artifact);
  }

  async logAgentMessage(message, isIncoming = false) {
    const direction = isIncoming ? "received" : "sent";
    console.log(`[${new Date().toISOString()}] ADBAgent ${direction}: ${message.type}`);
    if (message.payload.taskId) {
      return this.taskManager.logTaskMessage(message.payload.taskId, {
        type: message.type,
        from: isIncoming ? message.from : this.name,
        to: isIncoming ? this.name : message.to,
        content: JSON.stringify(message.payload),
        direction
      });
    }
    return Promise.resolve();
  }

  createA2AMessage(type, taskId, toAgent, message, artifacts, correlationId) {
    return {
      type,
      payload: { taskId },
      id: correlationId || crypto.randomUUID(),
      from: this.name,
      to: toAgent,
      message,
      artifacts
    };
  }

  // This is a simplified version of the actual processMessage method
  async processMessage(message) {
    const { type, payload, id: correlationId } = message;
    let taskId = payload.taskId || payload.componentJobId;
 
    try {
      if (type === "GENERATE_DESIGN_BRIEF_REQUEST") {
        const { 
          description, 
          projectId, 
          sceneId, 
          duration, 
          dimensions, 
          componentJobId: existingJobId,
          sceneElementsDescription,
          currentVideoContext,
          targetAudience,
          brandGuidelines
        } = payload;

        taskId = existingJobId || crypto.randomUUID(); 

        await this.logAgentMessage(message, true);
        await this.updateTaskState(taskId, 'working', 
          this.createSimpleTextMessage("Generating Animation Design Brief..."), 
          undefined, 
          'working'
        );

        // Mock the animation design brief generation
        console.log("Mocking animation design brief generation...");
        console.log("Input parameters:", JSON.stringify({
          projectId,
          sceneId,
          scenePurpose: description,
          sceneElementsDescription: sceneElementsDescription || "",
          desiredDurationInFrames: duration || 90,
          dimensions: dimensions || { width: 1920, height: 1080 }
        }, null, 2));

        // Create a mock animation design brief
        const brief = {
          id: crypto.randomUUID(),
          name: `Animation for ${sceneId || 'unknown scene'}`,
          description: description || 'Test animation',
          duration: duration || 90,
          elements: [
            {
              id: "element-1",
              type: "shape",
              name: "Background",
              properties: { color: "#3498db" }
            },
            {
              id: "element-2",
              type: "shape",
              name: "Ball",
              properties: { 
                color: "#e74c3c",
                animation: "bounce"
              }
            }
          ],
          animations: [
            {
              elementId: "element-2",
              type: "bounce",
              keyframes: [
                { time: 0, y: 0 },
                { time: 45, y: 100 },
                { time: 90, y: 0 }
              ]
            }
          ]
        };

        const briefId = crypto.randomUUID();

        // Create the artifact
        const adbArtifact = {
          id: briefId,
          type: "data",
          mimeType: "application/json",
          data: brief,
          description: "Animation Design Brief",
          createdAt: new Date().toISOString(),
          name: `adb-${taskId}.json`
        };

        await this.addTaskArtifact(taskId, adbArtifact);
        await this.updateTaskState(taskId, 'completed',
          this.createSimpleTextMessage("Animation Design Brief generated successfully."),
          undefined,
          'completed'
        );

        console.log("Animation Design Brief generated successfully!");
        console.log("Brief ID:", briefId);
        console.log("Summary:", JSON.stringify({
          elements: brief.elements.length,
          animations: brief.animations.length,
          duration: brief.duration
        }));

        // Send to CoordinatorAgent
        return this.createA2AMessage(
          "CREATE_COMPONENT_REQUEST",
          taskId,
          "CoordinatorAgent",
          this.createSimpleTextMessage("Request to create component from generated ADB."),
          [adbArtifact],
          correlationId
        );
      } else {
        console.warn(`ADBAgent received unhandled message type: ${type}`);
        await this.logAgentMessage(message);
        return null;
      }
    } catch (error) {
      console.error(`Error processing message in ADBAgent (type: ${type}):`, error);
      if (taskId) {
        await this.updateTaskState(taskId, 'failed', this.createSimpleTextMessage(`ADBAgent error: ${error.message}`), undefined, 'failed');
      }
      await this.logAgentMessage(message, false);
      
      if (taskId) {
        return this.createA2AMessage("ADB_GENERATION_ERROR", taskId, "CoordinatorAgent", this.createSimpleTextMessage(`ADBAgent error: ${error.message}`), undefined, correlationId);
      }
      return null;
    }
  }
}

// Function to test ADBAgent
async function testADBAgent() {
  console.log("=== Testing ADBAgent ===");
  const taskManager = new MockTaskManager();
  const adbAgent = new TestADBAgent(taskManager);

  // Test message
  const testMessage = {
    type: "GENERATE_DESIGN_BRIEF_REQUEST",
    payload: {
      description: "A bouncing red ball on a blue background",
      projectId: "test-project-id",
      sceneId: "test-scene-id",
      duration: 90,
      dimensions: { width: 1920, height: 1080 },
      sceneElementsDescription: "A simple animation with a bouncing ball"
    },
    id: crypto.randomUUID(),
    from: "TestHarness",
    to: "ADBAgent"
  };

  console.log("Sending test message to ADBAgent...");
  const response = await adbAgent.processMessage(testMessage);

  console.log("\n=== ADBAgent Response ===");
  if (response) {
    console.log("Response type:", response.type);
    console.log("To agent:", response.to);
    console.log("Task ID:", response.payload.taskId);
    console.log("Artifacts:", response.artifacts ? response.artifacts.length : 0);
  } else {
    console.log("No response received");
  }

  console.log("\n=== Task Manager State ===");
  console.log("Tasks:", taskManager.tasks.size);
  console.log("Messages:", taskManager.messages.length);
  console.log("Artifacts:", Array.from(taskManager.artifacts.keys()).length);
}

// Run the test
testADBAgent().catch(console.error); 