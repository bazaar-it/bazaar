"use client";

import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent, DropAnimation } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { XIcon, RefreshCwIcon } from 'lucide-react';
import type { InputProps } from '~/types/input-props';
import { useVideoState } from '~/stores/videoState';
import { api } from '~/trpc/react';
import { ChatPanelG } from './panels/ChatPanelG';
import { PreviewPanelG } from './panels/PreviewPanelG';
import { CodePanelG } from './panels/CodePanelG';
import { StoryboardPanelG } from './panels/StoryboardPanelG';
import { toast } from 'sonner';

// Panel definitions for BAZAAR-304 workspace
const PANEL_COMPONENTS_G = {
  chat: ChatPanelG,
  preview: PreviewPanelG,
  code: CodePanelG,
  storyboard: StoryboardPanelG,
};

const PANEL_LABELS_G = {
  chat: 'Chat',
  preview: 'Video Player',
  code: 'Code',
  storyboard: 'Storyboard',
};

export type PanelTypeG = keyof typeof PANEL_COMPONENTS_G;

interface OpenPanelG {
  id: string;
  type: PanelTypeG;
}

interface WorkspaceContentAreaGProps {
  projectId: string;
  initialProps: InputProps;
  onPanelDragStart?: (panelType: PanelTypeG) => void;
  projects?: any[];
}

export interface WorkspaceContentAreaGHandle {
  addPanel: (type: PanelTypeG) => void;
}

