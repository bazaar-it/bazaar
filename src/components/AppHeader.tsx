"use client";
import Image from "next/image";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { PlayIcon, Share2Icon, SaveIcon, Settings2Icon } from "lucide-react";

interface AppHeaderProps {
  projectTitle?: string;
  onRename?: (newName: string) => void;
  isRenaming?: boolean;
  onRender?: () => void;
  isRendering?: boolean;
  user?: { name: string; email?: string };
}

export default function AppHeader({
  projectTitle,
  onRename,
  isRenaming = false,
  onRender,
  isRendering = false,
  user,
}: AppHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newTitle, setNewTitle] = useState(projectTitle || "");

  const handleRename = () => {
    if (onRename && newTitle.trim()) {
      onRename(newTitle);
    }
    setIsEditingName(false);
  };

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 z-10 w-full">
      {/* Left: Logo */}
      <div className="flex items-center gap-3 min-w-[160px]">
        <a href="/" className="flex items-center gap-3 min-w-[160px]" aria-label="Go to homepage">
          <Image src="/bazaar-logo.png" alt="Bazaar Logo" width={32} height={32} className="rounded" />
          <span className="text-lg font-bold tracking-tight hidden sm:inline">Bazaar‑Vid</span>
        </a>
      </div>

      {/* Center: Project Title (with rename) */}
      <div className="flex-1 flex justify-center items-center">
        {projectTitle ? (
          isEditingName ? (
            <form
              onSubmit={e => {
                e.preventDefault();
                handleRename();
              }}
              className="flex gap-2"
            >
              <Input
                value={newTitle}
                onChange={e => setNewTitle(e.target.value)}
                className="w-[240px] h-8"
                autoFocus
                disabled={isRenaming}
              />
              <Button type="submit" size="sm" variant="outline" disabled={isRenaming}>
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
                disabled={isRenaming}
              >
                Cancel
              </Button>
            </form>
          ) : (
            <h1
              className="text-lg font-medium cursor-pointer hover:text-primary px-2"
              onClick={() => setIsEditingName(true)}
            >
              {projectTitle}
            </h1>
          )
        ) : null}
      </div>

      {/* Right: User info & actions */}
      <div className="flex items-center gap-4 min-w-[220px] justify-end">
        {user && (
          <span className="text-sm text-muted-foreground">
            Logged in as <span className="font-medium text-foreground">{user.name}</span>
          </span>
        )}
        <div className="flex items-center gap-2">
          <Button
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
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8">
            <Settings2Icon className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
