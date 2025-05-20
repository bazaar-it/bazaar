# Project 2: A2A System Workflow Documentation

This document provides a comprehensive overview of the workflow for Project 2, which is the Agent-to-Agent (A2A) system approach using message-based architecture and specialized agents.

## Current Workflow

### From User Prompt to Final Video: Step-by-Step

1. **Task Creation**
   - **Entry Point**: `src/app/test/evaluation-dashboard/page.tsx`
   - **Request Flow**:
     - User enters a prompt in the test dashboard
     - UI calls the `a2a.createTask` tRPC mutation from `src/server/api/routers/a2a.ts`
     - The task is persisted to the database with status "pending"

2. **Task Discovery and Routing**
   - **Primary Service**: `src/server/services/a2a/taskProcessor.service.ts`
   - The TaskProcessor:
     - Polls the database for pending tasks
     - Routes tasks to the appropriate agent (typically CoordinatorAgent first)
     - Creates messages in the message bus

3. **Coordinator Agent Processing**
   - **Agent Implementation**: `src/server/agents/coordinator-agent.ts`
   - The CoordinatorAgent:
     - Analyzes the user prompt and task context
     - Decides which specialized agent should handle the task
     - Creates and publishes appropriate messages to the message bus

4. **Agent Communication**
   - **Message Bus**: `src/server/agents/message-bus.ts`
   - Messages flow through the bus:
     - Publishers send messages to specific recipients
     - Subscribers receive messages addressed to them
     - Status updates and artifacts are attached to tasks

5. **Scene Planning**
   - When scene planning is needed:
     - CoordinatorAgent sends a message to ScenePlannerAgent
     - ScenePlannerAgent (`src/server/agents/scene-planner-agent.ts`) processes the request
     - Scene plan is generated using LLM
     - Results are saved to the database and sent back via message bus

6. **Animation Design Brief (ADB) Generation**
   - For each scene in the plan:
     - CoordinatorAgent sends a message to ADBAgent
     - ADBAgent (`src/server/agents/adb-agent.ts`) generates a structured animation brief
     - Brief is saved to the database and sent back via message bus

7. **Component Generation**
   - For each animation design brief:
     - CoordinatorAgent sends a message to BuilderAgent
     - BuilderAgent (`src/server/agents/builder-agent.ts`) generates component code
     - If errors occur, ErrorFixerAgent may be invoked
     - Successful components are stored and registered

8. **Real-time Updates to UI**
   - **SSE Management**: `src/server/services/a2a/sseManager.service.ts`
   - Status updates flow to the UI via:
     - Task status updates (state transitions)
     - Artifact updates (new components, briefs, etc.)
     - Agent communication events

9. **Final Video Composition**
   - Components are made available for preview and rendering
   - UI can display the timeline and preview the result

## Challenges with Current Workflow

1. **Agent Lifecycle Management**
   - Instability during initialization and HMR
   - "Churn" of agent instances
   - No clear shutdown sequence

2. **Message Routing Reliability**
   - No guaranteed delivery mechanism
   - Limited error handling for failed deliveries
   - No persistent message storage

3. **Task Processor Stability**
   - Issues with polling mechanism
   - Singleton pattern implementation problems
   - Shared state management across HMR cycles

4. **Observability Challenges**
   - Excessive logging makes diagnosis difficult
   - Difficult to trace a request through multiple agents
   - Limited visualization of agent activity

5. **Error Recovery**
   - Incomplete error propagation
   - Limited retry capabilities
   - Task state can become inconsistent

## Idealized A2A Workflow

### Key Improvements

1. **Robust Agent Lifecycle**
   - Clear states (initializing, ready, processing, idle, stopping, error)
   - Graceful shutdown procedures
   - Stable across HMR and deployment

2. **Reliable Message Bus**
   - Acknowledgment system for critical messages
   - Dead letter handling for undeliverable messages
   - Optional persistence for critical message types

3. **Improved Task Management**
   - Transaction-based task state updates
   - Robust error propagation
   - Comprehensive retry strategies

4. **Enhanced Observability**
   - Structured, categorized logging
   - Request tracing across agent boundaries
   - Visual representation of agent communication

### Idealized Flow Diagram

```
User Request → Task Creation Service → Task Event → Task Processor →
                                                      │
                                                      ↓
                                              Coordinator Agent
                                                      │
                     ┌───────────────┬───────────────┼───────────────┬───────────────┐
                     ↓               ↓               ↓               ↓               ↓
              Scene Planner      ADB Agent       Builder Agent   Error Fixer     R2 Storage
                Agent                                Agent          Agent          Agent
                     │               │               │               │               │
                     └───────┬───────┴───────┬───────┴───────┬───────┘               │
                             │               │               │                       │
                             ↓               ↓               ↓                       ↓
                     Scene Plan Event    ADB Event    Component Event         Storage Event
                             │               │               │                       │
                             └───────┬───────┴───────┬───────┘                       │
                                     │               │                               │
                                     └───────┬───────┴───────────────────────────────┘
                                             │
                                             ↓
                                      Task Update Service
                                             │
                                             ↓
                                      SSE Manager Service
                                             │
                                             ↓
                                        User Interface
```

