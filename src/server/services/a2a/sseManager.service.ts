// src/server/services/a2a/sseManager.service.ts

/**
 * SSE Manager Service
 * 
 * Provides Server-Sent Events (SSE) functionality for A2A protocol
 * to deliver real-time updates about task status and artifacts.
 * @see https://github.com/google/A2A/blob/main/docs/streaming.md
 */

import { Subject, Observable, Subscription } from 'rxjs';
import type { TaskState, Message, Artifact } from '~/types/a2a';

/**
 * Event types for SSE
 */
export enum SSEEventType {
  TaskStatusUpdate = 'task_status_update',
  TaskArtifactUpdate = 'task_artifact_update',
  AgentCommunication = 'agent_communication',
  Error = 'error',
  Heartbeat = 'heartbeat'
}

/**
 * Base interface for SSE events
 */
export interface BaseSSEEvent {
  type: SSEEventType;
  timestamp: string;
}

/**
 * Task status update event
 */
export interface TaskStatusUpdateEvent extends BaseSSEEvent {
  type: SSEEventType.TaskStatusUpdate;
  data: {
    task_id: string;
    state: TaskState;
    message?: Message;
  };
}

/**
 * Task artifact update event
 */
export interface TaskArtifactUpdateEvent extends BaseSSEEvent {
  type: SSEEventType.TaskArtifactUpdate;
  data: {
    task_id: string;
    artifact: Artifact;
  };
}

/**
 * Error event
 */
export interface ErrorEvent extends BaseSSEEvent {
  type: SSEEventType.Error;
  error: {
    code: string;
    message: string;
  };
}

/**
 * Heartbeat event to keep the connection alive
 */
export interface HeartbeatEvent extends BaseSSEEvent {
  type: SSEEventType.Heartbeat;
}

/**
 * Agent communication event for tracking agent messages
 */
export interface AgentCommunicationEvent extends BaseSSEEvent {
  type: SSEEventType.AgentCommunication;
  data: {
    from: string;
    to: string;
    messageType: string;
    timestamp: string;
    taskId: string;
    payload?: any;
  };
}

/**
 * Union type for all SSE events
 */
export type SSEEvent = TaskStatusUpdateEvent | TaskArtifactUpdateEvent | AgentCommunicationEvent | ErrorEvent | HeartbeatEvent;

/**
 * Client connection information
 */
interface ClientConnection {
  id: string;
  stream: Subject<SSEEvent>;
  tasks: Set<string>;
  lastEventId?: string;
  heartbeatInterval?: NodeJS.Timeout;
}

/**
 * SSE Manager Service
 * 
 * Manages SSE connections and event publishing for real-time updates
 */
export class SSEManagerService {
  private static instance: SSEManagerService;
  
  // Active client connections
  private clients: Map<string, ClientConnection> = new Map();
  
  // Task subscribers - maps task IDs to client IDs
  private taskSubscriptions: Map<string, Set<string>> = new Map();
  
  // Heartbeat interval in ms (30 seconds)
  private readonly HEARTBEAT_INTERVAL = 30000;
  
  private constructor() {}
  
  /**
   * Get singleton instance
   */
  public static getInstance(): SSEManagerService {
    if (!SSEManagerService.instance) {
      SSEManagerService.instance = new SSEManagerService();
    }
    return SSEManagerService.instance;
  }
  
  /**
   * Create a new client connection
   * @returns Client ID and Observable stream for SSE events
   */
  public createConnection(): { clientId: string; stream: Observable<SSEEvent> } {
    const clientId = this.generateClientId();
    const stream = new Subject<SSEEvent>();
    
    // Set up heartbeat
    const heartbeatInterval = setInterval(() => {
      this.sendHeartbeat(clientId);
    }, this.HEARTBEAT_INTERVAL);
    
    // Store client connection
    this.clients.set(clientId, {
      id: clientId,
      stream,
      tasks: new Set(),
      heartbeatInterval
    });
    
    // Return client ID and observable
    return {
      clientId,
      stream: stream.asObservable()
    };
  }
  
  /**
   * Subscribe a client to task updates
   * @param clientId Client ID
   * @param taskId Task ID
   */
  public subscribeToTask(clientId: string, taskId: string): void {
    // Get client connection
    const client = this.clients.get(clientId);
    if (!client) {
      throw new Error(`Client not found: ${clientId}`);
    }
    
    // Add task to client's subscriptions
    client.tasks.add(taskId);
    
    // Add client to task's subscribers
    let subscribers = this.taskSubscriptions.get(taskId);
    if (!subscribers) {
      subscribers = new Set();
      this.taskSubscriptions.set(taskId, subscribers);
    }
    subscribers.add(clientId);
  }
  
