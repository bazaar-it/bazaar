"use client";

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Input } from "~/components/ui/input";
import { Card } from "~/components/ui/card";
import { SearchIcon, Loader2 } from "lucide-react";
import { api } from "~/trpc/react";
import { toast } from "sonner";
import { TEMPLATES, type TemplateDefinition } from "~/templates/registry";
import { Player } from "@remotion/player";
import { useVideoState } from "~/stores/videoState";
import { transform } from 'sucrase';
import { useIsTouchDevice } from "~/hooks/use-is-touch";
import { dangerousTemplatePatterns, inferTemplateComponentName, wrapCompiledTemplateModule } from "./template-code-utils";

type ExtendedTemplateDefinition = TemplateDefinition & {
  previewImage?: string | null;
  tags?: string[];
  compiledCode?: string | null;
  compiledAt?: string | null;
};

const compiledComponentCache = new Map<string, React.ComponentType>();

interface TemplatesPanelGProps {
  projectId: string;
  onSceneGenerated?: (sceneId: string) => Promise<void>;
}

// Get dimensions based on format
const getFormatDimensions = (format: string) => {
  switch (format) {
    case 'portrait':
      return { width: 1080, height: 1920 };
    case 'square':
      return { width: 1080, height: 1080 };
    case 'landscape':
    default:
      return { width: 1920, height: 1080 };
  }
};

// Get aspect ratio class based on format
const getAspectRatioClass = (format: string) => {
  switch (format) {
    case 'portrait':
      return 'aspect-[9/16]'; // 9:16 for portrait
    case 'square':
      return 'aspect-square'; // 1:1 for square
    case 'landscape':
    default:
      return 'aspect-video'; // 16:9 for landscape
  }
};

