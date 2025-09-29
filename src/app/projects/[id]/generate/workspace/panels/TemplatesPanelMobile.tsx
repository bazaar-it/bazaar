"use client";

import React, {useState, useMemo, useCallback, useEffect, useRef} from "react";
import {useSession} from "next-auth/react";
import {Card} from "~/components/ui/card";
import {Button} from "~/components/ui/button";
import {Input} from "~/components/ui/input";
import {SearchIcon, Loader2, X as XIcon} from "lucide-react";
import {api} from "~/trpc/react";
import {toast} from "sonner";
import {TEMPLATES} from "~/templates/registry";
import {getCompiledTemplate} from "~/templates/compiled-templates";
import {useVideoState} from "~/stores/videoState";
import {Player, type PlayerRef} from "@remotion/player";
import {transform} from "sucrase";
import {
  dangerousTemplatePatterns,
  inferTemplateComponentName,
  wrapCompiledTemplateModule,
} from "./template-code-utils";

const MOBILE_PAGE_SIZE = 6;

if (typeof window !== "undefined") {
  (window as any).React = (window as any).React ?? React;
}

interface TemplatesPanelMobileProps {
  projectId: string;
  onSceneGenerated?: (sceneId: string) => Promise<void>;
}

type MobileTemplate = {
  id: string;
  name: string;
  duration: number;
  previewFrame: number;
  supportedFormats?: ('landscape' | 'portrait' | 'square')[];
  component: React.ComponentType | null;
  getCode: () => string | null;
  previewImage?: string | null;
  category?: string | null;
  tags?: string[];
  isFromDatabase?: boolean;
  compiledCode?: string | null;
  sceneCount?: number;
  totalDuration?: number | null;
  adminOnly?: boolean;
};

const getFormatDimensions = (format: string) => {
  switch (format) {
    case "portrait":
      return {width: 1080, height: 1920};
    case "square":
      return {width: 1080, height: 1080};
    case "landscape":
    default:
      return {width: 1920, height: 1080};
  }
};

const getAspectRatioClass = (format: string) => {
  switch (format) {
    case "portrait":
      return "aspect-[9/16]";
    case "square":
      return "aspect-square";
    case "landscape":
    default:
      return "aspect-video";
  }
};

const compiledComponentCache: Map<string, React.ComponentType> = typeof window !== "undefined"
  ? ((window as any).__bazaarTemplateComponentCache ?? ((window as any).__bazaarTemplateComponentCache = new Map()))
  : new Map();

const useCompiledTemplate = (template: MobileTemplate, format: string, options?: {enableCompilation?: boolean}) => {
  const enableCompilation = options?.enableCompilation ?? true;
  const dimensions = getFormatDimensions(format);
  const [component, setComponent] = useState<React.ComponentType | null>(null);
  const [isCompiling, setIsCompiling] = useState(enableCompilation);
  const [compilationError, setCompilationError] = useState<string | null>(null);

  useEffect(() => {
    if (!enableCompilation) {
      setComponent(null);
      setIsCompiling(false);
      return;
    }

    if (!template.isFromDatabase && template.component) {
      setComponent(() => template.component);
      setCompilationError(null);
      setIsCompiling(false);
      return;
    }

    const cached = compiledComponentCache.get(template.id);
    if (cached) {
      setComponent(() => cached);
      setCompilationError(null);
      setIsCompiling(false);
      return;
    }

    let blobUrl: string | null = null;
    let cancelled = false;

    const compile = async () => {
      try {
        let compiledJs = template.compiledCode ?? null;
        let componentName = "TemplateComponent";

        if (compiledJs) {
          componentName = inferTemplateComponentName(compiledJs, template.name || template.id || "Template");
        } else {
          const code = template.getCode?.();
          if (!code) {
            throw new Error("Template code unavailable");
          }

          for (const pattern of dangerousTemplatePatterns) {
            if (pattern.test(code)) {
              throw new Error(`Template code contains unsafe pattern: ${pattern}`);
            }
          }

          const {code: transformed} = transform(code, {
            transforms: ["typescript", "jsx"],
            jsxRuntime: "classic",
            production: false,
          });

          componentName = inferTemplateComponentName(code, template.name || template.id || "Template");
          compiledJs = transformed
            .replace(/export\s+default\s+function\s+(\w+)/g, 'function $1')
            .replace(/export\s+default\s+(\w+);?\s*/g, '')
            .replace(/export\s+const\s+(\w+)\s*=\s*([^;]+);?/g, 'const $1 = $2;');
        }

        if (!compiledJs) {
          throw new Error("Unable to compile template");
        }

        const moduleCode = wrapCompiledTemplateModule(compiledJs, componentName);
        const blob = new Blob([moduleCode], {type: "application/javascript"});
        blobUrl = URL.createObjectURL(blob);
        const mod = await import(/* webpackIgnore: true */ blobUrl);
        const Comp = mod.default;
        if (!Comp || typeof Comp !== "function") {
          throw new Error("Compiled template missing default export");
        }

        compiledComponentCache.set(template.id, Comp);
        if (!cancelled) {
          setComponent(() => Comp);
          setCompilationError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setComponent(null);
          setCompilationError(err instanceof Error ? err.message : String(err));
        }
      } finally {
        if (!cancelled) {
          setIsCompiling(false);
        }
        if (blobUrl) {
          URL.revokeObjectURL(blobUrl);
        }
      }
    };

    compile();

    return () => {
      cancelled = true;
    };
  }, [enableCompilation, template.compiledCode, template.id, template.isFromDatabase, template.name, template.getCode]);

  const playerProps = component
    ? {
        component,
        durationInFrames: template.duration,
        fps: 30,
        compositionWidth: dimensions.width,
        compositionHeight: dimensions.height,
      }
    : null;

  return {component, isCompiling, compilationError, playerProps};
};

