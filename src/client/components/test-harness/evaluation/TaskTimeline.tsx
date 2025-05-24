//src/client/components/test-harness/evaluation/TaskTimeline.tsx
'use client';

import { CheckIcon, XIcon, ArrowRightIcon } from "lucide-react";

// Define StateTransition interface here
interface StateTransition {
  state: string;
  timestamp: string | Date;
  agent?: string;
  message?: string;
  error?: string;
}

interface TaskTimelineProps {
  transitions?: StateTransition[];
  agentRoles?: Record<string, string>;
  selectedTaskId?: string;
}

export function TaskTimeline({ transitions = [], agentRoles = {} }: TaskTimelineProps) {
  // If no transitions, show a placeholder message
  if (!transitions.length) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p className="text-center mb-2">Select a task to view its workflow</p>
        <p className="text-xs text-center">The timeline will show how agents collaborate to process the task</p>
      </div>
    );
  }

  // Extract unique agents from transitions in chronological order
  const agentSequence: string[] = [];
  transitions.forEach(transition => {
    if (transition.agent && !agentSequence.includes(transition.agent)) {
      agentSequence.push(transition.agent);
    }
  });
  
  // Get the latest state for each agent
  const agentStates: Record<string, { 
    state: string, 
    hasError: boolean, 
    timestamp: Date,
    message?: string
  }> = {};
  
  transitions.forEach(transition => {
    if (!transition.agent) return;
    
    agentStates[transition.agent] = {
      state: transition.state,
      hasError: !!transition.error,
      timestamp: new Date(transition.timestamp),
      message: transition.message
    };
  });
  
  return (
    <div className="p-4">
      <h3 className="font-semibold mb-4">Video Generation Workflow:</h3>
      
      {agentSequence.length === 0 ? (
        <p className="text-center text-muted-foreground">No agent activity recorded for this task</p>
      ) : (
        <div className="flex items-center justify-center overflow-x-auto py-4">
          {agentSequence.map((agentName, index) => (
            <div key={agentName} className="flex items-center">
              {/* Agent circle with status */}
              <div className="flex flex-col items-center">
                <div 
                  className={`relative w-24 h-24 rounded-full flex items-center justify-center p-1
                    ${agentStates[agentName]?.hasError ? 'bg-red-100 border-2 border-red-400' : 
                      agentStates[agentName]?.state === 'completed' ? 'bg-green-100 border-2 border-green-400' : 
                      'bg-blue-50 border-2 border-blue-300'}`}
                >
                  <div className="flex flex-col items-center justify-center text-center p-1">
                    <span className="font-semibold text-sm">
                      {agentName.replace('Agent', '')}
                    </span>
                    <span className="text-xs">{(agentRoles?.[agentName]) || 'Agent'}</span>
                  </div>
                  
                  {/* Status indicator */}
                  <div 
                    className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-white"
                    title={agentStates[agentName]?.state || 'unknown'}
                  >
                    {agentStates[agentName]?.hasError ? (
                      <div className="bg-red-500 text-white rounded-full w-full h-full flex items-center justify-center">
                        <XIcon className="w-3 h-3" />
                      </div>
                    ) : agentStates[agentName]?.state === 'completed' ? (
                      <div className="bg-green-500 text-white rounded-full w-full h-full flex items-center justify-center">
                        <CheckIcon className="w-3 h-3" />
                      </div>
                    ) : (
                      <div className="bg-blue-500 text-white rounded-full w-full h-full flex items-center justify-center">
                        <span className="text-[8px] font-semibold">
                          {agentStates[agentName]?.state?.substring(0, 1).toUpperCase() || '?'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Agent state label */}
                <div className="mt-2 text-xs text-center">
                  <span className={`px-2 py-0.5 rounded-full 
                    ${agentStates[agentName]?.hasError ? 'bg-red-100 text-red-700' : 
                      agentStates[agentName]?.state === 'completed' ? 'bg-green-100 text-green-700' : 
                      'bg-blue-100 text-blue-700'}`}
                  >
                    {agentStates[agentName]?.state || 'unknown'}
                  </span>
                </div>
              </div>
              
              {/* Arrow to next agent */}
              {index < agentSequence.length - 1 && (
                <div className="mx-2">
                  <ArrowRightIcon className="w-5 h-5 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Timeline of events */}
      <div className="mt-6 border rounded-lg overflow-hidden">
        <div className="bg-muted p-2 text-sm font-medium">Timeline of Events</div>
        <div className="relative p-4">
          {/* Vertical line */}
          <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-muted"></div>
          
          <div className="space-y-4">
            {transitions?.map((transition, index) => (
              <div key={index} className="flex relative">
                {/* Timeline dot */}
                <div 
                  className={`w-4 h-4 rounded-full z-10 mt-1.5 flex-shrink-0
                    ${transition.error ? 'bg-red-500' : 
                      transition.state === 'completed' ? 'bg-green-500' : 
                      'bg-blue-500'}`}
                ></div>
                
                {/* Content */}
                <div className="ml-4 flex-grow">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">
                      {transition.agent || 'System'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(transition.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  
                  <div className="text-xs bg-muted/30 rounded-sm px-2 py-0.5 inline-block">
                    {transition.state}
                  </div>
                  
                  {transition.message && (
                    <p className="text-sm mt-1">{transition.message}</p>
                  )}
                  
                  {transition.error && (
                    <p className="text-sm text-red-600 mt-1">{transition.error}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
