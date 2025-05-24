// src/client/components/test-harness/TaskDetails.tsx
// @ts-nocheck
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { cn } from '~/lib/utils';
import type { TaskStatus } from '~/types/a2a';

interface TaskDetailsProps {
  taskStatus: TaskStatus | null;
  taskId: string;
}

export function TaskDetails({ taskStatus, taskId }: TaskDetailsProps) {
  if (!taskStatus) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Task: {taskId.substring(0, 15)}...</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Loading task details...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex justify-between items-center">
          <span>Task: {taskId.substring(0, 15)}...</span>
          <span className={cn(
            "px-2 py-1 rounded-full text-white text-xs",
            taskStatus.state === 'completed' ? "bg-green-500" :
            taskStatus.state === 'running' ? "bg-blue-500" :
            taskStatus.state === 'failed' ? "bg-red-500" :
            taskStatus.state === 'canceled' ? "bg-yellow-500" :
            "bg-gray-500"
          )}>
            {taskStatus.state}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {taskStatus.message && (
          <div className="mb-4">
            <h4 className="font-semibold text-sm mb-1">Message:</h4>
            <p className="text-sm">{taskStatus.message}</p>
          </div>
        )}
        
        {(taskStatus.artifacts && taskStatus.artifacts.length > 0) ? (
          <div>
            <h4 className="font-semibold text-sm mb-1">Artifacts:</h4>
            <ul className="list-disc pl-5 space-y-1">
              {taskStatus.artifacts.map((artifact) => (
                <li key={artifact.id} className="text-sm">
                  {artifact.name || artifact.id} ({artifact.contentType})
                  {artifact.url && (
                    <a 
                      href={artifact.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="ml-2 text-blue-500 hover:underline"
                    >
                      View
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No artifacts available</p>
        )}
      </CardContent>
    </Card>
  );
}

export default TaskDetails; 