## Implementation Steps Toward Idealized Workflow

1. **Stabilize Agent Lifecycle**
   - Implement proper singleton pattern
   - Add heartbeat mechanism
   - Create controlled shutdown sequence

2. **Enhance Message Bus**
   - Add message acknowledgments
   - Implement dead letter queue
   - Consider optional persistence

3. **Improve Task Processor**
   - Refine polling strategy
   - Add transaction support
   - Enhance error handling

4. **Boost Observability**
   - Standardize logging format
   - Implement request tracing
   - Create agent activity visualization

5. **Refine Error Handling**
   - Implement consistent error patterns
   - Add retry capabilities with backoff
   - Provide detailed error context

## Comparison with Standard Workflow

While both the idealized standard workflow and A2A system incorporate event-driven patterns, key differences remain:

1. **Architecture Style**
   - Standard: Service-oriented with event communication
   - A2A: Agent-oriented with messaging infrastructure

2. **Processing Model**
   - Standard: Primarily synchronous with asynchronous elements
   - A2A: Fully asynchronous, distributed processing

3. **Decision Making**
   - Standard: Centralized decision logic in orchestration service
   - A2A: Distributed intelligence across specialized agents

4. **Complexity vs. Flexibility**
   - Standard: Lower complexity, more predictable flow
   - A2A: Higher complexity but more flexible and extensible

The A2A system represents a more sophisticated approach suitable for complex video generation tasks that benefit from specialized agent knowledge and parallel processing.

## Current Status

Project 2 represents the Agent-to-Agent (A2A) system in Bazaar-Vid, currently being tested through `src/app/test/evaluation-dashboard/page.tsx`. This approach uses a message bus and task-based architecture where autonomous agents communicate to process user prompts and generate components.

### End-to-End Pipeline: From Prompt to Video

When a user submits a prompt in the A2A workflow, the following sequence occurs:

1. **User Input**
   - User navigates to `/test/evaluation-dashboard` where they see the A2A testing UI
   - User enters a prompt through the `TaskCreationPanel` component
   - Task creation request is sent to the tRPC router via `a2a.createTask` procedure

2. **Task Creation**
   - `src/server/api/routers/a2a.ts` receives the task creation request
   - Calls `taskManager.createTask()` in `taskManager.service.ts`
   - Creates a new task entry in the database with initial 'submitted' state
   - Assigns a unique taskId and emits a 'newTaskCreated' event

3. **Task Processing Initialization**
   - `taskProcessor.service.ts` listens for 'newTaskCreated' events
   - When a new task is detected, it initializes processing
   - Validates task parameters and updates task state to 'working'
   - Creates initial plan based on the task type (component generation)

4. **Agent Registration and Discovery**
   - `agentRegistry.service.ts` maintains the registry of available agents
   - On initialization, each agent registers with the MessageBus (in `message-bus.ts`)
   - The Coordinator Agent (`coordinator-agent.ts`) acts as the central orchestrator
   - Agent discovery mechanism (`agentDiscovery.service.ts`) helps locate needed agents

5. **Agent Communication**
   - Coordinator Agent receives the initial task message
   - Based on the task requirements, it delegates to specialized agents:
     - Animation Design Brief (ADB) Agent (`adb-agent.ts`) for design brief creation
     - Builder Agent (`builder-agent.ts`) for component implementation
     - Scene Planner Agent (`scene-planner-agent.ts`) for scene planning
     - Error Fixer Agent (`error-fixer-agent.ts`) for fixing code issues
   - Agents communicate via the MessageBus, sending structured messages
   - Each message is stored in the database and delivered to recipient agents

6. **Component Generation**
   - The Builder Agent receives component requirements from ADB Agent
   - Makes LLM calls to generate the component code
   - Checks code quality and may request help from Error Fixer Agent if issues exist
   - Component code is stored as a task artifact

7. **Progress Tracking and UI Updates**
   - `sseManager.service.ts` streams real-time updates to the client
   - Task status changes, agent communications, and artifacts are streamed via SSE
   - UI components like `AgentNetworkGraph` and `AgentMessageList` visualize the process

8. **Task Completion**
   - Once the component is successfully generated, task state is updated to 'completed'
   - Final artifacts (component code, animation design brief) are stored with the task
   - UI is updated to display the results in code viewers and preview panels

### Key Files in the A2A Workflow

