// src/components/admin/BrandProfilePanel.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Badge } from '~/components/ui/badge';
import { ScrollArea } from '~/components/ui/scroll-area';
import { 
  Palette, 
  Type, 
  Image, 
  Globe, 
  GitBranch,
  RefreshCw,
  Database,
  History,
  Edit,
  Save,
  X
} from 'lucide-react';
import { api } from '~/trpc/react';
import { toast } from 'sonner';
import { cn } from '~/lib/cn';

interface BrandProfilePanelProps {
  projectId: string;
}

export function BrandProfilePanel({ projectId }: BrandProfilePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<any>(null);
  
  // Fetch brand profile data
  const { data: brandProfile, isLoading, error, refetch } = api.brandProfile.getByProject.useQuery(
    { projectId },
    { 
      enabled: !!projectId,
      refetchInterval: 5000 // Auto-refresh every 5 seconds to see evolving brand
    }
  );

  // Update brand profile mutation
  const updateBrandProfile = api.brandProfile.update.useMutation({
    onSuccess: () => {
      toast.success('Brand profile updated');
      setIsEditing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    }
  });

  // Initialize edited data when brand profile loads
  useEffect(() => {
    if (brandProfile && !editedData) {
      setEditedData(brandProfile.brandData || brandProfile);
    }
  }, [brandProfile]);

  const handleSave = () => {
    if (!brandProfile?.id || !editedData) return;
    
    updateBrandProfile.mutate({
      id: brandProfile.id,
      brandData: editedData
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditedData(brandProfile?.brandData || brandProfile);
  };

  // Color display component
  const ColorDisplay = ({ label, color }: { label: string; color: string }) => (
    <div className="flex items-center gap-2 mb-2">
      <div 
        className="w-8 h-8 rounded border border-gray-300"
        style={{ backgroundColor: color }}
      />
      <div className="flex flex-col">
        <span className="text-xs text-gray-500">{label}</span>
        <span className="text-sm font-mono">{color}</span>
      </div>
    </div>
  );

  // Source badge component
  const SourceBadge = ({ source }: { source: string }) => {
    const getSourceIcon = () => {
      switch(source) {
        case 'url': return <Globe className="h-3 w-3" />;
        case 'github': return <GitBranch className="h-3 w-3" />;
        case 'figma': return <Image className="h-3 w-3" />;
        case 'chat': return <History className="h-3 w-3" />;
        default: return <Database className="h-3 w-3" />;
      }
    };

    const getSourceColor = () => {
      switch(source) {
        case 'url': return 'bg-blue-100 text-blue-700';
        case 'github': return 'bg-purple-100 text-purple-700';
        case 'figma': return 'bg-pink-100 text-pink-700';
        case 'chat': return 'bg-green-100 text-green-700';
        default: return 'bg-gray-100 text-gray-700';
      }
    };

    return (
      <Badge variant="outline" className={cn("gap-1", getSourceColor())}>
        {getSourceIcon()}
        {source}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <Database className="h-12 w-12 text-red-300 mb-4" />
        <h3 className="text-lg font-semibold mb-2 text-red-600">Error Loading Brand Profile</h3>
        <p className="text-sm text-gray-500">{error.message}</p>
      </div>
    );
  }

  if (!brandProfile) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center">
        <Database className="h-12 w-12 text-gray-300 mb-4" />
        <h3 className="text-lg font-semibold mb-2">No Brand Profile Yet</h3>
        <p className="text-sm text-gray-500 mb-4">
          Brand data will appear here when you:
        </p>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>• Enter a website URL</li>
          <li>• Connect GitHub or Figma</li>
          <li>• Generate scenes with brand elements</li>
        </ul>
      </div>
    );
  }

  const brandData = editedData || brandProfile.brandData || brandProfile || {};

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-gray-600" />
            <h2 className="text-lg font-semibold">Brand Profile</h2>
            <Badge variant="outline" className="ml-2">
              Admin View
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleCancel}
                >
                  <X className="h-4 w-4 mr-1" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSave}
                  disabled={updateBrandProfile.isPending}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {updateBrandProfile.isPending ? 'Saving...' : 'Save'}
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Source indicators */}
        {brandProfile?.websiteUrl && (
          <div className="mt-3 flex items-center gap-2">
            <span className="text-xs text-gray-500">Source:</span>
            <SourceBadge source="url" />
            <span className="text-xs text-gray-600 truncate">
              {brandProfile.websiteUrl}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4">
          <Tabs defaultValue="colors" className="w-full">
            <TabsList className="grid w-full grid-cols-7">
              <TabsTrigger value="colors">Colors</TabsTrigger>
              <TabsTrigger value="typography">Type</TabsTrigger>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="psychology">Psychology</TabsTrigger>
              <TabsTrigger value="competitors">Compete</TabsTrigger>
              <TabsTrigger value="motion">Motion</TabsTrigger>
              <TabsTrigger value="raw">Raw</TabsTrigger>
            </TabsList>

            {/* Colors Tab */}
            <TabsContent value="colors" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Palette className="h-4 w-4" />
                    Brand Colors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {brandData.colors?.primary && (
                    <ColorDisplay label="Primary" color={brandData.colors.primary} />
                  )}
                  {brandData.colors?.secondary && (
                    <ColorDisplay label="Secondary" color={brandData.colors.secondary} />
                  )}
                  {brandData.colors?.accent && (
                    <ColorDisplay label="Accent" color={brandData.colors.accent} />
                  )}
                  
                  {brandData.colors?.gradients?.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-gray-600 mb-2">Gradients</h4>
                      {brandData.colors.gradients.map((gradient: any, i: number) => (
                        <div key={i} className="mb-2 p-2 border rounded">
                          <div 
                            className="h-8 rounded mb-1"
                            style={{
                              background: `linear-gradient(${gradient.angle}deg, ${gradient.stops.join(', ')}`
                            }}
                          />
                          <span className="text-xs font-mono text-gray-600">
                            {gradient.type} • {gradient.angle}° • {gradient.stops.length} stops
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Typography Tab */}
            <TabsContent value="typography" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Type className="h-4 w-4" />
                    Typography
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {brandData.typography?.primaryFont && (
                    <div>
                      <span className="text-xs text-gray-500">Primary Font</span>
                      <p className="font-medium">{brandData.typography.primaryFont}</p>
                    </div>
                  )}
                  {brandData.typography?.headingFont && (
                    <div>
                      <span className="text-xs text-gray-500">Heading Font</span>
                      <p className="font-medium">{brandData.typography.headingFont}</p>
                    </div>
                  )}
                  {brandData.typography?.fontSize && (
                    <div>
                      <span className="text-xs text-gray-500">Font Sizes</span>
                      <div className="flex gap-2 mt-1">
                        {Object.entries(brandData.typography.fontSize).map(([key, value]) => (
                          <Badge key={key} variant="secondary">
                            {key}: {String(value)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Content Tab */}
            <TabsContent value="content" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Product & Content</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {brandData.product?.value_prop?.headline && (
                    <div>
                      <span className="text-xs text-gray-500">Value Proposition</span>
                      <p className="font-medium">{brandData.product.value_prop.headline}</p>
                      {brandData.product.value_prop.subhead && (
                        <p className="text-sm text-gray-600">{brandData.product.value_prop.subhead}</p>
                      )}
                    </div>
                  )}
                  
                  {brandData.product?.features?.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500">Key Features</span>
                      <ul className="mt-1 space-y-1">
                        {brandData.product.features.slice(0, 5).map((feature: any, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-1">
                            <span className="text-gray-400">•</span>
                            <span>{feature.title || feature}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {brandData.socialProof?.stats && (
                    <div>
                      <span className="text-xs text-gray-500">Social Proof</span>
                      <div className="flex gap-2 mt-1">
                        {Object.entries(brandData.socialProof.stats).map(([key, value]) => (
                          <Badge key={key} variant="outline">
                            {key}: {String(value)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Psychology Tab */}
            <TabsContent value="psychology" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Brand Psychology</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {brandData.psychology?.emotionalProfile && (
                    <div>
                      <span className="text-xs text-gray-500">Emotional Profile</span>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm"><strong>Primary:</strong> {brandData.psychology.emotionalProfile.primaryEmotion}</p>
                        <p className="text-sm"><strong>Energy:</strong> {brandData.psychology.emotionalProfile.energy}</p>
                        <p className="text-sm"><strong>Tone:</strong> {brandData.psychology.emotionalProfile.tone}</p>
                      </div>
                    </div>
                  )}
                  
                  {brandData.psychology?.colorPsychology && (
                    <div>
                      <span className="text-xs text-gray-500">Color Psychology</span>
                      <p className="text-sm mt-1">{brandData.psychology.colorPsychology.meaning}</p>
                      <Badge className="mt-1" style={{ backgroundColor: brandData.psychology.colorPsychology.emotionalColor }}>
                        {brandData.psychology.colorPsychology.emotionalColor}
                      </Badge>
                    </div>
                  )}
                  
                  {brandData.psychology?.persuasionTechniques?.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500">Persuasion Techniques</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {brandData.psychology.persuasionTechniques.map((tech: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {tech}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {brandData.psychology?.trustIndicators?.length > 0 && (
                    <div>
                      <span className="text-xs text-gray-500">Trust Indicators</span>
                      <ul className="mt-1 space-y-1">
                        {brandData.psychology.trustIndicators.slice(0, 5).map((indicator: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-1">
                            <span className="text-green-500">✓</span>
                            <span>{indicator}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Competitors Tab */}
            <TabsContent value="competitors" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Competitive Analysis</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {brandData.competitors?.length > 0 ? (
                    brandData.competitors.map((competitor: any, i: number) => (
                      <div key={i} className="border-b pb-3 last:border-0">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">{competitor.name}</span>
                          <Badge variant={competitor.threat === 'high' ? 'destructive' : 'outline'}>
                            {competitor.threat} threat
                          </Badge>
                        </div>
                        
                        {competitor.differentiators?.length > 0 && (
                          <div className="mb-2">
                            <span className="text-xs text-gray-500">Differentiators</span>
                            <ul className="text-sm mt-1 space-y-1">
                              {competitor.differentiators.map((diff: string, j: number) => (
                                <li key={j} className="flex items-start gap-1">
                                  <span className="text-blue-500">→</span>
                                  <span>{diff}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {competitor.weaknesses?.length > 0 && (
                          <div>
                            <span className="text-xs text-gray-500">Their Weaknesses</span>
                            <ul className="text-sm mt-1 space-y-1">
                              {competitor.weaknesses.map((weak: string, j: number) => (
                                <li key={j} className="flex items-start gap-1">
                                  <span className="text-orange-500">⚠</span>
                                  <span>{weak}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p className="text-sm">No competitor data available yet</p>
                      <p className="text-xs mt-1">Run V4 extraction to analyze competitors</p>
                    </div>
                  )}
                  
                  {brandData.aiAnalysis?.marketPosition && (
                    <div className="mt-4 p-3 bg-blue-50 rounded">
                      <span className="text-xs font-semibold text-blue-700">Market Position</span>
                      <p className="text-sm mt-1">{brandData.aiAnalysis.marketPosition}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Motion Tab */}
            <TabsContent value="motion" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Animation & Motion</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {brandData.animation?.style && (
                    <div>
                      <span className="text-xs text-gray-500">Animation Style</span>
                      <p className="font-medium capitalize">{brandData.animation.style}</p>
                    </div>
                  )}
                  {brandData.animation?.speed && (
                    <div>
                      <span className="text-xs text-gray-500">Animation Speed</span>
                      <p className="font-medium capitalize">{brandData.animation.speed}</p>
                    </div>
                  )}
                  {brandData.animation?.easing && (
                    <div>
                      <span className="text-xs text-gray-500">Easing</span>
                      <p className="font-mono text-sm">{brandData.animation.easing}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Raw JSON Tab */}
            <TabsContent value="raw" className="mt-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Raw Brand Data</CardTitle>
                </CardHeader>
                <CardContent>
                  {isEditing ? (
                    <textarea
                      className="w-full h-96 p-2 font-mono text-xs border rounded bg-gray-50"
                      value={JSON.stringify(editedData, null, 2)}
                      onChange={(e) => {
                        try {
                          setEditedData(JSON.parse(e.target.value));
                        } catch (err) {
                          // Invalid JSON, don't update
                        }
                      }}
                    />
                  ) : (
                    <pre className="text-xs font-mono bg-gray-50 p-3 rounded overflow-x-auto">
                      {JSON.stringify(brandData, null, 2)}
                    </pre>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Evolution Timeline */}
          {brandProfile?.updatedAt && brandProfile?.createdAt && brandProfile.updatedAt !== brandProfile.createdAt && (
            <Card className="mt-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Evolution Timeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Created:</span>
                    <span>{new Date(brandProfile.createdAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Updated:</span>
                    <span>{new Date(brandProfile.updatedAt).toLocaleString()}</span>
                  </div>
                  {brandProfile.lastAnalyzedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Last Analyzed:</span>
                      <span>{new Date(brandProfile.lastAnalyzedAt).toLocaleString()}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
