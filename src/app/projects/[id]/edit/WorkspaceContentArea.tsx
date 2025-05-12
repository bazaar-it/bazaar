"use client";

// src/app/projects/[id]/edit/WorkspaceContentArea.tsx
import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from './PanelGroup';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent, DropAnimation } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { 
  ChatPanel, 
  PreviewPanel, 
  CodePanel, 
  UploadsPanel, 
  TimelinePanel, 
  ProjectsPanel, 
  LibraryPanel, 
  ScenePlanningHistoryPanel 
} from './panels';
import { XIcon, RefreshCwIcon } from 'lucide-react';
import type { InputProps } from '~/types/input-props';

// Panel definitions
const PANEL_COMPONENTS = {
  chat: ChatPanel,
  preview: PreviewPanel,
  code: CodePanel,
  uploads: UploadsPanel,
  projects: ProjectsPanel,
  templates: ProjectsPanel, // Temporarily using ProjectsPanel for Templates
  scenes: ProjectsPanel, // Temporarily using ProjectsPanel for Scenes
  timeline: TimelinePanel,
  sceneplanning: ScenePlanningHistoryPanel
};

const PANEL_LABELS = {
  chat: 'Chat',
  preview: 'Preview',
  code: 'Code',
  uploads: 'Uploads',
  projects: 'Projects',
  templates: 'Templates',
  scenes: 'Scenes',
  timeline: 'Timeline',
  sceneplanning: 'Scene Planning'
};

export type PanelType = keyof typeof PANEL_COMPONENTS;

interface OpenPanel {
  id: string;
  type: PanelType;
}

interface WorkspaceContentAreaProps {
  projectId: string;
  initialProps: InputProps;
  onPanelDragStart?: (panelType: PanelType) => void;
  projects?: any[]; // Array of projects
}

// Define the interface for the methods we want to expose to parent components
export interface WorkspaceContentAreaHandle {
  addPanel: (type: PanelType) => void;
  toggleTimeline: () => void;
}

// Sortable panel wrapper
function SortablePanel({ id, children, style, className, onRemove }: { 
  id: string; 
  children: React.ReactNode; 
  style?: React.CSSProperties; 
  className?: string;
  onRemove?: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  
  // Improved style to maintain better visibility during dragging
  const mergedStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.9 : 1, // Slightly transparent when dragging but still visible
    zIndex: isDragging ? 50 : 1, // Higher z-index to stay on top
    background: 'white',
    boxShadow: isDragging ? '0 4px 12px rgba(0,0,0,0.2)' : undefined, // More pronounced shadow
    border: isDragging ? '2px solid #3b82f6' : undefined, // Add blue border when dragging
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    ...style,
  };
  
  // Special case for Code panel - don't add the header with X
  const isCodePanel = id === 'code';
  
  // Check if this is a Preview panel to show the refresh button
  const isPreviewPanel = id === 'preview';
  
  // Get the proper panel title - use PANEL_LABELS if it's a valid PanelType
  const panelTitle = PANEL_LABELS[id as PanelType] || id;
  
  // Add a refresh handler for preview panels
  const handlePreviewRefresh = () => {
    try {
      const previewPanel = document.querySelector('#preview-panel-container');
      const refreshButton = previewPanel?.querySelector('#refresh-preview-button');
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

// Drop zone component for when dragging from sidebar
function DropZone({ 
  isActive, 
  onDrop 
}: { 
  isActive: boolean; 
  onDrop: (panelType: PanelType) => void;
}) {
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const panelType = e.dataTransfer.getData("text/plain") as PanelType;
    if (PANEL_COMPONENTS[panelType]) {
      onDrop(panelType);
    }
  };

  // Quick actions for adding panels
  const quickActions: { type: PanelType; label: string; icon: React.ReactNode }[] = [
    { 
      type: 'preview', 
      label: 'Preview', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      )
    },
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
      type: 'projects', 
      label: 'Projects', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
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

// Improve the drag overlay for better visual feedback
const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.9', // Increased from 0.4 for better visibility
      },
    },
  }),
  // Simpler keyframes with string transform values
  keyframes({ transform }) {
    return [
      { opacity: 0.9, transform: transform?.initial ? String(transform.initial) : undefined },
      { opacity: 1, transform: 'translate3d(0, 0, 0)' }
    ];
  },
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  duration: 250,
};

