// src/server/services/a2a/taskProcessor.service.ts

import { db, executeWithRetry } from "~/server/db";
import { customComponentJobs } from "~/server/db/schema";
import { eq } from "drizzle-orm";
import { TaskManager } from "./taskManager.service";
import { v4 as uuidv4 } from "uuid";
import { a2aLogger } from "~/lib/logger";
import { env } from "~/env";
import { initializeAgents, agentRegistry } from "./initializeAgents";
import { type BaseAgent } from "~/server/agents/base-agent";
import { createTextMessage, type TextPart } from "~/types/a2a";

// Define the AgentMessage type locally if it's not exported from other modules
interface AgentMessage {
  id: string;
  type: string;
  sender: string;
  recipient: string;
  payload: {
    taskId: string;
    projectId?: string;
    prompt?: string;
    effect?: string;
    metadata?: Record<string, any>;
    fullMetadata?: any;
    [key: string]: any;
  };
}

// Configuration
const DEFAULT_POLL_INTERVAL = 10 * 1000; // 10 seconds
const MAX_POLL_INTERVAL = 5 * 60 * 1000; // 5 minutes
const MAX_RETRIES = 3;
const STARTUP_DELAY = 5000; // 5 second delay before polling starts
const INSTANCE_HEARTBEAT_INTERVAL = 1000; // Check for active instances every second

// Declare a global symbol for the TaskProcessor instance
const TASK_PROCESSOR_INSTANCE_KEY = Symbol.for("bazaar-vid.TaskProcessorInstance");

// Shared timestamp for heartbeat across instances
const HEARTBEAT_KEY = 'A2A_TASK_PROCESSOR_HEARTBEAT';

// Extend the globalThis type to include our custom instance
declare global {
  // eslint-disable-next-line no-var
  var __TASK_PROCESSOR_INSTANCE__: TaskProcessor | undefined;
  var __A2A_TASK_PROCESSOR_HEARTBEAT__: {
    lastActive: number;
    id: string;
  };
}

/**
 * TaskProcessor - A singleton class for managing the A2A task processing
 * 
 * This class implements the singleton pattern to ensure only one instance
 * exists throughout the application lifecycle, preventing multiple
 * polling cycles and duplicate agent registrations.
 */
export class TaskProcessor {
  private pollInterval: number = DEFAULT_POLL_INTERVAL;
  private pollTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private isPolling = false;
  private enableLogging = true;
  private isShuttingDown = false;
  private registeredAgents: BaseAgent[] = [];
  private isCoreInitialized = false;
  private instanceId: string = uuidv4();
  private startupDelayTimer: NodeJS.Timeout | null = null;
  private startupTimestamp: number = Date.now();
  
  /**
   * Private constructor to prevent direct instantiation
   */
  private constructor() {
    a2aLogger.info('system', `A2A Task Processor constructor called (instance ${this.instanceId})`);
  }
  
  /**
   * Get the TaskProcessor singleton instance
   * If the instance doesn't exist, it will be created and core-initialized.
   */
  public static getInstance(): TaskProcessor {
    if (!globalThis.__TASK_PROCESSOR_INSTANCE__) {
      a2aLogger.info('system', "Creating new TaskProcessor singleton instance.");
      globalThis.__TASK_PROCESSOR_INSTANCE__ = new TaskProcessor();
      globalThis.__TASK_PROCESSOR_INSTANCE__._trueCoreInitialize();
    } else {
      a2aLogger.debug('system', "Returning existing TaskProcessor singleton instance.");
    }
    return globalThis.__TASK_PROCESSOR_INSTANCE__;
  }

