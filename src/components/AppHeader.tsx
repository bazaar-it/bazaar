"use client";
// src/components/AppHeader.tsx
import Image from "next/image";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { PlayIcon, Share2Icon, LogOutIcon, CheckIcon, XIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

// Function to generate a consistent color based on the user's name
function stringToColor(string: string) {
  let hash = 0;
  for (let i = 0; i < string.length; i++) {
    hash = string.charCodeAt(i) + ((hash << 5) - hash);
  }
  let color = '#';
  for (let i = 0; i < 3; i++) {
    const value = (hash >> (i * 8)) & 0xFF;
    color += ('00' + value.toString(16)).slice(-2);
  }
  return color;
}

// Avatar component that displays the first letter of the user's name
function UserAvatar({ name }: { name: string }) {
  const firstLetter = name.charAt(0).toUpperCase();
  const color = stringToColor(name);
  
  return (
    <div 
      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-semibold cursor-pointer hover:ring-2 hover:ring-gray-200 transition-all"
      style={{ backgroundColor: color }}
    >
      {firstLetter}
    </div>
  );
}

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
  
  // Handle user logout
  const handleLogout = async () => {
    await signOut({ redirect: true, callbackUrl: '/' });
  };

  return (
    <header className="h-14 border-b bg-background flex items-center justify-between px-4 z-10 w-full">
      {/* Left: Logo with improved sizing */}
      <div className="flex items-center min-w-[160px]">
        <a href="/" className="flex items-center gap-2" aria-label="Go to homepage">
          <Image src="/BazaarLogo.svg" alt="Bazaar" width={79} height={30} className="object-contain" priority />
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

      {/* Right: User info with avatar dropdown & render button */}
      <div className="flex items-center gap-4 min-w-[180px] justify-end">
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="outline-none">
                <UserAvatar name={user.name || user.email || 'U'} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{user.name}</p>
                {user.email && (
                  <p className="text-xs text-muted-foreground mt-0.5">{user.email}</p>
                )}
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={handleLogout}
                className="text-red-600 cursor-pointer"
              >
                <LogOutIcon className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
        </div>
      </div>
    </header>
  );
}
