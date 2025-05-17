# A2A Implementation Fix Plan

## Current Issues

After analyzing the codebase and logs, we've identified several key issues preventing the A2A system from working correctly:

1. **Task Processor is Disabled**
   - Environment variable `DISABLE_BACKGROUND_WORKERS` is set to true, disabling the Task Processor
   - The logs show: `A2A Task Processor is disabled and will not start`

2. **Agent Registration Conflicts**
   - Multiple systems are trying to register agents:
     - `initializeAgents.ts` - Registers all 7 agents properly
     - `taskProcessor.service.ts` - Only registers 4 agents
     - `setup.ts` - Registers 6 agents
   - Result: When actually running, only 4 agents are registered: 
     ```
     {"agentCount":4,"agents":["ComponentLoadingFixerAgent","CoordinatorAgent","BuilderAgent","ErrorFixerAgent"]}
     ```
   - Missing critical agents: ScenePlannerAgent, ADBAgent, R2StorageAgent, UIAgent

3. **Initialization Race Condition**
   - Task Processor is initialized multiple times:
     ```
     21:27:58 - A2A Task Processor initialized
     21:28:01 - A2A Task Processor initialized (again)
     21:28:12 - A2A Task Processor initialized (again)
     ```

4. **Message Routing Failure**
   - Messages are sent to ScenePlannerAgent but fail because it's not registered:
     ```
     21:28:19.370 - Sending CREATE_SCENE_PLAN_REQUEST to ScenePlannerAgent
     ```

## Fix Implementation Plan

### 1. Enable Task Processor

First, we need to enable the Task Processor:

```bash
# In .env.local
DISABLE_BACKGROUND_WORKERS=false
```

### 2. Consolidate Agent Registration

We need to fix the agent registration to use a single consistent method:

1. Modify `taskProcessor.service.ts` to use the proper agent registration:

```typescript
private initializeAgents(): void {
  // Import the proper agent initialization instead of using local function
  import { initializeAgents } from './initializeAgents';
  initializeAgents();
  
  // Get all registered agents from the registry
  const { agentRegistry } = import('./agentRegistry.service');
  this.agents = agentRegistry.getAllAgents();
  
  a2aLogger.info('TASK_PROCESSOR', 'A2A Agents initialized', { 
    agentCount: this.agents.length,
    agents: this.agents.map(agent => agent.getName()) 
  });
}
```

2. Fix TaskProcessor instantiation to prevent multiple initializations:

```typescript
// Initialize and start the processor if not disabled (singleton pattern)
let taskProcessorInstance: TaskProcessor | null = null;

export function getTaskProcessor(): TaskProcessor | null {
  if (!taskProcessorInstance && !env.DISABLE_BACKGROUND_WORKERS) {
    taskProcessorInstance = new TaskProcessor();
    a2aLogger.info('TASK_PROCESSOR', 'A2A Task Processor instance created as singleton.');
  }
  return taskProcessorInstance;
}

// Only start during actual server startup, not on module import
export const taskProcessor = taskProcessorInstance;
```

### 3. Create A2A Test Environment

To properly test the A2A integration without affecting the main application:

1. Create a simplified test implementation that doesn't rely on background workers:

```typescript
// In src/app/test/a2a-integration/TestController.tsx
export function initializeLocalAgentTest() {
  // Import all necessary agents
  import { CoordinatorAgent } from '~/server/agents/coordinator-agent';
  import { ScenePlannerAgent } from '~/server/agents/scene-planner-agent';
  // ... other agent imports
  
  // Create local task manager instance for this test
  const testTaskManager = new TaskManager();
  
  // Register all agents for local testing
  const agents = [
    new CoordinatorAgent(testTaskManager),
    new ScenePlannerAgent(testTaskManager),
    // ... other agents
  ];
  
  // Create simplified message bus for local testing
  const testMessageBus = {
    sendMessage: async (message) => {
      const targetAgent = agents.find(a => a.getName() === message.recipient);
      if (targetAgent) {
        return targetAgent.processMessage(message);
      }
      return null;
    }
  };
  
  return { testTaskManager, testMessageBus, agents };
}
```

2. Use this local test environment in the A2A test dashboard.

### 4. Debug Mode for Task Processor

Add a debug mode that shows detailed logging:

```typescript
// In src/server/services/a2a/taskProcessor.service.ts
private debugMode = process.env.NODE_ENV === 'development';

private routeMessageToAgent(message: AgentMessage): Promise<AgentMessage | null> {
  const targetAgent = this.agents.find(agent => agent.getName() === message.recipient);
  
  const taskId = message.payload?.taskId || message.payload?.jobId || 'unknown';
  
  if (!targetAgent) {
    // Enhanced debug logging
    if (this.debugMode) {
      a2aLogger.error(taskId, `No agent found with name: ${message.recipient}. Available agents: ${this.agents.map(a => a.getName()).join(', ')}`, { message });
    } else {
      a2aLogger.error(taskId, `No agent found with name: ${message.recipient}`, { message });
    }
    return null;
  }
  
  // Continue with normal processing...
}
```

## Testing Procedure

1. Disable `DISABLE_BACKGROUND_WORKERS` in your `.env.local` file
2. Restart the development server
3. Check logs to confirm all 7 agents are properly registered
4. Submit a test task via `/test/a2a-integration`
5. Verify the message flow from task creation through CoordinatorAgent to ScenePlannerAgent

After implementing these fixes, the A2A system should correctly route messages between all properly registered agents. 