// src/app/projects/[id]/edit/Sidebar.tsx
"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NewProjectButton } from "~/components/client/NewProjectButton";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import type { Operation } from "fast-json-patch";
import {
  MenuIcon,
  FolderIcon,
  MessageSquareIcon,
  UploadIcon,
  ClockIcon,
  PlayIcon,
  Code2Icon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  ListIcon
} from "lucide-react";
import { cn } from "~/lib/utils";
import { api } from "~/trpc/react";
import { CustomComponentStatus } from "~/components/CustomComponentStatus";
import { useVideoState } from "~/stores/videoState";

type Project = {
  id: string;
  name: string;
};

interface SidebarProps {
  projects: Project[];
  currentProjectId: string;
}

const navItems = [
  { label: "Projects", icon: FolderIcon, href: "/projects" },
  { label: "Chat", icon: MessageSquareIcon, href: "#chat" },
  { label: "Uploads", icon: UploadIcon, href: "#uploads" },
  { label: "Timeline", icon: ClockIcon, href: "#timeline" },
  { label: "Preview", icon: PlayIcon, href: "#preview" },
  { label: "Code", icon: Code2Icon, href: "#code" },
];

function CustomComponentsSidebar({ collapsed, projectId }: { collapsed: boolean, projectId: string }) {
  const { data, isLoading } = api.customComponent.listAllForUser.useQuery();
  const router = useRouter();
  const { applyPatch: applyVideoPatch, getCurrentProps } = useVideoState();
  
  // Insert component handler
  const handleInsertComponent = useCallback((job: any) => {
    if (job.status !== 'success' || !job.outputUrl) {
      alert("Component not ready. It's still being generated or has errored.");
      return;
    }
    
    // Get current video properties
    const currentProps = getCurrentProps();
    if (!currentProps) {
      alert("Error: Cannot access current video properties.");
      return;
    }
    
    // Generate UUID for the new scene
    const newSceneId = crypto.randomUUID();
    
    // Create new scene at the end of the timeline
    const insertPosition = currentProps.meta.duration;
    
    // Create a JSON patch to add the component as a new scene
    const patch: Operation[] = [
      {
        // Add new scene to the scenes array
        op: "add" as const,
        path: `/scenes/-`,
        value: {
          id: newSceneId,
          type: "custom" as const, 
          start: insertPosition,
          duration: 60, // Default 2 second duration (60 frames at 30fps)
          data: {
            componentId: job.id,
            name: job.effect
          }
        }
      },
      {
        // Update the total duration if needed
        op: "replace" as const,
        path: "/meta/duration",
        value: Math.max(currentProps.meta.duration, insertPosition + 60)
      }
    ];
    
    // Apply patch to update the UI immediately
    applyVideoPatch(projectId, patch);
    
    // Save to database using the existing API
    alert(`Added "${job.effect}" to your timeline! You should see it in the preview now.`);
    
    // Optional: Navigate to preview tab if desired
    // router.push(`/projects/${projectId}/edit#preview`);
  }, [projectId, applyVideoPatch, getCurrentProps]);

  if (isLoading) {
    return <div className={cn("text-xs text-muted-foreground px-2", collapsed && "text-center px-0")}>Loading...</div>;
  }
  if (!data || data.length === 0) {
    return <div className={cn("text-xs text-muted-foreground px-2", collapsed && "text-center px-0")}>No custom components yet</div>;
  }

  return (
    <ul className={cn("flex flex-col gap-1", collapsed && "items-center")}>
      {data.map((job) => (
        <li 
          key={job.id} 
          className={cn(
            "flex items-center gap-2 px-2 py-1 rounded", 
            collapsed && "justify-center px-0",
            job.status === 'success' ? "hover:bg-primary/10 cursor-pointer" : "hover:bg-muted"
          )}
          title={job.effect}
          onClick={() => job.status === 'success' && handleInsertComponent(job)}
        >
          <Code2Icon className="h-4 w-4 text-blue-500 shrink-0" />
          {!collapsed && (
            <span className="truncate flex-1 text-xs" style={{ maxWidth: 120 }}>
              {job.effect}
            </span>
          )}
          <CustomComponentStatus 
            componentId={job.id} 
            onSuccess={(url) => console.log(`Component ready: ${url}`)} 
          />
        </li>
      ))}
    </ul>
  );
}

export default function Sidebar({ projects, currentProjectId }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();

  return (
    <aside
      className={`transition-all duration-200 h-full bg-background border-r flex flex-col items-stretch ${collapsed ? 'w-16' : 'w-64'}`}
      style={{ minWidth: collapsed ? 64 : 256 }}
    >
      {/* Toggle button */}
      <div className="flex items-center justify-between h-14 px-2 border-b">
        {!collapsed ? (
          <span className="font-bold text-lg pl-2">Projects</span>
        ) : null}
        <Button
          variant="ghost"
          size="icon"
          className="ml-auto"
          onClick={() => setCollapsed(c => !c)}
        >
          {collapsed ? <ChevronRightIcon className="h-5 w-5" /> : <ChevronLeftIcon className="h-5 w-5" />}
        </Button>
      </div>

      {/* New Project Button */}
      <div className={collapsed ? 'flex justify-center items-center p-2' : 'px-3 py-2'}>
        <Tooltip>
          <TooltipTrigger asChild>
            <NewProjectButton
              variant={collapsed ? 'ghost' : 'outline'}
              size={collapsed ? 'icon' : 'sm'}
              className={collapsed ? 'w-10 h-10 p-0' : 'w-full min-w-[140px] justify-start'}
              showIcon={true}
              onStart={() => {}}
            />
          </TooltipTrigger>
          {collapsed && <TooltipContent>New Project</TooltipContent>}
        </Tooltip>
      </div>

      {/* Project List */}
      <nav className="overflow-y-auto px-1 py-2 space-y-1">
        {projects.map((project) => (
          <Tooltip key={project.id}>
            <TooltipTrigger asChild>
              <Link
                href={`/projects/${project.id}/edit`}
                className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                  project.id === currentProjectId
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted text-foreground"
                } ${collapsed ? 'justify-center' : ''}`}
              >
                <ListIcon className="h-5 w-5 shrink-0" />
                <span
                  className={cn(
                    "truncate transition-all duration-200 ml-2",
                    collapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                  )}
                  style={{ display: "inline-block", minWidth: 0, maxWidth: collapsed ? 0 : 160 }}
                >
                  {project.name}
                </span>
              </Link>
            </TooltipTrigger>
            {collapsed && <TooltipContent>{project.name}</TooltipContent>}
          </Tooltip>
        ))}
      </nav>

      {/* Custom Components Section */}
      <div className="px-1 py-2 border-t">
        <div className={cn("font-semibold text-xs uppercase tracking-wide px-2 mb-1", collapsed && "text-center px-0")}>Custom Components</div>
        <CustomComponentsSidebar collapsed={collapsed} projectId={currentProjectId} />
      </div>

      {/* All Projects link at bottom */}
      <div className="mt-auto border-t p-2 flex flex-col gap-2">
        <Tooltip>
  <TooltipTrigger asChild>
    <Link
      href="/projects"
      className={`flex items-center gap-2 rounded-md px-2 py-2 text-sm font-medium hover:bg-muted transition-colors ${collapsed ? 'justify-center' : ''}`}
    >
      <FolderIcon className="h-5 w-5 shrink-0" />
      {!collapsed && <span>All Projects</span>}
    </Link>
  </TooltipTrigger>
  {collapsed && <TooltipContent>All Projects</TooltipContent>}
</Tooltip>
      </div>
    </aside>
  );
}