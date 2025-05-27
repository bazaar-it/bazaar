"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useLocalStorage } from "~/hooks/useLocalStorage";
import { NewProjectButton } from "~/components/client/NewProjectButton";
import { api } from "~/trpc/react";
import type { PanelTypeG } from "./WorkspaceContentAreaG";
import { Button } from "~/components/ui/button";
import {
  TooltipProvider,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "~/components/ui/tooltip";
import {
  MessageSquareIcon,
  PlayIcon,
  Code2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  ListIcon,
  FolderIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from "~/components/ui/icons";

type Project = {
  id: string;
  name: string;
};

interface GenerateSidebarProps {
  projects: Project[];
  currentProjectId: string;
  onAddPanel?: (panelType: PanelTypeG) => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface WorkspacePanelG {
  type: PanelTypeG;
  id: string;
  name: string;
  icon: any;
  href: string;
}

// Workspace panels for BAZAAR-304: Chat, Preview, Code (Storyboard commented out)
const navItems: WorkspacePanelG[] = [
  {
    type: "chat",
    id: "chat",
    name: "Chat",
    icon: MessageSquareIcon,
    href: "#chat",
  },
  {
    type: "preview",
    id: "preview",
    name: "Preview",
    icon: PlayIcon,
    href: "#preview",
  },
  // { type: 'storyboard', id: 'storyboard', name: "Storyboard", icon: ListIcon, href: "#storyboard" },
  { type: "code", id: "code", name: "Code", icon: Code2Icon, href: "#code" },
];

export function GenerateSidebar({
  projects,
  currentProjectId,
  onAddPanel,
  isCollapsed = false,
  onToggleCollapse,
}: GenerateSidebarProps) {
  const router = useRouter();
  const [isDragging, setIsDragging] = useState(false);
  const [projectsExpanded, setProjectsExpanded] = useLocalStorage(
    "bazaar-projects-expanded",
    false, // Default to collapsed
  );

  // Setup mutation for creating a new project (for collapsed button)
  const utils = api.useUtils();
  const createProject = api.project.create.useMutation({
    onSuccess: async (data) => {
      try {
        // Invalidate the projects list query to refetch it
        await utils.project.list.invalidate();

        // Redirect to the generate page for the new project
        router.push(`/projects/${data.projectId}/generate`);
      } catch (error) {
        console.error("Error after project creation:", error);
      }
    },
    onError: (error) => {
      console.error("Failed to create project:", error);
    },
  });

  const handleCreateProject = () => {
    if (createProject.isPending) return;
    createProject.mutate();
  };

  // Toggle the sidebar collapsed state
  const toggleCollapse = useCallback(() => {
    if (onToggleCollapse) {
      onToggleCollapse();
    }
  }, [onToggleCollapse]);

  // Calculate sidebar width based on collapsed state
  const sidebarWidth = useMemo(() => {
    return isCollapsed ? "3rem" : "10rem";
  }, [isCollapsed]);

  // Handle dragging panel icons from sidebar
  const handleDragStart = (e: React.DragEvent, panelType: PanelTypeG) => {
    e.dataTransfer.setData("text/plain", panelType);
    e.dataTransfer.effectAllowed = "copy";
    setIsDragging(true);

    // Create a drag preview
    const dragPreview = document.createElement("div");
    dragPreview.className =
      "bg-white shadow-lg rounded-lg p-3 border border-gray-300";
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
        className={`flex h-full flex-col rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200 ease-linear dark:border-gray-800 dark:bg-gray-900 ${isCollapsed ? "items-center" : "items-start"}`}
        style={{
          width: sidebarWidth,
          maxWidth: isCollapsed ? "3rem" : "10rem",
          minWidth: isCollapsed ? "3rem" : "10rem",
          paddingTop: "25px",
          paddingLeft: "10px",
          paddingRight: isCollapsed ? "10px" : "20px",
        }}
      >
        {/* Collapse/Expand button */}
        <button
          className="absolute top-2 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700"
          onClick={toggleCollapse}
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRightIcon className="h-3 w-3 text-gray-700 dark:text-gray-300" />
          ) : (
            <ChevronLeftIcon className="h-3 w-3 text-gray-700 dark:text-gray-300" />
          )}
        </button>

        {/* New Project Button */}
        <div className={`w-full ${isCollapsed ? "flex justify-center" : ""}`}>
          {isCollapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-transparent transition-all duration-200 hover:bg-gray-100 dark:hover:bg-gray-800"
                  onClick={() => {
                    // Create project and redirect to /generate
                    const createProject = async () => {
                      try {
                        const response = await fetch(
                          "/api/trpc/project.create",
                          {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({}),
                          },
                        );
                        const data = await response.json();
                        if (data.result?.data?.projectId) {
                          router.push(
                            `/projects/${data.result.data.projectId}/generate`,
                          );
                        }
                      } catch (error) {
                        console.error("Failed to create project:", error);
                      }
                    };
                    createProject();
                  }}
                >
                  <PlusIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">New Project</TooltipContent>
            </Tooltip>
          ) : (
            <NewProjectButton
              className="h-9 w-full justify-start rounded-lg bg-transparent pr-4 text-sm font-normal text-gray-700 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
              variant="ghost"
              size="default"
              showIcon={true}
            />
          )}
        </div>

        {/* Panel Navigation - Chat, Preview, Storyboard, Code */}
        <nav
          className={`mt-3 flex w-full flex-col gap-3 ${isCollapsed ? "items-center" : ""}`}
        >
          {navItems.map((item) => (
            <Tooltip key={item.id}>
              <TooltipTrigger asChild>
                <div
                  className={`flex ${isCollapsed ? "w-full justify-center" : "w-full"}`}
                >
                  {isCollapsed ? (
                    <Button
                      variant="ghost"
                      className="flex h-9 w-9 items-center justify-center rounded-lg bg-transparent text-gray-700 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                      onClick={() => handlePanelClick(item.type)}
                      data-panel-type={item.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.type)}
                      onDragEnd={handleDragEnd}
                    >
                      <item.icon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                    </Button>
                  ) : (
                    <Button
                      variant="ghost"
                      className="flex h-9 w-full items-center justify-start rounded-lg bg-transparent pr-4 text-gray-700 transition-all duration-200 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-gray-100"
                      onClick={() => handlePanelClick(item.type)}
                      data-panel-type={item.type}
                      draggable
                      onDragStart={(e) => handleDragStart(e, item.type)}
                      onDragEnd={handleDragEnd}
                    >
                      <item.icon className="mr-3 h-5 w-5 text-gray-500 dark:text-gray-400" />
                      <span className="text-sm font-normal">{item.name}</span>
                    </Button>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className={!isCollapsed ? "hidden" : ""}
              >
                {item.name}
              </TooltipContent>
            </Tooltip>
          ))}
        </nav>

        {/* Previous Projects Toggle */}
        <div className="mt-4 mb-2 w-full">
          <div
            className={`flex items-center justify-between ${isCollapsed ? "mx-auto justify-center" : "px-2"} cursor-pointer rounded-lg py-1 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800`}
            onClick={() => setProjectsExpanded(!projectsExpanded)}
          >
            <span
              className={`text-xs font-medium tracking-wide text-gray-500 uppercase ${isCollapsed ? "sr-only" : ""}`}
            >
              Projects
            </span>
            {!isCollapsed &&
              (projectsExpanded ? (
                <ChevronUpIcon className="h-4 w-4 text-gray-400" />
              ) : (
                <ChevronDownIcon className="h-4 w-4 text-gray-400" />
              ))}
          </div>
        </div>

        {projectsExpanded && (
          <nav
            className={`${isCollapsed ? "px-0" : "px-2"} max-h-[30vh] w-full space-y-1 overflow-y-auto py-1`}
          >
            {projects.map((project) => (
              <Tooltip key={project.id}>
                <TooltipTrigger asChild>
                  <Link
                    href={`/projects/${project.id}/generate`}
                    className={`flex items-center gap-2 rounded-lg px-2 py-1 text-sm whitespace-nowrap transition-colors ${
                      project.id === currentProjectId
                        ? "cursor-default bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
                        : "text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                    } ${isCollapsed ? "mx-auto h-8 w-8 justify-center" : "w-full"}`}
                    onClick={(e) => {
                      if (project.id === currentProjectId) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <FolderIcon className="h-4 w-4 shrink-0" />
                    {!isCollapsed && (
                      <span className="truncate" style={{ maxWidth: 160 }}>
                        {project.name}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                {isCollapsed && (
                  <TooltipContent side="right">{project.name}</TooltipContent>
                )}
              </Tooltip>
            ))}
          </nav>
        )}

        {/* Separator */}
        <div className="flex-grow"></div>
      </aside>
    </TooltipProvider>
  );
}
