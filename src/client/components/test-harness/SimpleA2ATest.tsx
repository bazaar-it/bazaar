//src/client/components/test-harness/SimpleA2ATest.tsx

'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import { Label } from '~/components/ui/label';
import { createTextMessage } from '~/types/a2a';

// Import our SSE components
import { useSSE, useTaskStatus } from '~/client/hooks/sse';
import { TaskMonitor } from '~/client/components/custom-component';

interface Agent {
  type: string;
  displayName?: string;
  version?: string;
}

/**
 * Simple A2A Integration Test Component
 * 
 * A simplified version of the test harness that focuses on the core functionality
 * we need to validate our A2A components.
 */
export function SimpleA2ATest() {
  const [taskId, setTaskId] = useState<string>('');
  const [inputTaskId, setInputTaskId] = useState<string>('');
  const [prompt, setPrompt] = useState('Create a simple animation that shows a bouncing ball');
  const [selectedAgentType, setSelectedAgentType] = useState<string>('coordinator');
  
  // SSE connection status
  const { isConnected: sseConnected } = useSSE();
  
  // Get agent list using discoverAgents endpoint
  const { data: agents, isLoading: isLoadingAgents } = api.a2a.discoverAgents.useQuery(
    undefined, 
    { staleTime: Infinity }
  );
  
  // Create task mutation
  const createTaskMutation = api.a2a.createTask.useMutation({
    onSuccess: (data) => {
      console.log('Task created:', data);
      setTaskId(data.id);
    }
  });
  
  // Create a new task
  const handleCreateTask = () => {
    if (!selectedAgentType || !prompt.trim()) return;
    
    const message = createTextMessage(prompt.trim());
    
    createTaskMutation.mutate({
      agentType: selectedAgentType,
      message
    });
  };
  
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Create Task Section */}
        <Card>
          <CardHeader>
            <CardTitle>Create New Task</CardTitle>
            <CardDescription>Create a new A2A task</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="agent-type">Agent Type</Label>
              <select
                id="agent-type"
                className="w-full p-2 border rounded-md"
                value={selectedAgentType}
                onChange={(e) => setSelectedAgentType(e.target.value)}
                disabled={isLoadingAgents}
              >
                {isLoadingAgents && (
                  <option>Loading agents...</option>
                )}
                
                {agents?.map((agent: Agent) => (
                  <option key={agent.type} value={agent.type}>
                    {agent.displayName || agent.type} {agent.version && `(${agent.version})`}
                  </option>
                ))}
                
                {!isLoadingAgents && !agents?.length && (
                  <option>No agents available</option>
                )}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="prompt">Prompt</Label>
              <textarea
                id="prompt"
                className="w-full p-2 border rounded-md min-h-[150px]"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt..."
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button
              onClick={handleCreateTask}
              disabled={createTaskMutation.isPending || !selectedAgentType || !prompt.trim()}
            >
              {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
            </Button>
          </CardFooter>
        </Card>
        
        {/* Task Monitor Section */}
        <Card>
          <CardHeader>
            <CardTitle>Monitor Task</CardTitle>
            <CardDescription>Monitor an existing task</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor="task-id">Task ID</Label>
                <Input
                  id="task-id"
                  value={inputTaskId}
                  onChange={(e) => setInputTaskId(e.target.value)}
                  placeholder="Enter task ID"
                />
              </div>
              <Button
                onClick={() => setTaskId(inputTaskId)}
                disabled={!inputTaskId.trim()}
              >
                Monitor
              </Button>
            </div>
            
            {/* Active task display */}
            {taskId && (
              <div className="mt-4 border rounded-md p-4 bg-gray-50">
                <h3 className="font-medium mb-2">Active Task: <code className="text-xs bg-gray-100 p-1 rounded">{taskId}</code></h3>
                <TaskMonitor taskId={taskId} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
