/**
 * ⚠️ DEPRECATED: This file has been renamed to AdbFetchingCustomScene.tsx ⚠️
 * 
 * The active CustomScene component used in the DynamicVideo composition is located at:
 * src/remotion/components/scenes/CustomScene.tsx
 * 
 * This was done to avoid naming conflicts and clarify component responsibilities.
 * 
 * See memory-bank/sprints/sprint16/sprint16.md for more details on this change.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AbsoluteFill } from 'remotion';
import { delayRender, continueRender } from 'remotion';
import { useRemoteComponent, RemoteComponent } from '~/hooks/useRemoteComponent';

// Define the SceneProps type
interface SceneProps {
  data: {
    componentId?: string;
    refreshToken?: string;
    [key: string]: any;
  };
}

/**
 * This component was renamed from CustomScene to AdbFetchingCustomScene
 * to avoid naming conflict with src/remotion/components/scenes/CustomScene.tsx
 * 
 * This component fetches ADB data itself rather than receiving it via props.
 */
export const AdbFetchingCustomScene: React.FC<SceneProps> = ({ data }) => {
  const componentId = data.componentId!;
  const refreshToken = data.refreshToken; // Extract refreshToken from props
  
  console.log('[AdbFetchingCustomScene] Mounting/rendering with componentId:', componentId, 'refreshToken:', refreshToken);

  // Define states for loading, errors, and fetched data
  const [adbData, setAdbData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [handle] = useState(() => delayRender("Loading Animation Design Brief for AdbFetchingCustomScene"));
  
  // Use refreshToken to generate a key for refreshing
  const [refreshKey, setRefreshKey] = useState<string>(() => 
    refreshToken ? `${refreshToken}-${Date.now()}` : `${Date.now()}`
  );
  
  // Update refreshKey if refreshToken changes
  useEffect(() => {
    if (refreshToken) {
      console.log(`[AdbFetchingCustomScene] External refreshToken changed, updating refreshKey:`, refreshToken);
      setRefreshKey(`${refreshToken}-${Date.now()}`);
    }
  }, [refreshToken]);
  
  // Force a refresh of the component
  const forceRefresh = useCallback(() => {
    console.log(`[AdbFetchingCustomScene ${componentId}] Force refreshing component`);
    setRefreshKey(`${refreshToken || ''}-${Date.now()}`);
    setLoading(true);
    setError(null);
    setAdbData(null);
  }, [componentId, refreshToken]);

  // Load the animation design brief
  useEffect(() => {
    async function fetchAdbData() {
      try {
        if (!componentId) {
          throw new Error("No componentId provided in scene data");
        }

        console.log(`[AdbFetchingCustomScene ${componentId}] Fetching component metadata from API, refreshKey: ${refreshKey}`);
        // First get the metadata to get the animationDesignBriefId
        // Add cache-busting timestamp to ensure fresh data
        const metadataResponse = await fetch(`/api/components/${componentId}/metadata?t=${Date.now()}`);
        
        if (!metadataResponse.ok) {
          throw new Error(`Failed to fetch component metadata: ${metadataResponse.statusText}`);
        }
        
        const metadata = await metadataResponse.json();
        console.log(`[AdbFetchingCustomScene ${componentId}] Metadata:`, metadata);
        
        if (!metadata.animationDesignBriefId) {
          throw new Error("No animationDesignBriefId in component metadata");
        }

        // Then fetch the animation design brief with cache-busting
        console.log(`[AdbFetchingCustomScene ${componentId}] Fetching ADB from /api/animation-design-briefs/${metadata.animationDesignBriefId}`);
        const adbResponse = await fetch(`/api/animation-design-briefs/${metadata.animationDesignBriefId}?t=${Date.now()}`);
        
        if (!adbResponse.ok) {
          throw new Error(`Failed to fetch animation design brief: ${adbResponse.statusText}`);
        }
        
        const adbData = await adbResponse.json();
        console.log(`[AdbFetchingCustomScene ${componentId}] ADB data:`, adbData);
        
        // Set the animation design brief data
        setAdbData(adbData);
        setLoading(false);
      } catch (err) {
        console.error(`[AdbFetchingCustomScene ${componentId}] Error:`, err);
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      } finally {
        // Continue rendering whether we succeeded or failed
        console.log(`[AdbFetchingCustomScene ${componentId}] Continuing render with handle:`, handle);
        continueRender(handle);
      }
    }

    // Execute the fetch
    fetchAdbData().catch(err => {
      console.error(`[AdbFetchingCustomScene ${componentId}] Unhandled error in fetchAdbData:`, err);
      setError(err instanceof Error ? err.message : String(err));
      setLoading(false);
      continueRender(handle);
    });
    
    // Cleanup function
    return () => {
      console.log(`[AdbFetchingCustomScene ${componentId}] Unmounting with refreshKey: ${refreshKey}`);
    };
  }, [componentId, handle, refreshKey]);

  // Show error state
  if (error) {
    console.error(`[AdbFetchingCustomScene ${componentId}] Rendering error state:`, error);
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
    console.log(`[AdbFetchingCustomScene ${componentId}] Rendering loading state`);
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
    console.log(`[AdbFetchingCustomScene ${componentId}] ADB Loaded with refreshKey: ${refreshKey}, rendering RemoteComponent`);
    
    // Important: Use a key that includes refreshKey to force re-mount when refreshToken changes
    return (
      <AbsoluteFill>
        <RemoteComponent 
          key={`component-${componentId}-${refreshKey}`}
          componentId={componentId}
          brief={adbData} 
          sceneData={data} 
          onRefresh={forceRefresh} 
        />
      </AbsoluteFill>
    );
  }

  // Fallback for unexpected state (shouldn't happen, but just in case)
  console.error(`[AdbFetchingCustomScene ${componentId}] Unexpected state: Not loading, no error, but no ADB data`);
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

// Re-export the renamed component for backward compatibility
export const CustomScene = AdbFetchingCustomScene;

// Add console warning if this file is imported
if (process.env.NODE_ENV !== 'production') {
  console.warn(
    '⚠️ Deprecated: You are importing CustomScene from ~/remotion/components/CustomScene.tsx, ' +
    'which has been renamed to AdbFetchingCustomScene. ' +
    'Please update your import to use either:\n' +
    '- ~/remotion/components/AdbFetchingCustomScene (if you need ADB fetching functionality)\n' +
    '- ~/remotion/components/scenes/CustomScene (if you need the component used in DynamicVideo)'
  );
} 