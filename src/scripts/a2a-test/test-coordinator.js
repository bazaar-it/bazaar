import crypto from 'crypto';

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

  async updateTaskStatus(taskId, state, message, artifacts, componentStatus) {
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
  
  async getTask(taskId) {
    return this.tasks.get(taskId);
  }
}

// Mock MessageBus for sending messages between agents
class MockMessageBus {
  constructor() {
    this.messages = [];
    this.agents = new Map();
  }
  
  registerAgent(agent) {
    console.log(`Registering agent: ${agent.name}`);
    this.agents.set(agent.name, agent);
  }
  
  async sendMessage(message) {
    this.messages.push(message);
    console.log(`Message sent from ${message.from} to ${message.to}: ${message.type || "NO_TYPE"}`);
    
    // If the target agent is registered, deliver the message
    if (this.agents.has(message.to)) {
      const targetAgent = this.agents.get(message.to);
      console.log(`Delivering message to ${message.to}`);
      
      // Convert to the expected format for the agent
      const agentMessage = {
        type: message.type || "UNKNOWN",
        payload: {
          taskId: message.taskId,
          ...message.metadata
        },
        id: crypto.randomUUID(),
        from: message.from,
        to: message.to,
        content: message.content
      };
      
      // Process asynchronously
      setTimeout(() => {
        targetAgent.processMessage(agentMessage)
          .then(response => {
            if (response) {
              console.log(`${message.to} responded with: ${response.type}`);
            }
          })
          .catch(err => {
            console.error(`Error in ${message.to} processing:`, err);
          });
      }, 0);
    }
    
    return message;
  }
}

// Simplified Test Coordinator Agent
class TestCoordinatorAgent {
  constructor(taskManager, messageBus) {
    this.name = "CoordinatorAgent";
    this.taskManager = taskManager;
    this.messageBus = messageBus;
    
    // Register with message bus
    if (messageBus) {
      messageBus.registerAgent(this);
    }
  }
  
  createSimpleTextMessage(text) {
    return {
      role: "agent",
      parts: [{ type: "text", text }]
    };
  }
  
