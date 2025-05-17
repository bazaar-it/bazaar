//src/client/components/test-harness/A2AIntegrationTest.tsx

'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
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
import type { AgentCard, TaskStatus as A2ATaskStatus, TaskState, TextPart, DataPart, JsonRpcError, Artifact as BaseArtifact } from '~/types/a2a';
import { 
  type EnhancedA2AMessage, 
  type EnhancedArtifact,
  type EnhancedTaskStatus 
} from '~/types/enhanced-a2a';
import { X, ArrowUpDown, CheckCircle, AlertTriangle } from 'lucide-react';
import { useSSE } from '~/client/hooks/sse/useSSE';
import { cn } from '~/lib/utils';
import { unregisterAllServiceWorkers } from '~/lib/unregister-service-worker';
import { MessagePreview } from './MessagePreview';
import { MessageDetailModal } from './MessageDetailModal';
import { TaskInputForm } from './TaskInputForm';
import { AnimationDesignBriefViewer } from './AnimationDesignBriefViewer';
import { AgentNetworkGraph } from './AgentNetworkGraph';
import { TaskDetailsPanel } from './evaluation/TaskDetailsPanel';

// Import TrpcSwitch for conditional rendering based on tRPC status
// import { TrpcSwitch, TrpcCase, TrpcDefaultCase } from '~/components/utility/TrpcSwitch';

// Simple type for tracking connection state
type ConnectionState = 
  | { status: 'disconnected' }
  | { status: 'connecting'; taskId: string }
  | { status: 'connected'; taskId: string }
  | { status: 'disconnecting'; taskId: string };

interface StateTransition {
  state: string;
  timestamp: string | Date;
  agent?: string;
  message?: string;
  error?: string;
}

const A2A_AGENT_ROLES: Record<string, string> = {
  CoordinatorAgent: "Task Orchestrator",
  ScenePlannerAgent: "Scene Planner",
  ADBAgent: "Design Brief Generator",
  BuilderAgent: "Component Builder",
  ErrorFixerAgent: "Error Corrector",
  R2StorageAgent: "Artifact Storage",
  UIAgent: "User Interface Handler",
  // Add other agents as needed
};

