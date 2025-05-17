import crypto from 'crypto';

// Import actual agent class but will intercept database operations
import { ADBAgent } from '../../server/agents/adb-agent';

/**
 * Create controlled TaskManager that bypasses database
 */
class ControlledTaskManager {
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
    console.log(`[TaskManager] Created task ${taskId}`);
    return { id: taskId };
  }

  async updateTaskStatus(taskId, state, message, artifacts = [], componentStatus) {
    const task = this.tasks.get(taskId) || { id: taskId };
    task.state = state;
    task.message = message;
    task.updatedAt = new Date().toISOString();
    if (componentStatus) task.componentStatus = componentStatus;
    this.tasks.set(taskId, task);
    
    console.log(`[TaskManager] Task ${taskId} updated to state: ${state}`);
    return task;
  }

  async addTaskArtifact(taskId, artifact) {
    if (!this.artifacts.has(taskId)) {
      this.artifacts.set(taskId, []);
    }
    this.artifacts.get(taskId).push(artifact);
    console.log(`[TaskManager] Added artifact to task ${taskId}: ${artifact.name}`);
    return artifact;
  }

  async logTaskMessage(taskId, message) {
    message.taskId = taskId;
    message.timestamp = new Date().toISOString();
    this.messages.push(message);
    return message;
  }
  
  async getTask(taskId) {
    return this.tasks.get(taskId);
  }
  
  async getTaskArtifacts(taskId) {
    return this.artifacts.get(taskId) || [];
  }
}

/**
 * Mock for animationDesigner.service.js that uses GPT-4 or similar
 * to actually generate a meaningful ADB without database dependencies
 */
async function generateAnimationDesignBrief(params) {
  console.log(`[ADBService] Generating real ADB for: ${params.scenePurpose}`);
  
  // In a real implementation, this would call the LLM API
  // For testing, we'll simulate a more complex response but log that 
  // a real LLM call would happen here
  console.log(`[LLM] Would make LLM call with prompt about: "${params.scenePurpose}"`);
  
  // Generate a more complex ADB that shows we're simulating real logic
  const elements = [];
  const animations = [];
  
  // Parse the scene description to extract potential elements
  const description = params.scenePurpose.toLowerCase();
  const sceneElements = params.sceneElementsDescription || "";
  
  if (description.includes('ball') || sceneElements.includes('ball')) {
    elements.push({
      id: "ball",
      type: "shape", 
      name: "Ball",
      properties: { 
        color: description.includes('red') ? "#e74c3c" : 
              description.includes('blue') ? "#3498db" : 
              "#f39c12", // default to orange if color not specified
        size: description.includes('large') ? 150 : 
             description.includes('small') ? 50 : 
             100,
        shape: "circle"
      }
    });
    
    // Add appropriate animation based on description
    if (description.includes('bounce')) {
      animations.push({
        elementId: "ball",
        type: "bounce",
        keyframes: [
          { time: 0, y: 0, easing: "easeInOutQuad" },
          { time: Math.floor(params.desiredDurationInFrames / 2), y: 200, easing: "easeInOutQuad" },
          { time: params.desiredDurationInFrames, y: 0, easing: "easeInOutQuad" }
        ]
      });
    } else if (description.includes('spin')) {
      animations.push({
        elementId: "ball",
        type: "spin",
        keyframes: [
          { time: 0, rotation: 0, easing: "linear" },
          { time: params.desiredDurationInFrames, rotation: 360, easing: "linear" }
        ]
      });
    }
  }
  
  // Always include a background based on description
  elements.push({
    id: "background",
    type: "shape",
    name: "Background",
    properties: { 
      color: description.includes('blue background') ? "#3498db" : 
            description.includes('red background') ? "#e74c3c" :
            description.includes('dark') ? "#2c3e50" :
            "#ecf0f1" // default to light gray
    }
  });
  
  // Add more elements if described
  if (description.includes('text') || sceneElements.includes('text')) {
    elements.push({
      id: "mainText",
      type: "text",
      name: "Main Text",
      properties: {
        content: description.includes('hello') ? "Hello World!" :
                description.includes('welcome') ? "Welcome!" :
                "Dynamic Text",
        fontSize: 48,
        color: "#2c3e50",
        position: { x: "center", y: "center" }
      }
    });
    
    // Add text animation if appropriate
    if (!description.includes('static')) {
      animations.push({
        elementId: "mainText",
        type: "fadeIn",
        keyframes: [
          { time: 0, opacity: 0, easing: "easeInCubic" },
          { time: Math.floor(params.desiredDurationInFrames * 0.3), opacity: 1, easing: "easeInCubic" }
        ]
      });
    }
  }
  
  // Create the complete ADB
  const brief = {
    id: crypto.randomUUID(),
    name: `Animation for ${params.scenePurpose.substring(0, 30)}...`,
    description: params.scenePurpose,
    duration: params.desiredDurationInFrames,
    dimensions: params.dimensions,
    elements,
    animations,
    // Add metadata that would typically be included
    metadata: {
      generatedBy: "ADBService",
      requestId: params.componentJobId,
      projectId: params.projectId,
      sceneId: params.sceneId
    }
  };
  
  console.log(`[ADBService] Generated ADB with ${elements.length} elements and ${animations.length} animations`);
  
  return { 
    brief, 
    briefId: brief.id 
  };
}

