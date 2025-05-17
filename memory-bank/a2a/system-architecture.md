# A2A System Architecture

## System Overview

The Agent-to-Agent (A2A) system provides a framework for autonomous agents to collaborate on complex tasks such as video generation. Following Google's A2A protocol, our implementation enables agents to:

1. Register capabilities and skills
2. Receive and process tasks
3. Communicate with other agents
4. Report status updates in real-time
5. Generate artifacts (e.g., code, designs, videos)

## Core Components

### Backend Services

#### Agent Registry and Discovery
- **agentRegistry.service.ts** - Maintains registry of available agents and their capabilities
- **agentDiscovery.service.ts** - Helps agents discover and interact with other agents

#### Task Management
- **taskManager.service.ts** - Creates, tracks, and manages lifecycle of tasks
- **taskProcessor.service.ts** - Processes task requests and routes to appropriate agents

#### Communication
- **message-bus.ts** - Central message broker for agent communication
- **sseManager.service.ts** - Manages Server-Sent Events for real-time updates to clients

### Agent Implementation

#### Base Agent Framework
- **base-agent.ts** - Common agent functionality and protocol implementation
- **setup.ts** - Agent initialization and configuration

#### Specialized Agents
- **coordinator-agent.ts** - Orchestrates multi-agent workflows
- **scene-planner-agent.ts** - Plans video scenes based on user requirements
- **adb-agent.ts** - Creates Animation Design Briefs
- **builder-agent.ts** - Generates component code
- **error-fixer-agent.ts** - Fixes errors in generated components
- **r2-storage-agent.ts** - Manages asset storage and retrieval
- **ui-agent.ts** - Handles UI component generation

### Frontend Components

#### Integration Testing
- **A2AIntegrationTest.tsx** - Main test interface for A2A interactions
- **SimpleA2ATest.tsx** - Simplified version for focused testing

#### Task Management and Visualization
- **TaskCreationPanel.tsx** - Interface for creating new tasks
- **TaskInputForm.tsx** - Form for submitting task requirements
- **TaskDetails.tsx** - Displays detailed task information
- **TaskTimeline.tsx** - Timeline visualization of task progress
- **TaskStatusBadge.tsx** - Status indicator for tasks

#### Agent Visualization
- **AgentCard.tsx** - Displays agent details and capabilities
- **AgentNetworkGraph.tsx** - Visual graph of agent communications

#### Content Visualization
- **AnimationDesignBriefViewer.tsx** - Displays generated animation design briefs
- **CodeViewer.tsx** - Shows generated component code
- **RemotionPreview.tsx** - Preview of rendered video components

## Communication Flow

```
┌────────────┐     ┌─────────────────┐      ┌─────────────────┐
│ Client UI  │────▶│ Task Management │◀────▶│  Agent Registry │
└────────────┘     └─────────────────┘      └─────────────────┘
      ▲                    │                        │
      │                    ▼                        ▼
      │             ┌─────────────┐         ┌──────────────┐
      │             │ Message Bus │◀───────▶│ Base Agents  │
      │             └─────────────┘         └──────────────┘
      │                    │                        │
      │                    ▼                        ▼
┌─────────────┐     ┌─────────────────┐     ┌──────────────────┐
│ SSE Manager │◀───▶│ Task Processor  │◀───▶│ Specialized Agents│
└─────────────┘     └─────────────────┘     └──────────────────┘
```

## A2A Message Protocol

Following the Google A2A specification:

1. **JSON-RPC Format**: All agent communication uses JSON-RPC 2.0
2. **Task States**: Tasks follow a standard state transition (submitted → working → completed/failed)
3. **Message Types**:
   - Text messages (for instructions and responses)
   - File artifacts (for generated content)
   - Data artifacts (for structured information)

### Example Message Flow

```
1. Client → System: Submit prompt "Create a space video"
2. System → UserInteractionAgent: Create task with prompt
3. UserInteractionAgent → CoordinatorAgent: Process and structure requirements
4. CoordinatorAgent → ScenePlannerAgent: Generate scene plan
5. ScenePlannerAgent → ADBAgent: Create animation design brief
6. ADBAgent → BuilderAgent: Generate component code
7. BuilderAgent → Client: Return completed video components
```

## Real-time Status Updates

The system uses Server-Sent Events (SSE) to provide real-time updates:

1. Client subscribes to SSE endpoint for a specific task
2. As agents process the task, they emit status events
3. Message bus forwards events to SSE manager
4. Client receives updates and updates UI components accordingly

## Integration with Existing Services

The A2A system integrates with existing Bazaar-Vid services:

- **scenePlanner.service.ts** - Scene planning logic
- **animationDesigner.service.ts** - Animation design brief generation
- **Remotion Component Generation** - Component code creation and rendering
- **R2 Storage** - Asset storage and retrieval

## Security and Error Handling

- Agents validate inputs according to their capabilities
- Task status transitions include error states
- Communication timeouts and retries are implemented
- All agent interactions are logged for debugging 