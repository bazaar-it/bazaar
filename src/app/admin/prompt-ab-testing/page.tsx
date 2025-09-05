"use client";

import { useState } from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Checkbox } from "~/components/ui/checkbox";
import { Label } from "~/components/ui/label";
import { Loader2, Play, Code, Clock, Zap } from "lucide-react";
import ABTestResult from "~/components/admin/ABTestResult";
import { toast } from "sonner";

type PromptVersion = "original" | "v2" | "v3-taste" | "v4-balanced";

interface TestResult {
  version: PromptVersion;
  code: string;
  duration: number;
  name: string;
  generationTime: number;
  tokenUsage?: number;
}

export default function PromptABTestingPage() {
  const [testPrompt, setTestPrompt] = useState("");
  const [selectedVersions, setSelectedVersions] = useState<Set<PromptVersion>>(
    new Set(["original", "v3-taste"])
  );
  const [results, setResults] = useState<TestResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const testPromptsMutation = api.admin.testSystemPrompts.useMutation({
    onSuccess: (data) => {
      setResults(data.results);
      setIsGenerating(false);
      toast.success(`Generated ${data.results.length} variations in ${data.totalTime}ms`);
    },
    onError: (error) => {
      setIsGenerating(false);
      toast.error(`Generation failed: ${error.message}`);
      console.error("Test generation error:", error);
    },
  });

  const handleVersionToggle = (version: PromptVersion) => {
    const newVersions = new Set(selectedVersions);
    if (newVersions.has(version)) {
      newVersions.delete(version);
    } else {
      newVersions.add(version);
    }
    setSelectedVersions(newVersions);
  };

  const handleGenerate = async () => {
    if (!testPrompt.trim()) {
      toast.error("Please enter a test prompt");
      return;
    }
    
    if (selectedVersions.size === 0) {
      toast.error("Please select at least one version to test");
      return;
    }

    setIsGenerating(true);
    setResults([]); // Clear previous results
    
    await testPromptsMutation.mutateAsync({
      prompt: testPrompt,
      versions: Array.from(selectedVersions),
      format: { width: 1920, height: 1080, format: "16:9" }
    });
  };

  const versionDescriptions = {
    original: "Current production prompt",
    v2: "9 few-shot examples",
    "v3-taste": "3 high-taste examples",
    "v4-balanced": "3 balanced examples"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">
            System Prompt A/B Testing
          </h1>
          <p className="text-gray-400">
            Test different system prompts side by side with live preview
          </p>
        </div>

        {/* Control Panel */}
        <Card className="mb-6 bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Test Configuration</CardTitle>
            <CardDescription className="text-gray-400">
              Enter a prompt and select versions to compare
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Test Prompt Input */}
            <div className="space-y-2">
              <Label htmlFor="prompt" className="text-white">Test Prompt</Label>
              <Textarea
                id="prompt"
                placeholder="Create a modern data visualization dashboard with animated charts..."
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                className="min-h-[100px] bg-gray-700 border-gray-600 text-white placeholder:text-gray-400"
              />
            </div>

            {/* Version Selection */}
            <div className="space-y-3">
              <Label className="text-white">Select Versions to Test</Label>
              <div className="grid grid-cols-2 gap-4">
                {(["original", "v2", "v3-taste", "v4-balanced"] as PromptVersion[]).map((version) => (
                  <div key={version} className="flex items-start space-x-3">
                    <Checkbox
                      id={version}
                      checked={selectedVersions.has(version)}
                      onCheckedChange={() => handleVersionToggle(version)}
                      className="mt-1"
                    />
                    <div className="space-y-1">
                      <Label 
                        htmlFor={version} 
                        className="text-white font-medium cursor-pointer"
                      >
                        {version === "v3-taste" ? "V3 (Taste)" : 
                         version === "v4-balanced" ? "V4 (Balanced)" :
                         version.charAt(0).toUpperCase() + version.slice(1)}
                      </Label>
                      <p className="text-sm text-gray-400">
                        {versionDescriptions[version]}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !testPrompt.trim() || selectedVersions.size === 0}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
              size="lg"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating {selectedVersions.size} Variations...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Generate All ({selectedVersions.size} versions)
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results Grid */}
        {results.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">
              Results Comparison
            </h2>
            
            {/* Statistics Summary */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Fastest Generation</p>
                      <p className="text-white text-2xl font-bold">
                        {Math.min(...results.map(r => r.generationTime))}ms
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Average Time</p>
                      <p className="text-white text-2xl font-bold">
                        {Math.round(results.reduce((sum, r) => sum + r.generationTime, 0) / results.length)}ms
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gray-800 border-gray-700">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-gray-400 text-sm">Versions Tested</p>
                      <p className="text-white text-2xl font-bold">
                        {results.length}
                      </p>
                    </div>
                    <Code className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Results Grid */}
            <div className={`grid gap-6 ${
              results.length === 2 ? "grid-cols-2" : 
              results.length === 3 ? "grid-cols-3" :
              "grid-cols-2 lg:grid-cols-4"
            }`}>
              {results.map((result) => (
                <ABTestResult
                  key={result.version}
                  result={result}
                  testPrompt={testPrompt}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!isGenerating && results.length === 0 && (
          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="py-12">
              <div className="text-center">
                <Code className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">
                  No tests yet
                </h3>
                <p className="text-gray-400">
                  Enter a prompt and select versions to start testing
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}