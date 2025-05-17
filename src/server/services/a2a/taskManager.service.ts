import { eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
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
import { a2aLogger } from "~/lib/logger";
import { env } from '~/env';
import { TRPCError } from '@trpc/server';

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
  artifact?: Artifact; // For single artifact notification
  artifacts?: Artifact[]; // For status update with multiple artifacts or when task completes
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
  private newTaskCreatedSubject = new Subject<string>();
  
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
   * Subscribe to notifications for all newly created A2A tasks.
   * @param callback Function to call with the taskId of the new task.
   * @returns A subscription object with an unsubscribe method.
   */
  public onNewTaskCreated(callback: (taskId: string) => void): { unsubscribe: () => void } {
    const subscription = this.newTaskCreatedSubject.subscribe(callback);
    return { unsubscribe: () => subscription.unsubscribe() };
  }
  
  /**
   * Create a new A2A task based on a component generation request
   */
  async createTask(projectId: string, params: Record<string, any>): Promise<Task> {
    // Generate a task ID (different from component job ID)
    const taskId = uuidv4();
    a2aLogger.taskCreate(taskId, `Attempting to create task for project ${projectId}`, { projectId, params });
    
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
      taskId: taskId, // Make sure task_id column is explicitly set
      sseEnabled: true, // Enable SSE for this task
      createdAt: new Date()
    }).returning({ id: customComponentJobs.id });
    
    // Create initial task object
    const task: Task = {
      id: taskId,
      state: 'submitted',
      message: initialMessage,
      artifacts: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    a2aLogger.taskCreate(taskId, `Successfully created task. Initial state: submitted.`, { createdTask: task });
    // Notify subscribers
    this.notifyTaskUpdate(taskId, { 
      type: 'status', 
      state: 'submitted',
      message: initialMessage
    });

    // Emit event for new task creation
    this.newTaskCreatedSubject.next(taskId);
    a2aLogger.info(taskId, `Emmitted newTaskCreated event for reactive processing.`);
    
    return task;
  }
  
  /**
   * Retrieves a task by its ID
   * @param taskId The ID of the task to retrieve
   * @returns The task object or null if not found
   */
  public async getTaskById(taskId: string) { // Explicitly public
    a2aLogger.info(taskId, `Attempting to retrieve task by ID.`);
    try {
      const component = await db.query.customComponentJobs.findFirst({
        where: eq(customComponentJobs.id, taskId)
      });
      
      if (!component) {
        return null;
      }
      
      // If taskState exists, ensure it's properly typed
      if (component.taskState && typeof component.taskState === 'object') {
        // Return the task with properly typed taskState
        return {
          ...component,
          taskState: component.taskState as TaskStatus
        };
      }
      
      // Build task state from internal status
      const state = mapInternalToA2AState(component.status as ComponentJobStatus);
      
      // Create the task state
      const taskState: TaskStatus = {
        id: taskId,
        state,
        updatedAt: component.updatedAt?.toISOString() || component.createdAt.toISOString(),
        message: component.errorMessage ? 
          createTextMessage(component.errorMessage) : undefined,
        artifacts: component.artifacts as Artifact[] || undefined
      };
      
      // Return the component with the new task state
      return {
        ...component,
        taskState
      };
    } catch (error) {
      a2aLogger.error(taskId, `Error retrieving task: ${error instanceof Error ? error.message : String(error)}`, error);
      return null;
    }
  }
  
  /**
   * Gets the status of a task
   * @param taskId Task ID to query
   * @returns TaskStatus object with task state and outputs
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus> {
    // Check log level - only log fetches if not in production or if in debug mode
    const shouldLog = env.NODE_ENV !== 'production' || process.env.TRPC_DEBUG === 'true';
    
    if (shouldLog) {
      a2aLogger.info(taskId, 'Fetching task status.');
    }

    try {
      // Fetch the task from the database
      const task = await this.getTaskById(taskId);
      
      if (!task) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: `Task with ID ${taskId} not found.`
        });
      }
      
      // Return the task state
      return task.taskState as TaskStatus;
    } catch (error) {
      // Handle errors
      if (error instanceof TRPCError) {
        throw error;
      }
      
      a2aLogger.error(taskId, `Error fetching task status: ${error instanceof Error ? error.message : String(error)}`, error);
      throw new TRPCError({
        code: 'INTERNAL_SERVER_ERROR',
        message: `Failed to fetch task status: ${error instanceof Error ? error.message : String(error)}`
      });
    }
  }
  
  /**
   * Update the status of a specific A2A task in the database and notify subscribers.
   *
   * @param taskId The ID of the task to update.
   * @param a2aState The new A2A state (e.g., 'working', 'completed', 'failed').
   * @param message A Message object describing the update, or a string to be converted.
   * @param artifacts Optional array of artifacts associated with this update.
   * @param isInternalStateUpdate If true, signifies an update to internal taskState rather than primary component job status.
   */
  async updateTaskStatus(
    taskId: string, 
    a2aState: TaskState, 
    // Allow message to be a string for convenience, will be wrapped by createTextMessage
    message: Message | string, 
    artifacts?: Artifact[],
    isInternalStateUpdate?: boolean // Used by TaskProcessor's updateTaskState wrapper
  ): Promise<void> {
    a2aLogger.info(taskId, `Updating task status to A2A state: ${a2aState}`, { message, artifacts, isInternalStateUpdate });

    const finalMessage = typeof message === 'string' ? createTextMessage(message) : message;

    // Map A2A state to internal database status
    // The `status` field in `customComponentJobs` is our internal representation.
    // The `taskState` JSONB field in `customComponentJobs` holds the A2A TaskStatus object.
    const internalDbStatus = mapA2AToInternalState(a2aState);

    const currentJob = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, taskId),
    });

    if (!currentJob) {
      a2aLogger.error(taskId, `Task not found during updateTaskStatus to ${a2aState}`);
      throw new Error(`Task not found: ${taskId}`);
    }

    // Safely access and update the taskState JSONB field
    let currentA2ATaskStatus = currentJob.taskState as TaskStatus | null;
    if (typeof currentA2ATaskStatus === 'string') { // Handle cases where it might be a string due to old data or error
        try {
            currentA2ATaskStatus = JSON.parse(currentA2ATaskStatus) as TaskStatus;
        } catch (e) {
            a2aLogger.warn(taskId, "Failed to parse taskState string, re-initializing.", { currentTaskState: currentJob.taskState });
            currentA2ATaskStatus = null;
        }
    }

    const newA2ATaskStatus: TaskStatus = {
      ...(currentA2ATaskStatus || {}), // Spread existing status or empty object
      id: taskId,
      state: a2aState,
      message: finalMessage,
      updatedAt: new Date().toISOString(),
      ...(artifacts && artifacts.length > 0 && { artifacts }), // Conditionally add artifacts
    };

    try {
      await db.update(customComponentJobs)
        .set({
          status: internalDbStatus, // Update internal status field
          taskState: newA2ATaskStatus, // Update the A2A TaskStatus object
          updatedAt: new Date(),
        })
        .where(eq(customComponentJobs.id, taskId));

      a2aLogger.info(taskId, `Task status updated successfully in DB. Internal: ${internalDbStatus}, A2A: ${a2aState}`);
      
      // Notify subscribers AFTER successful DB update
      this.notifyTaskUpdate(taskId, { 
        type: 'status', 
        state: a2aState,
        message: finalMessage,
        ...(artifacts && artifacts.length > 0 && { artifacts }),
        // Removed 'updatedAt' as it's not part of TaskUpdate interface
      });

      // If SSE is enabled for this task, send an update
      if (currentJob.sseEnabled) {
        const sseStream = this.taskStreams.get(taskId);
        if (sseStream) {
          sseStream.next({ 
            id: uuidv4(), // Added id for SSEEvent
            event: 'status_update', 
            data: JSON.stringify({ 
              taskId, 
              state: a2aState, 
              message: finalMessage, 
              artifacts 
            })
          });
        }
      }

    } catch (dbError) {
      a2aLogger.error(taskId, `Database error updating task status to ${a2aState}`, { error: dbError });
      // Potentially throw or handle more gracefully depending on requirements
      throw dbError;
    }
  }

  /**
   * Add an artifact to a task
   */
  async addTaskArtifact(taskId: string, artifact: Artifact): Promise<void> {
    a2aLogger.info(taskId, `Adding artifact to task`, { artifactId: artifact.id, artifactType: artifact.type });
    const component = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, taskId)
    });

    if (!component) {
      a2aLogger.error(taskId, `Task not found when attempting to add artifact.`);
      throw new Error(`Task not found: ${taskId}`);
    }

    let currentTaskState = component.taskState as TaskStatus | null;
    if (typeof currentTaskState === 'string') {
        try {
            currentTaskState = JSON.parse(currentTaskState) as TaskStatus;
        } catch (e) {
            a2aLogger.warn(taskId, "Failed to parse taskState string in addTaskArtifact, re-initializing.", { currentTaskState: component.taskState });
            currentTaskState = null;
        }
    }

    const existingArtifacts = currentTaskState?.artifacts || [];
    const updatedArtifacts = [...existingArtifacts, artifact];

    const updatedTaskState: TaskStatus = {
      ...(currentTaskState || { id: taskId, state: 'unknown', message: createTextMessage('Task state recovered during artifact addition') }), // Provide defaults if null
      updatedAt: new Date().toISOString(),
      artifacts: updatedArtifacts,
    };

    await db.update(customComponentJobs)
      .set({ taskState: updatedTaskState, updatedAt: new Date() })
      .where(eq(customComponentJobs.id, taskId));
    
    a2aLogger.info(taskId, `Artifact ${artifact.id} added successfully.`);
    // Notify subscribers about the new artifact
    this.notifyTaskUpdate(taskId, { type: 'artifact', artifact });

    // If SSE is enabled, send artifact update
    if (component.sseEnabled) {
        const sseStream = this.taskStreams.get(taskId);
        if (sseStream) {
            sseStream.next({ 
                id: uuidv4(), // Added id for SSEEvent
                event: 'artifact_added', 
                data: JSON.stringify({ taskId, artifact }) 
            });
        }
    }
  }

  /**
   * Cancel a task
   */
  async cancelTask(taskId: string): Promise<void> {
    const component = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, taskId)
    });
    a2aLogger.info(taskId, `Attempting to cancel task.`);

    if (!component) {
      a2aLogger.error(taskId, `Task not found when attempting to cancel.`);
      throw new Error(`Task not found: ${taskId}`);
    }
    
    const currentTaskState = component.taskState as TaskStatus | null;
    if (currentTaskState?.state === 'completed' || currentTaskState?.state === 'failed' || currentTaskState?.state === 'canceled') {
      a2aLogger.warn(taskId, `Task is already in a terminal state: ${currentTaskState.state}. Cannot cancel.`);
      throw new Error(`Cannot cancel task in state: ${currentTaskState.state}`);
    }
    
    // Update task status to canceled
    const cancelMessage = createTextMessage("Task was canceled");
    // Pass undefined for artifacts if not applicable
    await this.updateTaskStatus(taskId, 'canceled', cancelMessage, undefined);
    
    a2aLogger.info(taskId, `Task successfully canceled.`);
  }

  /**
   * Submit input for a task that requires it
   */
  async submitTaskInput(taskId: string, message: Message): Promise<void> {
    const component = await db.query.customComponentJobs.findFirst({
      where: eq(customComponentJobs.id, taskId)
    });
    a2aLogger.info(taskId, `Attempting to submit input for task.`);
    
    if (!component) {
      // Log error before throwing
      a2aLogger.error(taskId, `Task not found when attempting to submit input.`);
      throw new Error(`Task not found: ${taskId}`);
    }
    
    // Task must be in 'input-required' state
    const currentTaskState = component.taskState as TaskStatus | null;
    if (!currentTaskState || currentTaskState.state !== 'input-required') {
      throw new Error(`Task is not waiting for input, current state: ${currentTaskState?.state || 'unknown'}`);
    }
    
    // Store the input message
    await db.insert(agentMessages).values({
      id: uuidv4(),
      sender: 'user',
      recipient: 'TaskManager',
      type: 'TASK_INPUT',
      payload: { taskId, message },
      status: 'pending',
      createdAt: new Date()
    });
    
    // Update task to 'working' state
    // Pass undefined for artifacts if not applicable
    await this.updateTaskStatus(
      taskId, 
      'working',
      createTextMessage("Processing user input"),
      undefined 
    );
  }

  /**
   * Subscribe to task updates
   */
  subscribeToTaskUpdates(taskId: string, callback: TaskUpdateCallback): () => void {
    let subscribers = this.taskSubscriptions.get(taskId);
    a2aLogger.sseSubscription(taskId, `New internal subscription for task updates.`);
    
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
      a2aLogger.sseSubscription(taskId, `Returning existing SSE stream.`);
      return this.taskStreams.get(taskId)!;
    }
    
    a2aLogger.sseSubscription(taskId, `Creating new SSE stream.`);
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
      a2aLogger.info(taskId, `Notifying ${subscribers.size} internal subscribers of update.`, { updateType: update.type });
      subscribers.forEach(callback => {
        try {
          callback(update);
        } catch (error: any) { // Ensure error is typed
          console.error(`Error in task update callback for task ${taskId}:`, error);
          a2aLogger.error(taskId, "Error in task update callback", error);
        }
      });
    }
  }
}

// Export singleton instance
export const taskManager = TaskManager.getInstance(); 