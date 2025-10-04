// src/app/projects/[id]/generate/workspace/panels/PreviewPanelG.tsx
"use client";

import React, { useEffect, useState, useCallback, useMemo, Suspense, useRef } from 'react';
import { useSession } from "next-auth/react";
import { useVideoState } from '~/stores/videoState';
import type { InputProps } from '~/lib/types/video/input-props';
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { RefreshCwIcon, CodeIcon, WrenchIcon } from "lucide-react";
import { ErrorBoundary } from 'react-error-boundary';
import { transform } from 'sucrase';
import RemotionPreview from '../../components/RemotionPreview';
import { Player, type PlayerRef } from '@remotion/player';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence, Audio, Video, Img, staticFile } from 'remotion';
import { api } from "~/trpc/react";
import { PlaybackSpeedSlider } from "~/components/ui/PlaybackSpeedSlider";
import { cn } from '~/lib/cn';
import { detectProblematicScene, enhanceErrorMessage } from '~/lib/utils/scene-error-detector';
import { computeSceneRanges, findSceneAtFrame } from '~/lib/utils/scene-ranges';
import { wrapSceneNamespace } from '~/lib/video/wrapSceneNamespace';
import { buildCompositeHeader } from '~/lib/video/buildCompositeHeader';
import { buildSingleSceneModule, buildMultiSceneModule } from '~/lib/video/buildComposite';
import { DEFAULT_BRAND_THEME, ensureBrandThemeCopy, type BrandTheme } from '~/lib/theme/brandTheme';

function sanitizeTheme(theme: BrandTheme | null | undefined): BrandTheme {
  if (!theme) {
    return DEFAULT_BRAND_THEME;
  }

  return {
    ...DEFAULT_BRAND_THEME,
    ...theme,
    colors: {
      ...DEFAULT_BRAND_THEME.colors,
      ...theme.colors,
      primary: theme.colors?.primary || DEFAULT_BRAND_THEME.colors.primary,
      secondary: theme.colors?.secondary || DEFAULT_BRAND_THEME.colors.secondary,
      background: theme.colors?.background || DEFAULT_BRAND_THEME.colors.background,
      textDefault: theme.colors?.textDefault || DEFAULT_BRAND_THEME.colors.textDefault,
      accents:
        theme.colors?.accents && theme.colors.accents.length > 0
          ? theme.colors.accents
          : DEFAULT_BRAND_THEME.colors.accents,
      neutrals: theme.colors?.neutrals || DEFAULT_BRAND_THEME.colors.neutrals,
    },
    fonts: {
      heading: {
        ...DEFAULT_BRAND_THEME.fonts.heading,
        ...(theme.fonts?.heading || {}),
      },
      body: {
        ...DEFAULT_BRAND_THEME.fonts.body,
        ...(theme.fonts?.body || {}),
      },
      mono: theme.fonts?.mono || DEFAULT_BRAND_THEME.fonts.mono,
    },
    assets: {
      ...DEFAULT_BRAND_THEME.assets,
      ...theme.assets,
      logo: theme.assets?.logo || DEFAULT_BRAND_THEME.assets.logo,
      productShots: theme.assets?.productShots || DEFAULT_BRAND_THEME.assets.productShots,
      heroImage: theme.assets?.heroImage || DEFAULT_BRAND_THEME.assets.heroImage,
    },
    iconography: theme.iconography || DEFAULT_BRAND_THEME.iconography,
    backgroundEffects: theme.backgroundEffects || DEFAULT_BRAND_THEME.backgroundEffects,
    motion: theme.motion || DEFAULT_BRAND_THEME.motion,
    copy: ensureBrandThemeCopy(theme.copy),
    variants: theme.variants || DEFAULT_BRAND_THEME.variants,
    meta: theme.meta || DEFAULT_BRAND_THEME.meta,
  };
}

// Error fallback component
function ErrorFallback({ error }: { error: Error }) {
  return (
    <div className="p-4 text-red-500 bg-red-50 rounded-md border border-red-200">
      <h3 className="font-bold mb-2">Component Error</h3>
      <p className="mb-2">{error.message}</p>
    </div>
  );
}

// Make Remotion components available on window for dynamically compiled scenes
if (typeof window !== 'undefined') {
  // Ensure React is available globally for dynamically imported modules
  if (!(window as any).React) {
    (window as any).React = React;
  }

  if (!(window as any).Remotion) {
    (window as any).Remotion = {
      AbsoluteFill,
      useCurrentFrame,
      useVideoConfig,
      interpolate,
      spring,
      Sequence,
      Audio,
      Video,
      Img,
      staticFile,
      // Add random function that scenes might use
      random: (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      },
      // Aliases for compatibility
      Series: { Sequence }
    };
  }
}


export function PreviewPanelG({ 
  projectId, 
  initial,
  selectedSceneId 
}: { 
  projectId: string;
  initial?: InputProps;
  selectedSceneId?: string | null;
}) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin ?? false;
  const utils = api.useUtils();
  const brandifyScenesMutation = api.project.applyBrandToScenes.useMutation({
    onSuccess: async () => {
      await utils.generation.getProjectScenes.invalidate({ projectId });
    },
  });
  // Phase 1 metrics (lightweight, console-based)
  const metricsRef = useRef({ precompiled: 0, slowPath: 0, errors: 0, runs: 0 });
  // Track when code saves happen to force refresh bypassing signature check
  const forceRefreshRef = useRef(false);
  // ✅ FIXED: Use separate selectors to prevent infinite loops
const currentProps = useVideoState((state) => {
  const project = state.projects[projectId];
  return project?.props || initial;
});
  const [selectedBrandTargetId, setSelectedBrandTargetId] = useState<string>('default');
  const [activeBrandTargetId, setActiveBrandTargetId] = useState<string>('default');
  const [isApplyingBrandTheme, setIsApplyingBrandTheme] = useState(false);
  
  // Get audio data from project state
  const projectAudio = useVideoState((state) => state.projects[projectId]?.audio);
  
  // 🚨 CLEANED UP: Only use project-specific refresh token
  const projectRefreshToken = useVideoState((state) => state.projects[projectId]?.refreshToken);
  
  // Get scenes from database to ensure we have the latest data
  const { data: dbScenes, dataUpdatedAt, refetch: refetchScenes } = api.generation.getProjectScenes.useQuery(
    { projectId },
    {
      refetchOnWindowFocus: false,
      // Balance: give optimistic UI a moment before DB resync
      staleTime: 1000,
      // This will be invalidated when scenes are created
    }
  );

const { data: personalizationTargetsData } = api.personalizationTargets.list.useQuery(
  { projectId },
  {
    enabled: isAdmin,
    refetchInterval: isAdmin ? 15000 : false,
  },
);

const readyBrandTargets = useMemo(() => {
  if (!isAdmin || !personalizationTargetsData) {
    return [] as Array<any>;
  }
  return personalizationTargetsData
    .filter((target: any) => target.status === 'ready' && target.brandTheme)
    .map((target: any) => ({
      ...target,
      brandTheme: sanitizeTheme(target.brandTheme as BrandTheme),
    }));
}, [isAdmin, personalizationTargetsData]);

