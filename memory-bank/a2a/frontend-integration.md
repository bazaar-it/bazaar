//memory-bank/a2a/frontend-integration.md

# A2A Frontend Integration

This document details the React hooks and components that have been created for integrating the Google A2A protocol into the frontend of Bazaar-Vid, particularly focusing on SSE (Server-Sent Events) for real-time task status updates.

## Overview

The frontend integration consists of:

1. **React Hooks** for connecting to the SSE endpoint and managing task status updates
2. **UI Components** for displaying task status information and handling user interactions

These components and hooks are designed to be type-safe, reusable, and follow best practices for React development.

## Hooks

### `useSSE`

A foundational hook for managing SSE connections to the A2A backend.

**Location:** `src/client/hooks/sse/useSSE.ts`

**Purpose:** Provides a reliable connection to the SSE endpoint with automatic reconnection, error handling, and event processing.

**API:**

```typescript
function useSSE(options?: UseSSEOptions): UseSSEResult;

interface UseSSEOptions {
  onTaskStatusUpdate?: (event: TaskStatusUpdateEvent) => void;
  onTaskArtifactUpdate?: (event: TaskArtifactUpdateEvent) => void;
  onError?: (event: ErrorEvent) => void;
  onHeartbeat?: (event: HeartbeatEvent) => void;
  onOpen?: () => void;
  onClose?: () => void;
}

interface UseSSEResult {
  isConnected: boolean;
  error: Error | null;
  connect: () => void;
  disconnect: () => void;
  subscribe: (taskId: string) => void;
  unsubscribe: (taskId: string) => void;
}
```

**Example Usage:**

```tsx
import { useSSE } from '~/client/hooks/sse';

function TaskMonitor() {
  const { isConnected, error, subscribe, unsubscribe } = useSSE({
    onTaskStatusUpdate: (event) => {
      console.log(`Task ${event.data.task_id} state: ${event.data.state}`);
    },
    onError: (event) => {
      console.error(`SSE Error: ${event.error.message}`);
    }
  });

  useEffect(() => {
    if (isConnected) {
      subscribe('task-123');
    }
    
    return () => {
      unsubscribe('task-123');
    };
  }, [isConnected, subscribe, unsubscribe]);

  return (
    <div>
      Connection Status: {isConnected ? 'Connected' : 'Disconnected'}
      {error && <div>Error: {error.message}</div>}
    </div>
  );
}
```

### `useTaskStatus`

A specialized hook for monitoring the status of a specific task.

**Location:** `src/client/hooks/sse/useTaskStatus.ts`

**Purpose:** Provides real-time updates on task status by combining the initial fetch with SSE subscription updates.

**API:**

```typescript
function useTaskStatus(
  taskId: string,
  options?: UseTaskStatusOptions
): {
  status: TaskStatus | null;
  isLoading: boolean;
  error: Error | null;
  lastUpdated: Date | null;
  refresh: () => Promise<TaskStatus | null>;
};

interface UseTaskStatusOptions {
  autoSubscribe?: boolean;
  onStatusChange?: (status: TaskStatus) => void;
}
```

**Example Usage:**

```tsx
import { useTaskStatus } from '~/client/hooks/sse';

function TaskStatusMonitor({ taskId }) {
  const { 
    status, 
    isLoading, 
    error, 
    lastUpdated, 
    refresh 
  } = useTaskStatus(taskId, {
    onStatusChange: (newStatus) => {
      console.log(`Task status changed to: ${newStatus.state}`);
    }
  });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      <h2>Task Status: {status?.state}</h2>
      {lastUpdated && (
        <p>Last updated: {lastUpdated.toLocaleTimeString()}</p>
      )}
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

## Components

### `TaskStatusBadge`

A visual component for displaying the current state of a task.

**Location:** `src/client/components/a2a/TaskStatusBadge.tsx`

**Purpose:** Provides a visual indication of task state with appropriate colors and labels.

**Props:**

```typescript
interface TaskStatusBadgeProps {
  status: TaskStatus | null;
  isLoading?: boolean;
  onRefresh?: () => Promise<void>;
  className?: string;
}
```

**Example Usage:**

```tsx
import { TaskStatusBadge } from '~/client/components/a2a';
import { useTaskStatus } from '~/client/hooks/sse';

function TaskDisplay({ taskId }) {
  const { status, isLoading, refresh } = useTaskStatus(taskId);
  
  return (
    <div className="task-container">
      <h3>Task ID: {taskId}</h3>
      <TaskStatusBadge
        status={status}
        isLoading={isLoading}
        onRefresh={refresh}
      />
    </div>
  );
}
```

### `TaskStatus`

A combined component that wraps `useTaskStatus` hook and `TaskStatusBadge` component.

**Location:** `src/client/components/a2a/TaskStatus.tsx`

**Purpose:** Provides a simple, out-of-the-box solution for displaying task status with real-time updates.

**Props:**

```typescript
interface TaskStatusProps {
  taskId: string;
  autoSubscribe?: boolean;
  className?: string;
  onStatusChange?: (status: TaskStatusType) => void;
}
```

**Example Usage:**

```tsx
import { TaskStatus } from '~/client/components/a2a';

