"use client";

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from "next/navigation";
import { NewProjectButton } from "~/components/client/NewProjectButton";
import { api } from "~/trpc/react";
import type { PanelTypeG } from './WorkspaceContentAreaG';
import { Button } from "~/components/ui/button";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import SidebarFeedbackButton from "~/components/ui/SidebarFeedbackButton";
import { 
  MessageSquareIcon, 
  PlayIcon, 
  Code2Icon, 
  PlusIcon,
  FolderIcon,
  LayoutTemplateIcon,
  Music,
} from "lucide-react";


interface GenerateSidebarProps {
  onAddPanel?: (panelType: PanelTypeG) => void;
}

interface WorkspacePanelG {
  type: PanelTypeG;
  id: string;
  name: string;
  icon: any;
  href: string;
  tooltip: string;
}

interface PanelOption {
  type: PanelTypeG;
  label: string;
  description: string;
  icon: React.ReactNode;
  badge?: string;
  color: string;
}

// Workspace panels in vertical order: Projects, Chat, Video, Audio, Code, Templates
const navItems: WorkspacePanelG[] = [
  { type: 'myprojects', id: 'myprojects', name: "Projects", icon: FolderIcon, href: "#myprojects", tooltip: "My Projects" },
  { type: 'chat', id: 'chat', name: "Chat", icon: MessageSquareIcon, href: "#chat", tooltip: "Chat Panel" },
  { type: 'preview', id: 'preview', name: "Video", icon: PlayIcon, href: "#preview", tooltip: "Video Panel" },
  { type: 'audio', id: 'audio', name: "Audio", icon: Music, href: "#audio", tooltip: "Audio Panel" },
  { type: 'code', id: 'code', name: "Code", icon: Code2Icon, href: "#code", tooltip: "Code Panel" },
  { type: 'templates', id: 'templates', name: "Templates", icon: LayoutTemplateIcon, href: "#templates", tooltip: "Templates Panel" },
];


export function GenerateSidebar({ 
  onAddPanel
}: GenerateSidebarProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  
  // Handle dragging panel icons from sidebar
  const handleDragStart = (e: React.DragEvent, panelType: PanelTypeG) => {
    e.dataTransfer.setData("text/plain", panelType);
    e.dataTransfer.effectAllowed = "copy";
    setIsDragging(true);
    
    // Create a drag preview
    const dragPreview = document.createElement("div");
    dragPreview.className = "bg-white shadow-lg rounded-lg p-3 border border-gray-300";
    dragPreview.innerHTML = `<span>${panelType} Panel</span>`;
    dragPreview.style.position = "absolute";
    dragPreview.style.top = "-1000px";
    document.body.appendChild(dragPreview);
    
    // Use the custom drag preview if supported
    try {
      e.dataTransfer.setDragImage(dragPreview, 50, 25);
    } catch (error) {
      console.warn("Custom drag preview not supported", error);
    }
    
    // Clean up the drag preview element after a short delay
    setTimeout(() => {
      document.body.removeChild(dragPreview);
    }, 100);
  };
  
  const handleDragEnd = () => {
    setIsDragging(false);
  };
  
  // Handle clicking on panel icons in sidebar
  const handlePanelClick = (panelType: PanelTypeG) => {
    if (onAddPanel) {
      onAddPanel(panelType);
    }
  };



  return (
    <TooltipProvider>
      <aside 
        className="flex flex-col h-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 shadow-sm rounded-lg items-center"
        style={{ 
          width: '4rem',
          maxWidth: '4rem',
          minWidth: '4rem',
          paddingTop: '10px',
          paddingLeft: '0px',
          paddingRight: '0px'
        }}    
      >
        {/* New Project Button */}
        <div className="w-full flex flex-col items-center mb-1">
          <div 
            className="flex flex-col items-center group cursor-pointer gap-1"
            onMouseEnter={() => {
              // Trigger format dropdown when hovering over the entire highlighted area
              const container = document.querySelector('[data-new-project-container]');
              if (container) {
                container.dispatchEvent(new MouseEvent('mouseenter', { bubbles: true }));
              }
            }}
            onMouseLeave={() => {
              // Handle mouse leave for the entire highlighted area
              const container = document.querySelector('[data-new-project-container]');
              if (container) {
                container.dispatchEvent(new MouseEvent('mouseleave', { bubbles: true }));
              }
            }}
          >
            <div 
              className="h-10 w-10 rounded-lg flex items-center justify-center bg-transparent group-hover:bg-gray-100 dark:group-hover:bg-gray-800 transition-all duration-200"
              data-new-project-container
            >
              <NewProjectButton 
                variant="ghost"
                size="icon"
                enableQuickCreate={true}
                className="p-0 h-full w-full bg-transparent"
              >
                <PlusIcon className="h-6 w-6 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors stroke-2" />
              </NewProjectButton>
            </div>
            <span className="text-[10px] text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 font-light leading-tight transition-colors">New</span>
          </div>
        </div>

        {/* Panel Navigation */}
        <nav 
          className="flex flex-col w-full gap-4"
          onMouseEnter={() => {
            // Close any open format dropdowns when hovering over navigation items
            document.dispatchEvent(new CustomEvent('closeFormatDropdown'));
          }}
        >
          {navItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <div className="flex flex-col items-center group cursor-pointer gap-1">
                  <div 
                    className="h-10 w-10 rounded-lg flex items-center justify-center transition-all duration-200 
                      bg-transparent group-hover:bg-gray-100 dark:group-hover:bg-gray-800 
                      text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 cursor-pointer"
                    onClick={() => handlePanelClick(item.type)}
                    data-panel-type={item.type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, item.type)}
                    onDragEnd={handleDragEnd}
                  >
                    <item.icon className="h-5 w-5 text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-gray-100 transition-colors stroke-[1.5]" />
                  </div>
                  <span className="text-[10px] text-gray-500 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-300 font-light leading-tight transition-colors">{item.name}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">
                {item.tooltip}
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>

        {/* Separator */}
        <div 
          className="flex-grow"
          onMouseEnter={() => {
            // Close format dropdown when hovering over the separator area
            document.dispatchEvent(new CustomEvent('closeFormatDropdown'));
          }}
        ></div>

        {/* Feedback Button - aligned to bottom */}
        <div 
          className="w-full flex justify-center"
          onMouseEnter={() => {
            // Close format dropdown when hovering over the feedback button area
            document.dispatchEvent(new CustomEvent('closeFormatDropdown'));
          }}
        >
          <SidebarFeedbackButton isCollapsed={true} />
        </div>

      </aside>
    </TooltipProvider>
  );
} 