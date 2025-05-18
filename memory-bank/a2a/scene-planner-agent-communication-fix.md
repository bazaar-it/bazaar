# ScenePlannerAgent Message Bus Communication Fix

## Issue Description

The ScenePlannerAgent was encountering a critical error during message processing:

```
Cannot read properties of undefined (reading 'publish')
```

This error occurred when the agent attempted to use `this.bus.publish()` but the `bus` property was undefined. The agent was being properly constructed but unable to communicate through the message bus, preventing proper integration with the A2A system.

## Root Cause Analysis

After investigating the codebase, we identified several issues:

1. **Message Bus Initialization**: The agent inherits the `bus` property from `BaseAgent`, but this property might not always be properly initialized when agents are created.

2. **Error Handling**: There was no robust error handling around the message bus publishing calls, causing unhandled exceptions when the bus was unavailable.

3. **Fallback Mechanism**: There was no fallback mechanism when the bus property was undefined, leading to complete failure rather than graceful degradation.

## Solution Implemented

We implemented several changes to make the ScenePlannerAgent more resilient:

1. **Bus Fallback Property**: Added a private `messageBusFallback` property that keeps a direct reference to the global `messageBus` singleton:

```typescript
private messageBusFallback = messageBus;
```

2. **Connection Validation**: Added startup validation code in the constructor to check whether the bus is properly connected and log appropriate messages:

```typescript
// Validate message bus connection
if (env.USE_MESSAGE_BUS) {
  if (!this.bus) {
    a2aLogger.error("system", "ScenePlannerAgent: Message bus is undefined in BaseAgent. Will use global messageBus as fallback.", { module: "agent_constructor" });
  } else {
    a2aLogger.info("system", "ScenePlannerAgent: Message bus connection from BaseAgent is available.", { module: "agent_constructor" });
  }
}
```

3. **Robust Publishing Method**: Created a dedicated `publishToMessageBus` method that safely handles message publishing with proper error handling and fallback mechanisms:

```typescript
private async publishToMessageBus(message: AgentMessage, taskId: string, logContext: Record<string, any>): Promise<boolean> {
  if (!env.USE_MESSAGE_BUS) {
    return false;
  }
  
  try {
    // First try the message bus from BaseAgent
    if (this.bus) {
      await this.bus.publish(message);
      a2aLogger.info(taskId, "Message successfully published to bus", { ...logContext, messageType: message.type });
      return true;
    }
    
    // If BaseAgent's bus is undefined, try the fallback global messageBus
    if (this.messageBusFallback) {
      await this.messageBusFallback.publish(message);
      a2aLogger.info(taskId, "Message published to fallback global messageBus", { ...logContext, messageType: message.type });
      return true;
    }
    
    a2aLogger.error(taskId, "Cannot publish message: No message bus available (both this.bus and fallback are undefined)", { ...logContext, messageType: message.type });
    return false;
  } catch (busError) {
    a2aLogger.error(taskId, `Failed to publish message to bus: ${busError instanceof Error ? busError.message : String(busError)}`, 
      { ...logContext, error: busError, messageType: message.type });
    return false;
  }
}
```

4. **Graceful Fallback**: Updated the message handling in `processMessage` to use the new publishing method and fall back to direct message return when bus communication fails:

```typescript
// Try to publish via message bus
const publishSuccess = await this.publishToMessageBus(responseMessage, taskId, logContext);

// If message bus is enabled and publishing succeeded, return null
if (env.USE_MESSAGE_BUS && publishSuccess) {
  return null;
}

// Otherwise, fall back to direct return
return responseMessage;
```

## Testing and Validation

After implementing the fix, the ScenePlannerAgent was able to:

1. Successfully start up and log its configuration
2. Register properly with the agent registry
3. Process incoming messages without throwing undefined errors
4. Fall back to direct message passing when bus communication fails

Testing via the diagnostic endpoint confirmed that the agent is accessible:

```
$ curl -X GET "http://localhost:3000/api/a2a/diagnostic/sceneplanner"
{"success":true,"agentName":"ScenePlannerAgent","modelName":"o4-mini","temperature":1,"response":null,"constructedAt":"2025-05-18T15:38:55.186Z","source":"processor"}
```

This indicates that the agent is properly initialized and can respond to diagnostic requests. The source being "processor" confirms it was found in the TaskProcessor's internal registry.

## Remaining Issues

While our fix for the message bus connectivity is working, we encountered some other issues during testing:

1. **Next.js Build Issues**: We saw errors related to missing vendor chunks when attempting to use the tRPC API endpoint:
   ```
   Error: Cannot find module './vendor-chunks/@opentelemetry.js'
   ```

2. **Agent Registry Inconsistency**: The `/api/a2a/check-agent-registry` endpoint returned an empty agent list, indicating that there might still be issues with how agents are registered in the global registry.

3. **Log Agent Access**: We had difficulty retrieving specific logs from the log agent, suggesting there might be issues with log filtering or the log agent itself.

## Next Steps

To complete the solution, we should:

1. **Fix Next.js Build**: Rebuild the Next.js application to resolve the missing vendor chunks issue. This might require:
   - Running `npm run build` to regenerate the vendor chunk files
   - Checking for package version mismatches, especially for OpenTelemetry

2. **Agent Registration Flow**: Review the initialization sequence for agents to ensure they are properly registered in both:
   - The global agent registry
   - The TaskProcessor's internal registry

3. **End-to-End Testing**: Complete a full end-to-end test once the build issues are resolved to confirm that:
   - Tasks can be created
   - Messages flow from CoordinatorAgent to ScenePlannerAgent
   - Scene plans are properly generated and persisted

## Related Components

This fix affects the following components:

- ScenePlannerAgent
- Message Bus system
- Agent registry

## References

- [MessageBus implementation](src/server/agents/message-bus.ts)
- [BaseAgent implementation](src/server/agents/base-agent.ts)
- [Agent initialization](src/server/services/a2a/initializeAgents.ts) 