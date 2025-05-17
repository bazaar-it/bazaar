# A2A Dashboard README

## Overview

The A2A Evaluation Dashboard provides a comprehensive interface for testing and monitoring the Agent-to-Agent (A2A) system in Bazaar-Vid. It allows you to:

1. Create new tasks with specific agents
2. Monitor task progress in real-time via SSE connections
3. View task outputs and artifacts
4. Debug agent interactions

## Location

The dashboard is available at: `http://localhost:3000/test/evaluation-dashboard`

## Key Components

### TaskCreationPanel

Allows you to create new A2A tasks with:
- A prompt/task description
- A target agent selection
- Optional advanced parameters

### Task Monitoring

- Real-time status updates via Server-Sent Events (SSE)
- Visual indicators of task state
- Timeline of task progression
- Display of generated artifacts with links

## Workflow for Testing

1. **Create a Task**:
   - Navigate to the "Create Task" tab
   - Select a target agent (e.g., "CoordinatorAgent")
   - Enter a prompt (e.g., "Create a 5 seconds animation of a snake game")
   - Click "Create Task"
   
2. **Monitor the Task**:
   - The UI will automatically switch to the "Monitor Task" tab
   - You'll see real-time updates on the task state
   - When artifacts are generated, they'll appear in the list
   - You can click on artifact URLs to view them
   
3. **Reset or Monitor Another Task**:
   - Use the "Reset View" button to clear the current task
   - Or enter a specific task ID to monitor an existing task

## Troubleshooting

### SSE Connection Issues

If you experience connection problems (rapid connect/disconnect cycles):

1. **Check Browser Console**: Look for SSE-related errors
2. **Service Workers**: If you see errors related to service workers:
   - Open Chrome DevTools > Application > Service Workers
   - Unregister all service workers for the localhost domain
   - Check "Update on reload" to prevent caching issues
   - Refresh the page

3. **Connection State**: The dashboard now displays detailed connection states:
   - **Disconnected**: No active connection
   - **Connecting to task: [id]**: Establishing connection
   - **Connected to task: [id]**: Active connection
   - **Disconnecting from task: [id]**: Closing connection

4. **Browser Resources**: If the browser becomes unresponsive:
   - Close the tab completely
   - Reopen and navigate directly to the dashboard
   - Consider clearing browser cache if issues persist

### Task Creation Issues

If tasks fail to create:

1. **Check Error Messages**: The dashboard will display validation errors
2. **Inspect Network Requests**: Look for failed calls to `/api/trpc/a2a.createTask`
3. **Verify Prompt**: Ensure prompt isn't empty and doesn't contain invalid characters

## Known Limitations

1. **Limited User Feedback**: Currently missing a dedicated chat panel for rich user interaction
2. **Input Structure**: The current implementation sends simplified task inputs rather than fully structured data
3. **Agent Implementation Gaps**: The CoordinatorAgent may not implement the full workflow sequence
4. **No Video Preview**: Direct preview of generated videos in the dashboard is not yet implemented

## Debugging Tools

The dashboard includes a "Debug Information" panel at the bottom which displays:
- Current connection state
- Task IDs being monitored
- SSE connection status
- Latest status and artifact updates
- Error information

Use this information to diagnose issues with task processing or SSE connections.

## Implementation Notes

The dashboard uses the following key patterns:

1. **State Machine for Connections**: The SSE connection is managed by a formal state machine with explicit states
2. **Throttled Event Handling**: Events are throttled to prevent UI performance issues
3. **Service Worker Management**: Automatic cleanup of service workers that might interfere with SSE
4. **Debounced Transitions**: Connection state changes are debounced to prevent rapid cycles

## Future Enhancements

Planned improvements include:

1. **ChatPanel**: A dedicated panel for rich user interaction
2. **Remotion Player Integration**: Direct preview of generated videos
3. **Enhanced Artifact Visualization**: Better display of different artifact types
4. **Detailed Workflow Steps**: More granular progress tracking
5. **Structured Input Builder**: Improved UI for constructing complex task inputs

## Contributing

When modifying the A2A Dashboard:

1. Maintain the connection state machine pattern
2. Keep proper throttling on events and state transitions
3. Use proper cleanup in useEffect hooks
4. Test thoroughly with different task types
5. Update the debug information to include relevant state 