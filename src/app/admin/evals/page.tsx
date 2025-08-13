// src/app/admin/evals/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Textarea } from "~/components/ui/textarea";
import { Badge } from "~/components/ui/badge";
import { Clock, Zap, DollarSign, Play, Code, Video, Loader2, AlertCircle } from "lucide-react";
import { api } from "~/trpc/react";
// Keep code display simple for now; syntax highlighter optional later
import { toast } from "sonner";
import { Player } from "@remotion/player";
import * as Remotion from "remotion";
import * as Sucrase from "sucrase";
import { analyzeDuration } from "~/lib/utils/codeDurationExtractor";
// Remotion Player and prism highlighting will be added in Phase 2

interface EvalResult {
  id: string;
  youtubeUrl: string;
  model: string;
  strategy: string;
  prompt: string;
  generatedCode: string;
  timeMs: number;
  tokensUsed?: number;
  cost?: number;
  error?: string;
  createdAt: Date;
}

const MODEL_OPTIONS = [
  { value: "gpt-4o", label: "GPT-4o", provider: "openai", canViewVideo: false },
  { value: "gpt-4o-mini", label: "GPT-4o Mini (default)", provider: "openai", canViewVideo: false },
  { value: "gemini-flash", label: "Gemini Flash 1.5 👁️", provider: "google", canViewVideo: true },
  { value: "gemini-pro", label: "Gemini Pro 1.5 👁️", provider: "google", canViewVideo: true },
  { value: "claude-3-sonnet", label: "Claude 3 Sonnet", provider: "anthropic", canViewVideo: false },
  { value: "claude-3-haiku", label: "Claude 3 Haiku", provider: "anthropic", canViewVideo: false },
];

const STRATEGY_OPTIONS = [
  { value: "direct", label: "Direct (YouTube → Code)", description: "Single model watches video and generates code directly" },
  { value: "two-step-describe", label: "Two-Step (Describe → Code)", description: "Model 1 describes video, Model 2 generates code" },
  { value: "multi-agent", label: "Multi-Agent", description: "Multiple models collaborate on different aspects" },
  { value: "iterative", label: "Iterative Refinement", description: "Generate, evaluate, and refine in loops" },
];

const DEFAULT_PROMPTS = {
  direct: `Watch this YouTube video and generate Remotion code that recreates its key animations and visual elements. Focus on motion, timing, and visual hierarchy.`,
  "two-step-describe": {
    describe: `Analyze this YouTube video and provide a detailed description of its visual elements, animations, timing, and overall structure.`,
    generate: `Based on the following video description, generate Remotion code that recreates these visual elements and animations:`,
  },
  "multi-agent": `You are part of a team analyzing this video. Focus on your specialty and provide insights for code generation.`,
  iterative: `Generate Remotion code for this video. We will refine it based on comparison with the original.`,
};