export function A2AIntegrationTest() {
  // State for task input/selection
  const [inputTaskId, setInputTaskId] = useState('');
  const [currentDisplayTaskId, setCurrentDisplayTaskId] = useState<string>('');
  const [taskMessage, setTaskMessage] = useState('');
  const [projectId, setProjectId] = useState('');
  // Task and message data state
  const [messages, setMessages] = useState<EnhancedA2AMessage[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<EnhancedA2AMessage | null>(null);
  const [taskStatus, setTaskStatus] = useState<EnhancedTaskStatus | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [debugInfo, setDebugInfo] = useState({
    sseConnection: 'closed',
    messages: 'none',
    taskStatus: 'none',
  });
  
  // Connection state and refs
  const [connectionState, setConnectionState] = useState<ConnectionState>({ status: 'disconnected' });
  const connectionStateRef = useRef<ConnectionState>({ status: 'disconnected' });
  const isMountedRef = useRef(true);
  const loadingTasksRef = useRef(false);
  const lastRefreshTimeRef = useRef<Record<string, number>>({
    messages: 0,
    taskStatus: 0
  });
  
  // Get projects - use list() instead of getProjects
  const { data: projects } = api.project.list.useQuery();
  const queryClient = useQueryClient();
  
  // Unregister service workers on mount to prevent caching issues
  useEffect(() => {
    console.log('[A2A Test] Checking for and unregistering any service workers');
    unregisterAllServiceWorkers()
      .then(() => console.log('[A2A Test] Service worker cleanup complete'))
      .catch((error: Error) => console.error('[A2A Test] Error during service worker cleanup:', error));
  }, []);

  // Configure SSE callbacks outside the connection effect to avoid dependency changes
  const sseOptions = useMemo(() => ({
    throttleDelay: 1000, // Larger throttle delay for production
    onOpen: () => {
      console.log(`[SSE Options] Connection opened`);
      setDebugInfo(prev => ({...prev, sseConnection: 'opened'}));
      
      if (connectionStateRef.current.status === 'connecting') {
        const newState = { 
          status: 'connected' as const,
          taskId: connectionStateRef.current.taskId 
        };
        connectionStateRef.current = newState;
        setConnectionState(newState);
      }
    },
    onClose: () => {
      console.log(`[SSE Options] Connection closed`);
      setDebugInfo(prev => ({...prev, sseConnection: 'closed'}));
      
      // Only change state if we were connected or connecting (not if we initiated disconnection)
      if (['connected', 'connecting'].includes(connectionStateRef.current.status)) {
        connectionStateRef.current = { status: 'disconnected' };
        setConnectionState({ status: 'disconnected' });
      }
    },
    onError: (error: any) => {
      console.error('[SSE Options] Connection error:', error);
      setDebugInfo(prev => ({...prev, sseConnection: 'error'}));
      
      // Only update state if we were connected or connecting
      if (['connected', 'connecting'].includes(connectionStateRef.current.status)) {
        connectionStateRef.current = { status: 'disconnected' };
        setConnectionState({ status: 'disconnected' });
      }
    },
    onTaskStatusUpdate: (payload: any) => {
      console.log('[SSE] Task status update:', payload);
      // Debounce task status updates
      const now = Date.now();
      if (now - (lastRefreshTimeRef.current.taskStatus || 0) < 500) {
        return;
      }
      lastRefreshTimeRef.current.taskStatus = now;
      
      setTaskStatus(prev => {
        // Skip update if the state hasn't changed
        if (prev?.state === payload.data.state) {
          return prev;
        }
        
        return {
          id: payload.data.task_id,
          state: payload.data.state as TaskState,
          message: payload.data.message || '',
          artifacts: prev?.artifacts || [],
          updatedAt: new Date().toISOString() // Ensure updatedAt is always present
        };
      });
      
      // Refresh messages when task status changes
      if (currentDisplayTaskId) {
        refreshTaskMessages();
      }
    },
    onTaskArtifactUpdate: (payload: any) => {
      console.log('[SSE] Artifact update:', payload);
      const artifact = payload.data.artifact as EnhancedArtifact;
      
      // Ensure contentType is set from mimeType if missing
      if (artifact.mimeType && !artifact.contentType) {
        artifact.contentType = artifact.mimeType;
      }
      
      setTaskStatus(prev => {
        if (!prev) return null;
        
        // Create artifacts array if it doesn't exist
        const currentArtifacts = prev.artifacts || [];
        
        // Check if we already have this artifact to avoid duplicates
        const existingIndex = currentArtifacts.findIndex(a => a.id === artifact.id);
        
        if (existingIndex >= 0) {
          // Update existing artifact
          const newArtifacts = [...currentArtifacts];
          newArtifacts[existingIndex] = artifact;
          return { ...prev, artifacts: newArtifacts, updatedAt: new Date().toISOString() };
        } else {
          // Add new artifact
          return { 
            ...prev, 
            artifacts: [...currentArtifacts, artifact],
            updatedAt: new Date().toISOString()
          };
        }
      });
    }
  }), [currentDisplayTaskId]);
  
  const { isConnected: sseConnected, connect: sseConnect, disconnect: sseDisconnect } = useSSE(sseOptions);
  
  // Update connectionStateRef when state changes, to avoid stale closures in effects
  useEffect(() => {
    connectionStateRef.current = connectionState;
  }, [connectionState]);
  
  // Main effect for managing SSE connection based on currentDisplayTaskId
  useEffect(() => {
    if (!isMountedRef.current) return;
    
    // If no task ID, ensure disconnected
    if (!currentDisplayTaskId) {
      if (connectionState.status !== 'disconnected') {
        console.log('[Effect] No currentDisplayTaskId, disconnecting');
        setConnectionState({ status: 'disconnected' });
        if (sseConnected) {
          sseDisconnect();
        }
      }
      return;
    }
    
    // Connect to new task if needed
    if (connectionState.status === 'disconnected') {
      console.log(`[Effect] Connecting to task: ${currentDisplayTaskId}`);
      setConnectionState({ 
        status: 'connecting', 
        taskId: currentDisplayTaskId 
      });
      sseConnect(currentDisplayTaskId);
    }
    // Switch to a different task if needed
    else if (connectionState.status === 'connected' && connectionState.taskId !== currentDisplayTaskId) {
      console.log(`[Effect] Switching from ${connectionState.taskId} to ${currentDisplayTaskId}`);
      setConnectionState({ 
        status: 'connecting', 
        taskId: currentDisplayTaskId 
      });
      sseConnect(currentDisplayTaskId);
    }
  }, [currentDisplayTaskId, sseConnected, connectionState.status, sseConnect, sseDisconnect]);
  
  // Task creation and refresh functions
  const createTask = api.a2a.createTask.useMutation({
    onSuccess: async (data) => {
      if (!data || !data.id) {
        console.error('Invalid task creation response:', data);
        return;
      }
      
      console.log('Created task:', data);
      
      // Update the task ID in the UI using the id from the Task response
      const taskId = data.id;
      setInputTaskId(taskId);
      setCurrentDisplayTaskId(taskId);
      
      // Clear the form
      setTaskMessage('');
    },
    onError: (error) => {
      console.error('Error creating task:', error.message);
    }
  });
  
  // Get agent messages query hook
  const agentMessagesQuery = api.a2a.getAgentMessages.useQuery(
    { taskId: currentDisplayTaskId || '', limit: 50 },
    { enabled: !!currentDisplayTaskId, refetchInterval: 3000 }
  );

  // Get task status query hook  
  const taskStatusQuery = api.a2a.getTaskStatus.useQuery(
    { taskId: currentDisplayTaskId || '' },
    { enabled: !!currentDisplayTaskId, refetchInterval: 2000 }
  );

  // Update effect to use the query results
  useEffect(() => {
    if (!currentDisplayTaskId) {
      setMessages([]);
      setTaskStatus(null);
      return;
    }

    // Process agent messages when they're available
    if (agentMessagesQuery.data && !loadingTasksRef.current) {
      const messagesResult = agentMessagesQuery.data;
      
      // Transform any message type to EnhancedA2AMessage format
      const enhancedMessages = messagesResult.map(msg => {
        // Create a basic enhanced message with required fields
        const enhancedMsg: EnhancedA2AMessage = {
          // id is the only field we can be sure exists in all message types
          id: msg.id,
          // Ensure createdAt is present even if source doesn't have it
          createdAt: (msg as any).createdAt || new Date().toISOString(),
          // Always ensure parts array exists
          parts: (msg as any).parts || [],
          // Include payload if it exists or create empty one
          payload: (msg as any).payload || {},
        };
        
        // Copy any additional fields that might be present
        if ((msg as any).sender) enhancedMsg.sender = (msg as any).sender;
        if ((msg as any).recipient) enhancedMsg.recipient = (msg as any).recipient;
        if ((msg as any).type) enhancedMsg.type = (msg as any).type;
        if ((msg as any).status) enhancedMsg.status = (msg as any).status;
        if ((msg as any).processedAt) enhancedMsg.processedAt = (msg as any).processedAt;
        if ((msg as any).correlationId) enhancedMsg.correlationId = (msg as any).correlationId;
        
        return enhancedMsg;
      });
      
      setMessages(enhancedMessages);
      setDebugInfo(prev => ({...prev, messages: `found ${messagesResult.length}`}));
    }

    // Process task status when it's available
    if (taskStatusQuery.data) {
      const statusResult = taskStatusQuery.data;
      
      // Ensure contentType is set for all artifacts
      const enhancedResult: EnhancedTaskStatus = {
        ...statusResult,
        updatedAt: statusResult.updatedAt || new Date().toISOString(),
        artifacts: statusResult.artifacts?.map((a: {
          id: string;
          type: string;
          mimeType: string;
          url?: string;
          data?: any;
          description?: string;
          name?: string;
          createdAt: string;
        }) => ({
          ...a,
          contentType: a.mimeType
        })) as EnhancedArtifact[]
      };
      
      setTaskStatus(enhancedResult);
      setDebugInfo(prev => ({...prev, taskStatus: statusResult.state}));
    }

    // Update loading states
    if (agentMessagesQuery.isLoading) {
      setDebugInfo(prev => ({...prev, messages: 'loading'}));
    } else if (agentMessagesQuery.isError) {
      setDebugInfo(prev => ({...prev, messages: 'error'}));
    }

    if (taskStatusQuery.isLoading) {
      setDebugInfo(prev => ({...prev, taskStatus: 'loading'}));
    } else if (taskStatusQuery.isError) {
      setDebugInfo(prev => ({...prev, taskStatus: 'error'}));
      setTaskStatus(null);
    }
  }, [currentDisplayTaskId, agentMessagesQuery.data, agentMessagesQuery.isLoading, 
      agentMessagesQuery.isError, taskStatusQuery.data, taskStatusQuery.isLoading, 
      taskStatusQuery.isError]);

  // Replace refreshTaskMessages with a function that causes a refetch
  const refreshTaskMessages = useCallback(() => {
    if (currentDisplayTaskId) {
      agentMessagesQuery.refetch();
    }
  }, [agentMessagesQuery, currentDisplayTaskId]);
  
  // Replace refreshTaskStatus with a function that causes a refetch
  const refreshTaskStatus = useCallback(() => {
    if (currentDisplayTaskId) {
      taskStatusQuery.refetch();
    }
  }, [taskStatusQuery, currentDisplayTaskId]);
  
  // Clean up effects on component unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
      
      // Make sure SSE is disconnected
      if (sseConnected) {
        sseDisconnect();
      }
    };
  }, [sseConnected, sseDisconnect]);
  
  // Event handlers
  const handleSubmitTask = useCallback(() => {
    if (!projectId || !taskMessage) {
      console.error('Project ID and task message are required');
      return;
    }
    
    createTask.mutate({
      params: {
        projectId,
        message: {
          id: uuidv4(),
          createdAt: new Date().toISOString(),
          parts: [{ type: 'text', text: taskMessage }]
        },
        effect: 'Create animation from message',
        animationDesignBrief: {
          description: taskMessage, 
          sceneName: "VideoGenerationRequest"
        },
        targetAgent: 'animationDesigner'
      },
      prompt: taskMessage,
    });
  }, [projectId, taskMessage, createTask]);
  
  const handleTaskIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputTaskId(e.target.value);
  };
  
  const handleTaskIdSubmit = () => {
    if (inputTaskId) {
      setCurrentDisplayTaskId(inputTaskId);
    }
  };
  
  const handleTaskIdClear = () => {
    setInputTaskId('');
    setCurrentDisplayTaskId('');
  };
  
  const handleOpenModal = (message: EnhancedA2AMessage) => {
    setSelectedMessage(message);
    setIsModalOpen(true);
  };
  
  const getMessagePreview = (message: EnhancedA2AMessage) => {
    if (!message.payload) return 'No payload';
    
    // Handle different message types
    if (message.payload.effect) {
      return message.payload.effect as string;
    }
    
    if (message.payload.artifacts && Array.isArray(message.payload.artifacts)) {
      return `Artifacts: ${message.payload.artifacts.length}`;
    }
    
    if (message.payload.reasoning) {
      return message.payload.reasoning as string;
    }
    
    return JSON.stringify(message.payload).substring(0, 100) + '...';
  };

  const transformDataForTaskDetailsPanel = () => {
    if (!taskStatus && messages.length === 0) {
      return null; // Not enough data to display
    }

    const stateTransitions: StateTransition[] = [];
    let overallSuccess = false;
    let finalErrorStage: string | undefined;
    let finalErrorMessage: string | undefined;
    let finalErrorType: string | undefined;

    // Process messages into state transitions
    messages.forEach(msg => {
      stateTransitions.push({
        timestamp: msg.createdAt,
        agent: msg.sender,
        state: msg.type || 'message',
        message: msg.payload?.content as string || JSON.stringify(msg.payload),
      });
    });

    // Add transitions from taskStatus (especially for final state and errors)
    if (taskStatus) {
      overallSuccess = taskStatus.state === 'completed';

      let statusMsgText = `Task moved to ${taskStatus.state}`;
      let agentForStatus: string | undefined = 'System'; // Default
      let errorForStatus: string | undefined;

      if (taskStatus.message) { // taskStatus.message is type A2AMessage
        agentForStatus = taskStatus.message.metadata?.senderAgent as string || taskStatus.message.metadata?.sender as string || 'System'; // Attempt to get sender
        const textPart = taskStatus.message.parts.find(p => p.type === 'text') as TextPart | undefined;
        if (textPart) {
          statusMsgText = textPart.text;
        } else if (taskStatus.message.parts.length > 0) {
          // Fallback if no direct text part, stringify for now
          statusMsgText = JSON.stringify(taskStatus.message.parts);
        }

        if (taskStatus.state === 'failed') {
          // Attempt to extract error from a DataPart if it matches TaskStatusUpdatePayload structure or a known error structure
          const dataPart = taskStatus.message.parts.find(p => p.type === 'data') as DataPart | undefined;
          if (dataPart && dataPart.data) {
            const payloadFromDataPart = dataPart.data as any;
            if (payloadFromDataPart.error && typeof payloadFromDataPart.error.message === 'string') {
              const errorObj = payloadFromDataPart.error as any; // Explicitly cast to any here
              errorForStatus = errorObj.message; 

              finalErrorStage = errorObj.stage || payloadFromDataPart.agent || agentForStatus || 'unknown';
              finalErrorMessage = errorObj.message;
              finalErrorType = errorObj.type || 'unknown'; 

              if (errorObj.data && typeof errorObj.data === 'object' && errorObj.data.details) {
                statusMsgText += ` Details: ${typeof errorObj.data.details === 'string' ? errorObj.data.details : JSON.stringify(errorObj.data.details)}`;
              } else if (errorObj.details) { 
                 statusMsgText += ` Details: ${typeof errorObj.details === 'string' ? errorObj.details : JSON.stringify(errorObj.details)}`;
              }
            } else if (typeof payloadFromDataPart.message === 'string') {
              errorForStatus = payloadFromDataPart.message;
              finalErrorMessage = payloadFromDataPart.message;
            }
          }
          // If no structured error found in DataPart, use the general statusMsgText as error message if not already set
          if (!errorForStatus && statusMsgText !== `Task moved to ${taskStatus.state}`) {
            errorForStatus = statusMsgText;
            if (!finalErrorMessage) finalErrorMessage = statusMsgText;
          }
        }
      }

      const lastStatusTransition: StateTransition = {
        timestamp: taskStatus.updatedAt,
        agent: agentForStatus, 
        state: taskStatus.state,
        message: statusMsgText,
        error: errorForStatus,
      };
      stateTransitions.push(lastStatusTransition);
    }
    
    // Sort transitions by timestamp
    stateTransitions.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Artifacts: EnhancedArtifact[] is compatible with Artifact[] as it extends it.
    // TaskDetailsPanel expects Artifact[] or string. We have EnhancedArtifact[] from taskStatus.
    const panelArtifacts: BaseArtifact[] | undefined = taskStatus?.artifacts?.map(ea => ({
      id: ea.id,
      type: ea.type, // from base Artifact
      mimeType: ea.contentType, // EnhancedArtifact has contentType, map to mimeType for BaseArtifact
      url: ea.url,
      data: ea.data,
      description: ea.description,
      name: ea.name,
      createdAt: ea.createdAt, // from base Artifact
      // Ensure all BaseArtifact fields are mapped; if EnhancedArtifact misses some optional base fields, they'll be undefined which is fine
    }));

    return {
      taskId: currentDisplayTaskId,
      success: overallSuccess,
      errorStage: finalErrorStage,
      errorMessage: finalErrorMessage,
      errorType: finalErrorType,
      stateTransitions: stateTransitions,
      artifacts: panelArtifacts || [], // Ensure it's an array
      agentRoles: A2A_AGENT_ROLES,
    };
  };

  const panelProps = transformDataForTaskDetailsPanel();

  // Render UI
  return (
    <div className="w-full min-h-screen">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>A2A Integration Test</CardTitle>
          <CardDescription>
            Test A2A agent interactions and view task status
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="taskCreation">
            <TabsList>
              <TabsTrigger value="taskCreation">Task Creation</TabsTrigger>
              <TabsTrigger value="taskStatus">Task Status</TabsTrigger>
              <TabsTrigger value="agentGraph">Agent Network</TabsTrigger>
              <TabsTrigger value="debug">Debug</TabsTrigger>
            </TabsList>
            
            <TabsContent value="taskCreation" className="space-y-4 mt-4">
              <TaskInputForm
                projectId={projectId}
                setProjectId={setProjectId}
                taskMessage={taskMessage}
                setTaskMessage={setTaskMessage}
                onSubmit={handleSubmitTask}
                projects={projects || []}
              />
              
              <div className="mt-4 pt-4 border-t">
                <h3 className="text-lg font-semibold mb-2">Look up task by ID</h3>
                <div className="flex items-center space-x-2">
                  <Input
                    placeholder="Task ID"
                    value={inputTaskId}
                    onChange={handleTaskIdChange}
                    className="flex-1"
                  />
                  <Button onClick={handleTaskIdSubmit}>View</Button>
                  <Button variant="outline" onClick={handleTaskIdClear}><X className="h-4 w-4" /></Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="taskStatus" className="space-y-4 mt-4">
              {panelProps ? (
                <TaskDetailsPanel {...panelProps} />
              ) : currentDisplayTaskId ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Task: {currentDisplayTaskId.substring(0,15)}...</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Waiting for task data...</p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">No Task Active</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Submit a prompt or connect to a task ID to see details.</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
            
            <TabsContent value="agentGraph" className="mt-4">
              {currentDisplayTaskId ? (
                <AgentNetworkGraph taskId={currentDisplayTaskId} />
              ) : (
                <div className="p-8 text-center">
                  <p className="text-gray-500">No task selected. Create a new task or enter a task ID.</p>
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="debug" className="space-y-4 mt-4">
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label>Current Task ID</Label>
                    <div className="p-2 border rounded-md">
                      {currentDisplayTaskId || 'None'}
                    </div>
                  </div>
                  <div>
                    <Label>Connection State</Label>
                    <div className="p-2 border rounded-md">
                      {connectionState.status}{connectionState.status !== 'disconnected' ? ` (${connectionState.taskId})` : ''}
                    </div>
                  </div>
                  <div>
                    <Label>SSE Connected</Label>
                    <div className="p-2 border rounded-md">
                      {sseConnected ? 'Yes' : 'No'}
                    </div>
                  </div>
                  <div>
                    <Label>SSE Connection</Label>
                    <div className="p-2 border rounded-md">
                      {debugInfo.sseConnection}
                    </div>
                  </div>
                  <div>
                    <Label>Messages Status</Label>
                    <div className="p-2 border rounded-md">
                      {debugInfo.messages}
                    </div>
                  </div>
                  <div>
                    <Label>Task Status</Label>
                    <div className="p-2 border rounded-md">
                      {debugInfo.taskStatus}
                    </div>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button 
                    variant="outline" 
                    onClick={refreshTaskMessages}
                    disabled={!currentDisplayTaskId}
                  >
                    Refresh Messages
                  </Button>
                  {' '}
                  <Button 
                    variant="outline" 
                    onClick={refreshTaskStatus}
                    disabled={!currentDisplayTaskId}
                  >
                    Refresh Status
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="bg-muted/50 flex justify-between">
          <div className="text-sm text-muted-foreground">
            {connectionState.status === 'connected' ? (
              <span className="flex items-center">
                <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                Connected to task: {connectionState.taskId.substring(0, 8)}...
              </span>
            ) : connectionState.status === 'connecting' ? (
              <span className="flex items-center">
                <ArrowUpDown className="h-4 w-4 text-yellow-500 animate-pulse mr-1" />
                Connecting to task: {connectionState.taskId.substring(0, 8)}...
              </span>
            ) : connectionState.status === 'disconnecting' ? (
              <span className="flex items-center">
                <ArrowUpDown className="h-4 w-4 text-yellow-500 mr-1" />
                Disconnecting from task: {connectionState.taskId.substring(0, 8)}...
              </span>
            ) : (
              <span className="flex items-center">
                <AlertTriangle className="h-4 w-4 text-gray-400 mr-1" />
                Not connected
              </span>
            )}
          </div>
          <div className="text-sm text-muted-foreground">
            {taskStatus ? (
              <span className={cn(
                "px-2 py-1 rounded-full text-white",
                taskStatus.state === 'completed' ? "bg-green-500" :
                taskStatus.state === 'working' ? "bg-blue-500" :
                taskStatus.state === 'failed' ? "bg-red-500" :
                taskStatus.state === 'canceled' ? "bg-yellow-500" :
                "bg-gray-500"
              )}>
                {taskStatus.state}
              </span>
            ) : null}
          </div>
        </CardFooter>
      </Card>
      
      {isModalOpen && selectedMessage && (
        <MessageDetailModal
          message={selectedMessage}
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
}
