import { eq } from "drizzle-orm";
import crypto from "crypto";
import { db } from "~/server/db";
import { customComponentJobs, agentMessages } from "~/server/db/schema";
import type { 
  TaskState, 
  TaskStatus, 
  Task, 
  Message, 
  Artifact, 
  ComponentJobStatus,
  SSEEvent
} from "~/types/a2a";
import { 
  mapInternalToA2AState,
  mapA2AToInternalState,
  createTextMessage,
  createFileArtifact
} from "~/types/a2a";
import { Subject } from "rxjs";

/**
 * Updates for TaskManager callbacks
 */
interface TaskUpdateCallback {
  (update: TaskUpdate): void;
}

interface TaskUpdate {
  type: 'status' | 'artifact';
  state?: TaskState;
  message?: Message;
  artifact?: Artifact;
}

/**
 * Task Manager Service
 * 
 * Manages A2A-compliant tasks for component generation
 */
export class TaskManager {
  private static instance: TaskManager;
  private taskSubscriptions: Map<string, Set<TaskUpdateCallback>> = new Map();
  private taskStreams: Map<string, Subject<SSEEvent>> = new Map();
  
  private constructor() {}
  
  /**
   * Get the singleton instance of TaskManager
   */
  public static getInstance(): TaskManager {
    if (!TaskManager.instance) {
      TaskManager.instance = new TaskManager();
    }
    return TaskManager.instance;
  }
  
  /**
   * Create a new A2A task based on a component generation request
   */
  async createTask(projectId: string, params: Record<string, any>): Promise<Task> {
    // Generate a task ID (different from component job ID)
    const taskId = crypto.randomUUID();
    
    // Create the initial message
    const initialMessage = params.message || 
      createTextMessage("Task created for component generation");
    
    // Default task status
    const taskStatus: TaskStatus = {
      id: taskId,
      state: 'submitted',
      updatedAt: new Date().toISOString(),
      message: initialMessage
    };
    
    // Create the task in database
    const result = await db.insert(customComponentJobs).values({
      id: taskId,
      projectId,
      effect: params.effect || 'Custom Component',
      status: 'pending', // Internal status
      metadata: params,
      taskState: taskStatus,
      createdAt: new Date()
    }).returning({ id: customComponentJobs.id });
    
    // Create initial task object
    const task: Task = {
      id: taskId,
      status: {
        id: taskId,
        state: 'submitted',
        updatedAt: new Date().toISOString(),
        message: initialMessage
      },
      createdAt: new Date().toISOString()
    };
    
    // Notify subscribers
    this.notifyTaskUpdate(taskId, { 
      type: 'status', 
      state: 'submitted',
      message: initialMessage
    });
    
    return task;
  }
  
