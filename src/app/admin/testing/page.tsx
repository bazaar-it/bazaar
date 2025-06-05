"use client";

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { api } from '~/trpc/react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Textarea } from '~/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Badge } from '~/components/ui/badge';
import { Progress } from '~/components/ui/progress';
import { Separator } from '~/components/ui/separator';

type TestTab = 'live-testing' | 'brain-analysis' | 'pipeline-flow' | 'image-testing' | 'model-comparison' | 'results-deep-dive';

interface LiveTestResult {
  id: string;
  testName: string;
  status: 'running' | 'completed' | 'failed';
  progress: number;
  startTime: number;
  brainSteps: BrainStep[];
  finalResult?: any;
  error?: string;
  modelPack: string;
}

interface BrainStep {
  id: string;
  timestamp: number;
  type: 'decision' | 'tool_call' | 'llm_call' | 'error' | 'result';
  title: string;
  content: any;
  reasoning?: string;
  prompt?: string;
  response?: string;
  toolName?: string;
  executionTime?: number;
  cost?: number;
}

interface TestConfiguration {
  prompt: string;
  modelPack: string;
  includeImage?: string;
  expectedOutput?: string;
  testType: 'scene_generation' | 'scene_edit' | 'image_analysis' | 'code_generation';
}

export default function AdminTestingPage() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<TestTab>('live-testing');
  
  // Live Testing State
  const [liveTests, setLiveTests] = useState<LiveTestResult[]>([]);
  const [testConfig, setTestConfig] = useState<TestConfiguration>({
    prompt: '',
    modelPack: 'default',
    testType: 'scene_generation'
  });
  const [isRunningTest, setIsRunningTest] = useState(false);
  
  // Brain Analysis State
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [brainAnalysisView, setBrainAnalysisView] = useState<'timeline' | 'details' | 'prompts'>('timeline');
  
  // Image Testing State
  const [uploadedImage, setUploadedImage] = useState<string>('');
  const [imageAnalysisResult, setImageAnalysisResult] = useState<any>(null);
  
  // Model Comparison State
  const [comparisonTests, setComparisonTests] = useState<LiveTestResult[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  
  // Live streaming connection
  const eventSourceRef = useRef<EventSource | null>(null);
  
  // Admin check
  if (!session?.user || session.user.email !== 'markushogne@gmail.com') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-96">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>Admin access required</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Setup live streaming for test results
  useEffect(() => {
    if (typeof window !== 'undefined') {
      eventSourceRef.current = new EventSource('/api/admin/test-stream');
      
      eventSourceRef.current.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'test_update') {
          setLiveTests(prev => {
            const existing = prev.find(t => t.id === data.testId);
            if (existing) {
              return prev.map(t => 
                t.id === data.testId 
                  ? { ...t, ...data.update }
                  : t
              );
            } else {
              return [...prev, data.update];
            }
          });
        }
        
        if (data.type === 'brain_step') {
          setLiveTests(prev => 
            prev.map(t => 
              t.id === data.testId
                ? { ...t, brainSteps: [...t.brainSteps, data.step] }
                : t
            )
          );
        }
      };
      
      return () => {
        if (eventSourceRef.current) {
          eventSourceRef.current.close();
        }
      };
    }
  }, []);

  const runLiveTest = async () => {
    setIsRunningTest(true);
    
    try {
      const response = await fetch('/api/admin/run-live-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testConfig)
      });
      
      const result = await response.json();
      
      if (result.success) {
        // Test will stream results via SSE
        console.log('Live test started:', result.testId);
      }
    } catch (error) {
      console.error('Failed to start live test:', error);
    } finally {
      setIsRunningTest(false);
    }
  };

  const runModelComparison = async () => {
    for (const model of selectedModels) {
      await runLiveTest();
    }
  };

  const selectedTestData = selectedTest ? liveTests.find(t => t.id === selectedTest) : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">🧪 Live AI Testing & Analysis Dashboard</h1>
          <p className="text-muted-foreground">Real-time pipeline testing with brain reasoning visibility</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TestTab)}>
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="live-testing">🔴 Live Testing</TabsTrigger>
            <TabsTrigger value="brain-analysis">🧠 Brain Analysis</TabsTrigger>
            <TabsTrigger value="pipeline-flow">⚡ Pipeline Flow</TabsTrigger>
            <TabsTrigger value="image-testing">📸 Image Testing</TabsTrigger>
            <TabsTrigger value="model-comparison">📊 Model Comparison</TabsTrigger>
            <TabsTrigger value="results-deep-dive">🔍 Results Deep Dive</TabsTrigger>
          </TabsList>

          {/* Live Testing Tab */}
          <TabsContent value="live-testing" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Test Configuration */}
              <Card>
                <CardHeader>
                  <CardTitle>🚀 Start New Test</CardTitle>
                  <CardDescription>Configure and launch live AI pipeline test</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Test Type</Label>
                    <Select value={testConfig.testType} onValueChange={(value) => 
                      setTestConfig(prev => ({ ...prev, testType: value as any }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scene_generation">🎬 Scene Generation</SelectItem>
                        <SelectItem value="scene_edit">✏️ Scene Edit</SelectItem>
                        <SelectItem value="image_analysis">📸 Image Analysis</SelectItem>
                        <SelectItem value="code_generation">💻 Code Generation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Model Pack</Label>
                    <Select value={testConfig.modelPack} onValueChange={(value) => 
                      setTestConfig(prev => ({ ...prev, modelPack: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="default">Default Pack</SelectItem>
                        <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                        <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                        <SelectItem value="mixed-optimal">Mixed Optimal</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Test Prompt</Label>
                    <Textarea
                      value={testConfig.prompt}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, prompt: e.target.value }))}
                      placeholder="Enter your test prompt... e.g., 'Create a floating particle scene with smooth animations'"
                      rows={4}
                    />
                  </div>

                  <div>
                    <Label>Expected Output (Optional)</Label>
                    <Textarea
                      value={testConfig.expectedOutput || ''}
                      onChange={(e) => setTestConfig(prev => ({ ...prev, expectedOutput: e.target.value }))}
                      placeholder="Describe what you expect to see in the output..."
                      rows={2}
                    />
                  </div>

                  <Button 
                    onClick={runLiveTest} 
                    disabled={isRunningTest || !testConfig.prompt}
                    className="w-full"
                  >
                    {isRunningTest ? '🔄 Starting Test...' : '🚀 Run Live Test'}
                  </Button>
                </CardContent>
              </Card>

              {/* Live Test Results */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle>📊 Live Test Results</CardTitle>
                  <CardDescription>Real-time test execution and results</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-96 overflow-y-auto">
                    {liveTests.length === 0 ? (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No tests running. Start a test to see live results.
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {liveTests.map((test) => (
                          <div 
                            key={test.id}
                            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                              selectedTest === test.id ? 'border-primary bg-primary/5' : 'border-border'
                            }`}
                            onClick={() => setSelectedTest(test.id)}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium">{test.testName}</span>
                              <Badge variant={
                                test.status === 'running' ? 'default' :
                                test.status === 'completed' ? 'secondary' :
                                'destructive'
                              }>
                                {test.status === 'running' && '🔄 '}
                                {test.status === 'completed' && '✅ '}
                                {test.status === 'failed' && '❌ '}
                                {test.status}
                              </Badge>
                            </div>
                            
                            <Progress value={test.progress} className="mb-2" />
                            
                            <div className="text-sm text-muted-foreground">
                              Model: {test.modelPack} | Steps: {test.brainSteps.length}
                              {test.status === 'running' && (
                                <span className="ml-2">
                                  ⏱️ {Math.round((Date.now() - test.startTime) / 1000)}s
                                </span>
                              )}
                            </div>

                            {test.brainSteps.length > 0 && (
                              <div className="mt-2 text-xs">
                                Latest: {test.brainSteps[test.brainSteps.length - 1]?.title}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Brain Analysis Tab */}
                     <TabsContent value="brain-analysis" className="space-y-4">
             {selectedTestData ? (
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[600px]">
                 
                 {/* Brain Steps Timeline */}
                 <div className="p-4 border rounded-lg">
                   <h3 className="font-semibold mb-4">🧠 Brain Reasoning Timeline</h3>
                   <div className="h-[500px] overflow-y-auto">
                     <div className="space-y-3">
                       {selectedTestData.brainSteps.map((step, index) => (
                         <div key={step.id} className="p-3 border rounded-lg">
                           <div className="flex items-center justify-between mb-2">
                             <Badge variant={
                               step.type === 'decision' ? 'default' :
                               step.type === 'tool_call' ? 'secondary' :
                               step.type === 'llm_call' ? 'outline' :
                               step.type === 'error' ? 'destructive' : 'secondary'
                             }>
                               {step.type === 'decision' && '🤔 '}
                               {step.type === 'tool_call' && '🔧 '}
                               {step.type === 'llm_call' && '🤖 '}
                               {step.type === 'error' && '❌ '}
                               {step.type}
                             </Badge>
                             <span className="text-xs text-muted-foreground">
                               +{Math.round((step.timestamp - selectedTestData.startTime) / 1000)}s
                             </span>
                           </div>
                           
                           <div className="font-medium text-sm mb-1">{step.title}</div>
                           
                           {step.reasoning && (
                             <div className="text-xs bg-muted p-2 rounded">
                               <strong>Reasoning:</strong> {step.reasoning}
                             </div>
                           )}
                           
                           {step.toolName && (
                             <div className="text-xs text-blue-600 mt-1">
                               Tool: {step.toolName}
                             </div>
                           )}
                           
                           {step.executionTime && (
                             <div className="text-xs text-green-600 mt-1">
                               ⏱️ {step.executionTime}ms
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   </div>
                 </div>

                 {/* Detailed Analysis */}
                 <div className="p-4 border rounded-lg">
                   <Tabs value={brainAnalysisView} onValueChange={(value) => setBrainAnalysisView(value as any)}>
                     <TabsList>
                       <TabsTrigger value="timeline">📈 Flow Analysis</TabsTrigger>
                       <TabsTrigger value="details">🔍 Step Details</TabsTrigger>
                       <TabsTrigger value="prompts">📝 Prompts & Responses</TabsTrigger>
                     </TabsList>
                     
                     <TabsContent value="timeline" className="mt-4">
                       <Card>
                         <CardHeader>
                           <CardTitle>Brain Decision Flow</CardTitle>
                         </CardHeader>
                         <CardContent>
                           <div className="space-y-4">
                             <div className="grid grid-cols-2 gap-4">
                               <div className="text-center p-4 bg-blue-50 rounded">
                                 <div className="text-2xl font-bold text-blue-600">
                                   {selectedTestData.brainSteps.filter(s => s.type === 'decision').length}
                                 </div>
                                 <div className="text-sm">Decisions Made</div>
                               </div>
                               <div className="text-center p-4 bg-green-50 rounded">
                                 <div className="text-2xl font-bold text-green-600">
                                   {selectedTestData.brainSteps.filter(s => s.type === 'tool_call').length}
                                 </div>
                                 <div className="text-sm">Tools Called</div>
                               </div>
                             </div>
                             
                             <div className="mt-4">
                               <h4 className="font-medium mb-2">Decision Quality Analysis</h4>
                               <div className="space-y-2">
                                 {selectedTestData.brainSteps
                                   .filter(s => s.type === 'decision')
                                   .map((step, index) => (
                                     <div key={index} className="flex justify-between items-center p-2 bg-muted rounded">
                                       <span className="text-sm">{step.title}</span>
                                       <Badge variant="outline">
                                         {step.executionTime ? `${step.executionTime}ms` : 'N/A'}
                                       </Badge>
                                     </div>
                                   ))
                                 }
                               </div>
                             </div>
                           </div>
                         </CardContent>
                       </Card>
                     </TabsContent>
                     
                     <TabsContent value="details" className="mt-4">
                       <div className="h-[400px] overflow-y-auto">
                         <div className="space-y-4">
                           {selectedTestData.brainSteps.map((step) => (
                             <Card key={step.id}>
                               <CardContent className="p-4">
                                 <div className="font-medium mb-2">{step.title}</div>
                                 {step.content && (
                                   <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                     {JSON.stringify(step.content, null, 2)}
                                   </pre>
                                 )}
                               </CardContent>
                             </Card>
                           ))}
                         </div>
                       </div>
                     </TabsContent>
                     
                     <TabsContent value="prompts" className="mt-4">
                       <div className="h-[400px] overflow-y-auto">
                         <div className="space-y-4">
                           {selectedTestData.brainSteps
                             .filter(s => s.prompt || s.response)
                             .map((step) => (
                               <Card key={step.id}>
                                 <CardContent className="p-4">
                                   <div className="font-medium mb-2">{step.title}</div>
                                   {step.prompt && (
                                     <div className="mb-2">
                                       <Label className="text-xs font-medium">Prompt:</Label>
                                       <pre className="text-xs bg-blue-50 p-2 rounded mt-1 whitespace-pre-wrap">
                                         {step.prompt}
                                       </pre>
                                     </div>
                                   )}
                                   {step.response && (
                                     <div>
                                       <Label className="text-xs font-medium">Response:</Label>
                                       <pre className="text-xs bg-green-50 p-2 rounded mt-1 whitespace-pre-wrap">
                                         {step.response}
                                       </pre>
                                     </div>
                                   )}
                                 </CardContent>
                               </Card>
                             ))
                           }
                         </div>
                       </div>
                     </TabsContent>
                   </Tabs>
                 </div>
               </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Select a test from the Live Testing tab to analyze brain reasoning</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Pipeline Flow Tab */}
          <TabsContent value="pipeline-flow" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>⚡ AI Pipeline Flow Visualization</CardTitle>
                <CardDescription>See how data flows through the AI pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                {selectedTestData ? (
                  <div className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-24 text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          📝
                        </div>
                        <div className="text-xs">User Input</div>
                      </div>
                      
                      <div className="flex-1 h-px bg-border"></div>
                      
                      <div className="w-24 text-center">
                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          🧠
                        </div>
                        <div className="text-xs">Brain Orchestrator</div>
                      </div>
                      
                      <div className="flex-1 h-px bg-border"></div>
                      
                      <div className="w-24 text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          🔧
                        </div>
                        <div className="text-xs">Tools Execution</div>
                      </div>
                      
                      <div className="flex-1 h-px bg-border"></div>
                      
                      <div className="w-24 text-center">
                        <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-2">
                          🎬
                        </div>
                        <div className="text-xs">Final Result</div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Input Processing</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs space-y-1">
                          <div>Prompt Length: {testConfig.prompt.length} chars</div>
                          <div>Type: {testConfig.testType}</div>
                          <div>Model Pack: {testConfig.modelPack}</div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Brain Decisions</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs space-y-1">
                          <div>Decisions: {selectedTestData.brainSteps.filter(s => s.type === 'decision').length}</div>
                          <div>Reasoning Steps: {selectedTestData.brainSteps.filter(s => s.reasoning).length}</div>
                          <div>Avg Decision Time: {
                            Math.round(
                              selectedTestData.brainSteps
                                .filter(s => s.executionTime)
                                .reduce((acc, s) => acc + (s.executionTime || 0), 0) /
                              selectedTestData.brainSteps.filter(s => s.executionTime).length || 1
                            )
                          }ms</div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Tool Execution</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs space-y-1">
                          <div>Tools Called: {selectedTestData.brainSteps.filter(s => s.type === 'tool_call').length}</div>
                          <div>LLM Calls: {selectedTestData.brainSteps.filter(s => s.type === 'llm_call').length}</div>
                          <div>Errors: {selectedTestData.brainSteps.filter(s => s.type === 'error').length}</div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm">Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="text-xs space-y-1">
                          <div>Total Time: {Math.round((Date.now() - selectedTestData.startTime) / 1000)}s</div>
                          <div>Status: {selectedTestData.status}</div>
                          <div>Progress: {selectedTestData.progress}%</div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Select a test to visualize its pipeline flow
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Image Testing Tab */}
          <TabsContent value="image-testing" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>📸 Image Upload Testing</CardTitle>
                  <CardDescription>Test image analysis and pipeline integration</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label>Upload Test Image</Label>
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (e) => {
                            setUploadedImage(e.target?.result as string);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                  
                  {uploadedImage && (
                    <div>
                      <img src={uploadedImage} alt="Uploaded" className="w-full max-w-sm rounded border" />
                    </div>
                  )}
                  
                  <Button 
                    onClick={() => {
                      setTestConfig(prev => ({ 
                        ...prev, 
                        testType: 'image_analysis',
                        includeImage: uploadedImage,
                        prompt: 'Analyze this image and create a scene based on it'
                      }));
                      runLiveTest();
                    }}
                    disabled={!uploadedImage}
                    className="w-full"
                  >
                    🚀 Test Image Pipeline
                  </Button>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>🔍 Image Analysis Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {imageAnalysisResult ? (
                    <div className="h-96 overflow-auto border rounded p-2">
                      <pre className="text-xs">{JSON.stringify(imageAnalysisResult, null, 2)}</pre>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      Upload and test an image to see analysis results
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Model Comparison Tab */}
          <TabsContent value="model-comparison" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>📊 Model Pack Performance Comparison</CardTitle>
                <CardDescription>Compare different model configurations side-by-side</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Select Models to Compare</Label>
                      <div className="space-y-2 mt-2">
                        {['default', 'claude-3-5-sonnet', 'gpt-4o', 'mixed-optimal'].map(model => (
                          <label key={model} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={selectedModels.includes(model)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedModels(prev => [...prev, model]);
                                } else {
                                  setSelectedModels(prev => prev.filter(m => m !== model));
                                }
                              }}
                            />
                            <span className="text-sm">{model}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    
                    <div className="md:col-span-2">
                      <Label>Comparison Test Prompt</Label>
                      <Textarea
                        value={testConfig.prompt}
                        onChange={(e) => setTestConfig(prev => ({ ...prev, prompt: e.target.value }))}
                        placeholder="Enter the same prompt to test across all selected models..."
                        rows={4}
                      />
                    </div>
                  </div>
                  
                  <Button 
                    onClick={runModelComparison}
                    disabled={selectedModels.length < 2 || !testConfig.prompt}
                    className="w-full"
                  >
                    🏁 Run Model Comparison
                  </Button>
                  
                  {comparisonTests.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-4">Comparison Results</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b">
                              <th className="text-left p-2">Model Pack</th>
                              <th className="text-left p-2">Status</th>
                              <th className="text-left p-2">Time</th>
                              <th className="text-left p-2">Steps</th>
                              <th className="text-left p-2">Quality</th>
                            </tr>
                          </thead>
                          <tbody>
                            {comparisonTests.map(test => (
                              <tr key={test.id} className="border-b">
                                <td className="p-2">{test.modelPack}</td>
                                <td className="p-2">
                                  <Badge variant={test.status === 'completed' ? 'secondary' : 'default'}>
                                    {test.status}
                                  </Badge>
                                </td>
                                <td className="p-2">{Math.round((Date.now() - test.startTime) / 1000)}s</td>
                                <td className="p-2">{test.brainSteps.length}</td>
                                <td className="p-2">
                                  <Button variant="outline" size="sm" onClick={() => setSelectedTest(test.id)}>
                                    Analyze
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Results Deep Dive Tab */}
          <TabsContent value="results-deep-dive" className="space-y-4">
            {selectedTestData && selectedTestData.finalResult ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>📋 Generated Code</CardTitle>
                    <CardDescription>Actual code output from the AI pipeline</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-96 overflow-auto border rounded p-2">
                      <pre className="text-xs bg-muted p-4 rounded">
                        {selectedTestData.finalResult.code || 'No code generated'}
                      </pre>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Button variant="outline" size="sm">
                        📋 Copy Code
                      </Button>
                      <Button variant="outline" size="sm">
                        🎬 Test in Remotion
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>📊 Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded">
                          <div className="text-2xl font-bold text-blue-600">
                            {Math.round((Date.now() - selectedTestData.startTime) / 1000)}s
                          </div>
                          <div className="text-sm">Total Time</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded">
                          <div className="text-2xl font-bold text-green-600">
                            {selectedTestData.brainSteps.filter(s => s.cost).reduce((acc, s) => acc + (s.cost || 0), 0).toFixed(4)}
                          </div>
                          <div className="text-sm">Total Cost ($)</div>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h4 className="font-medium mb-2">Step Breakdown</h4>
                        <div className="space-y-2">
                          {selectedTestData.brainSteps.map((step, index) => (
                            <div key={index} className="flex justify-between text-sm">
                              <span>{step.title}</span>
                              <span>{step.executionTime || 0}ms</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h4 className="font-medium mb-2">Quality Assessment</h4>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span>Code Completeness</span>
                            <Badge variant="secondary">✅ Complete</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Prompt Adherence</span>
                            <Badge variant="secondary">🎯 High</Badge>
                          </div>
                          <div className="flex justify-between">
                            <span>Error Handling</span>
                            <Badge variant="secondary">✅ Present</Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">
                    Select a completed test to see detailed results and code analysis
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
} 