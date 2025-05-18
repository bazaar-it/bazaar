# ScenePlannerAgent and Debugging Improvements

## Overview

This document summarizes the improvements made to fix issues with the ScenePlannerAgent integration and the debugging infrastructure.

## Recent Fixes

### ScenePlannerAgent Fixes

1. **Proper Logger Integration**: 
   - Fixed TypeScript error by replacing `null` with `"system"` for taskId in logging calls
   - Added explicit logging about `scenePlanner.service.ts` integration
   - Added more detailed logging when calling `handleScenePlan` with scene count information

2. **Clear Integration with scenePlanner.service.ts**:
   - Explicitly documented the integration between the agent and the scene planner service
   - Added logging to clearly trace the flow from agent to service

3. **Temperature and Model Settings**:
   - Fixed model reference to use `env.DEFAULT_ADB_MODEL` instead of the non-existent `SCENE_PLANNER_MODEL`
   - Set up temperature to use a fixed value of 1.0 for more creative scene planning

4. **Message Bus Connectivity Fix**:
   - Added a fallback reference to the global messageBus to prevent "Cannot read properties of undefined (reading 'publish')" errors
   - Created a dedicated publishToMessageBus method with proper error handling
   - Implemented graceful fallback to direct response when the bus is unavailable
   - Added detailed logging of message bus operations

### Debug Infrastructure Improvements

1. **Debug Router Enhancements**:
   - Fixed TypeScript errors with private property access using `(processor as any)` type assertions
   - Improved logging with proper taskId values ("system" instead of null)
   - Added structured context data to logs
   - Enhanced error handling with proper stack traces

2. **ScenePlanner Diagnostic API**:
   - Rewritten the diagnostic endpoint to support GET requests
   - Added global error tracking via `__SCENE_PLANNER_ROUTE_ERROR` to persist errors for later diagnosis
   - Implemented comprehensive registry checks to locate the agent across all possible registries
   - Added detailed logging for diagnostics

3. **Logging Enhancements**:
   - Added module context to each log to identify the source component
   - Improved error handling to include stack traces
   - Added integration tracking in logs to trace cross-service communication

## Future Improvements

1. **End-to-End Testing**:
   - Implement automated tests for ScenePlannerAgent that verify its integration with scenePlanner.service.ts
   - Add integration tests that cover the full flow from API to agent to database

2. **Agent Registration Stability**:
   - Review all agent registration paths to ensure consistent registration across HMR restarts
   - Consider adding a self-healing mechanism to re-register agents when they're missing

3. **Error Recovery**:
   - Implement auto-retry logic for failed LLM calls in ScenePlannerAgent
   - Add circuit breaker pattern to prevent cascading failures

4. **Monitoring Dashboard**:
   - Enhance the debug router to provide a comprehensive system health view
   - Consider adding a visual dashboard for A2A system status

5. **Message Bus Reliability**:
   - Review and improve message bus delivery guarantees
   - Add message persistence for critical messages to survive restarts
   - Implement health check system for message bus connectivity
   - Consider reconnection strategies after failures

## Integration Flow

The integration between ScenePlannerAgent and scenePlanner.service.ts follows this flow:

1. An A2A message of type `CREATE_SCENE_PLAN_REQUEST` is sent to ScenePlannerAgent
2. ScenePlannerAgent calls OpenAI to generate a structured scene plan
3. The agent then calls `handleScenePlan` from scenePlanner.service.ts
4. scenePlanner.service.ts persists the scene plan in the database
5. The scene plan is made available to the editor via the database

## Debug Tools

To diagnose ScenePlannerAgent issues:

1. **Check Agent Status**: `GET /api/trpc/debug.getAgentStatus`
2. **Test ScenePlannerAgent**: `POST /api/trpc/debug.testScenePlannerAgent` with `{ "message": "Your test prompt" }`
3. **Direct Agent Diagnostic**: `GET /api/a2a/diagnostic/sceneplanner`
4. **Log Filtering**: Use `curl -X GET "http://localhost:3002/raw?limit=20&source=a2a-system&filter=scene_planner"` to view scene planner logs

## Common Issues and Solutions

1. **Agent not found in registry**: 
   - Check logs for errors during agent initialization
   - Restart the server to trigger fresh agent registration

2. **TypeError in ScenePlannerAgent**:
   - Most likely due to null taskId or missing properties in message payload
   - Check payload structure in messages sent to the agent

3. **OpenAI API errors**:
   - Verify API key is set in .env
   - Check model availability and quota 

4. **Cannot read properties of undefined (reading 'publish')**:
   - This indicates a message bus connectivity issue
   - The fix we've implemented should handle this robustly through fallbacks
   - If this persists, check messageBus initialization order during server startup 