//src/client/components/test-harness/MinimalA2ATest.tsx

'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { createTextMessage } from '~/types/a2a';

// Import our SSE components
import { useSSE } from '~/client/hooks/sse';
import { TaskMonitor } from '~/client/components/custom-component';

/**
 * Minimal A2A Testing Component
 * 
 * A very simplified test component with minimum dependencies
 * to validate our A2A frontend components with the backend.
 */
export function MinimalA2ATest() {
  const [taskId, setTaskId] = useState<string>('');
  const [manualTaskId, setManualTaskId] = useState<string>('');
  
  // SSE connection status
  const { isConnected: sseConnected } = useSSE();
  
  return (
    <div className="container max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">A2A Integration Test</h1>
      
      {/* SSE Connection Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>SSE Connection Status</CardTitle>
          <CardDescription>Current status of the SSE connection</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${sseConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>{sseConnected ? 'Connected' : 'Disconnected'}</span>
          </div>
        </CardContent>
      </Card>
      
      {/* Task Monitor Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Monitor Task</CardTitle>
          <CardDescription>Enter a task ID to monitor</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input
                value={manualTaskId}
                onChange={(e) => setManualTaskId(e.target.value)}
                placeholder="Enter task ID to monitor"
              />
            </div>
            <Button
              onClick={() => setTaskId(manualTaskId)}
              disabled={!manualTaskId.trim()}
            >
              Monitor
            </Button>
          </div>
          
          {taskId && (
            <div className="mt-4">
              <h3 className="font-medium mb-2">
                Task: <code className="text-xs bg-gray-100 p-1 rounded">{taskId}</code>
              </h3>
              <div className="border rounded-md p-4 bg-gray-50">
                <TaskMonitor taskId={taskId} showArtifacts={true} />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Manual API call instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Testing Instructions</CardTitle>
          <CardDescription>How to test with the backend</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h3 className="text-lg font-medium mb-2">Creating Tasks</h3>
            <p className="mb-4">
              To test task creation, use the Markus-provided API endpoints directly:
            </p>
            <pre className="bg-gray-100 p-4 rounded-md text-xs overflow-auto">
              {`// Example API call in browser console
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
  // Copy the task ID
  console.log('Task created:', data.result.id);
  // Use this ID in the form above
})
.catch(err => console.error('Error:', err));`}
            </pre>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
