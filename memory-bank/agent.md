# Agent-to-Agent (A2A) System in Bazaar-Vid

## Overview

The Bazaar-Vid platform implements Google's Agent-to-Agent (A2A) protocol to enable autonomous agents to collaborate on complex tasks such as video generation. This system allows multiple specialized agents to communicate, share information, and coordinate their activities to process user requests.

## Core Components

### Agent Architecture

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

| Agent | Description | Key Responsibilities |
|-------|-------------|----------------------|
| CoordinatorAgent | Orchestrates multi-agent workflows | Task delegation, workflow management |
| ScenePlannerAgent | Plans video scenes based on user requirements | Generate scene plans, structure video content |
| ADBAgent | Creates Animation Design Briefs | Generate structured animation specifications |
| BuilderAgent | Generates component code | Create React/Remotion components |
| ErrorFixerAgent | Fixes errors in generated components | Debug and repair component code |
| R2StorageAgent | Manages asset storage and retrieval | Upload/download from Cloudflare R2 |
| UserInteractionAgent | Handles user inputs and requirements | Process initial user prompts |

## Communication Flow

### A2A Message Protocol

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

## Agent Health Monitoring

Agents send periodic heartbeats to the `LifecycleManager`. When a heartbeat is
missed beyond a configurable threshold, the agent state transitions to `error`.
You can query `/api/a2a.getAgentStatuses` to see the latest heartbeat time and
state for each registered agent.

## Integration with Existing Services

The A2A system integrates with existing Bazaar-Vid services:

- **scenePlanner.service.ts** - Scene planning logic
- **animationDesigner.service.ts** - Animation design brief generation
- **Remotion Component Generation** - Component code creation and rendering
- **R2 Storage** - Asset storage and retrieval

## Frontend Components

### Integration Testing
- **A2AIntegrationTest.tsx** - Main test interface for A2A interactions
- **SimpleA2ATest.tsx** - Simplified version for focused testing

### Task Management and Visualization
- **TaskCreationPanel.tsx** - Interface for creating new tasks
- **TaskInputForm.tsx** - Form for submitting task requirements
- **TaskDetails.tsx** - Displays detailed task information
- **TaskTimeline.tsx** - Timeline visualization of task progress
- **TaskStatusBadge.tsx** - Status indicator for tasks

### Agent Visualization
- **AgentCard.tsx** - Displays agent details and capabilities
- **AgentNetworkGraph.tsx** - Visual graph of agent communications

## Implementation Roadmap

The A2A system is being implemented in phases:

### Phase 1: Environment Setup and Verification
- Review existing agent implementations
- Validate service implementations
- Test frontend components

### Phase 2: Minimal Viable Implementation
- Implement agent cards
- Create task submission flow
- Set up SSE subscription
- Establish basic agent communication

### Phase 3: Testing and Visualization
- Update frontend to display agent interactions
- Create testing protocol

### Phase 4: Integration with Existing Services
- Connect CoordinatorAgent to ScenePlannerAgent
- Integrate with animation design and component generation

## Testing Strategy

Testing of the A2A system involves:

1. **Agent Registration and Discovery** - Verify agents can register and discover each other
2. **Basic Task Processing** - Test end-to-end processing of simple prompts
3. **Agent Communication** - Validate message passing between agents
4. **Error Handling** - Ensure system handles agent errors gracefully
5. **Integration with Existing Services** - Verify proper integration with existing services

## Resources and Documentation

For more detailed information, refer to the following documentation in the memory-bank folder:

- [A2A Protocol Communication](memory-bank/a2a/protocol-communication.md)
- [End-to-End Workflow](memory-bank/a2a/end-to-end-workflow.md)
- [Frontend Integration](memory-bank/a2a/frontend-integration.md)
- [Implementation Roadmap](memory-bank/a2a/implementation-roadmap.md)
- [Testing Strategy](memory-bank/a2a/testing-strategy.md)