  /**
   * Performs the actual one-time core initialization.
   * This includes agent registration.
   */
  private _trueCoreInitialize(): void {
    if (this.isCoreInitialized) {
      return;
    }

    try {
      a2aLogger.info('system', `TaskProcessor (${this.instanceId}) core initialization starting`);
      
      // Initialize agents if needed
      initializeAgents(TaskManager.getInstance());
      
      // Use the global agentRegistry that's already imported at the top of this file
      // This ensures we're using the same agent registry as the rest of the system
      this.registeredAgents = Object.values(agentRegistry);
      
      // Log agent registry details
      const globalAgentNames = Object.keys(agentRegistry);
      console.log(`[ROUTE_DEBUG] TaskProcessor (${this.instanceId}): Global registry agents: ${globalAgentNames.join(', ')}`);
      console.log(`[ROUTE_DEBUG] ScenePlannerAgent status: ${agentRegistry.ScenePlannerAgent ? 'FOUND ✅' : 'MISSING ❌'}`);
      
      a2aLogger.info('system', `TaskProcessor (${this.instanceId}) registered ${this.registeredAgents.length} agents:`, {
        agentNames: this.registeredAgents.map(agent => agent.getName())
      });
      
      // Setup health check heartbeat
      this._initializeHeartbeat();
      
      this.isCoreInitialized = true;
      a2aLogger.info('system', `TaskProcessor (${this.instanceId}) core initialization complete`);
    } catch (error) {
      a2aLogger.error('system', `Failed to initialize TaskProcessor core`, error);
      this.isCoreInitialized = false;
    }
  }
  
  /**
   * Sets up the heartbeat mechanism for detecting active instances
   */
  private _initializeHeartbeat(): void {
    // Initialize the global heartbeat if it doesn't exist
    if (!globalThis.__A2A_TASK_PROCESSOR_HEARTBEAT__) {
      globalThis.__A2A_TASK_PROCESSOR_HEARTBEAT__ = {
        lastActive: Date.now(),
        id: this.instanceId
      };
    }
    
    // Update heartbeat periodically
    this.heartbeatTimer = setInterval(() => {
      const currentTimestamp = Date.now();
      const heartbeat = globalThis.__A2A_TASK_PROCESSOR_HEARTBEAT__;
      
      // Check if another instance is more recently active
      if (heartbeat.id !== this.instanceId && currentTimestamp - heartbeat.lastActive < INSTANCE_HEARTBEAT_INTERVAL * 10) {
        // Another instance is active and was updated recently
        a2aLogger.debug('system', `Another TaskProcessor instance (${heartbeat.id}) is active. This instance (${this.instanceId}) will wait before polling.`);
        
        // If we're trying to poll, delay a bit more to reduce contention
        if (this.isPolling && this.startupTimestamp > heartbeat.lastActive) {
          a2aLogger.info('system', `Backing off polling on instance ${this.instanceId} as instance ${heartbeat.id} is already active.`);
          this.stopPolling();
          
          // Try again later with backoff
          setTimeout(() => {
            if (!this.isPolling && !this.isShuttingDown) {
              a2aLogger.info('system', `Attempting to restart polling on instance ${this.instanceId} after backoff.`);
              this.startPolling();
            }
          }, this.pollInterval * 2);
        }
      } else {
        // Either this is our own heartbeat or the other instance is stale
        // Update the heartbeat with our instance ID
        globalThis.__A2A_TASK_PROCESSOR_HEARTBEAT__ = {
          lastActive: currentTimestamp,
          id: this.instanceId
        };
      }
    }, INSTANCE_HEARTBEAT_INTERVAL);
  }
  