  /**
   * Unsubscribe a client from task updates
   * @param clientId Client ID
   * @param taskId Task ID
   */
  public unsubscribeFromTask(clientId: string, taskId: string): void {
    // Get client connection
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }
    
    // Remove task from client's subscriptions
    client.tasks.delete(taskId);
    
    // Remove client from task's subscribers
    const subscribers = this.taskSubscriptions.get(taskId);
    if (subscribers) {
      subscribers.delete(clientId);
      if (subscribers.size === 0) {
        this.taskSubscriptions.delete(taskId);
      }
    }
  }
  
  /**
   * Close a client connection
   * @param clientId Client ID
   */
  public closeConnection(clientId: string): void {
    // Get client connection
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }
    
    // Clear heartbeat interval
    if (client.heartbeatInterval) {
      clearInterval(client.heartbeatInterval);
    }
    
    // Remove client from all task subscriptions
    client.tasks.forEach(taskId => {
      const subscribers = this.taskSubscriptions.get(taskId);
      if (subscribers) {
        subscribers.delete(clientId);
        if (subscribers.size === 0) {
          this.taskSubscriptions.delete(taskId);
        }
      }
    });
    
    // Complete the stream
    client.stream.complete();
    
    // Remove client
    this.clients.delete(clientId);
  }
  
  /**
   * Publish a task status update
   * @param taskId Task ID
   * @param state Task state
   * @param message Optional message
   */
  public publishTaskStatusUpdate(taskId: string, state: TaskState, message?: Message): void {
    // Create event
    const event: TaskStatusUpdateEvent = {
      type: SSEEventType.TaskStatusUpdate,
      timestamp: new Date().toISOString(),
      data: {
        task_id: taskId,
        state,
        message
      }
    };
    
    // Send to subscribers
    this.publishToTaskSubscribers(taskId, event);
  }
  
  /**
   * Publish a task artifact update
   * @param taskId Task ID
   * @param artifact Artifact
   */
  public publishTaskArtifactUpdate(taskId: string, artifact: Artifact): void {
    // Create event
    const event: TaskArtifactUpdateEvent = {
      type: SSEEventType.TaskArtifactUpdate,
      timestamp: new Date().toISOString(),
      data: {
        task_id: taskId,
        artifact
      }
    };
    
    // Send to subscribers
    this.publishToTaskSubscribers(taskId, event);
  }
  
  /**
   * Publish an error event to a specific client
   * @param clientId Client ID
   * @param code Error code
   * @param message Error message
   */
  public publishErrorToClient(clientId: string, code: string, message: string): void {
    // Get client connection
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }
    
    // Create event
    const event: ErrorEvent = {
      type: SSEEventType.Error,
      timestamp: new Date().toISOString(),
      error: {
        code,
        message
      }
    };
    
    // Send to client
    client.stream.next(event);
  }
  
  /**
   * Send a heartbeat to keep the connection alive
   * @param clientId Client ID
   */
  private sendHeartbeat(clientId: string): void {
    // Get client connection
    const client = this.clients.get(clientId);
    if (!client) {
      return;
    }
    
    // Create heartbeat event
    const event: HeartbeatEvent = {
      type: SSEEventType.Heartbeat,
      timestamp: new Date().toISOString()
    };
    
    // Send to client
    client.stream.next(event);
  }
  
  /**
   * Publish an event to all subscribers of a task
   * @param taskId Task ID
   * @param event Event to publish
   */
  private publishToTaskSubscribers(taskId: string, event: SSEEvent): void {
    // Get subscribers
    const subscribers = this.taskSubscriptions.get(taskId);
    if (!subscribers || subscribers.size === 0) {
      return;
    }
    
    // Send to all subscribers
    subscribers.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (client) {
        client.stream.next(event);
        client.lastEventId = event.timestamp;
      }
    });
  }
  
  /**
   * Generate a unique client ID
   */
  private generateClientId(): string {
    return `client-${Math.random().toString(36).substring(2, 15)}`;
  }
}

// Export singleton instance
export const sseManager = SSEManagerService.getInstance();