// Use forwardRef to expose methods to parent components
const WorkspaceContentArea = forwardRef<WorkspaceContentAreaHandle, WorkspaceContentAreaProps>(
  ({ projectId, initialProps, projects = [] }, ref) => {
    // Initial open panels - using panel types as ids for consistency
    const [openPanels, setOpenPanels] = useState<OpenPanel[]>([
      { id: 'preview', type: 'preview' },
      { id: 'chat', type: 'chat' },
    ]);
    
    // State for dragging
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);
    const [currentDraggedPanel, setCurrentDraggedPanel] = useState<string | null>(null);
    
    // Sensors for drag-and-drop - PointerSensor is better for touch support
    const sensors = useSensors(
      useSensor(PointerSensor, {
        activationConstraint: {
          distance: 5, // Small delay helps with accidental drags
        },
      })
    );
    
    // State for timeline
    const [isTimelineVisible, setIsTimelineVisible] = useState(false);
    
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
        // Find the indices of the active and over items
        setOpenPanels((panels) => {
          const oldIndex = panels.findIndex((p) => p.id === active.id);
          const newIndex = panels.findIndex((p) => p.id === over.id);
          
          // Only reorder if both indices are valid
          return (oldIndex >= 0 && newIndex >= 0) 
            ? arrayMove(panels, oldIndex, newIndex)
            : panels;
        });
      }
    }, []);

    // Handle sidebar panel dragging
    useEffect(() => {
      const handleDragEnter = (e: DragEvent) => {
        // Check if it's coming from the sidebar - this is a simplistic check
        // In a real app, you might want to use dataTransfer.types or a custom property
        const dataTransfer = e.dataTransfer;
        
        if (dataTransfer && dataTransfer.types.includes('text/plain')) {
          try {
            // Try to see if it's a valid panel type
            const panelType = dataTransfer.getData('text/plain');
            if (Object.keys(PANEL_COMPONENTS).includes(panelType)) {
              setIsDraggingFromSidebar(true);
            }
          } catch (err) {
            // Can't read data during dragenter in some browsers
            // So we just set it true and will validate on drop
            setIsDraggingFromSidebar(true);
          }
        }
      };
      
      const handleDragLeave = (e: DragEvent) => {
        // Only reset if actually leaving the document
        // We need to properly check if one element contains another
        // For drag events we need special handling because relatedTarget might be null
        const currentTarget = e.currentTarget as HTMLElement;
        const relatedTarget = e.relatedTarget as Node | null;
        
        // If there's no related target or if the current target doesn't contain it
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

    // Add panel method - exposed via useImperativeHandle
    const addPanel = useCallback((type: PanelType) => {
      // Check if panel already exists to avoid duplicates
      const panelExists = openPanels.some((p) => p.type === type);
      
      if (!panelExists) {
        const newPanel: OpenPanel = {
          id: type, // Use type as ID for consistency
          type,
        };
        
        // Add the new panel and focus on it by placing it at the end
        setOpenPanels((panels) => [...panels, newPanel]);
        
        // If it's the first panel, ensure we're not showing the empty state
        if (openPanels.length === 0) {
          // We already added the panel to the state above, now we're just
          // ensuring the UI updates properly
          setTimeout(() => {
            setIsDraggingFromSidebar(false);
          }, 100);
        }
      } else {
        // If panel already exists, we could highlight it somehow in the future
        console.log(`Panel ${type} already exists`);
      }
    }, [openPanels, setIsDraggingFromSidebar]);
    
    // Toggle timeline visibility
    const toggleTimeline = useCallback(() => {
      setIsTimelineVisible(prev => !prev);
    }, []);
    
    // Expose methods to parent
    useImperativeHandle(ref, () => ({
      addPanel,
      toggleTimeline
    }), [addPanel, toggleTimeline]);
    
    // Make sure we have panels (safety check)
    const safePanels = openPanels || [];

    // Handler for dropping from sidebar
    const handleDropFromSidebar = useCallback((panelType: PanelType) => {
      addPanel(panelType);
      setIsDraggingFromSidebar(false);
    }, [addPanel]);

    // Remove panel
    const removePanel = useCallback((id: string) => {
      setOpenPanels((panels) => panels.filter((p) => p.id !== id));
    }, []);

    // Generate panel content - add explicit typing and null checks
    const renderPanelContent = useCallback((panel: OpenPanel | null | undefined) => {
      if (!panel) return null;
      
      const PanelComponent = PANEL_COMPONENTS[panel.type];
      
      switch (panel.type) {
        case 'chat':
          return <ChatPanel projectId={projectId} />;
        case 'preview':
          return (
            <div id="preview-panel-container" className="h-full">
              <PreviewPanel projectId={projectId} initial={initialProps} />
            </div>
          );
        case 'code':
          return <CodePanel />;
        case 'uploads':
          // UploadsPanel expects projectId
          return <UploadsPanel projectId={projectId} />;
        case 'sceneplanning':
          // ScenePlanningHistoryPanel doesn't accept projectId directly
          // It uses useParams to get the projectId internally
          return <ScenePlanningHistoryPanel />;
        case 'projects':
          return <ProjectsPanel 
            projects={projects} 
            currentProjectId={projectId} 
          />;
        case 'templates':
          // Temporarily using ProjectsPanel for Templates tab
          // TODO: Create a dedicated TemplatesPanel component
          return <ProjectsPanel 
            projects={[]} 
            currentProjectId={projectId} 
          />;
        case 'scenes':
          // Temporarily using ProjectsPanel for Scenes tab
          // TODO: Create a dedicated ScenesPanel component
          return <ProjectsPanel 
            projects={[]} 
            currentProjectId={projectId} 
          />;
        default:
          return null;
      }
    }, [projectId, initialProps, projects]);

    // Render empty state if no panels are open
    if (openPanels.length === 0) {
      return (
        <div className="flex flex-col h-full w-full">
          {!isTimelineVisible ? (
            // If timeline is hidden, make drop zone fill the entire area
            <div className="w-full h-full flex-1">
              <DropZone isActive={isDraggingFromSidebar} onDrop={handleDropFromSidebar} />
            </div>
          ) : (
            // If timeline is visible, we have a panel group with just the timeline
            <PanelGroup direction="vertical" className="h-full">
              <Panel minSize={50} className="w-full">
                <DropZone isActive={isDraggingFromSidebar} onDrop={handleDropFromSidebar} />
              </Panel>
              <PanelResizeHandle className="h-[10px] bg-transparent hover:bg-blue-400 transition-colors cursor-row-resize" />
              <Panel minSize={10} maxSize={50} defaultSize={40} className="w-full">
                <div className="rounded-[15px] border border-gray-200 overflow-hidden h-full flex flex-col">
                  <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
                    <span className="font-medium text-sm">Timeline</span>
                    <button 
                      onClick={toggleTimeline} 
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-gray-100"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <TimelinePanel />
                  </div>
                </div>
              </Panel>
            </PanelGroup>
          )}
        </div>
      );
    }

    // Render with panels
    return (
      <div className="h-full w-full relative bg-white dark:bg-gray-900">
        <PanelGroup direction="vertical" className="h-full">
          <Panel minSize={50} className="w-full">
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
                      const panelType = e.dataTransfer.getData("text/plain") as PanelType;
                      if (PANEL_COMPONENTS[panelType]) {
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
                            <SortablePanel 
                              id={panel?.id || `panel-${idx}`}
                              onRemove={() => panel?.id ? removePanel(panel.id) : null}
                            >
                              {renderPanelContent(panel)}
                            </SortablePanel>
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
          </Panel>
          
          {/* Timeline panel with proper header and styling */}
          {isTimelineVisible && (
            <>
              <PanelResizeHandle className="h-[10px] bg-transparent hover:bg-blue-400 transition-colors cursor-row-resize" />
              <Panel minSize={10} maxSize={50} defaultSize={40} collapsible={true} className="w-full">
                <div className="rounded-[15px] border border-gray-200 overflow-hidden h-full flex flex-col">
                  <div className="flex items-center justify-between px-3 py-2 border-b bg-gray-50">
                    <span className="font-medium text-sm">Timeline</span>
                    <button 
                      onClick={toggleTimeline} 
                      className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-gray-100"
                      aria-label="Close timeline panel"
                    >
                      <XIcon className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="flex-1 min-h-0">
                    <TimelinePanel />
                  </div>
                </div>
              </Panel>
            </>
          )}
        </PanelGroup>
      </div>
    );
  }
);

// Set display name for React DevTools
WorkspaceContentArea.displayName = 'WorkspaceContentArea';

export default WorkspaceContentArea;
