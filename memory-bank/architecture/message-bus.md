# Message Bus Architecture

## Overview

The Message Bus pattern has been implemented to enhance communication between agents in the Bazaar-Vid application. This document outlines the design decisions, implementation details, and current status of the Message Bus integration.

## Core Components

### MessageBus Class

Located at `src/server/agents/message-bus.ts`, the MessageBus class provides:

- A singleton instance accessible to all agents
- Registration mechanisms for agents
- Publishing capabilities for messages
- Subscription system for monitoring and handling messages
- Error tracking and performance monitoring

### Feature Flag

The Message Bus implementation is controlled by the `USE_MESSAGE_BUS` environment variable, allowing for:

- Gradual rollout of the new architecture
- Easy rollback to direct agent communication if issues arise
- A/B testing of both communication patterns

## Integration Status

### Phase 1 (Completed)
- ✅ Created MessageBus class
- ✅ Implemented bus registration in BaseAgent
- ✅ Added feature flagging
- ✅ Basic monitoring of agent messages

### Phase 2 (Current)
- ✅ Updated CoordinatorAgent to use Message Bus for key flows
- ✅ Enhanced UIAgent for proper integration with Message Bus
- ✅ Added performance monitoring for high-latency operations
- ✅ Implemented error tracking for specific message types
- ✅ Updated TaskProcessor to route messages via Message Bus

### Phase 3 (Pending)
- 🔄 Update ErrorFixerAgent to use Message Bus
- 🔄 Update BuilderAgent to use Message Bus
- 🔄 Implement circuit breaker pattern for handling agent failures
- 🔄 Add comprehensive testing infrastructure

## Implementation Pattern

When converting agent methods to use the Message Bus pattern, the following pattern is used:

```typescript
// 1. Create the message as before
const response = this.createA2AMessage(
  "MESSAGE_TYPE",
  taskId,
  targetAgent,
  this.createSimpleTextMessage("Message content"),
  undefined,
  correlationId,
  { additionalData }
);

// 2. If Message Bus is enabled, publish the message
if (env.USE_MESSAGE_BUS) await this.bus.publish(response);

// 3. Return null or the message depending on the feature flag
return env.USE_MESSAGE_BUS ? null : response;
```

## Monitoring and Error Handling

The MessageBus implementation includes:

1. **Global Message Monitoring**: All messages passing through the bus are logged with sender, recipient, and type.

2. **Error Tracking**: Specific error message types are captured and logged for easier debugging.

3. **Performance Monitoring**: High-latency operations (scene planning, component generation) are timed and logged.

4. **Memory Leak Prevention**: Tracking data is automatically cleaned up periodically.

## Benefits

1. **Decoupling**: Agents no longer need direct references to each other
2. **Observability**: Centralized logging of all agent communication
3. **Extensibility**: Easier to add new agents or modify existing ones
4. **Reliability**: Improved error handling and tracking
5. **Testing**: Easier to mock and test agent interactions

## Next Steps

1. Complete the integration across all remaining agents
2. Implement comprehensive testing strategy
3. Add metrics dashboards for monitoring MessageBus performance
4. Consider implementing message persistence for audit and recovery
