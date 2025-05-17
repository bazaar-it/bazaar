//src/app/test/evaluation-dashboard/page.tsx

'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Button } from '~/components/ui/button';
import { TaskCreationPanel } from '~/client/components/test-harness/TaskCreationPanel';
import { AgentNetworkGraph } from '~/client/components/test-harness/AgentNetworkGraph';
import { AnimationDesignBriefViewer } from '~/client/components/test-harness/AnimationDesignBriefViewer';
import { CodeViewer } from '~/client/components/test-harness/CodeViewer';
import { RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function EvaluationDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [currentTaskId, setCurrentTaskId] = useState<string>('');
  const router = useRouter();

  const handleRefresh = () => {
    router.refresh();
  };

  const handleTaskCreated = (taskId: string) => {
    setCurrentTaskId(taskId);
    setActiveTab('overview');
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">A2A Evaluation Dashboard</h1>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Task Creation Panel */}
        <div className="lg:col-span-1">
          <TaskCreationPanel onTaskCreated={handleTaskCreated} />
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-3">
          <Card className="w-full h-full">
            <CardHeader>
              <CardTitle>Agent-to-Agent Evaluation Framework</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-4">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="agents">Agent Communication</TabsTrigger>
                  <TabsTrigger value="generation">Component Generation</TabsTrigger>
                  <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
                </TabsList>

                <TabsContent value="overview">
                  <div className="grid grid-cols-1 md:grid-cols-1 xl:grid-cols-2 gap-4">
                    <div className="md:col-span-1 xl:col-span-2">
                      <AgentNetworkGraph taskId={currentTaskId} />
                    </div>
                    {currentTaskId && (
                      <>
                        <div>
                          <AnimationDesignBriefViewer taskId={currentTaskId} />
                        </div>
                        <div>
                          <CodeViewer taskId={currentTaskId} />
                        </div>
                      </>
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="agents">
                  <AgentNetworkGraph taskId={currentTaskId} />
                </TabsContent>

                <TabsContent value="generation">
                  {currentTaskId ? (
                    <CodeViewer taskId={currentTaskId} />
                  ) : (
                    <p className="text-center p-8 text-gray-500">
                      Create a task using the panel on the left to begin.
                    </p>
                  )}
                </TabsContent>

                <TabsContent value="performance">
                  {currentTaskId ? (
                    <div className="grid grid-cols-1 gap-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-lg">Performance Metrics</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-gray-500">
                            Detailed performance metrics for this task are coming soon.
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                  ) : (
                    <p className="text-center p-8 text-gray-500">
                      Create a task using the panel on the left to begin.
                    </p>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