  async logAgentMessage(message, isIncoming = false) {
    const direction = isIncoming ? "received" : "sent";
    console.log(`[${new Date().toISOString()}] CoordinatorAgent ${direction}: ${message.type}`);
    if (message.payload?.taskId) {
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
  
  async processMessage(message) {
    const { type, payload, id: correlationId } = message;
    let taskId = payload.taskId;
    
    try {
      console.log(`CoordinatorAgent processing message: ${type}`);
      
      // Handle NEW_TASK messages or initial component generation requests
      if (type === "NEW_TASK" || type === "GENERATE_COMPONENT_REQUEST") {
        // Get task or create if doesn't exist
        let task = taskId ? await this.taskManager.getTask(taskId) : null;
        
        if (!task) {
          console.log("Creating new task...");
          const newTaskResult = await this.taskManager.createTask({
            id: taskId || crypto.randomUUID(),
            message: this.createSimpleTextMessage(payload.description || payload.content || "New task")
          });
          taskId = newTaskResult.id;
        }
        
        // Log the incoming message
        await this.logAgentMessage(message, true);
        
        // Update task to working status
        await this.taskManager.updateTaskStatus(
          taskId,
          "working",
          this.createSimpleTextMessage("Analyzing your request..."),
          undefined,
          "working"
        );
        
        // Simulate task analysis and routing
        console.log("Analyzing task content...");
        
        // Mock LLM-based routing decision
        // In a real implementation, this would use OpenAI's API to make a decision
        const taskContent = payload.description || payload.content || "";
        
        console.log("Task content:", taskContent);
        
        // Simulate decision-making
        let routingDecision;
        if (taskContent.includes("bouncing ball") || taskContent.includes("animation")) {
          routingDecision = {
            nextAgent: "ScenePlannerAgent",
            reason: "Task involves animation creation which should start with scene planning"
          };
        } else if (taskContent.includes("design brief") || taskContent.includes("ADB")) {
          routingDecision = {
            nextAgent: "ADBAgent",
            reason: "Task directly requests creation of an Animation Design Brief"
          };
        } else if (taskContent.includes("fix") || taskContent.includes("error")) {
          routingDecision = {
            nextAgent: "ErrorFixerAgent",
            reason: "Task involves fixing issues in a component"
          };
        } else {
          routingDecision = {
            nextAgent: "ScenePlannerAgent",
            reason: "Default routing to scene planning for video creation"
          };
        }
        
        console.log("Routing decision:", routingDecision);
        
        // Create a decision artifact for transparency
        const decisionArtifact = {
          id: crypto.randomUUID(),
          type: "data",
          mimeType: "application/json",
          data: routingDecision,
          description: "Coordinator decision on task routing",
          createdAt: new Date().toISOString(),
          name: `routing-decision-${taskId}.json`
        };
        
        // Add the artifact to the task
        await this.taskManager.addTaskArtifact(taskId, decisionArtifact);
        
        // Update task status with decision
        await this.taskManager.updateTaskStatus(
          taskId,
          "working",
          this.createSimpleTextMessage(
            `Routing your request to ${routingDecision.nextAgent}: ${routingDecision.reason}`
          ),
          undefined,
          "working"
        );
        
        // Forward to the next agent
        if (this.messageBus) {
          await this.messageBus.sendMessage({
            taskId,
            from: this.name,
            to: routingDecision.nextAgent,
            type: "GENERATE_SCENE_PLAN_REQUEST",
            content: taskContent,
            metadata: {
              reason: routingDecision.reason,
              projectId: payload.projectId || "test-project-id"
            }
          });
        }
        
        // Return success message to caller
        return this.createA2AMessage(
          "TASK_ROUTED",
          taskId,
          message.from,
          this.createSimpleTextMessage(`Task routed to ${routingDecision.nextAgent}`),
          [decisionArtifact],
          correlationId
        );
      }
      
      // Handle other message types
      else if (type === "CREATE_COMPONENT_REQUEST") {
        // Process ADB artifact and route to BuilderAgent
        await this.logAgentMessage(message, true);
        
        console.log("Received CREATE_COMPONENT_REQUEST from ADBAgent");
        
        // Check if we have an ADB artifact
        const adbArtifact = message.artifacts?.find(a => a.name?.includes('adb'));
        
        if (adbArtifact) {
          console.log("Found ADB artifact, forwarding to BuilderAgent");
          
          // Update task status
          await this.taskManager.updateTaskStatus(
            taskId,
            "working",
            this.createSimpleTextMessage("Animation design brief received. Generating component..."),
            undefined,
            "working"
          );
          
          // Forward to BuilderAgent
          if (this.messageBus) {
            await this.messageBus.sendMessage({
              taskId,
              from: this.name,
              to: "BuilderAgent",
              type: "BUILD_COMPONENT_REQUEST",
              content: "Build component from ADB",
              metadata: {
                adbArtifactId: adbArtifact.id,
                projectId: payload.projectId || "test-project-id"
              }
            });
          }
          
          return this.createA2AMessage(
            "ADB_FORWARDED_TO_BUILDER",
            taskId,
            message.from,
            this.createSimpleTextMessage("Animation design brief forwarded to BuilderAgent"),
            undefined,
            correlationId
          );
        } else {
          throw new Error("No ADB artifact found in CREATE_COMPONENT_REQUEST");
        }
      }
      
      // Handle error messages
      else if (type.includes("ERROR")) {
        await this.logAgentMessage(message, true);
        
        // Update task with error
        await this.taskManager.updateTaskStatus(
          taskId,
          "failed",
          this.createSimpleTextMessage(`Error in task processing: ${payload.error || type}`),
          undefined,
          "failed"
        );
        
        return this.createA2AMessage(
          "ERROR_ACKNOWLEDGED",
          taskId,
          message.from,
          this.createSimpleTextMessage("Error acknowledged"),
          undefined,
          correlationId
        );
      }
      
      // Default fallback for unknown message types
      else {
        console.warn(`CoordinatorAgent received unhandled message type: ${type}`);
        await this.logAgentMessage(message, true);
        return null;
      }
    } catch (error) {
      console.error(`Error in CoordinatorAgent (${type}):`, error);
      
      if (taskId) {
        await this.taskManager.updateTaskStatus(
          taskId,
          "failed",
          this.createSimpleTextMessage(`Coordinator error: ${error.message}`),
          undefined,
          "failed"
        );
      }
      
      return this.createA2AMessage(
        "COORDINATOR_ERROR",
        taskId,
        message.from,
        this.createSimpleTextMessage(`Coordinator error: ${error.message}`),
        undefined,
        correlationId
      );
    }
  }
}

// Mock Scene Planner Agent
class MockScenePlannerAgent {
  constructor(taskManager, messageBus) {
    this.name = "ScenePlannerAgent";
    this.taskManager = taskManager;
    this.messageBus = messageBus;
    
    // Register with message bus
    if (messageBus) {
      messageBus.registerAgent(this);
    }
  }
  
  createSimpleTextMessage(text) {
    return {
      role: "agent",
      parts: [{ type: "text", text }]
    };
  }
  
  async processMessage(message) {
    const { type, payload, id: correlationId } = message;
    const taskId = payload.taskId;
    
    console.log(`ScenePlannerAgent received message: ${type}`);
    
    // For testing purposes, just acknowledge the message and generate a mock scene plan
    setTimeout(async () => {
      if (this.messageBus) {
        // Create scene plan artifact
        const scenePlan = {
          scenes: [
            {
              id: "scene-1",
              name: "Ball Bounce Intro",
              description: "A red ball appears and starts bouncing on a blue background",
              duration: 3,
              elements: ["ball", "background"]
            },
            {
              id: "scene-2",
              name: "Ball Bounce Finale",
              description: "The ball bounces higher and then fades out",
              duration: 2,
              elements: ["ball", "background", "fade-effect"]
            }
          ],
          totalDuration: 5
        };
        
        const scenePlanArtifact = {
          id: crypto.randomUUID(),
          type: "data",
          mimeType: "application/json",
          data: scenePlan,
          description: "Scene Plan",
          createdAt: new Date().toISOString(),
          name: `scene-plan-${taskId}.json`
        };
        
        // Update task status
        await this.taskManager.updateTaskStatus(
          taskId,
          "working",
          this.createSimpleTextMessage("Scene plan created. Generating animation design brief..."),
          undefined,
          "working"
        );
        
        // Send to ADBAgent
        await this.messageBus.sendMessage({
          taskId,
          from: this.name,
          to: "ADBAgent",
          type: "GENERATE_DESIGN_BRIEF_REQUEST",
          content: "Generate design brief from scene plan",
          metadata: {
            scenePlan,
            projectId: payload.projectId || "test-project-id",
            sceneId: "scene-1"
          }
        });
      }
    }, 1000);
    
    return {
      type: "SCENE_PLANNING_STARTED",
      payload: { taskId },
      id: crypto.randomUUID(),
      from: this.name,
      to: message.from,
      message: this.createSimpleTextMessage("Scene planning started")
    };
  }
}

// Test function
async function testCoordinatorAgent() {
  console.log("=== Testing CoordinatorAgent ===");
  
  // Create the test environment
  const taskManager = new MockTaskManager();
  const messageBus = new MockMessageBus();
  
  // Create the agents
  const coordinatorAgent = new TestCoordinatorAgent(taskManager, messageBus);
  const scenePlannerAgent = new MockScenePlannerAgent(taskManager, messageBus);
  
  // Create a test task message
  const taskId = crypto.randomUUID();
  const testMessage = {
    type: "NEW_TASK",
    payload: {
      taskId,
      description: "Create a 5-second video of a bouncing ball with a blue background",
      projectId: "test-project-id"
    },
    id: crypto.randomUUID(),
    from: "TestHarness",
    to: "CoordinatorAgent"
  };
  
  console.log("Sending test message to CoordinatorAgent...");
  console.log("Task ID:", taskId);
  
  // Process the message
  const response = await coordinatorAgent.processMessage(testMessage);
  
  console.log("\n=== CoordinatorAgent Response ===");
  if (response) {
    console.log("Response type:", response.type);
    console.log("To agent:", response.to);
    console.log("Task ID:", response.payload.taskId);
    console.log("Artifacts:", response.artifacts ? response.artifacts.length : 0);
  } else {
    console.log("No response received");
  }
  
  // Wait for messages to be processed
  console.log("\nWaiting for 5 seconds to allow message processing...");
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Dump the final state
  console.log("\n=== Final State ===");
  console.log("Tasks:", taskManager.tasks.size);
  console.log("Messages:", messageBus.messages.length);
  console.log("Artifacts:", Array.from(taskManager.artifacts.keys()).length);
  
  // Show task state
  console.log("\n=== Task State ===");
  const task = taskManager.tasks.get(taskId);
  if (task) {
    console.log("Status:", task.state);
    console.log("Last message:", task.message ? JSON.stringify(task.message) : "None");
  } else {
    console.log("Task not found!");
  }
}

// Run the test
testCoordinatorAgent().catch(console.error); 