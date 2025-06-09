//src/remotion/components/scenes/CustomScene.tsx
import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { AbsoluteFill, continueRender, delayRender, staticFile, useVideoConfig, useCurrentFrame } from 'remotion';
import { RemoteComponent } from '~/hooks/useRemoteComponent';
import type { SceneProps } from '.';
import type { AnimationDesignBrief } from '~/lib/types/video/animationDesignBrief.schema';
import { ErrorBoundary } from 'react-error-boundary';

// Define component metadata interface
interface ComponentMetadata {
  id: string;
  name: string;
  description?: string;
  version?: string;
  [key: string]: any;
}

// Add missing scene data to the AnimationDesignBrief for testing
interface ExtendedAnimationDesignBrief extends AnimationDesignBrief {
  scenes?: Array<{
    sceneConfig?: {
      durationInFrames?: number;
      dimensions?: {
        width?: number;
        height?: number;
      };
    };
  }>;
  id?: string;
}

// Export the interface
export interface CustomSceneProps extends SceneProps {
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
  const componentId = data.componentId;
  const externalRefreshToken = data.refreshToken; 
  
  console.log(`[CustomScene] Mounting/rendering with componentId: ${componentId}, refreshToken: ${externalRefreshToken}`);
  
  const [adbData, setAdbData] = useState<ExtendedAnimationDesignBrief | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fetchedMetadata, setFetchedMetadata] = useState<ComponentMetadata | null>(null);
  const [loading, setLoading] = useState(!!componentId); 
  const [refreshKey, setRefreshKey] = useState<string>(() => 
    externalRefreshToken ? `${externalRefreshToken}-${Date.now()}` : `initial-${Date.now()}`
  );

  const updateLoadingState = (newLoadingState: boolean, caller: string) => {
    console.log(`[CustomScene updateLoadingState] Caller: ${caller}, Current loading: ${loading}, Attempting to set loading to: ${newLoadingState}, componentId: ${componentId}`);
    setLoading(newLoadingState);
  };

  const videoConfig = useVideoConfig();
  const { fps } = videoConfig;
  const durationInFrames = adbData?.scenes?.[0]?.sceneConfig?.durationInFrames ?? videoConfig.durationInFrames;
  const width = adbData?.scenes?.[0]?.sceneConfig?.dimensions?.width ?? videoConfig.width;
  const height = adbData?.scenes?.[0]?.sceneConfig?.dimensions?.height ?? videoConfig.height;

  const handle = useCurrentFrame();
  const continueRenderCalledRef = useRef(false);

  const callContinueRenderOnce = useCallback(() => {
    if (!continueRenderCalledRef.current) {
      console.log('[CustomScene] Calling continueRender for handle:', handle);
      continueRender(handle);
      continueRenderCalledRef.current = true;
    }
  }, [handle]);

  useEffect(() => {
    if (externalRefreshToken) {
      setRefreshKey(`${externalRefreshToken}-${Date.now()}`);
      console.log(`[CustomScene] externalRefreshToken changed, new refreshKey: ${externalRefreshToken}-${Date.now()}`);
    }
  }, [externalRefreshToken]);
  
  // Define fetchAdbData with useCallback
  const fetchAdbData = useCallback(async () => {
    let timeoutId: NodeJS.Timeout | null = null;
    // setLoading(true) is handled by initial state or the calling useEffect
    try {
      console.log(`[CustomScene fetchAdbData] Fetching metadata for ${componentId}, refreshKey: ${refreshKey}`);
      const apiTimestamp = Date.now();
      const controller = new AbortController();
      timeoutId = setTimeout(() => {
        controller.abort();
        console.error(`[CustomScene] Metadata fetch timeout for component ${componentId} after 5 seconds`);
      }, 5000);

      const metaResponse = await fetch(`/api/components/${componentId}/metadata.json?t=${apiTimestamp}`, {
        signal: controller.signal,
      });

      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = null;

      if (!metaResponse.ok) {
        console.error(`[CustomScene fetchAdbData] Metadata fetch failed for ${componentId}. Status: ${metaResponse.status}, Text: ${metaResponse.statusText}`);
        const errorText = await metaResponse.text().catch(() => 'Could not read error text');
        throw new Error(`Metadata fetch failed: ${metaResponse.statusText || metaResponse.status} - ${errorText}`);
      }
      const metadata = await metaResponse.json();
      setFetchedMetadata(metadata);
      console.log('[CustomScene fetchAdbData] Fetched metadata:', metadata);

      // SIMPLIFIED: No animation design brief needed - components are self-contained
      console.log(`[CustomScene] Skipping ADB fetch for ${componentId} - using simplified component loading`);
      setAdbData(null);
    } catch (e: any) {
      if (timeoutId) clearTimeout(timeoutId);
      console.error(`[CustomScene fetchAdbData] Error during data fetching for ${componentId}:`, e);
      setError(e.message || 'Failed to load component data.');
      setAdbData(null); 
    } finally {
      console.log(`[CustomScene fetchAdbData] In finally block for ${componentId}. Current loading: ${loading}. Will set loading to false.`);
      updateLoadingState(false, 'fetchAdbData finally');
      callContinueRenderOnce();
    }
  }, [componentId, refreshKey, callContinueRenderOnce]); // Removed 'loading' from here as updateLoadingState handles it

  useEffect(() => {
    console.log(`[CustomScene useEffect for fetch] Triggered. componentId: ${componentId}, loading: ${loading}, error: ${error}, refreshKey: ${refreshKey}`);
    if (componentId) {
      if (!loading && !error) { // Only start loading if not already loading and no prior error for this key
        updateLoadingState(true, 'useEffect for new fetch');
      }
      fetchAdbData();
    } else {
      console.log('[CustomScene useEffect for fetch] No componentId, clearing state and setting error.');
      setAdbData(null);
      setFetchedMetadata(null);
      setError('Component ID is missing for fetch.');
      updateLoadingState(false, 'useEffect no componentId');
      callContinueRenderOnce(); // Ensure render continues if no componentId
    }
  }, [componentId, fetchAdbData, refreshKey, error]); // Added error to prevent re-fetch loops on error

  console.log(`[CustomScene RENDER] componentId: ${componentId}, loading: ${loading}, error: ${JSON.stringify(error)}, adbData: ${adbData ? adbData.id : 'null'}, fetchedMetadata: ${fetchedMetadata ? fetchedMetadata.componentName : 'null'}, refreshKey: ${refreshKey}`);

  const handleRetry = () => {
    console.log('[CustomScene] Retry button clicked. Clearing error and re-triggering fetch via refreshKey.');
    setLoading(true);
    setError(null);
    setAdbData(null);
    // Generate a new timestamp to force remount on retry - using string format to match state type
    setRefreshKey(`retry-${Date.now()}`);
  };

  const componentToRender = fetchedMetadata?.componentName || data.componentName;
  const scriptSrcToUse = fetchedMetadata?.scriptSrc || data.src;

  console.log(`[CustomScene] Preparing to render <RemoteComponent /> with: componentName=${componentToRender}, scriptSrc=${scriptSrcToUse}, adbDataId=${adbData?.id}, errorState=${error}, loadingState=${loading}`);

  // If there's a component-level error (e.g. failed to fetch metadata or ADB), show error UI.
  if (error) {
    console.log('[CustomScene] Rendering: Error UI due to internal error state');
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

  // If no componentId was provided initially.
  if (!componentId) {
    console.log('[CustomScene] Rendering: Error UI due to missing componentId');
    return (
      <AbsoluteFill style={{
        backgroundColor: '#222',
        color: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Configuration Error</h2>
          <p>Component ID is missing.</p>
        </div>
      </AbsoluteFill>
    );
  }

  // This covers the case where RemoteComponent itself might be trying to load its script.
  // CustomScene's own `loading` state is for fetching ADB/metadata.
  // `RemoteComponent` will manage its own script loading state via its `isLoading` prop.
  return (
    <AbsoluteFill style={{
      backgroundColor: '#222',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <ErrorBoundary FallbackComponent={({ error, resetErrorBoundary }) => (
        <div className="error-fallback p-4 bg-red-100 text-red-800 rounded">
          <h3 className="font-bold">Error in component:</h3>
          <p>{error.message}</p>
          <button 
            onClick={resetErrorBoundary}
            className="mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      )} onReset={() => {
        console.log('[CustomScene ErrorBoundary] onReset triggered. Retrying...');
        handleRetry();
      }}>
        <Suspense fallback={
          <div className="loading-fallback p-4 bg-blue-100 text-blue-800 rounded flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mx-auto mb-2"></div>
              <p>Loading dynamic component... {componentId}</p>
            </div>
          </div>
        }>
          <RemoteComponent
            componentName={componentToRender}
            scriptSrc={scriptSrcToUse}
            componentProps={{ 
              ...(data.componentProps || {}),
              ...{
                componentProps: {
                  id: adbData?.id || componentId || 'default-component-id',
                  width: width,
                  height: height,
                  durationInFrames: durationInFrames,
                  fps: fps,
                }
              }?.componentProps || {},
              ...(adbData || {}), // Pass ADB data; ensure it doesn't overwrite if componentProps has 'id' etc.
              adbData: adbData, // Explicitly pass adbData under its own key as well
              designBrief: adbData, // common alternative name
            }}
            id={(adbData?.id || componentId || 'remote-component-default-id')}
            error={error} // Pass CustomScene's error state to RemoteComponent
            // isLoading is managed by RemoteComponent itself for script loading
            // CustomScene's `loading` state is for its own data fetching (ADB/metadata)
            // onStateChange can be used by RemoteComponent to inform CustomScene about its internal state (e.g. script loaded, error)
            onStateChange={(remoteState: any) => {
              console.log('[CustomScene onStateChange from RemoteComponent]', remoteState);
              if (remoteState.state === 'error' && !error) { // If RemoteComponent errors and CustomScene doesn't already have an error
                setError(`RemoteComponent error: ${remoteState.error?.message || 'Unknown error'}`);
              }
              // We might not need to do anything with 'loading' or 'loaded' from RemoteComponent here,
              // as CustomScene has its own primary loading/error states for ADB/metadata.
            }}
            // Pass a unique key to RemoteComponent when we want to force a full remount/reload, e.g. on refresh or retry
            // Note: The refreshKey from CustomScene might be more for ADB data refresh. 
            // RemoteComponent might need its own re-fetch mechanism if its scriptSrc changes or needs a cache bust.
            // For now, using refreshKey ensures that if ADB changes, RemoteComponent re-evaluates.
            key={`remote-${componentToRender}-${scriptSrcToUse}-${refreshKey}`}
          />
        </Suspense>
      </ErrorBoundary>
    </AbsoluteFill>
  );
};
