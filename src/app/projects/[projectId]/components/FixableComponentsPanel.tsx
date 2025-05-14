//src/app/projects/[projectId]/components/FixableComponentsPanel.tsx

'use client';

import { useState } from 'react';
import { api } from '~/trpc/react';
// Using the project's button component
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';

// Interface for component job with the fields we need
interface ComponentJob {
  id: string;
  effect: string | null;
  status: string;
  errorMessage: string | null;
  fixIssues: string | null;
  lastFixAttempt: Date | null;
}

interface FixableComponentsPanelProps {
  projectId: string;
}

export function FixableComponentsPanel({ projectId }: FixableComponentsPanelProps) {
  // Mock data for demonstration - replace with actual API call when endpoints are ready
  // Using a mock that aligns with the router we'll create
  const { data: components, isLoading, refetch } = {
    data: [] as ComponentJob[],
    isLoading: false,
    refetch: () => {}
  };
  
  // TODO: Uncomment when the API endpoint is implemented
  // const { data: components, isLoading, refetch } = api.customComponent.getFixableByProjectId.useQuery({
    projectId
  // });
  
  // Fix component mutation - mock implementation
  const fixMutation = {
    mutate: (params: { componentId: string }) => {},
    isLoading: false,
    variables: { componentId: '' }
  };
  
  // TODO: Uncomment when the API endpoint is implemented
  // const fixMutation = api.customComponent.tryToFix.useMutation({
    // onSuccess: () => {
    //   refetch();
    // }
  // });
  
  if (isLoading) {
    return <div className="flex justify-center p-4">Loading...</div>;
  }
  
  if (!components || components.length === 0) {
    return null; // Hide panel when no fixable components
  }
  
  return (
    <div className="space-y-4 mb-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Components With Issues</h3>
        <div className="px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded">
          {components.length} {components.length === 1 ? 'component' : 'components'} need attention
        </div>
      </div>
      
      <div className="space-y-3">
        {components.map((component) => (
          <FixableComponentCard 
            key={component.id}
            component={component}
            onFix={() => fixMutation.mutate({ componentId: component.id })}
            isFixing={fixMutation.isLoading && fixMutation.variables?.componentId === component.id}
          />
        ))}
      </div>
    </div>
  );
}

interface FixableComponentCardProps {
  component: ComponentJob;
  onFix: () => void;
  isFixing: boolean;
}

function FixableComponentCard({ component, onFix, isFixing }: FixableComponentCardProps) {
  const [expanded, setExpanded] = useState(false);
  
  return (
    <div className="overflow-hidden border border-amber-200 rounded-md">
      <div className="bg-amber-50 py-2 px-3">
        <div className="text-sm font-medium flex justify-between items-center">
          <span>{component.effect || 'Unknown Component'}</span>
          <span className={`ml-2 px-2 py-0.5 text-xs rounded ${component.status === 'fixable' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
            {component.status}
          </span>
        </div>
      </div>
      
      <div className="p-3 text-sm">
        <div className="text-red-600 font-mono text-xs mb-2">
          {component.errorMessage || 'Unknown error'}
        </div>
        
        {component.fixIssues && (
          <div className="mt-2">
            <button 
              onClick={() => setExpanded(!expanded)} 
              className="text-xs text-blue-600 flex items-center"
            >
              <span className="mr-1">{expanded ? '▼' : '►'}</span>
              Previous fix attempts
            </button>
            
            {expanded && (
              <div className="mt-2 text-xs border-l-2 border-gray-300 pl-2 py-1">
                {component.fixIssues?.split(', ').map((issue: string, i: number) => (
                  <div key={i} className="py-0.5">{issue}</div>
                ))}
                
                {component.lastFixAttempt && (
                  <div className="mt-1 text-gray-500">
                    Last attempt: {new Date(component.lastFixAttempt).toLocaleString()}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      
      <div className="p-2 bg-gray-50 flex justify-end">
        <Button 
          variant="default" 
          onClick={onFix}
          disabled={isFixing}
          className={cn(
            "text-xs px-3 py-1",
            isFixing && "opacity-80"
          )}
        >
          {isFixing ? (
            <span className="inline-block animate-spin mr-2">⟳</span>
          ) : null}
          {isFixing ? 'Fixing...' : 'Try to Fix'}
        </Button>
      </div>
    </div>
  );
}
