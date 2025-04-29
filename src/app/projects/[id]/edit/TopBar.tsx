"use client";

import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import { PlayIcon, MoreVerticalIcon, Share2Icon, SaveIcon, Settings2Icon } from "lucide-react";

interface TopBarProps {
  projectTitle: string;
  onRender?: () => void;
  onRename?: (newName: string) => void;
  isRenaming?: boolean;
  isRendering?: boolean;
}

export default function TopBar({ 
  projectTitle, 
  onRender, 
  onRename, 
  isRenaming: isRenamingProp = false, 
  isRendering = false 
}: TopBarProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newTitle, setNewTitle] = useState(projectTitle);

  const handleRename = () => {
    if (onRename && newTitle.trim()) {
      onRename(newTitle);
    }
    setIsEditingName(false);
  };

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 z-10">
      <div className="flex items-center gap-8 ml-14">
        {/* Title or rename input */}
        {isEditingName ? (
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleRename();
            }}
            className="flex gap-2"
          >
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-[240px] h-8"
              autoFocus
              disabled={isRenamingProp}
            />
            <Button 
              type="submit" 
              size="sm" 
              variant="outline"
              disabled={isRenamingProp}
            >
              Save
            </Button>
            <Button 
              type="button" 
              size="sm" 
              variant="ghost" 
              onClick={() => {
                setNewTitle(projectTitle);
                setIsEditingName(false);
              }}
              disabled={isRenamingProp}
            >
              Cancel
            </Button>
          </form>
        ) : (
          <h1 
            className="text-lg font-medium cursor-pointer hover:text-primary"
            onClick={() => setIsEditingName(true)}
          >
            {projectTitle}
          </h1>
        )}
      </div>

      {/* Action buttons */}
       <div className="flex items-center gap-2">
        {/* <Button 
          variant="default" 
          size="sm" 
          className="gap-2"
          onClick={onRender}
          disabled={isRendering}
        >
          <PlayIcon className="h-4 w-4" />
          {isRendering ? "Rendering..." : "Render"}
        </Button>

        <Button variant="outline" size="icon" className="h-8 w-8">
          <Share2Icon className="h-4 w-4" />
        </Button> */}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVerticalIcon className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setIsEditingName(true)}>
              Rename Project
            </DropdownMenuItem>
            <DropdownMenuItem>
              Duplicate Project
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive">
              Delete Project
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
} 