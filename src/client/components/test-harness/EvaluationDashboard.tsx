//src/client/components/test-harness/EvaluationDashboard.tsx

'use client';

import { useState, useCallback, Fragment } from 'react';
import { api } from '~/trpc/react';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Badge } from '~/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '~/components/ui/card';
import { CalendarIcon } from '@radix-ui/react-icons';
import { format } from 'date-fns';
import { Calendar } from '~/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '~/components/ui/popover';
import { MetricsOverview } from './evaluation/MetricsOverview';
import { CategoryBreakdown } from './evaluation/CategoryBreakdown';
import { PerformanceMetricsView } from './evaluation/PerformanceMetricsView';
import { ErrorAnalysis } from './evaluation/ErrorAnalysis';
import { ChevronDownIcon, ChevronRightIcon } from '@radix-ui/react-icons'; 
import { TaskDetailsPanel } from './evaluation/TaskDetailsPanel';
import { TaskTimeline } from './evaluation/TaskTimeline';
import { ChatPanel } from './evaluation/ChatPanel';
import type { Artifact } from '~/types/a2a'; // For parsing artifacts

// Define the structure of a state transition object based on A2A protocol
// This might need to be refined based on the actual data structure in stateTransitions
interface StateTransition {
  state: string;
  timestamp: string | Date;
  agent?: string; // Name of the agent performing the action
  message?: string;
  error?: string;
  // Add other relevant fields from your stateTransitions data
}

// Define the expected structure for each item in testRuns, including new fields
interface TestRunItem {
  id: string;
  testCaseId: string;
  taskId: string | null; // Can be null if not an A2A task or data is missing
  timestamp: Date;
  success: boolean;
  category: string;
  complexity: number;
  totalTime: number | null;
  testCasePrompt: string | null;
  stateTransitions: StateTransition[] | null | string; // JSON string or parsed array
  artifacts: Artifact[] | null | string; // JSON string or parsed array
  // Add other fields from your componentEvaluationMetrics table as needed
  errorStage?: string | null;
  errorType?: string | null;
  errorMessage?: string | null;
}

// Define the A2A agents we expect to see cards for
const A2A_AGENT_ROLES = {
  CoordinatorAgent: "Task Orchestrator",
  ScenePlannerAgent: "Scene Planner",
  ADBAgent: "Design Brief Generator",
  BuilderAgent: "Component Builder",
  ErrorFixerAgent: "Error Corrector",
  R2StorageAgent: "Artifact Storage",
  UIAgent: "User Interface Handler",
  // Add other agents as defined in your A2A workflow
};

type AgentName = keyof typeof A2A_AGENT_ROLES;

/**
 * Evaluation Dashboard Component
 * 
 * Provides visualizations and insights for component generation evaluation metrics
 */
