"use client";

import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { useVideoState } from '~/stores/videoState';
import { 
  Play, 
  Pause, 
  SkipBack, 
  SkipForward, 
  ZoomIn, 
  ZoomOut,
  Trash2,
  Copy,
  Edit2,
  GripVertical,
  Music,
  Volume2,
  Upload,
  X,
  Clock,
  Hash,
  Scissors,
  RotateCcw,
  RotateCw
} from 'lucide-react';
import { cn } from '~/lib/cn';
import { nanoid } from 'nanoid';
import { toast } from 'sonner';
import { api } from '~/trpc/react';
import { extractSceneColors } from '~/lib/utils/extract-scene-colors';
import { PlaybackSpeedSlider } from "~/components/ui/PlaybackSpeedSlider";
import { computeSceneRanges, findSceneAtFrame } from '~/lib/utils/scene-ranges';

// Constants from React Video Editor Pro
const ROW_HEIGHT = 60;
const TIMELINE_ITEM_HEIGHT = 40;
const FPS = 30;
// Extra visual space to allow trimming/extending the rightmost scene comfortably.
// Spacer is positioned outside the percent-based content to avoid width drift.
const END_SPACER_PX = 240;

// Define Scene type based on Bazaar-Vid structure
interface Scene {
  id: string;
  name?: string;
  duration: number;  // duration in frames
  start: number;     // start position in frames
  type?: string;
  data?: any;
}

// Audio track interface
interface AudioTrack {
  id: string;
  url: string;
  name: string;
  duration: number;  // in seconds
  startTime: number; // in seconds
  endTime: number;   // in seconds
  volume: number;
  fadeInDuration?: number;
  fadeOutDuration?: number;
  playbackRate?: number;
}

interface TimelinePanelProps {
  projectId: string;
  userId?: string;
  onClose?: () => void;
}

interface DragInfo {
  action: 'resize-start' | 'resize-end' | 'playhead' | 'reorder' | 'audio-move' | 'audio-resize-start' | 'audio-resize-end';
  sceneId?: string;
  startX: number;
  startPosition: number;  // In frames (for scenes/playhead) or px base for audio
  startDuration: number;  // In frames (for scenes)
  sceneIndex?: number;
  // Audio-specific fields
  audioStartSec?: number;
  audioEndSec?: number;
  audioDurationSec?: number;
}

// Helper: Clean technical suffixes from scene names (e.g., _X21YX)
const cleanSceneName = (name?: string) => {
  if (!name) return name;
  return name.replace(/_[A-Z0-9]{4,}$/, '');
};

