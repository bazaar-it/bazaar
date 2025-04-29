// src/app/projects/[id]/edit/Sidebar.tsx
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NewProjectButton } from "~/components/client/NewProjectButton";
import { Button } from "~/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
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
      <nav className="flex-1 overflow-y-auto px-1 py-2 space-y-1">
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