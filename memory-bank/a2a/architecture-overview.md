//memory-bank/a2a/architecture-overview.md

# A2A System Architecture Overview

## High-Level Architecture

The Agent-to-Agent (A2A) system is designed with a message-passing architecture that enables autonomous agents to collaborate on complex tasks while maintaining separation of concerns. The system consists of several key components:

```
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│                 │   │                 │   │                 │   │                 │
│  Builder Agent  │◄──┼──►Error Fixer   │◄──┼──► R2 Storage   │◄──┼──► UI Agent     │
│                 │   │     Agent       │   │     Agent       │   │                 │
└─────────────────┘   └─────────────────┘   └─────────────────┘   └─────────────────┘
        ▲                                                                  │
        │                                                                  │
        │                                                                  ▼
┌─────────────────┐                                              ┌─────────────────┐
│                 │                                              │                 │
│  Coordinator    │◄─────────────────────────────────────────────│  ADB Agent     │
│                 │                                              │                 │
└─────────────────┘                                              └─────────────────┘
```

## Core Principles

1. **Separation of Concerns**: Each agent has a specific responsibility in the pipeline.
2. **Message-Based Communication**: Agents communicate exclusively through a message bus, with well-defined message types.
3. **Persistence**: All messages are stored in the database for traceability and debugging.
4. **Resilience**: Failures in one agent can be detected and handled by other agents.
5. **Extensibility**: New agents can be added to the system without modifying existing ones.
6. **A2A Protocol Compliance**: Alignment with Google's A2A protocol for interoperability.

## Google A2A Protocol Alignment

Our architecture incorporates key elements from Google's [Agent-to-Agent (A2A) protocol](https://github.com/google/A2A), an open standard for agent communication and interoperability:

### Task Lifecycle

Following the A2A protocol, component jobs follow a standardized task lifecycle:

1. **Submitted** - Task received, not yet started
2. **Working** - Task actively being processed (e.g., generating, building, fixing)
3. **Input-Required** - Agent needs additional input to proceed
4. **Completed** - Task successfully finished
5. **Canceled** - Task was canceled by request
6. **Failed** - Task encountered an error
7. **Unknown** - Task state cannot be determined

Each state transition is tracked with a timestamp and associated message, providing a detailed history of the task's progress.

### Agent Discovery

Each agent exposes its capabilities via an AgentCard, a standardized JSON metadata format containing:

- **Name and Description**: Human-readable details about the agent
- **Capabilities**: Features like streaming, push notifications
- **Skills**: Specific tasks the agent can perform 
- **Input/Output Modes**: Content types the agent can process/produce

AgentCards are available via well-known endpoints and enable dynamic discovery of agent capabilities.

### Structured Content Types

Agents exchange information using standardized content types:

- **TextPart**: Textual content
- **FilePart**: File content (via URI or base64 encoding)
- **DataPart**: Structured JSON data

These content types are assembled into Messages (for communication) and Artifacts (for outputs).

### Real-Time Updates

Component status updates are delivered in real-time via Server-Sent Events (SSE), replacing the previous Pusher implementation. This enables:

- Streaming progress updates
- Real-time status changes
- File artifact notifications
- Client reconnection support

## System Components

### Message Bus

The central nervous system of the A2A architecture. It:
- Routes messages between agents
- Maintains a registry of available agents
- Persists messages for audit and troubleshooting
- Provides subscription capabilities for monitoring
- Supports SSE streaming for real-time updates

### Agents

Specialized components that handle specific tasks:

1. **Coordinator Agent**: Orchestrates the overall process and handles job creation
2. **Builder Agent**: Generates and builds component code
3. **Error Fixer Agent**: Identifies and fixes errors in component code
4. **R2 Storage Agent**: Manages component storage in R2
5. **UI Agent**: Updates the UI based on component status
6. **ADB Agent**: Handles Animation Design Brief generation and updates

### Database Schema

The system includes:
- `agent_messages` table to track all communications between agents
- Enhanced `customComponentJobs` table with A2A-compliant task states and artifacts
- Support for storing message history and content parts

## Process Flow

1. A component generation request initiates with the Coordinator Agent
2. The Coordinator creates a component job with "submitted" status and sends it to the Builder Agent
3. The Builder updates the job to "working" and generates code
4. If errors occur, the Builder sends the code to the Error Fixer Agent
5. The Error Fixer attempts to fix issues and returns the code to the Builder
6. When successfully built, the component is sent to the R2 Storage Agent which verifies storage
7. The job reaches "completed" status with associated artifacts
8. Clients receive real-time updates via SSE throughout the process

## Advantages of A2A-Aligned Architecture

1. **Improved Traceability**: Every step in the process is tracked with standard task states
2. **Better Error Handling**: Each agent can specialize in handling specific types of errors
3. **Retry Capabilities**: Failed operations can be retried without restarting the entire process
4. **Standardized Communication**: Using protocol-compliant message formats
5. **Interoperability**: Potential to integrate with other A2A-compliant systems
6. **Real-Time Updates**: SSE streaming for immediate status changes

## Integration Points

The A2A system integrates with the existing Bazaar-Vid architecture through:

1. **tRPC**: A new agent router exposes agent operations to the frontend
2. **Database**: Uses the existing database with enhanced schema
3. **Existing Utilities**: Leverages current code generation, building, and R2 storage utilities
4. **API Routes**: New REST endpoints for A2A protocol compliance
5. **SSE Streaming**: Server-Sent Events for real-time updates
