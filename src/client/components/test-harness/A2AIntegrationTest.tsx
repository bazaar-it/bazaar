//src/client/components/test-harness/A2AIntegrationTest.tsx

'use client';

import { useState, useEffect, useMemo } from 'react';
import { api } from '~/trpc/react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Label } from '~/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import type { AgentCard, Message as A2AMessage, TaskStatus as A2ATaskStatus, TaskState, Artifact, Part, TextPart } from "~/types/a2a"; 
import { createTextMessage } from '~/types/a2a';

// Import our SSE components/hooks
import { useSSE } from '~/client/hooks/sse/useSSE'; // Corrected path if index.ts exports it
// Assuming TaskMonitor and ComponentStatusSSE will use useTaskStatus internally, which itself uses useSSE
// If they use useSSE directly, they would be set up similarly to how TaskMonitor is sketched below.
// For now, let's assume a simple direct use of useTaskStatus for demonstration if available, or build up from useSSE.
import { useTaskStatus } from '~/client/hooks/sse/useTaskStatus'; // Assuming this hook is implemented by Windsirf
import { TaskStatusBadge } from '~/client/components/a2a/TaskStatusBadge'; // Assuming this component exists

/**
 * A2A Integration Test Component
 * 
 * This component serves as a testing harness for our A2A components,
 * allowing us to verify their functionality with the actual backend.
 */
