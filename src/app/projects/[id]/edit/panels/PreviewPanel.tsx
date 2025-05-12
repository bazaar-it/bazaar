// src/app/projects/[id]/edit/panels/PreviewPanel.tsx
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { Player } from '@remotion/player';
import { DynamicVideo } from '~/remotion/compositions/DynamicVideo';
import { useVideoState } from '~/stores/videoState';
import { useTimeline } from '~/components/client/Timeline/TimelineContext';
import type { InputProps } from '~/types/input-props';

export default function PreviewPanel({ 
  projectId, 
  initial 
}: { 
  projectId: string;
  initial?: InputProps;
}) {
  const { getCurrentProps, setProject, forceRefresh } = useVideoState();
  const { currentFrame } = useTimeline();
  
  // State for tracking last refresh time
  const [lastRefreshTime, setLastRefreshTime] = useState(Date.now());
  const [lastKnownComponentIds, setLastKnownComponentIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false); // Add a state for tracking refresh
  
  // Initialize project if initial props are provided
  useEffect(() => {
    if (initial) {
      console.log('[PreviewPanel] Setting initial project props');
      // Pass project string ID as first parameter
      setProject(projectId, initial);
    }
  }, [initial, projectId, setProject]);
  
  // Get the current props from the video state
  const currentProps = getCurrentProps();
  
  // Get the refresh token from the store (or generate a default one)
  const storeRefreshToken = currentProps && 'refreshToken' in currentProps ? 
    (currentProps as any).refreshToken : `token-${Date.now()}`;
  
  // Extract component IDs from the current props
  const currentComponentIds = currentProps?.scenes
    ?.filter(scene => scene.type === 'custom')
    ?.map(scene => scene.data.componentId as string) || [];
  
  // Add debug logs to help track component IDs
  useEffect(() => {
    console.debug('[PreviewPanel] Current component IDs:', currentComponentIds);
    console.debug('[PreviewPanel] Last known component IDs:', lastKnownComponentIds);
  }, [currentComponentIds, lastKnownComponentIds]);
  
  // Detect changes in components to trigger automatic refresh
  useEffect(() => {
    // Always update the last known component IDs
    if (JSON.stringify(currentComponentIds) !== JSON.stringify(lastKnownComponentIds)) {
      console.log('[PreviewPanel] Component IDs changed from', lastKnownComponentIds, 'to', currentComponentIds);
      setLastKnownComponentIds(currentComponentIds);
      
      // If we have new components that weren't in the previous list, trigger refresh
      const newComponents = currentComponentIds.filter(id => !lastKnownComponentIds.includes(id));
      
      if (newComponents.length > 0) {
        console.log('[PreviewPanel] New components detected, forcing refresh:', newComponents);
        handleRefresh();
      }
    }
  }, [currentComponentIds, projectId, lastKnownComponentIds]); // Dependency on projectId and lastKnownComponentIds
  
  // Force a refresh of the preview
  const handleRefresh = useCallback(() => {
    console.log('[PreviewPanel] 🔄 Refresh button clicked');
    setIsRefreshing(true); // Set refreshing state to true
    
    // Log current scenes for debugging
    if (currentProps?.scenes) {
      console.log('[PreviewPanel] Current scenes during refresh:', 
        currentProps.scenes.map(s => ({
          id: s.id,
          type: s.type,
          componentId: s.type === 'custom' ? s.data.componentId : undefined
        }))
      );
    }
    
    // Force a browser cache clear for component scripts
    console.log('[PreviewPanel] Attempting to clear component cache');
    const scriptTags = document.querySelectorAll('script[src*="custom-components"]');
    console.log(`[PreviewPanel] Found ${scriptTags.length} component script tags to refresh`);
    
    scriptTags.forEach(script => {
      // Log the script being removed
      console.log('[PreviewPanel] Removing script:', script.getAttribute('src'));
      script.remove();
    });
    
    // Use the store's forceRefresh instead of local state
    console.log('[PreviewPanel] Calling forceRefresh on videoState store');
    forceRefresh(projectId);
    setLastRefreshTime(Date.now());
    
    // Reset refreshing state after a delay
    setTimeout(() => {
      setIsRefreshing(false);
    }, 2000);
  }, [forceRefresh, projectId, currentProps]);
  
  return (
    <div className="relative h-full w-full flex flex-col">
      {/* Hidden button for panel header integration */}
      <button
        id="refresh-preview-button"
        onClick={handleRefresh}
        className="hidden"
        aria-hidden="true"
      />
      
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
            key={`player-${storeRefreshToken}`} // IMPORTANT: Use store refresh token for Player key
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-black text-white">
            <p>Loading project...</p>
          </div>
        )}
        
        {/* Hiding the refresh button overlay with CSS instead of removing it */}
        <div className="absolute top-4 right-4 z-10" style={{ display: 'none' }}>
          <button 
            onClick={handleRefresh}
            className={`${isRefreshing ? 'bg-green-600 animate-pulse' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg px-4 py-2 flex items-center shadow-lg`}
            title="Refresh Preview"
            id="preview-refresh-button" // Add ID for easier debugging
            disabled={isRefreshing}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 mr-1 ${isRefreshing ? 'animate-spin' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
            </svg>
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
        
        {/* Hiding the last refreshed indicator with CSS instead of removing it */}
        <div className="absolute bottom-4 right-4 z-10 text-xs text-white bg-black/50 px-2 py-1 rounded" style={{ display: 'none' }}>
          Last refreshed: {new Date(lastRefreshTime).toLocaleTimeString()}
        </div>
        
        {/* Add Component count for debugging */}
        <div className="absolute bottom-4 left-4 z-10 text-xs text-white bg-black/50 px-2 py-1 rounded">
          Custom components: {currentComponentIds.length}
        </div>
      </div>
    </div>
  );
} 