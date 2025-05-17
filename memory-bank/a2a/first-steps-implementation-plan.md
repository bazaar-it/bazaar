# A2A First Steps: Implementation Plan

## Implementation Roadmap

This document provides a practical, step-by-step plan for implementing the first working A2A communication flow in the Bazaar-Vid platform. The focus is on establishing basic communication between a user input agent and a coordinator agent.

## Phase 1: Environment Setup and Verification (1-2 days)

### Step 1: Verify Existing Components

1. **Review agent implementations in `src/server/agents/`**
   - Ensure `base-agent.ts` provides core A2A functionality
   - Check `coordinator-agent.ts` implements basic orchestration logic
   - Verify any initialization in `setup.ts`

2. **Review service implementations in `src/server/services/a2a/`**
   - Validate `taskManager.service.ts` for task creation/tracking
   - Check `sseManager.service.ts` for client updates
   - Examine `agentRegistry.service.ts` for agent registration

3. **Review frontend components**
   - Test `A2AIntegrationTest.tsx` or `SimpleA2ATest.tsx` in browser
   - Verify `TaskInputForm.tsx` for prompt submission
   - Check visualization components like `AgentNetworkGraph.tsx`

### Step 2: Fix Any Gaps in Core Implementation

1. **Complete agent registration**
   ```typescript
   // Ensure agentRegistry.service.ts has a working register method
   const registerAgent = (agent: BaseAgent): void => {
     // Implementation here
   }
   ```

2. **Implement basic message bus if needed**
   ```typescript
   // Ensure message-bus.ts has working publish/subscribe
   const messageBus = {
     publish: (topic: string, message: any) => {
       // Implementation here
     },
     subscribe: (topic: string, handler: (message: any) => void) => {
       // Implementation here
     }
   }
   ```

3. **Verify SSE Manager implementation**
   ```typescript
   // Ensure sseManager.service.ts can send updates
   const sendUpdate = (taskId: string, update: any) => {
     // Implementation here
   }
   ```

## Phase 2: Minimal Viable Implementation (3-4 days)

### Step 1: Implement First Agent Card

1. **Create a simple UserInteractionAgent card**
   ```typescript
   // In src/server/agents/user-interaction-agent.ts or similar
   const agentCard: AgentCard = {
     name: 'User Interaction Agent',
     description: 'Handles initial user prompts and requirements',
     url: '/api/a2a/agents/user-interaction',
     provider: {
       name: 'Bazaar-Vid',
     },
     version: '0.1.0',
     capabilities: {
       streaming: true,
       pushNotifications: true,
       stateTransitionHistory: true
     },
     defaultInputModes: ['text'],
     defaultOutputModes: ['text'],
     skills: [
       {
         id: 'processUserPrompt',
         name: 'Process User Prompt',
         description: 'Interprets user instructions for video creation',
         inputModes: ['text'],
         outputModes: ['text'],
       }
     ]
   };
   ```

2. **Register the agent with the system**
   ```typescript
   // In src/server/services/a2a/initializeAgents.ts or similar
   registerAgent(new UserInteractionAgent());
   ```

### Step 2: Implement Task Submission Flow

1. **Connect TaskInputForm to backend**
   ```typescript
   // In TaskInputForm.tsx or similar
   const handleSubmit = async (prompt: string) => {
     const response = await fetch('/api/a2a/tasks', {
       method: 'POST',
       headers: {
         'Content-Type': 'application/json',
       },
       body: JSON.stringify({
         prompt,
       }),
     });
     
     const { taskId } = await response.json();
     // Handle successful task creation
   };
   ```

2. **Implement task creation endpoint**
   ```typescript
   // In src/server/api/routers/a2a.ts or similar
   router.post('/tasks', async (req, res) => {
     const { prompt } = req.body;
     const taskId = await taskManager.createTask({
       message: {
         parts: [{
           type: 'text',
           text: prompt
         }]
       }
     });
     
     res.json({ taskId });
   });
   ```

### Step 3: Implement SSE Subscription

1. **Set up SSE endpoint for task updates**
   ```typescript
   // In src/server/api/routers/a2a.ts or similar
   router.get('/tasks/:taskId/events', async (req, res) => {
     const { taskId } = req.params;
     
     // Set headers for SSE
     res.writeHead(200, {
       'Content-Type': 'text/event-stream',
       'Cache-Control': 'no-cache',
       'Connection': 'keep-alive',
     });
     
     // Register client for updates
     sseManager.registerClient(taskId, res);
     
     // Handle client disconnection
     req.on('close', () => {
       sseManager.unregisterClient(taskId, res);
     });
   });
   ```

