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

interface HeroJourneyScene {
  title: string;
  duration: number;
  narrative: string;
  visualElements: string[];
  brandElements: {
    colors: string[];
    typography: string;
    motion: string;
  };
  emotionalBeat: string;
  templateId?: string;
  generatedPrompt?: string;
}

// Extended type for admin debugging
interface AdminSceneResponse {
  data: any;
  meta: any;
  debugData?: {
    screenshots?: any[];
    brandExtraction?: any;
    heroJourney?: any[];
    templateSelections?: any;
    generatedPrompts?: any[];
    extractionStatus?: 'success' | 'fallback';
  };
}

export default function BrandExtractionPage() {
  const [url, setUrl] = useState("");
  const [isExtracting, setIsExtracting] = useState(false);
  const [currentStep, setCurrentStep] = useState<string>("");
  const [steps, setSteps] = useState<ExtractionStep[]>([
    { id: 'validate', name: 'Validating URL', status: 'pending' },
    { id: 'screenshots', name: 'Capturing Screenshots', status: 'pending' },
    { id: 'brand', name: 'Extracting Brand Data', status: 'pending' },
    { id: 'narrative', name: 'Creating Hero\'s Journey', status: 'pending' },
    { id: 'templates', name: 'Selecting Templates', status: 'pending' },
    { id: 'prompts', name: 'Generating Scene Prompts', status: 'pending' },
    { id: 'save', name: 'Saving to Database', status: 'pending' },
    { id: 'generate', name: 'Compiling Video', status: 'pending' },
  ]);
  const [extractedData, setExtractedData] = useState<any>(null);
  const [heroJourneyData, setHeroJourneyData] = useState<HeroJourneyScene[]>([]);
  const [screenshotData, setScreenshotData] = useState<any[]>([]);
  const [generatedPrompts, setGeneratedPrompts] = useState<any[]>([]);
  const [extractionStatus, setExtractionStatus] = useState<'success' | 'fallback' | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  // Create a project for admin testing
  const createProject = api.project.create.useMutation();
  
  // Use the same generation API as chat panel
  const generateScene = api.generation.generateScene.useMutation({
    onSuccess: (data: AdminSceneResponse) => {
      addLog('🎬 Scene generation completed successfully!');
      
      // Extract and visualize the pipeline data from the response
      if (data.debugData) {
        // Check extraction status
        if (data.debugData.extractionStatus) {
          setExtractionStatus(data.debugData.extractionStatus);
          if (data.debugData.extractionStatus === 'fallback') {
            addLog('⚠️ Using fallback data - website extraction may have failed');
          }
        }
        
        // Screenshots from web analysis
        if (data.debugData.screenshots) {
          setScreenshotData(data.debugData.screenshots);
          updateStep('screenshots', 'completed', data.debugData.screenshots);
          addLog(`📸 Captured ${data.debugData.screenshots.length} screenshots`);
        }
        
        // Brand extraction data
        if (data.debugData.brandExtraction) {
          updateStep('brand', 'completed', data.debugData.brandExtraction);
          addLog('🎨 Brand data extracted successfully');
        }
        
        // Narrative scenes (multi-scene aware)
        const narrativeScenes = data.debugData.narrativeScenes || data.debugData.heroJourney;
        if (narrativeScenes) {
          setHeroJourneyData(narrativeScenes);
          updateStep('narrative', 'completed', narrativeScenes);
          addLog(`📖 Created ${narrativeScenes.length} narrative scenes`);
        }
        
        // Template selections
        if (data.debugData.templateSelections) {
          updateStep('templates', 'completed', data.debugData.templateSelections);
          addLog('🎯 Templates selected for each scene');
        }
        
        // Generated prompts
        if (data.debugData.generatedPrompts) {
          setGeneratedPrompts(data.debugData.generatedPrompts);
          updateStep('prompts', 'completed', data.debugData.generatedPrompts);
          addLog('✍️ Scene prompts generated');
        }
      }
      
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

  const getBrandProfileQuery = api.brandProfile.getByProject.useQuery(
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

      {/* Extraction Status Warning */}
      {extractionStatus === 'fallback' && (
        <Card className="p-4 mb-6 border-yellow-500 bg-yellow-50">
          <div className="flex items-center gap-2 text-yellow-800">
            <AlertCircle className="w-5 h-5" />
            <span className="font-medium">Using Fallback Data</span>
          </div>
          <p className="text-sm text-yellow-700 mt-2">
            The website extraction failed (possibly due to Cloudflare protection or site structure). 
            Generic placeholder data is being used instead of actual brand extraction.
          </p>
        </Card>
      )}
      
      {/* Results Section */}
      {extractedData && (
        <Tabs defaultValue="screenshots" className="mb-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="screenshots">Screenshots</TabsTrigger>
            <TabsTrigger value="journey">Hero's Journey</TabsTrigger>
            <TabsTrigger value="prompts">Prompts</TabsTrigger>
            <TabsTrigger value="colors">Colors</TabsTrigger>
            <TabsTrigger value="typography">Typography</TabsTrigger>
            <TabsTrigger value="content">Content</TabsTrigger>
            <TabsTrigger value="raw">Raw JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="screenshots" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Image className="w-5 h-5" />
                Captured Screenshots ({screenshotData.length || extractedData.screenshots?.length || 0})
              </h3>
              {(screenshotData.length > 0 || extractedData.screenshots?.length > 0) ? (
                <div className="grid grid-cols-2 gap-6">
                  {(screenshotData.length > 0 ? screenshotData : extractedData.screenshots || []).map((screenshot: any, index: number) => (
                    <div key={index} className="space-y-3 border rounded-lg p-4">
                      <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                        <img 
                          src={screenshot.url || screenshot.data} 
                          alt={screenshot.viewport || `Screenshot ${index + 1}`}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23ccc"><text x="50%" y="50%" text-anchor="middle" dy=".3em">Image not found</text></svg>';
                          }}
                        />
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <Badge variant="outline">{screenshot.viewport || screenshot.type || `Screenshot ${index + 1}`}</Badge>
                          <span className="text-xs text-gray-500">{screenshot.timestamp || new Date().toISOString()}</span>
                        </div>
                        {screenshot.scrollPosition && (
                          <div className="text-sm text-gray-600">
                            Scroll: {screenshot.scrollPosition}px
                          </div>
                        )}
                        {screenshot.metadata && (
                          <div className="text-xs bg-gray-50 p-2 rounded font-mono">
                            {JSON.stringify(screenshot.metadata, null, 2)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No screenshots captured yet. Screenshots will appear here when the web agent browses the URL.
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="journey" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Hero's Journey Narrative Arc</h3>
              {heroJourneyData.length > 0 ? (
                <div className="space-y-6">
                  {heroJourneyData.map((scene, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-lg">{scene.title}</h4>
                          <Badge variant="outline" className="mt-1">
                            {scene.emotionalBeat}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <div className="text-sm text-gray-600">Duration</div>
                          <div className="font-mono font-semibold">
                            {(scene.duration / 30).toFixed(1)}s
                          </div>
                          <div className="text-xs text-gray-500">{scene.duration} frames</div>
                        </div>
                      </div>
                      
                      <div className="bg-blue-50 p-3 rounded">
                        <div className="text-sm font-medium text-blue-900 mb-1">Narrative</div>
                        <div className="text-sm text-blue-800">{scene.narrative}</div>
                      </div>
                      
                      <div>
                        <div className="text-sm font-medium text-gray-700 mb-2">Visual Elements</div>
                        <div className="flex flex-wrap gap-2">
                          {scene.visualElements.map((element, i) => (
                            <Badge key={i} variant="secondary">{element}</Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <div className="font-medium text-gray-700">Colors</div>
                          <div className="flex gap-1 mt-1">
                            {scene.brandElements.colors.map((color, i) => (
                              <div 
                                key={i}
                                className="w-6 h-6 rounded border"
                                style={{ backgroundColor: color }}
                                title={color}
                              />
                            ))}
                          </div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">Typography</div>
                          <div className="text-xs text-gray-600">{scene.brandElements.typography}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-700">Motion</div>
                          <div className="text-xs text-gray-600">{scene.brandElements.motion}</div>
                        </div>
                      </div>
                      
                      {scene.templateId && (
                        <div className="pt-2 border-t">
                          <span className="text-sm text-gray-600">Template: </span>
                          <Badge>{scene.templateId}</Badge>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 mb-2">Total Video Duration</div>
                    <div className="text-2xl font-bold">
                      {(heroJourneyData.reduce((acc, s) => acc + s.duration, 0) / 30).toFixed(1)} seconds
                    </div>
                    <div className="text-sm text-gray-600">
                      {heroJourneyData.reduce((acc, s) => acc + s.duration, 0)} total frames @ 30fps
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Hero's Journey narrative will appear here after brand extraction.
                </div>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="prompts" className="mt-4">
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">Generated Scene Prompts</h3>
              {generatedPrompts.length > 0 ? (
                <div className="space-y-4">
                  {generatedPrompts.map((prompt, index) => (
                    <div key={index} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-semibold">Scene {index + 1}: {prompt.sceneName || 'Untitled'}</h4>
                        <Badge>{prompt.tool || 'edit'}</Badge>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <pre className="text-sm whitespace-pre-wrap font-mono">{prompt.content}</pre>
                      </div>
                      {prompt.template && (
                        <div className="mt-2 text-sm text-gray-600">
                          Template: <span className="font-medium">{prompt.template}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Generated prompts will appear here. These are the exact prompts sent to the LLM for each scene.
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
