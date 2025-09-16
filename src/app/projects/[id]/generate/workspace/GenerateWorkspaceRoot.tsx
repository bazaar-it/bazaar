// src/app/projects/[id]/generate/workspace/GenerateWorkspaceRoot.tsx

'use client';

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useSession } from "next-auth/react";
import { useVideoState } from '~/stores/videoState';
import { api } from "~/trpc/react";
import AppHeader from "~/components/AppHeader";
import type { InputProps } from '~/lib/types/video/input-props';
import { GenerateSidebar } from "./GenerateSidebar";
import WorkspaceContentAreaG from './WorkspaceContentAreaG';
import type { WorkspaceContentAreaGHandle, PanelTypeG } from './WorkspaceContentAreaG';
import { MobileWorkspaceLayout } from './MobileWorkspaceLayout';
import { useBreakpoint } from '~/hooks/use-breakpoint';
import MobileAppHeader from '~/components/MobileAppHeader';
import { CreateTemplateModal } from '~/components/CreateTemplateModal';
import { PanelGroup, Panel, PanelResizeHandle } from 'react-resizable-panels';
import TimelinePanel from './panels/TimelinePanel';

// ✅ NEW: Debug flag for production logging
const DEBUG = process.env.NODE_ENV === 'development';

type Props = {
  projectId: string;
  userId: string;
  initialProps: InputProps;
  initialProjects: { id: string; name: string }[];
  initialAudio?: any;
};