2. **Implement client-side SSE connection**
   ```typescript
   // In A2AIntegrationTest.tsx or similar
   const connectToTaskEvents = (taskId: string) => {
     const eventSource = new EventSource(`/api/a2a/tasks/${taskId}/events`);
     
     eventSource.onmessage = (event) => {
       const data = JSON.parse(event.data);
       // Handle task updates
     };
     
     return () => {
       eventSource.close();
     };
   };
   ```

### Step 4: Implement Basic Agent Communication

1. **UserInteractionAgent processes the prompt**
   ```typescript
   // In user-interaction-agent.ts
   async processUserPrompt(taskId: string, prompt: string) {
     // Update task status
     await taskManager.updateTaskStatus(taskId, 'working');
     
     // Process the prompt (simple version)
     const structuredRequest = {
       purpose: 'Create video',
       userPrompt: prompt,
       // Other metadata
     };
     
     // Forward to CoordinatorAgent
     await messageBus.publish('coordinator.request', {
       taskId,
       data: structuredRequest
     });
   }
   ```

2. **CoordinatorAgent receives and acknowledges**
   ```typescript
   // In coordinator-agent.ts
   constructor() {
     super();
     messageBus.subscribe('coordinator.request', this.handleRequest.bind(this));
   }
   
   async handleRequest(message: any) {
     const { taskId, data } = message;
     
     // Update task status
     await taskManager.updateTaskStatus(taskId, 'working', {
       parts: [{
         type: 'text',
         text: 'Coordinator planning your video creation'
       }]
     });
     
     // In the minimal version, just respond with success
     setTimeout(async () => {
       await taskManager.updateTaskStatus(taskId, 'completed', {
         parts: [{
           type: 'text',
           text: 'Coordinator has processed your request: ' + data.userPrompt
         }]
       });
     }, 2000); // Simulate processing time
   }
   ```

## Phase 3: Testing and Visualization (2-3 days)

### Step 1: Update Frontend to Display Agent Interactions

1. **Update AgentNetworkGraph**
   ```typescript
   // In AgentNetworkGraph.tsx
   // Add nodes for UserInteractionAgent and CoordinatorAgent
   // Add edge for their communication
   ```

2. **Update TaskTimeline**
   ```typescript
   // In TaskTimeline.tsx
   // Display status transitions
   ```

### Step 2: Testing Protocol

1. Create test cases for:
   - Task submission
   - SSE connection
   - Status updates
   - Agent communication

2. Manual testing procedure:
   - Open `/test/a2a-integration` or `/test/evaluation-dashboard`
   - Submit a prompt through TaskInputForm
   - Monitor TaskTimeline for status changes
   - Verify AgentNetworkGraph shows communication
   - Check that CoordinatorAgent responds

## Phase 4: Integration with Existing Services (3-4 days)

### Step 1: Connect CoordinatorAgent to ScenePlannerAgent

1. **Extend CoordinatorAgent to call ScenePlannerAgent**
   ```typescript
   // In coordinator-agent.ts
   async handleRequest(message: any) {
     // ...existing code...
     
     // Call ScenePlannerAgent
     await messageBus.publish('scene-planner.request', {
       taskId,
       data: {
         prompt: data.userPrompt,
         // Other metadata
       }
     });
   }
   ```

2. **ScenePlannerAgent implementation**
   ```typescript
   // In scene-planner-agent.ts
   constructor() {
     super();
     messageBus.subscribe('scene-planner.request', this.handleRequest.bind(this));
   }
   
   async handleRequest(message: any) {
     const { taskId, data } = message;
     
     // Call existing scenePlanner.service.ts with data
     const scenePlan = await scenePlannerService.handleScenePlan(
       'temp-project-id', // For testing
       'temp-user-id',    // For testing
       data.prompt
     );
     
     // Return result to coordinator
     await messageBus.publish('coordinator.scene-plan-result', {
       taskId,
       scenePlan
     });
   }
   ```

## Timeline and Milestones

### Week 1
- Day 1-2: Complete Phase 1 (Environment Setup)
- Day 3-5: Complete Phase 2 (Minimal Implementation)

### Week 2
- Day 1-2: Complete Phase 3 (Testing and Visualization)
- Day 3-5: Begin Phase 4 (Integration with Services)

### Week 3
- Day 1-3: Complete Phase 4
- Day 4-5: Final testing and documentation

## Implementation Metrics

Track progress using:

1. **Functional Metrics**
   - Number of working agent interactions
   - Task state transitions working correctly
   - UI components updating properly

2. **Technical Metrics**
   - Code quality and test coverage
   - Performance (latency of agent responses)
   - Reliability of SSE connections 