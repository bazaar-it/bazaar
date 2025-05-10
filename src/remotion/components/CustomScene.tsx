import React, { useState, useEffect, useCallback } from 'react';
import { AbsoluteFill } from 'remotion';
import { delayRender, continueRender } from 'remotion';
import { useRemoteComponent } from '~/hooks/useRemoteComponent';

// Define the SceneProps type
interface SceneProps {
  data: {
    componentId?: string;
    [key: string]: any;
  };
}

export const CustomScene: React.FC<SceneProps> = ({ data }) => {
  const componentId = data.componentId as string;
  console.log('[CustomScene] Rendering for componentId:', componentId, 'Scene data:', data);

  // Define states for loading, errors, and fetched data
  const [adbData, setAdbData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [handle] = useState(() => delayRender("Loading Animation Design Brief for CustomScene"));
  const [refreshKey, setRefreshKey] = useState(Date.now());
  
  // Force a refresh of the component
  const forceRefresh = useCallback(() => {
    console.log(`[CustomScene ${componentId}] Force refreshing component`);
    setRefreshKey(Date.now());
    setLoading(true);
    setError(null);
    setAdbData(null);
  }, [componentId]);

  // Load the animation design brief
  useEffect(() => {
    async function fetchAdbData() {
      try {
        if (!componentId) {
          throw new Error("No componentId provided in scene data");
        }

        console.log(`[CustomScene ${componentId}] Fetching component metadata from API`);
        // First get the metadata to get the animationDesignBriefId
        // Add cache-busting timestamp to ensure fresh data
        const metadataResponse = await fetch(`/api/components/${componentId}/metadata?t=${refreshKey}`);
        
        if (!metadataResponse.ok) {
          throw new Error(`Failed to fetch component metadata: ${metadataResponse.statusText}`);
        }
        
        const metadata = await metadataResponse.json();
        console.log(`[CustomScene ${componentId}] Metadata:`, metadata);
        
        if (!metadata.animationDesignBriefId) {
          throw new Error("No animationDesignBriefId in component metadata");
        }

        // Then fetch the animation design brief with cache-busting
        console.log(`[CustomScene ${componentId}] Fetching ADB from /api/animation-design-briefs/${metadata.animationDesignBriefId}`);
        const adbResponse = await fetch(`/api/animation-design-briefs/${metadata.animationDesignBriefId}?t=${refreshKey}`);
        
        if (!adbResponse.ok) {
          throw new Error(`Failed to fetch animation design brief: ${adbResponse.statusText}`);
        }
        
        const adbData = await adbResponse.json();
        console.log(`[CustomScene ${componentId}] ADB data:`, adbData);
        
        // Set the animation design brief data
        setAdbData(adbData);
        setLoading(false);
      } catch (err) {
        console.error(`[CustomScene ${componentId}] Error:`, err);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      } finally {
        // Continue rendering whether we succeeded or failed
        console.log(`[CustomScene ${componentId}] Continuing render with handle:`, handle);
        continueRender(handle);
      }
    }

    // Execute the fetch
    fetchAdbData().catch(err => {
      console.error(`[CustomScene ${componentId}] Unhandled error in fetchAdbData:`, err);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      continueRender(handle);
    });
    
    // Cleanup function
    return () => {
      console.log(`[CustomScene ${componentId}] Unmounting`);
    };
  }, [componentId, handle, refreshKey]);

  // Show error state
  if (error) {
    console.error(`[CustomScene ${componentId}] Rendering error state:`, error);
    return (
      <AbsoluteFill style={{ 
        backgroundColor: '#FEE2E2', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexDirection: 'column',
        padding: '2rem'
      }}>
        <div style={{ 
          backgroundColor: 'white', 
          padding: '2rem', 
          borderRadius: '0.5rem',
          maxWidth: '80%',
          textAlign: 'center',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}>
          <h2 style={{ color: '#DC2626', marginBottom: '1rem' }}>Error Loading Component</h2>
          <p style={{ marginBottom: '0.5rem' }}>{error}</p>
          <p style={{ fontSize: '0.875rem', color: '#6B7280' }}>Component ID: {componentId}</p>
          <button 
            onClick={forceRefresh}
            style={{ 
              marginTop: '1rem', 
              padding: '0.5rem 1rem', 
              backgroundColor: '#DC2626', 
              color: 'white', 
              border: 'none', 
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      </AbsoluteFill>
    );
  }

  // Show loading state
  if (loading) {
    console.log(`[CustomScene ${componentId}] Rendering loading state`);
    return (
      <AbsoluteFill style={{ 
        backgroundColor: '#F3F4F6', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center' 
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Loading Component</h2>
          <p>Loading animation design brief for {componentId}...</p>
        </div>
      </AbsoluteFill>
    );
  }

  // Show the remote component if ADB data is available
  if (adbData) {
    console.log(`[CustomScene ${componentId}] State: ADB Loaded, rendering RemoteComponent. Brief data:`, adbData);
    
    // Get the component loader with dynamic timestamp for cache busting
    const remoteComponentData = useRemoteComponent(`${componentId}?t=${refreshKey}`);
    console.log(`[CustomScene ${componentId}] RemoteComponentRenderer:`, remoteComponentData);
    
    // Extract the Component from the returned object
    const { Component: RemoteComponent } = remoteComponentData;
    
    // Render the Component with our props
    return (
      <RemoteComponent 
        brief={adbData} 
        sceneData={data} 
        onRefresh={forceRefresh} 
      />
    );
  }

  // Fallback for unexpected state (shouldn't happen, but just in case)
  console.error(`[CustomScene ${componentId}] Unexpected state: Not loading, no error, but no ADB data`);
  return (
    <AbsoluteFill style={{ 
      backgroundColor: '#FEF3C7', 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center' 
    }}>
      <div style={{ textAlign: 'center' }}>
        <h2>No Data Available</h2>
        <p>The component data could not be loaded.</p>
        <p>Component ID: {componentId}</p>
        <button 
          onClick={forceRefresh}
          style={{ 
            marginTop: '1rem', 
            padding: '0.5rem 1rem', 
            backgroundColor: '#F59E0B', 
            color: 'white', 
            border: 'none', 
            borderRadius: '0.25rem',
            cursor: 'pointer'
          }}
        >
          Try Again
        </button>
      </div>
    </AbsoluteFill>
  );
} 