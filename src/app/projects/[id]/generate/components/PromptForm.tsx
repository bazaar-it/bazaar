"use client";
// src/app/projects/[id]/generate/components/PromptForm.tsx

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { Textarea } from "~/components/ui/textarea";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";

interface PromptFormProps {
  projectId: string;
  onSubmit: (prompt: string, additionalInstructions?: string) => void;
  onSubmitSingleScene: (prompt: string) => void;
  isGenerating: boolean;
}

export default function PromptForm({ projectId, onSubmit, onSubmitSingleScene, isGenerating }: PromptFormProps) {
  const [prompt, setPrompt] = useState("");
  const [additionalInstructions, setAdditionalInstructions] = useState("");
  const [mode, setMode] = useState<"basic" | "advanced">("basic");
  const [generationMode, setGenerationMode] = useState<"single" | "multi">("single");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    
    if (generationMode === "single") {
      onSubmitSingleScene(prompt);
    } else {
      onSubmit(prompt, additionalInstructions.trim() || undefined);
    }
  };

  const examplePrompts = [
    "A bubble expanding and exploding with particles",
    "Logo reveal with smooth fade-in animation", 
    "Rotating geometric shapes with color transitions",
    "Text sliding in from the left with bounce effect",
  ];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Video Generation</CardTitle>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Generation Mode</Label>
            <Tabs value={generationMode} onValueChange={(value) => setGenerationMode(value as "single" | "multi")}>
              <TabsList className="w-full">
                <TabsTrigger value="single" className="flex-1">
                  <div className="text-center">
                    <div className="font-medium">Single Scene</div>
                    <div className="text-xs text-muted-foreground">Fast, focused animation</div>
                  </div>
                </TabsTrigger>
                <TabsTrigger value="multi" className="flex-1">
                  <div className="text-center">
                    <div className="font-medium">Multi-Scene Video</div>
                    <div className="text-xs text-muted-foreground">Complete storyboard</div>
                  </div>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          
          <Tabs value={mode} onValueChange={(value) => setMode(value as "basic" | "advanced")}>
            <TabsList className="mb-4 w-full">
              <TabsTrigger value="basic" className="flex-1">Basic</TabsTrigger>
              <TabsTrigger value="advanced" className="flex-1">Advanced</TabsTrigger>
            </TabsList>
            
            <TabsContent value="basic">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="prompt">Describe your video</Label>
                  <Textarea
                    id="prompt"
                    placeholder="Describe what you want in your video..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={4}
                    className="resize-none"
                    required
                  />
                </div>
                
                <div>
                  <p className="text-sm text-gray-500 mb-2">Examples:</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {examplePrompts.map((examplePrompt) => (
                      <Button
                        type="button"
                        key={examplePrompt}
                        variant="outline"
                        size="sm"
                        onClick={() => setPrompt(examplePrompt)}
                        className="h-auto py-2 justify-start text-left font-normal"
                      >
                        {examplePrompt}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="advanced">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="prompt-adv">Main Prompt</Label>
                  <Textarea
                    id="prompt-adv"
                    placeholder="Describe what you want in your video..."
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    rows={3}
                    className="resize-none"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="additional">Additional Instructions</Label>
                  <Textarea
                    id="additional"
                    placeholder="Specify style, pacing, transitions, specific requirements..."
                    value={additionalInstructions}
                    onChange={(e) => setAdditionalInstructions(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
        
        <CardFooter className="flex justify-between">
          <div className="text-sm text-gray-500">
            {!isGenerating && generationMode === "single" && "AI will create one perfect animated scene"}
            {!isGenerating && generationMode === "multi" && "AI will create scenes and components based on your prompt"}
            {isGenerating && "Generating your video..."}
          </div>
          
          <Button 
            type="submit" 
            disabled={!prompt.trim() || isGenerating}
          >
            {isGenerating ? "Generating..." : generationMode === "single" ? "Generate Scene" : "Generate Video"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
} 