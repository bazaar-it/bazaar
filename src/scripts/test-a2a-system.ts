// @ts-nocheck
// src/scripts/test-a2a-system.ts
import { type BaseAgent } from "~/server/agents/base-agent";
import { ADBAgent } from "~/server/agents/adb-agent";
import { CoordinatorAgent } from "~/server/agents/coordinator-agent";
import { ScenePlannerAgent } from "~/server/agents/scene-planner-agent";
import { BuilderAgent } from "~/server/agents/builder-agent";
import { ErrorFixerAgent } from "~/server/agents/error-fixer-agent";
import { TaskManager } from "~/server/services/a2a/taskManager.service";
import { MessageBus } from "~/server/services/a2a/messageBus.service";
import { createTextMessage, createFileArtifact, type Message, type TaskState } from "~/types/a2a";
import crypto from "crypto";
import { a2aLogger } from "~/lib/logger";

// In-memory database mock
class MockDatabase {
  private tasks: Record<string, any> = {};
  private messages: any[] = [];
  private artifacts: Record<string, any> = {};

  async createTask(task: any): Promise<any> {
    this.tasks[task.id] = task;
    return task;
  }

  async updateTask(id: string, data: any): Promise<any> {
    this.tasks[id] = { ...this.tasks[id], ...data };
    return this.tasks[id];
  }

  async getTask(id: string): Promise<any> {
    return this.tasks[id];
  }

  async logMessage(message: any): Promise<any> {
    this.messages.push(message);
    return message;
  }

  async createArtifact(artifact: any): Promise<any> {
    this.artifacts[artifact.id] = artifact;
    return artifact;
  }

  async linkArtifactToTask(taskId: string, artifactId: string): Promise<void> {
    if (!this.tasks[taskId].artifacts) this.tasks[taskId].artifacts = [];
    this.tasks[taskId].artifacts.push(artifactId);
  }

  // Debugging helpers
  dumpTasks(): void {
    console.log("=== TASKS ===");
    Object.values(this.tasks).forEach(task => {
      console.log(`Task ${task.id}: ${task.state}`);
    });
  }

  dumpMessages(): void {
    console.log("=== MESSAGES ===");
    this.messages.forEach((msg, i) => {
      console.log(`Message ${i}: ${msg.type} from ${msg.from} to ${msg.to}`);
    });
  }

  dumpArtifacts(): void {
    console.log("=== ARTIFACTS ===");
    Object.values(this.artifacts).forEach(artifact => {
      console.log(`Artifact ${artifact.id}: ${artifact.type} - ${artifact.name}`);
    });
  }
}

// Mock TaskManager that uses in-memory database
class MockTaskManager extends TaskManager {
  private mockDb: MockDatabase;
  private listeners: Record<string, Function[]> = {};

  constructor(mockDb: MockDatabase) {
    // @ts-ignore - We're mocking the parent class
    super();
    this.mockDb = mockDb;
  }

  async createTask(taskData: any): Promise<any> {
    const task = {
      id: taskData.id || crypto.randomUUID(),
      state: 'submitted',
      createdAt: new Date().toISOString(),
      ...taskData
    };
    return this.mockDb.createTask(task);
  }

  async updateTaskStatus(taskId: string, state: TaskState, message?: any, metadata?: any): Promise<any> {
    const update = { state, updatedAt: new Date().toISOString() };
    if (message) update.message = message;
    if (metadata) update.metadata = metadata;
    
    const task = await this.mockDb.updateTask(taskId, update);
    
    // Notify listeners
    this.emitTaskStatusUpdate(taskId, { state, message, metadata });
    
    return task;
  }

  async getTask(taskId: string): Promise<any> {
    return this.mockDb.getTask(taskId);
  }

  async logTaskMessage(taskId: string, message: any): Promise<any> {
    message.taskId = taskId;
    message.timestamp = new Date().toISOString();
    return this.mockDb.logMessage(message);
  }

  async addTaskArtifact(taskId: string, artifact: any): Promise<any> {
    if (!artifact.id) artifact.id = crypto.randomUUID();
    await this.mockDb.createArtifact(artifact);
    await this.mockDb.linkArtifactToTask(taskId, artifact.id);
    return artifact;
  }

  subscribeToTaskUpdates(taskId: string, callback: Function): () => void {
    if (!this.listeners[taskId]) this.listeners[taskId] = [];
    this.listeners[taskId].push(callback);
    
    return () => {
      this.listeners[taskId] = this.listeners[taskId].filter(cb => cb !== callback);
    };
  }

