# A2A Frontend Integration Testing

## Overview

This document tracks the progress of integration testing for the A2A frontend components with the backend implementation. The testing focuses on verifying that our SSE-based components correctly interact with the backend APIs and provide real-time status updates to users.

## Test Harness

We've created a comprehensive test harness at `/src/app/test/a2a-integration/page.tsx` that allows us to:

1. Test SSE connection and event handling
2. Create new A2A tasks
3. Monitor task status updates in real-time
4. Test input handling for "input-required" state
5. View task artifacts
6. Debug API interactions

## Components Under Test

The test harness validates the following components:

1. `useSSE` and `useTaskStatus` hooks
2. `ComponentStatusSSE` component
3. `TaskMonitor` component
4. `ArtifactViewer` component
5. `TaskInputForm` component

## Test Cases

| Test Case | Description | Status |
|-----------|-------------|--------|
| SSE Connection | Verify that the frontend can establish an SSE connection | Not Started |
| Agent Discovery | Fetch and display available agents | Not Started |
| Task Creation | Create a new task with a specified agent | Not Started |
| Task Status Monitoring | Monitor task status updates in real-time | Not Started |
| Input Required | Test the input submission flow when an agent requests user input | Not Started |
| Artifact Display | Verify that task artifacts are correctly displayed | Not Started |

## Integration Points

The frontend components integrate with the following backend APIs:

1. `a2a.createTask` - Create new A2A tasks
2. `a2a.getTaskStatus` - Fetch task status (used as a fallback)
3. `a2a.discoverAgents` - List available agents
4. `a2a.submitTaskInput` - Submit user input when prompted
5. SSE endpoint - Real-time task status updates

## How to Run Tests

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Navigate to `/test/a2a-integration` in your browser
3. Use the task monitor to view task status updates in real-time
4. For task creation, use the provided JSON-RPC example in the console
   - Copy the returned task ID into the monitor form
   - Observe real-time SSE updates from the backend

### Creating Tasks via JSON-RPC

Use the browser console to call the A2A JSON-RPC endpoint directly:

```javascript
fetch('/api/a2a', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    method: 'createTask',
    params: {
      agentType: 'coordinator',
      message: {
        type: 'text',
        parts: [{ text: 'Create a simple bouncing ball animation' }]
      }
    },
    id: 1
  })
})
.then(res => res.json())
.then(data => {
  console.log('Task created:', data.result.id);
  // Copy this ID into the task monitor form
})
.catch(err => console.error('Error:', err));
```

## Next Steps

1. Complete the integration tests for all components
2. Document any issues or edge cases discovered
3. Fix any compatibility issues between frontend and backend
4. Create automated tests for critical integration points

## Progress Updates

### 2025-05-16

- Created test harness component `A2AIntegrationTest.tsx`
- Created test page at `/test/a2a-integration`
- Set up test cases for SSE connection, task creation, task monitoring
- Integrated all new SSE-based components into the test harness
