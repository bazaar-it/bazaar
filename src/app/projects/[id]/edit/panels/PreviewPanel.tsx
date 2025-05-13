// src/app/projects/[id]/edit/panels/PreviewPanel.tsx
"use client";

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Player } from '@remotion/player';
import { DynamicVideo } from '~/remotion/compositions/DynamicVideo';
import { useVideoState } from '~/stores/videoState';
import { useTimeline } from '~/components/client/Timeline/TimelineContext';
import type { InputProps } from '~/types/input-props';
import { Button } from "~/components/ui/button";
import { RefreshCwIcon, InfoIcon, AlertCircleIcon } from "lucide-react";

// Debug mode flag - set to true to enable detailed debug information
const DEBUG_MODE = process.env.NODE_ENV === 'development';

// This fixes the refreshToken property not existing on the InputProps type
type EnhancedInputProps = InputProps & {
  refreshToken?: string;
};

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
  const [showDebugInfo, setShowDebugInfo] = useState(DEBUG_MODE);
  const [componentStatus, setComponentStatus] = useState<Record<string, string>>({});
  const [storeRefreshToken, setStoreRefreshToken] = useState<string>('initial');
  
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
  const currentProps = getCurrentProps() as EnhancedInputProps | undefined;
  
  // Extract all component IDs from the current props
  const currentComponentIds = React.useMemo(() => {
    if (!currentProps?.scenes) return [];
    
    return currentProps.scenes
      .filter(scene => scene.type === 'custom' && scene.data?.componentId)
      .map(scene => scene.data.componentId as string);
  }, [currentProps]);
  
  // Function to clean up component scripts by their IDs
  const cleanupComponentScripts = useCallback((componentIds: string[]) => {
    if (!componentIds.length) return;
    
    console.log(`[PreviewPanel] Cleaning up scripts for components:`, componentIds);
    
    // Find script tags with src containing the component IDs
    const scripts = Array.from(document.querySelectorAll('script')).filter(script => {
      const src = script.getAttribute('src') || '';
      const id = script.id || '';
      
      // Check if script source or ID contains any of the component IDs
      return componentIds.some(componentId => src.includes(componentId) || id.includes(componentId));
    });
    
    // Remove the script tags
    scripts.forEach(script => {
      const src = script.getAttribute('src') || script.id || 'unknown';
      console.log(`[PreviewPanel] Removing script: ${src}`);
      script.remove();
    });
    
    // Also check for and remove any orphaned script tags with matching IDs
    const allScripts = document.querySelectorAll('script');
    allScripts.forEach(script => {
      const scriptContent = script.textContent || '';
      const scriptSrc = script.getAttribute('src') || '';
      
      // Check if any component ID is mentioned in the script content or src
      const matchesAnyComponent = componentIds.some(id => 
        scriptContent.includes(id) || scriptSrc.includes(id) || (script.id && script.id.includes(id))
      );
      
      if (matchesAnyComponent) {
        console.log(`[PreviewPanel] Removing matched script by content: ${script.id || scriptSrc}`);
        script.remove();
      }
    });
    
    // Additionally, try to clear the component from window.__REMOTION_COMPONENT if it's present
    if (typeof window !== 'undefined' && window.__REMOTION_COMPONENT) {
      console.log('[PreviewPanel] Resetting window.__REMOTION_COMPONENT to support clean reload');
      window.__REMOTION_COMPONENT = undefined;
    }
    
    // Look for any other remote component script tags that might be orphaned
    const remoteComponentScripts = Array.from(document.querySelectorAll('script[id^="remote-component-"]'));
    if (remoteComponentScripts.length > 0) {
      console.log(`[PreviewPanel] Found ${remoteComponentScripts.length} potential orphaned remote component scripts`);
      
      // Check which ones don't match any current component IDs
      const orphanedScripts = remoteComponentScripts.filter(script => {
        const id = script.id;
        // Check if this script isn't for any of our current components
        return !currentComponentIds.some(componentId => id.includes(componentId));
      });
      
      if (orphanedScripts.length > 0) {
        console.log(`[PreviewPanel] Removing ${orphanedScripts.length} orphaned remote component scripts`);
        orphanedScripts.forEach(script => script.remove());
      }
    }
  }, [currentComponentIds]);
  
  // Force a refresh of the preview with enhanced script cleanup
  const handleRefresh = useCallback((fullCleanup = true) => {
    console.log('[PreviewPanel] 🔄 Refreshing preview. Full cleanup:', fullCleanup);
    setIsRefreshing(true);
    setLastRefreshTime(Date.now());

    // Get all component IDs that are currently supposed to be active
    const activeComponentIds = lastKnownComponentIdsRef.current;
    console.log('[PreviewPanel] Refreshing with active component IDs:', activeComponentIds);

    // IMPROVED: More targeted cleanup approach
    if (fullCleanup) {
      // On full cleanup, remove all component scripts to ensure fresh starts
      cleanupComponentScripts(activeComponentIds);
      
      // Also clear window.__REMOTION_COMPONENT for a full refresh scenario
      if (typeof window !== 'undefined' && window.__REMOTION_COMPONENT) {
        console.log('[PreviewPanel] Clearing window.__REMOTION_COMPONENT for full refresh');
        window.__REMOTION_COMPONENT = undefined;
      }
      
      // Reset status for components on full refresh
      setComponentStatus({});
    } else {
      // For partial refresh, only update the status of active components
      setComponentStatus(prev => {
        const updated = { ...prev };
        
        // Mark active components as "refreshing"
        activeComponentIds.forEach(id => {
          updated[id] = 'refreshing';
        });
        
        return updated;
      });
    }

    // Force a refresh through the videoState store
    forceRefresh(projectId);

    // Set a timeout to clear the refreshing state
    setTimeout(() => {
      setIsRefreshing(false);
    }, 1000); 
  }, [projectId, forceRefresh, cleanupComponentScripts, lastKnownComponentIdsRef]);
  
  // Function to handle manual refresh button click
  const handleManualRefresh = useCallback(() => {
    // Only allow refresh if we're not already refreshing
    if (!isRefreshing) {
      handleRefresh(true); // Do a full refresh
    }
  }, [isRefreshing, handleRefresh]);
  
  // Toggle debug info display
  const toggleDebugInfo = useCallback(() => {
    setShowDebugInfo(prev => !prev);
  }, []);
  
  // Function to update component status for a specific component
  const updateComponentStatus = useCallback((componentId: string, status: string) => {
    setComponentStatus(prev => ({
      ...prev,
      [componentId]: status
    }));
  }, []);
  
  // Effect to detect and handle component changes
  useEffect(() => {
    // Skip initial render effect
    if (lastKnownComponentIdsRef.current.length === 0 && currentComponentIds.length === 0) {
      lastKnownComponentIdsRef.current = [...currentComponentIds];
      return; // Skip first run
    }
    
    // Calculate added and removed components
    const addedComponents = currentComponentIds.filter(
      id => !lastKnownComponentIdsRef.current.includes(id)
    );
    
    const removedComponents = lastKnownComponentIdsRef.current.filter(
      id => !currentComponentIds.includes(id)
    );
    
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
      
      // Update component status for removed components
      if (removedComponents.length > 0) {
        setComponentStatus(prev => {
          const updated = { ...prev };
          
          // Mark removed components as "removed"
          removedComponents.forEach(id => {
            updated[id] = 'removed';
          });
          
          return updated;
        });
        
        // Clean up removed components
        cleanupComponentScripts(removedComponents);
      }
      
      // If we have added components, force a refresh
      if (addedComponents.length > 0) {
        console.log('[PreviewPanel] New components detected, forcing refresh:', addedComponents);
        
        // Update component status for new components
        setComponentStatus(prev => {
          const updated = { ...prev };
          
          // Mark added components as "loading"
          addedComponents.forEach(id => {
            updated[id] = 'loading';
          });
          
          return updated;
        });
        
        handleRefresh(false); // Don't do a full refresh - this allows incremental addition
      }
    }
  }, [currentComponentIds, cleanupComponentScripts, handleRefresh]);
  
  // Add a useEffect to watch for refreshToken changes from the store
  useEffect(() => {
    // Custom hook already triggers re-rendering of the Remotion Player
    // Ensure store's refreshToken updates are reflected in our local state
    const currentRefreshToken = currentProps?.refreshToken as string | undefined;
    
    if (currentRefreshToken && currentRefreshToken !== storeRefreshToken) {
      console.log(`[PreviewPanel] Store refreshToken changed: ${storeRefreshToken} -> ${currentRefreshToken}`);
      
      // Update our local reference to the store's refreshToken
      setStoreRefreshToken(currentRefreshToken);
      
      // We don't need to force a refresh here since the Player will re-render
      // due to the refreshToken prop change - this just ensures we track it
    }
    
  }, [currentProps, storeRefreshToken]);
  
  // Render progress indicators for component status
  const renderComponentStatusIndicators = useCallback(() => {
    if (!showDebugInfo || Object.keys(componentStatus).length === 0) return null;
    
    return (
      <div className="absolute bottom-2 left-2 z-10 bg-black/70 rounded p-1 text-xs font-mono text-white max-w-[300px] max-h-[150px] overflow-auto">
        <div className="text-xs font-bold mb-1">Component Status:</div>
        {Object.entries(componentStatus).map(([id, status]) => {
          // Determine status color
          let statusColor = 'text-gray-400'; // default
          if (status === 'loaded') statusColor = 'text-green-400';
          if (status === 'loading' || status === 'refreshing') statusColor = 'text-blue-400';
          if (status === 'error') statusColor = 'text-red-400';
          if (status === 'removed') statusColor = 'text-gray-500';
          
          // For display, truncate the ID to first 8 chars
          const displayId = id.substring(0, 8) + '...';
          
          return (
            <div key={id} className="flex items-center space-x-1">
              <div className={`${statusColor}`}>●</div>
              <div className="truncate">{displayId}</div>
              <div className={`${statusColor} italic`}>{status}</div>
            </div>
          );
        })}
      </div>
    );
  }, [componentStatus, showDebugInfo]);
  
  // Listen for custom events from the component
  useEffect(() => {
    // Handle component status events
    const handleComponentEvent = (event: CustomEvent) => {
      if (event.detail && event.detail.type === 'remotion-component-status') {
        const { componentId, status } = event.detail;
        console.log(`[PreviewPanel] Component status update:`, { componentId, status });
        updateComponentStatus(componentId, status);
      }
    };
    
    // Listen for custom events from CustomScene
    window.addEventListener('remotion-component-status' as any, handleComponentEvent);
    
    return () => {
      window.removeEventListener('remotion-component-status' as any, handleComponentEvent);
    };
  }, [updateComponentStatus]);
  
  return (
    <div className="h-full flex flex-col bg-gray-900 relative overflow-hidden">
      <div className="flex items-center justify-between px-2 py-1 bg-gray-900 border-b border-gray-800">
        <h2 className="text-xs font-medium text-gray-300">Preview</h2>
        <div className="flex items-center space-x-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className={`h-6 text-gray-400 hover:text-white ${isRefreshing ? 'animate-spin text-blue-400' : ''}`}
            onClick={handleManualRefresh}
            title="Refresh components"
            disabled={isRefreshing}
          >
            <RefreshCwIcon className="h-3.5 w-3.5" />
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className="h-6 text-gray-400 hover:text-white"
            onClick={toggleDebugInfo}
            title="Toggle debug information"
          >
            <InfoIcon className="h-3.5 w-3.5" />
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
              refreshToken: storeRefreshToken, // Use store refresh token
              updateComponentStatus // Pass the status update function to DynamicVideo
            }}
            durationInFrames={currentProps.meta?.duration || 150}
            fps={30}
            style={{ width: '100%', height: '100%' }}
            compositionWidth={1280}
            compositionHeight={720}
            // Use the current frame from the timeline state to keep it in sync
            initialFrame={currentFrame}
          />
        ) : (
          <div className="flex items-center justify-center h-full bg-gray-800 text-gray-400">
            <p>No video data available.</p>
          </div>
        )}
        
        {/* Show the debug info if enabled */}
        {showDebugInfo && (
          <div className="absolute top-2 right-2 bg-black/70 text-white p-2 rounded text-xs max-w-[250px] z-10">
            <div>Last refresh: {lastRefreshTime ? new Date(lastRefreshTime).toLocaleTimeString() : 'Never'}</div>
            <div>Frame: {currentFrame}</div>
            <div>Components: {currentComponentIds.length}</div>
          </div>
        )}
        
        {/* Show component status indicators */}
        {renderComponentStatusIndicators()}
      </div>
    </div>
  );
} 