export default function TimelinePanel({ projectId, userId, onClose }: TimelinePanelProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const timeRulerRef = useRef<HTMLDivElement>(null);
  const innerContentRef = useRef<HTMLDivElement>(null);
  const gestureBaseZoomRef = useRef<number>(1);
  const [isPointerInside, setIsPointerInside] = useState(false);
  const audioCanvasRef = useRef<HTMLCanvasElement>(null);
  const decodedAudioDurationRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isAudioDraggingRef = useRef(false);
  const audioAppliedAtRef = useRef<number>(0); // Track when we last applied audio locally
  const audioInitializedRef = useRef<boolean>(false);
  const timelineId = useRef(`timeline-${Date.now()}-${Math.random()}`);
  
  // Debug: Log when timeline mounts/unmounts
  useEffect(() => {
    console.log('[TimelinePanel] Mounted for project:', projectId, 'ID:', timelineId.current);
    return () => {
      console.log('[TimelinePanel] Unmounted for project:', projectId, 'ID:', timelineId.current);
    };
  }, [projectId]);
  const [zoomScale, setZoomScale] = useState(1);
  const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
  const [dragInfo, setDragInfo] = useState<DragInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sceneId: string } | null>(null);
  const [audioMenu, setAudioMenu] = useState<{ x: number; y: number } | null>(null);
  const [isAudioSelected, setIsAudioSelected] = useState(false);
  const [audioPulse, setAudioPulse] = useState(false);
  // Long-press-to-reorder support (for less sensitive reordering)
  const longPressTimerRef = useRef<number | null>(null);
  const longPressStartRef = useRef<{ x: number; y: number; sceneId: string; sceneStart: number; sceneDuration: number; sceneIndex: number } | null>(null);
  // Track last mouse position without touching window globals
  const lastMouseXRef = useRef<number>(0);
  const lastMouseYRef = useRef<number>(0);
  // Centralized, safe timer cleanup
  const clearLongPress = useCallback(() => {
    const id = longPressTimerRef.current;
    if (id != null) {
      try { window.clearTimeout(id); } catch {}
      longPressTimerRef.current = null;
    }
    longPressStartRef.current = null;
  }, []);
  const audioLastUrlRef = useRef<string | null>(null);
  const audioHadRef = useRef<boolean>(false);
  // Peaks cache and refs
  const peaksCacheRef = useRef<Map<string, number[]>>(new Map()); // url -> peak times in seconds
  const peaksSecondsRef = useRef<number[] | null>(null);
  // Hover tooltip state for peaks
  const [peakTooltip, setPeakTooltip] = useState<{ x: number; y: number; frames: number[] } | null>(null);
  const [editingSceneId, setEditingSceneId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [displayMode, setDisplayMode] = useState<'frames' | 'time'>('frames');
  // Loop controls state (mirrors PreviewPanelG's loopState)
  const [loopState, setLoopState] = useState<'video' | 'off' | 'scene'>('video');
  // Split operation busy flag to prevent repeated clicks and provide feedback
  const [isSplitBusy, setIsSplitBusy] = useState(false);
  // Deletion busy flag to prevent duplicate deletions
  const [isDeletionBusy, setIsDeletionBusy] = useState(false);
  const [pendingDeleteSceneId, setPendingDeleteSceneId] = useState<string | null>(null); // legacy; no longer used for inline confirm
  const deletionInProgressRef = useRef<Set<string>>(new Set());
  
  // Get video state from Zustand store
  const project = useVideoState(state => state.projects[projectId]);
  // Sort scenes by order field to ensure consistency with Preview
  const unsortedScenes = project?.props?.scenes || [];
  const scenes = useMemo(() => 
    [...unsortedScenes].sort((a: any, b: any) => ((a as any).order ?? 0) - ((b as any).order ?? 0)),
    [unsortedScenes]
  );
  
  // Query database for latest project data (including audio)
  const { data: dbProject } = api.project.getById.useQuery(
    { id: projectId },
    { 
      staleTime: 60_000, // Cache for 1 minute
      refetchOnWindowFocus: false 
    }
  );
  
  // Audio state - get from project
  const audioTrack = project?.audio || null;
  
  // Debug log when audio changes
  // useEffect(() => {
  //   console.log('[Timeline] Audio state from store:', {
  //     projectId,
  //     hasProject: !!project,
  //     hasAudio: !!audioTrack,
  //     audioTrack
  //   });
  // }, [projectId, project, audioTrack]);
  
  // Debug scene name changes
  // useEffect(() => {
  //   console.log('[Timeline] Scenes updated:', scenes.map((s: any) => ({
  //     id: s.id,
  //     rootName: s.name,
  //     dataName: s.data?.name,
  //     displayName: cleanSceneName(s.name || s.data?.name) || 'Unnamed'
  //   })));
  // }, [scenes]);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const [audioWaveform, setAudioWaveform] = useState<{peak: number[], rms: number[]}>();
  const DELETE_FADE_MS = 320; // Smooth fade duration for scene removal
  // Smooth delete UX: mark scenes as "deleting" to fade them out before removal
  const [deletingScenes, setDeletingScenes] = useState<Set<string>>(new Set());
  const markDeleting = useCallback((id: string) => {
    setDeletingScenes(prev => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);
  const unmarkDeleting = useCallback((id: string) => {
    setDeletingScenes(prev => {
      if (!prev.has(id)) return prev;
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  }, []);
  
  const updateScene = useVideoState(state => state.updateScene);
  const deleteScene = useVideoState(state => state.deleteScene);
  const pushAction = useVideoState((state: any) => state.pushAction as (projectId: string, action: any) => void);
  const popUndo = useVideoState((state: any) => state.popUndo as (projectId: string) => any);
  const pushRedo = useVideoState((state: any) => state.pushRedo as (projectId: string, action: any) => void);
  const popRedo = useVideoState((state: any) => state.popRedo as (projectId: string) => any);
  const updateProjectAudio = useVideoState(state => state.updateProjectAudio);
  const addPendingDelete = useVideoState((state: any) => state.addPendingDelete as (projectId: string, sceneId: string) => void);
  const clearPendingDelete = useVideoState((state: any) => state.clearPendingDelete as (projectId: string, sceneId: string) => void);
  const reorderScenes = useVideoState(state => state.reorderScenes);
  const storeSetPlaybackSpeed = useVideoState(state => state.setPlaybackSpeed);
  // Undo/Redo stack sizes for UI disabling
  const undoSize = useVideoState(state => (state.undoStacks?.[projectId]?.length ?? 0));
  const redoSize = useVideoState(state => (state.redoStacks?.[projectId]?.length ?? 0));

  // Helper to perform Undo/Redo via buttons (declared later after mutations)
  
  // Persist audio changes with versioned reconciliation
  const updateAudioMutation = api.project.updateAudio.useMutation({
    onMutate: async (vars) => {
      // Record when we applied this optimistically
      const appliedAt = Date.now();
      audioAppliedAtRef.current = appliedAt;
      
      // Cancel ongoing fetches to avoid race during optimistic update
      await utils.project.getById.cancel({ id: projectId });
      const previous = utils.project.getById.getData({ id: projectId });
      const previousAppliedAt = audioAppliedAtRef.current;

      // Optimistically update query cache with timestamp
      utils.project.getById.setData({ id: projectId }, (old: any) => {
        if (!old) return old;
        return { 
          ...old, 
          audio: vars.audio ?? null,
          audioUpdatedAt: new Date(appliedAt)
        };
      });
      
      // Return context for rollback
      return { previous, previousAppliedAt } as { previous: any, previousAppliedAt: number };
    },
    onSuccess: (data) => {
      // Update with server's timestamp
      if (data?.audioUpdatedAt) {
        audioAppliedAtRef.current = data.audioUpdatedAt;
      }
    },
    onError: (error, vars, ctx) => {
      console.error('[Timeline] Failed to persist audio settings:', error);
      // Rollback on error
      if (ctx?.previousAppliedAt) {
        audioAppliedAtRef.current = ctx.previousAppliedAt;
      }
      // Roll back cache
      if (ctx?.previous) {
        utils.project.getById.setData({ id: projectId }, ctx.previous);
        // Roll back local store as well
        const prevAudio = (ctx.previous as any)?.audio ?? null;
        updateProjectAudio(projectId, prevAudio);
      }
      toast.error('Failed to save audio changes');
    },
    onSettled: async () => {
      await utils.project.getById.invalidate({ id: projectId });
    }
  });
  
  // Robust DB → Zustand audio sync
  useEffect(() => {
    if (isAudioDraggingRef.current) return; // don't sync while user is editing
    const dbAudio = (dbProject as any)?.audio ?? null;
    const localAudio = (project as any)?.audio ?? null;

    // When DB says no audio but local has one → clear local
    if (!dbAudio && localAudio && !audioInitializedRef.current) {
      console.log('[Timeline] Clearing local audio to match DB (deleted on server)');
      updateProjectAudio(projectId, null);
      audioHadRef.current = false;
      audioLastUrlRef.current = null;
      setAudioPulse(false);
      return;
    }
    // When DB has audio but local is missing → set local
    if (dbAudio && !localAudio) {
      const audioWithId = { id: (dbAudio as any).id || dbAudio.url || 'default-id', ...dbAudio } as any;
      console.log('[Timeline] Setting local audio from DB');
      updateProjectAudio(projectId, audioWithId);
      // Pulse highlight if newly added or URL changed
      const prevHad = audioHadRef.current;
      const prevUrl = audioLastUrlRef.current;
      audioHadRef.current = true;
      audioLastUrlRef.current = audioWithId.url || null;
      if (!prevHad || prevUrl !== audioWithId.url) {
        setAudioPulse(true);
        window.setTimeout(() => setAudioPulse(false), 1800);
      }
      audioInitializedRef.current = true;
      return;
    }
    // When both exist, sync if they differ (URL or timings/volume)
    if (dbAudio && localAudio) {
      const a = dbAudio;
      const b = localAudio;
      const differs = a.url !== b.url || a.startTime !== b.startTime || a.endTime !== b.endTime || a.volume !== b.volume || (a.playbackRate || 1) !== (b.playbackRate || 1) || (a.fadeInDuration || 0) !== (b.fadeInDuration || 0) || (a.fadeOutDuration || 0) !== (b.fadeOutDuration || 0);
      // After first init, only adopt server when URL changed (source changed) to avoid overwriting in-flight local edits
      if (differs && (!audioInitializedRef.current || a.url !== b.url)) {
        const audioWithId = { id: (a as any).id || a.url || 'default-id', ...a } as any;
        console.log('[Timeline] Updating local audio to match DB changes');
        updateProjectAudio(projectId, audioWithId);
        if (a.url !== b.url) {
          audioLastUrlRef.current = a.url || null;
          setAudioPulse(true);
          window.setTimeout(() => setAudioPulse(false), 1800);
        }
        audioInitializedRef.current = true;
      }
    }
  }, [dbProject?.audio, project, projectId, updateProjectAudio]);
  const storePlaybackSpeed = useVideoState(state => state.projects[projectId]?.playbackSpeed ?? 1);
  
  // tRPC utils for cache invalidation
  const utils = api.useUtils();
  
  // API mutation for persisting duration changes
  const updateSceneDurationMutation = api.scenes.updateSceneDuration.useMutation({
    onSuccess: async (res: any) => {
      console.log('[Timeline] Scene duration persisted to database');
      // Invalidate iterations query to ensure restore button updates
      await utils.generation.getBatchMessageIterations.invalidate();
      // Invalidate project scenes so PreviewPanelG syncs latest durations
      await utils.generation.getProjectScenes.invalidate({ projectId });
      if (res?.newRevision != null) {
        try { (useVideoState.getState().projects as any)[projectId].revision = res.newRevision; } catch {}
      }
    },
    onError: (error) => {
      console.error('[Timeline] Failed to persist scene duration:', error);
      toast.error('Failed to save duration changes');
    }
  });
  
  // API mutation for updating scene name
  const updateSceneNameMutation = api.generation.updateSceneName.useMutation({
    onSuccess: async (res: any) => {
      console.log('[Timeline] Scene name persisted to database');
      await utils.generation.getProjectScenes.invalidate({ projectId });
      if (res?.newRevision != null) {
        try { (useVideoState.getState().projects as any)[projectId].revision = res.newRevision; } catch {}
      }
    },
    onError: (error) => {
      console.error('[Timeline] Failed to persist scene name:', error);
      toast.error('Failed to save scene name');
    }
  });
  
  // API mutation for deleting scenes
  const restoreSceneMutation = api.generation.restoreScene.useMutation({
    onSuccess: async () => {
      await utils.generation.getProjectScenes.invalidate({ projectId });
      toast.success('Undo complete');
    },
    onError: () => toast.error('Failed to undo delete')
  });
  const removeSceneMutation = api.generation.removeScene.useMutation({
    onSuccess: async (res: any) => {
      console.log('[Timeline] Scene deleted from database');
      setPendingDeleteSceneId(null); // Clear pending state
      const deleted = res?.data?.deletedScene || res?.deletedScene;
      toast.success('Scene deleted', {
        action: {
          label: 'Undo',
          onClick: () => {
            if (deleted) {
              restoreSceneMutation.mutate({ projectId, scene: deleted });
            }
          }
        }
      } as any);
      await utils.generation.getProjectScenes.invalidate({ projectId });
      if (res?.data?.newRevision != null) {
        try { (useVideoState.getState().projects as any)[projectId].revision = res.data.newRevision; } catch {}
      }
    },
    onError: (error) => {
      console.error('[Timeline] Failed to delete scene:', error);
      setPendingDeleteSceneId(null); // Clear pending state on error
      toast.error('Failed to delete scene');
    }
  });
  
  // API mutation for reordering scenes
  const reorderScenesMutation = api.scenes.reorderScenes.useMutation({
    onSuccess: async (res: any) => {
      console.log('[Timeline] Scene order persisted to database');
      // Ensure all panels see new order
      await utils.generation.getProjectScenes.invalidate({ projectId });
      if (res?.newRevision != null) {
        try { (useVideoState.getState().projects as any)[projectId].revision = res.newRevision; } catch {}
      }
    },
    onError: (error) => {
      console.error('[Timeline] Failed to persist scene order:', error);
      toast.error('Failed to save scene order');
    }
  });
  // API mutation for duplicating scenes (server-side authoritative)
  const duplicateSceneMutation = api.scenes.duplicateScene.useMutation({
    onSuccess: async (res: any) => {
      try {
        if (res?.newScene) {
          // Record undo (delete the duplicate on undo)
          pushAction(projectId, { type: 'duplicate', scene: res.newScene });
        }
      } catch {}
      await utils.generation.getProjectScenes.invalidate({ projectId });
      toast.success('Scene duplicated');
      if (res?.newRevision != null) {
        try { (useVideoState.getState().projects as any)[projectId].revision = res.newRevision; } catch {}
      }
    },
    onError: (error) => {
      console.error('[Timeline] Failed to duplicate scene:', error);
      toast.error('Failed to duplicate scene');
    }
  });
  // API mutation for splitting scenes
  const splitSceneMutation = api.scenes.splitScene.useMutation({
    onSuccess: async () => {
      await utils.generation.getProjectScenes.invalidate({ projectId });
      toast.success('Scene split');
    },
    onError: (error) => {
      console.error('[Timeline] Failed to split scene:', error);
      toast.error('Failed to split scene');
    }
  });

  // Helper to perform Undo/Redo via buttons (after mutations are defined)
  const performUndo = useCallback(() => {
    const action = popUndo(projectId);
    if (!action) return;
    if (action.type === 'deleteScene') {
      restoreSceneMutation.mutate({ projectId, scene: {
        id: action.scene.id,
        name: action.scene.name || action.scene.data?.name,
        tsxCode: action.scene.data?.code || (action.scene as any).tsxCode,
        duration: action.scene.duration || 150,
        order: (action.scene as any).order ?? 0,
        props: action.scene.data?.props,
        layoutJson: (action.scene as any).layoutJson,
      }});
      pushRedo(projectId, { type: 'deleteScene', scene: action.scene });
    } else if (action.type === 'reorder') {
      reorderScenesMutation.mutate({ projectId, sceneIds: action.beforeOrder });
      pushRedo(projectId, { type: 'reorder', beforeOrder: action.afterOrder, afterOrder: action.beforeOrder });
    } else if (action.type === 'updateDuration') {
      updateScene(projectId, action.sceneId, { duration: action.prevDuration });
      updateSceneDurationMutation.mutate({ projectId, sceneId: action.sceneId, duration: action.prevDuration });
      pushRedo(projectId, { type: 'updateDuration', sceneId: action.sceneId, prevDuration: action.newDuration, newDuration: action.prevDuration });
    } else if (action.type === 'split') {
      // Undo split: delete the right scene and restore left to previous duration
      removeSceneMutation.mutate({ projectId, sceneId: action.rightSceneId });
      updateScene(projectId, action.sceneId, { duration: action.leftBeforeDuration });
      updateSceneDurationMutation.mutate({ projectId, sceneId: action.sceneId, duration: action.leftBeforeDuration });
      pushRedo(projectId, action);
    } else if (action.type === 'trimLeft') {
      // Undo trim-left: restore original and delete right scene
      restoreSceneMutation.mutate({ projectId, scene: {
        id: action.originalScene.id,
        name: action.originalScene.name || action.originalScene.data?.name,
        tsxCode: action.originalScene.data?.code || (action.originalScene as any).tsxCode,
        duration: action.originalScene.duration || 150,
        order: (action.originalScene as any).order ?? 0,
        props: action.originalScene.data?.props,
        layoutJson: (action.originalScene as any).layoutJson,
      }});
      removeSceneMutation.mutate({ projectId, sceneId: action.rightSceneId });
      pushRedo(projectId, action);
    } else if (action.type === 'duplicate') {
      // Undo duplicate: delete that scene
      removeSceneMutation.mutate({ projectId, sceneId: action.scene.id });
      pushRedo(projectId, action);
    }
  }, [projectId, popUndo, pushRedo, restoreSceneMutation, reorderScenesMutation, updateScene, updateSceneDurationMutation, removeSceneMutation]);

  const performRedo = useCallback(async () => {
    const action = popRedo(projectId);
    if (!action) return;
    if (action.type === 'deleteScene') {
      removeSceneMutation.mutate({ projectId, sceneId: action.scene.id });
      pushAction(projectId, { type: 'deleteScene', scene: action.scene });
    } else if (action.type === 'reorder') {
      reorderScenesMutation.mutate({ projectId, sceneIds: action.afterOrder });
      pushAction(projectId, { type: 'reorder', beforeOrder: action.beforeOrder, afterOrder: action.afterOrder });
    } else if (action.type === 'updateDuration') {
      updateScene(projectId, action.sceneId, { duration: action.newDuration });
      updateSceneDurationMutation.mutate({ projectId, sceneId: action.sceneId, duration: action.newDuration });
      pushAction(projectId, { type: 'updateDuration', sceneId: action.sceneId, prevDuration: action.prevDuration, newDuration: action.newDuration });
    } else if (action.type === 'split') {
      try {
        const res = await splitSceneMutation.mutateAsync({ projectId, sceneId: action.sceneId, frame: action.offset });
        if (res?.rightSceneId) {
          pushAction(projectId, { type: 'split', sceneId: action.sceneId, offset: action.offset, leftBeforeDuration: action.leftBeforeDuration, rightSceneId: res.rightSceneId });
        }
      } catch (e) {
        console.error('[Timeline] Redo split failed:', e);
      }
    } else if (action.type === 'trimLeft') {
      try {
        const res = await splitSceneMutation.mutateAsync({ projectId, sceneId: action.originalScene.id, frame: action.offset });
        if (res?.rightSceneId) {
          removeSceneMutation.mutate({ projectId, sceneId: action.originalScene.id });
          pushAction(projectId, { type: 'trimLeft', originalScene: action.originalScene, rightSceneId: res.rightSceneId, offset: action.offset });
        }
      } catch (e) {
        console.error('[Timeline] Redo trim-left failed:', e);
      }
    } else if (action.type === 'duplicate') {
      // Re-add duplicate via server duplicate endpoint after the source scene
      duplicateSceneMutation.mutate({ projectId, sceneId: action.scene.id, position: 'end' });
      pushAction(projectId, action);
    }
  }, [projectId, popRedo, pushAction, removeSceneMutation, reorderScenesMutation, updateScene, updateSceneDurationMutation, splitSceneMutation, duplicateSceneMutation]);
  
  // Versioned reconciliation: Sync DB audio to local state only if DB is newer
  useEffect(() => {
    if (!dbProject) return;
    
    // Get timestamps
    const serverAudioTimestamp = dbProject.audioUpdatedAt?.getTime() || 0;
    const localAudioTimestamp = audioAppliedAtRef.current;
    
    console.log('[Timeline] Audio reconciliation check:', {
      serverTimestamp: serverAudioTimestamp,
      localTimestamp: localAudioTimestamp,
      serverIsNewer: serverAudioTimestamp > localAudioTimestamp,
      hasServerAudio: !!dbProject.audio,
      hasLocalAudio: !!audioTrack
    });
    
    // Only update if server is definitively newer (not equal, to prevent flicker)
    if (serverAudioTimestamp > localAudioTimestamp) {
      if (dbProject.audio) {
        // Server has audio and it's newer - update local
        // Add id field that videoState expects
        const audioWithId = {
          id: 'audio-1',
          ...dbProject.audio
        };
        updateProjectAudio(projectId, audioWithId);
        audioAppliedAtRef.current = serverAudioTimestamp;
        console.log('[Timeline] Applied newer audio from server');
      } else {
        // Server explicitly removed audio and it's newer
        updateProjectAudio(projectId, null);
        audioAppliedAtRef.current = serverAudioTimestamp;
        console.log('[Timeline] Removed audio based on newer server state');
      }
    }
    // If timestamps are equal or local is newer, keep local state (no flicker!)
  }, [dbProject?.audioUpdatedAt, dbProject?.audio, projectId, updateProjectAudio]);
  
  // Get current frame from PreviewPanelG via event system
  const [currentFrame, setCurrentFrame] = useState(0);
  const lastFrameRef = useRef<number>(0);
  const lastExplicitPlayStateRef = useRef<{ playing: boolean; ts: number }>({ playing: false, ts: 0 });
  const timelineRanges = useMemo(() => computeSceneRanges(scenes as any), [scenes]);
  const currentFrameRef = useRef(0);
  useEffect(() => { currentFrameRef.current = currentFrame; }, [currentFrame]);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Calculate total duration - needs to be before any useEffect that uses it
  const totalDuration = useMemo(() => {
    // console.log('[Timeline] Calculating totalDuration for scenes:', scenes.length);
    return Math.max(150, scenes.reduce((acc: number, scene: Scene) => {
      return acc + (scene.duration || 150);
    }, 0));
  }, [scenes.length, scenes.map(s => `${s.id}-${s.duration}`).join(',')]);
  
  // Track if waveform is being generated to prevent duplicate calls
  const waveformGeneratingRef = useRef(false);
  const lastGeneratedUrlRef = useRef<string | null>(null);
  
  // Generate waveform when audio loads or canvas becomes available
  useEffect(() => {
    console.log('[Timeline] Audio track:', audioTrack);
    if (audioTrack?.url && audioTrack.url !== lastGeneratedUrlRef.current && !waveformGeneratingRef.current) {
      console.log('[Timeline] Generating waveform for:', audioTrack.url);
      // Small delay to ensure canvas is mounted
      setTimeout(() => {
        if (audioCanvasRef.current && !waveformGeneratingRef.current) {
          console.log('[Timeline] Canvas found, starting waveform generation');
          waveformGeneratingRef.current = true;
          lastGeneratedUrlRef.current = audioTrack.url;
          generateWaveform(audioTrack.url).finally(() => {
            waveformGeneratingRef.current = false;
          });
        } else if (!audioCanvasRef.current) {
          console.log('[Timeline] Canvas not found, retrying in 500ms');
          setTimeout(() => {
            if (audioCanvasRef.current && !waveformGeneratingRef.current) {
              waveformGeneratingRef.current = true;
              lastGeneratedUrlRef.current = audioTrack.url;
              generateWaveform(audioTrack.url).finally(() => {
                waveformGeneratingRef.current = false;
              });
            }
          }, 500);
        }
      }, 100);
    }
  }, [audioTrack?.url]);
  
  // Redraw waveform when audioWaveform state updates or zoom changes
  useEffect(() => {
    if (audioWaveform && audioCanvasRef.current && audioTrack) {
      console.log('[Timeline] Redrawing waveform with data:', audioWaveform.peak.length, 'samples');
      drawWaveform(audioWaveform, audioTrack, totalDuration);
    }
  }, [audioWaveform, zoomScale, audioTrack, totalDuration]);

  // Redraw on window resize to keep canvas in sync with container size
  useEffect(() => {
    const onResize = () => {
      if (audioWaveform && audioCanvasRef.current && audioTrack) {
        drawWaveform(audioWaveform, audioTrack, totalDuration);
      }
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [audioWaveform, audioTrack, totalDuration]);

  // Generate waveform visualization
  const generateWaveform = async (audioUrl: string) => {
    try {
      console.log('[Timeline] Starting waveform generation...');
      
      // Import audio context manager dynamically to avoid SSR issues
      const { getAudioContext, enableAudioWithGesture } = await import('~/lib/utils/audioContext');
      
      // Try to get existing context, or create one with user gesture
      let audioContext = getAudioContext();
      if (!audioContext) {
        console.log('[Timeline] No audio context available, attempting to create with user gesture...');
        audioContext = enableAudioWithGesture();
      }
      
      if (!audioContext) {
        console.warn('[Timeline] Cannot create waveform without user interaction - skipping visualization');
        return []; // Return empty waveform data
      }
      const response = await fetch(audioUrl);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

      console.log('[Timeline] Audio decoded, duration:', audioBuffer.duration, 'seconds');
      decodedAudioDurationRef.current = audioBuffer.duration;

      // Generate waveform data with proper detail
      const channelData = audioBuffer.getChannelData(0);
      
      // Use much higher resolution for better detail
      const canvasWidth = audioCanvasRef.current?.clientWidth || 1200;
      const targetSamples = Math.min(4000, Math.max(1000, canvasWidth * 3)); // Much higher resolution
      const blockSize = Math.max(1, Math.floor(channelData.length / targetSamples));
      const waveform: number[] = [];
      const rmsValues: number[] = [];
      
      // Calculate both positive and negative peaks for more accurate representation
      for (let i = 0; i < targetSamples; i++) {
        let maxPositive = 0;
        let maxNegative = 0;
        let sumSquares = 0;
        let count = 0;
        
        // Process this block - look at both positive and negative peaks
        const startIdx = i * blockSize;
        const endIdx = Math.min(startIdx + blockSize, channelData.length);
        
        for (let j = startIdx; j < endIdx; j++) {
          const sample = channelData[j] || 0;
          
          // Track both positive and negative peaks
          if (sample > maxPositive) maxPositive = sample;
          if (sample < maxNegative) maxNegative = sample;
          
          // Calculate RMS (what you hear)
          sumSquares += sample * sample;
          count++;
        }
        
        // Use the larger absolute value between positive and negative peaks
        const maxSample = Math.max(Math.abs(maxPositive), Math.abs(maxNegative));
        
        // Store both peak and RMS
        const rms = count > 0 ? Math.sqrt(sumSquares / count) : 0;
        // Use peak value directly for clearer visualization
        waveform.push(maxSample);
        rmsValues.push(rms);
      }
      
      // Light smoothing - just enough to remove noise, not flatten
      const smoothedWaveform: number[] = [];
      const smoothedRms: number[] = [];
      
      for (let i = 0; i < waveform.length; i++) {
        if (i === 0 || i === waveform.length - 1) {
          smoothedWaveform.push(waveform[i] || 0);
          smoothedRms.push(rmsValues[i] || 0);
        } else {
          // Simple 3-point average with null checks
          const prev = waveform[i - 1] || 0;
          const curr = waveform[i] || 0;
          const next = waveform[i + 1] || 0;
          const avg = (prev * 0.25 + curr * 0.5 + next * 0.25);
          
          const prevRms = rmsValues[i - 1] || 0;
          const currRms = rmsValues[i] || 0;
          const nextRms = rmsValues[i + 1] || 0;
          const rmsAvg = (prevRms * 0.25 + currRms * 0.5 + nextRms * 0.25);
          
          smoothedWaveform.push(avg);
          smoothedRms.push(rmsAvg);
        }
      }
      
      console.log('[Timeline] Waveform generated, samples:', smoothedWaveform.length);
      setAudioWaveform({ peak: smoothedWaveform, rms: smoothedRms });

      // Peak detection on decoded audio (seconds), cached per URL
      try {
        const detectAudioPeaks = (samples: Float32Array, sampleRate: number): number[] => {
          // Downsampled window scan + local max + min distance
          const downsampleHz = 100; // 100Hz windows (~10ms)
          const windowSize = Math.max(1, Math.floor(sampleRate / downsampleHz));
          const minPeakDistanceSec = 0.18; // ~180ms between peaks
          const minPeakDistanceSamples = Math.max(1, Math.floor(sampleRate * minPeakDistanceSec));

          // Find global max to set a relative threshold
          let globalMax = 0;
          for (let i = 0; i < samples.length; i += windowSize) {
            const v = Math.abs(samples[i] || 0);
            if (v > globalMax) globalMax = v;
          }
          const ampThreshold = globalMax * 0.6; // configurable

          const peaksSec: number[] = [];
          let lastPeakIndex = -minPeakDistanceSamples;
          for (let i = windowSize; i < samples.length - windowSize; i += windowSize) {
            let maxInWindow = 0;
            let sumSquares = 0;
            for (let j = -windowSize; j <= windowSize; j++) {
              const s = Math.abs(samples[i + j] || 0);
              maxInWindow = Math.max(maxInWindow, s);
              sumSquares += s * s;
            }
            const rms = Math.sqrt(sumSquares / (windowSize * 2 + 1));

            if (maxInWindow > ampThreshold && i - lastPeakIndex >= minPeakDistanceSamples) {
              // Local max check via neighbor windows
              const prevIdx = Math.max(windowSize, i - windowSize);
              const nextIdx = Math.min(samples.length - windowSize - 1, i + windowSize);
              let prevRms = 0, nextRms = 0;
              for (let j = -windowSize; j <= windowSize; j++) {
                const ps = Math.abs(samples[prevIdx + j] || 0);
                const ns = Math.abs(samples[nextIdx + j] || 0);
                prevRms += ps * ps;
                nextRms += ns * ns;
              }
              prevRms = Math.sqrt(prevRms / (windowSize * 2 + 1));
              nextRms = Math.sqrt(nextRms / (windowSize * 2 + 1));

              if (rms > prevRms && rms > nextRms) {
                peaksSec.push(i / sampleRate);
                lastPeakIndex = i;
              }
            }
          }
          return peaksSec;
        };

        if (!peaksCacheRef.current.has(audioUrl)) {
          const peaksSec = detectAudioPeaks(channelData, audioBuffer.sampleRate);
          peaksCacheRef.current.set(audioUrl, peaksSec);
        }
        peaksSecondsRef.current = peaksCacheRef.current.get(audioUrl) || null;
        if (process.env.NODE_ENV === 'development') {
          console.log('[Timeline] Peaks detected (seconds):', peaksSecondsRef.current?.length || 0);
        }
      } catch (err) {
        console.warn('[Timeline] Peak detection failed:', err);
        peaksSecondsRef.current = null;
      }
      
      if (audioCanvasRef.current && audioTrack) {
        console.log('[Timeline] Drawing waveform on canvas...');
        drawWaveform({ peak: smoothedWaveform, rms: smoothedRms }, audioTrack, totalDuration);
      } else {
        console.log('[Timeline] Canvas not ready yet');
      }
    } catch (error) {
      console.error('[Timeline] Failed to generate waveform:', error);
      // Return empty array if waveform generation fails
      return [];
    }
  };

  // Draw waveform on canvas - professional horizontal waveform like in DAWs with RMS/Peak display
  const drawWaveform = (waveform: {peak: number[], rms: number[]}, audio: AudioTrack, totalFrames: number) => {
    if (!audioCanvasRef.current) return;

    const canvas = audioCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Ensure canvas backing store matches CSS size for crisp rendering
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    const cssWidth = canvas.clientWidth || 1200;
    const cssHeight = canvas.clientHeight || TIMELINE_ITEM_HEIGHT * 2;
    if (canvas.width !== Math.floor(cssWidth * dpr) || canvas.height !== Math.floor(cssHeight * dpr)) {
      canvas.width = Math.floor(cssWidth * dpr);
      canvas.height = Math.floor(cssHeight * dpr);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    // Clear canvas in CSS pixels after scaling
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    // Set style for clean, solid waveform
    ctx.fillStyle = 'rgba(120, 130, 145, 0.85)'; // Darker gray with good opacity
    ctx.strokeStyle = 'rgba(120, 130, 145, 0.4)'; // More visible outline
    ctx.lineWidth = 0.75;

    const samples = waveform.peak.length;
    const decodedDuration = decodedAudioDurationRef.current || audio.duration || 1; // seconds
    const segmentStart = Math.max(0, audio.startTime || 0);
    const segmentEnd = Math.min(decodedDuration, (audio.endTime ?? decodedDuration));

    // Compute normalization from the WHOLE segment (not just visible slice)
    const segStartIdx = Math.max(0, Math.floor((segmentStart / decodedDuration) * samples));
    const segEndIdx = Math.min(samples, Math.ceil((segmentEnd / decodedDuration) * samples));
    
    let maxAmplitude = 0;
    for (let i = segStartIdx; i < segEndIdx; i++) {
      const v = Math.abs(waveform.peak[i] || 0);
      if (v > maxAmplitude) maxAmplitude = v;
    }
    const targetHalfHeight = cssHeight * 0.45;
    const ampScale = maxAmplitude > 0 ? (targetHalfHeight / maxAmplitude) : 0;

    // Only render what fits into the video timeline window
    const videoDurationSec = Math.max(0.01, totalFrames / FPS);
    const offsetSec = Math.max(0, (audio as any).timelineOffsetSec || 0);
    // Only portion that fits in video window after offset
    const visibleEndCap = segmentStart + Math.max(0, videoDurationSec - offsetSec);
    const visibleStartSec = segmentStart;
    const visibleEndSec = Math.min(segmentEnd, visibleEndCap);
    
    // Determine sample range corresponding to the visible segment
    const startIndex = Math.max(0, Math.floor((visibleStartSec / decodedDuration) * samples));
    const endIndex = Math.min(samples, Math.ceil((visibleEndSec / decodedDuration) * samples));
    const segmentSamples = Math.max(1, endIndex - startIndex);
    
    // Map the selected segment to the canvas CSS width
    const sampleWidth = cssWidth / segmentSamples;
    const centerY = cssHeight / 2;

    // Draw waveform as vertical bars for clearer visualization
    // With higher resolution, make bars thinner
    const barWidth = Math.max(0.5, sampleWidth * 0.6); // Thinner bars for higher res
    
    for (let i = 0; i < segmentSamples; i++) {
      const x = i * sampleWidth;
      const amplitude = Math.abs(waveform.peak[startIndex + i] || 0) * ampScale;
      
      // Draw vertical bar from center upward and downward
      if (amplitude > 0.3) { // Lower threshold for more detail
        ctx.fillRect(x, centerY - amplitude, barWidth, amplitude * 2);
      }
    }
    
    // Add subtle center line
    ctx.strokeStyle = 'rgba(100, 100, 100, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(cssWidth, centerY);
    ctx.stroke();
  };

  // Map peak seconds → frames on the timeline, respecting trim window and video duration
  const mapPeaksToFrames = useCallback((peaksSec: number[], audio: AudioTrack, totalFrames: number): number[] => {
    if (!peaksSec || peaksSec.length === 0) return [];
    const FPS_LOCAL = FPS;
    const startSec = Math.max(0, audio.startTime || 0); // trim start within file
    const endSec = Math.max(startSec, audio.endTime || audio.duration || 0); // trim end within file
    const offsetSec = Math.max(0, (audio as any).timelineOffsetSec || 0); // timeline placement
    const frames: number[] = [];
    for (const p of peaksSec) {
      if (p >= startSec && p <= endSec) {
        // Translate file time to timeline time
        const t = offsetSec + (p - startSec);
        const f = Math.round(t * FPS_LOCAL);
        if (f >= 0 && f < totalFrames) frames.push(f);
      }
    }
    return frames;
  }, []);

  // Compute mouse frame from clientX using the full timeline mapping (respects scroll and zoom)
  const frameFromClientX = useCallback((clientX: number): number => {
    const el = timelineRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    const scrollLeft = el.scrollLeft;
    const clickX = clientX - rect.left;
    const actualClickX = clickX + scrollLeft;
    const contentScrollWidth = (innerContentRef.current?.scrollWidth || rect.width * zoomScale) - END_SPACER_PX;
    const actualWidth = Math.max(1, contentScrollWidth);
    const percentage = Math.max(0, Math.min(1, actualClickX / actualWidth));
    const newFrame = Math.round(percentage * totalDuration);
    return Math.max(0, Math.min(totalDuration - 1, newFrame));
  }, [timelineRef, innerContentRef, zoomScale, totalDuration]);

  // Handle hover over audio block to show nearby peak frames (tooltip-only)
  const handleAudioHover = useCallback((e: React.MouseEvent) => {
    if (!audioTrack || isAudioDraggingRef.current) return;
    const peaksSec = peaksSecondsRef.current;
    if (!peaksSec || peaksSec.length === 0) { setPeakTooltip(null); return; }

    const mouseFrame = frameFromClientX(e.clientX);
    // Map to frames (once per hover tick)
    const allPeakFrames = mapPeaksToFrames(peaksSec, audioTrack, totalDuration);
    if (allPeakFrames.length === 0) { setPeakTooltip(null); return; }

    // Find peaks within ±30 frames (≈1s)
    const windowFrames = 30;
    const nearby = allPeakFrames.filter(f => Math.abs(f - mouseFrame) <= windowFrames);
    if (nearby.length === 0) { setPeakTooltip(null); return; }

    // Show up to 8 nearest, sorted by distance
    nearby.sort((a, b) => Math.abs(a - mouseFrame) - Math.abs(b - mouseFrame));
    const frames = nearby.slice(0, 8);
    setPeakTooltip({ x: e.clientX, y: e.clientY - 20, frames });
  }, [audioTrack, totalDuration, frameFromClientX, mapPeaksToFrames]);

  const handleAudioHoverLeave = useCallback(() => {
    setPeakTooltip(null);
  }, []);
  
  // Listen for frame updates and play state changes from PreviewPanelG
  useEffect(() => {
    const handleFrameUpdate = (event: CustomEvent) => {
      // Don't update frame while dragging the playhead
      if (isDragging && dragInfo?.action === 'playhead') {
        return;
      }
      
      if (event.detail && typeof event.detail.frame === 'number') {
        const frame = event.detail.frame as number;
        setCurrentFrame(frame);
        // Prefer explicit onPlay/onPause events; only infer from frame ticks
        // if no explicit state change has occurred recently
        const now = Date.now();
        const sinceExplicit = now - lastExplicitPlayStateRef.current.ts;
        const preferExplicit = sinceExplicit <= 500;
        if (!preferExplicit) {
          if (frame !== lastFrameRef.current) {
            lastFrameRef.current = frame;
            if (!isPlaying) setIsPlaying(true);
            if ((window as any).__timelinePlayStateTimer) {
              window.clearTimeout((window as any).__timelinePlayStateTimer);
            }
            (window as any).__timelinePlayStateTimer = window.setTimeout(() => {
              // Only auto-pause if we still have not received an explicit event
              const since = Date.now() - lastExplicitPlayStateRef.current.ts;
              if (since > 400) setIsPlaying(false);
            }, 150);
          }
        }
        if (process.env.NODE_ENV === 'development') {
          const ar = findSceneAtFrame(timelineRanges, frame);
          // eslint-disable-next-line no-console
          console.debug('[Timeline] frame', frame, 'active', ar ? `${ar.index}:${ar.id}` : 'none', 'ranges', timelineRanges.map(r => `[${r.index}:${r.start}-${r.end}]`).join(' '));
        }
      }
    };
    
    const handlePlaybackSpeed = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.speed === 'number') {
        // Update playback speed if needed
      }
    };
    
    const handlePlayStateChange = (event: CustomEvent) => {
      if (event.detail && typeof event.detail.playing === 'boolean') {
        const playing = event.detail.playing as boolean;
        lastExplicitPlayStateRef.current = { playing, ts: Date.now() };
        setIsPlaying(playing);
      }
    };
    
    window.addEventListener('preview-frame-update' as any, handleFrameUpdate);
    window.addEventListener('playback-speed-change' as any, handlePlaybackSpeed);
    window.addEventListener('preview-play-state-change' as any, handlePlayStateChange);
    
    return () => {
      window.removeEventListener('preview-frame-update' as any, handleFrameUpdate);
      window.removeEventListener('playback-speed-change' as any, handlePlaybackSpeed);
      window.removeEventListener('preview-play-state-change' as any, handlePlayStateChange);
      if ((window as any).__timelinePlayStateTimer) {
        window.clearTimeout((window as any).__timelinePlayStateTimer);
        (window as any).__timelinePlayStateTimer = null;
      }
    };
  }, [isDragging, dragInfo, isPlaying, timelineRanges]);

  // Request initial play state on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        const ev = new Event('request-play-state');
        window.dispatchEvent(ev);
      } catch {}
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Sync loop state from PreviewPanelG when loaded
  useEffect(() => {
    const handleLoopLoaded = (event: CustomEvent) => {
      const state = event.detail?.state as 'video' | 'off' | 'scene' | undefined;
      if (state) setLoopState(state);
    };
    window.addEventListener('loop-state-loaded' as any, handleLoopLoaded);
    return () => window.removeEventListener('loop-state-loaded' as any, handleLoopLoaded);
  }, []);
  
  // Audio track calculations
  useEffect(() => {
    // Audio track state updated
  }, [audioTrack, totalDuration]);
  
  // Format time display - show frames prominently
  const formatTime = useCallback((frames: number, showFrames: boolean = true): string => {
    // Ensure frames is an integer
    frames = Math.round(frames);
    const totalSeconds = Math.floor(frames / FPS);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    const frameRemainder = frames % FPS;
    
    if (showFrames && zoomScale >= 2) {
      // When zoomed in, show frame count prominently
      return `${frames}f (${minutes}:${seconds.toString().padStart(2, '0')})`;
    }
    
    // Standard timecode format
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}.${frameRemainder.toString().padStart(2, '0')}`;
  }, [zoomScale]);
  
  // Handle timeline click for scrubbing
  const handleTimelineClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const scrollLeft = timelineRef.current.scrollLeft;
    const clickX = e.clientX - rect.left;
    
    // The actual timeline width is based on the zoom scale
    const baseWidth = rect.width;
    const actualTimelineWidth = baseWidth * zoomScale;
    
    // Account for scroll position
    const actualClickX = clickX + scrollLeft;
    
    // Calculate percentage (0 to 1) based on actual timeline width
    const percentage = actualClickX / actualTimelineWidth;
    const clampedPercentage = Math.max(0, Math.min(1, percentage));
    
    // Convert to frame
    const newFrame = Math.round(clampedPercentage * totalDuration);
    const clampedFrame = Math.max(0, Math.min(totalDuration - 1, newFrame));
    
    console.log('[Timeline Click] Seek to frame:', {
      clickX,
      scrollLeft,
      actualClickX,
      actualTimelineWidth,
      percentage: (clampedPercentage * 100).toFixed(1) + '%',
      frame: clampedFrame,
      zoomScale
    });
    
    // Update state and dispatch event
    setCurrentFrame(clampedFrame);
    const event = new CustomEvent('timeline-seek', { 
      detail: { frame: clampedFrame }
    });
    window.dispatchEvent(event);
  }, [isDragging, totalDuration, zoomScale]);
  
  // Handle play/pause
  const togglePlayPause = useCallback(() => {
    console.log('[Timeline] Dispatching play/pause event, current isPlaying:', isPlaying);
    const event = new CustomEvent('timeline-play-pause');
    window.dispatchEvent(event);
    // Don't update isPlaying here - let PreviewPanelG tell us the state
  }, [isPlaying]);
  
  // Handle zoom with mouse wheel (React Video Editor Pro pattern)
  const handleWheelZoom = useCallback((e: React.WheelEvent) => {
    // Allow pinch-zoom (ctrl/meta) to zoom timeline only (prevent browser zoom)
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault(); // stop page/browser zoom
    // Use smaller increments for smoother zooming
    const zoomSpeed = 0.05;
    const delta = e.deltaY > 0 ? -zoomSpeed : zoomSpeed;
    
    setZoomScale(prev => {
      const newScale = prev + delta;
      // Clamp between 0.25 and 4, and round to avoid floating point issues
      return Math.round(Math.max(0.25, Math.min(4, newScale)) * 100) / 100;
    });
  }, []);

  // Prevent browser zoom shortcuts when pointer is inside timeline; apply to timeline instead
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!isPointerInside) return;
      const isZoomShortcut = (e.metaKey || e.ctrlKey) && (e.key === '+' || e.key === '=' || e.key === '-' || e.key === '0');
      if (!isZoomShortcut) return;
      e.preventDefault();
      e.stopPropagation();
      setZoomScale(prev => {
        if (e.key === '0') return 1;
        const step = 0.1;
        const next = e.key === '-' ? prev - step : prev + step;
        return Math.round(Math.max(0.25, Math.min(4, next)) * 100) / 100;
      });
    };
    window.addEventListener('keydown', onKeyDown, { capture: true });
    return () => window.removeEventListener('keydown', onKeyDown, { capture: true } as any);
  }, [isPointerInside]);

  // Safari/macOS: prevent page zoom on trackpad pinch by handling gesture events
  useEffect(() => {
    const el = timelineRef.current;
    if (!el) return;
    const onGestureStart = (e: any) => {
      if (!isPointerInside) return;
      try { e.preventDefault(); } catch {}
      gestureBaseZoomRef.current = zoomScale;
    };
    const onGestureChange = (e: any) => {
      if (!isPointerInside) return;
      try { e.preventDefault(); } catch {}
      const scale = typeof e.scale === 'number' ? e.scale : 1;
      setZoomScale(() => {
        const next = gestureBaseZoomRef.current * scale;
        return Math.round(Math.max(0.25, Math.min(4, next)) * 100) / 100;
      });
    };
    const onGestureEnd = (e: any) => {
      if (!isPointerInside) return;
      try { e.preventDefault(); } catch {}
    };
    el.addEventListener('gesturestart', onGestureStart as any, { passive: false } as any);
    el.addEventListener('gesturechange', onGestureChange as any, { passive: false } as any);
    el.addEventListener('gestureend', onGestureEnd as any, { passive: false } as any);
    return () => {
      el.removeEventListener('gesturestart', onGestureStart as any);
      el.removeEventListener('gesturechange', onGestureChange as any);
      el.removeEventListener('gestureend', onGestureEnd as any);
    };
  }, [zoomScale, isPointerInside]);
  
  // Handle resize/trim drag start
  const handleResizeDragStart = useCallback((
    e: React.MouseEvent,
    sceneId: string,
    action: DragInfo['action']
  ) => {
    e.preventDefault();
    e.stopPropagation();
    
    const sceneIndex = scenes.findIndex((s: Scene) => s.id === sceneId);
    const scene = scenes[sceneIndex];
    if (!scene) return;
    
    // Calculate scene start position based on previous scenes (sequential)
    const sceneStart = scenes.slice(0, sceneIndex).reduce((acc, s) => acc + (s.duration || 150), 0);
    
    setDragInfo({
      action,
      sceneId,
      startX: e.clientX,
      startPosition: sceneStart,
      startDuration: scene.duration,
      sceneIndex
    });
    setIsDragging(true);
    setSelectedSceneId(sceneId);
    try {
      const ev = new CustomEvent('timeline-select-scene', { detail: { sceneId } });
      window.dispatchEvent(ev);
    } catch {}
  }, [scenes]);
  
  // Snapping helper function
  const snapToGrid = useCallback((frame: number, snapInterval: number = 30): number => {
    // Snap to nearest interval (default 1 second = 30 frames)
    const snapped = Math.round(frame / snapInterval) * snapInterval;
    return Math.max(0, Math.min(totalDuration, snapped));
  }, [totalDuration]);

  // Handle drag move
  const handleDragMove = useCallback((e: MouseEvent) => {
    if (!dragInfo || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    
    // Deadzone for resize operations to avoid ultra-sensitive trims on tiny moves
    if (dragInfo.action === 'resize-start' || dragInfo.action === 'resize-end') {
      const deltaPx = Math.abs(e.clientX - dragInfo.startX);
      const RESIZE_DEADZONE_PX = 8; // require at least 8px before changing duration
      if (deltaPx < RESIZE_DEADZONE_PX) {
        return; // ignore tiny movements
      }

      // Map pixel movement to frames using the current scene's own width, not total duration
      const currentProject = useVideoState.getState().projects[projectId];
      const currentScenes = currentProject?.props?.scenes || [];
      const scene = currentScenes.find((s: Scene) => s.id === dragInfo.sceneId);
      if (!scene) return;

      // Compute content width and the pixel width of this scene block
      const contentWidth = (innerContentRef.current?.scrollWidth || rect.width * zoomScale) - END_SPACER_PX;
      const sceneStartFrames = dragInfo.startPosition; // start position in frames captured at drag start
      const sceneLeftPx = (sceneStartFrames / totalDuration) * contentWidth;
      const sceneWidthPx = Math.max(1, (scene.duration / totalDuration) * contentWidth);
      const framesPerPixel = scene.duration / sceneWidthPx; // local mapping at current zoom

      const pixelDelta = e.clientX - dragInfo.startX; // positive when moving right
      const frameDelta = Math.round(pixelDelta * framesPerPixel);
      const minDuration = 1;

      if (dragInfo.action === 'resize-start') {
        const newDuration = Math.max(minDuration, dragInfo.startDuration - frameDelta);
        if (newDuration !== scene.duration) {
          updateScene(projectId, dragInfo.sceneId || '', { duration: newDuration });
        }
      } else if (dragInfo.action === 'resize-end') {
        const newDuration = Math.max(minDuration, dragInfo.startDuration + frameDelta);
        if (newDuration !== scene.duration) {
          updateScene(projectId, dragInfo.sceneId || '', { duration: newDuration });
        }
      }
      return; // handled resize path
    }

    if (dragInfo.action === 'reorder') {
      // Handle scene reordering
      const mouseX = e.clientX - rect.left + timelineRef.current.scrollLeft;
      const relativeX = mouseX / (rect.width * zoomScale);
      const mouseFrame = Math.round(relativeX * totalDuration);
      
      // Find which scene we're hovering over
      let cumulativeFrames = 0;
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (!scene) continue;
        const sceneEnd = cumulativeFrames + (scene.duration || 150);
        
        if (mouseFrame >= cumulativeFrames && mouseFrame < sceneEnd) {
          // We're hovering over scene at index i
          if (dragInfo.sceneIndex !== undefined && i !== dragInfo.sceneIndex) {
            console.log('[Timeline] Would swap scenes:', dragInfo.sceneIndex, 'with', i);
            // Visual feedback only during drag - actual reorder happens on mouse up
          }
          break;
        }
        cumulativeFrames = sceneEnd;
      }
      return;
    }
    
    if (dragInfo.action === 'playhead') {
      // Get mouse position relative to timeline container
      const mouseX = e.clientX - rect.left;
      const scrollLeft = timelineRef.current.scrollLeft;
      
      // Account for scroll position and zoom scale
      const actualMouseX = mouseX + scrollLeft;
      const actualWidth = rect.width * zoomScale;
      
      // Clamp to actual timeline bounds
      const clampedX = Math.max(0, Math.min(actualWidth, actualMouseX));
      
      // Calculate percentage (0 to 1) based on actual width
      const percentage = clampedX / actualWidth;
      
      // Convert percentage to frame number
      let newFrame = Math.round(percentage * totalDuration);
      
      // Apply snapping if Shift is NOT held (Shift disables snapping for fine control)
      if (!e.shiftKey) {
        // Determine snap interval based on zoom level - frame precision
        let snapInterval = 1; // Default to frame precision
        
        if (zoomScale >= 2) {
          snapInterval = 1; // Frame-by-frame when zoomed in
        } else if (zoomScale >= 1.5) {
          snapInterval = 1; // Frame-by-frame at medium-high zoom too
        } else if (zoomScale >= 1) {
          snapInterval = 2; // 2 frames at normal zoom
        } else if (zoomScale >= 0.75) {
          snapInterval = 3; // 3 frames when slightly zoomed out
        } else if (zoomScale >= 0.5) {
          snapInterval = 5; // 5 frames when zoomed out more
        } else {
          snapInterval = 10; // 10 frames when very zoomed out
        }
        
        newFrame = snapToGrid(newFrame, snapInterval);
      }
      
      const clampedFrame = Math.max(0, Math.min(totalDuration - 1, newFrame));
      
      console.log('[Playhead Drag] Position:', {
        mouseX: mouseX.toFixed(1),
        scrollLeft: scrollLeft.toFixed(1),
        actualMouseX: actualMouseX.toFixed(1),
        actualWidth: actualWidth.toFixed(1),
        percentage: (percentage * 100).toFixed(1) + '%',
        frame: clampedFrame,
        snapped: !e.shiftKey,
        totalDuration,
        zoomScale
      });
      
      // Update local state immediately for visual feedback
      setCurrentFrame(clampedFrame);
      
      // Dispatch seek event to preview
      const event = new CustomEvent('timeline-seek', { 
        detail: { frame: clampedFrame }
      });
      window.dispatchEvent(event);
      
      return;
    }
    
    // AUDIO: Move or trim operations mapped by seconds across content width
    if (dragInfo.action === 'audio-move' || dragInfo.action === 'audio-resize-start' || dragInfo.action === 'audio-resize-end') {
      const contentWidth = (innerContentRef.current?.scrollWidth || rect.width * zoomScale) - END_SPACER_PX;
      const deltaPx = e.clientX - dragInfo.startX;
      const secondsPerPixel = (totalDuration / FPS) / Math.max(1, contentWidth);
      const deltaSec = deltaPx * secondsPerPixel;
      const decodedDur = decodedAudioDurationRef.current || audioTrack?.duration || 0;
      if (!audioTrack || decodedDur <= 0) return;
      const minLen = 0.1;
      // Deadzone for resize operations
      if (dragInfo.action === 'audio-resize-start' || dragInfo.action === 'audio-resize-end') {
        const RESIZE_DEADZONE_PX = 6;
        if (Math.abs(deltaPx) < RESIZE_DEADZONE_PX) {
          return;
        }
      }
      // Snapping based on zoom (convert frame snapping to seconds)
      let snapFrames = 1;
      if (zoomScale >= 3) snapFrames = 1; else if (zoomScale >= 2) snapFrames = 1; else if (zoomScale >= 1.5) snapFrames = 2; else if (zoomScale >= 1.0) snapFrames = 5; else if (zoomScale >= 0.75) snapFrames = 10; else if (zoomScale >= 0.5) snapFrames = 15; else snapFrames = 30;
      const snapSec = snapFrames / FPS;
      if (dragInfo.action === 'audio-move') {
        // Move adjusts timeline offset, not trim
        const segLen = Math.max(minLen, (dragInfo.audioEndSec! - dragInfo.audioStartSec!));
        const baseOffset = (dragInfo as any).audioTimelineOffsetSec || 0;
        let newOffset = baseOffset + deltaSec;
        if (!e.shiftKey) newOffset = Math.round(newOffset / snapSec) * snapSec;
        // Clamp within video window
        const videoSec = Math.max(0.01, totalDuration / FPS);
        newOffset = Math.max(0, Math.min(Math.max(0, videoSec - segLen), newOffset));
        updateProjectAudio(projectId, { ...audioTrack, timelineOffsetSec: newOffset });
      } else if (dragInfo.action === 'audio-resize-start') {
        // Adjust startTime only
        let newStart = (dragInfo.audioStartSec || 0) + deltaSec;
        if (!e.shiftKey) newStart = Math.round(newStart / snapSec) * snapSec;
        newStart = Math.max(0, Math.min((dragInfo.audioEndSec || decodedDur) - minLen, newStart));
        updateProjectAudio(projectId, { ...audioTrack, startTime: newStart });
      } else if (dragInfo.action === 'audio-resize-end') {
        // Adjust endTime only
        let newEnd = (dragInfo.audioEndSec || decodedDur) + deltaSec;
        if (!e.shiftKey) newEnd = Math.round(newEnd / snapSec) * snapSec;
        newEnd = Math.max((dragInfo.audioStartSec || 0) + minLen, Math.min(decodedDur, newEnd));
        updateProjectAudio(projectId, { ...audioTrack, endTime: newEnd });
      }
      return;
    }

    // Compute mouse frame with zoom + scroll like playhead logic
    const mouseX = e.clientX - rect.left + (timelineRef.current?.scrollLeft || 0);
    const contentScrollWidth = (innerContentRef.current?.scrollWidth || rect.width * zoomScale) - END_SPACER_PX;
    const actualWidth = Math.max(1, contentScrollWidth);
    // Allow dragging beyond the current timeline width to extend last scene
    const percentage = actualWidth > 0 ? mouseX / actualWidth : 0; // intentionally NOT clamped
    const mouseFrame = Math.round(percentage * totalDuration);
    // Delta from original drag start X approximated via frame delta
    let deltaFrames = mouseFrame - dragInfo.startPosition;
    
    // Apply snapping for resize operations
    if (!e.shiftKey && (dragInfo.action === 'resize-start' || dragInfo.action === 'resize-end')) {
      // Dynamic snap interval tuned for less sensitivity when zoomed out
      let snapInterval = 1; // Default to frame precision
      if (zoomScale >= 3) {
        snapInterval = 1;
      } else if (zoomScale >= 2) {
        snapInterval = 1;
      } else if (zoomScale >= 1.5) {
        snapInterval = 2;
      } else if (zoomScale >= 1.0) {
        snapInterval = 5;
      } else if (zoomScale >= 0.75) {
        snapInterval = 10;
      } else if (zoomScale >= 0.5) {
        snapInterval = 15;
      } else {
        snapInterval = 30; // much coarser when very zoomed out
      }
      
      if (dragInfo.action === 'resize-start') {
        const newDuration = dragInfo.startDuration - deltaFrames;
        const snappedDuration = Math.round(newDuration / snapInterval) * snapInterval;
        deltaFrames = dragInfo.startDuration - snappedDuration;
      } else if (dragInfo.action === 'resize-end') {
        const newDuration = dragInfo.startDuration + deltaFrames;
        const snappedDuration = Math.round(newDuration / snapInterval) * snapInterval;
        deltaFrames = snappedDuration - dragInfo.startDuration;
      }
    }
    
    // Get current scenes from store to avoid dependency issues
    const currentProject = useVideoState.getState().projects[projectId];
    const currentScenes = currentProject?.props?.scenes || [];
    const scene = currentScenes.find((s: Scene) => s.id === dragInfo.sceneId);
    if (!scene) return;
    
    if (dragInfo.action === 'resize-start') {
      // New start is mouseFrame clamped so end stays >= min
      const minDuration = 1;
      const maxNewStart = dragInfo.startPosition + dragInfo.startDuration - minDuration;
      const newStart = Math.max(0, Math.min(maxNewStart, mouseFrame));
      const newDuration = Math.max(minDuration, dragInfo.startDuration - (newStart - dragInfo.startPosition));

      if (newDuration !== scene.duration) {
        updateScene(projectId, dragInfo.sceneId || '', { duration: newDuration });
      }
    } else if (dragInfo.action === 'resize-end') {
      // New end is mouseFrame; duration is end - original start, clamped to min and totalDuration
      const minDuration = 1;
      const newEnd = Math.max(dragInfo.startPosition + minDuration, mouseFrame);
      const newDuration = Math.max(minDuration, newEnd - dragInfo.startPosition);

      if (newDuration !== scene.duration) {
        updateScene(projectId, dragInfo.sceneId || '', { duration: newDuration });
      }
    }
  }, [dragInfo, totalDuration, zoomScale, updateScene, projectId, snapToGrid]);
  
  // Handle resize drag end
  const handleResizeDragEnd = useCallback((e?: MouseEvent) => {
    // If we were doing a reorder operation
      if (dragInfo && dragInfo.action === 'reorder' && e && timelineRef.current) {
      // Prevent click-to-swap: only reorder if mouse moved enough
      const deltaPx = Math.abs(e.clientX - dragInfo.startX);
      const REORDER_THRESHOLD_PX = 6;
      if (deltaPx < REORDER_THRESHOLD_PX) {
        // Treat as a simple click/select; do not reorder
        setDragInfo(null);
        setIsDragging(false);
        return;
      }
      const rect = timelineRef.current.getBoundingClientRect();
      // Require dropping inside the timeline bounds to commit a reorder
      const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      if (!inside) {
        // Cancel reorder if user drags out (e.g., into chat) and releases
        setDragInfo(null);
        setIsDragging(false);
        return;
      }
      const mouseX = e.clientX - rect.left + timelineRef.current.scrollLeft;
      const contentScrollWidth2 = (innerContentRef.current?.scrollWidth || rect.width * zoomScale) - END_SPACER_PX;
      const relativeX = contentScrollWidth2 > 0 ? mouseX / contentScrollWidth2 : 0;
      const mouseFrame = Math.round(relativeX * totalDuration);
      
      // Find which scene we're dropping on
      let cumulativeFrames = 0;
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        if (!scene) continue;
        const sceneEnd = cumulativeFrames + (scene.duration || 150);
        
        if (mouseFrame >= cumulativeFrames && mouseFrame < sceneEnd) {
          // We're dropping on scene at index i
          if (dragInfo.sceneIndex !== undefined && i !== dragInfo.sceneIndex) {
            // Require center overlap (drop near the center of the target scene) to commit reorder
            const targetDur = scene.duration || 150;
            const localPos = mouseFrame - cumulativeFrames;
            // Slightly widened center band but still strict enough to avoid accidental reorders
            const minCenter = Math.floor(targetDur * 0.25);
            const maxCenter = Math.ceil(targetDur * 0.75);
            if (localPos < minCenter || localPos > maxCenter) {
              setDragInfo(null);
              setIsDragging(false);
              break;
            }
            console.log('[Timeline] Reordering scenes:', dragInfo.sceneIndex, 'to', i);
            
            // Perform the reorder
            // Push undo with previous order before committing
            const beforeOrder = scenes.map((s: Scene) => s.id);
            reorderScenes(projectId, dragInfo.sceneIndex, i);
            
            // Create new order array for API
            const newOrder = [...scenes];
            const [movedScene] = newOrder.splice(dragInfo.sceneIndex, 1);
            if (movedScene) {
              newOrder.splice(i, 0, movedScene);
            }
            
            // Persist to database
            const idKey = `reorder-${nanoid(8)}`;
            const clientRevision = (useVideoState.getState().projects[projectId] as any)?.revision;
            reorderScenesMutation.mutate({
              projectId,
              sceneIds: newOrder.map((s: Scene) => s.id),
              idempotencyKey: idKey,
              clientRevision,
            });
            try { pushAction(projectId, { type: 'reorder', beforeOrder, afterOrder: newOrder.map((s: Scene) => s.id) }); } catch {}
            
            toast.success('Scenes reordered');
          }
          break;
        }
        cumulativeFrames = sceneEnd;
      }
    }
    // If we were doing a resize operation, persist the duration change
    else if (dragInfo && (dragInfo.action === 'resize-start' || dragInfo.action === 'resize-end')) {
      if (e && timelineRef.current) {
        const rect = timelineRef.current.getBoundingClientRect();
        const inside = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        if (!inside) {
          // Cancel resize if mouse released outside timeline (e.g., dragging into chat)
          setDragInfo(null);
          setIsDragging(false);
          return;
        }
      }
      // Get current scenes from store to avoid dependency issues
      const currentProject = useVideoState.getState().projects[projectId];
      const currentScenes = currentProject?.props?.scenes || [];
      const scene = currentScenes.find((s: Scene) => s.id === dragInfo.sceneId);
      
      if (scene && scene.duration !== dragInfo.startDuration && dragInfo.sceneId) {
        if (dragInfo.action === 'resize-start') {
          // Perfect trim-from-start: split at trimmed amount and keep right part
          const trimmed = Math.max(1, dragInfo.startDuration - scene.duration);
          (async () => {
            try {
              const res = await splitSceneMutation.mutateAsync({ projectId, sceneId: dragInfo.sceneId!, frame: trimmed });
              if (res?.rightSceneId) {
                removeSceneMutation.mutate({ projectId, sceneId: dragInfo.sceneId! });
                setSelectedSceneId(res.rightSceneId);
                // Force-fetch latest scenes and replace VideoState to keep timeline and preview in sync
                try {
                  await utils.generation.getProjectScenes.invalidate({ projectId });
                  const latest = await (utils.generation.getProjectScenes as any).fetch({ projectId });
                  if (latest && Array.isArray(latest)) {
                    const currentProps = useVideoState.getState().getCurrentProps();
                    if (currentProps) {
                      let start = 0;
                      const converted = latest.map((db: any) => {
                        const duration = db.duration || 150;
                        const out = {
                          id: db.id,
                          type: 'custom' as const,
                          start,
                          duration,
                          name: db.name,
                          data: { code: db.tsxCode, name: db.name, componentId: db.id, props: db.props || {} }
                        };
                        start += duration;
                        return out;
                      });
                      useVideoState.getState().replace(projectId, { ...currentProps, scenes: converted, meta: { ...currentProps.meta, duration: start } } as any);
                    }
                  }
                } catch {}
                toast.success('Trimmed from start');
              }
            } catch (err) {
              console.error('Trim-from-start (drag) error', err);
              toast.error('Failed to trim from start');
            }
          })();
        } else {
          // Right-edge: simple duration update
          try {
            pushAction(projectId, { type: 'updateDuration', sceneId: dragInfo.sceneId, prevDuration: dragInfo.startDuration, newDuration: scene.duration });
          } catch {}
          updateSceneDurationMutation.mutate({
            projectId,
            sceneId: dragInfo.sceneId,
            duration: scene.duration
          });
        }
      }
    }

    // AUDIO: Persist audio changes to DB after drag ends
    if (dragInfo && (dragInfo.action === 'audio-move' || dragInfo.action === 'audio-resize-start' || dragInfo.action === 'audio-resize-end')) {
      const audio = useVideoState.getState().projects[projectId]?.audio || null;
      updateAudioMutation.mutate({ projectId, audio: audio || null } as any);
      isAudioDraggingRef.current = false;
    }
    
    setDragInfo(null);
    setIsDragging(false);
  }, [dragInfo, updateSceneDurationMutation, projectId, scenes, zoomScale, totalDuration, reorderScenes, reorderScenesMutation]);
  
  // Set up drag event listeners
  useEffect(() => {
    if (isDragging) {
      const handleMouseUp = (e: MouseEvent) => handleResizeDragEnd(e);
      
      document.addEventListener('mousemove', handleDragMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleDragMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleDragMove, handleResizeDragEnd]);
  
  // Handle context menu
  const handleContextMenu = useCallback((e: React.MouseEvent, sceneId: string) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, sceneId });
  }, []);
  
  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    if (contextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [contextMenu]);

  // Close audio context menu on outside click (mousedown to avoid blur issues)
  useEffect(() => {
    const handleMouseDown = () => setAudioMenu(null);
    const handleTouchStart = () => setAudioMenu(null);
    if (audioMenu) {
      document.addEventListener('mousedown', handleMouseDown);
      document.addEventListener('touchstart', handleTouchStart);
      return () => {
        document.removeEventListener('mousedown', handleMouseDown);
        document.removeEventListener('touchstart', handleTouchStart);
      };
    }
  }, [audioMenu]);
  
  // Handle scene operations
  const handleDeleteScene = useCallback((sceneId: string, _skipConfirmation: boolean = true) => {
    // Prevent duplicate deletions
    if (isDeletionBusy || deletionInProgressRef.current.has(sceneId)) {
      console.warn('[Timeline] Deletion already in progress for scene:', sceneId);
      return;
    }
    
    // Inline confirmation removed; rely on Undo instead
    
    // Mark deletion as in progress and animate fade-out
    setIsDeletionBusy(true);
    deletionInProgressRef.current.add(sceneId);
    markDeleting(sceneId);
    try { addPendingDelete(projectId, sceneId); } catch {}

    // Push undo snapshot prior to removal
    const sceneIndex = scenes.findIndex((s: any) => s.id === sceneId);
    const scenePayload = sceneIndex >= 0 ? scenes[sceneIndex] : undefined;
    if (scenePayload) {
      const orderValue = (scenePayload as any).order ?? sceneIndex;
      const sceneForUndo = { ...scenePayload, order: orderValue } as any;
      try { pushAction(projectId, { type: 'deleteScene', scene: sceneForUndo }); } catch {}
    }

    // Defer actual removal to allow fade-out
    window.setTimeout(() => {
      deleteScene(projectId, sceneId);
      const idKey = `del-${nanoid(8)}`;
      const clientRevision = (useVideoState.getState().projects as any)[projectId]?.revision;
      removeSceneMutation.mutate(
        { projectId, sceneId, idempotencyKey: idKey, clientRevision },
        {
          onSettled: () => {
            setIsDeletionBusy(false);
            deletionInProgressRef.current.delete(sceneId);
            unmarkDeleting(sceneId);
            try { clearPendingDelete(projectId, sceneId); } catch {}
          }
        }
      );
    }, DELETE_FADE_MS);

    setContextMenu(null);
  }, [deleteScene, projectId, removeSceneMutation, isDeletionBusy, scenes, pushAction, markDeleting, unmarkDeleting]);


  // Keyboard: Cmd/Ctrl+Z undo, Shift+Cmd/Ctrl+Z redo
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (!isMod) return;
      const active = document.activeElement as HTMLElement | null;
      const isTyping = !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable') === 'true');
      if (isTyping) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        performUndo();
      } else if (e.key.toLowerCase() === 'z' && e.shiftKey) {
        e.preventDefault();
        void performRedo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [projectId, performUndo, performRedo]);

  // Keyboard: Delete/Backspace removes audio when hovering timeline (and not typing)
  useEffect(() => {
    const onDeleteKey = (e: KeyboardEvent) => {
      const active = document.activeElement as HTMLElement | null;
      const isTyping = !!active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.getAttribute('contenteditable') === 'true');
      if (isTyping) return;
      if (!isPointerInside) return; // Only when timeline is focused/hovered
      if (e.key !== 'Delete' && e.key !== 'Backspace') return;
      if (!audioTrack) return;
      // Remove audio from project
      e.preventDefault();
      // Update local state immediately
      updateProjectAudio(projectId, null);
      // Persist to database with optimistic update
      updateAudioMutation.mutate({ projectId, audio: null } as any);
      toast.success('Audio removed');
    };
    window.addEventListener('keydown', onDeleteKey);
    return () => window.removeEventListener('keydown', onDeleteKey);
  }, [isPointerInside, audioTrack, projectId, updateProjectAudio, updateAudioMutation]);

  // Helper: compute scene start frame by id
  const getSceneStartById = useCallback((sceneId: string): { start: number; duration: number } | null => {
    let start = 0;
    for (let i = 0; i < scenes.length; i++) {
      const s = scenes[i] as Scene | undefined;
      if (!s) continue;
      if (s.id === sceneId) {
        return { start, duration: s.duration || 150 };
      }
      start += s.duration || 150;
    }
    return null;
  }, [scenes]);

  // Split at current playhead for a specific scene id
  const handleSplitAtPlayhead = useCallback((sceneId: string) => {
    if (isSplitBusy || splitSceneMutation.isPending) {
      return;
    }
    const info = getSceneStartById(sceneId);
    if (!info) return;
    // Ask preview for the exact current frame, then use the freshest value
    try { window.dispatchEvent(new Event('request-current-frame')); } catch {}
    setTimeout(() => {
      const frameNow = Math.round(currentFrameRef.current);
      const offset = Math.max(0, frameNow - info.start);
      if (offset <= 0 || offset >= info.duration) {
        toast.info('Move playhead inside this scene to split');
        return;
      }
      (async () => {
          try {
            setIsSplitBusy(true);
            const idKey = `split-${nanoid(8)}`;
            const clientRevision = (useVideoState.getState().projects[projectId] as any)?.revision;
            const res = await splitSceneMutation.mutateAsync({ projectId, sceneId, frame: offset, idempotencyKey: idKey, clientRevision });
            if (res?.rightSceneId) {
              setSelectedSceneId(res.rightSceneId);
              // Push undo for split-only (restore left duration and remove right)
              const infoNow = getSceneStartById(sceneId);
              if (infoNow) {
              try { pushAction(projectId, { type: 'split', sceneId, offset, leftBeforeDuration: info.duration, rightSceneId: res.rightSceneId }); } catch {}
              }
            }
            // Force-fetch latest scenes and replace state to keep UI in sync immediately
            await utils.generation.getProjectScenes.invalidate({ projectId });
            try {
            const latest = await (utils.generation.getProjectScenes as any).fetch({ projectId });
            if (latest && Array.isArray(latest)) {
              const currentProps = useVideoState.getState().getCurrentProps();
              if (currentProps) {
                let start = 0;
                const ordered = [...latest].sort((a: any, b: any) => (a.order ?? 0) - (b.order ?? 0));
                const converted = ordered.map((db: any) => {
                  const duration = db.duration || 150;
                  const out = {
                    id: db.id,
                    type: 'custom' as const,
                    start,
                    duration,
                    order: db.order ?? 0,
                    name: db.name,
                    data: { code: db.tsxCode, name: db.name, componentId: db.id, props: db.props || {} }
                  };
                  start += duration;
                  return out;
                });
                useVideoState.getState().replace(projectId, { ...currentProps, scenes: converted, meta: { ...currentProps.meta, duration: start } } as any);
              }
            }
          } catch {}
          toast.success('Scene split at playhead');
        } catch (err) {
          console.error('Context split error', err);
          toast.error('Failed to split scene');
        } finally {
          setIsSplitBusy(false);
        }
      })();
    }, 30);
  }, [getSceneStartById, projectId, splitSceneMutation, utils, isSplitBusy]);

  // Trim-left button: split at playhead and delete left part (keep right with offset)
  const handleTrimLeftClick = useCallback(() => {
    if (!selectedSceneId) return;
    const info = getSceneStartById(selectedSceneId);
    if (!info) return;
    // Capture original scene snapshot for undo
    const original = scenes.find((s: any) => s.id === selectedSceneId);
    // Ask for freshest frame
    try { window.dispatchEvent(new Event('request-current-frame')); } catch {}
    setTimeout(async () => {
      const frameNow = Math.round(currentFrame);
      const offset = Math.max(1, Math.min(info.duration - 1, frameNow - info.start));
      if (offset <= 0 || offset >= info.duration) {
        toast.info('Move playhead inside the scene to trim');
        return;
      }
      try {
        const idKey = `trimL-${nanoid(8)}`;
        const clientRevision = (useVideoState.getState().projects[projectId] as any)?.revision;
        const res = await splitSceneMutation.mutateAsync({ projectId, sceneId: selectedSceneId, frame: offset, idempotencyKey: idKey, clientRevision });
        if (res?.rightSceneId) {
          removeSceneMutation.mutate({ projectId, sceneId: selectedSceneId });
          setSelectedSceneId(res.rightSceneId);
          try {
            await utils.generation.getProjectScenes.invalidate({ projectId });
          } catch {}
          toast.success('Trimmed from start');
          const ev = new CustomEvent('timeline-select-scene', { detail: { sceneId: res.rightSceneId } });
          window.dispatchEvent(ev);
          // Push undo action (restore original + delete right)
          if (original) {
            try { pushAction(projectId, { type: 'trimLeft', originalScene: original, rightSceneId: res.rightSceneId, offset }); } catch {}
          }
        }
      } catch (err) {
        console.error('Trim-left error', err);
        toast.error('Failed to trim from start');
      }
    }, 30);
  }, [selectedSceneId, getSceneStartById, currentFrame, projectId, splitSceneMutation, removeSceneMutation, utils]);

  // Trim-right button: set duration to playhead offset (end at playhead)
  const handleTrimRightClick = useCallback(() => {
    if (!selectedSceneId) return;
    const info = getSceneStartById(selectedSceneId);
    if (!info) return;
    const frameNow = Math.round(currentFrame);
    const offset = Math.max(1, Math.min(info.duration, frameNow - info.start));
    if (offset <= 0 || offset > info.duration) {
      toast.info('Move playhead inside the scene to trim');
      return;
    }
    // Update locally and persist; push undo action
    try { pushAction(projectId, { type: 'updateDuration', sceneId: selectedSceneId, prevDuration: info.duration, newDuration: offset }); } catch {}
    updateScene(projectId, selectedSceneId, { duration: offset });
    const idKey = `dur-${nanoid(8)}`;
    const clientRevision = (useVideoState.getState().projects[projectId] as any)?.revision;
    updateSceneDurationMutation.mutate({ projectId, sceneId: selectedSceneId, duration: offset, idempotencyKey: idKey, clientRevision });
  }, [selectedSceneId, getSceneStartById, currentFrame, projectId, updateScene, updateSceneDurationMutation]);
  
  // Handle scene name editing
  const handleEditName = useCallback((sceneId: string | null, name?: string) => {
    setEditingSceneId(sceneId);
    if (sceneId && name !== undefined) {
      setEditingName(name);
    }
  }, []);
  
  const handleSaveName = useCallback((sceneId: string, name: string) => {
    if (name.trim()) {
      const newName = name.trim();
      
      // Update Zustand immediately for responsive UI
      updateScene(projectId, sceneId, {
        name: newName
      });
      
      // Persist to database
      const idKey = `rename-${nanoid(8)}`;
      const clientRevision = (useVideoState.getState().projects as any)[projectId]?.revision;
      updateSceneNameMutation.mutate({
        projectId,
        sceneId,
        name: newName,
        idempotencyKey: idKey,
        clientRevision,
      });
    }
    setEditingSceneId(null);
  }, [projectId, updateScene, updateSceneNameMutation]);
  
  // Handle timeline seek
  const handleSeek = useCallback((frame: number) => {
    const clampedFrame = Math.max(0, Math.min(totalDuration - 1, frame));
    setCurrentFrame(clampedFrame);
    const event = new CustomEvent('timeline-seek', { 
      detail: { frame: clampedFrame }
    });
    window.dispatchEvent(event);
  }, [totalDuration]);
  
  // Handle keyboard events for delete and play/pause
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if user is typing in an input field
      const activeElement = document.activeElement;
      const isTyping = activeElement && (
        activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA' || 
        (activeElement as HTMLElement).isContentEditable ||
        activeElement.getAttribute('role') === 'textbox'
      );

      // Space bar for play/pause - only if not typing
      if ((e.key === ' ' || e.code === 'Space') && !isTyping) {
        // Prevent default scrolling behavior
        e.preventDefault();
        togglePlayPause();
      }
      // Delete/Backspace for deleting selected scene - only if not typing
      else if ((e.key === 'Backspace' || e.key === 'Delete') && !isTyping) {
        if (selectedSceneId && !isDeletionBusy) {
          e.preventDefault();
          // Immediate delete; rely on Undo
          handleDeleteScene(selectedSceneId, true);
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedSceneId, handleDeleteScene, togglePlayPause, isDeletionBusy]);

  // Keyboard shortcuts: [ start, ] end, | split
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore if typing
      const active = document.activeElement as HTMLElement | null;
      const isTyping = !!active && (
        active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.getAttribute('role') === 'textbox'
      );
      if (isTyping) return;

      const findSceneAtFrame = (): { scene: Scene; index: number; start: number } | null => {
        let start = 0;
        for (let i = 0; i < scenes.length; i++) {
          const s = scenes[i];
          if (!s) continue;
          const end = start + (s.duration || 150);
          if (currentFrame >= start && currentFrame < end) {
            return { scene: s, index: i, start };
          }
          start = end;
        }
        return null;
      };

      const minFrames = 1;
      const target = selectedSceneId
        ? (() => {
            const i = scenes.findIndex((s: any) => s.id === selectedSceneId);
            if (i >= 0) {
              const start = scenes.slice(0, i).reduce((acc, s) => acc + (s.duration || 150), 0);
              return { scene: scenes[i] as Scene, index: i, start };
            }
            return findSceneAtFrame();
          })()
        : findSceneAtFrame();

      if (!target) return;
      const { scene, start } = target;
      const offset = Math.max(0, currentFrame - start);

      // [ set start (perfect trim-from-start)
      if (e.key === '[') {
        const splitAt = Math.max(1, Math.min((scene.duration || 150) - 1, offset));
        if (splitAt >= 1 && splitAt < (scene.duration || 150)) {
          (async () => {
            try {
              const res = await splitSceneMutation.mutateAsync({ projectId, sceneId: scene.id, frame: splitAt });
              if (res?.rightSceneId) {
                removeSceneMutation.mutate({ projectId, sceneId: scene.id });
                setSelectedSceneId(res.rightSceneId);
                await utils.generation.getProjectScenes.invalidate({ projectId });
                toast.success('Trimmed from start');
              }
            } catch (err) {
              console.error('Trim-from-start error', err);
              toast.error('Failed to trim from start');
            }
          })();
        }
        e.preventDefault();
        return;
      }

      // ] set end (trim-to-end)
      if (e.key === ']') {
        const newDuration = Math.max(minFrames, offset);
        if (newDuration !== scene.duration) {
          updateScene(projectId, scene.id, { duration: newDuration });
          updateSceneDurationMutation.mutate({ projectId, sceneId: scene.id, duration: newDuration });
        }
        e.preventDefault();
        return;
      }

      // | split (Shift+Backslash on many keyboards)
      if (e.key === '|' || (e.shiftKey && e.key === '\\')) {
        if (isSplitBusy || splitSceneMutation.isPending) {
          e.preventDefault();
          return;
        }
        (async () => {
          try {
            const sceneAt = target;
            if (sceneAt) {
              const { scene, start } = sceneAt;
              const offset = Math.max(0, currentFrame - start);
              if (offset > 0 && offset < (scene.duration || 150)) {
                setIsSplitBusy(true);
                await splitSceneMutation.mutateAsync({ projectId, sceneId: scene.id, frame: offset });
              } else {
                toast.info('Move playhead inside the scene to split');
              }
            }
          } catch (err) {
            console.error('Split error', err);
          } finally {
            setIsSplitBusy(false);
          }
        })();
        e.preventDefault();
        return;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scenes, selectedSceneId, currentFrame, projectId, updateScene, updateSceneDurationMutation, isSplitBusy, splitSceneMutation.isPending]);
  
  const handleDuplicateScene = useCallback((sceneId: string) => {
    const idKey = `dup-${nanoid(8)}`;
    const clientRevision = (useVideoState.getState().projects[projectId] as any)?.revision;
    duplicateSceneMutation.mutate({ projectId, sceneId, position: 'after', idempotencyKey: idKey, clientRevision });
    setContextMenu(null);
  }, [projectId, duplicateSceneMutation]);
  
  
  // Extract and cache scene colors
  const sceneColors = useMemo(() => {
    const colors: Record<string, { primary: string; secondary?: string; gradient?: string }> = {};
    scenes.forEach((scene: Scene) => {
      // Get the actual code for the scene - check multiple possible locations
      const sceneCode = (scene as any).tsxCode || scene.data?.code || scene.data?.tsxCode || '';
      if (sceneCode) {
        colors[scene.id] = extractSceneColors(sceneCode);
      } else {
        // Fallback colors based on type
        const type = scene.type || scene.data?.type || 'default';
        switch(type) {
          case 'text':
          case 'text-animation':
            colors[scene.id] = { primary: '#6366f1', gradient: 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)' };
            break;
          case 'video':
          case 'custom':
            colors[scene.id] = { primary: '#6b7280', gradient: 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)' };
            break;
          case 'image':
            colors[scene.id] = { primary: '#10b981', gradient: 'linear-gradient(90deg, #10b981 0%, #059669 100%)' };
            break;
          case 'sound':
          case 'audio':
            colors[scene.id] = { primary: '#f97316', gradient: 'linear-gradient(90deg, #f97316 0%, #ea580c 100%)' };
            break;
          default:
            colors[scene.id] = { primary: '#6b7280', gradient: 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)' };
        }
      }
    });
    return colors;
  }, [scenes]);
  
  // Get scene color based on extracted colors
  const getSceneStyles = useCallback((scene: Scene): React.CSSProperties => {
    const isSelected = selectedSceneId === scene.id;
    const colors = sceneColors[scene.id] || { primary: '#6b7280', gradient: 'linear-gradient(90deg, #6b7280 0%, #4b5563 100%)' };
    
    return {
      background: colors.gradient || colors.primary,
      border: isSelected ? '2px solid rgba(251, 146, 60, 0.6)' : '1px solid rgba(0, 0, 0, 0.1)',
      boxShadow: isSelected 
        ? '0 0 15px rgba(251, 146, 60, 0.3)' 
        : '0 1px 3px rgba(0, 0, 0, 0.1)',
      color: '#ffffff',
      textShadow: '0 1px 2px rgba(0, 0, 0, 0.2)'
    };
  }, [selectedSceneId, sceneColors]);
  
  // Calculate timeline height based on content - make it reactive to audio changes
  const timelineHeight = useMemo(() => {
    // Controls (60) + ruler (32) + scenes area + padding
    const sceneCount = scenes?.length || 0;
    const compact = !audioTrack && sceneCount <= 1;
    const height = audioTrack ? 280 : compact ? 180 : 220;
    console.log('[Timeline] Height calculation:', { hasAudio: !!audioTrack, sceneCount, height });
    return height;
  }, [audioTrack, scenes]);
  
  // Synchronize scrolling - timeline controls ruler
  const handleTimelineScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (timeRulerRef.current && e.currentTarget === timelineRef.current) {
      // Move the inner content of the ruler instead of scrolling it
      const rulerContent = timeRulerRef.current.firstElementChild as HTMLElement;
      if (rulerContent) {
        rulerContent.style.transform = `translateX(-${e.currentTarget.scrollLeft}px)`;
      }
    }
  }, []);
  
  return (
    <div className="flex flex-col bg-white dark:bg-gray-950 rounded-[15px] border border-gray-200 shadow-sm select-none" style={{ height: `${timelineHeight}px`, overflow: 'hidden' }}>
      {/* Timeline Controls - Consistent solid header (no translucency) */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        {/* Left cluster: frame/time display */}
        <div className="flex items-center gap-3 min-w-[220px]">
          {/* Frame/Time Counter - Minimal with switch indicator */}
          <div className="flex items-center gap-1">
            {displayMode === 'frames' ? (
              <button
                onClick={() => setDisplayMode('time')}
                className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                title="Switch to time display"
              >
                <span className="font-mono text-base font-medium text-gray-900 dark:text-gray-100">
                  {currentFrame}
                </span>
                <span className="text-sm text-gray-400">/</span>
                <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                  {totalDuration}f
                </span>
              </button>
            ) : (
              <button
                onClick={() => setDisplayMode('frames')}
                className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors group"
                title="Switch to frame display"
              >
                <span className="font-mono text-base font-medium text-gray-900 dark:text-gray-100">
                  {(currentFrame / FPS).toFixed(2)}s
                </span>
                <span className="text-sm text-gray-400">/</span>
                <span className="font-mono text-sm text-gray-500 dark:text-gray-400">
                  {(totalDuration / FPS).toFixed(2)}s
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Center cluster: playback controls */}
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
            <button
              onClick={() => {
                const newFrame = Math.max(0, currentFrame - 30);
                const event = new CustomEvent('timeline-seek', { 
                  detail: { frame: newFrame }
                });
                window.dispatchEvent(event);
                setCurrentFrame(newFrame);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 transition-colors"
              title="Previous second"
            >
              <SkipBack className="w-3.5 h-3.5" />
            </button>
            
            <button
              onClick={togglePlayPause}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-800 dark:text-gray-200 transition-colors"
              title={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
            </button>
            
            <button
              onClick={() => {
                const newFrame = Math.min(totalDuration - 1, currentFrame + 30);
                const event = new CustomEvent('timeline-seek', { 
                  detail: { frame: newFrame }
                });
                window.dispatchEvent(event);
                setCurrentFrame(newFrame);
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 transition-colors"
              title="Next second"
            >
              <SkipForward className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Edit Controls: Trim Left, Split, Trim Right */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
            <button
              onClick={handleTrimLeftClick}
              disabled={!selectedSceneId}
              className="px-2 py-1 rounded-md text-xs transition-colors disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              title="Trim start to playhead ([)"
            >
              [
            </button>
            <button
              onClick={() => selectedSceneId && handleSplitAtPlayhead(selectedSceneId)}
              disabled={!selectedSceneId || isSplitBusy || splitSceneMutation.isPending}
              className="px-2 py-1 rounded-md text-xs transition-colors disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              title={isSplitBusy || splitSceneMutation.isPending ? "Splitting…" : "Split at playhead (|)"}
            >
              {isSplitBusy || splitSceneMutation.isPending ? (
                <span className="inline-block w-3 h-3 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : (
                '|'
              )}
            </button>
            <button
              onClick={handleTrimRightClick}
              disabled={!selectedSceneId}
              className="px-2 py-1 rounded-md text-xs transition-colors disabled:opacity-50 hover:bg-gray-100 dark:hover:bg-gray-700"
              title=
                "Trim end to playhead (])"
            >
              ]
            </button>
          </div>

          {/* Loop Controls */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
            {([
              { key: 'off', label: 'Off' },
              { key: 'scene', label: 'Scene' },
              { key: 'video', label: 'Video' },
            ] as const).map(opt => (
              <button
                key={opt.key}
                onClick={() => {
                  setLoopState(opt.key);
                  const ev = new CustomEvent('loop-state-change', { detail: { state: opt.key } });
                  window.dispatchEvent(ev);
                }}
                className={cn(
                  "px-2 py-1 rounded-md text-xs transition-colors",
                  loopState === opt.key
                    ? "bg-gray-900 text-white dark:bg-gray-200 dark:text-gray-900"
                    : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
                title={`Loop: ${opt.label}`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Playback Speed */}
          <div className="flex items-center gap-2 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
            <PlaybackSpeedSlider
              currentSpeed={storePlaybackSpeed}
              onSpeedChange={(speed) => {
                if (projectId) {
                  storeSetPlaybackSpeed(projectId, speed);
                }
                try {
                  const ev = new CustomEvent('playback-speed-change', { detail: { speed } });
                  window.dispatchEvent(ev);
                } catch {}
              }}
            />
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-white dark:bg-gray-800 rounded-lg p-1 shadow-sm">
          {/* Undo/Redo */}
          <button
            onClick={performUndo}
            disabled={undoSize === 0}
            className={cn(
              "p-2 rounded-md transition-colors",
              undoSize === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            )}
            title="Undo (⌘Z / Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={performRedo}
            disabled={redoSize === 0}
            className={cn(
              "p-2 rounded-md transition-colors",
              redoSize === 0 ? "opacity-40 cursor-not-allowed" : "hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
            )}
            title="Redo (⇧⌘Z / Shift+Ctrl+Z)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setZoomScale(prev => Math.max(0.25, Math.round((prev - 0.1) * 100) / 100))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 transition-colors"
            title="Zoom out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          
          <button
            onClick={() => setZoomScale(1)}
            className="text-sm text-gray-700 dark:text-gray-300 px-2 min-w-[3rem] text-center font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            title={`Zoom: ${Math.round(zoomScale * 100)}%\n${
              zoomScale >= 3 ? 'Frame-level precision' :
              zoomScale >= 2 ? '5-frame precision' :
              zoomScale >= 1.5 ? '10-frame precision' :
              zoomScale >= 1 ? '0.5 second precision' :
              '1-2 second precision'
            }\n(Shift+drag for no snapping)`}
          >
            {Math.round(zoomScale * 100)}%
          </button>
          
          <button
            onClick={() => setZoomScale(prev => Math.min(4, Math.round((prev + 0.1) * 100) / 100))}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-600 dark:text-gray-300 transition-colors"
            title="Zoom in"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>
        
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
            title="Close Timeline"
          >
            <X className="w-4 h-4" />
          </button>
        )}
        </div>
      </div>
      
      {/* Timeline Container */}
      <div className="flex flex-col overflow-hidden bg-white dark:bg-gray-950" style={{ height: `${timelineHeight - 60}px` }}>
        {/* Time Ruler - not independently scrollable */}
        <div 
          ref={timeRulerRef}
          className="h-8 bg-gray-100 dark:bg-gray-900 relative overflow-hidden cursor-pointer select-none"
          onClick={(e) => {
            // Move playhead when clicking on time ruler
            if (timelineRef.current) {
              const rect = e.currentTarget.getBoundingClientRect();
              const scrollLeft = timelineRef.current.scrollLeft;
              const clickX = e.clientX - rect.left;
              
              // Account for scroll and use true content width (exclude spacer)
              const actualClickX = clickX + scrollLeft;
              const contentScrollWidth = (innerContentRef.current?.scrollWidth || rect.width * zoomScale) - END_SPACER_PX;
              const actualWidth = Math.max(1, contentScrollWidth);
              
              // Calculate percentage and frame
              const percentage = Math.max(0, Math.min(1, actualClickX / actualWidth));
              const newFrame = Math.round(percentage * totalDuration);
              const clampedFrame = Math.max(0, Math.min(totalDuration - 1, newFrame));
              
              // Update playhead position
              setCurrentFrame(clampedFrame);
              const event = new CustomEvent('timeline-seek', { 
                detail: { frame: clampedFrame }
              });
              window.dispatchEvent(event);
            }
          }}
        >
          <div 
            className="h-full relative"
            style={{ 
              width: `${Math.max(100, zoomScale * 100)}%`, 
              minWidth: '100%',
              transition: 'none'
            }}
          >
          {/* Dynamic time markers that adapt to zoom */}
          {(() => {
            // Calculate pixel width of the timeline
            const timelinePixelWidth = window.innerWidth * zoomScale;
            const minPixelsBetweenMarkers = 60; // Minimum pixels between time markers to avoid overlap
            
            // Calculate how many seconds should be between markers based on available space
            const pixelsPerSecond = timelinePixelWidth / (totalDuration / 30);
            let secondsBetweenMarkers = Math.ceil(minPixelsBetweenMarkers / pixelsPerSecond);
            
            // Round to nice intervals (1, 2, 5, 10, 15, 30, 60 seconds)
            const niceIntervals = [1, 2, 5, 10, 15, 30, 60];
            const interval = niceIntervals.find(i => i >= secondsBetweenMarkers) || 60;
            const frameInterval = interval * 30; // Convert to frames
            
            const markers = [];
            for (let frame = 0; frame <= totalDuration; frame += frameInterval) {
              const position = (frame / totalDuration) * 100;
              
              markers.push(
                <div
                  key={`time-${frame}`}
                  className="absolute top-0 h-full"
                  style={{ left: `${position}%` }}
                >
                  <div className="w-px h-3 bg-gray-300 dark:bg-gray-600" />
                  <span className="absolute top-3 left-0 text-[10px] text-gray-500 dark:text-gray-400 transform -translate-x-1/2 font-mono whitespace-nowrap select-none pointer-events-none">
                    {formatTime(frame)}
                  </span>
                </div>
              );
            }
            
            return markers;
          })()}
          </div>
        </div>
        
        {/* Timeline Track */}
        <div 
          ref={timelineRef}
          className="relative overflow-x-auto overflow-y-hidden bg-gray-50 dark:bg-gray-950"
          onClick={handleTimelineClick}
          onWheel={handleWheelZoom}
          onScroll={handleTimelineScroll}
          onMouseEnter={() => setIsPointerInside(true)}
          onMouseLeave={() => setIsPointerInside(false)}
          style={{ 
            height: `${timelineHeight - 60 - 32}px`,
            cursor: isDragging ? 'grabbing' : (isSplitBusy || splitSceneMutation.isPending) ? 'progress' : 'crosshair' 
          }}
        >
          <div
            className="relative"
            style={{ 
              width: `${Math.max(100, zoomScale * 100)}%`,
              minWidth: '100%',
              minHeight: '100%'
            }}
            ref={innerContentRef}
          >
            {/* IMPORTANT: Do not use padding on this container. Block left/width are percent-based
               and must be relative to the true content width. Adding inner padding distorts the
               percentage base and makes visual block boundaries drift from the actual video frames.
               We add a separate absolute spacer after the content (see below) to provide extra
               drag space without affecting percent calculations. */}
            {/* Dynamic grid lines matching time markers */}
            <div className="absolute inset-0 pointer-events-none">
              {(() => {
                // Use same calculation as time markers for consistency
                const timelinePixelWidth = window.innerWidth * zoomScale;
                const minPixelsBetweenMarkers = 60;
                const pixelsPerSecond = timelinePixelWidth / (totalDuration / 30);
                let secondsBetweenMarkers = Math.ceil(minPixelsBetweenMarkers / pixelsPerSecond);
                
                const niceIntervals = [1, 2, 5, 10, 15, 30, 60];
                const interval = niceIntervals.find(i => i >= secondsBetweenMarkers) || 60;
                const frameInterval = interval * 30;
                
                const gridLines = [];
                for (let frame = 0; frame <= totalDuration; frame += frameInterval) {
                  const position = (frame / totalDuration) * 100;
                  
                  gridLines.push(
                    <div
                      key={`grid-${frame}`}
                      className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800 opacity-50"
                      style={{ left: `${position}%` }}
                    />
                  );
                  
                  // Add finer grid lines between major ones when zoomed in
                  if (zoomScale > 1.5 && interval <= 5) {
                    const subInterval = frameInterval / 2;
                    const subFrame = frame + subInterval;
                    if (subFrame <= totalDuration) {
                      const subPosition = (subFrame / totalDuration) * 100;
                      gridLines.push(
                        <div
                          key={`subgrid-${subFrame}`}
                          className="absolute top-0 bottom-0 w-px bg-gray-200 dark:bg-gray-800 opacity-25"
                          style={{ left: `${subPosition}%` }}
                        />
                      );
                    }
                  }
                }
                
                return gridLines;
              })()}
            </div>
            
            {/* Scene Items */}
            <div className="relative" style={{ height: ROW_HEIGHT, marginTop: '20px', marginBottom: '20px' }}>
              {scenes.map((scene: any, index: number) => {
                // Calculate scene start position based on previous scenes (sequential)
                const sceneStart = scenes.slice(0, index).reduce((acc, s) => acc + (s.duration || 150), 0);
                // When zoomed, scenes need to scale with the container
                const left = (sceneStart / totalDuration) * 100;
                const width = (scene.duration / totalDuration) * 100;
                const isBeingDragged = isDragging && dragInfo?.sceneId === scene.id && dragInfo?.action === 'reorder';
                const isDeleting = deletingScenes.has(scene.id);
                const displayName = cleanSceneName(scene.name || scene.data?.name) || `Scene ${index + 1}`;
                
                return (
                  <div
                    key={scene.id}
                    data-timeline-scene={scene.id}
                    className={cn(
                      "absolute flex items-center rounded-lg text-sm font-medium transition-all cursor-move",
                      isBeingDragged ? "opacity-50 z-40 scale-105" : "z-10 hover:scale-102 hover:z-15",
                      isDeleting && "pointer-events-none"
                    )}
                    style={{ 
                      left: `${left}%`,
                      width: `${width}%`,
                      height: TIMELINE_ITEM_HEIGHT,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      minWidth: '40px',
                      ...getSceneStyles(scene),
                      transition: `left ${DELETE_FADE_MS}ms cubic-bezier(0.22,1,0.36,1), width ${DELETE_FADE_MS}ms cubic-bezier(0.22,1,0.36,1), opacity ${DELETE_FADE_MS}ms cubic-bezier(0.22,1,0.36,1), transform ${DELETE_FADE_MS}ms cubic-bezier(0.22,1,0.36,1)`,
                      willChange: 'left, width, transform, opacity',
                      opacity: isDeleting ? 0 : 1,
                    }}
                    draggable
                    onDragStartCapture={(e) => {
                      // If we're initiating a reorder interaction, block native HTML5 drag entirely
                      if (isDragging && dragInfo?.action === 'reorder') {
                        try { e.preventDefault(); e.stopPropagation(); } catch {}
                        return false as any;
                      }
                      return undefined as any;
                    }}
                    onDragStart={(e) => {
                      // Guard: prevent native drag when reordering via grip/long-press
                      if (isDragging && dragInfo?.action === 'reorder') {
                        try { e.preventDefault(); e.stopPropagation(); } catch {}
                        return;
                      }
                      // If a long-press reorder is pending, cancel it so chat-drag wins
                      clearLongPress();
                      try {
                        const payload = {
                          type: 'timeline-scene',
                          projectId,
                          sceneId: scene.id,
                          index: index + 1,
                          name: displayName,
                        };
                        e.dataTransfer.setData('application/json', JSON.stringify(payload));
                        e.dataTransfer.setData('text/plain', `@scene ${index + 1}`);
                        e.dataTransfer.effectAllowed = 'copy';
                      } catch {}
                    }}
                    onDragEnd={() => {
                      // Cleanup any stale long-press timers
                      clearLongPress();
                    }}
                    onMouseDown={(e) => {
                      // Check if we're clicking on a resize handle
                      const rect = e.currentTarget.getBoundingClientRect();
                      const relativeX = e.clientX - rect.left;
                    const isLeftEdge = relativeX < 10;
                    const isRightEdge = relativeX > rect.width - 10;
                      
                      if (isLeftEdge) {
                        handleResizeDragStart(e, scene.id, 'resize-start');
                      } else if (isRightEdge) {
                        handleResizeDragStart(e, scene.id, 'resize-end');
                      } else {
                        // Gentle behavior: allow press-and-hold on the block body to initiate reorder
                        // without making it too sensitive or conflicting with drag-to-chat.
                        // If the user moves quickly, native drag-to-chat will take precedence.
                        clearLongPress();
                        const startX = e.clientX;
                        const startY = e.clientY;
                        // Remember context so timer can promote to reorder
                        longPressStartRef.current = {
                          x: startX,
                          y: startY,
                          sceneId: scene.id,
                          sceneStart: sceneStart,
                          sceneDuration: scene.duration,
                          sceneIndex: index,
                        };
                        // After a short hold, if the pointer hasn't moved much, switch to reorder mode
                        longPressTimerRef.current = window.setTimeout(() => {
                          const info = longPressStartRef.current;
                          if (!info) return;
                          const MOVE_THRESHOLD_PX = 6;
                          const dx = Math.abs((lastMouseXRef.current ?? info.x) - info.x);
                          const dy = Math.abs((lastMouseYRef.current ?? info.y) - info.y);
                          const movedTooMuch = (Math.abs(dx) > MOVE_THRESHOLD_PX) || (Math.abs(dy) > MOVE_THRESHOLD_PX);
                          if (movedTooMuch) return;
                          // Activate reorder drag
                          setDragInfo({
                            action: 'reorder',
                            sceneId: info.sceneId,
                            startX: info.x,
                            startPosition: info.sceneStart,
                            startDuration: info.sceneDuration,
                            sceneIndex: info.sceneIndex,
                          });
                          setIsDragging(true);
                          setSelectedSceneId(info.sceneId);
                          try {
                            const ev = new CustomEvent('timeline-select-scene', { detail: { sceneId: info.sceneId } });
                            window.dispatchEvent(ev);
                          } catch {}
                        }, 250); // 250ms press to activate reorder
                      }
                    }}
                    onMouseMove={(e) => {
                      // Track last mouse for long-press movement threshold (no globals)
                      lastMouseXRef.current = e.clientX;
                      lastMouseYRef.current = e.clientY;
                      // If pointer moves too far before long-press fires, cancel long-press
                      const info = longPressStartRef.current;
                      if (info && longPressTimerRef.current) {
                        const dx = Math.abs(e.clientX - info.x);
                        const dy = Math.abs(e.clientY - info.y);
                        const MOVE_CANCEL_PX = 6;
                        if (dx > MOVE_CANCEL_PX || dy > MOVE_CANCEL_PX) {
                          clearLongPress();
                        }
                      }
                    }}
                    onMouseUp={() => {
                      // Cancel any pending long-press
                      clearLongPress();
                    }}
                    onMouseLeave={() => {
                      // Cancel pending long-press when leaving the block
                      clearLongPress();
                    }}
                    onContextMenu={(e) => handleContextMenu(e, scene.id)}
                    onClick={(e) => {
                      // Simple click selects the scene without starting reorder
                      e.stopPropagation();
                      setSelectedSceneId(scene.id);
                      try {
                        const ev = new CustomEvent('timeline-select-scene', { detail: { sceneId: scene.id } });
                        window.dispatchEvent(ev);
                      } catch {}
                    }}
                  >
                    {/* Resize Handle Start */}
                    <div
                      className="absolute left-0 top-0 bottom-0 w-2 md:w-3 cursor-ew-resize bg-white/20 hover:bg-white/40 rounded-l-lg transition-colors backdrop-blur-sm"
                      title="Trim start (drag)"
                    />

                    {/* Reorder Grip */}
                    <div
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-white/80 hover:text-white/100 cursor-grab active:cursor-grabbing select-none"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDragInfo({
                          action: 'reorder',
                          sceneId: scene.id,
                          startX: e.clientX,
                          startPosition: sceneStart,
                          startDuration: scene.duration,
                          sceneIndex: index
                        });
                        setIsDragging(true);
                        setSelectedSceneId(scene.id);
                        try {
                          const ev = new CustomEvent('timeline-select-scene', { detail: { sceneId: scene.id } });
                          window.dispatchEvent(ev);
                        } catch {}
                      }}
                      draggable={false}
                      title="Drag to reorder"
                    >
                      <GripVertical className="w-3.5 h-3.5" />
                    </div>
                    
                    {/* Scene Label */}
                    {editingSceneId === scene.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={() => handleSaveName(scene.id, editingName)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            handleSaveName(scene.id, editingName);
                          } else if (e.key === 'Escape') {
                            setEditingSceneId(null);
                          }
                        }}
                        className="flex-1 text-center px-2 bg-transparent text-white font-semibold outline-none border-b border-white/50 mx-4"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span 
                        className="flex-1 text-center px-8 truncate select-none font-semibold drop-shadow-sm"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setEditingSceneId(scene.id);
                          setEditingName(displayName);
                        }}
                      >
                        {displayName}
                      </span>
                    )}
                    
                    {/* Resize Handle End */}
                    <div
                      className="absolute right-0 top-0 bottom-0 w-2 md:w-3 cursor-ew-resize bg-white/20 hover:bg-white/40 rounded-r-lg transition-colors backdrop-blur-sm"
                      title="Trim end (drag)"
                    />
                    
                    {/* Inline Delete Confirmation removed – rely on Undo */}
                  </div>
                );
              })}
            </div>
            
            {/* Audio Track - only show when audio exists */}
            {audioTrack && (
              <div className="relative" style={{ height: ROW_HEIGHT, marginTop: '10px' }}>
                <div
                  className={cn(
                    "absolute rounded-lg shadow-sm",
                    "bg-gradient-to-b from-gray-100 to-gray-200/90 dark:from-gray-800 dark:to-gray-800/60",
                    isAudioSelected ? "ring-2 ring-orange-400" : "border border-gray-300/40",
                    audioPulse && !isAudioSelected ? "ring-2 ring-orange-400 animate-pulse" : ""
                  )}
                  style={{
                    left: (() => {
                      // Position based on timeline offset (defaults to 0)
                      const offset = Math.max(0, (audioTrack as any).timelineOffsetSec || 0);
                      const videoSec = Math.max(0.01, totalDuration / FPS);
                      const clamped = Math.min(offset, videoSec);
                      const leftPct = (clamped * FPS / totalDuration) * 100;
                      return `${Math.max(0, Math.min(100, leftPct))}%`;
                    })(),
                    width: (() => {
                      const offset = Math.max(0, (audioTrack as any).timelineOffsetSec || 0);
                      const trimStart = Math.max(0, audioTrack.startTime || 0);
                      const trimEnd = Math.max(trimStart, (audioTrack.endTime || audioTrack.duration || 1));
                      const trimDur = Math.max(0, trimEnd - trimStart);
                      const videoSec = Math.max(0.01, totalDuration / FPS);
                      const remaining = Math.max(0, videoSec - offset);
                      const visibleSec = Math.min(trimDur, remaining);
                      const widthPct = (visibleSec * FPS / totalDuration) * 100;
                      return `${Math.max(0, Math.min(100, widthPct))}%`;
                    })(),
                    height: TIMELINE_ITEM_HEIGHT,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    cursor: isDragging && dragInfo?.action === 'audio-move' ? 'grabbing' : 'default'
                  }}
                  onMouseDown={(e) => {
                    // Start moving the audio segment
                    e.stopPropagation();
                    isAudioDraggingRef.current = true;
                    setIsAudioSelected(true);
                    setAudioPulse(false);
                    setDragInfo({
                      action: 'audio-move',
                      startX: e.clientX,
                      startPosition: 0,
                      startDuration: 0,
                      audioStartSec: audioTrack.startTime,
                      audioEndSec: audioTrack.endTime,
                      audioDurationSec: decodedAudioDurationRef.current || audioTrack.duration,
                      // baseline timeline offset
                      // @ts-ignore - extend drag info with new field
                      audioTimelineOffsetSec: (audioTrack as any).timelineOffsetSec || 0
                    });
                    setIsDragging(true);
                  }}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setAudioMenu({ x: e.clientX, y: e.clientY });
                    setIsAudioSelected(true);
                  }}
                  onMouseMove={handleAudioHover}
                  onMouseLeave={handleAudioHoverLeave}
                >
                  {/* Trim handle - start */}
                  <div
                    className="absolute left-0 top-0 bottom-0 w-4 cursor-ew-resize bg-white/40 hover:bg-white/70 rounded-l"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      isAudioDraggingRef.current = true;
                      setAudioPulse(false);
                    setDragInfo({
                      action: 'audio-resize-start',
                      startX: e.clientX,
                      startPosition: 0,
                      startDuration: 0,
                      audioStartSec: audioTrack.startTime,
                      audioEndSec: audioTrack.endTime,
                      audioDurationSec: decodedAudioDurationRef.current || audioTrack.duration,
                      // Keep baseline offset for completeness
                      // @ts-ignore
                      audioTimelineOffsetSec: (audioTrack as any).timelineOffsetSec || 0
                    });
                    setIsDragging(true);
                  }}
                  />

                  {/* Waveform */}
                  <canvas
                    ref={audioCanvasRef}
                    className="absolute inset-0 w-full h-full pointer-events-none"
                    width={1200}
                    height={TIMELINE_ITEM_HEIGHT * 2}
                  />

                  {/* Inline audio controls removed: no labels or sliders on timeline */}

                  {/* Trim handle - end */}
                  <div
                    className="absolute right-0 top-0 bottom-0 w-4 cursor-ew-resize bg-white/40 hover:bg-white/70 rounded-r"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      isAudioDraggingRef.current = true;
                      setAudioPulse(false);
                    setDragInfo({
                      action: 'audio-resize-end',
                      startX: e.clientX,
                      startPosition: 0,
                      startDuration: 0,
                      audioStartSec: audioTrack.startTime,
                      audioEndSec: audioTrack.endTime,
                      audioDurationSec: decodedAudioDurationRef.current || audioTrack.duration,
                      // @ts-ignore
                      audioTimelineOffsetSec: (audioTrack as any).timelineOffsetSec || 0
                    });
                    setIsDragging(true);
                  }}
                  />
                </div>
                {audioMenu && (
                  <div
                    className="fixed bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[140px] text-sm"
                    style={{ left: Math.min(audioMenu.x, window.innerWidth - 160), top: Math.min(audioMenu.y, window.innerHeight - 120), zIndex: 9999 }}
                    onClick={(e) => e.stopPropagation()}
                    onMouseDown={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                  >
                    <div className="px-4 py-2.5 flex items-center gap-2 text-gray-700 dark:text-gray-200">
                      <Clock className="w-4 h-4" />
                      <span className="text-xs">Song Offset</span>
                      <button
                        className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => {
                          const decodedDur = decodedAudioDurationRef.current || audioTrack.duration || 0;
                          const newStart = Math.max(0, (audioTrack.startTime || 0) - 1);
                          const minLen = 0.1;
                          const newEnd = Math.max(newStart + minLen, Math.min(decodedDur, audioTrack.endTime || decodedDur));
                          const updated = { ...audioTrack, startTime: newStart, endTime: newEnd };
                          updateProjectAudio(projectId, updated);
                          updateAudioMutation.mutate({ projectId, audio: updated } as any);
                        }}
                        title="-1s"
                        onMouseDown={(e) => e.stopPropagation()}
                      >-1s</button>
                      <input
                        type="number"
                        step={0.1}
                        min={0}
                        value={Number.isFinite(audioTrack.startTime) ? audioTrack.startTime : 0}
                        onChange={(e) => {
                          const decodedDur = decodedAudioDurationRef.current || audioTrack.duration || 0;
                          let newStart = parseFloat(e.target.value);
                          if (Number.isNaN(newStart)) return;
                          newStart = Math.max(0, Math.min(decodedDur, newStart));
                          const minLen = 0.1;
                          const newEnd = Math.max(newStart + minLen, Math.min(decodedDur, audioTrack.endTime || decodedDur));
                          const updated = { ...audioTrack, startTime: newStart, endTime: newEnd };
                          updateProjectAudio(projectId, updated);
                          updateAudioMutation.mutate({ projectId, audio: updated } as any);
                        }}
                        className="w-20 px-2 py-1 rounded bg-gray-100 dark:bg-gray-700 outline-none"
                        onMouseDown={(e) => e.stopPropagation()}
                        onPointerDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                      />
                      <button
                        className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600"
                        onClick={() => {
                          const decodedDur = decodedAudioDurationRef.current || audioTrack.duration || 0;
                          const newStart = Math.min(decodedDur, (audioTrack.startTime || 0) + 1);
                          const minLen = 0.1;
                          const newEnd = Math.max(newStart + minLen, Math.min(decodedDur, audioTrack.endTime || decodedDur));
                          const updated = { ...audioTrack, startTime: newStart, endTime: newEnd };
                          updateProjectAudio(projectId, updated);
                          updateAudioMutation.mutate({ projectId, audio: updated } as any);
                        }}
                        title="+1s"
                        onMouseDown={(e) => e.stopPropagation()}
                      >+1s</button>
                    </div>
                    <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
                    <button
                      onClick={() => {
                        updateProjectAudio(projectId, null);
                        updateAudioMutation.mutate({ projectId, audio: null } as any);
                        setAudioMenu(null);
                        setIsAudioSelected(false);
                        toast.success('Audio removed');
                      }}
                      className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left text-red-600 dark:text-red-400"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete Audio
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* End spacer (visual extra space that does not affect percent-based widths)
                This lives outside the content's percent base (left: 100%). It lets users drag
                beyond the last block without altering how block percentages are computed. */}
            <div
              className="absolute top-0 bottom-0"
              style={{ left: '100%', width: `${END_SPACER_PX}px` }}
            />

            {/* Playhead - with Bazaar orange gradient */}
            <div
              className="absolute top-0 bottom-0 w-1 cursor-ew-resize z-30"
              style={{ 
                left: `${(currentFrame / totalDuration) * 100}%`,
                background: 'linear-gradient(180deg, #fb923c 0%, #fed7aa 100%)',
                boxShadow: '0 0 10px rgba(251, 146, 60, 0.6), 0 0 20px rgba(254, 215, 170, 0.4)'
              }}
              title={`Frame: ${currentFrame} / ${totalDuration} (${((currentFrame / totalDuration) * 100).toFixed(1)}%)`}
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setDragInfo({
                  action: 'playhead',
                  startX: e.clientX,
                  startPosition: currentFrame,
                  startDuration: 0
                });
                setIsDragging(true);
              }}
            >
              {/* Modern playhead indicator with Bazaar orange gradient */}
              <div 
                className="absolute -top-2 left-1/2 transform -translate-x-1/2 w-4 h-4 rounded-full border-2 border-white shadow-lg"
                style={{ background: 'linear-gradient(135deg, #fb923c 0%, #fed7aa 100%)' }}
              />
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 
                              w-0 h-0 
                              border-l-[5px] border-l-transparent
                              border-r-[5px] border-r-transparent
                              border-t-[6px] pointer-events-none"
                   style={{ borderTopColor: '#fb923c' }}
              />
            </div>
          </div>
        </div>
      </div>
      
      {/* Context Menu - using fixed positioning and high z-index */}
      {contextMenu && (
        <div
          className="fixed bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 py-2 min-w-[180px] text-sm backdrop-blur-sm"
          style={{ 
            left: Math.min(contextMenu.x, window.innerWidth - 200),
            top: Math.min(contextMenu.y, window.innerHeight - 150),
            zIndex: 9999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const sceneIndex = scenes.findIndex((s: any) => s.id === contextMenu.sceneId);
              const scene = scenes[sceneIndex];
              if (scene) {
                // Start inline editing
                setEditingSceneId(contextMenu.sceneId);
                setEditingName((scene as any).name || scene.data?.name || `Scene ${sceneIndex + 1}`);
              }
              setContextMenu(null);
            }}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left text-gray-700 dark:text-gray-200 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
            Rename Scene
          </button>
          <button
            onClick={() => handleDuplicateScene(contextMenu.sceneId)}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left text-gray-700 dark:text-gray-200 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Duplicate Scene
          </button>
          <button
            onClick={() => {
              handleSplitAtPlayhead(contextMenu.sceneId);
              setContextMenu(null);
            }}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:hover:bg-gray-700 w-full text-left text-gray-700 dark:text-gray-200 transition-colors"
          >
            <Scissors className="w-4 h-4" />
            Split at Playhead
          </button>
          <div className="border-t border-gray-200 dark:border-gray-700 my-1" />
          <button
            onClick={() => {
              handleDeleteScene(contextMenu.sceneId, false); // Show confirmation
              setContextMenu(null); // Close menu
            }}
            disabled={isDeletionBusy}
            className="flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 dark:hover:bg-red-900/20 w-full text-left text-red-600 dark:text-red-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-4 h-4" />
            {isDeletionBusy ? 'Deleting...' : 'Delete Scene'}
          </button>
        </div>
      )}

      {/* Peak hover tooltip (no visual markers) */}
      {peakTooltip && peakTooltip.frames && peakTooltip.frames.length > 0 && (
        <div
          className="fixed z-[9999] bg-gray-900 text-white px-2 py-1 rounded-md text-xs shadow-lg pointer-events-none"
          style={{
            left: Math.min(peakTooltip.x + 12, window.innerWidth - 200),
            top: Math.max(0, peakTooltip.y),
          }}
        >
          Peaks near: {peakTooltip.frames.join(', ')}
        </div>
      )}
    </div>
  );
}
