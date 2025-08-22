"use client";

import { useState } from "react";
import React from "react";
import { api } from "~/trpc/react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { Badge } from "~/components/ui/badge";
import { Loader2, Globe, Palette, Type, Image, CheckCircle, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

interface ExtractionStep {
  id: string;
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  data?: any;
  startTime?: number;
  endTime?: number;
}

export default function BrandExtractionPage() {
  const [url, setUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [steps, setSteps] = useState<ExtractionStep[]>([
    { id: 'validate', name: 'Validating URL', status: 'pending' },
    { id: 'screenshots', name: 'Capturing Screenshots', status: 'pending' },
    { id: 'brand', name: 'Extracting Brand Data', status: 'pending' },
    { id: 'save', name: 'Saving to Database', status: 'pending' },
    { id: 'generate', name: 'Generating Video', status: 'pending' },
  ]);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Create a project for admin testing
  const createProject = api.project.create.useMutation();
  
  // Use the same generation API as chat panel
  const generateScene = api.generation.generateScene.useMutation({
    onSuccess: (data) => {
      addLog('🎬 Scene generation completed successfully!');
      updateStep('screenshots', 'completed');
      updateStep('brand', 'completed');
      updateStep('save', 'completed');
      updateStep('generate', 'completed', data);
      toast.success("Video generated successfully!");
      
      // Fetch brand profile data after generation
      fetchBrandProfile(currentProjectId);
      setIsExtracting(false);
    },
    onError: (error: any) => {
      addLog(`❌ Error: ${error.message}`);
      updateStep('generate', 'error');
      toast.error("Generation failed: " + error.message);
      setIsExtracting(false);
    },
  });

  const [currentProjectId, setCurrentProjectId] = useState<string>("");

  // Get brand profile after generation - using useQuery instead of useMutation
  const fetchBrandProfile = (projectId: string) => {
    if (projectId) {
      addLog('🔍 Fetching brand profile data...');
      // Trigger the query manually
      getBrandProfileQuery.refetch();
    }
  };

  const getBrandProfileQuery = api.websitePipeline.getBrandProfile.useQuery(
    { projectId: currentProjectId },
    {
      enabled: !!currentProjectId,
    }
  );

  // Handle query state changes separately
  React.useEffect(() => {
    if (getBrandProfileQuery.data) {
      setExtractedData(getBrandProfileQuery.data);
      addLog('✅ Brand profile data retrieved!');
      console.log('🎨 Brand Profile Data:', getBrandProfileQuery.data);
    }
    if (getBrandProfileQuery.error) {
      addLog(`⚠️ Could not retrieve brand profile: ${getBrandProfileQuery.error.message}`);
      console.error('❌ Brand Profile Error:', getBrandProfileQuery.error);
    }
  }, [getBrandProfileQuery.data, getBrandProfileQuery.error]);

  const updateStep = (stepId: string, status: ExtractionStep['status'], data?: any) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { 
            ...step, 
            status, 
            data,
            endTime: status === 'completed' || status === 'error' ? Date.now() : step.endTime 
          }
        : step
    ));
    
    if (status === 'processing') {
      setCurrentStep(stepId);
      setSteps(prev => prev.map(step => 
        step.id === stepId ? { ...step, startTime: Date.now() } : step
      ));
    }
  };

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };


  const handleExtraction = async () => {
    if (!url) {
      toast.error("Please enter a URL");
      return;
    }

    // Reset state
    setIsExtracting(true);
    setExtractedData(null);
    setLogs([]);
    setSteps(steps.map(s => ({ ...s, status: 'pending', data: null })));
    
    addLog(`🚀 Starting generation for: ${url}`);
    addLog('🔄 This will work exactly like typing the URL in chat...');
    
    // Simulate step progression based on chat flow
    updateStep('validate', 'processing');
    addLog('🔍 Brain orchestrator analyzing input...');
    
    try {
      // Create a project first
      addLog('📁 Creating test project...');
      const project = await createProject.mutateAsync({});
      
      addLog(`✅ Project created: ${project.projectId}`);
      setCurrentProjectId(project.projectId);
      
      updateStep('validate', 'completed');
      updateStep('screenshots', 'processing');
      addLog('🧠 Triggering brain orchestrator...');

      // Trigger the same generation API that chat uses
      generateScene.mutate({
        projectId: project.projectId,
        userMessage: url,  // Just the URL, exactly like chat
      });
      
    } catch (error) {
      addLog(`❌ Error creating project: ${error}`);
      toast.error("Failed to create project");
      setIsExtracting(false);
    }
  };

  // No need for separate video generation - it happens automatically in generateScene

  const getStepIcon = (step: ExtractionStep) => {
    if (step.status === 'completed') return <CheckCircle className="w-5 h-5 text-green-500" />;
    if (step.status === 'error') return <AlertCircle className="w-5 h-5 text-red-500" />;
    if (step.status === 'processing') return <Loader2 className="w-5 h-5 animate-spin" />;
    return <div className="w-5 h-5 rounded-full border-2 border-gray-300" />;
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Brand Extraction Pipeline</h1>
        <p className="text-gray-600">Extract brand data and generate videos from any website</p>
      </div>

      {/* URL Input Section */}
      <Card className="p-6 mb-6">
        <div className="flex gap-4">
          <div className="flex-1">
            <Input
              type="url"
              placeholder="Enter website URL (e.g., https://stripe.com)"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              disabled={isExtracting}
              className="text-lg"
            />
          </div>
          <Button 
            onClick={handleExtraction}
            disabled={isExtracting || !url}
            size="lg"
            className="px-8"
          >
            {isExtracting ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Globe className="mr-2 h-5 w-5" />
                Extract Brand
              </>
            )}
          </Button>
        </div>
      </Card>

      {/* Progress Steps */}
      <Card className="p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Extraction Progress</h2>
        <div className="space-y-3">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center gap-4">
              {getStepIcon(step)}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className={`font-medium ${
                    step.status === 'processing' ? 'text-blue-600' :
                    step.status === 'completed' ? 'text-green-600' :
                    step.status === 'error' ? 'text-red-600' :
                    'text-gray-500'
                  }`}>
                    {step.name}
                  </span>
                  {step.startTime && step.endTime && (
                    <Badge variant="secondary" className="text-xs">
                      {((step.endTime - step.startTime) / 1000).toFixed(1)}s
                    </Badge>
                  )}
                </div>
                {step.status === 'processing' && (
                  <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 animate-pulse" style={{ width: '60%' }} />
                  </div>
                )}
              </div>
              {index < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-gray-400" />
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Results Section */}
      {extractedData && (
        <Tabs defaultValue="screenshots" className="mb-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="typography">Typography</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="raw">Raw Data</TabsTrigger>
          </TabsList>

          <TabsContent value="screenshots" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Image className="w-5 h-5" />
                Captured Screenshots ({extractedData.screenshots?.length || 0})
              </h3>
              {extractedData.screenshots?.length > 0 ? (
                <div className="grid grid-cols-3 gap-4">
                  {extractedData.screenshots.map((screenshot: any, index: number) => (
                    <div key={index} className="space-y-2">
                      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={screenshot.url} 
                          alt={screenshot.viewport || `Screenshot ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23ccc"><text x="50%" y="50%" text-anchor="middle" dy=".3em">Image not found</text></svg>';
                          }}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <Badge>{screenshot.viewport || screenshot.type || 'Screenshot'}</Badge>
                        <span className="text-gray-500">{screenshot.position || screenshot.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No screenshots captured yet
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="colors" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Brand Colors
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Primary Colors</label>
                  <div className="flex gap-3 mt-2">
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-12 h-12 rounded-lg border"
                        style={{ backgroundColor: extractedData.colors?.primary || '#000' }}
                      />
                      <div>
                        <div className="text-sm font-mono">{extractedData.colors?.primary}</div>
                        <div className="text-xs text-gray-500">Primary</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-12 h-12 rounded-lg border"
                        style={{ backgroundColor: extractedData.colors?.secondary || '#fff' }}
                      />
                      <div>
                        <div className="text-sm font-mono">{extractedData.colors?.secondary}</div>
                        <div className="text-xs text-gray-500">Secondary</div>
                      </div>
                    </div>
                  </div>
                </div>
                
                {extractedData.colors?.accents?.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Accent Colors</label>
                    <div className="flex gap-2 mt-2">
                      {extractedData.colors.accents.map((color: string, i: number) => (
                        <div key={i} className="flex items-center gap-2">
                          <div 
                            className="w-10 h-10 rounded border"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs font-mono">{color}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="typography" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Type className="w-5 h-5" />
                Typography
              </h3>
              <div className="space-y-4">
                {extractedData.typography?.fonts?.map((font: any, index: number) => (
                  <div key={index} className="border-b pb-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium" style={{ fontFamily: font.family }}>
                        {font.family}
                      </span>
                      <div className="flex gap-2">
                        {font.weights?.map((weight: number) => (
                          <Badge key={weight} variant="outline">{weight}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
                
                <div>
                  <label className="text-sm font-medium text-gray-600">Font Scales</label>
                  <div className="grid grid-cols-4 gap-3 mt-2">
                    {Object.entries(extractedData.typography?.scale || {}).map(([key, value]: [string, any]) => (
                      <div key={key}>
                        <div className="text-2xl font-bold" style={{ fontSize: value.size }}>
                          Aa
                        </div>
                        <div className="text-xs text-gray-500">{key}: {value.size}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="content" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Extracted Content</h3>
              <div className="space-y-4">
                {extractedData.copyVoice && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Brand Voice</label>
                    <div className="mt-2">
                      <Badge>{extractedData.copyVoice.tone}</Badge>
                      <Badge className="ml-2">{extractedData.copyVoice.style}</Badge>
                    </div>
                    {extractedData.copyVoice.headlines?.length > 0 && (
                      <div className="mt-3">
                        <div className="text-sm text-gray-600 mb-1">Headlines</div>
                        {extractedData.copyVoice.headlines.map((headline: string, i: number) => (
                          <div key={i} className="text-sm bg-gray-50 p-2 rounded mt-1">
                            {headline}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                
                {extractedData.productNarrative && (
                  <div>
                    <label className="text-sm font-medium text-gray-600">Product Info</label>
                    <div className="mt-2 space-y-2">
                      {extractedData.productNarrative.value_prop?.headline && (
                        <div>
                          <div className="font-semibold">{extractedData.productNarrative.value_prop.headline}</div>
                          <div className="text-sm text-gray-600">{extractedData.productNarrative.value_prop.subhead}</div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="raw" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Raw Extracted Data</h3>
              <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                {JSON.stringify(extractedData, null, 2)}
              </pre>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Terminal Logs */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Extraction Logs</h3>
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm h-64 overflow-auto">
          {logs.length === 0 ? (
            <div className="text-gray-500">Waiting for extraction to start...</div>
          ) : (
            logs.map((log, index) => (
              <div key={index} className="mb-1">{log}</div>
            ))
          )}
        </div>
      </Card>

      {/* Status Info */}
      {extractedData && (
        <div className="mt-6 text-center">
          <div className="text-lg font-semibold text-green-600">
            ✅ Complete! Video generated and brand data extracted.
          </div>
          <p className="text-gray-600 mt-2">
            Check the tabs above to see all extracted brand data, screenshots, and typography.
          </p>
        </div>
      )}
    </div>
  );
}