  emitTaskStatusUpdate(taskId: string, update: any): void {
    if (this.listeners[taskId]) {
      this.listeners[taskId].forEach(callback => {
        callback({ type: 'status', data: update });
      });
    }
  }
}

// Mock MessageBus
class MockMessageBus extends MessageBus {
  private agents: Record<string, BaseAgent> = {};
  private mockDb: MockDatabase;

  constructor(mockDb: MockDatabase) {
    // @ts-ignore - We're mocking the parent class
    super();
    this.mockDb = mockDb;
  }

  registerAgent(agent: BaseAgent): void {
    this.agents[agent.name] = agent;
    console.log(`Registered agent: ${agent.name}`);
  }

  async sendMessage(message: any): Promise<void> {
    await this.mockDb.logMessage(message);
    
    if (this.agents[message.to]) {
      console.log(`Routing message from ${message.from} to ${message.to}`);
      // Convert to the expected format for the agent's processMessage method
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
      
      // Process the message asynchronously
      setTimeout(() => {
        this.agents[message.to].processMessage(agentMessage).catch(err => {
          console.error(`Error processing message in ${message.to}:`, err);
        });
      }, 0);
    } else {
      console.warn(`No agent registered for ${message.to}`);
    }
  }
}

// Initialize the mock system
async function initializeMockA2ASystem() {
  const mockDb = new MockDatabase();
  const mockTaskManager = new MockTaskManager(mockDb);
  const mockMessageBus = new MockMessageBus(mockDb);

  // Create agents
  const coordinatorAgent = new CoordinatorAgent(mockTaskManager);
  const scenePlannerAgent = new ScenePlannerAgent(mockTaskManager);
  const adbAgent = new ADBAgent(mockTaskManager);
  const builderAgent = new BuilderAgent(mockTaskManager);
  const errorFixerAgent = new ErrorFixerAgent(mockTaskManager);

  // Register agents with message bus
  mockMessageBus.registerAgent(coordinatorAgent);
  mockMessageBus.registerAgent(scenePlannerAgent);
  mockMessageBus.registerAgent(adbAgent);
  mockMessageBus.registerAgent(builderAgent);
  mockMessageBus.registerAgent(errorFixerAgent);

  return {
    mockDb,
    mockTaskManager,
    mockMessageBus,
    agents: {
      coordinatorAgent,
      scenePlannerAgent,
      adbAgent,
      builderAgent,
      errorFixerAgent
    }
  };
}

// Test the system
async function testA2ASystem() {
  console.log("Initializing mock A2A system...");
  const system = await initializeMockA2ASystem();
  
  // Create a test task
  const taskId = crypto.randomUUID();
  console.log(`Creating test task with ID: ${taskId}`);
  
  await system.mockTaskManager.createTask({
    id: taskId,
    projectId: "test-project-id",
    message: createTextMessage("Create a 5-second video of a bouncing ball with a blue background")
  });
  
  // Submit to coordinator agent
  console.log("Submitting task to CoordinatorAgent...");
  const message = {
    taskId,
    from: "TestHarness",
    to: "CoordinatorAgent",
    type: "NEW_TASK",
    content: "Create a 5-second video of a bouncing ball with a blue background",
    metadata: {
      projectId: "test-project-id",
      priority: "high"
    }
  };
  
  await system.mockMessageBus.sendMessage(message);
  
  // Set up listeners to monitor task progress
  system.mockTaskManager.subscribeToTaskUpdates(taskId, (update) => {
    console.log(`[${new Date().toISOString()}] Task ${taskId} update:`, update.data.state);
    if (update.data.message) {
      console.log("Message:", typeof update.data.message === 'string' 
        ? update.data.message 
        : JSON.stringify(update.data.message, null, 2));
    }
  });
  
  // Monitor for 30 seconds then dump the state
  console.log("Monitoring task for 30 seconds...");
  setTimeout(() => {
    system.mockDb.dumpTasks();
    system.mockDb.dumpMessages();
    system.mockDb.dumpArtifacts();
    console.log("Test completed.");
  }, 30000);
}

// Run the test
try {
  testA2ASystem().catch(err => {
    console.error("Error in A2A system test:", err);
  });
} catch (error) {
  console.error("Fatal error:", error);
} 