  /**
   * Initialize the TaskProcessor's polling behavior.
   * Core initialization (agents, etc.) is handled by getInstance() and _trueCoreInitialize().
   * This method can be called to start polling if it wasn't started automatically or was stopped.
   * 
   * @param enablePolling Whether to start polling immediately if not already polling.
   * @returns The TaskProcessor instance.
   */
  public initializePolling(enablePolling = true): TaskProcessor {
    a2aLogger.info('system', `TaskProcessor (${this.instanceId}) public initializePolling() called. Enable Polling: ${enablePolling}`);
    
    if (!this.isCoreInitialized) {
        a2aLogger.warn('system', `TaskProcessor (${this.instanceId}) core was not initialized. This might indicate an issue. Forcing core initialization.`);
        this._trueCoreInitialize();
    }

    if (enablePolling && !env.DISABLE_BACKGROUND_WORKERS) {
      if (!this.isPolling) {
        // Add a startup delay to prevent immediate polling after a restart
        a2aLogger.info('system', `TaskProcessor (${this.instanceId}) scheduling polling with ${STARTUP_DELAY}ms startup delay`);
        
        if (this.startupDelayTimer) {
          clearTimeout(this.startupDelayTimer);
        }
        
        this.startupDelayTimer = setTimeout(() => {
          a2aLogger.info('system', `TaskProcessor (${this.instanceId}) startup delay complete, beginning polling`);
          this.startPolling();
        }, STARTUP_DELAY);
      } else {
        a2aLogger.info('system', `TaskProcessor (${this.instanceId}) polling is already active.`);
      }
    } else if (env.DISABLE_BACKGROUND_WORKERS) {
      a2aLogger.warn('system', "Background workers are disabled via DISABLE_BACKGROUND_WORKERS env variable. Polling not started by initializePolling.");
    } else if (!enablePolling) {
      a2aLogger.info('system', "Polling explicitly disabled by parameter.");
    }
    return this;
  }
  
  /**
   * Get the list of registered agents
   */
  public getRegisteredAgents(): BaseAgent[] {
    return this.registeredAgents;
  }
  
  /**
   * Start the polling cycle for new tasks
   */
  public startPolling(): void {
    if (this.isPolling) {
      a2aLogger.info('system', `TaskProcessor (${this.instanceId}) is already polling`);
      return;
    }
    
    if (this.isShuttingDown) {
      a2aLogger.warn('system', `TaskProcessor (${this.instanceId}) cannot start polling while shutting down`);
      return;
    }
    
    // Check if another instance is actively polling
    const heartbeat = globalThis.__A2A_TASK_PROCESSOR_HEARTBEAT__;
    const currentTime = Date.now();
    
    if (heartbeat && heartbeat.id !== this.instanceId && currentTime - heartbeat.lastActive < INSTANCE_HEARTBEAT_INTERVAL * 5) {
      a2aLogger.warn('system', `TaskProcessor (${this.instanceId}) not starting polling because instance ${heartbeat.id} is already active`);
      return;
    }
    
    this.isPolling = true;
    this.pollInterval = DEFAULT_POLL_INTERVAL;
    a2aLogger.info('system', `TaskProcessor (${this.instanceId}) starting A2A task polling`);
    
    // Immediately update our heartbeat to claim polling rights
    globalThis.__A2A_TASK_PROCESSOR_HEARTBEAT__ = {
      lastActive: Date.now(),
      id: this.instanceId
    };
    
    void this.pollForTasks();
  }
  
  /**
   * Stop the polling cycle
   */
  public stopPolling(): void {
    if (!this.isPolling) {
      return;
    }
    
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
    
    if (this.startupDelayTimer) {
      clearTimeout(this.startupDelayTimer);
      this.startupDelayTimer = null;
    }
    
    this.isPolling = false;
    a2aLogger.info('system', `TaskProcessor (${this.instanceId}) stopped A2A task polling`);
  }
  
