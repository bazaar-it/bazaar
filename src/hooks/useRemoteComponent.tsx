//src/hooks/useRemoteComponent.tsx
import React, { useState, useEffect, useMemo, Suspense } from 'react';
import * as Remotion from 'remotion';

/**
 * Custom hook for loading remote Remotion components from R2 storage
 * 
 * Uses a script tag approach to load components at runtime instead of dynamic imports
 * which avoids issues with ES module resolution in the browser.
 * 
 * @param componentId UUID of the custom component job
 * @returns A React component that renders the remote component
 */
export function useRemoteComponent(componentId: string | undefined) {
  const [component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (!componentId) return;
    setLoading(true);
    setError(null);
    
    // Clean up any previous component instance
    if (window.__REMOTION_COMPONENT) {
      delete window.__REMOTION_COMPONENT;
    }
    
    // Make global dependencies available
    window.React = React;
    window.Remotion = Remotion;
    
    // Create a script element to load the component
    const scriptId = `remotion-component-${componentId}`;
    const existingScript = document.getElementById(scriptId);
    if (existingScript) {
      existingScript.remove();
    }
    
    const script = document.createElement('script');
    script.id = scriptId;
    script.async = true;
    
    // Set up event handlers
    script.onload = () => {
      if (window.__REMOTION_COMPONENT) {
        setComponent(() => window.__REMOTION_COMPONENT!);
      } else {
        setError(new Error('Component failed to register itself'));
      }
      setLoading(false);
    };
    
    script.onerror = (e) => {
      console.error('Failed to load component script:', e);
      setError(new Error(`Failed to load component: ${componentId}`));
      setLoading(false);
    };
    
    // Use our API proxy route to load the component
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    script.src = `${origin}/api/components/${componentId}`;
    
    console.log(`Loading remote component from: ${script.src}`);
    document.body.appendChild(script);
    
    // Cleanup when unmounted
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, [componentId]);
  
  // Return a component that either renders the loaded component or an error/loading state
  return useMemo(() => {
    if (error) {
      return () => (
        <div style={{ padding: '1rem', backgroundColor: '#222', color: 'red', borderRadius: '4px' }}>
          Error loading component: {error.message}
        </div>
      );
    }
    
    if (loading || !component) {
      return () => (
        <div style={{ padding: '1rem', backgroundColor: '#222', color: '#fff', borderRadius: '4px' }}>
          Loading custom component...
        </div>
      );
    }
    
    return component;
  }, [component, error, loading]);
}

/**
 * Component for rendering a remote Remotion component
 * 
 * @param componentId UUID of the custom component job
 * @param props Props to pass to the remote component
 */
export function RemoteComponent({ 
  componentId, 
  ...props 
}: { 
  componentId: string; 
  [key: string]: any; 
}) {
  const Component = useRemoteComponent(componentId);
  return <Component {...props} />;
}
