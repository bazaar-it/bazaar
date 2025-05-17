'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '~/components/ui/card';
import { Badge } from '~/components/ui/badge';
import { Button } from '~/components/ui/button';
import { api } from '~/trpc/react';
import { useSSE } from '~/client/hooks/sse/useSSE';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { InfoIcon, CornerDownRightIcon, ArrowRightIcon } from 'lucide-react';

// Agent card display types
// Import AgentSkill type directly to avoid type mismatches
import type { AgentSkill } from '~/types/a2a';

interface AgentInfo {
  id: string;
  name: string;
  description?: string | null;
  role: string;
  status: 'idle' | 'working' | 'completed' | 'error' | 'waiting';
  skills?: AgentSkill[];
  currentTool?: string; // Current tool being used by the agent
  lastActive?: Date;
}

interface Message {
  id: string;
  from: string;
  to: string;
  type: string;
  timestamp: string;
  payload?: Record<string, any>;
}

interface AgentNetworkGraphProps {
  taskId?: string;
}

// A2A Agent Roles mapping
const A2A_AGENT_ROLES = {
  CoordinatorAgent: "Task Orchestration",
  ScenePlannerAgent: "Scene Planning",
  ADBAgent: "Animation Design Brief Generation",
  BuilderAgent: "Component Building",
  ErrorFixerAgent: "Error Correction",
  R2StorageAgent: "Storage Management",
  UIAgent: "UI Updates",
  ComponentLoadingFixer: "Component Loading Fixes"
};