export default function EvalsPage() {
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [selectedModel, setSelectedModel] = useState("gpt-4o-mini");
  const [selectedStrategy, setSelectedStrategy] = useState("direct");
  const [customPrompt, setCustomPrompt] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [currentResult, setCurrentResult] = useState<EvalResult | null>(null);
  const [comparisonResults, setComparisonResults] = useState<EvalResult[]>([]);
  const [activeTab, setActiveTab] = useState("setup");

  const runEvaluation = api.evals.runYoutubeEval.useMutation({
    onSuccess: (result) => {
      setCurrentResult(result as any);
      setActiveTab("results");
      toast.success("Evaluation completed successfully");
    },
    onError: (error) => {
      toast.error(`Evaluation failed: ${error.message}`);
    },
  });

  const handleRunEval = async () => {
    if (!youtubeUrl) {
      toast.error("Please enter a YouTube URL");
      return;
    }

    setIsRunning(true);
    try {
      // Get the default prompt - handle two-step-describe specially
      let promptToUse = customPrompt;
      if (!promptToUse) {
        const defaultPrompt = DEFAULT_PROMPTS[selectedStrategy as keyof typeof DEFAULT_PROMPTS];
        // For two-step-describe, convert the object to a string
        if (selectedStrategy === "two-step-describe" && typeof defaultPrompt === "object") {
          promptToUse = `${(defaultPrompt as any).describe}\n\n${(defaultPrompt as any).generate}`;
        } else {
          promptToUse = defaultPrompt as string;
        }
      }
      
      await runEvaluation.mutateAsync({
        youtubeUrl,
        model: selectedModel,
        strategy: selectedStrategy,
        prompt: promptToUse,
      });
    } finally {
      setIsRunning(false);
    }
  };

  const handleAddToComparison = () => {
    if (currentResult && !comparisonResults.find(r => r.id === currentResult.id)) {
      setComparisonResults([...comparisonResults, currentResult]);
      toast.success("Added to comparison");
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(2)}s`;
  };

  const formatCost = (cost?: number) => {
    if (!cost) return "N/A";
    return `$${cost.toFixed(4)}`;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">YouTube → Code Evaluation Suite</h1>
        <p className="text-muted-foreground">
          Test different models and strategies for converting YouTube videos to Remotion code
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="setup">Setup</TabsTrigger>
          <TabsTrigger value="results">Results</TabsTrigger>
          <TabsTrigger value="comparison">Comparison</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="setup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Configuration</CardTitle>
              <CardDescription>Set up your evaluation parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="youtube-url">YouTube URL</Label>
                <Input
                  id="youtube-url"
                  type="url"
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Model</Label>
                  <p className="text-xs text-muted-foreground mb-1">
                    👁️ = Can view YouTube videos directly
                  </p>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger id="model">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {MODEL_OPTIONS.map((model) => (
                        <SelectItem key={model.value} value={model.value}>
                          <div className="flex items-center gap-2">
                            <span>{model.label}</span>
                            <Badge variant="outline" className="text-xs">
                              {model.provider}
                            </Badge>
                            {!model.canViewVideo && (
                              <Badge variant="secondary" className="text-xs">
                                Text only
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="strategy">Strategy</Label>
                  <Select value={selectedStrategy} onValueChange={setSelectedStrategy}>
                    <SelectTrigger id="strategy">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STRATEGY_OPTIONS.map((strategy) => (
                        <SelectItem key={strategy.value} value={strategy.value}>
                          <div>
                            <div className="font-medium">{strategy.label}</div>
                            <div className="text-xs text-muted-foreground">
                              {strategy.description}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="prompt">Custom Prompt (Optional)</Label>
                <Textarea
                  id="prompt"
                  rows={4}
                  placeholder="Leave empty to use default prompt for selected strategy"
                  value={customPrompt}
                  onChange={(e) => setCustomPrompt(e.target.value)}
                />
              </div>

              <Button 
                onClick={handleRunEval} 
                disabled={isRunning}
                className="w-full"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Running Evaluation...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Run Evaluation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="results" className="space-y-6">
          {currentResult ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Evaluation Metrics</CardTitle>
                  <div className="flex gap-4 mt-2">
                    <Badge variant="outline" className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatTime(currentResult.timeMs)}
                    </Badge>
                    {currentResult.tokensUsed && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Zap className="h-3 w-3" />
                        {currentResult.tokensUsed} tokens
                      </Badge>
                    )}
                    <Badge variant="outline" className="flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      {formatCost(currentResult.cost)}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Model:</span>
                      <span className="ml-2 font-medium">{currentResult.model}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Strategy:</span>
                      <span className="ml-2 font-medium">{currentResult.strategy}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-muted-foreground">YouTube URL:</span>
                      <a 
                        href={currentResult.youtubeUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="ml-2 text-blue-500 hover:underline"
                      >
                        {currentResult.youtubeUrl}
                      </a>
                    </div>
                  </div>
                  <Button onClick={handleAddToComparison} variant="outline" className="w-full">
                    Add to Comparison
                  </Button>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      Generated Code
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-slate-900 text-slate-100 rounded-lg p-4 overflow-x-auto max-h-[600px] overflow-y-auto">
                      <pre className="text-sm whitespace-pre-wrap">
                        <code>
                          {currentResult.generatedCode}
                        </code>
                      </pre>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Video className="h-4 w-4" />
                      Video Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RemotionPreviewArea code={currentResult.generatedCode} />
                  </CardContent>
                </Card>
              </div>
            </>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No evaluation results yet. Run an evaluation from the Setup tab.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          {comparisonResults.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2">Model</th>
                    <th className="text-left p-2">Strategy</th>
                    <th className="text-left p-2">Time</th>
                    <th className="text-left p-2">Tokens</th>
                    <th className="text-left p-2">Cost</th>
                    <th className="text-left p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonResults.map((result) => (
                    <tr key={result.id} className="border-b">
                      <td className="p-2">{result.model}</td>
                      <td className="p-2">{result.strategy}</td>
                      <td className="p-2">{formatTime(result.timeMs)}</td>
                      <td className="p-2">{result.tokensUsed || "N/A"}</td>
                      <td className="p-2">{formatCost(result.cost)}</td>
                      <td className="p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentResult(result)}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <p>No results added to comparison yet.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history">
          <HistorySection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HistorySection() {
  const [offset, setOffset] = useState(0);
  const limit = 20;
  const { data, isLoading, refetch, isFetching } = api.evals.getEvalHistory.useQuery({ limit, offset });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Evaluation History</CardTitle>
        <CardDescription>View your recent evaluations</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-8 text-center text-muted-foreground">Loading...</div>
        ) : !data || data.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No evaluations yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">When</th>
                  <th className="text-left p-2">Model</th>
                  <th className="text-left p-2">Strategy</th>
                  <th className="text-left p-2">Time</th>
                  <th className="text-left p-2">Tokens</th>
                  <th className="text-left p-2">Cost</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id} className="border-b">
                    <td className="p-2 text-sm text-muted-foreground">{new Date(row.createdAt).toLocaleString()}</td>
                    <td className="p-2">{row.model}</td>
                    <td className="p-2">{row.strategy}</td>
                    <td className="p-2">{(row.timeMs / 1000).toFixed(2)}s</td>
                    <td className="p-2">{row.tokensUsed ?? "N/A"}</td>
                    <td className="p-2">{row.cost ? `$${row.cost.toFixed(4)}` : "N/A"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between mt-4">
              <Button variant="outline" disabled={offset === 0 || isFetching} onClick={() => setOffset(Math.max(0, offset - limit))}>Previous</Button>
              <Button variant="outline" disabled={(data?.length ?? 0) < limit || isFetching} onClick={() => setOffset(offset + limit)}>Next</Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function RemotionPreviewArea({ code }: { code: string }) {
  const [error, setError] = useState<string | null>(null);
  
  // Naive TSX to JS transform to eval the component for previewing
  const compiled = useMemo(() => {
    try {
      setError(null);
      const transformed = Sucrase.transform(code, { transforms: ["typescript", "jsx"] });
      return transformed.code;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Transform error';
      setError(`Transform error: ${errorMsg}`);
      return null;
    }
  }, [code]);

  const duration = useMemo(() => analyzeDuration(code), [code]);

  const LazyComponent = useMemo(() => {
    if (!compiled) return null;
    try {
      setError(null);
      const exports: Record<string, any> = {};
      const requireShim = (name: string) => {
        if (name === "react") return React;
        if (name === "remotion") return Remotion;
        return {};
      };
      // eslint-disable-next-line no-new-func
      const fn = new Function("exports", "require", compiled);
      fn(exports, requireShim);
      const DefaultExport = exports.default || exports.RemotionComponent || Object.values(exports)[0];
      if (!DefaultExport) {
        setError('No default export found in component');
        return null;
      }
      return React.lazy(async () => ({ default: DefaultExport }));
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Runtime error';
      setError(`Runtime error: ${errorMsg}`);
      return null;
    }
  }, [compiled]);

  if (!LazyComponent) {
    return (
      <div className="aspect-video bg-slate-900 flex flex-col items-center justify-center text-slate-500 rounded p-4">
        <Video className="h-12 w-12 opacity-50 mb-2" />
        <p className="text-center">Could not compile preview</p>
        {error && (
          <p className="text-xs text-red-400 mt-2 text-center max-w-md">
            {error}
          </p>
        )}
        <details className="mt-2 max-w-md">
          <summary className="text-xs cursor-pointer">View code</summary>
          <pre className="text-xs mt-2 bg-slate-800 p-2 rounded max-h-32 overflow-auto">
            {code.substring(0, 500)}...
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="aspect-video rounded overflow-hidden bg-black">
        <Player
          lazyComponent={LazyComponent}
          durationInFrames={duration.frames || 180}
          compositionWidth={1920}
          compositionHeight={1080}
          fps={30}
          controls
          clickToPlay
          loop
          style={{ width: "100%", height: "100%" }}
          acknowledgeRemotionLicense
        />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">Estimated duration: {duration.seconds.toFixed(1)}s ({duration.frames} frames, {duration.confidence} confidence)</div>
    </div>
  );
}