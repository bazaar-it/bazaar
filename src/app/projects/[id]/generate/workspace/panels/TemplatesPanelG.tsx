"use client";

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react";
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
import { useIntersectionObserver } from "~/hooks/use-intersection-observer";
import { TemplateAdminMenu } from "~/components/templates/TemplateAdminMenu";

type ExtendedTemplateDefinition = TemplateDefinition & {
  previewImage?: string | null;
  tags?: string[];
  sceneCount?: number;
  totalDuration?: number | null;
  adminOnly?: boolean;
};

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
  // Use intersection observer to only compile when visible
  const { ref, hasBeenVisible } = useIntersectionObserver({
    rootMargin: '300px', // Start compiling 300px before visible
    enabled: true,
  });

  const shouldCompile = (!template.isFromDatabase || !template.previewImage) && hasBeenVisible;
  const { component, isCompiling, compilationError, playerProps } = useCompiledTemplate(template, format, { enableCompilation: shouldCompile });

  if (!shouldCompile) {
    if (template.previewImage) {
      return (
        <div ref={ref} className="w-full h-full bg-black">
          <img
            src={template.previewImage}
            alt={`${template.name} preview`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      );
    }

    // Not visible yet - show placeholder
    if (!hasBeenVisible) {
      return (
        <div ref={ref} className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
          <div className="text-center">
            <div className="text-gray-400 text-xs sm:text-sm">Loading...</div>
          </div>
        </div>
      );
    }

    return <div ref={ref} />;
  }

  if (compilationError) {
    return (
      <div ref={ref} className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xs sm:text-sm font-medium">Template Error</div>
          <div className="text-gray-500 text-[10px] sm:text-xs mt-1">Failed to compile</div>
        </div>
      </div>
    );
  }

  if (isCompiling || !component) {
    return (
      <div ref={ref} className="w-full h-full bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-4 sm:h-6 w-4 sm:w-6 animate-spin text-gray-400 mx-auto mb-1 sm:mb-2" />
          <div className="text-gray-500 text-xs sm:text-sm">Compiling...</div>
        </div>
      </div>
    );
  }

  const safeInitialFrame = Math.min(15, Math.floor(template.duration / 2));

  return (
    <div ref={ref} className="w-full h-full">
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
const TemplatePreview = ({
  template,
  onClick,
  isLoading,
  format,
  isTouchDevice,
  projectId,
  isAdmin,
}: {
  template: ExtendedTemplateDefinition;
  onClick: () => void;
  isLoading: boolean;
  format: string;
  isTouchDevice: boolean;
  projectId: string;
  isAdmin: boolean;
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const utils = api.useUtils();
  const isMultiScene = (template.sceneCount ?? 1) > 1;
  const totalDurationFrames = template.totalDuration ?? template.duration;

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

  const handleAdminUpdate = useCallback(() => {
    void utils.templates.getAll.invalidate();
    void utils.templates.getCategories.invalidate();
  }, [utils]);

  const className = `relative w-full ${getAspectRatioClass(format)} bg-black rounded-lg overflow-hidden cursor-pointer transition-all duration-200 group${isTouchDevice ? '' : ' hover:scale-[1.01]'}`;
  const showVideo = !isTouchDevice && isHovered;
  const showInfo = isMultiScene;
  const showFooter = isMultiScene;
  const formattedDuration = `${Math.round((template.duration / 30) * 10) / 10}s`;
  const formattedTotalDuration = `${Math.round(((totalDurationFrames ?? template.duration) / 30) * 10) / 10}s`;

  return (
    <div
      className={className}
      onClick={onClick}
      onMouseEnter={!isTouchDevice ? handleMouseEnter : undefined}
      onMouseLeave={!isTouchDevice ? handleMouseLeave : undefined}
    >
      {showInfo && (
        <div className="absolute top-2 left-2 z-10 flex flex-col gap-1">
          <div className="bg-black/80 text-white text-[10px] sm:text-xs px-2 py-1 rounded-full font-medium shadow-sm max-w-[12rem] truncate">
            {template.sceneCount ?? 1} scenes
          </div>
          <div className="bg-black/70 text-white text-[10px] sm:text-xs px-2 py-1 rounded-full font-medium">
            {formattedTotalDuration}
          </div>
        </div>
      )}

      {isAdmin && template.isFromDatabase && (
        <div className="absolute top-2 right-2 z-20">
          <TemplateAdminMenu
            template={{
              id: template.id,
              name: template.name,
              duration: template.duration,
              category: template.category || null,
            }}
            projectId={projectId}
            onUpdate={handleAdminUpdate}
          />
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
          <div className="text-white text-[10px] sm:text-xs font-medium truncate">
            {template.name}
          </div>
          <div className="text-white/70 text-[10px] sm:text-xs font-medium">
            {isMultiScene ? `${template.sceneCount ?? 1} scenes • ${formattedTotalDuration}` : formattedDuration}
          </div>
          {isAdmin && template.adminOnly && (
            <div className="text-amber-300 text-[10px] sm:text-xs font-medium">Admin only</div>
          )}
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

    let isCancelled = false;
    let blobUrl: string | null = null;

    const compileTemplate = async () => {
      setIsCompiling(true);
      try {
        const code = template.getCode?.();
        if (!code) {
          throw new Error('Template code unavailable');
        }

        const dangerousPatterns = [
          /eval\s*\(/,
          /Function\s*\(/,
          /\.innerHTML\s*=/,
          /document\.write/,
          /window\.location/,
          /__proto__/,
          /constructor\s*\[/,
        ];

        for (const pattern of dangerousPatterns) {
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

        if (!isCancelled) {
          if (module.default && typeof module.default === 'function') {
            setComponent(() => module.default);
            setCompilationError(null);
          } else {
            throw new Error('No default export found in template code');
          }
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
  }, [template, enableCompilation]);

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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);
  const isTouchDevice = useIsTouchDevice();
  const { data: session } = useSession();
  const sessionIsAdmin = session?.user?.isAdmin ?? false;
  // Get tRPC utils for cache invalidation
  const utils = api.useUtils();

  // Get video state methods
  const { addScene } = useVideoState();

  // Get current project format from the specific project (not global currentProjectId)
  const currentFormat = useVideoState(state => state.projects[projectId]?.props?.meta?.format ?? 'landscape');

  // Check if user is admin (fallback to API if session not definitive)
  const { data: adminCheck } = api.admin.checkAdminAccess.useQuery(undefined, {
    enabled: !sessionIsAdmin,
  });
  const apiIsAdmin = adminCheck?.isAdmin === true;
  const isAdmin = sessionIsAdmin || apiIsAdmin;

  // Fetch template categories from server for dynamic chips
  const { data: categoriesData } = api.templates.getCategories.useQuery();

  const categoryOptions = useMemo(
    () => {
      const base: Array<{ key: string; label: string; value?: string }> = [
        { key: 'all', label: 'All', value: undefined },
      ];

      if (categoriesData) {
        for (const category of categoriesData) {
          const rawValue = category.category ?? 'uncategorized';
          const normalizedKey = rawValue.toLowerCase();
          const labelName = category.category
            ? category.category.charAt(0).toUpperCase() + category.category.slice(1)
            : 'Uncategorized';

          base.push({
            key: normalizedKey,
            label: `${labelName} (${category.count})`,
            value: rawValue,
          });
        }
      }

      if (isAdmin) {
        base.push({ key: 'multi', label: 'Multi-scene', value: undefined });
      }

      return base;
    },
    [categoriesData, isAdmin]
  );

  const selectedCategoryOption = useMemo(
    () => categoryOptions.find((option) => option.key === selectedCategory),
    [categoryOptions, selectedCategory]
  );

  const templatesQueryInput = useMemo(
    () => ({
      format: currentFormat,
      limit: 10,
      category:
        selectedCategoryOption &&
        selectedCategoryOption.key !== 'all' &&
        selectedCategoryOption.key !== 'multi'
          ? selectedCategoryOption.value
          : undefined,
    }),
    [currentFormat, selectedCategoryOption]
  );

  // Use infinite query for pagination - only loads 10 at a time
  const {
    data: templatesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingDbTemplates,
  } = api.templates.getAll.useInfiniteQuery(
    templatesQueryInput,
    {
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  // Flatten all pages into a single array
  const databaseTemplates = useMemo(() => {
    return templatesData?.pages.flatMap((page) => page.items) ?? [];
  }, [templatesData]);

  // Infinite scroll trigger - fetch more when scrolling near bottom
  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = loadMoreRef.current;
    if (!element || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          void fetchNextPage();
        }
      },
      { rootMargin: '400px' } // Start loading 400px before reaching the trigger
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  
  // Direct template addition mutation - bypasses LLM pipeline
  const addTemplateMutation = api.generation.addTemplate.useMutation({
    onSuccess: async (result, variables) => {
      setLoadingTemplateId(null);
      const createdScenes = result.scenes ?? [];

      if (result.success && createdScenes.length > 0) {
        const sceneCount = createdScenes.length;
        const defaultMessage = `${variables.templateName}${sceneCount > 1 ? ` (${sceneCount} scenes)` : ''} added`;
        const toastMessage = result.message?.trim() || defaultMessage;
        toast.success(toastMessage);

        console.log('[TemplatesPanelG] Template added successfully:', createdScenes.map((s) => s.id));
        console.log('[TemplatesPanelG] Updating video state directly with', sceneCount, 'scene(s)');

        for (const scene of createdScenes) {
          addScene(projectId, scene);
        }

        const lastSceneId = createdScenes[createdScenes.length - 1]?.id;
        if (onSceneGenerated && lastSceneId) {
          console.log('[TemplatesPanelG] Calling onSceneGenerated callback for', lastSceneId);
          await onSceneGenerated(lastSceneId);
        }

        setTimeout(async () => {
          console.log('[TemplatesPanelG] Invalidating chat messages after template add');
          await utils.chat.getMessages.invalidate({ projectId });
          await utils.templates.getCategories.invalidate();
        }, 100);

        console.log('[TemplatesPanelG] ✅ Video state updated and caches invalidated');
      } else {
        const fallback = 'Failed to add template';
        const rawMessage = result.message?.trim();
        const errorMessage = (() => {
          switch (rawMessage) {
            case 'Template scenes missing':
              return 'Template scenes are missing. Please recreate or delete this template.';
            case 'Template code missing for non-database template':
              return 'Template is incomplete (no code available). Delete and recreate it from a project.';
            default:
              return rawMessage || fallback;
          }
        })();
        console.warn('[TemplatesPanelG] Template add returned without scenes:', result);
        toast.error(errorMessage);
      }
    },
    onError: (error) => {
      setLoadingTemplateId(null);
      console.error('[TemplatesPanelG] Template addition failed:', error);
      toast.error(`Failed to add template: ${error.message}`);
    },
  });

  useEffect(() => {
    if (!isAdmin && selectedCategory === 'multi') {
      setSelectedCategory('all');
    }
  }, [isAdmin, selectedCategory]);

  const trackUsageMutation = api.templates.trackUsage.useMutation();

  const handleAddTemplate = useCallback(async (template: ExtendedTemplateDefinition) => {
    console.log('[TemplatesPanelG] Adding template:', template.name);
    console.log('[TemplatesPanelG] Template object:', template);

    const isMultiScene = (template.sceneCount ?? 1) > 1;
    if (isMultiScene && !isAdmin) {
      toast.error('Multi-scene templates are limited to admin accounts right now.');
      return;
    }

    let templateCode = '';
    if (!isMultiScene) {
      templateCode = template.getCode?.() ?? '';
      if (!templateCode) {
        console.warn('[TemplatesPanelG] Template has no code, aborting add.');
        setLoadingTemplateId(null);
        toast.error('Template preview unavailable right now. Please try again later.');
        return;
      }
      console.log('[TemplatesPanelG] Template code preview:', templateCode.substring(0, 200) + '...');
    }

    setLoadingTemplateId(template.id);

    if (template.isFromDatabase) {
      trackUsageMutation.mutate(template.id);
    }

    const mutationParams: {
      projectId: string;
      templateId: string;
      templateName: string;
      templateCode?: string;
      templateDuration?: number;
    } = {
      projectId,
      templateId: template.id,
      templateName: template.name,
    };

    if (!isMultiScene) {
      mutationParams.templateCode = templateCode;
      mutationParams.templateDuration = template.duration;
    }

    console.log('[TemplatesPanelG] Mutation parameters:', mutationParams);

    addTemplateMutation.mutate(mutationParams);
  }, [projectId, addTemplateMutation, trackUsageMutation, isAdmin]);

  // Combine hardcoded and database templates (DB first, then hardcoded after all pages loaded)
  const combinedTemplates = useMemo<ExtendedTemplateDefinition[]>(() => {
    const dbTemplatesFormatted: ExtendedTemplateDefinition[] = databaseTemplates.map((dbTemplate: any) => ({
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
      sceneCount: dbTemplate.sceneCount ?? 1,
      totalDuration: dbTemplate.totalDuration ?? dbTemplate.duration,
      adminOnly: dbTemplate.adminOnly ?? false,
    }));

    const staticTemplatesFormatted: ExtendedTemplateDefinition[] = (TEMPLATES as ExtendedTemplateDefinition[]).map((template) => ({
      ...template,
      sceneCount: template.sceneCount ?? 1,
      totalDuration: template.totalDuration ?? template.duration,
      adminOnly: template.adminOnly ?? false,
    }));

    const shouldShowHardcoded = !hasNextPage && !isFetchingNextPage;
    return shouldShowHardcoded
      ? [...dbTemplatesFormatted, ...staticTemplatesFormatted]
      : dbTemplatesFormatted;
  }, [databaseTemplates, hasNextPage, isFetchingNextPage]);

  const isInitialLoading = isLoadingDbTemplates && databaseTemplates.length === 0;

  // Filter templates based on search and format compatibility
  const filteredTemplates = useMemo(() => {
    let templates = combinedTemplates;
    if (!isAdmin) {
      templates = templates.filter((template) => (template.sceneCount ?? 1) <= 1 && !template.adminOnly);
    }

    if (selectedCategoryOption && selectedCategoryOption.key !== 'all') {
      if (selectedCategoryOption.key === 'multi') {
        templates = templates.filter((t) => (t.sceneCount ?? 1) > 1);
      } else {
        const normalizedSelected = (selectedCategoryOption.value ?? selectedCategoryOption.key).toLowerCase();
        templates = templates.filter((t) => {
          const templateCategory = (t.category ?? 'uncategorized').toLowerCase();
          return templateCategory === normalizedSelected;
        });
      }
    }

    templates = templates.filter((template) => {
      if (!template.supportedFormats || template.supportedFormats.length === 0) return true;
      return template.supportedFormats.includes(currentFormat);
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      templates = templates.filter((template) => template.name.toLowerCase().includes(q));
    }

    return templates;
  }, [searchQuery, currentFormat, combinedTemplates, selectedCategoryOption, isAdmin]);

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
          {categoryOptions.map((c) => (
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
              projectId={projectId}
              isAdmin={isAdmin}
            />
          </Card>
        ))}
      </div>
    )}

        {filteredTemplates.length === 0 && !isInitialLoading && (
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

        {/* Infinite scroll trigger */}
        {hasNextPage && (
          <div ref={loadMoreRef} className="py-4 text-center">
            {isFetchingNextPage && (
              <Loader2 className="h-6 w-6 animate-spin text-gray-400 mx-auto" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
