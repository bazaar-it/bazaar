# ScenePlannerAgent Communication Fix

## Issue Summary

The Agent-to-Agent (A2A) system was encountering a critical issue where messages sent from the CoordinatorAgent to the ScenePlannerAgent were not being received or processed properly. This was preventing the video generation flow from progressing beyond the initial task creation phase.

## Root Cause Analysis

After extensive investigation, we identified three key issues:

1. **Agent Registry Mismatch**: The TaskProcessor was using its own internal list of registered agents (`this.registeredAgents`) rather than accessing the global agent registry. This meant that even though the ScenePlannerAgent was properly initialized and registered in the global registry, the TaskProcessor wasn't aware of it.

2. **Syntax Error in ScenePlannerAgent**: The `processMessage` method in ScenePlannerAgent contained a structural error where the conditional block for `CREATE_SCENE_PLAN_REQUEST` had incorrect bracing and indentation, causing the function to behave unpredictably.

3. **Logger Type Issues**: Several calls to the a2aLogger were using `null` for the taskId parameter, which was incompatible with the logger's type definitions that required string values.

## Solution Implementation

### 1. Fixed TaskProcessor Initialization

Modified the `_trueCoreInitialize` method in TaskProcessor to directly access the global agent registry:

```typescript
private _trueCoreInitialize(): void {
  if (this.isCoreInitialized) {
    return;
  }

  try {
    a2aLogger.info('system', `TaskProcessor (${this.instanceId}) core initialization starting`);
    
    // Import the agentRegistry directly
    const { agentRegistry } = require('./agentRegistry.service');
    
    // Get all registered agents
    this.registeredAgents = Object.values(agentRegistry);
    
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
```

### 2. Fixed ScenePlannerAgent's processMessage Method

Corrected the syntax error in the ScenePlannerAgent's processMessage method by properly structuring the conditional blocks and indentation:

```typescript
async processMessage(message: AgentMessage): Promise<AgentMessage | null> {
  const taskId = message.payload?.taskId || message.id || "unknown-task";
  
  // Logging code...
  
  if (message.type === "CREATE_SCENE_PLAN_REQUEST") {
    a2aLogger.info(taskId, `[ScenePlannerAgent] Received CREATE_SCENE_PLAN_REQUEST. Beginning processing.`, { messageId: message.id });
    
    try {
      // Process the message...
      return this.createMessage(/* ... */);
    } catch (error) {
      // Handle errors...
      return this.createMessage(/* ... */);
    }
  }
  
  // Only log warning for unhandled message types
  a2aLogger.warn(taskId, `[ScenePlannerAgent] Unhandled message type: ${message.type}`);
  return null;
}
```

### 3. Fixed Logger Type Issues

Updated all logger calls in TaskProcessor to use 'system' instead of null for task IDs:

```typescript
// Changed from:
a2aLogger.info(null, `TaskProcessor (${this.instanceId}) core initialization starting`);

// To:
a2aLogger.info('system', `TaskProcessor (${this.instanceId}) core initialization starting`);
```

## Verification

After implementing these fixes, we verified the communication was working by:

1. **Log Analysis**: Confirmed the ScenePlannerAgent was receiving and processing CREATE_SCENE_PLAN_REQUEST messages from the CoordinatorAgent.

2. **Task Status Flow**: Verified that tasks progressed through the expected status transitions (submitted -> working -> further processing).

3. **Agent Registry Validation**: Confirmed that the TaskProcessor now correctly registers all agents from the global registry, including the ScenePlannerAgent.

## Results

1. The ScenePlannerAgent now properly receives and processes CREATE_SCENE_PLAN_REQUEST messages
2. The A2A system can now progress beyond the initial task creation phase
3. Messages correctly flow from CoordinatorAgent to ScenePlannerAgent
4. Improved logging provides better visibility into the message flow

## Future Improvements

1. **Registry Consistency**: Implement a more robust mechanism to ensure consistency between the global agent registry and TaskProcessor's internal registry.

2. **Health Checks**: Add periodic validation to confirm all expected agents are registered and responsive.

3. **Message Tracing**: Add more detailed tracing for messages flowing between agents to make debugging easier.

4. **Type Safety**: Enhance type definitions for logger methods and agent interfaces to catch similar issues at compile time rather than runtime.

## Related Files

- `src/server/services/a2a/taskProcessor.service.ts`
- `src/server/agents/scene-planner-agent.ts`
- `src/server/services/a2a/initializeAgents.ts`
- `src/lib/logger.ts` 