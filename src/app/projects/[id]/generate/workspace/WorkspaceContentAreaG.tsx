// src/app/projects/[id]/generate/workspace/WorkspaceContentAreaG.tsx
"use client";

// src/app/projects/[id]/generate/workspace/WorkspaceContentAreaG.tsx
import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle, useMemo } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent, DropAnimation } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { XIcon, RotateCcw } from 'lucide-react';
import type { InputProps } from '~/lib/types/video/input-props';
import { useVideoState } from '~/stores/videoState';
import { api } from '~/trpc/react';
import ChatPanelG from './panels/ChatPanelG';
import { PreviewPanelG } from './panels/PreviewPanelG';
import { CodePanelG } from './panels/CodePanelG';
import { StoryboardPanelG } from './panels/StoryboardPanelG';
import TemplatesPanelG from './panels/TemplatesPanelG';
import MediaPanel from './panels/MediaPanel';
import MyProjectsPanelG from './panels/MyProjectsPanelG';
import IntegrationsPanel from './panels/IntegrationsPanel';
import { toast } from 'sonner';
import { cn } from "~/lib/cn";
import { ExportDropdown } from '~/components/export/ExportDropdown';
import { PlaybackSpeedSlider } from "~/components/ui/PlaybackSpeedSlider";
import { LoopToggle, type LoopState } from "~/components/ui/LoopToggle";

// Panel definitions for BAZAAR-304 workspace
const PANEL_COMPONENTS_G = {
  chat: ChatPanelG,
  preview: PreviewPanelG,
  code: CodePanelG,
  storyboard: StoryboardPanelG,
  templates: TemplatesPanelG,
  myprojects: MyProjectsPanelG,
  media: MediaPanel,
  integrations: IntegrationsPanel,
};

const PANEL_LABELS_G = {
  chat: 'Chat',
  preview: 'Video Player',
  code: 'Code',
  storyboard: 'Storyboard',
  templates: 'Templates',
  myprojects: 'My Projects',
  media: 'Media',
  integrations: 'Integrations',
};

export type PanelTypeG = keyof typeof PANEL_COMPONENTS_G;

interface OpenPanelG {
  id: string;
  type: PanelTypeG;
}

interface WorkspaceContentAreaGProps {
  projectId: string;
  userId?: string;
  initialProps: InputProps;
  onPanelDragStart?: (panelType: PanelTypeG) => void;
  projects?: any[];
  onProjectRename?: (newTitle: string) => void;
  isAdmin?: boolean;
}

export interface WorkspaceContentAreaGHandle {
  addPanel: (type: PanelTypeG) => void;
}

// Sortable panel wrapper
function SortablePanelG({ id, children, style, className, onRemove, projectId, currentPlaybackSpeed, setCurrentPlaybackSpeed, currentLoopState, setCurrentLoopState, selectedSceneId, onSceneSelect, scenes }: { 
  id: string; 
  children: React.ReactNode; 
  style?: React.CSSProperties; 
  className?: string;
  onRemove?: () => void;
  projectId?: string;
  currentPlaybackSpeed?: number;
  setCurrentPlaybackSpeed?: (speed: number) => void;
  currentLoopState?: LoopState;
  setCurrentLoopState?: (state: LoopState) => void;
  selectedSceneId?: string | null;
  onSceneSelect?: (sceneId: string) => void;
  scenes?: any[];
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  const mergedStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1,
    zIndex: isDragging ? 50 : 1,
    background: 'white',
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.2)' : undefined,
    border: isDragging ? '2px solid #3b82f6' : undefined,
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    ...style,
  };
  
  const isCodePanel = id === 'code';
  const isPreviewPanel = id === 'preview';
  const isStoryboardPanel = id === 'storyboard';
  const panelTitle = PANEL_LABELS_G[id as PanelTypeG] || id;

  // Removed header frame counter to avoid duplication and visual clutter.
  
  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      className={`rounded-[15px] border border-gray-200 overflow-hidden flex flex-col h-full ${isDragging ? 'dragging' : ''} ${className ?? ''}`}
    >
      {!isCodePanel && (
        <div 
          className={`flex items-center justify-between px-3 py-2 border-b ${isDragging ? 'bg-blue-50' : 'bg-gray-50'}`}
        >
          <span 
            className="font-medium text-sm cursor-move flex-1"
            {...attributes}
            {...listeners}
          >{panelTitle}</span>
          <div className="flex items-center gap-1">
            {isPreviewPanel && (
              <>
                <LoopToggle
                  loopState={currentLoopState || 'video'}
                  onStateChange={(state) => {
                    console.log('[WorkspaceContentAreaG] Loop state changed:', state);
                    setCurrentLoopState?.(state);
                    // Dispatch event to PreviewPanelG
                    const event = new CustomEvent('loop-state-change', { detail: { state } });
                    window.dispatchEvent(event);
                  }}
                  selectedSceneId={selectedSceneId}
                  onSceneSelect={(sceneId) => {
                    console.log('[WorkspaceContentAreaG] Scene selected for loop:', sceneId);
                    onSceneSelect?.(sceneId);
                  }}
                  scenes={scenes?.map((s, i) => ({ id: s.id, name: `Scene ${i + 1}` })) || []}
                />
                <PlaybackSpeedSlider
                  currentSpeed={currentPlaybackSpeed || 1}
                  onSpeedChange={(speed) => {
                    setCurrentPlaybackSpeed?.(speed);
                    // Dispatch event to PreviewPanelG
                    const event = new CustomEvent('playback-speed-change', { detail: { speed } });
                    window.dispatchEvent(event);
                  }}
                />
              </>
            )}
            {/* Hide close button for Preview panel; users should always have video available */}
            {!isPreviewPanel && (
              <button 
                onClick={onRemove} 
                className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-gray-100"
                aria-label={`Close ${panelTitle} panel`}
              >
                <XIcon className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
      )}
      <div className="flex-1 overflow-hidden">
        {children}
      </div>
    </div>
  );
}

