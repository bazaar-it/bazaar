# A2A Test Dashboard Component Architecture

## Component Structure

This document outlines the React component hierarchy and implementation details for the A2A Test Dashboard.

```
A2ATestDashboard/
├── TaskCreationPanel/
│   ├── PromptInput
│   ├── ModelSelector
│   ├── TaskControls
│   └── TaskStatusBadge
├── AgentVisualizationPanel/
│   ├── AgentDirectory
│   │   └── AgentCard
│   ├── AgentNetworkGraph
│   │   ├── AgentNode
│   │   └── MessageEdge
│   └── MessageInspector
├── AnimationDesignBriefPanel/
│   ├── BriefViewer
│   ├── BriefRevisionHistory
│   └── BriefEvaluationMetrics
├── CodeGenerationPanel/
│   ├── CodeEditor
│   ├── CodeDiffViewer
│   └── CompilationStatusIndicator
├── RemotionPreviewPanel/
│   ├── ComponentSelector
│   ├── RemotionPlayer
│   └── RenderPerformanceMetrics
└── ComparisonPanel/
    ├── ModelOutputComparison
    ├── GenerationHistoryTimeline
    └── EvaluationSummary
```

## Component Implementations

### 1. TaskCreationPanel

The entry point for user interactions, simulating the chat interface from the main application.

```tsx
// src/client/components/test-harness/TaskCreationPanel.tsx
'use client';

import { useState } from 'react';
import { Button } from '~/components/ui/button';
import { Textarea } from '~/components/ui/textarea';
import { api } from '~/trpc/react';
import { ModelSelector } from './ModelSelector';
import { TaskStatusBadge } from '../a2a/TaskStatusBadge';

export function TaskCreationPanel() {
  const [prompt, setPrompt] = useState('');
  const [model, setModel] = useState('o4-mini');
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  
  const createTaskMutation = api.a2a.createTask.useMutation({
    onSuccess: (data) => {
      setCurrentTaskId(data.id);
    }
  });

  const handleCreateTask = () => {
    if (!prompt) return;
    
    createTaskMutation.mutate({
      prompt,
      model,
      // Additional parameters as needed
    });
  };

  return (
    <div className="p-4 border rounded-md space-y-4">
      <h2 className="text-xl font-bold">Create A2A Task</h2>
      
      <div className="space-y-2">
        <label className="block text-sm font-medium">Animation Prompt</label>
        <Textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Describe the animation you want to create..."
          className="h-24"
        />
      </div>
      
      <ModelSelector value={model} onChange={setModel} />
      
      <div className="flex justify-between items-center">
        <Button 
          onClick={handleCreateTask} 
          disabled={createTaskMutation.isPending || !prompt}
        >
          {createTaskMutation.isPending ? 'Creating...' : 'Create Task'}
        </Button>
        
        {currentTaskId && (
          <TaskStatusBadge 
            taskId={currentTaskId} 
            onRefresh={() => {/* refresh logic */}}
          />
        )}
      </div>
    </div>
  );
}
```

### 2. AgentNetworkGraph

Visualizes the agent communication network using a force-directed graph.