// Sortable panel wrapper
function SortablePanelG({ id, children, style, className, onRemove }: { 
  id: string; 
  children: React.ReactNode; 
  style?: React.CSSProperties; 
  className?: string;
  onRemove?: () => void;
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
  
  const handlePreviewRefresh = () => {
    try {
      const previewPanel = document.querySelector('#preview-panel-container-g');
      const refreshButton = previewPanel?.querySelector('#refresh-preview-button-g');
      if (refreshButton instanceof HTMLButtonElement) {
        refreshButton.click();
      }
    } catch (error) {
      console.error('Error refreshing preview:', error);
    }
  };
  
  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      className={`rounded-[15px] border border-gray-200 overflow-hidden ${isDragging ? 'dragging' : ''} ${className ?? ''}`}
    >
      {!isCodePanel && (
        <div 
          className={`flex items-center justify-between px-3 py-2 border-b ${isDragging ? 'bg-blue-50' : 'bg-gray-50'} cursor-move`}
          {...attributes}
          {...listeners}
        >
          <span className="font-medium text-sm">{panelTitle}</span>
          <div className="flex items-center gap-1">
            {isPreviewPanel && (
              <button
                onClick={handlePreviewRefresh}
                className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded hover:bg-gray-100"
                aria-label="Refresh preview"
                title="Refresh preview"
              >
                <RefreshCwIcon className="h-3.5 w-3.5" />
              </button>
            )}
            <button 
              onClick={onRemove} 
              className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-gray-100"
              aria-label={`Close ${panelTitle} panel`}
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
      <div className={`flex-1 min-h-0 ${isCodePanel ? "h-full" : ""}`}>
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
      type: 'preview', 
      label: 'Video Player', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"/>
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
  ({ projectId, initialProps, projects = [] }, ref) => {
    // Initial open panels - start with chat and preview
    const [openPanels, setOpenPanels] = useState<OpenPanelG[]>([
      { id: 'chat', type: 'chat' },
      { id: 'preview', type: 'preview' },
    ]);
    
    // Scene selection state - shared between Storyboard and Code panels
    const [selectedSceneId, setSelectedSceneId] = useState<string | null>(null);
    
    // Get video state methods
    const { replace, getCurrentProps } = useVideoState();
    
    // Query for fetching updated project scenes from database
    const getProjectScenesQuery = api.generation.getProjectScenes.useQuery(
      { projectId },
      { 
        enabled: false, // Only fetch manually when needed
        refetchOnWindowFocus: false,
        refetchOnMount: false
      }
    );
    
    // Helper function to convert database scenes to InputProps format
    const convertDbScenesToInputProps = useCallback((dbScenes: any[]) => {
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
          duration: currentStart, // Total duration is sum of all scene durations
          backgroundColor: initialProps?.meta?.backgroundColor || '#000000'
        },
        scenes
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
        
        // 2. Check for required export default function
        if (!/export\s+default\s+function/.test(code)) {
          errors.push('Missing export default function');
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
          
          // Check for unterminated strings (basic check)
          const singleQuotes = (code.match(/'/g) || []).length;
          const doubleQuotes = (code.match(/"/g) || []).length;
          const backticks = (code.match(/`/g) || []).length;
          
          if (singleQuotes % 2 !== 0) {
            errors.push('Unterminated single quote string detected');
          }
          if (doubleQuotes % 2 !== 0) {
            errors.push('Unterminated double quote string detected');
          }
          if (backticks % 2 !== 0) {
            errors.push('Unterminated template literal detected');
          }
          
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
    const handleSceneGenerated = useCallback(async (sceneId: string, code: string) => {
      console.log('[WorkspaceContentAreaG] Scene generated, validating before state update:', sceneId);
      
      try {
        // STEP 1: Validate the generated code before adding to video state
        console.log('[WorkspaceContentAreaG] Validating scene code...');
        const validation = await validateSceneCode(code);
        
        if (!validation.isValid) {
          console.error('[WorkspaceContentAreaG] ❌ Scene validation failed:', validation.errors);
          toast.error(`Scene validation failed: ${validation.errors.join(', ')}`);
          
          // Don't update video state with invalid scenes
          return;
        }
        
        console.log('[WorkspaceContentAreaG] ✅ Scene validation passed, proceeding with state update');
        
        // STEP 2: Create state snapshot for rollback capability
        const currentProps = getCurrentProps();
        const stateSnapshot = currentProps ? JSON.parse(JSON.stringify(currentProps)) : null;
        
        try {
          // STEP 3: Refetch the latest project scenes from database
          const result = await getProjectScenesQuery.refetch();
          
          if (result.data) {
            console.log('[WorkspaceContentAreaG] Fetched updated scenes:', result.data.length);
            
            // Convert database scenes to InputProps format
            const updatedProps = convertDbScenesToInputProps(result.data);
            
            // STEP 4: Validate the entire video state before updating
            const hasValidScenes = updatedProps.scenes.every(scene => {
              return scene.data?.code && scene.data.code.trim().length > 0;
            });
            
            if (!hasValidScenes) {
              throw new Error('One or more scenes have invalid code');
            }
            
            // STEP 5: Update the video state with the fresh data
            replace(projectId, updatedProps);
            
            // Select the newly generated scene
            setSelectedSceneId(sceneId);
            
            console.log('[WorkspaceContentAreaG] ✅ Video state updated successfully with scene count:', updatedProps.scenes.length);
            toast.success('Scene added successfully!');
            
          } else {
            throw new Error('Failed to fetch updated scenes from database');
          }
          
        } catch (stateUpdateError) {
          console.error('[WorkspaceContentAreaG] ❌ Error updating video state:', stateUpdateError);
          
          // STEP 6: Rollback to previous state if update fails
          if (stateSnapshot) {
            console.log('[WorkspaceContentAreaG] 🔄 Rolling back to previous state...');
            replace(projectId, stateSnapshot);
            toast.error('Scene update failed - rolled back to previous state');
          } else {
            toast.error('Scene update failed and no backup state available');
          }
        }
        
      } catch (error) {
        console.error('[WorkspaceContentAreaG] ❌ Critical error in scene generation handling:', error);
        toast.error('Critical error handling scene generation - please refresh the page');
      }
    }, [projectId, getProjectScenesQuery, convertDbScenesToInputProps, replace, getCurrentProps, validateSceneCode]);
    
    // Track if initialization has been attempted for this project
    const initializationAttemptedRef = useRef<Set<string>>(new Set());
    
    // Load existing project scenes on initialization
    useEffect(() => {
      // Only initialize once per project
      if (initializationAttemptedRef.current.has(projectId)) {
        console.log('[WorkspaceContentAreaG] Initialization already attempted for project:', projectId);
        return;
      }
      
      const initializeProject = async () => {
        // Mark this project as initialization attempted
        initializationAttemptedRef.current.add(projectId);
        
        console.log('[WorkspaceContentAreaG] Initializing project:', projectId);
        console.log('[WorkspaceContentAreaG] Initial props:', initialProps);
        
        try {
          // Always fetch from database first to check if there are existing scenes
          const result = await getProjectScenesQuery.refetch();
          
          if (result.data && result.data.length > 0) {
            console.log('[WorkspaceContentAreaG] Found existing scenes in database:', result.data.length);
            
            // Convert and set in video state
            const props = convertDbScenesToInputProps(result.data);
            replace(projectId, props);
            
            console.log('[WorkspaceContentAreaG] Initialized video state with existing scenes');
          } else {
            console.log('[WorkspaceContentAreaG] No existing scenes found in database, using initial props');
            
            // Use initial props for new projects (this ensures empty scenes array for new projects)
            if (initialProps) {
              replace(projectId, initialProps);
              console.log('[WorkspaceContentAreaG] Initialized video state with initial props:', initialProps);
            } else {
              console.warn('[WorkspaceContentAreaG] No initial props provided for new project');
            }
          }
        } catch (error) {
          console.error('[WorkspaceContentAreaG] Error loading project data:', error);
          
          // Fallback to initial props
          if (initialProps) {
            replace(projectId, initialProps);
            console.log('[WorkspaceContentAreaG] Fallback: Initialized video state with initial props');
          }
        }
      };
      
      void initializeProject();
    }, [projectId, initialProps, getProjectScenesQuery, convertDbScenesToInputProps, replace]);
    
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
    
    // Drag event handlers
    const handleDragStart = useCallback((event: DragStartEvent) => {
      const { active } = event;
      
      if (active) {
        setCurrentDraggedPanel(String(active.id));
        setActiveId(String(active.id));
      }
    }, []);

    const handleDragOver = useCallback((event: DragOverEvent) => {
      const { active, over } = event;
      
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
    }, [openPanels, setIsDraggingFromSidebar]);
    
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

    // Generate panel content
    const renderPanelContent = useCallback((panel: OpenPanelG | null | undefined) => {
      if (!panel) return null;
      
      switch (panel.type) {
        case 'chat':
          return <ChatPanelG 
            projectId={projectId} 
            selectedSceneId={selectedSceneId}
            onSceneGenerated={handleSceneGenerated}
          />;
        case 'preview':
          return (
            <div id="preview-panel-container-g" className="h-full">
              <PreviewPanelG projectId={projectId} initial={initialProps} />
            </div>
          );
        case 'code':
          return <CodePanelG 
            projectId={projectId} 
            selectedSceneId={selectedSceneId} 
            onClose={() => removePanel(panel.id)}
          />;
        case 'storyboard':
          return <StoryboardPanelG 
            projectId={projectId} 
            selectedSceneId={selectedSceneId} 
            onSceneSelect={setSelectedSceneId}
          />;
        default:
          return null;
      }
    }, [projectId, initialProps, selectedSceneId, handleSceneGenerated, removePanel]);

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
                        >
                          {renderPanelContent(panel)}
                        </SortablePanelG>
                      </Panel>
                      {/* Add resize handle between panels but not after the last one */}
                      {idx < openPanels.length - 1 && (
                        <PanelResizeHandle className="w-[10px] bg-transparent hover:bg-blue-400 transition-colors" data-panel-resize-handle-id={`horizontal-${idx}`} />
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