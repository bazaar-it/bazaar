'use client';

import { useState, useEffect } from 'react';
import { api } from '~/trpc/react';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Card } from '~/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Loader2, Globe, Code, Image, Palette, FileJson, Copy, Check, History, Sparkles, RefreshCw } from 'lucide-react';

export default function ExtractionLabPage() {
  const [url, setUrl] = useState('');
  const [duration, setDuration] = useState(15);
  const [focus, setFocus] = useState('');
  const [extractionResult, setExtractionResult] = useState<any>(null);
  const [brandJson, setBrandJson] = useState<any>(null);
  const [storyArc, setStoryArc] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [selectedExtractionId, setSelectedExtractionId] = useState<string | null>(null);
  const [generatingStoryForId, setGeneratingStoryForId] = useState<string | null>(null);

  // Query to get saved extractions
  const extractionHistory = api.extraction.getExtractionHistory.useQuery({
    limit: 20,
  });

  // State for loading a single extraction
  const [loadingExtractionId, setLoadingExtractionId] = useState<string | null>(null);
  
  // Query to get a single extraction
  const getSingleExtraction = api.extraction.getExtraction.useQuery(
    { extractionId: loadingExtractionId! },
    {
      enabled: !!loadingExtractionId,
    }
  );

  // Handle successful extraction load
  useEffect(() => {
    if (getSingleExtraction.data && loadingExtractionId) {
      console.log('✅ Loaded saved extraction:', getSingleExtraction.data);
      
      // Build the brandJSON structure from the extraction data
      const extraction = getSingleExtraction.data;
      const brandJSON = {
        id: `brand_${Date.now()}`,
        url: extraction.url,
        extractionId: extraction.extractionId,
        createdAt: extraction.createdAt,
        visualAnalysis: extraction.visualAnalysis,
        contentAnalysis: extraction.contentAnalysis,
        synthesis: extraction.synthesis,
        brand: extraction.brandData,
        design: extraction.designData,
        product: extraction.productData,
        socialProof: extraction.socialProofData,
        sections: extraction.sectionsData,
        content: extraction.contentData,
        visuals: {
          photos: [],
          uiComponents: [],
          icons: []
        },
        confidence: extraction.confidence,
        metadata: {
          analysisVersion: extraction.extractionVersion || '2.0.0',
          timestamp: extraction.createdAt,
          processingTime: extraction.processingTimeMs,
          tokensUsed: extraction.tokensUsed
        }
      };
      
      setBrandJson(brandJSON);
      setSelectedExtractionId(extraction.extractionId);
      setLoadingExtractionId(null);
    }
  }, [getSingleExtraction.data, loadingExtractionId]);

  // Mutation to generate story arc from saved extraction
  const generateStoryArc = api.extraction.generateStoryArcFromExtraction.useMutation({
    onSuccess: (data) => {
      console.log('✅ Story arc generated:', data);
      setStoryArc(data.storyArc);
      setGeneratingStoryForId(null);
    },
    onError: () => {
      setGeneratingStoryForId(null);
    },
  });

  const extractMutation = api.extraction.testExtraction.useMutation({
    onMutate: () => {
      console.log('🚀 Starting extraction...');
      // Clear previous results immediately
      setExtractionResult(null);
      setBrandJson(null);
    },
    onSuccess: (data) => {
      console.log('✅ Extraction successful!', data);
      setExtractionResult(data.extraction);
      setBrandJson(data.brandJson);
      setStoryArc(data.storyArc);
      // Refetch saved extractions to include the new one
      extractionHistory.refetch();
    },
    onError: (error) => {
      console.error('❌ Extraction failed:', error);
    },
  });

  // New pixel-perfect extraction mutation
  const pixelPerfectMutation = api.extraction.testPixelPerfectExtraction.useMutation({
    onMutate: () => {
      console.log('🎯 Starting pixel-perfect extraction...');
      setExtractionResult(null);
      setBrandJson(null);
    },
    onSuccess: (data) => {
      console.log('✅ Pixel-perfect extraction successful!', data);
      // Store the pixel-perfect results differently
      setExtractionResult({
        pixelPerfect: true,
        ...data,
      });
    },
    onError: (error) => {
      console.error('❌ Pixel-perfect extraction failed:', error);
    },
  });

  const handleExtract = () => {
    if (!url) return;
    
    extractMutation.mutate({
      url,
      options: {
        duration,
        focus: focus || undefined,
      },
    });
  };

  const handleCopyBrandJson = async () => {
    if (!brandJson) return;
    
    try {
      await navigator.clipboard.writeText(JSON.stringify(brandJson, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleLoadExtraction = (extractionId: string) => {
    setLoadingExtractionId(extractionId);
  };

  const handleGenerateStoryArc = (extractionId: string) => {
    setGeneratingStoryForId(extractionId);
    generateStoryArc.mutate({
      extractionId,
      options: {
        sceneCount: 5,
        totalDurationSeconds: 15,
        style: 'professional',
      },
    });
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <h1 className="text-3xl font-bold mb-6">URL Extraction Lab</h1>
      
      {/* Input Section */}
      <Card className="p-6 mb-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Website URL</label>
            <div className="flex gap-2">
              <Input
                type="url"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleExtract}
                disabled={!url || extractMutation.isPending || pixelPerfectMutation.isPending}
              >
                {extractMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Extracting...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Extract
                  </>
                )}
              </Button>
              
              {/* Pixel Perfect Extraction Buttons */}
              <Button
                onClick={() => url && pixelPerfectMutation.mutate({ url, mode: 'analyze' })}
                disabled={!url || extractMutation.isPending || pixelPerfectMutation.isPending}
                variant="outline"
                className="bg-purple-50 hover:bg-purple-100 border-purple-300"
              >
                {pixelPerfectMutation.isPending && pixelPerfectMutation.variables?.mode === 'analyze' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    🎯 Pixel Perfect (Analyze)
                  </>
                )}
              </Button>
              
              <Button
                onClick={() => url && pixelPerfectMutation.mutate({ url, mode: 'generate' })}
                disabled={!url || extractMutation.isPending || pixelPerfectMutation.isPending}
                variant="outline"
                className="bg-green-50 hover:bg-green-100 border-green-300"
              >
                {pixelPerfectMutation.isPending && pixelPerfectMutation.variables?.mode === 'generate' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    🎬 Pixel Perfect (Generate)
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Duration (seconds)
              </label>
              <Input
                type="number"
                min="10"
                max="30"
                value={duration}
                onChange={(e) => setDuration(Number(e.target.value))}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Focus (optional)
              </label>
              <Input
                placeholder="e.g., investment, features, pricing"
                value={focus}
                onChange={(e) => setFocus(e.target.value)}
              />
            </div>
          </div>
        </div>
      </Card>

      {/* Loading State */}
      {extractMutation.isPending && (
        <Card className="p-6 mb-6 border-blue-200 bg-blue-50">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
            <div>
              <div className="font-medium text-blue-900">Extracting website data...</div>
              <div className="text-sm text-blue-600">This may take 40-60 seconds. Capturing screenshots and analyzing brand elements.</div>
            </div>
          </div>
        </Card>
      )}
      
      {/* Pixel Perfect Loading State */}
      {pixelPerfectMutation.isPending && (
        <Card className="p-6 mb-6 border-purple-200 bg-purple-50">
          <div className="flex items-center gap-3">
            <Loader2 className="h-5 w-5 animate-spin text-purple-600" />
            <div>
              <div className="font-medium text-purple-900">
                🎯 Running Pixel-Perfect Extraction ({pixelPerfectMutation.variables?.mode})
              </div>
              <div className="text-sm text-purple-600">
                Step 1: Capturing full page screenshot...<br/>
                Step 2: Two-pass section segmentation...<br/>
                Step 3: Extracting UI rebuild specs...<br/>
                Step 4: Extracting assets (SVGs, images)...<br/>
                {pixelPerfectMutation.variables?.mode === 'generate' && 'Step 5: Generating pixel-perfect scenes...'}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Pixel Perfect Results */}
      {extractionResult?.pixelPerfect && (
        <Card className="p-6 mb-6 border-purple-300 bg-purple-50">
          <h2 className="text-xl font-bold mb-4 text-purple-900">🎯 Pixel-Perfect Extraction Results</h2>
          
          {/* Full Screenshot */}
          {extractionResult.screenshot && (
            <div className="mb-6">
              <h3 className="font-semibold mb-2">Full Page Screenshot:</h3>
              <img 
                src={extractionResult.screenshot.url} 
                alt="Full page" 
                className="max-w-full h-auto border rounded shadow-lg max-h-96 object-cover object-top"
              />
              <p className="text-sm text-gray-600 mt-2">
                Dimensions: {extractionResult.screenshot.dimensions.w} × {extractionResult.screenshot.dimensions.h}px
              </p>
            </div>
          )}
          
          {/* Sections */}
          <div className="space-y-4">
            <h3 className="font-semibold">Extracted Sections ({extractionResult.sections?.length || 0}):</h3>
            {extractionResult.sections?.map((section: any, i: number) => (
              <div key={i} className="bg-white p-4 rounded-lg border">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="font-semibold text-lg">{i + 1}. {section.type}</span>
                    <span className="ml-2 text-sm text-gray-600">
                      ({section.bbox.w} × {section.bbox.h}px)
                    </span>
                  </div>
                  <span className="text-sm bg-purple-100 px-2 py-1 rounded">
                    {section.suggestedDurationMs}ms
                  </span>
                </div>
                
                {/* Section Screenshot */}
                {section.screenshotUrl && (
                  <img 
                    src={section.screenshotUrl} 
                    alt={`Section ${section.type}`}
                    className="w-full h-auto border rounded mb-2 max-h-48 object-cover"
                  />
                )}
                
                {/* UI Layers */}
                {section.rebuildSpec && (
                  <div className="text-sm space-y-1">
                    <p><strong>UI Layers:</strong> {section.rebuildSpec.layers.length}</p>
                    <p><strong>Z-Order:</strong> {section.rebuildSpec.zOrder.join(' → ')}</p>
                  </div>
                )}
                
                {/* Assets */}
                {section.assets && (
                  <div className="text-sm">
                    <p>
                      <strong>Assets:</strong> 
                      {Object.keys(section.assets.svgs).length} SVGs, 
                      {Object.keys(section.assets.images).length} images
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Prepared Scenes for ADD Tool */}
          {extractionResult.preparedScenes && (
            <div className="mt-6 border-t pt-4">
              <h3 className="font-semibold mb-2">📦 Prepared Data for ADD Tool:</h3>
              {extractionResult.preparedScenes.filter((s: any) => s).map((scene: any, i: number) => (
                <div key={i} className="mb-4 p-3 bg-green-50 rounded border border-green-200">
                  <div className="font-medium text-green-900 mb-2">
                    {scene.section.type} - Ready for ADD tool
                  </div>
                  <div className="text-sm space-y-1">
                    <p>📸 Image: {scene.addToolInput.imageUrl.split('/').pop()}</p>
                    <p>🏗️ UI Spec: {scene.rebuildSpec.layers.length} layers</p>
                    <p>🎨 Assets: {Object.keys(scene.assets.svgs).length} SVGs, {Object.keys(scene.assets.images).length} images</p>
                    <p>💬 Prompt: "{scene.addToolInput.prompt}"</p>
                  </div>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-sm text-green-700">View UI Spec</summary>
                    <pre className="bg-white p-2 rounded mt-1 text-xs overflow-auto">
                      {JSON.stringify(scene.rebuildSpec, null, 2)}
                    </pre>
                  </details>
                </div>
              ))}
            </div>
          )}
          
          {/* Logs */}
          {extractionResult.logs && (
            <div className="mt-4 text-sm text-gray-600">
              {extractionResult.logs.map((log: string, i: number) => (
                <div key={i}>• {log}</div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Regular Results Section */}
      {((extractionResult && !extractionResult.pixelPerfect) || brandJson) && (
        <Card className="p-6">
          <Tabs defaultValue="extraction" className="w-full">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="extraction">
                <Code className="mr-2 h-4 w-4" />
                HTML/DOM
              </TabsTrigger>
              <TabsTrigger value="screenshots">
                <Image className="mr-2 h-4 w-4" />
                Screenshots
              </TabsTrigger>
              <TabsTrigger value="styles">
                <Palette className="mr-2 h-4 w-4" />
                Styles
              </TabsTrigger>
              <TabsTrigger value="brandjson">
                <FileJson className="mr-2 h-4 w-4" />
                BrandJSON
              </TabsTrigger>
              <TabsTrigger value="timeline">
                Timeline
              </TabsTrigger>
            </TabsList>

            <TabsContent value="extraction" className="mt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Page Metadata</h3>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-48 text-xs">
                    {JSON.stringify(extractionResult?.metadata, null, 2)}
                  </pre>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">DOM Structure</h3>
                  <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-96 text-xs">
                    {extractionResult?.html?.cleaned?.substring(0, 2000)}...
                  </pre>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="screenshots" className="mt-4">
              <div className="grid grid-cols-2 gap-4">
                {extractionResult?.screenshots?.map((screenshot: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-2">
                    <div className="text-sm font-medium mb-1">
                      {screenshot.type === 'full' ? '📄 Full Page' : '🖼️ Hero/Viewport'} - {screenshot.id}
                    </div>
                    {screenshot.url && (
                      <a 
                        href={screenshot.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="block cursor-pointer hover:opacity-80 transition-opacity"
                      >
                        <img
                          src={screenshot.url}
                          alt={screenshot.id}
                          className="w-full h-48 object-contain bg-gray-50 rounded border"
                        />
                        <div className="text-center text-xs text-blue-600 mt-1">
                          🔍 Click to view full size
                        </div>
                      </a>
                    )}
                    <div className="text-xs text-gray-500 mt-1">
                      Resolution: {screenshot.dimensions?.width}x{screenshot.dimensions?.height}px
                    </div>
                  </div>
                ))}
              </div>
              {extractionResult?.screenshots?.length > 0 && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm">
                  💡 <strong>Tip:</strong> Click on any screenshot to open it in full resolution in a new tab. 
                  The "Full Page" capture scrolls through the entire website to capture all content.
                </div>
              )}
            </TabsContent>

            <TabsContent value="styles" className="mt-4">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-3">Categorized Colors</h3>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    {extractionResult?.styles?.categorized && (
                      <>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Primary</div>
                          <div 
                            className="h-20 rounded-lg border-2 border-gray-300 flex items-center justify-center text-white font-semibold shadow-md"
                            style={{ backgroundColor: extractionResult.styles.categorized.primary || '#000' }}
                          >
                            <span className="bg-black/30 px-2 py-1 rounded text-xs">
                              {extractionResult.styles.categorized.primary}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Secondary</div>
                          <div 
                            className="h-20 rounded-lg border-2 border-gray-300 flex items-center justify-center text-white font-semibold shadow-md"
                            style={{ backgroundColor: extractionResult.styles.categorized.secondary || '#fff' }}
                          >
                            <span className="bg-black/30 px-2 py-1 rounded text-xs">
                              {extractionResult.styles.categorized.secondary}
                            </span>
                          </div>
                        </div>
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Accent</div>
                          <div 
                            className="h-20 rounded-lg border-2 border-gray-300 flex items-center justify-center text-white font-semibold shadow-md"
                            style={{ backgroundColor: extractionResult.styles.categorized.accent || '#999' }}
                          >
                            <span className="bg-black/30 px-2 py-1 rounded text-xs">
                              {extractionResult.styles.categorized.accent || 'Not found'}
                            </span>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Full Color Palette</h3>
                  <div className="flex flex-wrap gap-2">
                    {extractionResult?.styles?.palette?.map((color: string, idx: number) => (
                      <div
                        key={idx}
                        className="relative group"
                      >
                        <div
                          className="w-12 h-12 rounded-lg border cursor-pointer hover:scale-110 transition-transform"
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                        <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 text-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap bg-black text-white px-1 rounded">
                          {color}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div>
                  <h3 className="font-semibold mb-2">Typography</h3>
                  <div className="bg-gray-100 p-4 rounded-lg">
                    {extractionResult?.styles?.fonts?.map((font: any, idx: number) => (
                      <div key={idx} className="mb-2">
                        <span className="font-mono text-sm" style={{ fontFamily: font.family }}>
                          {font.family}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="brandjson" className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">BrandJSON Output</h3>
                  <div className="flex items-center gap-4">
                    <div className="text-sm">
                      Confidence: {brandJson?.confidence?.overall ? 
                        `${(brandJson.confidence.overall * 100).toFixed(0)}%` : 'N/A'}
                    </div>
                    <Button
                      onClick={handleCopyBrandJson}
                      variant="outline"
                      size="sm"
                      disabled={!brandJson}
                    >
                      {copied ? (
                        <>
                          <Check className="mr-2 h-4 w-4" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="mr-2 h-4 w-4" />
                          Copy JSON
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                <pre className="bg-gray-100 p-4 rounded-lg overflow-auto max-h-[600px] text-xs">
                  {JSON.stringify(brandJson, null, 2)}
                </pre>
              </div>
            </TabsContent>

            <TabsContent value="timeline" className="mt-4">
              <div className="space-y-2">
                <h3 className="font-semibold mb-2">Processing Timeline</h3>
                {extractionResult?.timeline && (
                  <div className="space-y-1">
                    {Object.entries(extractionResult.timeline).map(([stage, duration]: [string, any]) => (
                      <div key={stage} className="flex justify-between text-sm">
                        <span>{stage}:</span>
                        <span className="font-mono">{duration}ms</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </Card>
      )}

      {/* Error Display */}
      {extractMutation.error && (
        <Card className="p-4 mt-4 border-red-200 bg-red-50">
          <div className="text-red-600">
            Error: {extractMutation.error.message}
          </div>
        </Card>
      )}

      {/* Saved Extractions Section */}
      <Card className="p-6 mt-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <History className="h-5 w-5" />
            Saved Extractions
          </h2>
          <Button
            onClick={() => extractionHistory.refetch()}
            variant="outline"
            size="sm"
            disabled={extractionHistory.isRefetching}
          >
            {extractionHistory.isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>

        {extractionHistory.isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : extractionHistory.data?.extractions?.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No saved extractions yet. Run an extraction above to get started.
          </div>
        ) : (
          <div className="space-y-3">
            {extractionHistory.data?.extractions?.map((extraction: any) => (
              <div
                key={extraction.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="font-medium">
                      {extraction.brandName || 'Unknown Brand'}
                    </div>
                    <div className="text-sm text-gray-600">
                      {extraction.url}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      {new Date(extraction.createdAt).toLocaleString()} • 
                      Confidence: {extraction.confidence?.overall ? 
                        `${(extraction.confidence.overall * 100).toFixed(0)}%` : 'N/A'} • 
                      Processing: {extraction.processingTimeMs ? 
                        `${(extraction.processingTimeMs / 1000).toFixed(1)}s` : 'N/A'}
                    </div>
                    {extraction.brandTagline && (
                      <div className="text-sm text-gray-700 mt-2 italic">
                        "{extraction.brandTagline}"
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => handleLoadExtraction(extraction.id)}
                      variant="outline"
                      size="sm"
                      disabled={loadingExtractionId === extraction.id}
                    >
                      {loadingExtractionId === extraction.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <FileJson className="mr-2 h-4 w-4" />
                          Load
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleGenerateStoryArc(extraction.id)}
                      variant="default"
                      size="sm"
                      disabled={generatingStoryForId === extraction.id}
                    >
                      {generatingStoryForId === extraction.id ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="mr-2 h-4 w-4" />
                          Generate Story
                        </>
                      )}
                    </Button>
                  </div>
                </div>
                {extraction.screenshots?.length > 0 && (
                  <div className="flex gap-2 mt-3">
                    {extraction.screenshots.slice(0, 2).map((screenshot: any, idx: number) => (
                      <div key={idx} className="relative">
                        <img
                          src={screenshot.url}
                          alt={`${extraction.brandName} screenshot ${idx + 1}`}
                          className="h-16 w-24 object-cover rounded border"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Story Arc Display */}
      {storyArc && (
        <Card className="p-6 mt-6">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-yellow-500" />
            Generated Story Arc
          </h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-gray-600">Title</div>
                <div className="font-medium">{storyArc.title}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Narrative Structure</div>
                <div className="font-medium">{storyArc.narrativeStructure}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Duration</div>
                <div className="font-medium">{storyArc.totalDuration / 30}s ({storyArc.totalDuration} frames)</div>
              </div>
              <div>
                <div className="text-sm text-gray-600">Scenes</div>
                <div className="font-medium">{storyArc.scenes?.length || 0} scenes</div>
              </div>
            </div>

            {storyArc.brandContext && (
              <div className="border-t pt-4">
                <h3 className="font-medium mb-2">Brand Context</h3>
                <div className="text-sm space-y-1">
                  <div><strong>Name:</strong> {storyArc.brandContext.name}</div>
                  <div><strong>Tagline:</strong> {storyArc.brandContext.tagline}</div>
                  <div><strong>Problem:</strong> {storyArc.brandContext.mainProblem}</div>
                  <div><strong>Solution:</strong> {storyArc.brandContext.mainSolution}</div>
                  {storyArc.brandContext.keyFeatures?.length > 0 && (
                    <div><strong>Features:</strong> {storyArc.brandContext.keyFeatures.join(', ')}</div>
                  )}
                </div>
              </div>
            )}

            {storyArc.scenes && (
              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Scenes</h3>
                <div className="space-y-3">
                  {storyArc.scenes.map((scene: any, idx: number) => (
                    <div key={scene.id || idx} className="border rounded-lg p-3 bg-gray-50">
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <div className="font-medium">
                            Scene {idx + 1}: {scene.title}
                          </div>
                          <div className="text-sm text-gray-600">
                            {scene.emotionalBeat} • {scene.duration} frames ({(scene.duration / 30).toFixed(1)}s)
                          </div>
                        </div>
                        <div className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                          {scene.template?.name}
                        </div>
                      </div>
                      <div className="text-sm text-gray-700 mb-2">
                        {scene.narrative}
                      </div>
                      {scene.text?.headline && (
                        <div className="text-sm">
                          <strong>Headline:</strong> "{scene.text.headline}"
                        </div>
                      )}
                      {scene.text?.cta && (
                        <div className="text-sm">
                          <strong>CTA:</strong> "{scene.text.cta}"
                        </div>
                      )}
                      <div className="flex gap-2 mt-2">
                        <div
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: scene.styling?.colors?.primary }}
                          title={`Primary: ${scene.styling?.colors?.primary}`}
                        />
                        <div
                          className="w-8 h-8 rounded border"
                          style={{ backgroundColor: scene.styling?.colors?.secondary }}
                          title={`Secondary: ${scene.styling?.colors?.secondary}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}