// Template thumbnail showing frame 15 by default
const TemplateThumbnail = ({ template, format, isTouchDevice = false }: { template: ExtendedTemplateDefinition; format: string; isTouchDevice?: boolean }) => {
  const shouldCompile = !template.isFromDatabase || !template.previewImage;
  const { component, isCompiling, compilationError, playerProps } = useCompiledTemplate(template, format, { enableCompilation: shouldCompile });

  if (!shouldCompile) {
    if (template.previewImage) {
      return (
        <div className="w-full h-full bg-black">
          <img
            src={template.previewImage}
            alt={`${template.name} preview`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      );
    }

    // Should not happen because shouldCompile would be true when previewImage missing
    return null;
  }

  if (compilationError) {
    return (
      <div className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xs sm:text-sm font-medium">Template Error</div>
          <div className="text-gray-500 text-[10px] sm:text-xs mt-1">Failed to compile</div>
        </div>
      </div>
    );
  }

  if (isCompiling || !component) {
    return (
      <div className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-4 sm:h-6 w-4 sm:w-6 animate-spin text-gray-400 mx-auto mb-1 sm:mb-2" />
          <div className="text-gray-500 text-xs sm:text-sm">Compiling...</div>
        </div>
      </div>
    );
  }

  const safeInitialFrame = Math.min(15, Math.floor(template.duration / 2));

  return (
    <div className="w-full h-full">
      <Player
        component={playerProps?.component || component}
        durationInFrames={playerProps?.durationInFrames || 150}
        fps={playerProps?.fps || 30}
        compositionWidth={playerProps?.compositionWidth || 1920}
        compositionHeight={playerProps?.compositionHeight || 1080}
        controls={false}
        showVolumeControls={false}
        autoPlay={false}
        initialFrame={safeInitialFrame}
        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      />
    </div>
  );
};

// Template video player for hover state
const TemplateVideoPlayer = ({ template, format }: { template: ExtendedTemplateDefinition; format: string }) => {
  const { component, isCompiling, compilationError, playerProps } = useCompiledTemplate(template, format);

  if (compilationError || isCompiling || !component) {
    return <TemplateThumbnail template={template} format={format} />;
  }

  return (
    <div className="w-full h-full">
      <Player
        component={playerProps?.component || component}
        durationInFrames={playerProps?.durationInFrames || 150}
        fps={playerProps?.fps || 30}
        compositionWidth={playerProps?.compositionWidth || 1920}
        compositionHeight={playerProps?.compositionHeight || 1080}
        controls={false}
        showVolumeControls={false}
        autoPlay={true}
        loop={true}
        style={{ width: '100%', height: '100%', pointerEvents: 'none' }}
      />
    </div>
  );
};

// Template preview component with thumbnail/video toggle
const TemplatePreview = ({ template, onClick, isLoading, format, isTouchDevice }: { 
  template: ExtendedTemplateDefinition; 
  onClick: () => void;
  isLoading: boolean;
  format: string;
  isTouchDevice: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    if (!isTouchDevice) {
      setIsHovered(true);
    }
  }, [isTouchDevice]);

  const handleMouseLeave = useCallback(() => {
    if (!isTouchDevice) {
      setIsHovered(false);
    }
  }, [isTouchDevice]);

  const className = `relative w-full ${getAspectRatioClass(format)} bg-black rounded-lg overflow-hidden cursor-pointer transition-all duration-200 group${isTouchDevice ? '' : ' hover:scale-[1.01]'}`;
  const showVideo = !isTouchDevice && isHovered;
  const showInfo = false;
  const showFooter = true;
  const formattedDuration = `${Math.round((template.duration / 30) * 10) / 10}s`;

  return (
    <div 
      className={className}
      onClick={onClick}
      onMouseEnter={!isTouchDevice ? handleMouseEnter : undefined}
      onMouseLeave={!isTouchDevice ? handleMouseLeave : undefined}
    >
      {showInfo && (
        <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between gap-2">
          <div className="bg-white/90 text-gray-900 text-[10px] sm:text-xs px-2 py-1 rounded-full font-medium shadow-sm max-w-[70%] truncate">
            {template.name}
          </div>
          <div className="bg-gray-900/80 text-white text-[10px] sm:text-xs px-2 py-1 rounded-full font-medium">
            {formattedDuration}
          </div>
        </div>
      )}

      <div className="absolute inset-0">
        {showVideo ? (
          <TemplateVideoPlayer template={template} format={format} />
        ) : (
          <TemplateThumbnail template={template} format={format} isTouchDevice={isTouchDevice} />
        )}
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
          <div className="bg-white/90 rounded-full p-3 shadow-lg">
            <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
          </div>
        </div>
      )}

      {showFooter && !isLoading && (
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-2 sm:p-3 z-10 space-y-1">
          <div className="text-white/70 text-[10px] sm:text-xs font-medium">
            {formattedDuration}
          </div>
        </div>
      )}

    </div>
  );
};