function TaskItem({ taskId }) {
  return (
    <div className="task-item">
      <div className="task-header">
        <h4>Task: {taskId}</h4>
        <TaskStatus 
          taskId={taskId} 
          onStatusChange={(status) => {
            if (status.state === 'completed') {
              // Handle completion
            }
          }}
        />
      </div>
    </div>
  );
}
```

## Backend-Frontend Coordination

### Shared Interfaces
- Continue using `src/types/a2a.ts` as the source of truth for all data structures
- Any new data needed for input-required scenarios or artifact display should be added here first
- Ensure consistent typing between backend and frontend components

### API Contracts
- Frontend will rely on tRPC endpoints defined in `a2aRouter`
- Key endpoints include `getTaskStatus`, `submitTaskInput`, and `subscribeToTaskStatus`
- Message structures must match expected formats in TaskManager service

## Integration Guide

### Adding SSE Support to a Component

To add SSE support to a component that needs to monitor task status:

1. **Use the Component Approach** for simple cases:

```tsx
import { TaskStatus } from '~/client/components/a2a';

function MyComponent({ taskId }) {
  return (
    <div>
      <h2>My Task: {taskId}</h2>
      <TaskStatus taskId={taskId} />
    </div>
  );
}
```

2. **Use the Hook Approach** for more control:

```tsx
import { useTaskStatus } from '~/client/hooks/sse';

function MyComponent({ taskId }) {
  const { status, isLoading, error, refresh } = useTaskStatus(taskId);

  // Custom rendering based on task state
  const renderContent = () => {
    switch (status?.state) {
      case 'completed':
        return <div>Task completed successfully!</div>;
      case 'working':
        return <div>Working on your task...</div>;
      case 'failed':
        return (
          <div>
            <div>Task failed: {status.message?.content}</div>
            <button onClick={refresh}>Try Again</button>
          </div>
        );
      default:
        return <div>Waiting for task to start...</div>;
    }
  };

  return (
    <div>
      <h2>Task Progress</h2>
      {isLoading ? <div>Loading...</div> : renderContent()}
    </div>
  );
}
```

3. **Direct SSE Connection** for advanced use cases:

```tsx
import { useSSE } from '~/client/hooks/sse';
import { useState, useEffect } from 'react';

function TaskMonitor({ taskIds }) {
  const [taskStatuses, setTaskStatuses] = useState({});
  
  const { subscribe, unsubscribe, isConnected } = useSSE({
    onTaskStatusUpdate: (event) => {
      const { task_id, state } = event.data;
      setTaskStatuses(prev => ({
        ...prev,
        [task_id]: {
          state,
          lastUpdated: new Date(),
          message: event.data.message
        }
      }));
    }
  });
  
  useEffect(() => {
    if (isConnected) {
      // Subscribe to all task IDs
      taskIds.forEach(id => subscribe(id));
    }
    
    return () => {
      taskIds.forEach(id => unsubscribe(id));
    };
  }, [isConnected, taskIds, subscribe, unsubscribe]);
  
  // Custom rendering for multiple tasks
  return (
    <div className="task-monitor">
      <h2>Task Monitor</h2>
      {taskIds.map(id => (
        <div key={id} className="task-item">
          <div>Task ID: {id}</div>
          <div>
            Status: {
              taskStatuses[id]?.state || 'unknown'
            }
          </div>
        </div>
      ))}
    </div>
  );
}
```

## Best Practices

1. **Use Typed Components**: Always use the provided types for props and state to ensure type safety.

2. **Prefer High-Level Components**: For simple use cases, prefer `TaskStatus` over directly using the hooks.

3. **Handle Reconnection**: The hooks automatically handle reconnection, but you should still handle disconnected states in your UI.

4. **Clean Up Subscriptions**: Always use the cleanup function in useEffect to unsubscribe from task updates when components unmount.

5. **Error Handling**: Always include error handling in your components to provide user feedback.

## Implementation Notes

- The SSE implementation uses the native `EventSource` API
- All events are properly typed to match the backend implementation
- Reconnection is handled automatically with exponential backoff
- Task subscriptions are managed through the tRPC API

## Implementation Priorities

Based on the current state of the A2A implementation, the following are the prioritized next steps for the frontend integration:

### 1. Full Pusher to SSE Migration

**Why:** This is critical to ensure all real-time UI updates are consolidated onto the new A2A-compliant SSE streaming infrastructure. Running two separate real-time systems (Pusher and SSE) simultaneously will lead to complexity and potential inconsistencies.

**Implementation Plan:**
- Identify all UI components currently relying on Pusher for updates
- Systematically refactor them to use the new `useTaskStatus` and `useSSE` hooks
- Update how these components fetch initial data and handle real-time events
- Ensure consistent event handling across the application

### 2. Develop UI for input-required State

**Why:** The A2A protocol and our backend ErrorFixerAgent (and potentially other agents) are designed to handle scenarios where an agent needs more information from the user to proceed. The frontend needs to be able to render the appropriate UI to gather this input.

**Implementation Plan:**
- Create UI components that can display options or questions from agents
- Integrate these components with the `useTaskStatus` hook to detect the input-required state
- Implement forms/UI to capture user input
- Add logic to submit input back to agents via `a2a.submitTaskInput`

### 3. Basic Artifact Display

**Why:** As agents complete their work, they create artifacts. The UI needs to show these artifacts to users.

**Implementation Plan:**
- Extend the TaskStatus component or create a TaskArtifactsViewer
- Display list of available artifacts for tasks
- Implement basic rendering based on artifact type
- Add download capabilities for relevant artifacts

### Future Enhancements

After completing the priority items above, additional components will be implemented:

1. **Task List Component**: A reusable component for displaying lists of tasks with filtering
2. **Task Details Panel**: A detailed view of task status, messages, and artifacts
3. **Task Console**: A console-like UI for viewing task logs and events
4. **Task Correlation UI**: Components to visualize relationships between tasks using correlationId