const TemplateThumbnail: React.FC<{template: MobileTemplate; format: string}> = ({template, format}) => {
  if (template.previewImage) {
    return (
      <div className="w-full h-full bg-black">
        <img
          src={template.previewImage}
          alt="Template preview"
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </div>
    );
  }

  const {component, isCompiling, compilationError, playerProps} = useCompiledTemplate(template, format, {
    enableCompilation: true,
  });

  if (compilationError) {
    return (
      <div className="w-full h-full rounded-lg border border-white/5 bg-slate-800 flex items-center justify-center px-4 text-center text-xs text-white/70">
        Preview unavailable
      </div>
    );
  }

  if (!component || !playerProps || isCompiling) {
    return (
      <div className="w-full h-full rounded-lg border border-white/5 bg-gradient-to-br from-slate-700 via-slate-600 to-slate-700 flex items-center justify-center">
        <span className="text-[11px] font-medium uppercase tracking-wide text-white/70">Tap to preview</span>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <Player
        component={playerProps.component}
        durationInFrames={playerProps.durationInFrames}
        fps={playerProps.fps}
        compositionWidth={playerProps.compositionWidth}
        compositionHeight={playerProps.compositionHeight}
        controls={false}
        autoPlay={false}
        loop={false}
        showVolumeControls={false}
        initialFrame={Math.max(0, Math.min(template.previewFrame ?? 15, template.duration - 1))}
        style={{width: "100%", height: "100%"}}
        acknowledgeRemotionLicense
      />
    </div>
  );
};

const TemplateVideoPlayer: React.FC<{template: MobileTemplate; format: string}> = ({template, format}) => {
  const {component, isCompiling, compilationError, playerProps} = useCompiledTemplate(template, format, {
    enableCompilation: true,
  });
  const playerRef = useRef<PlayerRef>(null);

  useEffect(() => {
    if (!playerProps || !playerRef.current) return;
    const ref = playerRef.current;
    // Seek close to the preview frame to show relevant content.
    const fps = playerProps.fps || 30;
    const frame = Math.max(0, Math.min(template.previewFrame ?? 15, template.duration - 1));
    ref.seekTo(frame);
    const id = window.setTimeout(() => {
      ref.play();
    }, 50);
    return () => {
      window.clearTimeout(id);
    };
  }, [playerProps, template.previewFrame, template.duration]);

  if (compilationError) {
    return (
      <div className="bg-red-50 text-red-500 p-4 text-sm rounded-lg text-center">
        {compilationError}
      </div>
    );
  }

  if (isCompiling || !component || !playerProps) {
    return (
      <div className="flex h-64 items-center justify-center bg-slate-900 text-white/70">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full overflow-hidden">
      <Player
        ref={playerRef}
        component={playerProps.component}
        durationInFrames={playerProps.durationInFrames}
        fps={playerProps.fps}
        compositionWidth={playerProps.compositionWidth}
        compositionHeight={playerProps.compositionHeight}
        controls={false}
        loop
        autoPlay
        renderLoading={() => (
          <div className="flex h-64 items-center justify-center bg-slate-900 text-white/70">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        )}
        style={{width: "100%", height: "100%"}}
        acknowledgeRemotionLicense
      />
    </div>
  );
};

const MobileTemplateCard: React.FC<{template: MobileTemplate; format: string; onSelect: () => void; adminView?: boolean}> = ({template, format, onSelect, adminView = false}) => {
  const baseDuration = `${Math.round((template.duration / 30) * 10) / 10}s`;
  const totalDuration = `${Math.round(((template.totalDuration ?? template.duration) / 30) * 10) / 10}s`;
  const isMultiScene = (template.sceneCount ?? 1) > 1;

  return (
    <Card className="overflow-hidden" onClick={onSelect}>
      <div
        className={`relative w-full ${
          format === 'portrait'
            ? 'aspect-[9/16] max-h-[260px]'
            : format === 'square'
            ? 'aspect-square max-h-[240px]'
            : 'aspect-video max-h-[220px]'
        } bg-black`}
      >
        <TemplateThumbnail template={template} format={format} />
        <div className="absolute bottom-2 left-2 flex flex-wrap items-center gap-1">
          <span className="bg-black/80 text-white text-[10px] px-2 py-1 rounded-full">
            {isMultiScene ? totalDuration : baseDuration}
          </span>
          {isMultiScene && (
            <span className="bg-black/70 text-white/80 text-[10px] px-2 py-1 rounded-full">
              {(template.sceneCount ?? 1)} scenes
            </span>
          )}
          {adminView && template.adminOnly && (
            <span className="bg-amber-500/90 text-white text-[10px] px-2 py-1 rounded-full">Admin only</span>
          )}
        </div>
      </div>
    </Card>
  );
};

const TemplatesPanelMobile: React.FC<TemplatesPanelMobileProps> = ({projectId, onSceneGenerated}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'colors' | 'ui' | 'text' | 'other' | 'multi'>("all");
  const [loadingTemplateId, setLoadingTemplateId] = useState<string | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<MobileTemplate | null>(null);
  const [visibleCount, setVisibleCount] = useState(MOBILE_PAGE_SIZE);
  const {data: session} = useSession();
  const isAdmin = session?.user?.isAdmin ?? false;

  const utils = api.useUtils();
  const {addScene, getCurrentProps} = useVideoState();
  const currentFormat = getCurrentProps()?.meta?.format ?? 'landscape';

  useEffect(() => {
    if (!previewTemplate) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [previewTemplate]);

  useEffect(() => {
    if (!isAdmin && selectedCategory === 'multi') {
      setSelectedCategory('all');
    }
  }, [isAdmin, selectedCategory]);

  const {data: databaseTemplates = [], isLoading} = api.templates.getAll.useQuery(
    {format: currentFormat, limit: 100},
    {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
    }
  );

  const categoryOptions = useMemo(() => {
    const base = [
      {key: 'all', label: 'All'},
      {key: 'colors', label: 'Colors'},
      {key: 'ui', label: 'UI'},
      {key: 'text', label: 'Text'},
      {key: 'other', label: 'Other'},
    ];

    if (isAdmin) {
      return [
        {key: 'all', label: 'All'},
        {key: 'multi', label: 'Multi-scene'},
        {key: 'colors', label: 'Colors'},
        {key: 'ui', label: 'UI'},
        {key: 'text', label: 'Text'},
        {key: 'other', label: 'Other'},
      ];
    }

    return base;
  }, [isAdmin]);

  const combinedTemplates = useMemo<MobileTemplate[]>(() => {
    const dbFormatted: MobileTemplate[] = (databaseTemplates || []).map((t: any) => ({
      id: t.id,
      name: t.name,
      duration: t.duration ?? 150,
      previewFrame: t.previewFrame ?? 15,
      supportedFormats: t.supportedFormats as ('landscape' | 'portrait' | 'square')[] | undefined,
      component: null,
      previewImage: t.thumbnailUrl ?? null,
      category: t.category ?? null,
      tags: Array.isArray(t.tags) ? t.tags : [],
      getCode: () => (t.tsxCode ?? null),
      isFromDatabase: true,
      compiledCode: t.jsCode ?? null,
      sceneCount: t.sceneCount ?? 1,
      totalDuration: t.totalDuration ?? t.duration ?? 150,
      adminOnly: t.adminOnly ?? false,
    }));

    const registryFormatted: MobileTemplate[] = TEMPLATES.map((t) => ({
      id: t.id,
      name: t.name,
      duration: t.duration,
      previewFrame: t.previewFrame ?? 15,
      supportedFormats: t.supportedFormats,
      component: t.component ?? null,
      previewImage: undefined,
      category: (t as any).category ?? null,
      tags: Array.isArray((t as any).tags) ? (t as any).tags : [],
      getCode: () => t.getCode(),
      isFromDatabase: false,
      compiledCode: getCompiledTemplate(t.id) ?? null,
    }));

    return [...dbFormatted, ...registryFormatted];
  }, [databaseTemplates]);

  const filteredTemplates = useMemo(() => {
    let templates = combinedTemplates;

    if (!isAdmin) {
      templates = templates.filter((t) => (t.sceneCount ?? 1) <= 1);
    }

    if (selectedCategory !== 'all') {
      if (selectedCategory === 'multi') {
        templates = templates.filter((t) => (t.sceneCount ?? 1) > 1);
      } else {
        templates = templates.filter((t) => {
          const hay = `${t.category || ''} ${t.name || ''}`.toLowerCase();
          switch (selectedCategory) {
            case 'colors':
              return /color|gradient|bg|background/.test(hay);
            case 'ui':
              return /ui|app|card|button|form|login|signup|screen/.test(hay);
            case 'text':
              return /text|type|word|typography/.test(hay);
            default:
              return true;
          }
        });
      }
    }

    templates = templates.filter((t) => {
      if (!t.supportedFormats?.length) return true;
      return t.supportedFormats.includes(currentFormat);
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      templates = templates.filter((t) => t.name.toLowerCase().includes(q));
    }

    return templates;
  }, [combinedTemplates, selectedCategory, currentFormat, searchQuery, isAdmin]);

  const visibleTemplates = filteredTemplates.slice(0, visibleCount);
  const hasMore = visibleCount < filteredTemplates.length;

  useEffect(() => {
    setVisibleCount(Math.min(MOBILE_PAGE_SIZE, filteredTemplates.length));
  }, [filteredTemplates.length, searchQuery, selectedCategory, isAdmin]);

  const trackUsageMutation = api.templates.trackUsage.useMutation();

  const addTemplateMutation = api.generation.addTemplate.useMutation({
    onSuccess: async (result, variables) => {
      setLoadingTemplateId(null);
      const createdScenes = result.scenes ?? (result.scene ? [result.scene] : []);

      if (result.success && createdScenes.length > 0) {
        const sceneCount = createdScenes.length;
        const defaultMessage = `${variables.templateName}${sceneCount > 1 ? ` (${sceneCount} scenes)` : ''} added`;
        const toastMessage = result.message?.trim() || defaultMessage;
        toast.success(toastMessage);

        for (const scene of createdScenes) {
          addScene(projectId, scene);
        }

        const lastSceneId = createdScenes[createdScenes.length - 1]?.id;
        if (onSceneGenerated && lastSceneId) {
          await onSceneGenerated(lastSceneId);
        }

        setTimeout(async () => {
          await utils.chat.getMessages.invalidate({projectId});
        }, 100);

        setPreviewTemplate(null);
      } else {
        toast.error('Failed to add template');
      }
    },
    onError: (error) => {
      setLoadingTemplateId(null);
      toast.error(`Failed to add template: ${error.message}`);
    },
  });

  const handleAddTemplate = useCallback(async (template: MobileTemplate) => {
    const isMultiScene = (template.sceneCount ?? 1) > 1;
    if (isMultiScene && !isAdmin) {
      toast.error('Multi-scene templates are limited to admin accounts right now.');
      return;
    }

    let templateCode: string | null = null;
    if (!isMultiScene) {
      templateCode = template.getCode?.() ?? null;
      if (!templateCode) {
        toast.error('Template preview unavailable right now. Please try again later.');
        return;
      }
    }

    setLoadingTemplateId(template.id);

    if (template.isFromDatabase) {
      trackUsageMutation.mutate(template.id);
    }

    addTemplateMutation.mutate({
      projectId,
      templateId: template.id,
      templateName: template.name,
      templateCode: templateCode ?? undefined,
      templateDuration: !isMultiScene ? template.duration : undefined,
    });
  }, [addTemplateMutation, projectId, trackUsageMutation, isAdmin]);

  const handleCardPress = (template: MobileTemplate) => {
    setPreviewTemplate(template);
  };

  const closePreview = () => {
    setPreviewTemplate(null);
  };

  const previewedTemplate = previewTemplate;

  return (
    <div className="flex h-full flex-col bg-white">
      <div className="flex-none border-b p-2 space-y-2">
        <div className="relative">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {categoryOptions.map((chip) => (
            <button
              key={chip.key}
              onClick={() => setSelectedCategory(chip.key as typeof selectedCategory)}
              className={`px-2 py-1 text-xs rounded-full border ${selectedCategory === chip.key ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <div className="mb-3 px-1 text-xs text-gray-500">
          Showing templates compatible with <span className="font-medium text-gray-700">
            {currentFormat === 'landscape' ? 'Landscape (16:9)' : currentFormat === 'portrait' ? 'Portrait (9:16)' : 'Square (1:1)'}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-2">
            {Array.from({length: MOBILE_PAGE_SIZE}).map((_, idx) => (
              <div key={idx} className="h-32 rounded-lg bg-gray-100 animate-pulse" />
            ))}
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <SearchIcon className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No templates found</p>
            {searchQuery ? <p className="text-xs mt-1">Try a different search term</p> : <p className="text-xs mt-1">No templates available for {currentFormat} format</p>}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              {visibleTemplates.map((template) => (
                <MobileTemplateCard
                  key={template.id}
                  template={template}
                  format={currentFormat}
                  onSelect={() => handleCardPress(template)}
                  adminView={isAdmin}
                />
              ))}
            </div>

            {hasMore && (
              <div className="mt-4 flex justify-center">
                <Button
                  variant="secondary"
                  onClick={() => setVisibleCount((count) => Math.min(count + MOBILE_PAGE_SIZE, filteredTemplates.length))}
                >
                  Load more templates
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {previewedTemplate && (
        <div className="fixed inset-0 z-[1200] flex flex-col bg-black/90 backdrop-blur-sm">
          <div className="flex justify-end p-4">
            <Button variant="ghost" size="icon" className="text-white" onClick={closePreview}>
              <XIcon className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 pb-[calc(24px+env(safe-area-inset-bottom,0))]">
            <div className="mx-auto flex w-full max-w-md flex-col gap-4">
              <div className={`relative w-full overflow-hidden rounded-xl bg-black shadow-lg ${getAspectRatioClass(currentFormat)}`}>
                <TemplateVideoPlayer template={previewedTemplate} format={currentFormat} />
                {(previewedTemplate.sceneCount ?? 1) > 1 && (
                  <div className="absolute top-3 left-3 flex gap-2">
                    <span className="bg-black/80 text-white text-[10px] px-2 py-1 rounded-full">
                      {(previewedTemplate.sceneCount ?? 1)} scenes
                    </span>
                    <span className="bg-black/70 text-white/80 text-[10px] px-2 py-1 rounded-full">
                      {`${Math.round(((previewedTemplate.totalDuration ?? previewedTemplate.duration) / 30) * 10) / 10}s`}
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between text-xs text-white/70">
                <span className="font-medium text-white">{previewedTemplate.name}</span>
                {previewedTemplate.adminOnly && (
                  <span className="bg-amber-500/90 text-white px-2 py-0.5 rounded-full">Admin only</span>
                )}
              </div>
              <Button
                className="w-full"
                size="lg"
                onClick={() => handleAddTemplate(previewedTemplate)}
                disabled={loadingTemplateId === previewedTemplate.id}
              >
                {loadingTemplateId === previewedTemplate.id ? 'Adding…' : 'Add to project'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TemplatesPanelMobile;