```tsx
// src/client/components/test-harness/AgentNetworkGraph.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { useTheme } from '~/hooks/useTheme';
import { AgentNode } from './AgentNode';
import { MessageEdge } from './MessageEdge';
import { api } from '~/trpc/react';

interface Agent {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'error';
}

interface Message {
  id: string;
  from: string;
  to: string;
  type: string;
  timestamp: string;
}

interface AgentNetworkGraphProps {
  taskId: string;
}

export function AgentNetworkGraph({ taskId }: AgentNetworkGraphProps) {
  const { theme } = useTheme();
  const svgRef = useRef<SVGSVGElement>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // Use the A2A SSE connection to get real-time updates
  const { data: agentListData } = api.a2a.getAgentDirectory.useQuery();
  const { data: agentActivityData } = api.a2a.getAgentActivity.useQuery(
    { taskId },
    { enabled: !!taskId, refetchInterval: 1000 }
  );
  
  useEffect(() => {
    if (agentListData) {
      setAgents(agentListData.map(agent => ({
        id: agent.name,
        name: agent.name,
        status: 'idle'
      })));
    }
  }, [agentListData]);
  
  useEffect(() => {
    if (agentActivityData) {
      // Update agent statuses based on activity
      setAgents(current => 
        current.map(agent => ({
          ...agent,
          status: agentActivityData.activeAgents.includes(agent.id)
            ? 'working'
            : agent.status
        }))
      );
      
      // Update messages
      setMessages(agentActivityData.messages);
    }
  }, [agentActivityData]);
  
  useEffect(() => {
    if (!svgRef.current || agents.length === 0) return;
    
    // D3 force-directed graph initialization
    const width = svgRef.current.clientWidth;
    const height = svgRef.current.clientHeight;
    
    const simulation = d3.forceSimulation(agents as any)
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide().radius(50))
      .force('link', d3.forceLink(messages).id((d: any) => d.id));
      
    // D3 rendering code here...
    
    return () => {
      simulation.stop();
    };
  }, [agents, messages, theme]);
  
  return (
    <div className="w-full h-[500px] border rounded-md p-4">
      <h2 className="text-xl font-bold mb-4">Agent Communication Network</h2>
      <svg 
        ref={svgRef} 
        width="100%" 
        height="100%"
        className="bg-background rounded-md"
      >
        {/* SVG elements will be managed by D3 */}
      </svg>
    </div>
  );
}
```

### 3. AnimationDesignBriefViewer

Displays and compares animation design briefs created by agents.

```tsx
// src/client/components/test-harness/AnimationDesignBriefViewer.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { api } from '~/trpc/react';
import type { AnimationDesignBrief } from '~/lib/schemas/animationDesignBrief.schema';

interface AnimationDesignBriefViewerProps {
  taskId: string;
}

export function AnimationDesignBriefViewer({ taskId }: AnimationDesignBriefViewerProps) {
  const [selectedBriefId, setSelectedBriefId] = useState<string | null>(null);
  
  const { data: briefsData, isLoading } = api.a2a.getTaskDesignBriefs.useQuery(
    { taskId },
    { enabled: !!taskId, refetchInterval: 2000 }
  );
  
  useEffect(() => {
    if (briefsData?.length && !selectedBriefId) {
      setSelectedBriefId(briefsData[0].id);
    }
  }, [briefsData, selectedBriefId]);
  
  const selectedBrief = briefsData?.find(brief => brief.id === selectedBriefId);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Animation Design Briefs</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">Loading briefs...</div>
        ) : briefsData?.length ? (
          <Tabs value={selectedBriefId || undefined} onValueChange={setSelectedBriefId}>
            <TabsList className="grid grid-cols-2 mb-4">
              {briefsData.map((brief) => (
                <TabsTrigger key={brief.id} value={brief.id}>
                  {brief.sceneName || `Brief ${brief.id.substring(0, 6)}`}
                </TabsTrigger>
              ))}
            </TabsList>
            
            {briefsData.map((brief) => (
              <TabsContent key={brief.id} value={brief.id}>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Scene Description</h3>
                    <p className="text-sm">{brief.description}</p>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Animation Elements</h3>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {brief.elements?.map((element, idx) => (
                        <div key={idx} className="text-sm p-2 bg-muted rounded-md">
                          {element.type}: {element.description}
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">Full JSON</h3>
                    <pre className="text-xs p-2 bg-secondary overflow-auto rounded-md mt-2 max-h-60">
                      {JSON.stringify(brief, null, 2)}
                    </pre>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            No design briefs generated yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}
```

### 4. CodeViewer

Displays the generated TSX code with syntax highlighting.