  /**
   * Poll for new tasks
   */
  private async pollForTasks(): Promise<void> {
    if (!this.isPolling || this.isShuttingDown) {
      return;
    }
    
    // Skip polling if another instance claimed active status
    const heartbeat = globalThis.__A2A_TASK_PROCESSOR_HEARTBEAT__;
    if (heartbeat.id !== this.instanceId) {
      a2aLogger.info('system', `TaskProcessor (${this.instanceId}) skipping poll because instance ${heartbeat.id} is active`);
      this.stopPolling();
      return;
    }
    
    try {
      const foundTask = await this.checkForPendingTasks();
      
      if (foundTask) {
        this.pollInterval = DEFAULT_POLL_INTERVAL;
      } else {
        this.pollInterval = Math.min(this.pollInterval * 2, MAX_POLL_INTERVAL);
        
        a2aLogger.debug('system', `TaskProcessor (${this.instanceId}) no tasks found, backing off to ${this.pollInterval / 1000}s`);
      }
    } catch (error) {
      a2aLogger.error('system', `TaskProcessor (${this.instanceId}) error polling for tasks: ${error instanceof Error ? error.message : String(error)}`);
    }
    
    if (!this.isShuttingDown && this.isPolling) {
      // Ensure we still own the heartbeat before scheduling next poll
      if (globalThis.__A2A_TASK_PROCESSOR_HEARTBEAT__.id === this.instanceId) {
        this.pollTimer = setTimeout(() => this.pollForTasks(), this.pollInterval);
      } else {
        a2aLogger.info('system', `TaskProcessor (${this.instanceId}) stopping poll because instance ${heartbeat.id} took over`);
        this.stopPolling();
      }
    }
  }
  