export function EvaluationDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedTask, setSelectedTask] = useState<TestRunItem | null>(null);
  const [dateRange, setDateRange] = useState<{
    startDate: Date | undefined;
    endDate: Date | undefined;
  }>({
    startDate: undefined,
    endDate: undefined,
  });

  // Date picker helpers
  const handleStartDateSelect = useCallback((date: Date | undefined) => {
    setDateRange(prev => ({ ...prev, startDate: date }));
  }, []);

  const handleEndDateSelect = useCallback((date: Date | undefined) => {
    setDateRange(prev => ({ ...prev, endDate: date }));
  }, []);

  // Set default date range to last 7 days if not already set
  if (!dateRange.startDate && !dateRange.endDate) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    setDateRange({ startDate, endDate });
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">A2A Evaluation Dashboard</h1>
        <div className="flex items-center space-x-2">
          <div className="flex items-center space-x-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[180px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.startDate ? (
                    format(dateRange.startDate, 'PPP')
                  ) : (
                    <span>Start date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateRange.startDate}
                  onSelect={handleStartDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            <span>to</span>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-[180px] justify-start text-left font-normal"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.endDate ? (
                    format(dateRange.endDate, 'PPP')
                  ) : (
                    <span>End date</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={dateRange.endDate}
                  onSelect={handleEndDateSelect}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <Button>Apply Filter</Button>
        </div>
      </div>

      <Tabs defaultValue="overview" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="agents">Agent Communication</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="errors">Errors</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <MetricsOverview startDate={dateRange.startDate} endDate={dateRange.endDate} />
        </TabsContent>
        
        <TabsContent value="agents">
          <Card>
            <CardHeader>
              <CardTitle>Agent Communication Visualization</CardTitle>
              <CardDescription>
                Visualization of agent collaboration for video creation
                {selectedTask && (
                  <div className="mt-2">
                    <Badge variant="outline" className="mr-2">Task ID: {selectedTask.taskId || 'N/A'}</Badge>
                    <Badge variant={selectedTask.success ? "default" : "destructive"}>
                      {selectedTask.success ? 'Success' : 'Failed'}
                    </Badge>
                  </div>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Agent Flow Diagram - Always visible */}
              <div className="bg-background/60 backdrop-blur-sm border rounded-lg p-4 mb-6">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  {Object.entries(A2A_AGENT_ROLES).map(([agentName, role], index) => (
                    <div key={agentName} className="flex items-center">
                      <div className="relative">
                        <div className={`w-16 h-16 rounded-full flex items-center justify-center
                          ${agentName === 'ScenePlannerAgent' ? 'bg-blue-100 border-2 border-blue-300' : 
                            agentName === 'ADBAgent' ? 'bg-purple-100 border-2 border-purple-300' : 
                            agentName === 'BuilderAgent' ? 'bg-green-100 border-2 border-green-300' : 
                            'bg-muted border-2 border-muted-foreground/20'}
                          transition-all duration-300 hover:scale-110`}>
                          <div className="text-center">
                            <span className="text-xs font-medium">{agentName.replace('Agent', '')}</span>
                          </div>
                        </div>
                      </div>
                      {index < Object.entries(A2A_AGENT_ROLES).length - 1 && (
                        <div className="w-4 h-0.5 bg-muted-foreground/30 mx-1"></div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-center text-sm text-muted-foreground">
                  {selectedTask 
                    ? "Current task is being processed through the agent workflow" 
                    : "Select a task below to view its progress through the agent workflow"}
                </div>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Timeline Component - Always visible with sample data if needed */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex justify-between">
                      <span>Agent Timeline</span>
                      {selectedTask && <span className="text-xs text-muted-foreground">Task in progress</span>}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedTask && selectedTask.taskId ? (
                      <TaskTimeline 
                        transitions={typeof selectedTask.stateTransitions === 'string' 
                          ? JSON.parse(selectedTask.stateTransitions) as StateTransition[] 
                          : selectedTask.stateTransitions as StateTransition[] || []} 
                        agentRoles={A2A_AGENT_ROLES}
                        selectedTaskId={selectedTask.taskId}
                      />
                    ) : (
                      <TaskTimeline 
                        transitions={[
                          { 
                            state: "submitted",
                            timestamp: new Date(Date.now() - 5000),
                            agent: "CoordinatorAgent",
                            message: "Task received, processing video generation request"
                          },
                          {
                            state: "in_progress",
                            timestamp: new Date(Date.now() - 4000),
                            agent: "ScenePlannerAgent",
                            message: "Planning scene structure and transitions"
                          },
                          {
                            state: "completed",
                            timestamp: new Date(Date.now() - 3000),
                            agent: "ADBAgent",
                            message: "Generated animation design brief"
                          },
                          {
                            state: "in_progress",
                            timestamp: new Date(Date.now() - 2000),
                            agent: "BuilderAgent",
                            message: "Building video components"
                          }
                        ]}
                        agentRoles={A2A_AGENT_ROLES}
                      />
                    )}
                  </CardContent>
                </Card>
                
                {/* Chat Component - Always visible with sample data if needed */}
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">User-Agent Conversation</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedTask && selectedTask.taskId ? (
                      <ChatPanel 
                        stateTransitions={typeof selectedTask.stateTransitions === 'string'
                          ? JSON.parse(selectedTask.stateTransitions) as StateTransition[]
                          : selectedTask.stateTransitions as StateTransition[] || []}
                        artifacts={typeof selectedTask.artifacts === 'string'
                          ? JSON.parse(selectedTask.artifacts) as Artifact[]
                          : selectedTask.artifacts as Artifact[] || []}
                        selectedTaskId={selectedTask.taskId}
                      />
                    ) : (
                      <ChatPanel 
                        stateTransitions={[
                          {
                            state: "submitted",
                            timestamp: new Date(Date.now() - 5000),
                            agent: "CoordinatorAgent",
                            message: "Hello! I received your request to create a video for CodeVision."
                          },
                          {
                            state: "in_progress",
                            timestamp: new Date(Date.now() - 4000),
                            agent: "ScenePlannerAgent",
                            message: "I'm planning out your video with a matrix theme as requested. This will have an 8-second duration with appropriate transitions between scenes."
                          },
                          {
                            state: "completed",
                            timestamp: new Date(Date.now() - 3000),
                            agent: "ADBAgent",
                            message: "Your animation design brief is ready. I've incorporated the matrix theme with green digital rain effect and the CodeVision branding."
                          },
                          {
                            state: "in_progress",
                            timestamp: new Date(Date.now() - 2000),
                            agent: "BuilderAgent",
                            message: "Now building the video components. I'll let you know when the video is ready to preview."
                          }
                        ]}
                        artifacts={[
                          {
                            id: "sample-user-prompt",
                            name: "User Prompt",
                            description: "Initial user request",
                            type: "data",
                            data: "Create a short intro animation for a tech company called \"CodeVision\". 8 seconds, matrix theme",
                            mimeType: "text/plain",
                            createdAt: new Date(Date.now() - 6000).toISOString()
                          }
                        ]}
                      />
                    )}
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <CategoryBreakdown startDate={dateRange.startDate} endDate={dateRange.endDate} />
        </TabsContent>

        <TabsContent value="performance">
          <PerformanceMetricsView startDate={dateRange.startDate} endDate={dateRange.endDate} />
        </TabsContent>

        <TabsContent value="errors">
          <ErrorAnalysis startDate={dateRange.startDate} endDate={dateRange.endDate} />
        </TabsContent>
      </Tabs>

      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Raw Test Data</CardTitle>
          <CardDescription>
            Recent component generation test runs and their results
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TestDataTable 
            startDate={dateRange.startDate} 
            endDate={dateRange.endDate} 
            onSelectTask={setSelectedTask}
            selectedTaskId={selectedTask?.id}
          />
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Table displaying raw test data
 */
function TestDataTable({
  startDate,
  endDate,
  onSelectTask,
  selectedTaskId
}: {
  startDate?: Date;
  endDate?: Date;
  onSelectTask?: (task: TestRunItem | null) => void;
  selectedTaskId?: string;
}) {
  // Update the type annotation for useQuery to reflect the TestRunItem structure
  const { data: testRuns, isLoading } = api.evaluation.getMetricsInDateRange.useQuery(
    {
      startDate: startDate?.toISOString() || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: endDate?.toISOString() || new Date().toISOString(),
    },
    {
      enabled: !!startDate || !!endDate,
      // It's good practice to specify a select function if the backend returns more data than needed
      // or if data transformation is required here.
      // select: (data) => data.map(item => ({ ...item, /* transform if needed */ }))
    }
  ) as { data: TestRunItem[] | undefined; isLoading: boolean }; // Type assertion for the hook result

  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  const toggleRowExpansion = (runId: string) => {
    const isExpanding = !expandedRows.has(runId);
    
    // Update expanded rows
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(runId)) {
        newSet.delete(runId);
      } else {
        newSet.add(runId);
      }
      return newSet;
    });
    
    // If we're expanding this row, set it as the selected task
    if (isExpanding && onSelectTask && testRuns) {
      const selectedRun = testRuns.find(run => run.id === runId);
      if (selectedRun) {
        onSelectTask(selectedRun);
      }
    } else if (!isExpanding && onSelectTask && selectedTaskId === runId) {
      // If we're collapsing the currently selected task, clear the selection
      onSelectTask(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="animate-spin h-8 w-8 border-4 border-blue-500 rounded-full border-t-transparent"></div>
      </div>
    );
  }

  if (!testRuns || testRuns.length === 0) {
    return (
      <div className="text-center p-4 border rounded-md bg-muted/50">
        <p>No test data available for the selected time period.</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-muted border-b">
            <th className="p-2 text-left w-12"></th>
            <th className="p-2 text-left">Test Case</th>
            <th className="p-2 text-left">Category</th>
            <th className="p-2 text-left">Complexity</th>
            <th className="p-2 text-left">Result</th>
            <th className="p-2 text-left">Total Time</th>
            <th className="p-2 text-left">Timestamp</th>
          </tr>
        </thead>
        <tbody>
          {testRuns.map((run) => (
            <Fragment key={run.id}>
              <tr className="border-b hover:bg-muted/50">
                <td className="p-2 text-center">
                  <Button variant="ghost" size="sm" onClick={() => toggleRowExpansion(run.id)}>
                    {expandedRows.has(run.id) ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronRightIcon className="h-4 w-4" />}
                  </Button>
                </td>
                <td className="p-2 max-w-[200px] truncate">{run.testCasePrompt || 'N/A'}</td>
                <td className="p-2">{run.category}</td>
                <td className="p-2">{run.complexity}</td>
                <td className="p-2">
                  <Badge variant={run.success ? "default" : "destructive"}>
                    {run.success ? 'Success' : 'Failure'}
                  </Badge>
                </td>
                <td className="p-2">{run.totalTime ? `${(run.totalTime / 1000).toFixed(2)}s` : 'N/A'}</td>
                <td className="p-2">{run.timestamp ? format(new Date(run.timestamp), 'yyyy-MM-dd HH:mm') : 'N/A'}</td>
              </tr>
              {expandedRows.has(run.id) && (
                <tr className="border-b bg-muted/20">
                  <td colSpan={7} className="p-4">
                    {run.taskId ? (
                      <TaskDetailsPanel
                        taskId={run.taskId}
                        success={run.success}
                        errorStage={run.errorStage}
                        errorMessage={run.errorMessage}
                        errorType={run.errorType}
                        stateTransitions={run.stateTransitions}
                        artifacts={run.artifacts}
                        agentRoles={A2A_AGENT_ROLES}
                      />
                    ) : (
                      <p className="text-sm text-gray-500">Task ID not available, cannot display agent details.</p>
                    )}
                  </td>
                </tr>
              )}
            </Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