```
src/
├── app/
│   └── test/
│       └── evaluation-dashboard/
│           └── page.tsx                               # Entry point for A2A testing
├── client/
│   ├── components/
│   │   ├── a2a/
│   │   │   └── AgentMessageList.tsx                   # Shows agent messages
│   │   └── test-harness/
│   │       ├── AgentNetworkGraph.tsx                  # Visualizes agent communication
│   │       ├── TaskCreationPanel.tsx                  # Creates new tasks
│   │       └── CodeViewer.tsx                         # Displays generated code
│   └── hooks/
│       └── a2a/
│           └── useAgentMessages.tsx                   # Hook for real-time messages
├── server/
│   ├── agents/
│   │   ├── base-agent.ts                              # Base agent class
│   │   ├── message-bus.ts                             # Communication infrastructure
│   │   ├── coordinator-agent.ts                       # Central orchestration agent
│   │   ├── adb-agent.ts                               # Animation Design Brief agent
│   │   ├── builder-agent.ts                           # Component building agent
│   │   ├── scene-planner-agent.ts                     # Scene planning agent
│   │   └── error-fixer-agent.ts                       # Code repair agent
│   ├── api/
│   │   └── routers/
│   │       └── a2a.ts                                 # tRPC A2A procedures
│   └── services/
│       └── a2a/
│           ├── agentRegistry.service.ts               # Agent registration service
│           ├── taskManager.service.ts                 # Task lifecycle management
│           ├── taskProcessor.service.ts               # Task processing engine
│           └── sseManager.service.ts                  # Server-sent events management
└── trpc/
    └── trpc.ts                                        # tRPC configuration
```

## Current Challenges

The A2A system is currently experiencing several challenges:

1. **Agent Lifecycle Management**: Agents are inconsistently initialized and terminated during development server restarts (HMR)
2. **Message Routing Stability**: Messages sometimes fail to reach target agents due to initialization timing issues
3. **Excessive Logging**: Current logging system produces overwhelming output without structured organization
4. **Singleton Management**: Multiple instances of agents and services can cause message routing problems
5. **Complex Dependency Graph**: Tight coupling between agents creates complex initialization order requirements
6. **Error Recovery**: Limited ability to recover from failures in the middle of a multi-agent workflow
7. **Component Generation Reliability**: Component generation sometimes fails without clear error information

## Current Assumptions

1. **Message-Based Architecture**: The system assumes reliable delivery of messages between agents.
2. **Agent State Independence**: Each agent should maintain minimal state and be resilient to restarts.
3. **Sequential Processing**: Tasks progress through states in a linear sequence.
4. **Database Persistence**: All important state is stored in the database for recovery.
5. **SSE for Real-time Updates**: Server-sent events provide UI updates, assuming stable connections.
6. **Bounded Context**: A2A operates somewhat independently from the rest of the application.
7. **Task-Based Organization**: All work is organized around tasks with specific lifecycle states.

## Ideal Simplified Architecture

If the A2A system were redesigned for simplicity, it could look like:

### Architecture Principles

1. **Reactive Core**: Use a reactive programming model with clear event streams.
2. **Clean Agent Lifecycle**: Provide clear initialization, operation, and shutdown phases.
3. **Message Guarantees**: Ensure reliable message delivery with retry and persistence.
4. **Stateless Agents**: Make agents more stateless, relying on tasks/database for state.
5. **Progressive Feedback**: Enable incremental feedback throughout the process.
6. **Isolation**: Better isolate the A2A subsystem from the rest of the application.

### Simplified Design

```
┌─────────────────┐  ┌───────────────────┐  ┌───────────────────┐  ┌────────────────────┐
│                 │  │                   │  │                   │  │                    │
│  User Input     │  │  Task Manager     │  │  Message Router   │  │   Agent Registry   │
│                 │  │                   │  │                   │  │                    │
└────────┬────────┘  └─────────┬─────────┘  └────────┬──────────┘  └──────────┬─────────┘
         │                     │                     │                        │
         │                     │                     │                        │
         │                     │                     │                        │
         ▼                     ▼                     ▼                        ▼
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                        │
│                               Event Bus / Message Broker                               │
│                                                                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
         ▲                     ▲                     ▲                        ▲
         │                     │                     │                        │
         │                     │                     │                        │
┌────────┴────────┐  ┌─────────┴─────────┐  ┌────────┴──────────┐  ┌──────────┴─────────┐
│                 │  │                   │  │                   │  │                    │
│  ADB Agent      │  │  Builder Agent    │  │  Scene Planner    │  │  Error Fixer       │
│                 │  │                   │  │                   │  │                    │
└─────────────────┘  └───────────────────┘  └───────────────────┘  └────────────────────┘
```

### Key Improvements

1. **Message Broker**:
   - Replace direct message bus with a true message broker system
   - Support guaranteed delivery, persistence, and message replay
   - Decouple producers and consumers completely

2. **Agent Lifecycle Management**:
   - Introduce clear agent lifecycle stages (init, ready, paused, terminated)
   - Make agents resilient to development restarts
   - Add proper cleanup on shutdown

3. **Reactive Core**:
   - Use reactive programming patterns consistently
   - Make message flow and transformations explicit
   - Support backpressure handling

4. **Task State Machine**:
   - Implement a formal state machine for task progression
   - Define clear transition rules between states
   - Support recovery from any state

5. **Structured Logging**:
   - Implement hierarchical, context-aware logging
   - Support filtering and aggregation by different dimensions
   - Include correlation IDs across the entire process

6. **Testing Support**:
   - Create agent mocks and simulators
   - Add message recording and replay capabilities
   - Support offline testing without full environment

This simplified architecture would resolve many of the current pain points while maintaining the A2A concept's flexibility. It would also make the system more observable, testable, and resilient to failures. 