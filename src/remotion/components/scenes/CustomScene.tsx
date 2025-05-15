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
      let timeoutId: NodeJS.Timeout | null = null;
      
      try {
        setLoading(true);
        
        // First, find out what ADB ID is associated with this component
        // Add cache-busting timestamp to all API requests
        const apiTimestamp = Date.now(); // Fresh timestamp for API call
        console.log(`[CustomScene] Fetching component metadata: /api/components/${componentId}/metadata?t=${apiTimestamp}`);
        
        // Create an AbortController with timeout capability
        const controller = new AbortController();
        timeoutId = setTimeout(() => {
          controller.abort();
          console.error(`[CustomScene] Metadata fetch timeout for component ${componentId} after 5 seconds`);
        }, 5000);
        
        // Fetch component metadata
        const componentJobResponse = await fetch(`/api/components/${componentId}/metadata?t=${apiTimestamp}`, {
          signal: controller.signal
        });
        
        // Clear timeout as soon as we get a response
        if (timeoutId) {
          clearTimeout(timeoutId);
          timeoutId = null;
        }
        
        if (!componentJobResponse.ok) {
          // Check for 400 response with specific error about Animation Design Brief
          if (componentJobResponse.status === 400) {
            // Try to parse the error response
            try {
              const errorData = await componentJobResponse.json();
              
              // If this is specifically about a missing ADB ID, we can handle it gracefully
              if (errorData?.error === "Animation design brief ID not found" || 
                  (errorData?.message && errorData.message.includes("animation design brief"))) {
                console.warn(`[CustomScene] Component ${componentId} does not have an ADB ID. Using default data.`);
                // Continue without ADB data - just set it to null and proceed
                setAdbData(null);
                return; // Skip the rest of the function, but don't throw an error
              }
            } catch (parseError) {
              // If we can't parse the error, fall through to the general error handling
              console.error('[CustomScene] Error parsing 400 response:', parseError);
            }
          }
          
          throw new Error(`Failed to fetch component metadata: ${componentJobResponse.status}`);
        }
        
        // Parse the JSON response
        let jobMetadata;
        try {
          jobMetadata = await componentJobResponse.json();
        } catch (jsonError: any) {
          console.error('[CustomScene] JSON parse error:', jsonError);
          throw new Error(`Failed to parse component metadata response: ${jsonError.message}`);
        }
        
        const animationDesignBriefId = jobMetadata?.animationDesignBriefId;
      
        if (!animationDesignBriefId) {
          console.warn(`[CustomScene] Component ${componentId} doesn't have an associated ADB ID in its metadata. Using default data.`);
          // Set ADB data to null and continue instead of throwing an error
          setAdbData(null);
          return; // Skip the rest of the function
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
        // Clean up timeout if it's still active
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        
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
        scriptSrc={data.src as string} // Pass the R2 URL as scriptSrc
        databaseId={componentId}      // Pass the DB job ID as databaseId
        brief={adbData || {}} 
        // Pass other data props, ensuring original componentId (database ID) is available if needed
        // and refreshToken. We already pass databaseId explicitly.
        {...{
          ...Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'src' && key !== 'componentId')),
          // databaseComponentId: componentId, // No longer needed, use databaseId prop
          ...(data.refreshToken && { refreshToken: data.refreshToken }),
        }}
      />
    </AbsoluteFill>
  );
};