export default function GenerateWorkspaceRoot({ projectId, userId, initialProps, initialProjects, initialAudio }: Props) {
  const [userProjects, setUserProjects] = useState(initialProjects);
  const [isCreateTemplateModalOpen, setIsCreateTemplateModalOpen] = useState(false);
  const [isTimelineVisible, setIsTimelineVisible] = useState(false);
  const [isTimelineMounted, setIsTimelineMounted] = useState(false);
  const TIMELINE_ANIM_MS = 320;
  const [timelineAnim, setTimelineAnim] = useState<'enter' | 'exit' | null>(null);
  useEffect(() => {
    let t: number | null = null;
    if (isTimelineVisible) {
      // Mount and play enter animation
      setIsTimelineMounted(true);
      setTimelineAnim('enter');
      t = window.setTimeout(() => setTimelineAnim(null), TIMELINE_ANIM_MS);
    } else if (isTimelineMounted) {
      // Play exit animation, then unmount
      setTimelineAnim('exit');
      t = window.setTimeout(() => {
        setIsTimelineMounted(false);
        setTimelineAnim(null);
      }, TIMELINE_ANIM_MS);
    }
    return () => { if (t) window.clearTimeout(t); };
  }, [isTimelineVisible, isTimelineMounted]);
  const workspaceContentAreaRef = useRef<WorkspaceContentAreaGHandle>(null);
  
  // Persist/restore timeline visibility with the same workspace key
  useEffect(() => {
    try {
      const key = `bazaar:workspace:${projectId}`;
      const lastKey = `bazaar:workspace:__last`;
      const raw = typeof window !== 'undefined' ? localStorage.getItem(key) : null;
      if (raw) {
        const cfg = JSON.parse(raw);
        if (cfg && cfg.timeline && typeof cfg.timeline.visible === 'boolean') {
          setIsTimelineVisible(Boolean(cfg.timeline.visible));
        }
      } else {
        // Fallback to last-used workspace if no project-specific config yet
        const lastRaw = typeof window !== 'undefined' ? localStorage.getItem(lastKey) : null;
        if (lastRaw) {
          try {
            const lastCfg = JSON.parse(lastRaw);
            if (lastCfg && lastCfg.timeline && typeof lastCfg.timeline.visible === 'boolean') {
              setIsTimelineVisible(Boolean(lastCfg.timeline.visible));
            }
          } catch {}
        }
      }
    } catch {}
  }, [projectId]);
  
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const key = `bazaar:workspace:${projectId}`;
    try {
      const raw = localStorage.getItem(key);
      const existing = raw ? (() => { try { return JSON.parse(raw) || {}; } catch { return {}; } })() : {};
      const payload = { ...existing, timeline: { ...(existing.timeline || {}), visible: isTimelineVisible } };
      localStorage.setItem(key, JSON.stringify(payload));
      // Also update global snapshot so new projects can inherit timeline state
      const lastKey = `bazaar:workspace:__last`;
      try { localStorage.setItem(lastKey, JSON.stringify(payload)); } catch {}
    } catch {}
  }, [isTimelineVisible, projectId]);
  
  // Cross-tab sync for timeline visibility
  useEffect(() => {
    const key = `bazaar:workspace:${projectId}`;
    const onStorage = (e: StorageEvent) => {
      if (e.key !== key || !e.newValue) return;
      try {
        const cfg = JSON.parse(e.newValue);
        if (cfg && cfg.timeline && typeof cfg.timeline.visible === 'boolean') {
          setIsTimelineVisible(Boolean(cfg.timeline.visible));
        }
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [projectId]);
  
  const { data: session } = useSession();
  const { setProject, getCurrentProps } = useVideoState();
  const breakpoint = useBreakpoint();
  
  // Debug breakpoint detection
  useEffect(() => {
    console.log('[GenerateWorkspaceRoot] Current breakpoint:', breakpoint);
    console.log('[GenerateWorkspaceRoot] Window dimensions:', {
      width: typeof window !== 'undefined' ? window.innerWidth : 'SSR',
      height: typeof window !== 'undefined' ? window.innerHeight : 'SSR'
    });
  }, [breakpoint]);

  // ✅ NEW: Fetch current project details to get updated title
  const { data: currentProjectData } = api.project.getById.useQuery(
    { id: projectId },
    { 
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5, // 5 minutes
    }
  );

  // Save current project ID to localStorage for redirect after purchase
  useEffect(() => {
    if (projectId) {
      localStorage.setItem("lastProjectId", projectId);
    }
  }, [projectId]);

  // Initialize video state on mount - but only if not already loaded
  useEffect(() => {
    const currentProps = useVideoState.getState().getCurrentProps();
    const isProjectLoaded = currentProps && useVideoState.getState().projects[projectId];
    
    if (DEBUG) console.log('[GenerateWorkspaceRoot] Checking if project needs initialization:', {
      projectId,
      isProjectLoaded,
      hasCurrentScenes: currentProps?.scenes?.length || 0,
      initialScenes: initialProps?.scenes?.length || 0,
      hasAudio: !!initialAudio
    });
    
    // Only initialize if:
    // 1. Project is not loaded yet, OR
    // 2. Current state has no scenes but initial props has scenes (fresh data from server)
    if (!isProjectLoaded || (!currentProps?.scenes?.length && initialProps?.scenes?.length)) {
      if (DEBUG) console.log('[GenerateWorkspaceRoot] Initializing project with server data');
      setProject(projectId, initialProps, { force: true });
      
      // Set audio if provided
      if (initialAudio) {
        useVideoState.getState().updateProjectAudio(projectId, initialAudio);
        console.log('[GenerateWorkspaceRoot] Set initial audio:', initialAudio);
      }
    } else {
      if (DEBUG) console.log('[GenerateWorkspaceRoot] Project already loaded, skipping initialization');
    }
  }, [projectId, setProject, initialProps, initialAudio, DEBUG]); // Include all dependencies
  
  // ✅ UPDATED: Use current project data title or fallback to initial title
  const [title, setTitle] = useState(
    currentProjectData?.title || 
    initialProjects.find(p => p.id === projectId)?.name || 
    "Untitled Project"
  );

  // ✅ NEW: Update title when project data changes (auto-generated titles)
  useEffect(() => {
    if (currentProjectData?.title) {
      console.log(`[GenerateWorkspaceRoot] Updating title to "${currentProjectData.title}"`);
      setTitle(currentProjectData.title);
    }
  }, [currentProjectData?.title]); // Only depend on currentProjectData.title to avoid infinite loops

  // Handle panel add when clicked or dragged from sidebar
  const handleAddPanel = useCallback((panelType: PanelTypeG | 'timeline') => {
    // Special handling for timeline panels
    if (panelType === 'timeline') {
      setIsTimelineVisible(true);
      return;
    }
    
    workspaceContentAreaRef.current?.addPanel(panelType);
  }, []);

  // ✅ NEW: Auto-open media panel with audio tab when flag is set
  const shouldOpenAudioPanel = useVideoState(state => state.projects[projectId]?.shouldOpenAudioPanel);
  useEffect(() => {
    if (shouldOpenAudioPanel) {
      console.log('[GenerateWorkspaceRoot] Auto-opening media panel with audio tab');
      // Open media panel instead of audio panel
      handleAddPanel('media');
      // TODO: Need to signal that audio tab should be active
      // Clear the flag after opening
      useVideoState.getState().setShouldOpenAudioPanel(projectId, false);
    }
  }, [shouldOpenAudioPanel, projectId, handleAddPanel]);

  // Sidebar is now fixed width, no expansion state needed

  const handleProjectRenamed = useCallback((newTitle: string) => {
    setTitle(newTitle);
    setUserProjects((prev) => prev.map(p => p.id === projectId ? { ...p, name: newTitle } : p));
  }, [projectId]);
  
  // Get tRPC utils for cache invalidation
  const utils = api.useUtils();

  // Set up rename mutation
  const renameMutation = api.project.rename.useMutation({
    onSuccess: async (data) => {
      if (data) {
        setTitle(data.title);
        
        // Invalidate project cache to ensure all components get updated data
        await utils.project.invalidate();
      }
    },
    onError: (error: unknown) => {
      console.error("Failed to rename project:", error);
      
      if (error instanceof Error && error.message.includes("A project with this title already exists")) {
        alert("Error: A project with this title already exists. Please choose a different title.");
        setTitle(initialProjects.find(p => p.id === projectId)?.name || "Untitled Project");
      } else {
        alert(`Error renaming project: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  });
  
  // Set up render mutation
  const renderMutation = api.render.startRender.useMutation({
    onSuccess: () => {
      if (DEBUG) console.log("Render started successfully");
    },
    onError: (error: unknown) => {
      console.error("Failed to start render:", error);
    }
  });

  // Handle rename action
  const handleRename = useCallback((newName: string) => {
    if (newName.trim() === title || newName.trim() === "") {
      return;
    }

    renameMutation.mutate({
      id: projectId,
      title: newName.trim(),
    });
  }, [projectId, renameMutation, title]);
  
  // Handle render action
  const handleRender = useCallback(() => {
    renderMutation.mutate({
      projectId
    });
  }, [projectId, renderMutation]);
  
  // Access user info from session with admin status
  const user = session?.user ? { 
    name: session.user.name ?? "User", 
    email: session.user.email ?? undefined,
    isAdmin: session.user.isAdmin ?? false
  } : undefined;
  
  // Get current scenes for template creation
  const currentScenes = getCurrentProps()?.scenes || [];

  const isMobile = breakpoint === 'mobile';

  // Desktop/Tablet layout
  // Prevent two-finger horizontal swipe from triggering browser Back/Forward
  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (e.defaultPrevented) return;
      // Ignore pinch/zoom gestures
      if (e.ctrlKey || e.metaKey) return;
      // Treat strong horizontal intent as navigation gesture; block it globally on this page
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        try { e.preventDefault(); } catch {}
      }
    };
    window.addEventListener('wheel', onWheel, { passive: false });
    return () => window.removeEventListener('wheel', onWheel as any);
  }, []);

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden relative bg-white dark:bg-gray-900 overscroll-x-none">
      {isMobile ? (
        <>
          <div className="sticky top-0 z-40 w-full">
            <MobileAppHeader
              projectTitle={title}
              projectId={projectId}
              userId={userId}
              onRename={handleRename}
              isRenaming={renameMutation.isPending}
            />
          </div>
          <div className="flex-1 overflow-hidden">
            <MobileWorkspaceLayout
              projectId={projectId}
              userId={userId}
              initialProps={initialProps}
              projects={userProjects}
              onProjectRename={handleProjectRenamed}
            />
          </div>
        </>
      ) : (
        <>
      {/* App Header - Fixed at top with proper z-index and rounded bottom corners */}
      <div className="sticky top-0 z-40 w-full bg-white dark:bg-gray-900 shadow-sm border-b border-gray-100 dark:border-gray-800 rounded-bl-[15px] rounded-br-[15px]">
        <AppHeader
          projectTitle={title}
          onRename={handleRename}
          isRenaming={renameMutation.isPending}
          onRender={handleRender}
          isRendering={renderMutation.isPending}
          user={user}
          projectId={projectId}
          onCreateTemplate={() => setIsCreateTemplateModalOpen(true)}
        />
      </div>
      
      {/* Create a uniform 10px buffer zone below the header */}
      <div className="h-[10px] w-full flex-shrink-0 bg-white dark:bg-gray-900"></div>
      
      {/* Main container with horizontal buffer zones on both sides */}
      <div className="flex-1 min-h-0 relative overflow-hidden px-[10px]">
        {/* Main Content Area - Fixed position with sidebar width */}
        <div
          className="absolute inset-0 z-0 bg-white dark:bg-gray-900 rounded-lg overflow-hidden" 
          style={{
            left: 'calc(4rem + 20px)', // Fixed sidebar width of 4rem + 10px left margin + 10px gap
            right: '10px',
            top: '0',
            bottom: '10px'
          }}
        >
          <div className="h-full flex flex-col overflow-hidden relative">
            {/* Main workspace - always rendered */}
            <div className="flex-1 overflow-hidden">
              <WorkspaceContentAreaG
                ref={workspaceContentAreaRef}
                projectId={projectId}
                userId={userId}
                initialProps={initialProps}
                projects={userProjects}
                onProjectRename={handleProjectRenamed}
                isAdmin={user?.isAdmin}
              />
            </div>
            
            {/* Timeline panel - fixed height based on content */}
            {isTimelineMounted && (
              <div
                className="mt-2"
                style={{
                  transition: `transform ${TIMELINE_ANIM_MS}ms cubic-bezier(0.25, 1, 0.5, 1), opacity ${TIMELINE_ANIM_MS}ms cubic-bezier(0.25, 1, 0.5, 1)` ,
                  transform: timelineAnim === 'enter' ? 'scale(0.96)' : timelineAnim === 'exit' ? 'scale(0.96)' : 'scale(1)',
                  opacity: timelineAnim === 'enter' ? 0 : timelineAnim === 'exit' ? 0 : 1,
                  willChange: 'transform, opacity'
                }}
              >
                <TimelinePanel
                  key={`timeline-${projectId}`}
                  projectId={projectId}
                  userId={userId}
                  onClose={() => setIsTimelineVisible(false)}
                />
              </div>
            )}
          </div>
        </div>
        
        {/* Sidebar with fixed positioning */}
        <div 
          className="absolute left-[10px] top-0 bottom-[10px] z-40">
          <GenerateSidebar
            onAddPanel={handleAddPanel}
            isAdmin={user?.isAdmin}
          />
        </div>
      </div>
      
      {/* Create Template Modal */}
      <CreateTemplateModal
        isOpen={isCreateTemplateModalOpen}
        onClose={() => setIsCreateTemplateModalOpen(false)}
        projectId={projectId}
        scenes={currentScenes.map(scene => ({
          id: scene.id,
          name: String(scene.data.name || 'Untitled'),
          duration: scene.duration,
          tsxCode: String(scene.data.code || ''),
          order: 0,
          projectId,
          props: scene.data.props || {},
          layoutJson: null,
          createdAt: new Date(),
          updatedAt: new Date()
        }))}
      />
        </>
      )}
    </div>
  );
}