export function AgentNetworkGraph({ taskId }: AgentNetworkGraphProps) {
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [expandMessages, setExpandMessages] = useState(false);
  
  // Fetch real agent directory
  const { data: agentDirectoryData, isLoading: isLoadingAgents } = api.a2a.getAgentDirectory.useQuery();
  
  // Setup SSE connection to get real-time agent events
  const sseOptions = {
    onTaskStatusUpdate: (payload: any) => {
      console.log("[AgentGraph] Received task status update:", payload);
      
      try {
        const data = typeof payload.data === 'string' ? JSON.parse(payload.data) : payload.data;
        
        if (data.state) {
          // Update agent status based on task state updates
          const agentName = data.agentName || "CoordinatorAgent";
          updateAgentStatus(agentName, data.state === 'working' ? 'working' : 
                                      data.state === 'completed' ? 'completed' : 
                                      data.state === 'failed' ? 'error' : 'idle');
        }
      } catch (err) {
        console.error("Error processing SSE status update:", err);
      }
    },
    onTaskArtifactUpdate: (payload: any) => {
      console.log("[AgentGraph] Received artifact update:", payload);
      
      try {
        const data = typeof payload.data === 'string' ? JSON.parse(payload.data) : payload.data;
        
        if (data.artifact) {
          // Update agent that created the artifact
          const agentName = data.agentName || "BuilderAgent";
          updateAgentStatus(agentName, 'completed', `Created ${data.artifact.type} artifact`);
        }
      } catch (err) {
        console.error("Error processing SSE artifact update:", err);
      }
    },
    onAgentCommunication: (payload: any) => {
      try {
        const data = typeof payload.data === 'string' ? JSON.parse(payload.data) : payload.data;
        
        if (data.type === 'agent_communication') {
          const newMessage: Message = {
            id: payload.id || `msg-${Date.now()}`,
            from: data.data.from,
            to: data.data.to,
            type: data.data.messageType,
            timestamp: data.data.timestamp,
            payload: data.data.payload
          };
          
          // Add the new message to our messages state
          setMessages(prev => [newMessage, ...prev].slice(0, 100));
          
          // Update agent statuses based on the message
          if (data.data.from) {
            updateAgentStatus(data.data.from, 'working', `Sending ${data.data.messageType} to ${data.data.to}`);
          }
          if (data.data.to) {
            // Set the recipient agent to working state
            updateAgentStatus(data.data.to, 'working', `Processing ${data.data.messageType}`);
            
            // For specific message types, set appropriate state and status message
            if (data.data.messageType === 'CREATE_SCENE_PLAN_REQUEST' && data.data.to === 'ScenePlannerAgent') {
              updateAgentStatus('ScenePlannerAgent', 'working', 'Generating scene plan');
            } else if (data.data.messageType === 'SCENE_PLAN_CREATED' && data.data.to === 'CoordinatorAgent') {
              updateAgentStatus('ScenePlannerAgent', 'completed', 'Scene plan created');
              updateAgentStatus('CoordinatorAgent', 'working', 'Routing scene plan to ADBAgent');
            } else if (data.data.messageType === 'CREATE_ANIMATION_DESIGN_REQUEST' && data.data.to === 'ADBAgent') {
              updateAgentStatus('ADBAgent', 'working', 'Generating animation design brief');
            }
          }
          
          console.log("[AgentGraph] Added message:", newMessage);
        }
      } catch (err) {
        console.error("Error processing SSE agent communication:", err);
      }
    },
    onError: (error: any) => {
      console.error("[AgentGraph] SSE connection error:", error);
    }
  };
  
  const { isConnected: sseConnected, error: sseError, connect: sseConnect, disconnect: sseDisconnect } = useSSE(sseOptions);
  
  // Add a ref to track the current connected task ID to prevent reconnection loops
  const connectedTaskIdRef = useRef<string | null>(null);
  
  // Effect to initialize SSE listener when taskId changes
  useEffect(() => {
    if (taskId) {
      // Reset all agent statuses when connecting to a new task
      setAgents(prev => prev.map(agent => ({
        ...agent,
        status: 'idle',
        currentTool: undefined
      })));
      
      // Set CoordinatorAgent active since it's the entry point
      updateAgentStatus('CoordinatorAgent', 'working', 'Initializing task');
      
      // Connect to SSE for real-time updates
      sseConnect(taskId);
      return () => sseDisconnect();
    }
  }, [taskId]);
  
  // Helper function to update agent status
  const updateAgentStatus = (agentName: string, status: AgentInfo['status'], activity?: string) => {
    console.log(`[AgentGraph] Updating ${agentName} status to ${status}${activity ? `: ${activity}` : ''}`); 
    
    setAgents(prev => {
      // Check if the agent exists in our current state
      const agentExists = prev.some(a => a.name === agentName);
      
      // If the agent doesn't exist, add it
      if (!agentExists) {
        console.log(`[AgentGraph] Adding new agent: ${agentName}`); 
        return [
          ...prev,
          {
            id: agentName.toLowerCase(),
            name: agentName,
            role: A2A_AGENT_ROLES[agentName as keyof typeof A2A_AGENT_ROLES] || "Agent",
            status,
            currentTool: activity,
            lastActive: new Date()
          }
        ];
      }
      
      // Otherwise update the existing agent
      return prev.map(agent => {
        if (agent.name === agentName) {
          return {
            ...agent,
            status,
            currentTool: activity || agent.currentTool,
            lastActive: new Date()
          };
        }
        return agent;
      });
    });
  };
  
  // Initialize agents based on available agents in the system
  useEffect(() => {
    if (agentDirectoryData) {
      setIsLoading(false);
      
      // Convert agent directory data to AgentInfo format
      const agentInfos: AgentInfo[] = agentDirectoryData.map(agent => ({
        id: agent.name, // Use agent name as ID since agent.id doesn't exist
        name: agent.name,
        description: agent.description,
        role: A2A_AGENT_ROLES[agent.name as keyof typeof A2A_AGENT_ROLES] || "Agent",
        status: 'idle' as AgentInfo['status'],
        skills: agent.skills,
        lastActive: new Date() // Set current time as initialization time
      }));
      
      // Ensure we have all required agents for visualization, even if not returned by API
      const requiredAgents = ['CoordinatorAgent', 'ScenePlannerAgent', 'ADBAgent', 'BuilderAgent', 'R2StorageAgent', 'UIAgent'];
      
      // Add any missing required agents
      requiredAgents.forEach(agentName => {
        if (!agentInfos.some(a => a.name === agentName)) {
          agentInfos.push({
            id: agentName.toLowerCase(),
            name: agentName,
            description: `${agentName} default role`,
            role: A2A_AGENT_ROLES[agentName as keyof typeof A2A_AGENT_ROLES] || "Agent",
            status: 'idle' as AgentInfo['status'],
            skills: [],
            lastActive: new Date()
          });
        }
      });
      
      setAgents(agentInfos);
    } else {
      // Fall back to a predefined list of known agents
      const fallbackAgents: AgentInfo[] = [
        { id: 'coordinator', name: 'CoordinatorAgent', role: 'Task Orchestration', description: 'Orchestrates the component generation pipeline', status: 'idle' },
        { id: 'builder', name: 'BuilderAgent', role: 'Component Building', description: 'Generates and builds Remotion components', status: 'idle' },
        { id: 'adb', name: 'ADBAgent', role: 'Design Brief Generation', description: 'Handles Animation Design Brief generation', status: 'idle' },
        { id: 'fixer', name: 'ErrorFixerAgent', role: 'Error Correction', description: 'Fixes errors in component code', status: 'idle' },
        { id: 'r2', name: 'R2StorageAgent', role: 'Storage Management', description: 'Manages storage and retrieval of components', status: 'idle' },
        { id: 'ui', name: 'UIAgent', role: 'UI Updates', description: 'Handles UI notifications via SSE', status: 'idle' },
        { id: 'componentfixer', name: 'ComponentLoadingFixer', role: 'Loading Fixes', description: 'Fixes Remotion component loading issues', status: 'idle' }
      ];
      
      setAgents(fallbackAgents);
      setIsLoading(false);
    }
  }, [agentDirectoryData, isLoadingAgents]);
  
  // Handle agent card click to show details
  const handleAgentClick = (agent: AgentInfo) => {
    setSelectedAgent(agent === selectedAgent ? null : agent);
  };
  
  // Get color for agent status
  const getStatusColor = (status: AgentInfo['status']) => {
    switch (status) {
      case 'working': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'error': return 'bg-red-500';
      case 'waiting': return 'bg-blue-500';
      default: return 'bg-gray-300';
    }
  };

  const getStatusText = (status: AgentInfo['status']) => {
    switch (status) {
      case 'working': return 'Working';
      case 'completed': return 'Completed';
      case 'error': return 'Error';
      case 'waiting': return 'Waiting';
      default: return 'Idle';
    }
  };
  
  const getVariantForStatus = (status: AgentInfo['status']) => {
    switch (status) {
      case 'working': return 'default'; // Blue
      case 'completed': return 'secondary'; // Green
      case 'error': return 'destructive'; // Red
      case 'waiting': return 'outline'; // Gray outline
      default: return 'outline'; // Gray outline for idle
    }
  };
  
  // Helper to format time as relative (e.g., "2 min ago")
  const getRelativeTime = (timestamp: Date | string | undefined) => {
    if (!timestamp) return 'Never';
    
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    
    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    return date.toLocaleDateString();
  };
  
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Agent Network</CardTitle>
          {taskId && (
            <Badge variant={sseConnected ? 'default' : 'outline'} className="ml-2">
              {sseConnected ? 'Live' : 'Disconnected'}
            </Badge>
          )}
        </div>
        <CardDescription>
          {taskId 
            ? `Monitoring agent activity for task ${taskId.substring(0, 8)}...` 
            : 'Current agent network status'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="h-[400px] flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              Loading agent network...
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Agent Network Visualization */}
            <div className="p-4 border rounded-lg bg-muted/30">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {agents.map(agent => (
                  <div
                    key={agent.id}
                    className={`p-4 border rounded-md cursor-pointer transition-all ${
                      selectedAgent?.id === agent.id 
                        ? 'border-primary shadow-md' 
                        : agent.status !== 'idle' 
                          ? 'border-gray-300 bg-gray-50 dark:bg-gray-800' 
                          : 'border-gray-200'
                    }`}
                    onClick={() => handleAgentClick(agent)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-sm truncate">{agent.name}</h3>
                      <div className="flex items-center space-x-1">
                        <div className={`w-2 h-2 rounded-full ${getStatusColor(agent.status)}`}></div>
                        <Badge variant={getVariantForStatus(agent.status)} className="text-xs">
                          {getStatusText(agent.status)}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mb-2">{agent.role}</p>
                    {agent.currentTool && (
                      <p className="text-xs font-medium truncate">
                        Tool: <span className="text-muted-foreground">{agent.currentTool}</span>
                      </p>
                    )}
                    {agent.lastActive && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Active: {getRelativeTime(agent.lastActive)}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Message flow visualization */}
            {messages.length > 0 && (
              <div className="border rounded-md p-4">
                <div className="flex justify-between items-center mb-3">
                  <h3 className="font-medium">Agent Communication</h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setExpandMessages(!expandMessages)}
                  >
                    {expandMessages ? 'Collapse' : 'View All'}
                  </Button>
                </div>
                
                <div className="space-y-3 max-h-[300px] overflow-y-auto">
                  {messages.slice(0, expandMessages ? undefined : 5).map((message, idx) => (
                    <div key={message.id} className="border rounded-md p-2 bg-muted/20 text-sm">
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center">
                          <span className="font-medium">{message.from}</span>
                          <ArrowRightIcon className="mx-1 h-3 w-3" />
                          <span className="font-medium">{message.to}</span>
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-xs mt-1">
                        {message.type}
                      </Badge>
                      {message.payload && (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="sm" className="ml-2 h-5 px-1">
                              <InfoIcon className="h-3 w-3" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-80">
                            <div className="space-y-2">
                              <h4 className="font-medium text-sm">Message Details</h4>
                              <div className="rounded-md bg-muted p-2 text-xs overflow-x-auto">
                                <pre>{JSON.stringify(message.payload, null, 2)}</pre>
                              </div>
                            </div>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Agent Details Panel (shown when an agent is selected) */}
            {selectedAgent && (
              <div className="border rounded-md p-4 bg-muted/30">
                <h3 className="font-medium mb-2">{selectedAgent.name}</h3>
                {selectedAgent.description && (
                  <p className="text-sm text-muted-foreground mb-3">{selectedAgent.description}</p>
                )}
                {selectedAgent.skills && selectedAgent.skills.length > 0 && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium">Skills:</h4>
                    <div className="flex flex-wrap gap-2">
                      {selectedAgent.skills.map(skill => (
                        <Badge key={skill.id} variant="outline">{skill.name}</Badge>
                      ))}
                    </div>
                  </div>
                )}
                {selectedAgent.currentTool && (
                  <div className="mt-3">
                    <h4 className="text-sm font-medium">Current Activity:</h4>
                    <p className="text-sm text-muted-foreground">{selectedAgent.currentTool}</p>
                  </div>
                )}
              </div>
            )}
            
            {!taskId && (
              <div className="text-sm text-center text-muted-foreground">
                Create a task to see real-time agent communication and status updates.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
} 