```tsx
// src/client/components/test-harness/CodeViewer.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { api } from '~/trpc/react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface CodeViewerProps {
  taskId: string;
}

export function CodeViewer({ taskId }: CodeViewerProps) {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  
  const { data: componentsData, isLoading } = api.customComponent.getComponentsForTask.useQuery(
    { taskId },
    { enabled: !!taskId, refetchInterval: 2000 }
  );
  
  useEffect(() => {
    if (componentsData?.length && !selectedComponentId) {
      setSelectedComponentId(componentsData[0].id);
    }
  }, [componentsData, selectedComponentId]);
  
  const selectedComponent = componentsData?.find(comp => comp.id === selectedComponentId);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated TSX Code</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center p-4">Loading components...</div>
        ) : componentsData?.length ? (
          <Tabs value={selectedComponentId || undefined} onValueChange={setSelectedComponentId}>
            <TabsList className="grid grid-cols-3 mb-4">
              {componentsData.map((comp) => (
                <TabsTrigger key={comp.id} value={comp.id}>
                  {comp.effect.substring(0, 15)}...
                </TabsTrigger>
              ))}
            </TabsList>
            
            {componentsData.map((comp) => (
              <TabsContent key={comp.id} value={comp.id}>
                <div className="space-y-4">
                  <div>
                    <h3 className="font-medium">Component Status</h3>
                    <div className="text-sm p-2 bg-muted rounded-md mt-2">
                      Status: <span className={`font-bold ${getStatusColor(comp.status)}`}>{comp.status}</span>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium">TSX Code</h3>
                    <SyntaxHighlighter 
                      language="tsx" 
                      style={vscDarkPlus}
                      className="text-xs rounded-md mt-2 max-h-[60vh] overflow-auto"
                    >
                      {comp.tsxCode || '// No code generated yet'}
                    </SyntaxHighlighter>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            No components generated yet
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'complete':
      return 'text-green-500';
    case 'failed':
      return 'text-red-500';
    case 'building':
      return 'text-blue-500';
    default:
      return 'text-yellow-500';
  }
}
```

### 5. RemotionPreviewPanel

Embeds the Remotion Player to show the actual generated animations.

```tsx
// src/client/components/test-harness/RemotionPreviewPanel.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { api } from '~/trpc/react';
import { Player } from '@remotion/player';
import { useRemoteComponent } from '~/hooks/useRemoteComponent';

interface RemotionPreviewPanelProps {
  taskId: string;
}

export function RemotionPreviewPanel({ taskId }: RemotionPreviewPanelProps) {
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  
  const { data: componentsData } = api.customComponent.getComponentsForTask.useQuery(
    { taskId },
    { enabled: !!taskId, refetchInterval: 2000 }
  );
  
  useEffect(() => {
    if (componentsData?.length && !selectedComponentId) {
      const readyComponent = componentsData.find(c => c.status === 'complete');
      if (readyComponent) {
        setSelectedComponentId(readyComponent.id);
      }
    }
  }, [componentsData, selectedComponentId]);
  
  const selectedComponent = componentsData?.find(comp => comp.id === selectedComponentId);
  
  const {
    Component: RemoteComponent,
    isLoading,
    error
  } = useRemoteComponent(selectedComponent?.id, selectedComponent?.outputUrl);
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Component Preview</CardTitle>
      </CardHeader>
      <CardContent>
        {!componentsData?.length ? (
          <div className="p-4 text-center text-muted-foreground">
            No components available for preview
          </div>
        ) : (
          <>
            <Tabs value={selectedComponentId || undefined} onValueChange={setSelectedComponentId}>
              <TabsList className="grid grid-cols-3 mb-4">
                {componentsData.map((comp) => (
                  <TabsTrigger 
                    key={comp.id} 
                    value={comp.id}
                    disabled={comp.status !== 'complete'}
                  >
                    {comp.effect.substring(0, 15)}...
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            
            <div className="relative aspect-video bg-black rounded-md overflow-hidden">
              {isLoading ? (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  Loading component...
                </div>
              ) : error ? (
                <div className="absolute inset-0 flex items-center justify-center text-white bg-red-900/30 p-4">
                  Error: {error}
                </div>
              ) : RemoteComponent ? (
                <Player
                  component={RemoteComponent}
                  durationInFrames={300}
                  compositionWidth={1280}
                  compositionHeight={720}
                  fps={30}
                  controls
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-white">
                  Select a component to preview
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
```

### 6. A2ATestDashboard (Main Component)

The main dashboard component that integrates all the panels.

