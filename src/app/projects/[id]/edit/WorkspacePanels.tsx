// src/app/projects/[id]/edit/WorkspacePanels.tsx
import React, { useState, useCallback, useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { PanelGroup, Panel, PanelResizeHandle } from './PanelGroup';
import { DndContext, closestCenter, useSensor, useSensors, PointerSensor, DragOverlay, defaultDropAnimationSideEffects } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent, DragOverEvent, DropAnimation } from '@dnd-kit/core';
import { arrayMove, SortableContext, useSortable, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ChatPanel from './panels/ChatPanel';
import PreviewPanel from './panels/PreviewPanel';
import CodePanel from './panels/CodePanel';
import UploadsPanel from './panels/UploadsPanel';
import TimelinePanel from './panels/TimelinePanel';
import ProjectsPanel from './panels/ProjectsPanel';
import { XIcon } from 'lucide-react';
import type { InputProps } from '~/types/input-props';

// Panel definitions
const PANEL_COMPONENTS = {
  chat: ChatPanel,
  preview: PreviewPanel,
  code: CodePanel,
  uploads: UploadsPanel,
  projects: ProjectsPanel,
};

const PANEL_LABELS = {
  chat: 'Chat',
  preview: 'Preview',
  code: 'Code',
  uploads: 'Uploads',
  projects: 'Projects',
};

type PanelType = keyof typeof PANEL_COMPONENTS;

interface OpenPanel {
  id: string;
  type: PanelType;
}

interface WorkspacePanelsProps {
  projectId: string;
  initialProps: InputProps;
  onPanelDragStart?: (panelType: PanelType) => void;
  projects?: any[]; // Add projects as a prop
}

// Define the interface for the methods we want to expose to parent components
export interface WorkspacePanelsHandle {
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
  
  // Modified style to maintain visibility during dragging
  const mergedStyle = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1, // Show at reduced opacity instead of hiding
    zIndex: isDragging ? 10 : 1,
    background: 'white',
    boxShadow: isDragging ? '0 2px 8px rgba(0,0,0,0.12)' : undefined,
    height: '100%',
    display: 'flex',
    flexDirection: 'column' as const,
    ...style,
  };
  
  // Special case for Code panel - don't add the header with X
  const isCodePanel = id === 'Code';
  
  return (
    <div
      ref={setNodeRef}
      style={mergedStyle}
      className={`rounded-[15px] border border-gray-200 overflow-hidden ${className ?? ''}`}
    >
      {!isCodePanel && (
        <div 
          className="flex items-center justify-between px-3 py-2 border-b bg-gray-50 cursor-move"
          {...attributes}
          {...listeners}
        >
          <span className="font-medium text-sm">{id}</span>
          <button 
            onClick={onRemove} 
            className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-gray-100"
            aria-label={`Close ${id} panel`}
          >
            <XIcon className="h-4 w-4" />
          </button>
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
      type: 'code', 
      label: 'Code', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6"/>
          <polyline points="8 6 2 12 8 18"/>
        </svg>
      )
    },
    { 
      type: 'uploads', 
      label: 'Uploads', 
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="17 8 12 3 7 8"/>
          <line x1="12" y1="3" x2="12" y2="15"/>
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

// Simplified drop animation for smoother transitions
const dropAnimationConfig: DropAnimation = {
  sideEffects: defaultDropAnimationSideEffects({
    styles: {
      active: {
        opacity: '0.4',
      },
    },
  }),
  // Simpler keyframes without transform
  keyframes() {
    return [
      { opacity: 0.4 },
      { opacity: 1 }
    ];
  },
  easing: 'cubic-bezier(0.25, 1, 0.5, 1)',
  duration: 250,
};

// Use forwardRef to expose methods to parent components
const WorkspacePanels = forwardRef<WorkspacePanelsHandle, WorkspacePanelsProps>(
  ({ projectId, initialProps, projects = [] }, ref) => {
    // Initial open panels
    const [openPanels, setOpenPanels] = useState<OpenPanel[]>([
      { id: 'Projects', type: 'projects' },
      { id: 'Chat', type: 'chat' },
      { id: 'Preview', type: 'preview' },
    ]);

    // Add state for timeline visibility
    const [isTimelineVisible, setIsTimelineVisible] = useState(true);

    // Track dragging state from sidebar
    const [isDraggingFromSidebar, setIsDraggingFromSidebar] = useState(false);
    const [currentDraggedPanel, setCurrentDraggedPanel] = useState<string | null>(null);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [overId, setOverId] = useState<string | null>(null);

    // DnD-kit setup for panel reordering
    const sensors = useSensors(useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require a minimum of 8px drag before activating
      },
    }));

    // Handle dragging panels within workspace
    const handleDragStart = useCallback((event: DragStartEvent) => {
      setCurrentDraggedPanel(String(event.active.id));
      setActiveId(String(event.active.id));
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
      
      if (over && active.id !== over.id) {
        setOpenPanels((panels) => {
          const oldIndex = panels.findIndex((p) => p.id === active.id);
          const newIndex = panels.findIndex((p) => p.id === over.id);
          return arrayMove(panels, oldIndex, newIndex);
        });
      }
    }, []);

    // Handle sidebar panel dragging
    useEffect(() => {
      // Set up event listeners for global drag events to detect sidebar drags
      const handleDragEnter = (e: DragEvent) => {
        if (e.dataTransfer?.types.includes('text/plain')) {
          try {
            // Try to get the panel type, if it matches we know it's from our sidebar
            const panelType = e.dataTransfer.getData('text/plain');
            if (PANEL_COMPONENTS[panelType as PanelType]) {
              setIsDraggingFromSidebar(true);
            }
          } catch (error) {
            // In some browsers we can't access data during dragenter
            // Just set to true and we'll validate on drop
            setIsDraggingFromSidebar(true);
          }
        }
      };

      const handleDragLeave = (e: DragEvent) => {
        // Check if drag leaves the document
        if (!e.relatedTarget || (e.relatedTarget as Node).nodeName === 'HTML') {
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

    // Add panel by type
    const addPanel = useCallback((type: PanelType) => {
      setOpenPanels((panels) => {
        // Don't add duplicate panel types
        if (panels.some((p) => p.type === type)) return panels;
        
        // Create new panel with appropriate label as ID
        return [...panels, { id: PANEL_LABELS[type], type }];
      });
    }, []);

    // Toggle timeline visibility
    const toggleTimeline = useCallback(() => {
      setIsTimelineVisible(prev => !prev);
    }, []);

    // Expose methods to parent components via ref
    useImperativeHandle(ref, () => ({
      addPanel,
      toggleTimeline
    }), [addPanel, toggleTimeline]);

    // Handler for dropping from sidebar
    const handleDropFromSidebar = useCallback((panelType: PanelType) => {
      addPanel(panelType);
      setIsDraggingFromSidebar(false);
    }, [addPanel]);

    // Remove panel
    const removePanel = useCallback((id: string) => {
      setOpenPanels((panels) => panels.filter((p) => p.id !== id));
    }, []);

    // Generate panel content
    const renderPanelContent = useCallback((panel: OpenPanel) => {
      switch (panel.type) {
        case 'chat':
          return <ChatPanel projectId={projectId} />;
        case 'uploads':
          return <UploadsPanel projectId={projectId} />;
        case 'preview':
          return <PreviewPanel projectId={projectId} initial={initialProps} />;
        case 'code':
          return <CodePanel onClose={() => removePanel(panel.id)} />;
        case 'projects':
          return <ProjectsPanel projects={projects} currentProjectId={projectId} />;
        default:
          return null;
      }
    }, [projectId, initialProps, removePanel, projects]);

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
            // If timeline is visible, use PanelGroup but with drop zone filling the top portion
            <PanelGroup direction="vertical" className="w-full h-full flex-1 min-h-0">
              <Panel minSize={20} defaultSize={60} className="w-full">
                <DropZone isActive={isDraggingFromSidebar} onDrop={handleDropFromSidebar} />
              </Panel>
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
            </PanelGroup>
          )}
        </div>
      );
    }

    // Render the panels UI with updated timeline section
    return (
      <div className="flex flex-col h-full w-full">
        <PanelGroup direction="vertical" className="w-full h-full flex-1 min-h-0">
          <Panel minSize={20} defaultSize={80} className="w-full">
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
                <div 
                  className="h-full w-full flex relative"
                  onDragOver={(e) => {
                    if (isDraggingFromSidebar) {
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                    }
                  }}
                  onDrop={(e) => {
                    if (isDraggingFromSidebar) {
                      e.preventDefault();
                      const panelType = e.dataTransfer.getData("text/plain") as PanelType;
                      if (PANEL_COMPONENTS[panelType]) {
                        handleDropFromSidebar(panelType);
                      }
                    }
                  }}
                >
                  {openPanels.length === 1 ? (
                    // Single panel layout - full width
                    <div className="flex-1">
                      <SortablePanel 
                        id={openPanels[0]?.id || ''}
                        onRemove={() => {
                          if (openPanels[0]) {
                            removePanel(openPanels[0].id);
                          }
                        }}
                      >
                        {openPanels[0] ? renderPanelContent(openPanels[0]) : null}
                      </SortablePanel>
                    </div>
                  ) : (
                    // Multi-panel layout
                    <PanelGroup direction="horizontal" className="flex-1">
                      {openPanels.map((panel, idx) => (
                        <React.Fragment key={panel.id}>
                          <Panel 
                            minSize={10} 
                            defaultSize={100 / openPanels.length}
                            className="transition-all duration-300"
                            style={{
                              transformOrigin: 'center',
                              transition: 'all 250ms cubic-bezier(0.25, 1, 0.5, 1)'
                            }}
                          >
                            <SortablePanel 
                              id={panel.id}
                              onRemove={() => removePanel(panel.id)}
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
                      <div className="bg-white p-3 rounded-lg shadow-lg">
                        <span className="text-blue-600 font-medium">Drop to add new panel</span>
                      </div>
                    </div>
                  )}
                </div>
              </SortableContext>
              
              {/* Show drag overlay when dragging a panel */}
              <DragOverlay dropAnimation={dropAnimationConfig} modifiers={[]}>
                {currentDraggedPanel ? (
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
WorkspacePanels.displayName = 'WorkspacePanels';

export default WorkspacePanels; 