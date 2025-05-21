"use client";
// src/app/projects/[id]/generate/components/GenerationProgress.tsx

import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Progress } from "~/components/ui/progress";
import type { GenerationState } from "../types/storyboard";

interface GenerationProgressProps {
  generationState: GenerationState;
}

export default function GenerationProgress({ generationState }: GenerationProgressProps) {
  const { stage, progress, message, error } = generationState;
  
  // Map stage to a human-readable title and description
  const stageInfo = {
    idle: {
      title: "Ready",
      description: "Waiting for your prompt to start generating video"
    },
    analyzing: {
      title: "Analyzing Prompt",
      description: "Understanding your requirements and planning the video"
    },
    planning: {
      title: "Planning Scenes",
      description: "Designing the scenes and structure of your video"
    },
    styling: {
      title: "Creating Style",
      description: "Developing a consistent visual style for your video"
    },
    assets: {
      title: "Preparing Assets",
      description: "Identifying necessary images, icons, and resources"
    },
    components: {
      title: "Building Components",
      description: "Creating the animated components for each scene"
    },
    rendering: {
      title: "Finalizing",
      description: "Putting everything together for preview"
    },
    complete: {
      title: "Complete!",
      description: "Your video is ready for preview"
    },
    error: {
      title: "Error",
      description: error || "Something went wrong while generating your video"
    }
  };

  const currentInfo = stageInfo[stage];
  
  // Different stages of the generation process
  const stages = [
    { id: "analyzing", label: "Analyze" },
    { id: "planning", label: "Plan" },
    { id: "styling", label: "Style" },
    { id: "assets", label: "Assets" },
    { id: "components", label: "Build" },
    { id: "rendering", label: "Render" },
    { id: "complete", label: "Done" }
  ];
  
  // Find the current stage index
  const currentStageIndex = stages.findIndex(s => s.id === stage);

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Generation Progress</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Stage indicators */}
        <div className="flex justify-between">
          {stages.map((s, index) => {
            // Determine status of this stage
            let status = "pending";
            if (currentStageIndex > index || stage === "complete") {
              status = "complete";
            } else if (currentStageIndex === index) {
              status = "current";
            }
            
            return (
              <div key={s.id} className="flex flex-col items-center">
                <div 
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs
                    ${status === "complete" ? "bg-green-500 text-white" : 
                      status === "current" ? "bg-blue-500 text-white" : 
                      "bg-gray-200 text-gray-500"}`}
                >
                  {status === "complete" ? "✓" : index + 1}
                </div>
                <span className="text-xs mt-1 hidden sm:block">{s.label}</span>
              </div>
            );
          })}
        </div>
        
        {/* Connecting line */}
        <div className="relative h-1 bg-gray-200 rounded-full mt-2">
          <div 
            className="absolute h-1 bg-blue-500 rounded-full"
            style={{ 
              width: `${Math.min(
                ((currentStageIndex / (stages.length - 1)) * 100) + 
                (currentStageIndex < stages.length - 1 ? (progress / 100) * (100 / (stages.length - 1)) : 0), 
                100
              )}%` 
            }}
          />
        </div>
        
        {/* Current stage info */}
        <div className="mt-4">
          <h3 className="font-medium">{currentInfo.title}</h3>
          <p className="text-sm text-gray-500">{message || currentInfo.description}</p>
        </div>
        
        {/* Overall progress */}
        <div className="mt-4">
          <div className="flex justify-between mb-1">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-gray-500">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
} 