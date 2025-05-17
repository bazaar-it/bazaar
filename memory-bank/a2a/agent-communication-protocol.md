# A2A Communication Protocol

## Overview

This document details the communication protocol used between agents in our A2A (Agent-to-Agent) system. The protocol follows the Google A2A specification for standardized agent communication, enabling agents to work together on complex tasks like video generation.

## Message Types

### 1. Task-Related Messages

#### Task Creation
```typescript
{
  jsonrpc: '2.0',
  id: 'req-1',
  method: 'createTask',
  params: {
    message: {
      parts: [{
        type: 'text',
        text: 'Create a video about space exploration'
      }]
    }
  }
}
```

#### Task Status Updates
```typescript
{
  jsonrpc: '2.0',
  id: 'req-2',
  method: 'updateTaskStatus',
  params: {
    task_id: 'task-123',
    state: 'working',
    message: {
      parts: [{
        type: 'text',
        text: 'Working on your video about space exploration'
      }]
    }
  }
}
```

### 2. Agent-to-Agent Communication

#### Request to Another Agent
```typescript
{
  jsonrpc: '2.0',
  id: 'req-3',
  method: 'executeSkill',
  params: {
    skill_id: 'generateScenePlan',
    task_id: 'task-123',
    input: {
      message: {
        parts: [{
          type: 'text',
          text: 'Create scene plan for space exploration video'
        }]
      }
    }
  }
}
```

#### Response from Agent
```typescript
{
  jsonrpc: '2.0',
  id: 'req-3',
  result: {
    message: {
      parts: [{
        type: 'text',
        text: 'Scene plan generated successfully'
      }]
    },
    artifacts: [{
      id: 'artifact-456',
      type: 'data',
      mimeType: 'application/json',
      data: {
        // Scene plan data
      }
    }]
  }
}
```

### 3. Artifacts

#### File Artifact
```typescript
{
  id: 'artifact-789',
  type: 'file',
  mimeType: 'application/javascript',
  url: 'https://example.com/components/spaceship.jsx',
  name: 'SpaceshipComponent',
  description: 'React component for animated spaceship',
  createdAt: '2023-06-15T12:34:56Z'
}
```

#### Data Artifact
```typescript
{
  id: 'artifact-101',
  type: 'data',
  mimeType: 'application/json',
  data: {
    // Structured data like animation design brief
  },
  description: 'Animation design brief for space scene',
  createdAt: '2023-06-15T12:40:22Z'
}
```

## SSE Event Format

Server-Sent Events are used to provide real-time updates to clients:

```typescript
{
  id: 'event-123',
  event: 'task_status_update',
  data: JSON.stringify({
    type: 'task_status_update',
    data: {
      task_id: 'task-123',
      state: 'working',
      message: {
        parts: [{
          type: 'text',
          text: 'Working on generating components'
        }]
      }
    }
  })
}
```

## Agent Card Format

Each agent exposes a card that describes its capabilities:

```typescript
{
  name: 'Scene Planner Agent',
  description: 'Creates structured scene plans for videos',
  url: 'http://localhost:3000/api/a2a/agents/scene-planner',
  provider: {
    name: 'Bazaar-Vid',
    url: 'https://bazaar-vid.example.com'
  },
  version: '1.0.0',
  documentationUrl: 'https://bazaar-vid.example.com/docs/scene-planner',
  capabilities: {
    streaming: true,
    pushNotifications: true,
    stateTransitionHistory: true
  },
  defaultInputModes: ['text'],
  defaultOutputModes: ['text', 'data'],
  skills: [
    {
      id: 'generateScenePlan',
      name: 'Generate Scene Plan',
      description: 'Creates a detailed plan for video scenes',
      inputModes: ['text'],
      outputModes: ['text', 'data'],
      // Additional skill details
    }
  ]
}
```

## Communication Patterns

### 1. Task Lifecycle

1. **Task Creation**: Client creates a task with user prompt
2. **Initial Processing**: Task is assigned to UserInteractionAgent
3. **Task Delegation**: UserInteractionAgent delegates to CoordinatorAgent
4. **Subtask Creation**: CoordinatorAgent breaks down into subtasks for specialized agents
5. **Status Updates**: All agents provide real-time updates via SSE
6. **Artifact Generation**: Various artifacts are produced (scene plans, ADBs, components)
7. **Task Completion**: Final results returned to client

### 2. Agent-to-Agent Interaction

#### Direct Request
Agent A sends a request directly to Agent B:
```
Agent A → Agent B: executeSkill request
Agent B → Agent A: skill execution result
```

#### Message Bus Mediation
```
Agent A → Message Bus → Agent B: request
Agent B → Message Bus → Agent A: response
```

#### Multi-agent Collaboration
```
UserInteractionAgent → CoordinatorAgent → ScenePlannerAgent → ADBAgent → BuilderAgent
```

## Error Handling

### Error Response Format
```typescript
{
  jsonrpc: '2.0',
  id: 'req-5',
  error: {
    code: 500,
    message: 'Failed to generate scene plan',
    data: {
      // Additional error details
    }
  }
}
```

### Common Error Codes
- 400: Invalid request format
- 404: Resource not found
- 422: Validation error
- 500: Internal agent error
- 503: Agent temporarily unavailable

## Implementation Notes

1. **Message Validation**: All messages should be validated against the A2A schema
2. **Timeout Handling**: Include timeout mechanisms for agent communication
3. **Retries**: Implement retry logic for failed communications
4. **Observability**: Log all agent interactions for debugging and analysis 