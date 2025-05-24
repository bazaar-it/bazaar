//src/client/components/test-harness/evaluation/TaskDetailsPanel.tsx
'use client';

import { useState } from "react";
import { AgentCard } from "./AgentCard";
import { RemotionPreview } from "./RemotionPreview";
import { ChatPanel } from "./ChatPanel";
import { TaskTimeline } from "./TaskTimeline";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import type { Artifact } from "~/types/a2a";

// Import or define the StateTransition interface
interface StateTransition {
  state: string;
  timestamp: string | Date;
  agent?: string;
  message?: string;
  error?: string;
}

// Define the props for the component
interface TaskDetailsPanelProps {
  taskId: string;
  success: boolean;
  errorStage?: string | null;
  errorMessage?: string | null;
  errorType?: string | null;
  stateTransitions: StateTransition[] | null | string;
  artifacts: Artifact[] | null | string;
  agentRoles: Record<string, string>;
}

export function TaskDetailsPanel({
  taskId,
  success,
  errorStage,
  errorMessage,
  errorType,
  stateTransitions,
  artifacts,
  agentRoles
}: TaskDetailsPanelProps) {
  // Parse state transitions if needed
  let parsedTransitions: StateTransition[] = [];
  if (typeof stateTransitions === 'string') {
    try {
      parsedTransitions = JSON.parse(stateTransitions) as StateTransition[];
    } catch (e) { 
      console.error("Failed to parse stateTransitions for task", taskId, e); 
    }
  } else if (Array.isArray(stateTransitions)) {
    parsedTransitions = stateTransitions;
  }

  // Parse artifacts if needed
  let parsedArtifacts: Artifact[] = [];
  if (typeof artifacts === 'string') {
    try {
      parsedArtifacts = JSON.parse(artifacts) as Artifact[];
    } catch (e) { 
      console.error("Failed to parse artifacts for task", taskId, e); 
    }
  } else if (Array.isArray(artifacts)) {
    parsedArtifacts = artifacts;
  }

  // Group artifacts by type/purpose for better organization
  const scenePlanArtifacts = parsedArtifacts.filter(a => 
    (a.name?.toLowerCase().includes('scene') || 
     a.name?.toLowerCase().includes('plan') ||
     a.description?.toLowerCase().includes('scene plan'))
  );

  const reasoningArtifacts = parsedArtifacts.filter(a => 
    (a.name?.toLowerCase().includes('reason') || 
     a.description?.toLowerCase().includes('reasoning') ||
     a.name?.toLowerCase().includes('decision'))
  );

  const codeArtifacts = parsedArtifacts.filter(a => 
    (a.name?.toLowerCase().includes('code') || 
     a.name?.toLowerCase().includes('component') ||
     a.mimeType?.includes('javascript') ||
     a.mimeType?.includes('typescript'))
  );

  const otherArtifacts = parsedArtifacts.filter(a => 
    !scenePlanArtifacts.includes(a) && 
    !reasoningArtifacts.includes(a) && 
    !codeArtifacts.includes(a)
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">Task Details</h3>
          <p className="text-sm"><strong>ID:</strong> {taskId}</p>
        </div>
        <Badge variant={success ? "default" : "destructive"}>
          {success ? 'Success' : 'Failed'}
        </Badge>
      </div>
      
      {/* Animation Preview Section */}
      <div className="mb-4">
        <RemotionPreview taskId={taskId} />
      </div>
      
      {/* Main Content Tabs */}
      <Tabs defaultValue="timeline">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="chat">Chat</TabsTrigger>
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="artifacts">Artifacts</TabsTrigger>
        </TabsList>
        
        {/* Timeline Tab */}
        <TabsContent value="timeline" className="border rounded-md p-1">
          <TaskTimeline 
            transitions={parsedTransitions} 
            agentRoles={agentRoles} 
          />
        </TabsContent>
        
        {/* Chat Tab */}
        <TabsContent value="chat" className="border rounded-md p-1">
          <div className="h-[400px]"> {/* Fixed height to avoid layout shifts */}
            <ChatPanel 
              stateTransitions={parsedTransitions}
              artifacts={parsedArtifacts}
            />
          </div>
        </TabsContent>
        
        {/* Agents Tab */}
        <TabsContent value="agents" className="border rounded-md p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(agentRoles).map(([agentName, agentRole]) => {
              // Default agent information
              let agentStatus = 'Idle';
              let activityDetail = 'No activity recorded for this task.';
              let agentArtifacts: Artifact[] = [];
              let lastActivityTime: Date | undefined = undefined;

              // Filter transitions relevant to this agent
              const relevantTransitions = parsedTransitions.filter(t => t.agent === agentName);
              const lastTransition = relevantTransitions.length > 0 
                ? relevantTransitions[relevantTransitions.length - 1] 
                : null;

              // Determine agent status based on transitions
              if (lastTransition) {
                // If the agent has any transitions, it was involved
                agentStatus = 'Involved';
                
                // Extract details from the last transition
                activityDetail = lastTransition.message || `Last state: ${lastTransition.state}`;
                lastActivityTime = new Date(lastTransition.timestamp);
                
                // Check for errors
                if (lastTransition.error) {
                  agentStatus = 'Error';
                  activityDetail = `Error: ${lastTransition.error}`;
                }
                
                // If the task succeeded and this was the last agent with a completed state
                if (success && lastTransition.state === 'completed') {
                  agentStatus = 'Completed';
                }
              }
              
              // If task failed and this agent was the last one in errorStage
              if (!success && errorStage === agentName) {
                agentStatus = 'Error';
                activityDetail = errorMessage || errorType || 'An error occurred with this agent.';
              }

              // For other agents, associate based on timing if they have transitions
              if (agentName === 'ScenePlannerAgent') {
                agentArtifacts = scenePlanArtifacts;
              } else if (agentName === 'CoordinatorAgent') {
                agentArtifacts = reasoningArtifacts;
              } else if (agentName === 'BuilderAgent') {
                agentArtifacts = codeArtifacts;
              } else if (relevantTransitions.length > 0) {
                // For other agents, associate based on timing if they have transitions
                const lastTransition = relevantTransitions[relevantTransitions.length - 1];
                if (lastTransition?.timestamp) {
                  const lastTransitionTime = new Date(lastTransition.timestamp);
                  
                  // Find artifacts created around the same time
                  agentArtifacts = parsedArtifacts.filter(artifact => {
                    if (!artifact.createdAt) return false;
                    
                    const artifactTime = new Date(artifact.createdAt);
                    // Look for artifacts created within 5 seconds of the agent's activity
                    return Math.abs(artifactTime.getTime() - lastTransitionTime.getTime()) < 5000;
                  });
                }
              }

              return (
                <AgentCard 
                  key={agentName}
                  agentName={agentName}
                  agentRole={agentRole}
                  status={agentStatus}
                  activityDetail={activityDetail}
                  artifacts={agentArtifacts}
                  lastActivityTime={lastActivityTime}
                />
              );
            })}
          </div>
        </TabsContent>
        
        {/* Artifacts Tab */}
        <TabsContent value="artifacts" className="border rounded-md p-4">
          {parsedArtifacts.length === 0 ? (
            <p className="text-center text-muted-foreground p-4">No artifacts available for this task</p>
          ) : (
            <div className="space-y-6">
              {/* Scene Plan Artifacts */}
              {scenePlanArtifacts.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-blue-700">Scene Plans</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {scenePlanArtifacts.map((artifact, index) => (
                      <Card key={`scene-${index}`} className="overflow-hidden">
                        <CardHeader className="bg-blue-50 py-2">
                          <CardTitle className="text-sm">{artifact.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                          {artifact.description && (
                            <p className="text-sm text-muted-foreground mb-2">{artifact.description}</p>
                          )}
                          
                          {artifact.type === 'data' && artifact.data && (
                            <div className="h-48 border rounded-md p-2 overflow-auto">
                              <pre className="text-xs whitespace-pre-wrap font-mono">
                                {typeof artifact.data === 'string' 
                                  ? artifact.data 
                                  : JSON.stringify(artifact.data, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {artifact.url && (
                            <a href={artifact.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                              View Content
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Reasoning Artifacts */}
              {reasoningArtifacts.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-purple-700">Reasoning & Decisions</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {reasoningArtifacts.map((artifact, index) => (
                      <Card key={`reason-${index}`} className="overflow-hidden">
                        <CardHeader className="bg-purple-50 py-2">
                          <CardTitle className="text-sm">{artifact.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                          {artifact.description && (
                            <p className="text-sm text-muted-foreground mb-2">{artifact.description}</p>
                          )}
                          
                          {artifact.type === 'data' && artifact.data && (
                            <div className="h-48 border rounded-md p-2 overflow-auto">
                              <pre className="text-xs whitespace-pre-wrap font-mono">
                                {typeof artifact.data === 'string' 
                                  ? artifact.data 
                                  : JSON.stringify(artifact.data, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {artifact.url && (
                            <a href={artifact.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                              View Content
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Code Artifacts */}
              {codeArtifacts.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 text-green-700">Generated Components</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {codeArtifacts.map((artifact, index) => (
                      <Card key={`code-${index}`} className="overflow-hidden">
                        <CardHeader className="bg-green-50 py-2">
                          <CardTitle className="text-sm">{artifact.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                          {artifact.description && (
                            <p className="text-sm text-muted-foreground mb-2">{artifact.description}</p>
                          )}
                          
                          {artifact.type === 'data' && artifact.data && (
                            <div className="h-48 border rounded-md p-2 overflow-auto">
                              <pre className="text-xs whitespace-pre-wrap font-mono">
                                {typeof artifact.data === 'string' 
                                  ? artifact.data 
                                  : JSON.stringify(artifact.data, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {artifact.url && (
                            <a href={artifact.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                              View Content
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Other Artifacts */}
              {otherArtifacts.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2">Other Artifacts</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {otherArtifacts.map((artifact, index) => (
                      <Card key={`other-${index}`}>
                        <CardHeader className="py-2">
                          <CardTitle className="text-sm">
                            {artifact.name}
                            <span className="ml-2 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                              {artifact.type}
                            </span>
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3">
                          {artifact.description && (
                            <p className="text-sm text-muted-foreground mb-2">{artifact.description}</p>
                          )}
                          
                          {artifact.type === 'data' && artifact.data && (
                            <div className="h-48 border rounded-md p-2 overflow-auto">
                              <pre className="text-xs whitespace-pre-wrap font-mono">
                                {typeof artifact.data === 'string' 
                                  ? artifact.data 
                                  : JSON.stringify(artifact.data, null, 2)}
                              </pre>
                            </div>
                          )}
                          
                          {artifact.url && (
                            <a href={artifact.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline text-sm">
                              View Content
                            </a>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