  /**
   * Get a task's current status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    const component = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, taskId)
    });
    
    if (!component) {
      // Return unknown status if task not found
      return {
        id: taskId,
        state: 'unknown',
        updatedAt: new Date().toISOString()
      };
    }
    
    // Return stored task state or build it from internal status
    if (component.taskState) {
      return component.taskState as TaskStatus;
    } else {
      // Infer A2A state from internal status
      const state = mapInternalToA2AState(component.status as ComponentJobStatus);
      
      return {
        id: taskId,
        state,
        updatedAt: component.updatedAt?.toISOString() || component.createdAt.toISOString(),
        message: component.errorMessage ? 
          createTextMessage(component.errorMessage) : undefined,
        artifacts: component.artifacts as Artifact[] || undefined
      };
    }
  }
  
  /**
   * Update a task's status
   */
  async updateTaskStatus(
    taskId: string, 
    state: TaskState, 
    internalStatus: ComponentJobStatus | null = null, 
    message?: Message
  ): Promise<void> {
    // Get the current component job
    const component = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, taskId)
    });
    
    if (!component) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Set internal status based on A2A state if not provided
    const newInternalStatus = internalStatus || mapA2AToInternalState(state);
    
    // Create the updated task status
    const updatedAt = new Date();
    const taskStatus: TaskStatus = {
      id: taskId,
      state,
      updatedAt: updatedAt.toISOString(),
      message
    };
    
    // Update the task in database
    await db.update(customComponentJobs)
      .set({ 
        status: newInternalStatus,
        taskState: taskStatus,
        updatedAt
      })
      .where(eq(customComponentJobs.id, taskId));
    
    // We don't currently use history tracking in our schema
    // This would require schema changes if we want to add this feature
    
    // Notify subscribers of status change
    this.notifyTaskUpdate(taskId, { 
      type: 'status', 
      state,
      message
    });
    
    // Emit SSE event if there are subscribers
    if (this.taskStreams.has(taskId)) {
      const stream = this.taskStreams.get(taskId)!;
      // Create a properly typed SSE status update event
const statusEvent: SSEEvent = {
  id: crypto.randomUUID(),
  event: 'status',
  data: JSON.stringify({
    taskId: taskId,
    state,
    message,
    updatedAt: new Date().toISOString()
  })
};
stream.next(statusEvent);
      
      // If this is a terminal state, complete the stream
      if (['completed', 'failed', 'canceled'].includes(state)) {
        stream.complete();
        this.taskStreams.delete(taskId);
      }
    }
  }
  
  /**
   * Add an artifact to a task
   */
  async addTaskArtifact(taskId: string, artifact: Artifact): Promise<void> {
    const component = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, taskId)
    });
    
    if (!component) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Add artifact to the artifacts array
    const artifacts = component.artifacts ? 
      [...(component.artifacts as Artifact[]), artifact] : 
      [artifact];
    
    // Update the task
    await db.update(customComponentJobs)
      .set({ 
        artifacts,
        updatedAt: new Date()
      })
      .where(eq(customComponentJobs.id, taskId));
    
    // Notify subscribers of new artifact
    this.notifyTaskUpdate(taskId, { 
      type: 'artifact', 
      artifact
    });
    
    // Emit SSE event if there are subscribers
    if (this.taskStreams.has(taskId)) {
      const stream = this.taskStreams.get(taskId)!;
      // Create a properly typed SSE artifact update event
const artifactEvent: SSEEvent = {
  id: crypto.randomUUID(),
  event: 'artifact',
  data: JSON.stringify({
    taskId: taskId,
    artifact
  })
};
stream.next(artifactEvent);
    }
  }
  
  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<void> {
    const component = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, taskId)
    });
    
    if (!component) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Cannot cancel tasks that are already in terminal state
    const currentTaskState = component.taskState as TaskStatus | null;
    if (currentTaskState && ['completed', 'failed', 'canceled'].includes(currentTaskState.state)) {
      throw new Error(`Cannot cancel task in state: ${currentTaskState.state}`);
    }
    
    // Update task status to canceled
    const cancelMessage = createTextMessage("Task was canceled");
    await this.updateTaskStatus(taskId, 'canceled', 'failed', cancelMessage);
    
    // Store cancellation event in agent messages
    await db.insert(agentMessages).values({
      id: crypto.randomUUID(),
      sender: 'user',
      recipient: 'TaskManager',
      type: 'TASK_CANCELED',
      payload: { taskId },
      status: 'processed',
      createdAt: new Date(),
      processedAt: new Date()
    });
  }
  
  /**
   * Submit input for a task that requires it
   */
  async submitTaskInput(taskId: string, message: Message): Promise<void> {
    const component = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, taskId)
    });
    
    if (!component) {
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Task must be in 'input-required' state
    const currentTaskState = component.taskState as TaskStatus | null;
    if (!currentTaskState || currentTaskState.state !== 'input-required') {
      throw new Error(`Task is not waiting for input, current state: ${currentTaskState?.state || 'unknown'}`);
    }
    
    // Store the input message
    await db.insert(agentMessages).values({
      id: crypto.randomUUID(),
      sender: 'user',
      recipient: 'TaskManager',
      type: 'TASK_INPUT',
      payload: { taskId, message },
      status: 'pending',
      createdAt: new Date()
    });
    
    // Update task to 'working' state
    await this.updateTaskStatus(
      taskId, 
      'working',
      'generating',
      createTextMessage("Processing user input")
    );
  }
  
  /**
   * Subscribe to task updates
   */
  subscribeToTaskUpdates(taskId: string, callback: TaskUpdateCallback): () => void {
    let subscribers = this.taskSubscriptions.get(taskId);
    
    if (!subscribers) {
      subscribers = new Set();
      this.taskSubscriptions.set(taskId, subscribers);
    }
    
    subscribers.add(callback);
    
    // Return unsubscribe function
    return () => {
      const subscribers = this.taskSubscriptions.get(taskId);
      if (subscribers) {
        subscribers.delete(callback);
        if (subscribers.size === 0) {
          this.taskSubscriptions.delete(taskId);
        }
      }
    };
  }
  
  /**
   * Create an SSE stream for a task
   */
  createTaskStream(taskId: string): Subject<SSEEvent> {
    // If stream already exists, return it
    if (this.taskStreams.has(taskId)) {
      return this.taskStreams.get(taskId)!;
    }
    
    // Create a new stream
    const stream = new Subject<SSEEvent>();
    this.taskStreams.set(taskId, stream);
    
    // Return the stream
    return stream;
  }
  
  /**
   * Notify subscribers of task updates
   */
  private notifyTaskUpdate(taskId: string, update: TaskUpdate): void {
    const subscribers = this.taskSubscriptions.get(taskId);
    if (subscribers) {
      subscribers.forEach(callback => {
        try {
          callback(update);
        } catch (error) {
          console.error(`Error in task update callback for task ${taskId}:`, error);
        }
      });
    }
  }
}

// Export singleton instance
export const taskManager = TaskManager.getInstance(); 