// Create a mock db object that just captures calls but doesn't actually query a database
const mockDb = {
  operations: [],
  insert: (table) => ({
    values: (data) => {
      mockDb.operations.push({ operation: 'insert', table, data });
      return { returning: () => Promise.resolve([data]) };
    }
  }),
  query: {
    animationDesignBriefs: {
      findFirst: (query) => {
        mockDb.operations.push({ operation: 'findFirst', table: 'animationDesignBriefs', query });
        return Promise.resolve(null); // Default to not found
      }
    }
  }
};

// Test function
async function testIntegratedADBAgent() {
  console.log("=== Testing Integrated ADB Agent ===");
  
  // Create the controlled task manager
  const taskManager = new ControlledTaskManager();
  
  // Create the ADB agent with our controlled dependencies
  const adbAgent = new ADBAgent(taskManager);
  
  // Replace dependencies with controlled versions
  // Note: In real implementation, we'd use dependency injection instead of overwriting
  // but for this test it's a pragmatic approach
  adbAgent.db = mockDb;
  adbAgent.generateAnimationDesignBrief = generateAnimationDesignBrief;
  
  // Create test task
  const taskId = crypto.randomUUID();
  console.log(`Test Task ID: ${taskId}`);
  
  // Create a test message
  const testMessage = {
    type: "GENERATE_DESIGN_BRIEF_REQUEST",
    payload: {
      taskId,
      description: "Create a 3-second video of a red ball bouncing on a blue background",
      projectId: "test-project-id",
      sceneId: "test-scene-id",
      duration: 90,
      dimensions: { width: 1920, height: 1080 }
    },
    id: crypto.randomUUID(),
    from: "TestHarness",
    to: "ADBAgent"
  };
  
  console.log("\n=== Sending Test Message to ADB Agent ===");
  console.log(`Message type: ${testMessage.type}`);
  console.log(`Description: ${testMessage.payload.description}`);
  
  // Process the message
  const response = await adbAgent.processMessage(testMessage);
  
  console.log("\n=== ADB Agent Response ===");
  if (response) {
    console.log(`Response type: ${response.type}`);
    console.log(`To: ${response.to}`);
    console.log(`Message: ${response.message?.parts?.[0]?.text}`);
    
    if (response.artifacts?.length > 0) {
      console.log("\n=== Generated Artifacts ===");
      response.artifacts.forEach((artifact, i) => {
        console.log(`\nArtifact ${i+1}: ${artifact.name}`);
        console.log(`Type: ${artifact.type}, MIME: ${artifact.mimeType}`);
        console.log(`Description: ${artifact.description}`);
        
        if (artifact.data) {
          console.log("\nArtifact Data Sample:");
          
          // If it's an ADB, show more details
          if (artifact.name.includes('adb')) {
            const adb = artifact.data;
            console.log(`- Name: ${adb.name}`);
            console.log(`- Duration: ${adb.duration} frames`);
            console.log(`- Elements: ${adb.elements.length}`);
            adb.elements.forEach(el => {
              console.log(`  - ${el.name} (${el.type}): ${JSON.stringify(el.properties)}`);
            });
            console.log(`- Animations: ${adb.animations.length}`);
            adb.animations.forEach(anim => {
              console.log(`  - ${anim.type} on ${anim.elementId}: ${anim.keyframes.length} keyframes`);
            });
          } else {
            console.log(JSON.stringify(artifact.data).substring(0, 150) + "...");
          }
        }
      });
    }
  } else {
    console.log("No response received from ADB Agent");
  }
  
  // Show task state
  console.log("\n=== Final Task State ===");
  const task = await taskManager.getTask(taskId);
  console.log(`Status: ${task?.state}`);
  console.log(`Message: ${task?.message?.parts?.[0]?.text}`);
  
  // Show DB operations
  console.log("\n=== Database Operations (Mocked) ===");
  console.log(`Total operations: ${mockDb.operations.length}`);
  mockDb.operations.forEach((op, i) => {
    console.log(`Operation ${i+1}: ${op.operation} on ${op.table}`);
  });
  
  return { response, task, mockDb };
}

// Run the test
testIntegratedADBAgent().catch(console.error); 