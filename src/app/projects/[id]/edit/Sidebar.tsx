// src/app/projects/[id]/edit/Sidebar.tsx
"use client";

import { useState } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger 
} from "~/components/ui/sheet";
import { Button } from "~/components/ui/button";
import { MenuIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { NewProjectButton } from "~/components/client/NewProjectButton";

type Project = {
  id: string;
  name: string;
};

interface SidebarProps {
  projects: Project[];
  currentProjectId: string;
  onClose?: () => void;
}

export default function Sidebar({ projects, currentProjectId }: SidebarProps) {
  const [open, setOpen] = useState(false);
  const router = useRouter();

  const handleCreateStart = () => {
    // Close the sidebar when project creation starts
    setOpen(false);
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="fixed top-4 left-4 z-50 bg-background/80 backdrop-blur-sm"
        >
          <MenuIcon className="h-5 w-5" />
          <span className="sr-only">Toggle sidebar</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="left" className="w-72 p-0 border-r" onPointerDownOutside={() => setOpen(false)}>
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="text-lg font-medium">Projects</SheetTitle>
        </SheetHeader>

        <nav className="px-2 py-4">
          <div className="mb-4 px-3">
            <NewProjectButton 
              variant="outline" 
              size="sm" 
              className="w-full justify-start" 
              showIcon={true}
              onStart={handleCreateStart}
            />
          </div>

          <div className="space-y-1">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}/edit`}
                className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  project.id === currentProjectId
                    ? "bg-primary/10 text-primary"
                    : "hover:bg-muted"
                }`}
                onClick={() => setOpen(false)}
              >
                {project.name}
              </Link>
            ))}
          </div>

          <div className="mt-8 border-t pt-4 px-3">
            <Link
              href="/projects"
              className="flex items-center rounded-md text-sm px-3 py-2 hover:bg-muted"
              onClick={() => setOpen(false)}
            >
              All Projects
            </Link>
          </div>
        </nav>
      </SheetContent>
    </Sheet>
  );
}