  /**
   * Check for pending tasks in 'submitted' status
   */
  private async checkForPendingTasks(): Promise<boolean> {
    try {
      // Update heartbeat right before accessing the database
      if (globalThis.__A2A_TASK_PROCESSOR_HEARTBEAT__) {
        globalThis.__A2A_TASK_PROCESSOR_HEARTBEAT__.lastActive = Date.now();
        globalThis.__A2A_TASK_PROCESSOR_HEARTBEAT__.id = this.instanceId;
      }
      
      const pendingTasks = await executeWithRetry(() => db.query.customComponentJobs.findMany({
        where: eq(customComponentJobs.status, 'pending'),
        orderBy: customComponentJobs.createdAt,
        limit: 5
      }));
      
      if (pendingTasks.length === 0) {
        return false;
      }
      
      a2aLogger.info('system', `TaskProcessor (${this.instanceId}) found ${pendingTasks.length} pending tasks to process`);
      
      for (const task of pendingTasks) {
        if (task.id) {
          await this.processTask(task);
        } else {
          a2aLogger.error('system', `TaskProcessor (${this.instanceId}) found a pending task without an ID.`, { taskData: task });
        }
      }
      
      return true;
    } catch (error) {
      a2aLogger.error('system', `TaskProcessor (${this.instanceId}) error checking for pending tasks: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    }
  }
  
  /**
   * Route a message to the appropriate agent
   */
  private async routeMessageToAgent(message: AgentMessage): Promise<AgentMessage | null> {
    // New architecture: if USE_MESSAGE_BUS is enabled, delegate delivery to the
    // central MessageBus and stop doing in-process look-ups here.  The legacy
    // code below remains for a short deprecation window.

    // Log the value of USE_MESSAGE_BUS at the point of decision
    a2aLogger.info(message.payload?.taskId || 'system', `[TaskProcessor] Routing decision: USE_MESSAGE_BUS is ${env.USE_MESSAGE_BUS}`, { 
      messageId: message.id,
      recipient: message.recipient,
      type: message.type
    });

    if (env.USE_MESSAGE_BUS) {
      try {
        // Lazy import to break circular dependencies.
         
        const { messageBus } = require("~/server/agents/message-bus");
        await messageBus.publish(message);
      } catch (err) {
        a2aLogger.error('system', `TaskProcessor (${this.instanceId}) bus publish failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      // Bus handles follow-ups; nothing to return to caller.
      return null;
    }

    // ----------------------
    // Legacy direct routing – will be removed once bus migration is complete.
    // ----------------------
    const targetAgentName = message.recipient;
    const taskId = message.payload?.taskId || 'unknown';
    
    // Super enhanced debug logging for critical diagnostics
    console.log(`[SUPER_ROUTE_DEBUG] TaskProcessor (${this.instanceId}) attempting to route message`);
    console.log(`[SUPER_ROUTE_DEBUG] Message type: ${message.type}, to agent: ${targetAgentName}, taskId: ${taskId}`);
    console.log(`[SUPER_ROUTE_DEBUG] Message timestamp: ${new Date().toISOString()}`);
    
    // Log both global registry and local registry state for debugging
    const globalAgents = Object.keys(agentRegistry);
    console.log(`[SUPER_ROUTE_DEBUG] Global registry agents (${globalAgents.length}): ${globalAgents.join(', ')}`);
    console.log(`[SUPER_ROUTE_DEBUG] Local registry agents (${this.registeredAgents.length}): ${this.registeredAgents.map(a => a.getName()).join(', ')}`);
    
    // CRITICAL: Specifically check for ScenePlannerAgent
    if (targetAgentName === 'ScenePlannerAgent') {
      const scenePlannerFound = !!agentRegistry.ScenePlannerAgent;
      console.log(`[SUPER_ROUTE_DEBUG] Specific check for ScenePlannerAgent: ${scenePlannerFound ? 'FOUND' : 'NOT FOUND'} in global registry`);
      
      if (scenePlannerFound) {
        // Safely access properties with null checks
        const scenePlannerAgent = agentRegistry.ScenePlannerAgent;
        if (scenePlannerAgent?.constructor) {
          console.log(`[SUPER_ROUTE_DEBUG] ScenePlannerAgent instance type: ${scenePlannerAgent.constructor.name}`);
          console.log(`[SUPER_ROUTE_DEBUG] ScenePlannerAgent instance methods: ${Object.getOwnPropertyNames(Object.getPrototypeOf(scenePlannerAgent)).join(', ')}`);
        } else {
          console.log(`[SUPER_ROUTE_DEBUG] ScenePlannerAgent instance exists but lacks constructor information`);
        }
        
        // Access the global diagnostic marker if it exists
        const agentConstructedAt = (globalThis as any).__SCENE_PLANNER_AGENT_CONSTRUCTED || 'unknown';
        console.log(`[SUPER_ROUTE_DEBUG] ScenePlannerAgent construction timestamp: ${agentConstructedAt}`);
      }
    }
    
    // IMPORTANT: Always use the global agentRegistry first, fall back to local registry only if needed
    let agent = agentRegistry[targetAgentName];
    
    // If not found in global registry, try the local one as a fallback
    if (!agent) {
      console.log(`[SUPER_ROUTE_DEBUG] Agent ${targetAgentName} not found in global registry, checking local registry`);
      agent = this.registeredAgents.find(agent => agent.getName() === targetAgentName);
      if (agent) {
        console.log(`[SUPER_ROUTE_DEBUG] Found ${targetAgentName} in local registry`);
      }
    } else {
      console.log(`[SUPER_ROUTE_DEBUG] Found ${targetAgentName} in global registry`);
      
      // EXTRA LOGGING FOR SCENE PLANNER AGENT
      if (targetAgentName === "ScenePlannerAgent") {
        const globalInstance = (globalThis as any).__SCENE_PLANNER_AGENT_INSTANCE;
        console.log(`[SCENE_PLANNER_CRITICAL] Registry agent === global instance: ${agent === globalInstance}`);
        console.log(`[SCENE_PLANNER_CRITICAL] Agent constructor name: ${agent.constructor.name}`);
        console.log(`[SCENE_PLANNER_CRITICAL] Agent has processMessage: ${typeof agent.processMessage === 'function'}`);
      }
    }

    // Verify agent has processMessage method
    if (agent) {
      console.log(`[SUPER_ROUTE_DEBUG] Agent ${message.recipient} has processMessage method: ${typeof agent.processMessage === 'function'}`);
    }
    
    if (!agent) {
      a2aLogger.error("TaskProcessor", `Agent ${message.recipient} not found in registry or registered agents`);
      return null;
    }

    if (typeof agent.processMessage !== 'function') {
      a2aLogger.error("TaskProcessor", `Agent ${message.recipient} does not have a processMessage method`);
      return null;
    }

    console.log(`[SUPER_ROUTE_DEBUG] Found agent ${message.recipient}, calling processMessage NOW`);
    
    // Just before call
    console.log(`[SUPER_ROUTE_DEBUG] Message details: ${JSON.stringify(message)}`);
    console.log(`[SUPER_ROUTE_DEBUG] About to call agent.processMessage - right before the call`);
    
    // Call processMessage with timeout safety
    let timeoutId: NodeJS.Timeout | undefined;
    let resolved = false;

    const timeoutPromise = new Promise<null>((_, reject) => {
      timeoutId = setTimeout(() => {
        if (!resolved) {
          reject(new Error(`Timeout waiting for ${message.recipient}.processMessage response after 30 seconds`));
        }
      }, 30000); // 30 second timeout
    });

    try {
      console.log(`[SUPER_ROUTE_DEBUG] agent.processMessage called - waiting for result or timeout`);
      const result = await Promise.race([
        agent.processMessage(message),
        timeoutPromise
      ]);
      
      resolved = true;
      clearTimeout(timeoutId);

      console.log(`[SUPER_ROUTE_DEBUG] agent.processMessage completed for ${message.recipient} with type ${message.type}`);

      if (result) {
        console.log(`[SUPER_ROUTE_DEBUG] Received response from ${message.recipient} of type ${result.type}`);

        // Special handling for ScenePlannerAgent
        if (message.recipient === "ScenePlannerAgent") {
          console.log(`[SCENE_PLANNER_CRITICAL] ScenePlannerAgent.processMessage succeeded!`);
          console.log(`[SCENE_PLANNER_CRITICAL] Response type: ${result.type}`);
          console.log(`[SCENE_PLANNER_CRITICAL] Response recipient: ${result.recipient}`);
        }

        // ------------------------------------------------------------------
        // NEW: Automatically route follow-up messages returned by an agent.
        // This allows multi-agent workflows to continue without requiring
        // the calling site (e.g. processTask) to manually forward messages.
        // A small recursion depth limit prevents infinite routing loops.
        // ------------------------------------------------------------------
        const MAX_FOLLOWUP_DEPTH = 10;

        // Attach or increment an internal depth counter on the message so we
        // can detect potential cycles.
        const prevDepth = (result as any).__routingDepth ?? 0;
        const nextDepth = prevDepth + 1;

        if (nextDepth <= MAX_FOLLOWUP_DEPTH) {
          (result as any).__routingDepth = nextDepth;

          console.log(`[SUPER_ROUTE_DEBUG] Auto-routing follow-up message (depth ${nextDepth}) to ${result.recipient}`);

          // Recursively route the new message. Errors are logged but will not
          // prevent returning the result to the caller.
          try {
            await this.routeMessageToAgent(result as AgentMessage);
          } catch (followUpError) {
            a2aLogger.error(
              'system',
              `TaskProcessor (${this.instanceId}) failed to auto-route follow-up message: ${followUpError instanceof Error ? followUpError.message : String(followUpError)}`
            );
          }
        } else {
          a2aLogger.warn('system', `TaskProcessor (${this.instanceId}) reached max follow-up routing depth (${MAX_FOLLOWUP_DEPTH}). Stopping recursion.`);
        }
      }

      // Use type assertion to handle compatibility between different AgentMessage types
      return result as AgentMessage | null;
    } catch (error) {
      // Log the error
      a2aLogger.error('system', `TaskProcessor (${this.instanceId}) error in routeMessageToAgent: ${error instanceof Error ? error.message : String(error)}`);
      
      // Store error details in global state for diagnostics if ScenePlannerAgent
      if (message.recipient === "ScenePlannerAgent") {
        (globalThis as any).__SCENE_PLANNER_ROUTE_ERROR = {
          timestamp: new Date().toISOString(),
          error: error instanceof Error ? error.message : String(error),
          taskId: taskId,
          messageSender: message.sender,
          messageType: message.type
        };
      }
      
      return null;
    }
  }
  
  /**
   * Process a specific task
   */
  private async processTask(task: any): Promise<void> {
    const taskId = task.id;
    
    try {
      a2aLogger.info('system', `TaskProcessor (${this.instanceId}) processing task ${taskId}`);
      
      if (!taskId || !task.projectId) {
        a2aLogger.error('system', `TaskProcessor (${this.instanceId}) task data is missing required fields (id or projectId).`, { task });
        throw new Error("Task data is missing required fields");
      }
      
      if (task.status !== 'pending') {
        a2aLogger.info('system', `TaskProcessor (${this.instanceId}) skipping task with status: ${task.status}`); 
        return;
      }
      
      // Task processing logic here...
      
    } catch (error) {
      a2aLogger.error('system', `TaskProcessor (${this.instanceId}) error processing task ${taskId}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  // Shutdown implementation was removed as it was duplicated at line ~634

  /**
   * Emit a health check log to confirm processor is running
   */
  public emitHealthCheck(): void {
    a2aLogger.info('system', `TaskProcessor (${this.instanceId}) health check: Polling: ${this.isPolling}, CoreInitialized: ${this.isCoreInitialized}`);
  }

  /**
   * Check if this is the actively polling instance
   */
  public isActiveInstance(): boolean {
    if (!globalThis.__A2A_TASK_PROCESSOR_HEARTBEAT__) {
      return false;
    }
    
    return globalThis.__A2A_TASK_PROCESSOR_HEARTBEAT__.id === this.instanceId;
  }
  
  /**
   * Perform a graceful shutdown of the Task Processor
   */
  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      a2aLogger.info('system', `TaskProcessor (${this.instanceId}) shutdown already in progress`);
      return;
    }
    
    this.isShuttingDown = true;
    a2aLogger.info('system', `TaskProcessor (${this.instanceId}) attempting graceful shutdown`);
    
    this.stopPolling();
    
    // Clean up heartbeat timer
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    
    // Clean up startup delay timer
    if (this.startupDelayTimer) {
      clearTimeout(this.startupDelayTimer);
      this.startupDelayTimer = null;
    }
    
    // Record the shutdown in the heartbeat so other instances know
    if (globalThis.__A2A_TASK_PROCESSOR_HEARTBEAT__ && globalThis.__A2A_TASK_PROCESSOR_HEARTBEAT__.id === this.instanceId) {
      a2aLogger.info('system', `TaskProcessor (${this.instanceId}) relinquishing heartbeat control on shutdown`);
      // Set lastActive to a value in the past to allow other instances to take over faster
      globalThis.__A2A_TASK_PROCESSOR_HEARTBEAT__ = {
        lastActive: 0,  // Long ago
        id: `${this.instanceId}_SHUTDOWN`
      };
    }
    
    // Force release the global instance to prevent memory leaks
    if (globalThis.__TASK_PROCESSOR_INSTANCE__ === this) {
      a2aLogger.info('system', `TaskProcessor (${this.instanceId}) clearing global instance reference`);
      globalThis.__TASK_PROCESSOR_INSTANCE__ = undefined;
    }
    
    this.isShuttingDown = false;
    a2aLogger.info('system', `TaskProcessor (${this.instanceId}) shutdown actions complete (polling stopped)`);
  }
}

// Don't immediately initialize polling - wait until startup is stable
setTimeout(() => {
  const processor = TaskProcessor.getInstance();
  processor.initializePolling(!env.DISABLE_BACKGROUND_WORKERS);
}, STARTUP_DELAY);

export const getTaskProcessor = (): TaskProcessor => TaskProcessor.getInstance();

if (typeof process !== 'undefined') {
  const sigHandler = async (signal: string) => {
    a2aLogger.info('system', `${signal} received, initiating graceful shutdown of TaskProcessor`);
    const processor = TaskProcessor.getInstance();
    try {
      await processor.shutdown();
      a2aLogger.info('system', `TaskProcessor graceful shutdown complete after ${signal}`);
      // Give the log a chance to be written before exiting
      setTimeout(() => {
        process.exit(0);
      }, 500);
    } catch (err) {
      a2aLogger.error('system', `Error during shutdown: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => sigHandler('SIGTERM'));
  process.on('SIGINT', () => sigHandler('SIGINT'));
}