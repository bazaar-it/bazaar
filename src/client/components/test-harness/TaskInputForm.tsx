// src/client/components/test-harness/TaskInputForm.tsx
// @ts-nocheck
import { Label } from '~/components/ui/label';
import { Input } from '~/components/ui/input';
import { Textarea } from '~/components/ui/textarea';
import { Button } from '~/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '~/components/ui/card';
import type { Project } from '~/types/project';

interface TaskInputFormProps {
  projectId: string;
  setProjectId: (id: string) => void;
  taskMessage: string;
  setTaskMessage: (message: string) => void;
  onSubmit: () => void;
  projects: Project[];
}

export function TaskInputForm({
  projectId,
  setProjectId,
  taskMessage,
  setTaskMessage,
  onSubmit,
  projects,
}: TaskInputFormProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Create Video Task</CardTitle>
        <CardDescription>
          Create a new A2A video generation task
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="projectId">Project</Label>
          <select
            id="projectId"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full p-2 border rounded-md bg-background"
          >
            <option value="">Select a project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name || project.id}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="taskMessage">Description</Label>
          <Textarea
            id="taskMessage"
            value={taskMessage}
            onChange={(e) => setTaskMessage(e.target.value)}
            placeholder="Describe the video you want to create"
            className="min-h-[120px]"
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button
          onClick={onSubmit}
          disabled={!projectId || !taskMessage}
          className="w-full"
        >
          Create Video Task
        </Button>
      </CardFooter>
    </Card>
  );
}

export default TaskInputForm; 