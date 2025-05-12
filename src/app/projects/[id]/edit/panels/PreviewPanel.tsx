// src/app/projects/[id]/edit/panels/PreviewPanel.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Player } from '@remotion/player';
import { DynamicVideo } from '~/remotion/compositions/DynamicVideo';
import { useVideoState } from '~/stores/videoState';
import { useTimeline } from '~/components/client/Timeline/TimelineContext';
import type { InputProps } from '~/types/input-props';
import { Button } from "~/components/ui/button";
import { RefreshCwIcon } from "lucide-react";

export default function PreviewPanel({ 
  projectId, 
  initial 
}: { 
  projectId: string;
  initial?: InputProps;
}) {
  const { getCurrentProps, setProject, forceRefresh } = useVideoState();
  const { currentFrame } = useTimeline();
  
  // State for tracking refresh status
  const [lastRefreshTime, setLastRefreshTime] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Use refs to track component IDs for better comparison across renders
  const lastKnownComponentIdsRef = useRef<string[]>([]);
  const lastKnownComponentVersionsRef = useRef<Record<string, number>>({});
  
  useEffect(() => {
    // Set last refresh time only on the client after mount
    setLastRefreshTime(Date.now());
  }, []);
  
  // Initialize project if initial props are provided
  useEffect(() => {
    if (initial) {
      console.log('[PreviewPanel] Setting initial project props');
      setProject(projectId, initial);
    }
  }, [initial, projectId, setProject]);
  
  // Get the current props from the video state
  const currentProps = getCurrentProps();
  
  // Get the refresh token from the store
  const storeRefreshToken = currentProps && 'refreshToken' in currentProps ? 
    (currentProps as any).refreshToken : `token-${Date.now()}`;
  
  // Extract component IDs and create a version map for detection of changes
  const currentComponentIds = currentProps?.scenes
    ?.filter(scene => scene.type === 'custom')
    ?.map(scene => scene.data.componentId as string) || [];
  
  // Enhanced component change detection with more detailed logging
  useEffect(() => {
    // Skip initial render effect
    if (lastKnownComponentIdsRef.current.length === 0 && currentComponentIds.length === 0) {
      return;
    }
    
    // Convert arrays to sets for easier comparison
    const currentIdSet = new Set(currentComponentIds);
    const lastKnownIdSet = new Set(lastKnownComponentIdsRef.current);
    
    // Find added and removed components
    const addedComponents = currentComponentIds.filter(id => !lastKnownIdSet.has(id));
    const removedComponents = lastKnownComponentIdsRef.current.filter(id => !currentIdSet.has(id));
    
    // Detect any changes
    const hasComponentChanges = addedComponents.length > 0 || removedComponents.length > 0;
    
    if (hasComponentChanges) {
      console.log('[PreviewPanel] Component changes detected:', {
        added: addedComponents,
        removed: removedComponents,
        current: currentComponentIds,
        previous: lastKnownComponentIdsRef.current
      });
      
      // Update our refs
      lastKnownComponentIdsRef.current = [...currentComponentIds];
      
      // If we have added components, force a refresh
      if (addedComponents.length > 0) {
        console.log('[PreviewPanel] New components detected, forcing refresh:', addedComponents);
        handleRefresh();
      }
    }
  }, [currentComponentIds]); // Only depend on currentComponentIds
  
  // Force a refresh of the preview with enhanced script cleanup
  const handleRefresh = useCallback(() => {
    console.log('[PreviewPanel] 🔄 Refreshing preview components');
    setIsRefreshing(true);
    
    // Aggressively clean up any component scripts in the document
    const cleanupScripts = () => {
      // Find all scripts related to custom components
      const scriptTags = document.querySelectorAll('script[src*="components"]');
      console.log(`[PreviewPanel] Found ${scriptTags.length} component script tags to clean up`);
      
      // Remove all found scripts
      scriptTags.forEach(script => {
        const src = script.getAttribute('src');
        console.log(`[PreviewPanel] Removing script: ${src}`);
        script.remove();
      });
      
      // Also clear window.__REMOTION_COMPONENT if it exists
      if (window && 'window' in window && window.__REMOTION_COMPONENT) {
        console.log('[PreviewPanel] Clearing window.__REMOTION_COMPONENT');
        window.__REMOTION_COMPONENT = undefined;
      }
    };
    
    // Clean up scripts
    cleanupScripts();
    
    // Force a videoState refresh through the store
    console.log('[PreviewPanel] Calling forceRefresh on videoState store for projectId:', projectId);
    forceRefresh(projectId);
    
    // Update last refresh time
    setLastRefreshTime(Date.now());
    
    // Reset refreshing state after a delay
    setTimeout(() => {
      setIsRefreshing(false);
      console.log('[PreviewPanel] Refresh completed');
    }, 2000);
  }, [forceRefresh, projectId]);
  
  // Add a useEffect to watch for refreshToken changes from the store
  useEffect(() => {
    if (storeRefreshToken) {
      console.log('[PreviewPanel] Store refreshToken updated:', storeRefreshToken);
    }
  }, [storeRefreshToken]);

  // Add a function to handle manual refresh
  const handleManualRefresh = useCallback(() => {
    console.log('[PreviewPanel] Manual refresh triggered for project:', projectId);
    forceRefresh(projectId);
  }, [forceRefresh, projectId]);
  
  return (
    <div className="h-full flex flex-col bg-gray-900 relative overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1 bg-gray-900 border-b border-gray-800">
        <h2 className="text-xs font-medium text-gray-300">Preview</h2>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-gray-400 hover:text-white" 
            onClick={handleManualRefresh}
            title="Refresh components"
          >
            <RefreshCwIcon className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      
      <div className="relative flex-grow">
        {/* Render the Player with a key for forcing remounts */}
        {currentProps ? (
          <Player
            component={DynamicVideo}
            inputProps={{
              scenes: currentProps.scenes || [],
              meta: currentProps.meta || { duration: 150 },
              refreshToken: storeRefreshToken // Use store refresh token
            }}
            durationInFrames={currentProps.meta?.duration || 150}
            fps={30}
            style={{ width: '100%', height: '100%' }}
            compositionWidth={1280}
            compositionHeight={720}
            initialFrame={currentFrame}
            autoPlay={false}
            loop
            controls
            key={`player-${storeRefreshToken}`} // Keep store refresh token for Player key
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black text-white">
            <p>Loading project...</p>
          </div>
        )}
        
        {/* Make refresh button visible for easier debugging */}
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={handleRefresh}
            className={`${isRefreshing ? 'bg-green-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg px-4 py-2 flex items-center shadow-lg`}
            title="Refresh Preview"
            id="preview-refresh-button"
            disabled={isRefreshing}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh Preview'}
          </button>
        </div>
        
        {/* Last refreshed indicator */}
        {lastRefreshTime && (
          <div className="absolute bottom-4 right-4 z-10 text-xs text-white bg-black/50 px-2 py-1 rounded">
            Last refreshed: {new Date(lastRefreshTime).toLocaleTimeString()}
          </div>
        )}
        
        {/* Component count */}
        <div className="absolute bottom-4 left-4 z-10 text-xs text-white bg-black/50 px-2 py-1 rounded">
          Custom components: {currentComponentIds.length}
        </div>
      </div>
    </div>
  );
} 