```tsx
// src/app/test/evaluation-dashboard/page.tsx
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { TaskCreationPanel } from '~/client/components/test-harness/TaskCreationPanel';
import { AgentNetworkGraph } from '~/client/components/test-harness/AgentNetworkGraph';
import { AnimationDesignBriefViewer } from '~/client/components/test-harness/AnimationDesignBriefViewer';
import { CodeViewer } from '~/client/components/test-harness/CodeViewer';
import { RemotionPreviewPanel } from '~/client/components/test-harness/RemotionPreviewPanel';

export default function A2ATestDashboard() {
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  
  const handleTaskCreated = (taskId: string) => {
    setCurrentTaskId(taskId);
  };
  
  return (
    <div className="container mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">A2A Test Dashboard</h1>
      
      <div className="grid grid-cols-4 gap-6 mb-6">
        <div className="col-span-4 lg:col-span-1">
          <TaskCreationPanel onTaskCreated={handleTaskCreated} />
        </div>
        
        <div className="col-span-4 lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>
                {currentTaskId 
                  ? `Task: ${currentTaskId.substring(0, 8)}...` 
                  : 'Create a task to begin'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!currentTaskId ? (
                <div className="p-20 text-center text-muted-foreground">
                  Enter a prompt to create a new A2A task
                </div>
              ) : (
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid grid-cols-4 mb-6">
                    <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
                    <TabsTrigger value="agents">Agents</TabsTrigger>
                    <TabsTrigger value="code">Code Generation</TabsTrigger>
                    <TabsTrigger value="preview">Preview</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="dashboard">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <AgentNetworkGraph taskId={currentTaskId} />
                      <AnimationDesignBriefViewer taskId={currentTaskId} />
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="agents">
                    <AgentNetworkGraph taskId={currentTaskId} />
                  </TabsContent>
                  
                  <TabsContent value="code">
                    <CodeViewer taskId={currentTaskId} />
                  </TabsContent>
                  
                  <TabsContent value="preview">
                    <RemotionPreviewPanel taskId={currentTaskId} />
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
```

## API Integration

### tRPC Router Extensions

To support the A2A Test Dashboard, we'll need to extend the existing tRPC routers:

```typescript
// src/server/api/routers/a2a.ts
// Add these procedures to the existing a2a router

// Get agent directory
export const getAgentDirectory = publicProcedure
  .query(async ({ ctx }) => {
    // Fetch and return all registered agents with their capabilities
    // ...
  });

// Get agent activity for a task
export const getAgentActivity = publicProcedure
  .input(z.object({
    taskId: z.string()
  }))
  .query(async ({ ctx, input }) => {
    // Fetch active agents and messages for a task
    // ...
  });

// Get animation design briefs for a task
export const getTaskDesignBriefs = publicProcedure
  .input(z.object({
    taskId: z.string()
  }))
  .query(async ({ ctx, input }) => {
    // Fetch all animation design briefs associated with a task
    // ...
  });
```

```typescript
// src/server/api/routers/customComponent.ts
// Add these procedures to the existing customComponent router

// Get all components for a task
export const getComponentsForTask = publicProcedure
  .input(z.object({
    taskId: z.string()
  }))
  .query(async ({ ctx, input }) => {
    // Fetch all custom components associated with a task
    // ...
  });
```

## SSE Integration

Extend the existing Server-Sent Events endpoint to include agent communication events:

```typescript
// src/app/api/a2a/tasks/[taskId]/stream/route.ts
// Update the SSE route to include agent communication events

export async function GET(
  request: Request,
  { params }: { params: { taskId: string } }
) {
  // ... existing SSE setup code

  // Add handling for agent communication events
  const handleAgentCommunication = (message: any) => {
    if (message.taskId === params.taskId) {
      writer.write({
        event: 'agent_communication',
        id: crypto.randomUUID(),
        data: JSON.stringify({
          type: 'agent_communication',
          data: {
            from: message.sender,
            to: message.recipient,
            messageType: message.type,
            timestamp: new Date().toISOString()
          }
        })
      });
    }
  };

  // Subscribe to agent communication events
  // ...
  
  // Return existing response
  // ...
}
```

## Styling

The dashboard uses Shadcn UI components for a cohesive look. Custom styling will be needed for the agent network visualization and other complex components.

## Next Steps

1. Implement basic dashboard structure and layout
2. Add task creation interface
3. Develop agent directory and visualization
4. Create animation design brief viewer
5. Build code generation display
6. Integrate Remotion Player for previews
7. Add model switching and comparison tools
8. Implement evaluation metrics collection and display 