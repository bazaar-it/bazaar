"use client";
// src/components/AppHeader.tsx
import Image from "next/image";
import { useState } from "react";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { DownloadIcon, LogOutIcon, CheckIcon, XIcon, ShareIcon } from "lucide-react";
import { signOut } from "next-auth/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { ShareDialog } from "~/components/ShareDialog";

// Function to generate a consistent color based on the user's name
function stringToColor(string: string) {
  let hash = 0;
  for (let i = 0; i <string.length; i++) {
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
      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-semibold cursor-pointer hover:ring-2 hover:ring-gray-200/60 transition-all shadow-sm"
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
  projectId?: string;
}

export default function AppHeader({
  projectTitle,
  onRename,
  isRenaming = false,
  onRender,
  isRendering = false,
  user,
  projectId,
}: AppHeaderProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [newTitle, setNewTitle] = useState(projectTitle || "");
  const [showShareDialog, setShowShareDialog] = useState(false);

  const handleRenameClick = () => {
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
    <header className="flex items-center justify-between px-6 py-3 w-full bg-background z-10" style={{ height: 68 }}>
      {/* Left: Logo only */}
      <div className="flex items-center min-w-[64px]">
        <a href="/" className="flex items-center" aria-label="Go to homepage">
          <Image src="/bazaar-logo.png" alt="Bazaar" width={79} height={30} className="object-contain" priority />
        </a>
      </div>

      {/* Center: Project Title - Hidden as requested */}
      <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center">
        {projectTitle ? (
          <div className="relative w-[280px] flex justify-center">
            {isEditingName ? (
              <div className="flex items-center w-full">
                <Input
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  className="w-[240px] h-8 text-sm font-medium rounded-[15px] shadow-sm"
                  autoFocus
                  disabled={isRenaming}
                />
                <div className="flex items-center ml-2">
                  <Button 
                    type="button" 
                    size="icon" 
                    variant="default" 
                    className="w-6 h-6 bg-green-500 hover:bg-green-600 mr-1 rounded-[8px] shadow-sm"
                    onClick={handleRenameClick} 
                    disabled={isRenaming}
                  >
                    <CheckIcon className="h-3 w-3 text-white" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="w-6 h-6 rounded-[8px] shadow-sm"
                    onClick={() => {
                      setNewTitle(projectTitle || "");
                      setIsEditingName(false);
                    }}
                    disabled={isRenaming}
                  >
                    <XIcon className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <h1
                className="text-sm font-medium cursor-pointer hover:text-primary px-2 text-center"
                onClick={() => {
                  setNewTitle(projectTitle);
                  setIsEditingName(true);
                }}
              >
                {projectTitle}
              </h1>
            )}
          </div>
        ) : null}
      </div>

      {/* Right: User info & Export button only */}
      <div className="flex items-center gap-4 min-w-[180px] justify-end">
        {/* Share button */}
        {projectId && (
          <Button
            variant="outline"
            size="sm"
            className="gap-2 rounded-[15px] shadow-sm border-blue-200 text-blue-600 hover:bg-blue-50"
            onClick={() => setShowShareDialog(true)}
          >
            <ShareIcon className="h-4 w-4" />
            Share
          </Button>
        )}
        
        {/* Export button temporarily disabled until export feature is ready */}
        {/*
        <Button
          variant="default"
          size="sm"
          className="gap-2 rounded-[15px] shadow-sm"
          onClick={onRender}
          disabled={isRendering}
        >
          <DownloadIcon className="h-4 w-4" />
          {isRendering ? "Exporting..." : "Export"}
        </Button>
        */}
        
        {user && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div className="outline-none">
                <UserAvatar name={user.name || user.email || 'U'} />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 rounded-[15px] shadow-sm border-gray-100 overflow-hidden">
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
        
        {/* Share Dialog */}
        {projectId && (
          <ShareDialog
            projectId={projectId}
            projectTitle={projectTitle}
            open={showShareDialog}
            onOpenChange={setShowShareDialog}
          />
        )}
      </div>
    </header>
  );
}