useEffect(() => {
  if (!isAdmin) {
    return;
  }
  if (
    selectedBrandTargetId !== 'default' &&
    !readyBrandTargets.some((target: any) => target.id === selectedBrandTargetId)
  ) {
    setSelectedBrandTargetId('default');
  }
  if (
    activeBrandTargetId !== 'default' &&
    !readyBrandTargets.some((target: any) => target.id === activeBrandTargetId)
  ) {
    setActiveBrandTargetId('default');
  }
}, [isAdmin, readyBrandTargets, selectedBrandTargetId, activeBrandTargetId]);
  
  // Debug: Check if jsCode is coming from API and data updates
  React.useEffect(() => {
    if (dbScenes && dbScenes.length > 0) {
      const firstScene = dbScenes[0];
      if (firstScene) {
        console.log('[PreviewPanelG] DB scenes received/updated:', {
          dataUpdatedAt: new Date(dataUpdatedAt).toISOString(),
          sceneCount: dbScenes.length,
          firstScene: {
            id: firstScene.id,
            hasJsCode: !!firstScene.jsCode,
            jsCodeLength: firstScene.jsCode?.length,
            hasTsxCode: !!firstScene.tsxCode,
            tsxCodeLength: firstScene.tsxCode?.length,
            updatedAt: firstScene.updatedAt
          }
        });
      }
    }
  }, [dbScenes, dataUpdatedAt]);

  // NOTE: Auto-fix hook is now only used in ChatPanelG to avoid duplicate event listeners
  // PreviewPanelG only dispatches errors, ChatPanelG handles the fixing
  
  // Update VideoState when database scenes change
  const { replace } = useVideoState();
  const [lastSyncedSceneIds, setLastSyncedSceneIds] = useState<string>('');
  const [syncDebounceTimer, setSyncDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  const activeBrandTarget = useMemo(() => {
    if (activeBrandTargetId === 'default') {
      return null;
    }
    return readyBrandTargets.find((target: any) => target.id === activeBrandTargetId) ?? null;
  }, [activeBrandTargetId, readyBrandTargets]);

  const selectedBrandTarget = useMemo(() => {
    if (selectedBrandTargetId === 'default') {
      return null;
    }
    return readyBrandTargets.find((target: any) => target.id === selectedBrandTargetId) ?? null;
  }, [selectedBrandTargetId, readyBrandTargets]);

  const activeBrandVariants = useMemo(() => {
    return (activeBrandTarget?.brandTheme as BrandTheme | null)?.variants ?? {};
  }, [activeBrandTarget]);

  const activeVariantKey = useMemo(() => {
    if (!activeBrandTarget) {
      return 'default';
    }
    const keys = Object.keys(activeBrandVariants).sort().join('-');
    return `${activeBrandTargetId}:${keys}`;
  }, [activeBrandTarget, activeBrandTargetId, activeBrandVariants]);

  // Listen for code save events from CodePanel
  useEffect(() => {
    const handleCodeSaved = async (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.projectId === projectId && customEvent.detail?.forceRefresh) {
        console.log('[PreviewPanelG] 🔄 Code save detected, forcing immediate refetch');
        forceRefreshRef.current = true;
        // Immediately refetch the latest data from database
        await refetchScenes();
      }
    };

    window.addEventListener('code-saved', handleCodeSaved);
    return () => window.removeEventListener('code-saved', handleCodeSaved);
  }, [projectId, refetchScenes]);

  useEffect(() => {
    if (dbScenes && currentProps) {
      // 🚨 FIX: Check if scenes have actually changed to prevent redundant syncs
      const currentSceneIds = `${dbScenes.map(s => `${s.id}-${s.updatedAt}`).join(',')}|variant=${activeVariantKey}`;
      
      if (currentSceneIds === lastSyncedSceneIds) {
        // Database scenes unchanged, skipping sync
        return;
      }
      
      // Do not skip based on ID set alone; order/duration may have changed
      
      // Clear existing sync timer
      if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
      }

      // Skip debounce if force refresh is active (immediate sync after code save)
      const shouldSkipDebounce = forceRefreshRef.current;
      const debounceDelay = shouldSkipDebounce ? 0 : 300;

      // Debounce the sync to avoid rapid updates (unless force refresh)
      const timer = setTimeout(() => {
        console.log('[PreviewPanelG] 🔄 Database scenes changed, syncing to VideoState...');
        // Database scenes updated, syncing to VideoState
        setLastSyncedSceneIds(currentSceneIds);
      
      // Convert database scenes to InputProps format (sorted by order)
      const ordered = [...dbScenes].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
      let currentStart = 0;
      // Exclude any scenes that are pending deletion optimistically
      const pendingDeleteSet = (useVideoState.getState() as any).pendingDeleteIds?.[projectId] as Set<string> | undefined;
      const convertedScenes = ordered.filter((dbScene: any) => {
        return !(pendingDeleteSet && pendingDeleteSet.has(dbScene.id));
      }).map((dbScene: any) => {
        const sceneDuration = dbScene.duration || 150;
        const variant = activeBrandVariants?.[dbScene.id];
        const effectiveTsxCode = variant?.tsxCode ?? dbScene.tsxCode;
        const effectiveJsCode = variant?.jsCode ?? (dbScene as any).jsCode;
        if (!effectiveTsxCode) {
          console.warn('[PreviewPanelG] Scene missing tsxCode:', dbScene.id, dbScene.name);
        }
        const localScene = currentProps.scenes?.find((s: any) => s.id === dbScene.id);
        const localName = (localScene as any)?.name || localScene?.data?.name;
        const hasCompiled = !!effectiveJsCode;
        // Per-scene visibility: whether compiled JS will be used
        console.log('[PreviewPanelG] Scene source:', {
          id: dbScene.id,
          name: dbScene.name,
          use: hasCompiled ? 'compiled-js' : 'tsx',
          hasJsCode: hasCompiled,
          jsCodeLength: hasCompiled ? (effectiveJsCode?.length || 0) : 0,
          variantApplied: !!variant,
          duration: sceneDuration,
          order: dbScene.order ?? 0,
          revision: dbScene.revision ?? localScene?.revision ?? 1,
        });
        const scene = {
          id: dbScene.id,
          type: 'custom' as const,
          start: currentStart,
          duration: sceneDuration,
          order: dbScene.order ?? 0,
          revision: dbScene.revision ?? localScene?.revision ?? 1,
          name: localName || dbScene.name,
          data: {
            // Keep TSX as canonical editing source; expose compiled JS separately
            code: effectiveTsxCode,
            tsxCode: effectiveTsxCode,
            jsCode: effectiveJsCode,
            name: localName || dbScene.name,
            componentId: dbScene.id,
            props: dbScene.props || {}
          }
        };
        currentStart += sceneDuration;
        return scene;
      });
      const dedupedScenes = Array.from(new Map(convertedScenes.map((s: any) => [s.id, s])).values());
      // Dedupe: If the server scenes are effectively identical to local (id/order/duration/code hash), skip replace
      const sigFrom = (list: any[]) => list.map((s: any) => {
        const order = s.order ?? 0;
        const duration = s.duration || 150;
        const revision = s.revision ?? 1;
        const tsx = (s?.data?.tsxCode || s?.data?.code || (s as any).tsxCode || '') as string;
        const js = ((s?.data as any)?.jsCode || (s as any).jsCode || '') as string;
        const combined = `${tsx}::${js}`;
        const hashed = (typeof hashString === 'function')
          ? hashString(combined)
          : String(combined.length);
        return `${s.id}:${order}:${duration}:${revision}:${hashed}`;
      }).join('|');
      const serverSig = sigFrom(convertedScenes);
      const localSig = sigFrom((currentProps.scenes || []) as any[]);

      // Check if we should force refresh (after code save)
      const shouldForceRefresh = forceRefreshRef.current;
      if (shouldForceRefresh) {
        console.log('[PreviewPanelG] 🔄 Force refresh active, bypassing signature check');
        forceRefreshRef.current = false; // Reset flag
      } else if (serverSig === localSig) {
        console.log('[PreviewPanelG] ⚖️ Server scenes match local signature; skipping replace');
        return;
      }

      const updatedProps = {
        ...currentProps,
        scenes: dedupedScenes,
        meta: {
          ...currentProps.meta,
          duration: dedupedScenes.reduce((sum: number, s: any) => sum + (s.duration || 0), 0)
        }
      };
      // If DB returns no scenes, explicitly clear scenes and reset duration to 150 (default placeholder length) or 0
      if (dbScenes.length === 0) {
        replace(projectId, { ...currentProps, scenes: [], meta: { ...currentProps.meta, duration: 150 } });
      } else {
        // Aggregate visibility: how many scenes use compiled JS vs TSX
        const compiledCount = convertedScenes.filter((s: any) => !!(s?.data as any)?.jsCode).length;
        console.log('[PreviewPanelG] Scene sources summary:', {
          total: convertedScenes.length,
          compiledJs: compiledCount,
          tsxFallback: convertedScenes.length - compiledCount,
        });
        replace(projectId, updatedProps);
      }
      }, debounceDelay); // Dynamic debounce: 0ms for force refresh, 300ms otherwise

      setSyncDebounceTimer(timer);
    }
    
    // Cleanup on unmount or deps change
    return () => {
      if (syncDebounceTimer) {
        clearTimeout(syncDebounceTimer);
      }
    };
  }, [dbScenes, projectId, currentProps, lastSyncedSceneIds, activeVariantKey, activeBrandVariants]);
  
  // Component compilation state
  const [componentImporter, setComponentImporter] = useState<(() => Promise<any>) | null>(null);
  const [componentBlobUrl, setComponentBlobUrl] = useState<string | null>(null);
  const [isCompiling, setIsCompiling] = useState(false);
  const [componentError, setComponentError] = useState<Error | null>(null);
  const [refreshToken, setRefreshToken] = useState(`initial-${Date.now()}`);

  const applyBrandTheme = useCallback((theme: BrandTheme, key: string) => {
    if (typeof window === 'undefined') {
      return;
    }

    (window as any).BrandTheme = {
      defaultTheme: theme,
      useTheme: () => theme,
    };

    setRefreshToken(`brand-${key}-${Date.now()}`);
  }, [setRefreshToken]);

  useEffect(() => {
    applyBrandTheme(DEFAULT_BRAND_THEME, 'default');
  }, [applyBrandTheme]);

  const handleApplyBrandTheme = useCallback(async (targetId: string) => {
    if (!isAdmin) {
      return;
    }
    setIsApplyingBrandTheme(true);
    try {
      if (targetId !== 'default') {
        const target = readyBrandTargets.find((entry: any) => entry.id === targetId);
        if (!target) {
          throw new Error('Selected brand target not found');
        }

        let themeToApply = sanitizeTheme(target.brandTheme as BrandTheme | null);
        const hasVariants = Object.keys(themeToApply.variants ?? {}).length > 0;

        if (!hasVariants) {
          const result = await brandifyScenesMutation.mutateAsync({
            projectId,
            targetId,
          });
          await utils.personalizationTargets.list.invalidate({ projectId });
          themeToApply = {
            ...themeToApply,
            variants: result.variants ?? {},
          };
        }

        applyBrandTheme(sanitizeTheme(themeToApply), targetId);
      } else {
        applyBrandTheme(DEFAULT_BRAND_THEME, 'default');
      }
      setActiveBrandTargetId(targetId);
    } catch (error) {
      console.error('Failed to apply brand theme', error);
    } finally {
      setIsApplyingBrandTheme(false);
    }
  }, [applyBrandTheme, brandifyScenesMutation, isAdmin, projectId, readyBrandTargets, utils.personalizationTargets.list]);
  
  // Playback speed state
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const playerRef = useRef<PlayerRef>(null);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  // Cache for namespaced scene code to avoid repeated regex work on every render
  // Cache wrapped scene code along with detected Remotion fn usage
  const nsCacheRef = useRef<Map<string, { code: string; usedRemotionFns: string[] }>>(new Map());
  
  // Loop state - using the three-state system
  const [loopState, setLoopState] = useState<'video' | 'off' | 'scene'>('video');
  
  // Fonts are now loaded via CSS - no JavaScript loading needed
  // All 99 Google Fonts are available through fonts.css imported in MainCompositionSimple
  
  // Get scenes from reactive state - ALWAYS sort by order field for consistency
  const unsortedScenes = currentProps?.scenes || [];
  const scenes = useMemo(() => 
    [...unsortedScenes].sort((a: any, b: any) => ((a as any).order ?? 0) - ((b as any).order ?? 0)),
    [unsortedScenes]
  );
  const ranges = useMemo(() => computeSceneRanges(scenes as any), [scenes]);
  const activeRange = useMemo(() => findSceneAtFrame(ranges, currentFrame), [ranges, currentFrame]);
  
  // hashString defined later in file; keep single definition to avoid redeclare
  
  // (Removed owner-only preview source indicator)
  
  // Force preview refresh when audio settings change
  useEffect(() => {
    if (projectAudio) {
      setRefreshToken(`audio-${Date.now()}`);
    }
  }, [projectAudio?.fadeInDuration, projectAudio?.fadeOutDuration, projectAudio?.playbackRate, projectAudio?.volume, projectAudio?.startTime, projectAudio?.endTime]);

  // Broadcast current frame to header for external counter
  useEffect(() => {
    const interval = window.setInterval(() => {
      try {
        const frame = (playerRef.current as any)?.getCurrentFrame?.();
        if (typeof frame === 'number') {
          const ev = new CustomEvent('preview-frame-update', { detail: { frame } });
          window.dispatchEvent(ev);
          setCurrentFrame(frame);
        }
      } catch {}
    }, Math.max(1000 / 30, 16));
    return () => window.clearInterval(interval);
  }, []);
  
  // Listen for Timeline events
  useEffect(() => {
    const handleTimelineSeek = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.frame === 'number' && playerRef.current) {
        try {
          const frame = Math.round(event.detail.frame); // Ensure integer frame
          console.log('[PreviewPanelG] Timeline seek to frame:', frame);
          
          // Remotion Player's seekTo expects frame number directly
          playerRef.current.seekTo(frame);
          setCurrentFrame(frame); // Update local state
          
          console.log('[PreviewPanelG] Seek completed, updating timeline');
          
          // Force a frame update event after seek completes
          // This ensures the timeline updates to the new position
          setTimeout(() => {
            const updateEvent = new CustomEvent('preview-frame-update', { 
              detail: { frame: frame }
            });
            window.dispatchEvent(updateEvent);
          }, 50); // Reduced timeout for faster response
        } catch (error) {
          console.error('[PreviewPanelG] Failed to seek:', error);
        }
      }
    };
    
    const handleTimelinePlayPause = () => {
      console.log('[PreviewPanelG] Received timeline play/pause event, current isPlaying:', isPlaying);
      if (playerRef.current) {
        try {
          // Use our state variable instead of trying to get player state
          if (isPlaying) {
            playerRef.current.pause();
            setIsPlaying(false);
            // Dispatch play state change event
            const event = new CustomEvent('preview-play-state-change', { 
              detail: { playing: false }
            });
            window.dispatchEvent(event);
          } else {
            playerRef.current.play();
            setIsPlaying(true);
            // Dispatch play state change event
            const event = new CustomEvent('preview-play-state-change', { 
              detail: { playing: true }
            });
            window.dispatchEvent(event);
          }
        } catch (error) {
          console.warn('Failed to play/pause from timeline:', error);
        }
      }
    };

    // Explicit play request (no toggle)
    const handleTimelinePlay = () => {
      if (!playerRef.current) return;
      try {
        playerRef.current.play();
        setIsPlaying(true);
        const event = new CustomEvent('preview-play-state-change', { detail: { playing: true } });
        window.dispatchEvent(event);
      } catch (error) {
        console.warn('Failed to play from timeline (explicit):', error);
      }
    };

    // Explicit pause request (no toggle)
    const handleTimelinePause = () => {
      if (!playerRef.current) return;
      try {
        playerRef.current.pause();
        setIsPlaying(false);
        const event = new CustomEvent('preview-play-state-change', { detail: { playing: false } });
        window.dispatchEvent(event);
      } catch (error) {
        console.warn('Failed to pause from timeline (explicit):', error);
      }
    };
    
    // New: Provide precise current frame on demand
    const handleRequestCurrentFrame = () => {
      try {
        const frame = (playerRef.current as any)?.getCurrentFrame?.();
        if (typeof frame === 'number') {
          const ev = new CustomEvent('preview-frame-update', { detail: { frame } });
          window.dispatchEvent(ev);
        }
      } catch {}
    };
    
    const handleRequestPlayState = () => {
      try {
        const ev = new CustomEvent('preview-play-state-change', { detail: { playing: isPlaying } });
        window.dispatchEvent(ev);
      } catch {}
    };

    window.addEventListener('timeline-seek' as any, handleTimelineSeek);
    window.addEventListener('timeline-play-pause' as any, handleTimelinePlayPause);
    window.addEventListener('timeline-play' as any, handleTimelinePlay);
    window.addEventListener('timeline-pause' as any, handleTimelinePause);
    window.addEventListener('request-play-state' as any, handleRequestPlayState);
    window.addEventListener('request-current-frame' as any, handleRequestCurrentFrame);
    
    return () => {
      window.removeEventListener('timeline-seek' as any, handleTimelineSeek);
      window.removeEventListener('timeline-play-pause' as any, handleTimelinePlayPause);
      window.removeEventListener('timeline-play' as any, handleTimelinePlay);
      window.removeEventListener('timeline-pause' as any, handleTimelinePause);
      window.removeEventListener('request-play-state' as any, handleRequestPlayState);
      window.removeEventListener('request-current-frame' as any, handleRequestCurrentFrame);
    };
  }, [isPlaying, setCurrentFrame]);

  // (moved below selectedSceneRange definition to avoid TDZ)
  
  // Helper: fast string hash (djb2)
  const hashString = useCallback((str: string) => {
    let hash = 5381 | 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash + str.charCodeAt(i)) | 0; // hash * 33 + c
    }
    // Convert to unsigned for readability
    return (hash >>> 0).toString(36);
  }, []);

  // Memoized scene fingerprint to prevent unnecessary re-renders - order-aware and content-robust
  const scenesFingerprint = useMemo(() => {
    const sortedForFingerprint = [...scenes].sort((a: any, b: any) => ((a as any).order ?? 0) - ((b as any).order ?? 0));
    return sortedForFingerprint.map((s, idx) => {
      // Check all possible locations for scene code (tsxCode at scene level takes priority)
      const code = (s as any).tsxCode || (s.data as any)?.code || (s.data as any)?.tsxCode || '';
      const codeHash = code ? hashString(code) : 'empty';
      return `${idx}|${s.id}|${(s as any).order ?? 0}|${s.duration || 150}|${codeHash}`;
    }).join('~');
  }, [scenes, hashString]);
  
  // Memoized audio fingerprint to prevent unnecessary re-renders
  const audioFingerprint = useMemo(() => {
    return `${projectAudio?.url || ''}-${projectAudio?.startTime || 0}-${projectAudio?.endTime || 0}-${projectAudio?.volume || 1}`;
  }, [projectAudio?.url, projectAudio?.startTime, projectAudio?.endTime, projectAudio?.volume]);

  // Clear wrapper namespace cache when scene fingerprint changes
  useEffect(() => {
    try {
      try { metricsRef.current.runs += 1; } catch {}
      nsCacheRef.current.clear();
      console.log('[PreviewPanelG] Cleared namespace cache due to scene fingerprint change');
    } catch {}
  }, [scenesFingerprint]);
  
  // Calculate scene boundaries for scene loop functionality
  const sceneRanges = useMemo(() => {
    let start = 0;
    return scenes.map(scene => {
      const duration = scene.duration || 150;
      const range = { 
        id: scene.id,
        start, 
        end: start + duration - 1, // -1 because frames are 0-indexed
        duration 
      };
      start += duration;
      return range;
    });
  }, [scenes]);
  
  // Find the selected scene range
  const selectedSceneRange = useMemo(() => {
    if (!selectedSceneId) return null;
    return sceneRanges.find(range => range.id === selectedSceneId);
  }, [selectedSceneId, sceneRanges]);

  // Ensure when entering scene-loop or changing selected scene, playback seeks to the start
  useEffect(() => {
    if (loopState === 'scene' && selectedSceneRange && playerRef.current) {
      try {
        playerRef.current.seekTo(selectedSceneRange.start);
      } catch {}
    }
  }, [loopState, selectedSceneRange?.start]);

  // 🚨 SIMPLIFIED: Direct scene compilation with pre-compiled JS support
  const compileSceneDirectly = useCallback(async (scene: any, index: number) => {
    // Get code from scene (supporting both TSX and pre-compiled JS)
    // PRIORITY: Use TSX/source first so manual edits reflect immediately, then fall back to pre-compiled JS
    const preCompiledJS = scene.jsCode || (scene.data as any)?.jsCode; // Pre-compiled JavaScript from DB
    const tsxCode = scene.tsxCode || (scene.data as any)?.tsxCode || (scene.data as any)?.code;
    // Use JS if available, otherwise fall back to TSX
    const sceneCode = preCompiledJS || tsxCode;

    // Debug: Log what code we're using for this specific scene
    if (scene.id === 'e6156b08-02eb-4436-864f-967bb603dad3') {
      console.log('[PreviewPanelG] 🔍 Scene 2 (Highlight Sweep) code source:', {
        sceneId: scene.id,
        hasPreCompiledJS: !!preCompiledJS,
        hasTsxCode: !!tsxCode,
        usingPreCompiled: !!preCompiledJS,
        jsCodePreview: preCompiledJS ? preCompiledJS.substring(0, 200) : 'N/A',
        tsxCodePreview: tsxCode ? tsxCode.substring(0, 200) : 'N/A'
      });
    }
    const sceneName = scene.name || (scene.data as any)?.name || scene.id;
    const sceneId = scene.id;
    
    // Log if we have pre-compiled JS
    if (preCompiledJS) {
      console.log(`[PreviewPanelG] ✅ Scene ${index} (${sceneName}) has pre-compiled JS`);
      try { metricsRef.current.precompiled += 1; } catch {}
    }
    
    if (!sceneCode) {
      console.warn(`[PreviewPanelG] Scene ${index} has no code (TSX or JS). Scene structure:`, {
        id: scene.id,
        hasDataCode: !!(scene.data as any)?.code,
        dataKeys: scene.data ? Object.keys(scene.data) : [],
        sceneKeys: Object.keys(scene)
      });
      return {
        isValid: false,
        compiledCode: createFallbackScene(sceneName, index, 'No code found', sceneId),
        componentName: `FallbackScene${index}`
      };
    }

    try {
      // Extract component name from the actual generated code
      // Prefer TSX for extraction; if missing, use JS. Also handle server-compiled JS with a trailing `return Name;`.
      const codeForNameExtraction = tsxCode || sceneCode;
      let componentName: string | null = null;
      // 1) export default function Name
      let m = codeForNameExtraction.match(/export\s+default\s+function\s+([A-Za-z_$][\w$]*)/);
      if (m && m[1]) componentName = m[1];
      // 2) export default Name
      if (!componentName) {
        m = codeForNameExtraction.match(/export\s+default\s+([A-Za-z_$][\w$]*)/);
        if (m && m[1]) componentName = m[1];
      }
      // 3) const Name = (
      if (!componentName) {
        m = codeForNameExtraction.match(/const\s+([A-Za-z_$][\w$]*)\s*=\s*\(/);
        if (m && m[1]) componentName = m[1];
      }
      // 4) function Name(  (server-compiled JS keeps function decl + trailing return)
      if (!componentName) {
        m = codeForNameExtraction.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
        if (m && m[1]) componentName = m[1];
      }
      // 5) trailing `return Name;` (most reliable for server-compiled JS)
      if (!componentName && preCompiledJS) {
        m = preCompiledJS.match(/return\s+([A-Za-z_$][\w$]*)\s*;\s*$/m);
        if (m && m[1]) componentName = m[1];
      }
      // 6) Fallback to generic
      if (!componentName) componentName = `Scene${index}Component`;
      
      // Log original code for debugging
      // Original scene code processing
      
      // Only clean TSX code if we're not using pre-compiled JS
      let cleanSceneCode = '';
      if (!preCompiledJS && tsxCode) {
        cleanSceneCode = tsxCode
          .replace(/import\s+\{[^}]+\}\s+from\s+['"]remotion['"];?\s*/g, '') // Remove remotion imports (scenes use window.Remotion)
          .replace(/import\s+.*from\s+['"]react['"];?\s*/g, '') // Remove React imports
          // IMPORTANT: Preserve window.Remotion destructuring so scene-local names (useCurrentFrame, etc.) are defined
          .replace(/export\s+default\s+function\s+\w+/, `function ${componentName}`) // Remove export default function
          .replace(/export\s+default\s+\w+;?\s*/g, '') // Remove export default ComponentName
          .replace(/export\s+const\s+\w+\s*=\s*[^;]+;?\s*/g, '') // Remove export const statements
          // Normalize icons to canonical runtime API (match server compiler)
          .replace(/<\s*IconifyIcon(\s|>)/g, '<window.IconifyIcon$1')
          .replace(/<\s*Icon(\s|>)/g, '<window.IconifyIcon$1')
          .replace(/React\.createElement\(\s*IconifyIcon\s*,/g, 'React.createElement(window.IconifyIcon,')
          .replace(/React\.createElement\(\s*Icon\s*,/g, 'React.createElement(window.IconifyIcon,');
      }
      
      // Log cleaned code for debugging
      // Cleaned scene code processing

      // Use pre-compiled JS if available, otherwise compile TSX
      let transformedCode: string;
      let compiledSnippet: string = '';
      
      if (preCompiledJS) {
        // 🚀 FAST PATH: Use pre-compiled JavaScript directly
        console.log(`[PreviewPanelG] 🚀 Using pre-compiled JS for scene ${index} (${sceneName})`);
        
        // Pre-compiled JS has export statements, we need to remove ALL of them
        // 1. Remove export default function
        // 2. Remove export const statements
        // 3. Remove any other export statements
        let cleanCompiledJS = preCompiledJS
          .replace(/export\s+default\s+function\s+(\w+)/g, 'function $1')
          .replace(/export\s+default\s+(\w+);?\s*/g, '') // Remove standalone export default
          .replace(/export\s+const\s+(\w+)\s*=\s*([^;]+);?/g, 'const $1 = $2;') // Keep const but remove export
          .replace(/export\s+\{[^}]*\};?\s*/g, '') // Remove named exports
          // Strip import lines that cannot execute inside Function/concatenated context
          .replace(/^[\t ]*import[^;]*;?\s*$/gmi, '');
        
        transformedCode = cleanCompiledJS;
        // Ensure the name we use is a valid identifier (letters, digits, _, $) and not empty
        if (!/^[A-Za-z_$][\w$]*$/.test(componentName)) {
          componentName = `Scene${index}Component`;
        }
        // Create a unique, stable name per scene to avoid collisions across scenes
        const shortId = (String(sceneId || '')).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || `idx${index}`;
        const uniqueComponentName = `${componentName}_${shortId}`;

        // Wrap precompiled JS so its trailing `return Component;` runs in function scope
        // and assign returned component to a uniquely named constant available in module scope.
        const wrappedPrecompiled = `const ${uniqueComponentName} = (function(){\n${transformedCode}\n})();`;
        compiledSnippet = wrappedPrecompiled;
        componentName = uniqueComponentName;
      } else {
        // ⚠️ SLOW PATH: Client-side compilation (legacy)
        console.log(`[PreviewPanelG] ⚠️ No pre-compiled JS, using client-side compilation for scene ${index} (${sceneName})`);
        try { metricsRef.current.slowPath += 1; } catch {}

        // Transform the cleaned TSX to plain JS (classic runtime)
        try {
          const tsxToCompile = cleanSceneCode || tsxCode;
          const result = transform(tsxToCompile, {
            transforms: ['typescript', 'jsx'],
            jsxRuntime: 'classic',
            production: false,
          });
          let jsOut = result.code
            // Remove export statements to keep functions available by name
            .replace(/export\s+default\s+function\s+(\w+)/g, 'function $1')
            .replace(/export\s+default\s+(\w+);?\s*/g, '')
            .replace(/export\s+const\s+(\w+)\s*=\s*([^;]+);?/g, 'const $1 = $2;')
            .replace(/export\s+\{[^}]*\};?\s*/g, '');

          transformedCode = jsOut;

          // Ensure the name we use is a valid identifier (letters, digits, _, $) and not empty
          if (!/^[A-Za-z_$][\w$]*$/.test(componentName)) {
            componentName = `Scene${index}Component`;
          }
          // Create a unique, stable name per scene to avoid collisions across scenes
          const shortId = (String(sceneId || '')).replace(/[^a-zA-Z0-9]/g, '').slice(0, 8) || `idx${index}`;
          const uniqueComponentName = `${componentName}_${shortId}`;

          // Wrap TSX-compiled JS inside an IIFE and explicitly return the component to avoid
          // leaking top-level declarations into module scope and to guarantee uniqueness.
          const wrappedClientCompiled = `const ${uniqueComponentName} = (function(){\n${jsOut}\nreturn ${componentName};\n})();`;
          compiledSnippet = wrappedClientCompiled;
          componentName = uniqueComponentName;
        } catch (syntaxError) {
          console.error(`[PreviewPanelG] ❌ Scene ${index} (${sceneName}) has SYNTAX ERROR during client compile:`, syntaxError);
          console.log('[PreviewPanelG] Dispatching preview-scene-error event for auto-fix');
          const errorMessage = syntaxError instanceof Error ? syntaxError.message : 'Syntax error in scene code';
          const errorEvent = new CustomEvent('preview-scene-error', {
            detail: {
              sceneId,
              sceneName,
              sceneIndex: index + 1,
              error: new Error(`Syntax Error in ${sceneName}: ${errorMessage}`)
            }
          });
          window.dispatchEvent(errorEvent);
          throw syntaxError;
        }
      }

      // Decide final compiled snippet for this scene
      if (!compiledSnippet) {
        // As a last resort, use the cleaned TSX (rare) - but this should usually be JS at this point
        compiledSnippet = cleanSceneCode;
      }

      // Scene compiled successfully
      
      // 🚨 NEW: Dispatch success event to clear any existing errors
      const successEvent = new CustomEvent('scene-fixed', {
        detail: {
          sceneId,
          sceneName
        }
      });
      window.dispatchEvent(successEvent);
      
      // Return the appropriate code based on what was used
      return {
        isValid: true,
        compiledCode: compiledSnippet,
        componentName: componentName
      };

    } catch (error) {
      console.error(`[PreviewPanelG] ❌ Scene ${index} (${sceneName}) REAL compilation failed:`, error);
      try { metricsRef.current.errors += 1; } catch {}
      
      // Enhanced error message with scene identification
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const detailedError = `Scene ${index + 1} (${sceneName}): ${errorMessage}`;
      
      // 🚨 NEW: Dispatch error event to ChatPanelG for auto-fix
      if (error instanceof Error) {
        const errorEvent = new CustomEvent('preview-scene-error', {
          detail: {
            sceneId,
            sceneName,
            sceneIndex: index + 1,
            error: new Error(detailedError)
          }
        });
        // Dispatching preview-scene-error event for scene compilation error
        window.dispatchEvent(errorEvent);
      }
      
      // ONLY use fallback when REAL compilation actually fails
      return {
        isValid: false,
        compiledCode: createFallbackScene(sceneName, index, detailedError, sceneId),
        componentName: `FallbackScene${index}`
      };
    }
  }, []);

  // 🚨 ENHANCED: Create safe fallback scene with autofix button
  const createFallbackScene = useCallback((sceneName: string, sceneIndex: number, errorDetails?: string, sceneId?: string) => {
    return `
function FallbackScene${sceneIndex}() {
  const handleAutoFix = () => {
    console.log('[PreviewPanelG] 🔧 AUTOFIX: Direct button clicked from fallback scene ${sceneIndex}');
    
    // 🚨 DIRECT: Trigger autofix in ChatPanelG
    const autoFixEvent = new CustomEvent('trigger-autofix', {
      detail: {
        sceneId: '${sceneId || sceneName}', // Use actual scene ID if available
        sceneName: ${JSON.stringify(sceneName || ('Scene ' + (sceneIndex + 1)))},
        sceneIndex: ${sceneIndex + 1},
        error: { message: ${JSON.stringify(errorDetails || 'Compilation error')} }
      }
    });
    window.dispatchEvent(autoFixEvent);
  };

  const { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  
  // Smooth fade in
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  // Gentle scale animation
  const scale = spring({
    frame,
    fps,
    from: 0.95,
    to: 1,
    config: {
      damping: 20,
      stiffness: 40,
    },
  });
  
  // Floating animation for the icon
  const iconFloat = Math.sin(frame / 10) * 5;
  
  // Subtle background animation
  const bgRotation = interpolate(frame, [0, 300], [0, 360], {
    extrapolateRight: 'clamp',
  });
  
  return (
    <AbsoluteFill style={{
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity,
    }}>
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          background: 'rgba(17,24,39,0.8)',
          color: '#e5e7eb',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
          fontSize: 11,
          lineHeight: 1.2,
          borderRadius: 8,
          padding: '8px 10px',
          zIndex: 9999,
          pointerEvents: 'none'
        }}>
          <div>frame: {currentFrame}</div>
          <div>
            active: {activeRange ? (String(activeRange.index) + ' (' + (activeRange.id ? activeRange.id.slice(0, 8) : '') + ')') : 'none'}
          </div>
          <div>
            ranges: {ranges.map(r => '[' + r.index + ':' + r.start + '-' + r.end + ']').join(' ')}
          </div>
        </div>
      )}
      {/* Animated background shapes */}
      <div style={{
        position: 'absolute',
        width: '200%',
        height: '200%',
        top: '-50%',
        left: '-50%',
        opacity: 0.1,
        transform: 'rotate(' + bgRotation + 'deg)',
      }}>
        <div style={{
          position: 'absolute',
          width: '40%',
          height: '40%',
          top: '10%',
          left: '10%',
          background: 'radial-gradient(circle, #3b82f6 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute',
          width: '30%',
          height: '30%',
          bottom: '20%',
          right: '20%',
          background: 'radial-gradient(circle, #10b981 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
      </div>
      
      <div style={{
        background: 'white',
        borderRadius: '24px',
        padding: '56px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
        maxWidth: '680px',
        textAlign: 'center',
        transform: 'scale(' + scale + ')',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        position: 'relative',
        zIndex: 1,
      }}>
        {/* Status Badge */}
        <div style={{
          position: 'absolute',
          top: '24px',
          right: '24px',
          background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)',
          color: 'white',
          padding: '6px 12px',
          borderRadius: '20px',
          fontSize: '0.75rem',
          fontWeight: '600',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
        }}>
          <span style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: 'white',
            animation: 'pulse 1.5s ease-in-out infinite',
          }} />
          AI FIXING IN PROGRESS
        </div>
        
        {/* Animated icon */}
        <div style={{ 
          fontSize: '4.5rem', 
          marginBottom: '2rem',
          transform: 'translateY(' + iconFloat + 'px)',
          transition: 'transform 0.3s ease',
        }}>
          🤖
        </div>
        
        <h3 style={{ 
          color: '#111827', 
          marginBottom: '12px',
          fontSize: '1.875rem',
          fontWeight: '800',
          letterSpacing: '-0.02em',
        }}>
          Compilation Issue Detected
        </h3>
        
        <p style={{ 
          color: '#4b5563', 
          marginBottom: '8px',
          fontSize: '1.125rem',
          lineHeight: '1.5',
          fontWeight: '500',
        }}>
          Scene: ${sceneName || ('Scene ' + (sceneIndex + 1))}
        </p>
        
        <p style={{ 
          color: '#6b7280', 
          marginBottom: '32px',
          fontSize: '1rem',
          lineHeight: '1.6',
          maxWidth: '500px',
          margin: '16px auto 32px',
        }}>
          The AI-generated code has a compilation error that prevents it from running.\n\nGood news: Our AI agent is already working on a fix and will automatically update your video when ready!
        </p>
        
        {/* Progress indicator */}
        <div style={{
          background: '#f3f4f6',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            marginBottom: '12px',
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              border: '3px solid #e5e7eb',
              borderTopColor: '#3b82f6',
              animation: 'spin 1s linear infinite',
            }} />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#111827' }}>
                Auto-Fix Agent Active
              </div>
              <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                Analyzing and repairing code...
              </div>
            </div>
          </div>
          <div style={{
            fontSize: '0.75rem',
            color: '#6b7280',
            marginTop: '8px',
          }}>
            This usually takes 15-30 seconds
          </div>
        </div>
        
        <div style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          color: '#10b981',
          fontSize: '0.875rem',
          fontWeight: '600',
          marginBottom: '24px',
        }}>
          <span style={{ 
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#10b981',
            display: 'inline-block',
          }} />
          Other scenes continue playing normally
        </div>
        
      </div>
      
      
      \`}</style>
    </AbsoluteFill>
  );
}`;
  }, []);

  // Compile a multi-scene composition
  const compileMultiSceneComposition = useCallback(async () => {
    // ALWAYS use ALL scenes sorted by order - no filtering!
    const orderedScenes = [...scenes].sort((a, b) => ((a as any).order ?? 0) - ((b as any).order ?? 0));
    
    if (orderedScenes.length === 0) {
      // Provide a minimal placeholder component so the Player stays stable when there are no scenes
      const placeholder = `
const React = window.React;

export default function EmptyComposition() {
  return React.createElement(window.Remotion.AbsoluteFill, { style: { backgroundColor: 'white' } });
}`;
      try {
        const { code: transformed } = transform(placeholder, {
          transforms: ['typescript', 'jsx'],
          jsxRuntime: 'classic',
          production: false,
        });
        const blob = new Blob([transformed], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        setComponentBlobUrl(url);
        setComponentImporter(() => () => import(/* webpackIgnore: true */ url));
        setComponentError(null);
      } catch (e) {
        setComponentImporter(null);
        setComponentError(new Error('No scenes to preview.')); 
      }
      return;
    }

    console.log('[PreviewPanelG] Compiling composition with ALL', orderedScenes.length, 'scenes (including fallbacks)...');
    console.log('[PreviewPanelG] Scene positions for compilation:', orderedScenes.map((s: any, i: number) => ({
      id: s.id,
      order: s.order,
      start: s.start,
      duration: s.duration,
      calculatedStart: orderedScenes.slice(0, i).reduce((acc: number, sc: any) => acc + (sc.duration || 150), 0)
    })));
    
    setIsCompiling(true);
    setComponentError(null);
    setComponentImporter(null);

    // Revoke old blob URLs
    if (componentBlobUrl) {
      URL.revokeObjectURL(componentBlobUrl);
    }

    // Declare compiledScenes outside try block so it's accessible in catch block
    let compiledScenes: any[] = [];

    try {
      // 🚨 FIXED: Compile each scene individually with ISOLATION (no cascade failures)
      // Compile ALL scenes, not just those with code - use fallbacks for empty ones
      compiledScenes = await Promise.all(
        orderedScenes.map((scene, index) => compileSceneDirectly(scene, index))
      );
      
      const validScenes = compiledScenes.filter(s => s.isValid).length;
      console.log(`[PreviewPanelG] 🛡️ ISOLATION: ${validScenes}/${compiledScenes.length} scenes compiled successfully - broken scenes isolated`);
      try {
        console.log('[PreviewPanelG][Metrics] Compilation summary (partial):', {
          runs: metricsRef.current.runs,
          scenes: compiledScenes.length,
          precompiledUsed: metricsRef.current.precompiled,
          slowPathUsed: metricsRef.current.slowPath,
          errors: metricsRef.current.errors,
        });
      } catch {}
      
      // 🚨 CRITICAL FIX: Continue even if some scenes fail - we'll use fallbacks for broken scenes
      if (validScenes === 0 && compiledScenes.length > 0) {
        console.warn('[PreviewPanelG] ⚠️ All scenes failed compilation, but continuing with fallback scenes');
        // Don't throw - continue with fallback scenes
      }

      // For single scene, use simpler approach
      if (compiledScenes.length === 1) {
        const scene = compiledScenes[0];
        if (!scene) {
          // Create a fallback scene instead of throwing
          const fallbackScene = {
            isValid: false,
            compiledCode: createFallbackScene('Scene 1', 0, 'Scene compilation failed'),
            componentName: 'FallbackScene0'
          };
          compiledScenes[0] = fallbackScene;
        }
        
        const allImports = new Set(['AbsoluteFill', 'useCurrentFrame', 'useVideoConfig', 'interpolate', 'spring', 'random']);
        
        // If it's a valid scene, scan for Remotion functions
        if (scene.isValid) {
          const remotionFunctions = ['Sequence', 'Audio', 'Video', 'Img', 'staticFile', 'Loop', 'Series'];
          remotionFunctions.forEach(func => {
            if (scene.compiledCode.includes(func)) {
              allImports.add(func);
            }
          });
        }

        // Always include Audio and related functions if project has audio
        if (projectAudio?.url) {
          allImports.add('Audio');
          allImports.add('useCurrentFrame');
          allImports.add('interpolate');
          allImports.add('Series'); // use Series.Sequence to time-offset audio
        }
        
        const allImportsArray = Array.from(allImports);
        const singleDestructuring = ``; // Avoid module-scope destructuring; wrapper uses window.Remotion.*

        // Generate simple single scene composition
        // Check if scene already has window.Remotion destructuring
        const sceneHasRemotionDestructuring = scene.compiledCode.includes('= window.Remotion');
        
        const header = buildCompositeHeader({ includeIconFallback: true, includeFontsLoader: true });
        const __unusedLegacyComposite = `
${header}

// Add IconifyIcon fallback to prevent runtime errors when icons haven't been replaced
if (!window.IconifyIcon) {
  window.IconifyIcon = (props) => {
    const style = props?.style || {};
    return React.createElement(
      'span',
      {
        ...props,
        style: {
          display: 'inline-block',
          width: style.width || '1em',
          height: style.height || '1em',
          background: style.background || 'currentColor',
          borderRadius: style.borderRadius || '2px',
          ...style,
        }
      }
    );
  };
}

${scene.compiledCode}

// Single Scene Error Boundary
class SingleSceneErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Single scene runtime error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Create a function component that can use hooks for the error display
      const ErrorDisplay = () => {
        const frame = useCurrentFrame();
        const { fps } = useVideoConfig();
        
        const opacity = interpolate(frame, [0, 20], [0, 1], {
          extrapolateRight: 'clamp',
        });
        
        const scale = spring({
          frame,
          fps,
          from: 0.95,
          to: 1,
          config: {
            damping: 20,
            stiffness: 40,
          },
        });
        
        return (
          <AbsoluteFill style={{
            background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity,
          }}>
            <div style={{
              background: 'white',
              borderRadius: '24px',
              padding: '48px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
              maxWidth: '640px',
              textAlign: 'center',
              transform: 'scale(' + scale + ')',
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              position: 'relative',
            }}>
              {/* Status Badge */}
              <div style={{
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'white',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }} />
                AI FIXING IN PROGRESS
              </div>
              
              <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>⚡</div>
              <h3 style={{ color: '#92400e', marginBottom: '12px', fontSize: '1.75rem', fontWeight: '700' }}>
                Runtime Error Detected
              </h3>
              <p style={{ color: '#b45309', marginBottom: '8px', fontSize: '1.125rem', fontWeight: '500' }}>
                Scene crashed during playback
              </p>
              <p style={{ 
                color: '#6b7280', 
                marginBottom: '32px',
                fontSize: '1rem',
                lineHeight: '1.6',
                maxWidth: '480px',
                margin: '16px auto 32px',
              }}>
                The scene compiled successfully but encountered an error while running.
                <strong style={{ color: '#059669', display: 'block', marginTop: '12px' }}>
                  Don't worry! Our AI agent is automatically fixing this and will update your video shortly.
                </strong>
              </p>
              
              {/* Progress indicator */}
              <div style={{
                background: '#fef3c7',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                }}>
                  <div style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '3px solid #fed7aa',
                    borderTopColor: '#f59e0b',
                    animation: 'spin 1s linear infinite',
                  }} />
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#92400e' }}>
                      Auto-Fix Agent Working
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#b45309' }}>
                      Debugging and repairing...
                    </div>
                  </div>
                </div>
                <div style={{
                  fontSize: '0.75rem',
                  color: '#92400e',
                  marginTop: '8px',
                }}>
                  Typically resolves in 15-30 seconds
                </div>
              </div>
              
              <div style={{ 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#10b981',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '24px',
              }}>
                <span style={{ 
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'inline-block',
                }} />
                Your other scenes are playing normally
              </div>
              
              <div style={{ 
                marginTop: '24px',
                padding: '16px',
                background: '#fef2f2',
                borderRadius: '12px',
                border: '1px solid #fecaca',
                textAlign: 'left',
              }}>
                <div style={{ 
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#991b1b',
                  marginBottom: '8px',
                }}>
                  Technical Details:
                </div>
                <div style={{ 
                  fontSize: '0.7rem',
                  color: '#dc2626',
                  fontFamily: 'monospace',
                  lineHeight: '1.5',
                  wordBreak: 'break-word',
                  maxHeight: '100px',
                  overflowY: 'auto',
                }}>
                  {this.state.error?.message || 'Unknown error'}
                </div>
              </div>
            </div>
            
            
          </AbsoluteFill>
        );
      };
      
      return React.createElement(ErrorDisplay);
    }

    return React.createElement(${scene.componentName});
  }
}

// Enhanced Audio Component with Fade Effects
const EnhancedAudio = ({ audioData }) => {
  const frame = useCurrentFrame();
  // Audio trimming: startTime is where in the audio file to start playing from
  const audioOffsetFrames = Math.floor((audioData.startTime || 0) * 30);
  const audioEndFrames = Math.floor((audioData.endTime || audioData.duration || 0) * 30);
  const audioDurationFrames = audioEndFrames - audioOffsetFrames;
  
  // Timeline positioning: audio always starts at frame 0 in the video
  const videoStartFrame = 0;
  
  const fadeInFrames = Math.floor((audioData.fadeInDuration || 0) * 30);
  const fadeOutFrames = Math.floor((audioData.fadeOutDuration || 0) * 30);
  
  // Calculate volume with fade effects
  let volume = audioData.volume;
  
  // Apply fade in (relative to video timeline)
  if (fadeInFrames > 0 && frame < videoStartFrame + fadeInFrames) {
    volume *= interpolate(
      frame,
      [videoStartFrame, videoStartFrame + fadeInFrames],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }
  
  // Apply fade out (relative to video timeline)
  if (fadeOutFrames > 0 && frame > videoStartFrame + audioDurationFrames - fadeOutFrames) {
    volume *= interpolate(
      frame,
      [videoStartFrame + audioDurationFrames - fadeOutFrames, videoStartFrame + audioDurationFrames],
      [1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }
  
  // Only render if Audio is available
  if (typeof Audio === 'undefined' || !Audio) {
    return null;
  }
  
  return React.createElement(window.Remotion.Sequence, { from: videoStartFrame, durationInFrames: audioDurationFrames },
    React.createElement(window.Remotion.Audio, {
      src: audioData.url,
      startFrom: audioOffsetFrames, // This is the key fix - offset within the audio file
      // endAt intentionally omitted; Sequence duration bounds playback
      volume: volume,
      playbackRate: audioData.playbackRate || 1
    })
  );
};

export default function SingleSceneComposition() {
  // Get audio from props
  const projectAudio = window.projectAudio;
  
  return React.createElement(FontLoader, {},
    React.createElement(window.Remotion.AbsoluteFill, {},
      projectAudio && projectAudio.url && React.createElement(EnhancedAudio, { audioData: projectAudio }),
      React.createElement(SingleSceneErrorBoundary)
    )
  );
}
        `;

        // Use unified builder for single-scene module to avoid inline duplication
        const compositeCode = buildSingleSceneModule({ code: scene.compiledCode, componentName: scene.componentName }, { includeFontsLoader: true, includeIconFallback: true, withAudio: true });
        console.log('[PreviewPanelG] Generated single scene code:', compositeCode);

        // Transform with Sucrase, but fall back to raw JS if parser hits an edge case
        let transformedCode: string;
        try {
          const out = transform(compositeCode, {
            transforms: ['typescript', 'jsx'],
            jsxRuntime: 'classic',
            production: false,
          });
          transformedCode = out.code;
        } catch (e) {
          console.warn('[PreviewPanelG] Sucrase failed on single-scene composite; using raw code fallback', e);
          transformedCode = compositeCode;
        }

        // Sucrase transformation successful
        
        // Cleanup old blob URL before creating new one
        if (componentBlobUrl) {
          URL.revokeObjectURL(componentBlobUrl);
        }
        
        // Create blob URL
        const blob = new Blob([transformedCode], { type: 'application/javascript' });
        const newBlobUrl = URL.createObjectURL(blob);
        setComponentBlobUrl(newBlobUrl);
        
        // Created new single scene blob URL
        
        // Set audio data in window before importing
        const projectState = useVideoState.getState().projects[projectId];
        (window as any).projectAudio = projectState?.audio || null;
        
        // Import the module
        // Importing single scene module
        const module = await import(/* webpackIgnore: true */ newBlobUrl);
        const Component = module.default;
        
        if (!Component) {
          throw new Error('No default export found in generated component');
        }
        
        // Single scene dynamic import successful
        
        // 🚨 CRITICAL: Force new refresh token to guarantee RemotionPreview remount
        const newRefreshToken = `compiled-single-${Date.now()}-${Math.random()}`;
        setRefreshToken(newRefreshToken);
        // Set new refresh token for single scene
        
        setComponentImporter(() => () => Promise.resolve({ default: Component }));
        
      } else {
        // Multi-scene composition logic with compiled scenes
        const sceneImports: string[] = [];
        const sceneComponents: string[] = [];
        // Use ALL scenes for total duration - critical for sync!
        const totalDuration = orderedScenes.reduce((sum, scene) => sum + (scene.duration || 150), 0);
        const allImports = new Set(['Series', 'AbsoluteFill', 'Audio', 'Img', 'Sequence', 'useCurrentFrame', 'useVideoConfig', 'interpolate', 'spring', 'random']);
        
        // Create a map of compiled scenes by ID for proper lookup
        const compiledById = new Map();
        compiledScenes.forEach((compiled, index) => {
          const originalScene = orderedScenes[index];
          if (originalScene) {
            compiledById.set(originalScene.id, compiled);
          }
        });

        // Build scene components for ALL ordered scenes
        orderedScenes.forEach((originalScene, index) => {
          const compiled = compiledById.get(originalScene.id);
          // CRITICAL: Never skip scenes! Use fallback if compilation failed
          if (!originalScene) return; // Only skip if scene itself is missing
          
          try {
            // 🚨 CRITICAL FIX: Handle both valid AND invalid scenes gracefully
            if (compiled && compiled.isValid) {
              // ✅ VALID SCENE: Process normally
              const sceneCode = compiled.compiledCode;
              // Use a STABLE namespace derived from scene ID, not from index
              const shortId = String(originalScene.id || '')
                .replace(/[^a-zA-Z0-9]/g, '')
                .slice(0, 8) || `idx${index}`;
              const sceneNamespaceName = `SceneNS_${shortId}`; // used for error boundary wrapper names
              const startOffset = ((originalScene as any).data?.props?.startOffset) || 0;
              // Cache key based on scene identity + offset + quick code hash
              const codeHash = `${sceneCode.length}-${sceneCode.substring(0, 200).replace(/\s+/g, '')}`;
              const cacheKey = `${originalScene.id}:${startOffset}:${codeHash}`;
              let cacheEntry = nsCacheRef.current.get(cacheKey) as any;
              let wrappedSceneCode: string | undefined = cacheEntry?.code;
              let usedRemotionFns: string[] = cacheEntry?.usedRemotionFns || [];
              if (!wrappedSceneCode) {
                const wrapped = wrapSceneNamespace({
                  sceneCode,
                  index,
                  componentName: compiled.componentName,
                  startOffset,
                  namespaceName: sceneNamespaceName,
                });
                wrappedSceneCode = wrapped.code;
                usedRemotionFns = wrapped.usedRemotionFns;
                nsCacheRef.current.set(cacheKey, { code: wrappedSceneCode, usedRemotionFns });
              }
              usedRemotionFns.forEach((fn) => allImports.add(fn));

              // ✅ VALID: Add working scene with error boundary for runtime protection
              // Heuristic: If scene defines SVG defs/filters/gradients, disable premount to avoid DOM ID collisions
              const hasSvgDefsOrFilters = /React\.createElement\(\s*['"]defs['"]/m.test(wrappedSceneCode!)
                || /linearGradient/m.test(wrappedSceneCode!)
                || /url\(#/m.test(wrappedSceneCode!)
                || /clipPath/m.test(wrappedSceneCode!)
                || /mask\s*:/m.test(wrappedSceneCode!);
              const premountValue = hasSvgDefsOrFilters ? 0 : 60;
              const errorBoundaryWrapper = `
// React Error Boundary for Scene ${index} (Valid)
var ${sceneNamespaceName}ErrorBoundary = class extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Scene ${index} runtime error caught by boundary:', error, errorInfo);
    
    // 🚨 RUNTIME ERROR: Dispatch error event to ChatPanelG for auto-fix
    const errorEvent = new CustomEvent('preview-scene-error', {
      detail: {
        sceneId: '${originalScene.id}',
        sceneName: ${JSON.stringify((originalScene.data as any)?.name || ('Scene ' + (index + 1)))},
        error: error
      }
    });
    window.dispatchEvent(errorEvent);
  }

  render() {
    if (this.state.hasError) {
      // Create a function component that can use hooks for the error display
      const ErrorDisplay = () => {
        const { useCurrentFrame, useVideoConfig, interpolate, spring } = window.Remotion;
        const frame = useCurrentFrame();
        const { fps } = useVideoConfig();
        
        const opacity = interpolate(frame, [0, 20], [0, 1], {
          extrapolateRight: 'clamp',
        });
        
        const scale = spring({
          frame,
          fps,
          from: 0.95,
          to: 1,
          config: {
            damping: 20,
            stiffness: 40,
          },
        });
        
        return React.createElement('div', {
          style: {
            width: '100%',
            height: '100%',
            background: 'linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity,
          }
        }, 
          React.createElement('div', {
            style: {
              background: 'white',
              borderRadius: '24px',
              padding: '48px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.12)',
              maxWidth: '640px',
              textAlign: 'center',
              transform: \`scale(\${scale})\`,
              fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              position: 'relative',
            }
          }, [
            // Status Badge
            React.createElement('div', {
              key: 'badge',
              style: {
                position: 'absolute',
                top: '20px',
                right: '20px',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }
            }, [
              React.createElement('span', {
                key: 'pulse',
                style: {
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: 'white',
                  animation: 'pulse 1.5s ease-in-out infinite',
                }
              }),
              'AI FIXING IN PROGRESS'
            ]),
            
            React.createElement('div', {
              key: 'icon',
              style: { 
                fontSize: '4rem', 
                marginBottom: '1.5rem',
              }
            }, '⚡'),
            
            React.createElement('h3', {
              key: 'title',
              style: { 
                color: '#92400e', 
                marginBottom: '12px',
                fontSize: '1.75rem',
                fontWeight: '700'
              }
            }, 'Runtime Error - Scene ${index + 1}'),
            
            React.createElement('p', {
              key: 'scene-name',
              style: { 
                color: '#b45309', 
                marginBottom: '8px',
                fontSize: '1.125rem',
                fontWeight: '500'
              }
            }, ${JSON.stringify((originalScene.data as any)?.name || 'Unnamed Scene')}),
            
            React.createElement('p', {
              key: 'msg',
              style: { 
                color: '#6b7280', 
                marginBottom: '32px',
                fontSize: '1rem',
                lineHeight: '1.6',
                maxWidth: '480px',
                margin: '16px auto 32px',
              }
            }, [
              'The scene compiled successfully but crashed during playback.',
              React.createElement('strong', {
                key: 'good-news',
                style: { color: '#059669', display: 'block', marginTop: '12px' }
              }, "Don't worry! Our AI agent is automatically fixing this and will update your video shortly.")
            ]),
            
            // Progress indicator
            React.createElement('div', {
              key: 'progress',
              style: {
                background: '#fef3c7',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px',
              }
            }, [
              React.createElement('div', {
                key: 'progress-content',
                style: {
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '12px',
                  marginBottom: '12px',
                }
              }, [
                React.createElement('div', {
                  key: 'spinner',
                  style: {
                    width: '40px',
                    height: '40px',
                    borderRadius: '50%',
                    border: '3px solid #fed7aa',
                    borderTopColor: '#f59e0b',
                    animation: 'spin 1s linear infinite',
                  }
                }),
                React.createElement('div', {
                  key: 'progress-text',
                  style: { textAlign: 'left' }
                }, [
                  React.createElement('div', {
                    key: 'agent-status',
                    style: { fontSize: '0.875rem', fontWeight: '600', color: '#92400e' }
                  }, 'Auto-Fix Agent Working'),
                  React.createElement('div', {
                    key: 'agent-action',
                    style: { fontSize: '0.75rem', color: '#b45309' }
                  }, 'Debugging and repairing...')
                ])
              ]),
              React.createElement('div', {
                key: 'eta',
                style: {
                  fontSize: '0.75rem',
                  color: '#92400e',
                  marginTop: '8px',
                }
              }, 'Typically resolves in 15-30 seconds')
            ]),
            
            React.createElement('div', {
              key: 'status',
              style: { 
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                color: '#10b981',
                fontSize: '0.875rem',
                fontWeight: '600',
                marginBottom: '24px',
              }
            }, [
              React.createElement('span', {
                key: 'dot',
                style: { 
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  background: '#10b981',
                  display: 'inline-block'
                }
              }),
              'Your other scenes are playing normally'
            ]),
            
            React.createElement('div', {
              key: 'error-details',
              style: { 
                marginTop: '24px',
                padding: '16px',
                background: '#fef2f2',
                borderRadius: '12px',
                border: '1px solid #fecaca',
                textAlign: 'left',
              }
            }, [
              React.createElement('div', {
                key: 'details-title',
                style: { 
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: '#991b1b',
                  marginBottom: '8px',
                }
              }, 'Technical Details:'),
              React.createElement('div', {
                key: 'error-text',
                style: { 
                  fontSize: '0.7rem',
                  color: '#dc2626',
                  fontFamily: 'monospace',
                  lineHeight: '1.5',
                  wordBreak: 'break-word',
                  maxHeight: '100px',
                  overflowY: 'auto',
                }
              }, this.state.error?.message || 'Unknown error')
            ])
          ])
        );
      };
      
      return React.createElement(ErrorDisplay);
    }

    return React.createElement(${sceneNamespaceName}.Comp);
  }
}

var ${sceneNamespaceName}WithErrorBoundary = function() {
  return React.createElement(${sceneNamespaceName}ErrorBoundary);
}`;
              
              sceneImports.push(wrappedSceneCode!);
              sceneImports.push(errorBoundaryWrapper);
              // Render with error boundary; offset applied via namespaced useCurrentFrame
              sceneComponents.push(`
                React.createElement(window.Remotion.Series.Sequence, { durationInFrames: ${originalScene.duration || 150}, premountFor: ${premountValue} },
                  React.createElement(${sceneNamespaceName}WithErrorBoundary, {})
                )
              `);
              
            } else if (compiled) {
              // 🚨 INVALID SCENE: Already has fallback code, just add it with error boundary
              // Scene isolation: failed compilation, using safe fallback
              
              // ✅ INVALID: Add fallback scene (compiled.compiledCode is already the fallback)
              sceneImports.push(compiled.compiledCode);
              sceneComponents.push(`
                React.createElement(window.Remotion.Series.Sequence, { durationInFrames: ${originalScene.duration || 150}, premountFor: 60 },
                  React.createElement(${compiled.componentName}, {})
                )
              `);
            } else {
              // 🚨 NO COMPILATION RESULT: Scene wasn't compiled at all (e.g., no code)
              // Add a placeholder to maintain timeline sync
              const placeholderScene = createFallbackScene(
                (originalScene.data as any)?.name || (originalScene as any).name || `Scene ${index + 1}`,
                index,
                'Scene has no code',
                originalScene.id
              );
              sceneImports.push(placeholderScene);
              sceneComponents.push(`
                React.createElement(window.Remotion.Series.Sequence, { durationInFrames: ${originalScene.duration || 150}, premountFor: 60 },
                  React.createElement(FallbackScene${index}, {})
                )
              `);
            }

          } catch (error) {
            console.error(`[PreviewPanelG] Error processing scene ${index}:`, error);
            // 🚨 LAST RESORT: Add emergency fallback for this scene
            const emergencyFallback = `
function EmergencyScene${index}() {
  const { AbsoluteFill, useCurrentFrame, interpolate } = window.Remotion;
  const frame = useCurrentFrame();
  
  const opacity = interpolate(frame, [0, 15], [0, 1], {
    extrapolateRight: 'clamp',
  });
  
  return React.createElement(AbsoluteFill, {
    style: {
      background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      opacity,
    }
  }, 
    React.createElement('div', {
      style: {
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
        maxWidth: '380px',
        textAlign: 'center',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      }
    }, [
      React.createElement('div', {
        key: 'icon',
        style: { 
          fontSize: '2.5rem', 
          marginBottom: '0.75rem',
        }
      }, '🚧'),
      
      React.createElement('h3', {
        key: 'title',
        style: { 
          color: '#dc2626', 
          marginBottom: '8px',
          fontSize: '1.125rem',
          fontWeight: '600'
        }
      }, 'Scene ${index + 1} Unavailable'),
      
      React.createElement('p', {
        key: 'msg',
        style: { 
          color: '#b91c1c', 
          marginBottom: '12px',
          fontSize: '0.875rem',
          opacity: 0.9
        }
      }, 'This scene encountered critical errors during processing.'),
      
      React.createElement('div', {
        key: 'status',
        style: { 
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          background: '#dcfce7',
          color: '#166534',
          fontSize: '0.75rem',
          fontWeight: '500',
          padding: '4px 12px',
          borderRadius: '9999px',
        }
      }, [
        React.createElement('span', {
          key: 'dot',
          style: { 
            width: '5px',
            height: '5px',
            borderRadius: '50%',
            background: '#166534',
            display: 'inline-block'
          }
        }),
        'Other scenes continue normally'
      ])
    ])
  );
}`;
            sceneImports.push(emergencyFallback);
              sceneComponents.push(`
              React.createElement(window.Remotion.Series.Sequence, { durationInFrames: ${originalScene.duration || 150}, premountFor: 60 },
                React.createElement(EmergencyScene${index}, {})
              )
            `);
          }
        });

        // Create ONE destructuring statement with ALL unique imports
        // Always include Audio and related functions if project has audio
        if (projectAudio?.url) {
          allImports.add('Audio');
          allImports.add('useCurrentFrame');
          allImports.add('interpolate');
          allImports.add('Sequence');
        }
        
        const allImportsArray = Array.from(allImports);
        const singleDestructuring = ``; // Avoid module-scope destructuring; wrapper uses window.Remotion.*

        // Check if any scene already has window.Remotion destructuring
        const anySceneHasRemotionDestructuring = sceneComponents.some(comp => 
          comp.includes('= window.Remotion')
        );

        // Generate the composite code with single destructuring at top
        const headerMulti = buildCompositeHeader({ includeIconFallback: true, includeFontsLoader: true });
        const __unusedLegacyCompositeMulti = `
${headerMulti}
// Load Google Fonts for consistent rendering between preview and export
if (typeof window !== 'undefined' && !window.bazaarFontsLoaded) {
  const link = document.createElement('link');
  link.rel = 'preconnect';
  link.href = 'https://fonts.googleapis.com';
  document.head.appendChild(link);
  const link2 = document.createElement('link');
  link2.rel = 'preconnect';
  link2.href = 'https://fonts.gstatic.com';
  link2.crossOrigin = 'anonymous';
  document.head.appendChild(link2);
  const fontGroups = [
    // Group 1: Core Sans-Serif - Ensure Inter 700 is explicitly included
    'Inter:wght@100;200;300;400;500;600;700;800;900&family=Roboto:wght@100;300;400;500;700;900&family=Poppins:wght@100..900&family=Montserrat:wght@100..900&family=Open+Sans:wght@300..800&family=Lato:wght@100;300;400;700;900&family=Raleway:wght@100..900&family=Ubuntu:wght@300..700&family=Oswald:wght@200..700&family=Nunito:wght@200..900',
    // Group 2: Extended Sans-Serif
    'Work+Sans:wght@100..900&family=Rubik:wght@300..900&family=Barlow:wght@100..900&family=Kanit:wght@100..900&family=DM+Sans:wght@400..700&family=Plus+Jakarta+Sans:wght@200..800&family=Space+Grotesk:wght@300..700&family=Outfit:wght@100..900&family=Lexend:wght@100..900&family=Manrope:wght@200..800',
    // Group 3: Serif & Display
    'Playfair+Display:wght@400..900&family=Merriweather:wght@300..900&family=Lora:wght@400..700&family=Roboto+Slab:wght@100..900&family=Bebas+Neue&family=Permanent+Marker&family=Lobster&family=Dancing+Script:wght@400..700&family=Pacifico&family=Caveat:wght@400..700',
    // Group 4: Monospace & Additional
    'Roboto+Mono:wght@100..700&family=Fira+Code:wght@300..700&family=JetBrains+Mono:wght@100..800&family=Source+Code+Pro:wght@200..900&family=Quicksand:wght@300..700&family=Comfortaa:wght@300..700&family=Righteous&family=Anton&family=Fredoka:wght@300..700&family=Bungee'
  ];
  
  fontGroups.forEach((group, index) => {
    const fontsLink = document.createElement('link');
    fontsLink.rel = 'stylesheet';
    fontsLink.href = 'https://fonts.googleapis.com/css2?' + group + '&display=swap';
    fontsLink.setAttribute('data-font-group', String(index + 1));
    document.head.appendChild(fontsLink);
  });
  
  console.log('[Bazaar] Loading 100+ Google Fonts for consistent rendering');
  
  window.bazaarFontsLoaded = true;
  console.log('[Bazaar] Google Fonts loaded for consistent rendering');
}

// FontLoader is defined by buildCompositeHeader; do not redeclare here

// Create a REAL implementation of RemotionGoogleFonts that actually loads fonts
if (!window.RemotionGoogleFontsLoaded) {
  window.RemotionGoogleFontsLoaded = new Set();
}

window.RemotionGoogleFonts = {
  loadFont: (fontFamily, options) => {
    const fontKey = \`\${fontFamily}-\${JSON.stringify(options?.weights || [])}\`;
    
    if (!window.RemotionGoogleFontsLoaded.has(fontKey)) {
      window.RemotionGoogleFontsLoaded.add(fontKey);
      
      // Build the Google Fonts URL with the specific weights
      const weights = options?.weights || ['400'];
      const weightString = weights.join(';');
      const fontUrl = \`https://fonts.googleapis.com/css2?family=\${fontFamily.replace(' ', '+')}:wght@\${weightString}&display=swap\`;
      
      // Create and inject the font link
      const linkId = \`font-\${fontFamily}-\${weightString}\`.replace(/[^a-zA-Z0-9-]/g, '');
      if (!document.getElementById(linkId)) {
        const link = document.createElement('link');
        link.id = linkId;
        link.rel = 'stylesheet';
        link.href = fontUrl;
        document.head.appendChild(link);
        console.log(\`[PreviewPanelG] Loading font: \${fontFamily} with weights \${weights.join(', ')}\`);
        
        // Force font loading by checking if it's available
        if (document.fonts && document.fonts.check) {
          setTimeout(() => {
            weights.forEach(weight => {
              const testString = \`\${weight} 16px "\${fontFamily}"\`;
              if (!document.fonts.check(testString)) {
                console.log(\`[PreviewPanelG] Font not yet loaded: \${testString}\`);
                // Try to trigger loading by using the font
                const testDiv = document.createElement('div');
                testDiv.style.fontFamily = \`"\${fontFamily}", sans-serif\`;
                testDiv.style.fontWeight = weight;
                testDiv.style.position = 'absolute';
                testDiv.style.visibility = 'hidden';
                testDiv.textContent = 'Test';
                document.body.appendChild(testDiv);
                setTimeout(() => document.body.removeChild(testDiv), 100);
              } else {
                console.log(\`[PreviewPanelG] Font confirmed loaded: \${testString}\`);
              }
            });
          }, 500); // Give time for CSS to load
        }
      }
    }
    
    // Return a mock result similar to @remotion/google-fonts
    return {
      fontFamily: fontFamily,
      fonts: {},
      unicodeRanges: {},
      waitUntilDone: () => Promise.resolve()
    };
  }
};

${sceneImports.join('\n\n')}

// Enhanced Audio Component with Fade Effects
const EnhancedAudio = ({ audioData }) => {
  const frame = useCurrentFrame();
  // Audio trimming: startTime is where in the audio file to start playing from
  const audioOffsetFrames = Math.floor((audioData.startTime || 0) * 30);
  const audioEndFrames = Math.floor((audioData.endTime || audioData.duration || 0) * 30);
  const audioDurationFrames = audioEndFrames - audioOffsetFrames;
  
  // Timeline positioning: audio always starts at frame 0 in the video
  const videoStartFrame = 0;
  
  const fadeInFrames = Math.floor((audioData.fadeInDuration || 0) * 30);
  const fadeOutFrames = Math.floor((audioData.fadeOutDuration || 0) * 30);
  
  // Calculate volume with fade effects
  let volume = audioData.volume;
  
  // Apply fade in (relative to video timeline)
  if (fadeInFrames > 0 && frame < videoStartFrame + fadeInFrames) {
    volume *= interpolate(
      frame,
      [videoStartFrame, videoStartFrame + fadeInFrames],
      [0, 1],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }
  
  // Apply fade out (relative to video timeline)
  if (fadeOutFrames > 0 && frame > videoStartFrame + audioDurationFrames - fadeOutFrames) {
    volume *= interpolate(
      frame,
      [videoStartFrame + audioDurationFrames - fadeOutFrames, videoStartFrame + audioDurationFrames],
      [1, 0],
      { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
    );
  }
  
  // Only render if Audio is available
  if (typeof Audio === 'undefined' || !Audio) {
    return null;
  }
  
  return React.createElement(Sequence, { from: videoStartFrame, durationInFrames: audioDurationFrames },
    React.createElement(Audio, {
      src: audioData.url,
      startFrom: audioOffsetFrames, // This is the key fix - offset within the audio file
      volume: volume,
      playbackRate: audioData.playbackRate || 1
    })
  );
};

export default function MultiSceneComposition(props) {
  // Get audio from props passed by Remotion Player
  const projectAudio = props?.audio || window.projectAudio;
  
  // Debug audio
  React.useEffect(() => {
    console.log('[MultiSceneComposition] Audio data:', projectAudio);
    if (projectAudio) {
      console.log('[MultiSceneComposition] Audio URL:', projectAudio.url);
      console.log('[MultiSceneComposition] Audio volume:', projectAudio.volume);
      console.log('[MultiSceneComposition] Audio duration:', projectAudio.duration);
    }
  }, [projectAudio]);
  
  return React.createElement(FontLoader, {},
    React.createElement(window.Remotion.AbsoluteFill, {},
      projectAudio && projectAudio.url && React.createElement(EnhancedAudio, { audioData: projectAudio }),
      // NO LOOP! Direct Series for proper frame mapping
      React.createElement(window.Remotion.Series, {},
        ${sceneComponents.join(',\n          ')}
      )
    )
  );
}
        `;

        // Generated multi-scene composite code
        // Use unified builder for multi-scene module
        const compositeCode = buildMultiSceneModule({ sceneImports, sceneComponents, includeFontsLoader: true, includeIconFallback: true, totalDurationInFrames: totalDuration });

        // Transform with Sucrase, but fall back to raw JS if parser hits an edge case
        let transformedCode: string;
        try {
          const out = transform(compositeCode, {
            transforms: ['typescript', 'jsx'],
            jsxRuntime: 'classic',
            production: false,
          });
          transformedCode = out.code;
        } catch (e) {
          console.warn('[PreviewPanelG] Sucrase failed on multi-scene composite; using raw code fallback', e);
          transformedCode = compositeCode;
        }
        
        // Cleanup old blob URL before creating new one
        if (componentBlobUrl) {
          URL.revokeObjectURL(componentBlobUrl);
        }
        
        // Create blob URL
        const blob = new Blob([transformedCode], { type: 'application/javascript' });
        const newBlobUrl = URL.createObjectURL(blob);
        setComponentBlobUrl(newBlobUrl);
        
        // Created new multi-scene blob URL
        
        // Set audio data in window before importing
        const projectState = useVideoState.getState().projects[projectId];
        (window as any).projectAudio = projectState?.audio || null;
        
        // Import the module
        // Importing multi-scene module
        const module = await import(/* webpackIgnore: true */ newBlobUrl);
        const Component = module.default;
        
        if (!Component) {
          throw new Error('No default export found in generated component');
        }
        
        // Multi-scene dynamic import successful
        
        // 🚨 CRITICAL: Force new refresh token to guarantee RemotionPreview remount
        const newRefreshToken = `compiled-multi-${Date.now()}-${Math.random()}`;
        setRefreshToken(newRefreshToken);
        // Set new refresh token for multi scene
        
        setComponentImporter(() => () => Promise.resolve({ default: Component }));
      }
      
    } catch (error) {
      console.error('[PreviewPanelG] Error during composition compilation:', error);
      
      // Try to identify which scene might be causing the issue
      let problematicSceneInfo = null;
      if (error instanceof Error) {
        problematicSceneInfo = detectProblematicScene(error, compiledScenes, orderedScenes);
        
        if (problematicSceneInfo) {
          const enhancedMessage = enhanceErrorMessage(error, problematicSceneInfo);
          console.error('[PreviewPanelG] Scene-specific error detected:', enhancedMessage);
          
          // Create a more informative error
          error = new Error(enhancedMessage);
        }
      }
      
      // 🚨 CRITICAL FIX: Dispatch error event for autofixer when compilation fails
      if (problematicSceneInfo) {
        // We know which specific scene is problematic
        const problematicScene = orderedScenes[problematicSceneInfo.sceneIndex];
        if (problematicScene) {
          // Compilation error: dispatching error for specific scene
          const errorEvent = new CustomEvent('preview-scene-error', {
            detail: {
              sceneId: problematicSceneInfo.sceneId,
              sceneName: problematicSceneInfo.sceneName,
              sceneIndex: problematicSceneInfo.sceneIndex + 1,
              error: error
            }
          });
          window.dispatchEvent(errorEvent);
        }
      } else {
        // Fallback to first scene if we can't identify the specific one
        const firstSceneWithCode = orderedScenes[0];
        if (firstSceneWithCode) {
          // Compilation error: dispatching preview-scene-error event for autofixer
          const errorEvent = new CustomEvent('preview-scene-error', {
            detail: {
              sceneId: firstSceneWithCode.id,
              sceneName: (firstSceneWithCode.data as any)?.name || 'Scene 1',
              error: error
            }
          });
          window.dispatchEvent(errorEvent);
        }
      }
      
      // IDIOT PROOF: Create a simple fallback that always works
      try {
        // Creating fallback composition
        const fallbackCode = `
const { AbsoluteFill } = window.Remotion;

export default function FallbackComposition() {
  return (
    <AbsoluteFill style={{
      backgroundColor: '#f5f5f5',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      padding: '40px',
      textAlign: 'center'
    }}>
      <div style={{
        backgroundColor: '#ffebee',
        border: '2px dashed #f44336',
        borderRadius: '12px',
        padding: '30px',
        maxWidth: '500px'
      }}>
        <h2 style={{ color: '#d32f2f', marginBottom: '16px', fontSize: '24px' }}>
          ⚡ Oops, it broke
        </h2>
        <p style={{ color: '#666', marginBottom: '16px', lineHeight: '1.5' }}>
          But don't worry, we already have an agent on it.
        </p>
        <p style={{ color: '#666', marginBottom: '16px', lineHeight: '1.5' }}>
          Give it a couple of seconds.
        </p>
        <p style={{ color: '#666', marginBottom: '16px', lineHeight: '1.5', fontWeight: 'bold' }}>
          Thanks for reading. You are awesome! 🎉
        </p>
      </div>
    </AbsoluteFill>
  );
}`;

        const { code: fallbackTransformed } = transform(fallbackCode, {
          transforms: ['typescript', 'jsx'],
          jsxRuntime: 'classic',
          production: false,
        });

        const fallbackBlob = new Blob([fallbackTransformed], { type: 'application/javascript' });
        const fallbackBlobUrl = URL.createObjectURL(fallbackBlob);
        const fallbackModule = await import(/* webpackIgnore: true */ fallbackBlobUrl);
        
        setComponentImporter(() => () => Promise.resolve({ default: fallbackModule.default }));
        setComponentError(new Error(`Compilation failed: ${error instanceof Error ? error.message : String(error)}`));
        
        URL.revokeObjectURL(fallbackBlobUrl);
      } catch (fallbackError) {
        console.error('[PreviewPanelG] Even fallback compilation failed:', fallbackError);
        
        // 🚨 CRITICAL FIX: Dispatch error event even for fallback failures
        const firstSceneWithCode = orderedScenes[0];
        if (firstSceneWithCode) {
          // Fallback error: dispatching preview-scene-error event for autofixer
          const errorEvent = new CustomEvent('preview-scene-error', {
            detail: {
              sceneId: firstSceneWithCode.id,
              sceneName: (firstSceneWithCode.data as any)?.name || 'Scene 1',
              error: fallbackError
            }
          });
          window.dispatchEvent(errorEvent);
        }
        
        setComponentError(new Error('Critical compilation failure'));
      }
    } finally {
      setIsCompiling(false);
    }
  }, [scenes]);

  // 🚨 SMART COMPILATION: Use ref to avoid recreating timer on every render
  const compilationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastCompiledFingerprintRef = useRef<string>('');
  const isCompilingRef = useRef<boolean>(false);
  const pendingFingerprintRef = useRef<string | null>(null);
  
  useEffect(() => {
    const currentFingerprint = `${scenesFingerprint}-${audioFingerprint}-len:${scenes.length}`;

    // Skip if fingerprint hasn't actually changed (prevents duplicate compiles)
    if (currentFingerprint === lastCompiledFingerprintRef.current) {
      console.log('[PreviewPanelG] 🎯 Fingerprint unchanged, skipping compilation');
      return;
    }

    // For zero scenes, compile immediately to placeholder (no debounce)
    if (scenes.length === 0) {
      if (compilationTimerRef.current) clearTimeout(compilationTimerRef.current);
      lastCompiledFingerprintRef.current = currentFingerprint;
      (async () => {
        if (isCompilingRef.current) {
          // Queue this fingerprint to compile next
          pendingFingerprintRef.current = currentFingerprint;
          return;
        }
        isCompilingRef.current = true;
        try {
          await compileMultiSceneComposition();
        } finally {
          isCompilingRef.current = false;
          // If something arrived while compiling, immediately compile again
          if (pendingFingerprintRef.current && pendingFingerprintRef.current !== lastCompiledFingerprintRef.current) {
            const next = pendingFingerprintRef.current;
            pendingFingerprintRef.current = null;
            lastCompiledFingerprintRef.current = next;
            isCompilingRef.current = true;
            try { await compileMultiSceneComposition(); } finally { isCompilingRef.current = false; }
          }
        }
      })();
      return;
    }

    // Clear existing timer
    if (compilationTimerRef.current) {
      clearTimeout(compilationTimerRef.current);
    }

    // Set new debounced timer with increased delay to batch rapid updates
    compilationTimerRef.current = setTimeout(async () => {
      // Double-check fingerprint hasn't become the same during debounce
      const latestFingerprint = `${scenesFingerprint}-${audioFingerprint}-len:${scenes.length}`;
      if (latestFingerprint === lastCompiledFingerprintRef.current) {
        console.log('[PreviewPanelG] 🎯 Fingerprint became unchanged during debounce, skipping');
        return;
      }
      
      // If a compile is in progress, queue this fingerprint and exit. It will compile right after.
      if (isCompilingRef.current) {
        console.log('[PreviewPanelG] ⏳ Compiling; queuing next compile');
        pendingFingerprintRef.current = latestFingerprint;
        return;
      }
      
      console.log('[PreviewPanelG] 📝 Scene content changed, triggering compilation');
      console.log('[PreviewPanelG] Old fingerprint:', lastCompiledFingerprintRef.current?.substring(0, 50) + '...');
      console.log('[PreviewPanelG] New fingerprint:', latestFingerprint.substring(0, 50) + '...');
      
      isCompilingRef.current = true;
      lastCompiledFingerprintRef.current = latestFingerprint;
      
      try {
        await compileMultiSceneComposition();
      } finally {
        isCompilingRef.current = false;
        // Immediately run any pending compile that arrived during this one
        if (pendingFingerprintRef.current && pendingFingerprintRef.current !== lastCompiledFingerprintRef.current) {
          const next = pendingFingerprintRef.current;
          pendingFingerprintRef.current = null;
          lastCompiledFingerprintRef.current = next;
          isCompilingRef.current = true;
          try { await compileMultiSceneComposition(); } finally { isCompilingRef.current = false; }
        }
      }
    }, 600); // Increased to 600ms to better batch rapid updates

    // Cleanup on unmount
    return () => {
      if (compilationTimerRef.current) {
        clearTimeout(compilationTimerRef.current);
      }
    };
  }, [scenesFingerprint, audioFingerprint, compileMultiSceneComposition]);


  // Manual refresh
  const handleRefresh = useCallback(() => {
    if (scenes.length > 0) {
      // Manual refresh - recompiling multi-scene
      compileMultiSceneComposition();
    }
  }, [compileMultiSceneComposition]);

  // Listen to explicit code-saved events (immediate recompile signal from editor)
  useEffect(() => {
    const onCodeSaved = async (ev: Event) => {
      const e = ev as CustomEvent;
      if (!e?.detail || e.detail.projectId !== projectId) return;
      const latestFingerprint = `${scenesFingerprint}-${audioFingerprint}-len:${scenes.length}`;
      if (isCompilingRef.current) {
        pendingFingerprintRef.current = latestFingerprint;
        return;
      }
      isCompilingRef.current = true;
      lastCompiledFingerprintRef.current = latestFingerprint;
      try { await compileMultiSceneComposition(); } finally { isCompilingRef.current = false; }
    };
    window.addEventListener('code-saved', onCodeSaved as EventListener);
    return () => window.removeEventListener('code-saved', onCodeSaved as EventListener);
  }, [projectId, scenesFingerprint, audioFingerprint, scenes.length, compileMultiSceneComposition]);

  // Honor global project refresh token by nudging local refresh and compile
  useEffect(() => {
    if (!projectRefreshToken) return;
    // Nudge player remount
    setRefreshToken(`store-${projectRefreshToken}-${Date.now()}`);
    // Kick a compile cycle if idle
    const latestFingerprint = `${scenesFingerprint}-${audioFingerprint}-len:${scenes.length}`;
    if (isCompilingRef.current) {
      pendingFingerprintRef.current = latestFingerprint;
      return;
    }
    (async () => {
      isCompilingRef.current = true;
      lastCompiledFingerprintRef.current = latestFingerprint;
      try { await compileMultiSceneComposition(); } finally { isCompilingRef.current = false; }
    })();
  }, [projectRefreshToken]);

  // Listen for playback speed change events from header
  useEffect(() => {
    const handleSpeedChange = (event: CustomEvent) => {
      const speed = event.detail?.speed;
      if (typeof speed === 'number' && speed >= 0.1 && speed <= 4) {
        // Received speed change event
        setPlaybackSpeed(speed);
        
        // Save preference per project
        try {
          localStorage.setItem(`bazaar-playback-speed-${projectId}`, speed.toString());
        } catch (error) {
          console.warn('[PreviewPanelG] Failed to save playback speed preference:', error);
        }
      }
    };

    window.addEventListener('playback-speed-change', handleSpeedChange as EventListener);
    return () => {
      window.removeEventListener('playback-speed-change', handleSpeedChange as EventListener);
    };
  }, [projectId]);

  // Load saved playback speed preference on mount (project-specific)
  useEffect(() => {
    try {
      const savedSpeed = localStorage.getItem(`bazaar-playback-speed-${projectId}`);
      if (savedSpeed) {
        const speed = parseFloat(savedSpeed);
        if (speed >= 0.1 && speed <= 4) {
          setPlaybackSpeed(speed);
          // Loaded saved playback speed for project
          
          // Dispatch event to update header display
          const event = new CustomEvent('playback-speed-loaded', { detail: { speed } });
          window.dispatchEvent(event);
        }
      } else {
        // Reset to default speed when switching projects
        setPlaybackSpeed(1);
        const event = new CustomEvent('playback-speed-loaded', { detail: { speed: 1 } });
        window.dispatchEvent(event);
      }
    } catch (error) {
      console.warn('[PreviewPanelG] Failed to load playback speed preference:', error);
      // Reset to default on error
      setPlaybackSpeed(1);
    }
  }, [projectId]);

  // Listen for scenes created in bulk
  useEffect(() => {
    const handleScenesCreatedBulk = (event: CustomEvent) => {
      if (event.detail?.projectId === projectId) {
        // Bulk scenes created, refreshing
        // Force a re-render by updating refresh token
        setRefreshToken(`bulk-${Date.now()}`);
        // Recompile the scenes
        if (scenes.length > 0 || event.detail?.count > 0) {
          setTimeout(() => {
            compileMultiSceneComposition();
          }, 500); // Small delay to ensure data is synced
        }
      }
    };

    const handleSceneCreated = (event: CustomEvent) => {
      if (event.detail?.projectId === projectId) {
        // Single scene created, refreshing
        setRefreshToken(`single-${Date.now()}`);
        if (scenes.length > 0) {
          setTimeout(() => {
            compileMultiSceneComposition();
          }, 500);
        }
      }
    };

    window.addEventListener('scenes-created-bulk', handleScenesCreatedBulk as EventListener);
    window.addEventListener('scene-created', handleSceneCreated as EventListener);
    return () => {
      window.removeEventListener('scenes-created-bulk', handleScenesCreatedBulk as EventListener);
      window.removeEventListener('scene-created', handleSceneCreated as EventListener);
    };
  }, [projectId, compileMultiSceneComposition, scenes.length]);

  // Listen for loop state change events from header
  useEffect(() => {
    const handleLoopStateChange = (event: CustomEvent) => {
      const state = event.detail?.state;
      if (state === 'video' || state === 'off' || state === 'scene') {
        // Received loop state change
        setLoopState(state);
        
        // Save preference per project
        try {
          localStorage.setItem(`bazaar-loop-state-${projectId}`, state);
        } catch (error) {
          console.warn('[PreviewPanelG] Failed to save loop state preference:', error);
        }
      }
    };

    window.addEventListener('loop-state-change', handleLoopStateChange as EventListener);
    return () => {
      window.removeEventListener('loop-state-change', handleLoopStateChange as EventListener);
    };
  }, [projectId]);

  // Load saved loop preference on mount (project-specific)
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(`bazaar-loop-state-${projectId}`);
      let state: 'video' | 'off' | 'scene' = 'video'; // Default to video loop
      
      if (savedState === 'video' || savedState === 'off' || savedState === 'scene') {
        state = savedState;
      }
      
      setLoopState(state);
      
      // Dispatch event to sync with header
      const event = new CustomEvent('loop-state-loaded', { detail: { state } });
      window.dispatchEvent(event);
      // Loop state initialized for project
    } catch (error) {
      console.warn('[PreviewPanelG] Failed to load loop preference:', error);
      // Even on error, ensure default video loop
      setLoopState('video');
    }
  }, [projectId]);

  // Ensure loop target changes take effect immediately by nudging refreshToken
  useEffect(() => {
    // Remount the Remotion Player when switching between scene/video loop or when scene range changes
    const start = selectedSceneRange?.start ?? -1;
    const end = selectedSceneRange?.end ?? -1;
    setRefreshToken(`loop-${loopState}-${start}-${end}-${Date.now()}`);
  }, [loopState, selectedSceneRange?.start, selectedSceneRange?.end]);

  // Cleanup effect for component unmount
  useEffect(() => {
    return () => {
      // Cleanup blob URLs to prevent memory leaks
      if (componentBlobUrl) {
        URL.revokeObjectURL(componentBlobUrl);
      }
      
      // Event listeners are already cleaned up in their respective useEffects
      // but we could add additional cleanup here if needed
    };
  }, [componentBlobUrl]);

  // Player props
  const playerProps = useMemo(() => {
    // Calculate total duration of all scenes for proper multi-scene playback
    const totalDuration = scenes.length
      ? scenes.reduce((sum, scene) => sum + (scene.duration || 150), 0)
      : 150; // Minimal placeholder duration when no scenes
    
    // Get format dimensions from project props, fallback to landscape
    const width = currentProps?.meta?.width || 1920;
    const height = currentProps?.meta?.height || 1080;
    const format = currentProps?.meta?.format || 'landscape';
    
    return {
      fps: 30,
      width,
      height,
      format,
      durationInFrames: totalDuration, // Use total duration (or placeholder when empty)
      inputProps: {
        audio: projectAudio || null
      }
    };
  }, [scenes, currentProps?.meta, projectAudio]);
  
  // Get format icon
  const formatIcon = useMemo(() => {
    const format = currentProps?.meta?.format || 'landscape';
    switch (format) {
      case 'portrait': return '📱';
      case 'square': return '□';
      default: return '🖥️';
    }
  }, [currentProps?.meta?.format]);

  return (
    <div className="h-full min-h-0 min-w-0 flex flex-col bg-gray-100 relative overflow-hidden">
      {/* Hidden refresh button that the upper header can trigger */}
      <button 
        id="refresh-preview-button-g"
        onClick={handleRefresh}
        style={{ display: 'none' }}
        aria-hidden="true"
      />

      <div className="relative flex-grow min-h-0 min-w-0 flex items-center justify-center">
        {/* Preview source indicator removed in this branch */}
        {componentImporter && playerProps ? (
          <div 
            className={cn(
              "relative bg-white shadow-xl flex items-center justify-center",
              // On mobile, optimize for viewport
              "w-full h-full"
            )}
          >
            <ErrorBoundary FallbackComponent={ErrorFallback}>
              {/* Compute safe scene loop window (exclusive outFrame) to satisfy Player constraints */}
              <RemotionPreview
                lazyComponent={componentImporter}
                durationInFrames={playerProps.durationInFrames}
                fps={playerProps.fps}
                width={playerProps.width}
                height={playerProps.height}
                inputProps={playerProps.inputProps}
                refreshToken={refreshToken}
                playerRef={playerRef}
                playbackRate={playbackSpeed}
                loop={loopState !== 'off'}
                // Remotion Player expects inFrame < outFrame < (durationInFrames - 1)
                inFrame={(() => {
                  if (loopState !== 'scene' || !selectedSceneRange || !playerProps) return undefined;
                  return Math.max(0, selectedSceneRange.start);
                })()}
                outFrame={(() => {
                  if (loopState !== 'scene' || !selectedSceneRange || !playerProps) return undefined;
                  const total = playerProps.durationInFrames;
                  const start = Math.max(0, selectedSceneRange.start);
                  const endInclusive = Math.min(total - 1, selectedSceneRange.end);
                  const maxOutExclusive = Math.max(1, total - 2);
                  const desiredOutExclusive = endInclusive + 1; // exclusive end
                  const outExclusive = Math.min(desiredOutExclusive, maxOutExclusive);
                  // Validate window
                  return outExclusive > start ? outExclusive : undefined;
                })()}
                onPlay={() => {
                  setIsPlaying(true);
                  try {
                    // Ensure audio starts at offset for immediate sound if project has audio
                    const pa = (playerProps.inputProps as any)?.audio;
                    const fps = playerProps.fps || 30;
                    const offsetSec = Math.max(0, pa?.timelineOffsetSec || 0);
                    if (playerRef.current && offsetSec > 0) {
                      const current = (playerRef.current as any)?.getCurrentFrame?.() ?? 0;
                      const target = Math.floor(offsetSec * fps);
                      if (typeof current === 'number' && current < target) {
                        playerRef.current.seekTo(target);
                      }
                    }
                  } catch {}
                  const event = new CustomEvent('preview-play-state-change', { 
                    detail: { playing: true }
                  });
                  window.dispatchEvent(event);
                }}
                onPause={() => {
                  setIsPlaying(false);
                  const event = new CustomEvent('preview-play-state-change', { 
                    detail: { playing: false }
                  });
                  window.dispatchEvent(event);
                }}
              />
            </ErrorBoundary>
            {/* Frame counter is now rendered inside the Remotion Player via portal for correct fullscreen behavior. */}
          </div>
        ) : componentError ? (
          <div className="flex items-center justify-center h-full p-4">
            <ErrorFallback error={componentError} />
          </div>
        ) : isCompiling ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="flex items-center space-x-2">
              <RefreshCwIcon className="h-5 w-5 animate-spin" />
              <span>Compiling multi-scene composition...</span>
            </div>
          </div>
        ) : scenes.length ? (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <CodeIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No code available for this scene</p>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-400">
            <div className="text-center">
              <p>No scenes available</p>
              <p className="text-sm mt-1">Generate a scene in the chat to preview it here</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 
