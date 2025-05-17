'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { api } from '~/trpc/react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';

interface TaskCreationPanelProps {
  onTaskCreated?: (taskId: string) => void;
  onTaskCreationError?: (errorMessage: string) => void;
}

interface ComponentTaskParams {
  sceneName: string;
  description: string;
  duration: number;
}

interface VideoTaskParams {
  prompt: string;
}

export function TaskCreationPanel({ onTaskCreated, onTaskCreationError }: TaskCreationPanelProps) {
  const [activeTab, setActiveTab] = useState<string>("component");
  const [isCreating, setIsCreating] = useState(false);
  
  // State for component task
  const [componentParams, setComponentParams] = useState<ComponentTaskParams>({
    sceneName: "CustomScene",
    description: "A simple animation showing a bouncing ball",
    duration: 5
  });
  
  // State for video task
  const [videoParams, setVideoParams] = useState<VideoTaskParams>({
    prompt: "Create a short intro animation for a tech company called 'CodeVision'"
  });
  
  // Create project mutation
  const projectCreateMutation = api.project.create.useMutation({
    onSuccess: (data) => {
      const projectId = data.projectId;
      
      if (activeTab === "component") {
        createComponentTask(projectId);
      } else {
        createVideoTask(projectId);
      }
    },
    onError: (error) => {
      setIsCreating(false);
      if (onTaskCreationError) {
        onTaskCreationError(`Error creating project: ${error.message}`);
      }
    }
  });
  
  // A2A task creation mutation
  const a2aCreateTaskMutation = api.a2a.createTask.useMutation({
    onSuccess: (data) => {
      setIsCreating(false);
      if (onTaskCreated) {
        onTaskCreated(data.id);
      }
    },
    onError: (error) => {
      setIsCreating(false);
      if (onTaskCreationError) {
        onTaskCreationError(`Error creating A2A task: ${error.message}`);
      }
    }
  });
  
  // Function to create a component task
  const createComponentTask = (projectId: string) => {
    // Create message part
    const textMessage = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      parts: [{ type: 'text' as const, text: componentParams.description }]
    };
    
    // Create animation design brief
    const adb = {
      sceneName: componentParams.sceneName,
      description: componentParams.description,
      duration: componentParams.duration * 30, // Convert seconds to frames (30fps)
      dimensions: { width: 1920, height: 1080 },
      elements: []
    };
    
    // Create A2A task input
    const taskInput = {
      model: 'o4-mini',
      prompt: componentParams.description,
      params: {
        projectId,
        message: textMessage,
        targetAgent: "BuilderAgent", // Direct to BuilderAgent for component tasks
        effect: componentParams.sceneName,
        animationDesignBrief: adb
      }
    };
    
    // Create the A2A task
    a2aCreateTaskMutation.mutate(taskInput);
  };
  
  // Function to create a video task
  const createVideoTask = (projectId: string) => {
    // Create message part
    const textMessage = {
      id: uuidv4(),
      createdAt: new Date().toISOString(),
      parts: [{ type: 'text' as const, text: videoParams.prompt }]
    };
    
    // For video tasks, include a minimal animationDesignBrief to satisfy API validation
    // The actual detailed ADB will be created by the scene planner and ADB agent
    const videoAdb = {
      sceneName: "VideoGenerationRequest",
      description: videoParams.prompt,
      duration: 240, // Default to 8 seconds (240 frames) for video requests
      dimensions: { width: 1920, height: 1080 }
    };
    
    // Create A2A task input for video generation
    const taskInput = {
      model: 'o4-mini',
      prompt: videoParams.prompt,
      params: {
        projectId,
        message: textMessage,
        targetAgent: "CoordinatorAgent", // Send to CoordinatorAgent for video tasks
        effect: videoParams.prompt.substring(0, 40) + "...",
        userId: "test-user-id", // Placeholder user ID for testing
        animationDesignBrief: videoAdb // Add the required animationDesignBrief
      }
    };
    
    // Create the A2A task
    a2aCreateTaskMutation.mutate(taskInput);
  };
  
  // Handle form submission
  const handleSubmit = () => {
    setIsCreating(true);
    
    // First create a new project, then create A2A task with the project ID
    projectCreateMutation.mutate();
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Create A2A Task</CardTitle>
        <CardDescription>Create a new task to test the A2A system</CardDescription>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2 mb-4 px-6">
          <TabsTrigger value="component">Component Task</TabsTrigger>
          <TabsTrigger value="video">Video Task</TabsTrigger>
        </TabsList>
        
        <CardContent className="space-y-4">
          <TabsContent value="component">
            <div className="space-y-4">
              <div>
                <Label htmlFor="sceneName">Scene Name</Label>
                <input
                  id="sceneName"
                  className="w-full p-2 border rounded mt-1"
                  value={componentParams.sceneName}
                  onChange={(e) => setComponentParams(prev => ({ ...prev, sceneName: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  className="w-full p-2 border rounded mt-1 min-h-[100px]"
                  value={componentParams.description}
                  onChange={(e) => setComponentParams(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="duration">Duration (seconds)</Label>
                <div className="flex items-center">
                  <input
                    id="duration"
                    type="number"
                    min="1"
                    max="30"
                    className="w-24 p-2 border rounded mt-1"
                    value={componentParams.duration}
                    onChange={(e) => setComponentParams(prev => ({ ...prev, duration: parseInt(e.target.value) || 5 }))}
                  />
                  <span className="ml-2">seconds</span>
                </div>
              </div>
            </div>
          </TabsContent>
          
          <TabsContent value="video">
            <div className="space-y-4">
              <div>
                <Label htmlFor="prompt">Video Prompt</Label>
                <Textarea
                  id="prompt"
                  className="w-full p-2 border rounded mt-1 min-h-[150px]"
                  value={videoParams.prompt}
                  onChange={(e) => setVideoParams(prev => ({ ...prev, prompt: e.target.value }))}
                  placeholder="Describe the video you want to create..."
                />
              </div>
              
              <div className="text-sm text-gray-500 italic">
                <p>This will create a complete video by:</p>
                <ol className="list-decimal list-inside pl-2 space-y-1">
                  <li>Creating a scene plan with ScenePlannerAgent</li>
                  <li>Generating animation design briefs with ADBAgent</li>
                  <li>Building components with BuilderAgent</li>
                  <li>Storing and composing the final video</li>
                </ol>
              </div>
            </div>
          </TabsContent>
        </CardContent>
      </Tabs>
      
      <CardFooter>
        <Button 
          className="w-full" 
          onClick={handleSubmit}
          disabled={isCreating || (activeTab === "component" ? !componentParams.sceneName || !componentParams.description : !videoParams.prompt)}
        >
          {isCreating ? "Creating..." : `Create ${activeTab === "component" ? "Component" : "Video"} Task`}
        </Button>
      </CardFooter>
    </Card>
  );
} 