export function A2AIntegrationTest() {
  const [currentDisplayTaskId, setCurrentDisplayTaskId] = useState<string>(''); // Task ID being actively monitored in UI
  const [inputTaskId, setInputTaskId] = useState<string>(''); // Task ID from input field
  
  const [createTaskParams, setCreateTaskParams] = useState({
    prompt: 'Create a simple animation that shows a bouncing ball',
    // This agentName is for UI selection for now; actual routing is typically to CoordinatorAgent first.
    agentName: 'CoordinatorAgent' 
  });
  const [debugInfo, setDebugInfo] = useState<Record<string, any>>({});
  // Force 'create-task' as the default tab
  const [activeTab, setActiveTab] = useState('create-task');

  // Use a separate state for project ID for clarity in task creation
  const [currentProjectId, setCurrentProjectId] = useState<string>("test-project-" + crypto.randomUUID());

  // SSE connection hook
  const queryClient = useQueryClient(); // Initialize queryClient
  const sseOptions = useMemo(() => ({
    onTaskStatusUpdate: (payload: any) => {
      setDebugInfo(prev => ({ ...prev, lastStatusUpdate: payload }));
      if (payload.data.task_id === currentDisplayTaskId) {
        queryClient.invalidateQueries({ queryKey: ['a2a', 'getTaskStatus', { taskId: currentDisplayTaskId }] });
      }
    },
    onTaskArtifactUpdate: (payload: any) => {
      setDebugInfo(prev => ({ ...prev, lastArtifactUpdate: payload }));
      if (payload.data.task_id === currentDisplayTaskId) {
        queryClient.invalidateQueries({ queryKey: ['a2a', 'getTaskStatus', { taskId: currentDisplayTaskId }] });
      }
    },
    onError: (payload: any) => {
      setDebugInfo(prev => ({ ...prev, sseHookError: payload }));
    },
    onOpen: () => setDebugInfo(prev => ({...prev, sseConnection: 'opened'})),
    onClose: () => setDebugInfo(prev => ({...prev, sseConnection: 'closed'}))
  }), [currentDisplayTaskId, queryClient]);

  const { isConnected: sseConnected, error: sseError, connect: sseConnect, disconnect: sseDisconnect } = useSSE(sseOptions);

  // Effect to connect/disconnect SSE when currentDisplayTaskId changes
  useEffect(() => {
    if (currentDisplayTaskId) {
      console.log(`Connecting SSE for task: ${currentDisplayTaskId}`);
      sseConnect(currentDisplayTaskId);
    } else {
      // Only disconnect if already connected or an error occurred that might have left a stale connection
      if (sseConnected || sseError) { 
         console.log("Disconnecting SSE due to no currentDisplayTaskId or error state");
         sseDisconnect();
      }
    }
    return () => {
        console.log("Cleaning up SSE connection for A2AIntegrationTest on unmount/change");
        sseDisconnect(); 
    }
  // currentDisplayTaskId, sseConnect, sseDisconnect are stable. sseConnected/sseError trigger re-evaluation.
  }, [currentDisplayTaskId, sseConnect, sseDisconnect, sseConnected, sseError]);

  // Task creation mutation
  const createTaskMutation = api.a2a.createTask.useMutation({
    onSuccess: (data) => {
      console.log('Task created:', data);
      if (data && data.id) {
        setInputTaskId(data.id); 
        setCurrentDisplayTaskId(data.id); 
        setActiveTab('monitor-task');
        setDebugInfo(prev => ({ ...prev, taskCreated: { timestamp: new Date().toISOString(), taskId: data.id, result: data } }));
      } else {
        console.error("Task creation response missing id", data);
        setDebugInfo(prev => ({...prev, taskCreationError: "Task created but response missing ID"}));
      }
    },
    onError: (error) => {
      console.error('Error creating task:', error);
      setDebugInfo(prev => ({ ...prev, taskCreationError: { timestamp: new Date().toISOString(), error: error.message } }));
    }
  });

  const { data: agentDirectoryData, isLoading: isLoadingAgents } = api.a2a.getAgentDirectory.useQuery();
  const agentsList = agentDirectoryData || []; // Correctly assign agentsList

  const handleCreateTask = () => {
    if (!createTaskParams.prompt) return;

    // Params for the backend `taskManager.createTask` call, 
    // which then the CoordinatorAgent will use for its initial CREATE_COMPONENT_REQUEST.
    const taskCreationAPIBodyParams = { 
      effect: createTaskParams.prompt.substring(0, 50) + "...",
      animationDesignBrief: { 
          sceneName: createTaskParams.prompt.substring(0,30), 
          description: createTaskParams.prompt 
      },
      // Any other params the CoordinatorAgent might need when it starts a task
      // For example, if a specific initial agent (other than Coordinator) was selected in UI:
      // targetInitialAgent: createTaskParams.agentName 
    };

    createTaskMutation.mutate({
      projectId: currentProjectId,
      params: taskCreationAPIBodyParams 
    });
  };

  // Use the dedicated useTaskStatus hook for the monitored task
  const { status: taskSSEData, isLoading: isLoadingTaskSSEStatus, error: taskSSEError } = useTaskStatus(currentDisplayTaskId);

  const handleMonitorTask = () => {
    if (inputTaskId && inputTaskId !== currentDisplayTaskId) {
      setCurrentDisplayTaskId(inputTaskId);
    }
  };
  
  const handleReset = () => {
    setCurrentDisplayTaskId('');
    setInputTaskId('');
    setDebugInfo({});
    // Invalidate queries related to the task if needed, or rely on enabled flag
    if (currentDisplayTaskId) {
      queryClient.invalidateQueries({ queryKey: ['a2a', 'getTaskStatus', { taskId: currentDisplayTaskId }] });
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <h1 className="text-2xl font-bold mb-6">A2A Integration Test Harness</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>SSE Connection Status</CardTitle>
          <CardDescription>Current status of the SSE connection to the backend</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <div 
              className={`w-3 h-3 rounded-full ${sseConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <span>
              {sseConnected ? 'Connected' : `Disconnected ${sseError ? `(${sseError.message})` : ''}`}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Debug active tab: {activeTab} */}
      <Tabs 
        defaultValue="create-task" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="mb-6"
      >
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="create-task">Create Task</TabsTrigger>
          <TabsTrigger value="monitor-task">Monitor Task</TabsTrigger>
          <TabsTrigger value="debug">Debug</TabsTrigger>
        </TabsList>

        <TabsContent value="create-task">
          <Card>
            <CardHeader>
              <CardTitle>Create New Task</CardTitle>
              <CardDescription>Create a new A2A task with the specified parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="agent-name">Target Agent (UI only for now)</Label>
                <select 
                  id="agent-name"
                  className="w-full p-2 border rounded-md"
                  value={createTaskParams.agentName}
                  onChange={(e) => setCreateTaskParams(prev => ({ ...prev, agentName: e.target.value }))}
                >
                  {isLoadingAgents && <option disabled>Loading agents...</option>}
                  {agentsList.map((agent: AgentCard) => (
                    // Using agent.url or agent.name as key, ensure unique
                    <option key={agent.url || agent.name} value={agent.name}> 
                      {agent.name} {agent.version && `(v${agent.version})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Prompt / Task Description</Label>
                <textarea 
                  id="prompt"
                  className="w-full p-2 border rounded-md min-h-[100px]"
                  value={createTaskParams.prompt}
                  onChange={(e) => setCreateTaskParams(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Enter your task prompt here..."
                />
              </div>
            </CardContent>
            <CardFooter>
              <Button 
                onClick={handleCreateTask}
                disabled={createTaskMutation.isPending || !createTaskParams.prompt}
              >
                {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="monitor-task">
          <Card>
            <CardHeader>
              <CardTitle>Monitor Task</CardTitle>
              <CardDescription>Monitor an existing task or the task you just created</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor="task-id" className="mb-2 block">Task ID</Label>
                  <Input
                    id="task-id"
                    value={inputTaskId}
                    onChange={(e) => setInputTaskId(e.target.value)}
                    placeholder="Enter task ID to monitor"
                  />
                </div>
                <Button
                  onClick={handleMonitorTask}
                  disabled={!inputTaskId || inputTaskId === currentDisplayTaskId}
                >
                  Monitor Task
                </Button>
              </div>

              {currentDisplayTaskId && (
                <div className="mt-8 space-y-6">
                  <Card>
                    <CardHeader><CardTitle>Task Status Badge (via useTaskStatus)</CardTitle></CardHeader>
                    <CardContent>
                      <TaskStatusBadge 
                        status={taskSSEData ?? null} 
                      />
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader><CardTitle>Raw Task Data (from useTaskStatus)</CardTitle></CardHeader>
                    <CardContent>
                      {isLoadingTaskSSEStatus && <p>Loading status...</p>}
                      {taskSSEError && <p className="text-red-500">Error: {taskSSEError.message}</p>}
                      {taskSSEData && (
                        <pre className="text-xs overflow-auto max-h-60 bg-gray-800 text-white p-4 rounded">
                          {JSON.stringify(taskSSEData, null, 2)}
                        </pre>
                      )}
                    </CardContent>
                  </Card>
                   {/* ArtifactViewer - Assuming it takes artifacts array from useTaskStatus or similar hook */}
                  {taskSSEData?.artifacts && taskSSEData.artifacts.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle>Artifacts</CardTitle></CardHeader>
                      <CardContent>
                        {/* Replace with actual ArtifactViewer component when ready */}
                        <pre className="text-xs overflow-auto max-h-60 bg-gray-800 text-white p-4 rounded">
                          {JSON.stringify(taskSSEData.artifacts, null, 2)}
                        </pre>
                      </CardContent>
                    </Card>
                  )}
                  {/* TaskInputForm - Assuming it shows when taskSSEData.state === 'input-required' */}
                  {taskSSEData?.state === 'input-required' && taskSSEData.message && (
                     <Card>
                       <CardHeader><CardTitle>Input Required</CardTitle></CardHeader>
                       <CardContent>
                         {taskSSEData.message.parts.map((part, index) => {
                           if (part.type === 'text') {
                             return <p key={index}>Task requires input: {(part as TextPart).text}</p>;
                           }
                           return <p key={index}>Non-text input part received (type: {part.type}).</p>;
                         })}
                         <Input placeholder="Enter input..." className="mt-2" />
                         <Button className="mt-2">Submit Input</Button>
                       </CardContent>
                     </Card>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="debug">
          <Card>
            <CardHeader>
              <CardTitle>Debug Information</CardTitle>
              <CardDescription>Technical details and debug information from component interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="bg-gray-800 text-white p-4 rounded-md overflow-auto max-h-96 text-xs">
                {JSON.stringify(debugInfo, null, 2)}
              </pre>
            </CardContent>
            <CardFooter>
              <Button variant="outline" onClick={handleReset}>Reset Test</Button>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