// Real template compilation component  
const useCompiledTemplate = (
  template: ExtendedTemplateDefinition,
  format: string = 'landscape',
  options?: { enableCompilation?: boolean }
) => {
  const { enableCompilation = true } = options ?? {};
  const dimensions = getFormatDimensions(format);

  if (!template.isFromDatabase && template.component) {
    return {
      component: template.component,
      isCompiling: false,
      compilationError: null,
      playerProps: {
        component: template.component,
        durationInFrames: template.duration,
        fps: 30,
        compositionWidth: dimensions.width,
        compositionHeight: dimensions.height,
      }
    };
  }

  const [component, setComponent] = useState<React.ComponentType | null>(null);
  const [isCompiling, setIsCompiling] = useState(enableCompilation);
  const [compilationError, setCompilationError] = useState<Error | null>(null);

  useEffect(() => {
    if (!template.isFromDatabase) {
      setIsCompiling(false);
      return;
    }

    if (!enableCompilation) {
      setComponent(null);
      setIsCompiling(false);
      setCompilationError(null);
      return;
    }

    const cacheKey = `${template.id}-${format}`;
    const cached = compiledComponentCache.get(cacheKey);
    if (cached) {
      setComponent(() => cached);
      setCompilationError(null);
      setIsCompiling(false);
      return;
    }

    let isCancelled = false;
    let blobUrl: string | null = null;

    const compileTemplate = async () => {
      setIsCompiling(true);
      try {
        let loadedComponent: React.ComponentType | null = null;

        if (template.compiledCode) {
          const componentName = inferTemplateComponentName(
            template.compiledCode,
            template.name || template.id || 'TemplateComponent'
          );
          const moduleCode = wrapCompiledTemplateModule(template.compiledCode, componentName);
          const blob = new Blob([moduleCode], { type: 'application/javascript' });
          blobUrl = URL.createObjectURL(blob);
          const module = await import(/* webpackIgnore: true */ blobUrl);
          loadedComponent = module.default ?? null;
        } else {
          const code = template.getCode?.();
          if (!code) {
            throw new Error('Template code unavailable');
          }

          for (const pattern of dangerousTemplatePatterns) {
            if (pattern.test(code)) {
              throw new Error(`Security: Template contains potentially dangerous code pattern: ${pattern}`);
            }
          }

          const { code: transformed } = transform(code, {
            transforms: ['typescript', 'jsx'],
            jsxRuntime: 'classic',
            production: false,
          });

          const blob = new Blob([transformed], {
            type: 'application/javascript'
          });
          blobUrl = URL.createObjectURL(blob);

          const module = await import(/* webpackIgnore: true */ blobUrl);
          loadedComponent = module.default ?? null;
        }

        if (!loadedComponent || typeof loadedComponent !== 'function') {
          throw new Error('No default export found in template code');
        }

        if (!isCancelled) {
          compiledComponentCache.set(cacheKey, loadedComponent);
          setComponent(() => loadedComponent);
          setCompilationError(null);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Failed to compile database template:', error);
          setCompilationError(error as Error);
        }
      } finally {
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
        if (!isCancelled) {
          setIsCompiling(false);
        }
      }
    };

    compileTemplate();

    return () => {
      isCancelled = true;
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [template, enableCompilation, format]);

  return {
    component,
    isCompiling,
    compilationError,
    playerProps: component ? {
      component,
      durationInFrames: template.duration,
      fps: 30,
      compositionWidth: dimensions.width,
      compositionHeight: dimensions.height,
    } : null
  };
};

export default function TemplatesPanelG({ projectId, onSceneGenerated }: TemplatesPanelGProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'colors' | 'ui' | 'text' | 'other'>("all");
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);
  const isTouchDevice = useIsTouchDevice();
  
  // Get tRPC utils for cache invalidation
  const utils = api.useUtils();
  
  // Get video state methods
  const { addScene, getCurrentProps } = useVideoState();
  
  // Get current project format
  const currentFormat = getCurrentProps()?.meta?.format ?? 'landscape';
  
  // Client-side cache for DB templates to prevent flicker and speed up initial paint
  const cacheKey = `templates-cache-${currentFormat}`;
  const [cachedDbTemplates, setCachedDbTemplates] = useState<any[]>([]);

  useEffect(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          setCachedDbTemplates(parsed);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey]);

  // Fetch database templates with a generous stale time; use cached as placeholder to avoid reorder flash
  const placeholderFromCache = useMemo(
    () => (cachedDbTemplates.length ? cachedDbTemplates : undefined),
    [cachedDbTemplates]
  );

  const { data: databaseTemplates = [], isLoading: isLoadingDbTemplates } = api.templates.getAll.useQuery(
    { format: currentFormat, limit: 100 },
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      placeholderData: (previousData) => previousData ?? placeholderFromCache,
    }
  );

  // Persist latest DB templates to cache
  useEffect(() => {
    try {
      if (databaseTemplates && databaseTemplates.length) {
        localStorage.setItem(cacheKey, JSON.stringify(databaseTemplates));
        // Update in-memory cache too so next re-render uses the same ordering
        setCachedDbTemplates(databaseTemplates);
      }
    } catch {}
  }, [databaseTemplates, cacheKey]);

  // Classify a template into coarse categories for filtering
  const classifyCategory = useCallback((t: ExtendedTemplateDefinition): 'colors' | 'ui' | 'text' | 'other' => {
    const raw = (t.category || '').toLowerCase();
    const name = (t.name || '').toLowerCase();
    const hay = `${raw} ${name}`;
    if (/color|gradient|bg|background/.test(hay)) return 'colors';
    if (/ui|app|card|button|form|login|signup|screen/.test(hay)) return 'ui';
    if (/text|word|type|typography/.test(hay)) return 'text';
    return 'other';
  }, []);
  
  // Direct template addition mutation - bypasses LLM pipeline
  const addTemplateMutation = api.generation.addTemplate.useMutation({
    onSuccess: async (result) => {
      setLoadingTemplateId(null);
      if (result.success && result.scene) {
        // Only show toast if there's a message
        if (result.message?.trim()) {
          toast.success(`${result.message}`);
        }
        console.log('[TemplatesPanelG] Template added successfully:', result.scene);
        
        // 🚨 CRITICAL: Update video state directly for immediate UI update
        console.log('[TemplatesPanelG] Updating video state directly...');
        
        // Add the scene to video state (addScene checks for duplicates internally)
        addScene(projectId, result.scene);
        
        // Note: The server already creates the "Added template:" message in the database
        // so we don't need to create it client-side to avoid duplicates
        
        // Call the callback first, before cache invalidation to prevent double refresh
        if (onSceneGenerated && result.scene?.id) {
          console.log('[TemplatesPanelG] Calling onSceneGenerated callback...');
          await onSceneGenerated(result.scene.id);
        }
        
        // Minimize preview re-renders: we already updated local VideoState optimistically
        // Only invalidate chat messages (server adds a message). Skip scenes invalidate here.
        setTimeout(async () => {
          console.log('[TemplatesPanelG] Invalidating chat messages (skip scenes to avoid double refresh)...');
          await utils.chat.getMessages.invalidate({ projectId });
        }, 100);
        
        console.log('[TemplatesPanelG] ✅ Video state updated and caches invalidated');
      } else {
        toast.error("Failed to add template");
      }
    },
    onError: (error) => {
      setLoadingTemplateId(null);
      console.error('[TemplatesPanelG] Template addition failed:', error);
      toast.error(`Failed to add template: ${error.message}`);
    },
  });

  // Track template usage mutation
  const trackUsageMutation = api.templates.trackUsage.useMutation();
  
  // Handle template addition
  const handleAddTemplate = useCallback(async (template: ExtendedTemplateDefinition) => {
    console.log('[TemplatesPanelG] Adding template:', template.name);
    console.log('[TemplatesPanelG] Template object:', template);
    const templateCode = template.getCode?.() ?? '';
    if (!templateCode) {
      console.warn('[TemplatesPanelG] Template has no code, aborting add.');
      setLoadingTemplateId(null);
      toast.error('Template preview unavailable right now. Please try again later.');
      return;
    }

    console.log('[TemplatesPanelG] Template code preview:', templateCode.substring(0, 200) + '...');
    
    setLoadingTemplateId(template.id);
    
    // Track usage if it's a database template
    if (template.isFromDatabase) {
      trackUsageMutation.mutate(template.id);
    }
    
    const mutationParams = {
      projectId,
      templateId: template.id,
      templateName: template.name,
      templateCode,
      templateDuration: template.duration,
    };
    
    console.log('[TemplatesPanelG] Mutation parameters:', mutationParams);
    
    addTemplateMutation.mutate(mutationParams);
  }, [projectId, addTemplateMutation, trackUsageMutation]);

  // Combine hardcoded and database templates (DB sorted by newest first)
  const combinedTemplates = useMemo<ExtendedTemplateDefinition[]>(() => {
    // Prefer freshly fetched DB templates; fall back to cached when loading
    const sourceDb = (databaseTemplates && databaseTemplates.length) ? databaseTemplates : cachedDbTemplates;
    // Sort DB templates by createdAt desc if present
    const dbSorted = [...(sourceDb || [])].sort((a: any, b: any) => {
      const ad = a?.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bd = b?.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bd - ad;
    });
    const dbTemplatesFormatted: ExtendedTemplateDefinition[] = dbSorted.map((dbTemplate: any) => ({
      id: dbTemplate.id,
      name: dbTemplate.name,
      duration: dbTemplate.duration,
      previewFrame: dbTemplate.previewFrame || 15,
      component: null,
      getCode: () => dbTemplate.tsxCode,
      supportedFormats: dbTemplate.supportedFormats as ('landscape' | 'portrait' | 'square')[],
      isFromDatabase: true,
      isOfficial: dbTemplate.isOfficial,
      category: dbTemplate.category,
      creator: dbTemplate.creator,
      previewImage: dbTemplate.thumbnailUrl ?? null,
      tags: dbTemplate.tags ?? [],
      compiledCode: dbTemplate.jsCode ?? null,
      compiledAt: dbTemplate.jsCompiledAt ?? null,
    }));
    // DB templates first (newest first), then hardcoded
    return [...dbTemplatesFormatted, ...TEMPLATES] as ExtendedTemplateDefinition[];
  }, [databaseTemplates, cachedDbTemplates]);

  // Optional: simple skeleton to avoid jarring reorder on first open without cache
  const isInitialLoading = isLoadingDbTemplates && cachedDbTemplates.length === 0;
  
  // Filter templates based on search and format compatibility
  const filteredTemplates = useMemo(() => {
    let templates = combinedTemplates;
    // Category filter
    if (selectedCategory !== 'all') {
      templates = templates.filter(t => classifyCategory(t) === selectedCategory);
    }
    // Format compatibility
    templates = templates.filter(template => {
      if (!template.supportedFormats || template.supportedFormats.length === 0) return true;
      return template.supportedFormats.includes(currentFormat);
    });
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      templates = templates.filter(template => template.name.toLowerCase().includes(q));
    }
    return templates;
  }, [searchQuery, currentFormat, combinedTemplates, selectedCategory, classifyCategory]);

  // Get grid columns based on format for better layout
  const getGridColumns = (format: string) => {
    switch (format) {
      case 'portrait':
        // Portrait videos - make cards 3x larger with fewer columns
        return 'grid-cols-1 sm:grid-cols-1 lg:grid-cols-2';
      case 'square':
        // Square videos - make cards larger with fewer columns
        return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-2';
      case 'landscape':
      default:
        // Landscape videos - make cards larger with 2 columns
        return 'grid-cols-2 sm:grid-cols-2 lg:grid-cols-2';
    }
  };
  
  return (
    <div className="flex flex-col h-full bg-white">
      {/* Search */}
      <div className="flex-none p-2 border-b space-y-2">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        {/* Category chips */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { key: 'all', label: 'All' },
            { key: 'colors', label: 'Colors' },
            { key: 'ui', label: 'UI' },
            { key: 'text', label: 'Text' },
            { key: 'other', label: 'Other' },
          ].map((c: any) => (
            <button
              key={c.key}
              onClick={() => setSelectedCategory(c.key)}
              className={`px-2 py-1 text-xs rounded-full border ${selectedCategory === c.key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Templates Grid - Mobile-responsive grid with format-aware columns */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Format indicator */}
        <div className="mb-3 px-1">
          <div className="text-xs text-gray-500">
            Showing templates compatible with <span className="font-medium text-gray-700">
              {currentFormat === 'landscape' ? 'Landscape (16:9)' : 
               currentFormat === 'portrait' ? 'Portrait (9:16)' : 
               'Square (1:1)'}
            </span> format
          </div>
        </div>
        {isInitialLoading ? (
          <div className="grid gap-2 sm:gap-3 grid-cols-2 sm:grid-cols-2 lg:grid-cols-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-36 rounded-lg border bg-gray-50 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className={`grid gap-2 sm:gap-3 ${getGridColumns(currentFormat)}`}>
            {filteredTemplates.map((template) => (
              <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow p-0">
                {/* Clickable Full-Size Preview with correct aspect ratio */}
                <TemplatePreview 
                  template={template} 
                  onClick={() => handleAddTemplate(template)}
                  isLoading={loadingTemplateId === template.id}
                  format={currentFormat}
                  isTouchDevice={isTouchDevice}
                />
              </Card>
            ))}
          </div>
        )}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-6 text-gray-500">
            <SearchIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No templates found</p>
            {searchQuery ? (
              <p className="text-xs mt-1">Try a different search term</p>
            ) : (
              <p className="text-xs mt-1">No templates available for {currentFormat} format</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