// Drop zone component for workspace
function DropZoneG({ 
  isActive, 
  onDrop 
}: { 
  isActive: boolean; 
  onDrop: (panelType: PanelTypeG) => void;
}) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const panelType = e.dataTransfer.getData("text/plain") as PanelTypeG;
    if (PANEL_COMPONENTS_G[panelType]) {
      onDrop(panelType);
    }
  };

  // Quick actions for workspace panels
  const quickActions: { type: PanelTypeG; label: string; icon: React.ReactNode }[] = [
    { 
      type: 'chat', 
      label: 'Chat', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      )
    },
    { 
      type: 'templates', 
      label: 'Templates', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect width="18" height="7" x="3" y="3" rx="1"/>
          <rect width="9" height="7" x="3" y="14" rx="1"/>
          <rect width="5" height="7" x="16" y="14" rx="1"/>
        </svg>
      )
    },
    { 
      type: 'myprojects', 
      label: 'My Projects', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
        </svg>
      )
    },
    { 
      type: 'storyboard', 
      label: 'Storyboard', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6"/>
          <line x1="8" y1="12" x2="21" y2="12"/>
          <line x1="8" y1="18" x2="21" y2="18"/>
          <line x1="3" y1="6" x2="3.01" y2="6"/>
          <line x1="3" y1="12" x2="3.01" y2="12"/>
          <line x1="3" y1="18" x2="3.01" y2="18"/>
        </svg>
      )
    },
    { 
      type: 'code', 
      label: 'Code', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16,18 22,12 16,6"/>
          <polyline points="8,6 2,12 8,18"/>
        </svg>
      )
    }
  ];

  return (
    <div 
      className={`w-full h-full flex-1 border-2 border-dashed rounded-[15px] flex flex-col items-center justify-center transition-colors ${
        isActive ? 'border-blue-400 bg-blue-50/50' : 'border-gray-300'
      }`}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div className="p-6 text-center">
        <span className="block text-base font-medium text-gray-600 mb-2">
          {isActive ? 'Drop panel here' : 'No panels open'}
        </span>
        <span className="block text-sm text-gray-500 mb-4">
          {isActive ? 'Release to add new panel' : 'Drag panels from sidebar or click one of the options below'}
        </span>
        
        {!isActive && (
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            {quickActions.map((action) => (
              <button
                key={action.type}
                onClick={() => onDrop(action.type)}
                className="flex items-center gap-1.5 py-1 px-3 bg-white border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm text-xs font-medium text-gray-700"
              >
                <span className="text-gray-500">{action.icon}</span>
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Drag overlay configuration
const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.9',
      },
    },
  }),
  keyframes({ transform }) {
    return [
      { opacity: 0.9, transform: transform?.initial ? String(transform.initial) : undefined },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' }
    ];
  },
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  duration: 250,
};

// Main workspace content area component
const WorkspaceContentAreaG = forwardRef<WorkspaceContentAreaGHandle, WorkspaceContentAreaGProps>(
  ({ projectId, userId, initialProps, projects = [], onProjectRename, isAdmin = false }, ref) => {
    // Initial open panels - start with chat and preview
    const [openPanels, setOpenPanels] = useState<OpenPanelG[]>([
      { id: 'chat', type: 'chat' },
      { id: 'preview', type: 'preview' },
    ]);
    
    // Playback speed state for preview panel header
    const [currentPlaybackSpeed, setCurrentPlaybackSpeed] = useState(1);
    
    // Loop state for preview panel header - always default to 'video'
    // The actual project-specific state will be loaded by PreviewPanelG
    const [currentLoopState, setCurrentLoopState] = useState<LoopState>('video');
    
    // Listen for playback speed loaded from PreviewPanelG
    useEffect(() => {
      const handleSpeedLoaded = (event: Event) => {
        const customEvent = event as CustomEvent;
        const speed = customEvent.detail?.speed;
        if (typeof speed === 'number') {
          setCurrentPlaybackSpeed(speed);
        }
      };
      
      const handleLoopLoaded = (event: Event) => {
        const customEvent = event as CustomEvent;
        const state = customEvent.detail?.state;
        if (state === 'video' || state === 'off' || state === 'scene') {
          setCurrentLoopState(state);
        }
      };

      window.addEventListener('playback-speed-loaded', handleSpeedLoaded);
      window.addEventListener('loop-state-loaded', handleLoopLoaded);
      return () => {
        window.removeEventListener('playback-speed-loaded', handleSpeedLoaded);
        window.removeEventListener('loop-state-loaded', handleLoopLoaded);
      };
    }, []);
    
    
    // Scene selection state - shared between Storyboard and Code panels
    const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
    
    // Restore and save selected scene - combined into single effect for efficiency
    useEffect(() => {
      const lastSceneKey = `lastSelectedScene_${projectId}`;
      
      // On mount, restore last selected scene
      if (!selectedSceneId) {
        const lastSceneId = localStorage.getItem(lastSceneKey);
        if (lastSceneId) {
          console.log('[WorkspaceContentAreaG] Restoring last selected scene:', lastSceneId);
          setSelectedSceneId(lastSceneId);
        }
      }
      
      // Save whenever it changes
      if (selectedSceneId) {
        localStorage.setItem(lastSceneKey, selectedSceneId);
        console.log('[WorkspaceContentAreaG] Saved last selected scene to localStorage:', selectedSceneId);
      }
    }, [selectedSceneId, projectId]);
    
    // Get video state methods
    const { updateAndRefresh, getCurrentProps, syncDbMessages } = useVideoState();
    
    // Get shouldOpenAudioPanel flag for MediaPanel
    const shouldOpenAudioPanel = useVideoState(state => state.projects[projectId]?.shouldOpenAudioPanel);
    
    // Consolidated query for all project data
    const { data: fullProjectData } = api.project.getFullProject.useQuery(
      { id: projectId },
      { 
        refetchOnWindowFocus: false,
        staleTime: 5 * 60 * 1000, // 5 minute cache
      }
    );
    
    // Extract data from consolidated query
    const dbMessages = fullProjectData?.messages;
    const dbScenes = fullProjectData?.scenes;
    
    // ✅ SYNC: When database messages are loaded, sync them with VideoState
    useEffect(() => {
      if (dbMessages && dbMessages.length > 0) {
        console.log('[WorkspaceContentAreaG] Syncing database messages with VideoState:', dbMessages.length);
        syncDbMessages(projectId, dbMessages as any[]);
      }
    }, [dbMessages, projectId, syncDbMessages]);
    
    // Helper function to convert database scenes to InputProps format
    // Memoized to prevent recreating on every render
    const convertDbScenesToInputProps = useCallback((dbScenes: any[]) => {
      // CRITICAL: If we have real scenes from DB, we should NOT include the welcome scene
      // The welcome scene only exists in video state, not in DB
      // When DB returns scenes, it means we have real content now
      
      let currentStart = 0;
      const scenes = dbScenes.map((dbScene, index) => {
        const sceneDuration = dbScene.duration || 150; // Use stored duration, fallback to 150 frames (5s)
        const scene = {
          id: dbScene.id,
          type: 'custom' as const,
          start: currentStart,
          duration: sceneDuration,
          data: {
            code: dbScene.tsxCode,
            name: dbScene.name || 'Generated Scene',
            componentId: dbScene.id, // Use scene ID as component ID for now
            props: dbScene.props || {}
          }
        };
        currentStart += sceneDuration; // Update start time for next scene
        return scene;
      });
      
      return {
        meta: {
          // Preserve the original project title from initialProps instead of generating new ones
          title: initialProps?.meta?.title || 'New Project',
          duration: currentStart || 150, // Ensure minimum duration even if no scenes
          backgroundColor: initialProps?.meta?.backgroundColor || '#000000',
          format: initialProps?.meta?.format || 'landscape',
          width: initialProps?.meta?.width || 1920,
          height: initialProps?.meta?.height || 1080
        },
        scenes // This will REPLACE all scenes, including any welcome scene
      };
    }, [initialProps]);
    
    // Helper function to validate scene code before adding to video state
    const validateSceneCode = useCallback(async (code: string): Promise<{ isValid: boolean; errors: string[] }> => {
      const errors: string[] = [];
      
      try {
        // 1. Basic structure validation
        if (!code || code.trim().length === 0) {
          errors.push('Scene code is empty');
          return { isValid: false, errors };
        }
        
        // 2. Check for required export default (accept multiple patterns)
        const hasExportDefaultFunction = /export\s+default\s+function/.test(code);
        const hasExportDefaultConst = /export\s+default\s+\w+/.test(code);
        const hasConstWithExport = /const\s+\w+\s*=.*export\s+default\s+\w+/s.test(code);
        
        if (!hasExportDefaultFunction && !hasExportDefaultConst && !hasConstWithExport) {
          errors.push('Missing export default (function or const component)');
        }
        
        // 3. Check for React/Remotion patterns
        const hasRemotionPatterns = /import.*from.*['"]remotion['"]/.test(code) || 
                                   /const\s*{\s*[^}]*}\s*=\s*window\.Remotion/.test(code) ||
                                   /AbsoluteFill|useCurrentFrame|interpolate/.test(code);
        if (!hasRemotionPatterns) {
          errors.push('Missing Remotion patterns');
        }
        
        // 4. Check for dangerous patterns
        const dangerousPatterns = [
          { pattern: /while\s*\(\s*true\s*\)/, message: 'Infinite while loop detected' },
          { pattern: /for\s*\(\s*;\s*;\s*\)/, message: 'Infinite for loop detected' },
          { pattern: /throw\s+new\s+Error/, message: 'Explicit error throwing detected' }
        ];
        
        for (const { pattern, message } of dangerousPatterns) {
          if (pattern.test(code)) {
            errors.push(message);
          }
        }
        
        // 5. Basic syntax validation for ES6 modules (without Function constructor)
        try {
          // Check for basic syntax issues without trying to execute the code
          // This is a lightweight check for obvious syntax errors
          
          // Check for unmatched brackets/braces
          const openBraces = (code.match(/\{/g) || []).length;
          const closeBraces = (code.match(/\}/g) || []).length;
          if (openBraces !== closeBraces) {
            errors.push('Unmatched braces detected');
          }
          
          const openParens = (code.match(/\(/g) || []).length;
          const closeParens = (code.match(/\)/g) || []).length;
          if (openParens !== closeParens) {
            errors.push('Unmatched parentheses detected');
          }
          
          const openBrackets = (code.match(/\[/g) || []).length;
          const closeBrackets = (code.match(/\]/g) || []).length;
          if (openBrackets !== closeBrackets) {
            errors.push('Unmatched brackets detected');
          }
          
          // Note: Removed string quote validation as it incorrectly flags JSX attributes
          // JSX allows single quotes in attributes like className='text-lg' which is valid
          
        } catch (syntaxError) {
          errors.push(`Basic syntax validation failed: ${syntaxError instanceof Error ? syntaxError.message : 'Invalid syntax'}`);
        }
        
        return { isValid: errors.length === 0, errors };
        
      } catch (error) {
        console.error('Error during scene validation:', error);
        errors.push(`Validation error: ${error instanceof Error ? error.message : 'Unknown validation error'}`);
        return { isValid: false, errors };
      }
    }, []);
    
    // Callback for handling new scene generation with validation
    const handleSceneGenerated = useCallback(async (sceneId: string) => {
      console.log('[WorkspaceContentAreaG] 🎉 NEW SCENE GENERATED! Scene ID:', sceneId);
      
      // 🚨 FIX DOUBLE REFRESH: Check if scene already exists in state
      const currentProps = getCurrentProps();
      const existingScene = currentProps?.scenes?.find((s: any) => s.id === sceneId);
      
      if (existingScene) {
        console.log('[WorkspaceContentAreaG] ✅ Scene already in state (added optimistically), skipping DB fetch');
        // Just select the scene, don't refetch or update state again
        setSelectedSceneId(sceneId);
        return;
      }
      
      // Only fetch from DB if scene is genuinely missing (edge case)
      console.log('[WorkspaceContentAreaG] ⚠️ Scene not found in state, fetching from database...');
      
      try {
        // ✅ FETCH: Use scenes from consolidated query or refetch if needed
        const scenesData = dbScenes || [];
        
        if (scenesData.length > 0) {
          console.log('[WorkspaceContentAreaG] ✅ Using', scenesData.length, 'scenes from consolidated query');
          
          // ✅ CONVERT: Database scenes to InputProps format
          const updatedProps = convertDbScenesToInputProps(scenesData);
          console.log('[WorkspaceContentAreaG] ✅ Converted to InputProps format:', updatedProps.scenes.length, 'scenes');
          
          // 🚨 CRITICAL FIX: Use updateAndRefresh instead of replace for guaranteed UI updates
          console.log('[WorkspaceContentAreaG] 🚀 Using updateAndRefresh for guaranteed state sync...');
          updateAndRefresh(projectId, () => updatedProps);
          console.log('[WorkspaceContentAreaG] ✅ Updated VideoState with new unified state management');
          
          // ✅ SELECT: The newly generated scene
          setSelectedSceneId(sceneId);
          console.log('[WorkspaceContentAreaG] ✅ Selected new scene:', sceneId);
        } else {
          console.warn('[WorkspaceContentAreaG] ⚠️ No scenes data available');
        }
      } catch (error) {
        console.error('[WorkspaceContentAreaG] ❌ CRITICAL ERROR in scene generation handling:', error);
        toast.error('Critical error handling scene generation - please refresh the page');
      }
    }, [projectId, dbScenes, convertDbScenesToInputProps, updateAndRefresh, getCurrentProps]);

    // 🚨 REMOVED: Redundant initialization logic
    // GenerateWorkspaceRoot already handles project initialization
    // Having it here causes double initialization and the welcome scene bug
    // when switching tabs
    
    // State for dragging
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);
    const [currentDraggedPanel, setCurrentDraggedPanel] = useState<string | null>(null);
    
    // Sensors for drag-and-drop
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 5,
        },
      })
    );
    
    // State for detecting drags from the sidebar
    const [isDraggingFromSidebar, setIsDraggingFromSidebar] = useState(false);
    
    // Drag event handlers - memoized to prevent recreation
    const handleDragStart = useCallback((event: DragStartEvent) => {
      const { active } = event;
      
      if (active) {
        setCurrentDraggedPanel(String(active.id));
        setActiveId(String(active.id));
      }
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
      const { over } = event;
      
      if (over) {
        setOverId(String(over.id));
      }
    }, []);

    const handleDragEnd = useCallback((event: DragEndEvent) => {
      setCurrentDraggedPanel(null);
      setActiveId(null);
      setOverId(null);
      
      const { active, over } = event;
      
      if (over && active && active.id !== over.id) {
        setOpenPanels((panels) => {
          const oldIndex = panels.findIndex((p) => p.id === active.id);
          const newIndex = panels.findIndex((p) => p.id === over.id);
          
          return (oldIndex >= 0 && newIndex >= 0) 
            ? arrayMove(panels, oldIndex, newIndex)
            : panels;
        });
      }
    }, []);

    // Handle sidebar panel dragging
    useEffect(() => {
      const handleDragEnter = (e: DragEvent) => {
        const dataTransfer = e.dataTransfer;
        
        if (dataTransfer && dataTransfer.types.includes('text/plain')) {
          try {
            const panelType = dataTransfer.getData('text/plain');
            if (Object.keys(PANEL_COMPONENTS_G).includes(panelType)) {
              setIsDraggingFromSidebar(true);
            }
          } catch (err) {
            setIsDraggingFromSidebar(true);
          }
        }
      };
      
      const handleDragLeave = (e: DragEvent) => {
        const currentTarget = e.currentTarget as HTMLElement;
        const relatedTarget = e.relatedTarget as Node | null;
        
        if (!relatedTarget || !currentTarget.contains(relatedTarget)) {
          setIsDraggingFromSidebar(false);
        }
      };
      
      const handleDragEnd = () => {
        setIsDraggingFromSidebar(false);
      };

      document.addEventListener('dragenter', handleDragEnter);
      document.addEventListener('dragleave', handleDragLeave);
      document.addEventListener('dragend', handleDragEnd);
      document.addEventListener('drop', handleDragEnd);

      return () => {
        document.removeEventListener('dragenter', handleDragEnter);
        document.removeEventListener('dragleave', handleDragLeave);
        document.removeEventListener('dragend', handleDragEnd);
        document.removeEventListener('drop', handleDragEnd);
      };
    }, []);

    // Add panel method
    const addPanel = useCallback((type: PanelTypeG) => {
      // Prevent non-admins from adding integrations panel
      if (type === 'integrations' && !isAdmin) {
        toast.error('Integrations panel is currently available for administrators only');
        return;
      }
      
      const panelExists = openPanels.some((p) => p.type === type);
      
      if (!panelExists) {
        const newPanel: OpenPanelG = {
          id: type,
          type,
        };
        
        setOpenPanels((panels) => [...panels, newPanel]);
        
        if (openPanels.length === 0) {
          setTimeout(() => {
            setIsDraggingFromSidebar(false);
          }, 100);
        }
      } else {
        console.log(`Panel ${type} already exists`);
      }
    }, [openPanels, setIsDraggingFromSidebar, isAdmin]);
    
    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      addPanel
    }), [addPanel]);
    
    // Handler for dropping from sidebar
    const handleDropFromSidebar = useCallback((panelType: PanelTypeG) => {
      addPanel(panelType);
      setIsDraggingFromSidebar(false);
    }, [addPanel]);

    // Remove panel
    const removePanel = useCallback((id: string) => {
      setOpenPanels((panels) => panels.filter((p) => p.id !== id));
    }, []);

    // Memoize current scenes to avoid recalculation on every render
    const currentScenes = useMemo(() => {
      const props = getCurrentProps();
      return props?.scenes || [];
    }, [getCurrentProps, projectId]);

    // Generate panel content - memoized to prevent unnecessary re-renders
    const renderPanelContent = useCallback((panel: OpenPanelG | null | undefined) => {
      if (!panel) return null;
      
      switch (panel.type) {
        case 'chat':
          return <ChatPanelG
            projectId={projectId}
            userId={userId}
            selectedSceneId={selectedSceneId}
            onSceneGenerated={handleSceneGenerated}
          />;
        case 'media':
          return <MediaPanel
            projectId={projectId}
            onInsertToChat={(url) => {
              // Broadcast drag/drop or click-insert to chat textarea via CustomEvent
              const event = new CustomEvent('chat-insert-media-url', { 
                detail: { url, name: url.split('/').pop() } 
              });
              window.dispatchEvent(event);
            }}
            defaultTab={shouldOpenAudioPanel ? 'audio' : 'uploads'}
          />;
        case 'preview':
          return (
            <div id="preview-panel-container-g" className="h-full">
              <PreviewPanelG 
                projectId={projectId} 
                initial={initialProps} 
                selectedSceneId={selectedSceneId}
              />
            </div>
          );
        case 'code':
          return <CodePanelG 
            projectId={projectId} 
            selectedSceneId={selectedSceneId} 
            onClose={() => removePanel(panel.id)}
            onSceneSelect={setSelectedSceneId}
          />;
        case 'storyboard':
          return <StoryboardPanelG 
            projectId={projectId} 
            selectedSceneId={selectedSceneId} 
            onSceneSelect={setSelectedSceneId}
          />;
        case 'templates':
          return <TemplatesPanelG 
            projectId={projectId} 
            onSceneGenerated={handleSceneGenerated} 
          />;
        case 'myprojects':
          return <MyProjectsPanelG 
            currentProjectId={projectId} 
          />;
        // Old panels removed - now handled by IntegrationsPanel
        case 'integrations':
          return <IntegrationsPanel 
            projectId={projectId}
          />;
        default:
          return null;
      }
    }, [projectId, initialProps, selectedSceneId, handleSceneGenerated, removePanel, userId]);

    // Render empty state if no panels are open
    if (openPanels.length === 0) {
      return (
        <div className="flex flex-col h-full w-full">
          <div className="w-full h-full flex-1">
            <DropZoneG isActive={isDraggingFromSidebar} onDrop={handleDropFromSidebar} />
          </div>
        </div>
      );
    }

    // Render with panels
    return (
      <div className="h-full w-full relative bg-white dark:bg-gray-900">
        <DndContext 
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={openPanels.map(p => p.id)} 
            strategy={horizontalListSortingStrategy}
          >
            <div className="h-full w-full relative">
              {/* Allow drop from sidebar anywhere in the panel area */}
              <div
                className="absolute inset-0 z-0 pointer-events-none"
                style={{ pointerEvents: isDraggingFromSidebar ? 'auto' : 'none' }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "copy";
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const panelType = e.dataTransfer.getData("text/plain") as PanelTypeG;
                  if (PANEL_COMPONENTS_G[panelType]) {
                    handleDropFromSidebar(panelType);
                  }
                }}
              />
              
              {/* Panel layout */}
              {openPanels.length > 0 && (
                <PanelGroup direction="horizontal" className="h-full">
                  {openPanels.map((panel, idx) => (
                      <React.Fragment key={panel?.id || `panel-${idx}`}>
                        <Panel 
                          minSize={10} 
                          defaultSize={100 / (openPanels.length || 1)}
                          className="transition-all duration-300"
                          style={{
                            transformOrigin: 'center',
                            transition: 'all 250ms cubic-bezier(0.25, 1, 0.5, 1)'
                          }}
                        >
                          <SortablePanelG 
                            id={panel?.id || `panel-${idx}`}
                            onRemove={() => panel?.id ? removePanel(panel.id) : null}
                            projectId={projectId}
                            currentPlaybackSpeed={currentPlaybackSpeed}
                            setCurrentPlaybackSpeed={setCurrentPlaybackSpeed}
                            currentLoopState={currentLoopState}
                            setCurrentLoopState={setCurrentLoopState}
                            selectedSceneId={selectedSceneId}
                            onSceneSelect={setSelectedSceneId}
                            scenes={currentScenes}
                          >
                            {renderPanelContent(panel)}
                          </SortablePanelG>
                        </Panel>
                        {/* Add resize handle between panels but not after the last one */}
                        {idx < openPanels.length - 1 && (
                          <PanelResizeHandle className="w-[10px] bg-transparent hover:bg-white/20 hover:shadow-[0_0_10px_rgba(255,255,255,0.5)] transition-all" data-panel-resize-handle-id={`horizontal-${idx}`} />
                        )}
                      </React.Fragment>
                  ))}
                </PanelGroup>
              )}
              
              {/* Drop overlay that appears when dragging from sidebar */}
              {isDraggingFromSidebar && (
                <div className="absolute inset-0 bg-blue-100/20 border-2 border-dashed border-blue-400 rounded-[15px] pointer-events-none flex items-center justify-center">
                  <div className="bg-white p-3 rounded-[15px] shadow-lg">
                    <span className="text-blue-600 font-medium">Drop to add new panel</span>
                  </div>
                </div>
              )}
            </div>
          </SortableContext>
          
          {/* Show drag overlay when dragging a panel */}
          <DragOverlay dropAnimation={dropAnimationConfig} modifiers={[]}>
            {currentDraggedPanel !== null ? (
              <div className="bg-white/90 shadow-lg rounded-[15px] border border-blue-300 p-4 w-[300px] opacity-90 backdrop-blur-sm">
                <div className="font-medium text-sm mb-1 border-b pb-1">{currentDraggedPanel}</div>
                <div className="text-xs text-muted-foreground">Moving panel...</div>
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    );
  }
);

WorkspaceContentAreaG.displayName = 'WorkspaceContentAreaG';

export default WorkspaceContentAreaG; 