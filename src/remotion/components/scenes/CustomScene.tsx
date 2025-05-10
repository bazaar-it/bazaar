//src/remotion/components/scenes/CustomScene.tsx
import React, { useState, useEffect } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile } from 'remotion';
import { RemoteComponent } from '~/hooks/useRemoteComponent';
import type { SceneProps } from './index';
import type { AnimationDesignBrief } from '~/lib/schemas/animationDesignBrief.schema';

// Add refreshToken to the data expected from props
interface CustomSceneProps extends SceneProps {
  data: {
    componentId: string;
    refreshToken?: string;
    [key: string]: any;
  }
}

/**
 * Custom component scene for Remotion
 * 
 * Renders a dynamically loaded custom component from R2 storage.
 * Uses the `componentId` from the scene data to fetch and render
 * the component.
 * 
 * Fetches the Animation Design Brief associated with the component
 * and passes it to the RemoteComponent.
 * 
 * @param props Scene props with data.componentId required
 * @returns Rendered custom component
 */
export const CustomScene: React.FC<CustomSceneProps> = ({ data }) => {
  const componentId = data.componentId as string;
  const externalRefreshToken = data.refreshToken; // Get refreshToken passed from parent
  
  console.log(`[CustomScene] Mounting/rendering with componentId: ${componentId}, refreshToken: ${externalRefreshToken}`);
  
  // Generate a new timestamp for each render to force cache busting
  const [timestamp] = useState(() => Date.now());
  const [adbData, setAdbData] = useState<AnimationDesignBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Use refreshKey to force remounts, initialize with external refreshToken if provided
  const [refreshKey, setRefreshKey] = useState<string>(() => 
    externalRefreshToken ? `${externalRefreshToken}-${Date.now()}` : `${Date.now()}`
  );
  
  // Update refreshKey if externalRefreshToken changes
  useEffect(() => {
    if (externalRefreshToken) {
      setRefreshKey(`${externalRefreshToken}-${Date.now()}`);
    }
  }, [externalRefreshToken]);
  
  // Use delayRender/continueRender to pause rendering until ADB is loaded
  const [handle] = useState(() => delayRender("Loading Animation Design Brief"));
  
  const handleRetry = () => {
    console.log('[CustomScene] Retrying component load for:', componentId);
    setLoading(true);
    setError(null);
    setAdbData(null);
    // Generate a new timestamp to force remount on retry - using string format to match state type
    setRefreshKey(`retry-${Date.now()}`);
  };
  
  useEffect(() => {
    if (!componentId) {
      continueRender(handle);
      return;
    }
    
    async function fetchAdbData() {
      try {
        setLoading(true);
        
        // First, find out what ADB ID is associated with this component
        // Add cache-busting timestamp to all API requests
        const apiTimestamp = Date.now(); // Fresh timestamp for API call
        const componentJobResponse = await fetch(`/api/components/${componentId}/metadata?t=${apiTimestamp}`);
        
        if (!componentJobResponse.ok) {
          throw new Error(`Failed to fetch component metadata: ${componentJobResponse.status}`);
        }
        
        const jobMetadata = await componentJobResponse.json();
        const animationDesignBriefId = jobMetadata?.animationDesignBriefId;
        
        if (!animationDesignBriefId) {
          throw new Error("Component job doesn't have an associated Animation Design Brief ID");
        }
        
        // Then, fetch the actual ADB data with a fresh cache-busting timestamp
        const adbResponse = await fetch(`/api/animation-design-briefs/${animationDesignBriefId}?t=${Date.now()}`);
        
        if (!adbResponse.ok) {
          throw new Error(`Failed to fetch Animation Design Brief: ${adbResponse.status}`);
        }
        
        const adbResponseData = await adbResponse.json();
        console.log(`[CustomScene] Successfully fetched ADB for component ${componentId}:`, adbResponseData.designBrief?.sceneId);
        setAdbData(adbResponseData.designBrief);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[CustomScene] Failed to fetch ADB for component ${componentId}:`, errorMessage);
        setError(errorMessage);
      } finally {
        setLoading(false);
        continueRender(handle);
      }
    }
    
    fetchAdbData();
    
    return () => {
      // Cleanup if the component unmounts
    };
  }, [componentId, handle, refreshKey]); // Use refreshKey instead of timestamp to trigger refetches

  if (!componentId) {
    // Fallback for missing componentId
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#222',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2>Custom Component Error</h2>
          <p>No component ID specified</p>
        </div>
      </AbsoluteFill>
    );
  }
  
  if (loading) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#222',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2>Loading Component Data...</h2>
          <p>Component ID: {componentId.substring(0, 8)}...</p>
        </div>
      </AbsoluteFill>
    );
  }
  
  if (error) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#222',
          color: 'red',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <h2>Component Error</h2>
          <p>{error}</p>
          <button 
            onClick={handleRetry}
            style={{
              background: 'white',
              border: '1px solid red',
              color: 'red',
              borderRadius: '0.25rem',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              marginTop: '1rem'
            }}
          >
            Retry Loading
          </button>
        </div>
      </AbsoluteFill>
    );
  }

  // Add a key to the RemoteComponent based on refreshKey to force remount
  return (
    <AbsoluteFill>
      <RemoteComponent 
        key={`component-${componentId}-${refreshKey}`}
        componentId={componentId} 
        brief={adbData} // Pass the Animation Design Brief
        {...(data.refreshToken ? {refreshToken: data.refreshToken} : {})} // Pass refreshToken if it exists
        {...(Object.keys(data).filter(k => k !== 'componentId' && k !== 'refreshToken').reduce((obj, key) => ({...obj, [key]: data[key]}), {}))} // Pass other props without duplicating componentId
      />
    </AbsoluteFill>
  );
};
