// <stdin>
import React, { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { AbsoluteFill, continueRender, useVideoConfig, useCurrentFrame } from "remotion";
var CustomScene = ({ data }) => {
  const componentId = data.componentId;
  const externalRefreshToken = data.refreshToken;
  console.log(`[CustomScene] Mounting/rendering with componentId: ${componentId}, refreshToken: ${externalRefreshToken}`);
  const [adbData, setAdbData] = useState(null);
  const [error, setError] = useState(null);
  const [fetchedMetadata, setFetchedMetadata] = useState(null);
  const [loading, setLoading] = useState(!!componentId);
  const [refreshKey, setRefreshKey] = useState(
    () => externalRefreshToken ? `${externalRefreshToken}-${Date.now()}` : `initial-${Date.now()}`
  );
  const updateLoadingState = (newLoadingState, caller) => {
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
      console.log("[CustomScene] Calling continueRender for handle:", handle);
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
  const fetchAdbData = useCallback(async () => {
    let timeoutId = null;
    try {
      console.log(`[CustomScene fetchAdbData] Fetching metadata for ${componentId}, refreshKey: ${refreshKey}`);
      const apiTimestamp = Date.now();
      const controller = new AbortController();
      timeoutId = setTimeout(() => {
        controller.abort();
        console.error(`[CustomScene] Metadata fetch timeout for component ${componentId} after 5 seconds`);
      }, 5e3);
      const metaResponse = await fetch(`/api/components/${componentId}/metadata.json?t=${apiTimestamp}`, {
        signal: controller.signal
      });
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = null;
      if (!metaResponse.ok) {
        console.error(`[CustomScene fetchAdbData] Metadata fetch failed for ${componentId}. Status: ${metaResponse.status}, Text: ${metaResponse.statusText}`);
        const errorText = await metaResponse.text().catch(() => "Could not read error text");
        throw new Error(`Metadata fetch failed: ${metaResponse.statusText || metaResponse.status} - ${errorText}`);
      }
      const metadata = await metaResponse.json();
      setFetchedMetadata(metadata);
      console.log("[CustomScene fetchAdbData] Fetched metadata:", metadata);
      if (metadata.adbId) {
        console.log(`[CustomScene fetchAdbData] Fetching ADB data for ${metadata.adbId}`);
        const adbTimestamp = Date.now();
        const adbController = new AbortController();
        timeoutId = setTimeout(() => {
          adbController.abort();
          console.error(`[CustomScene] ADB fetch timeout for ${metadata.adbId} after 5 seconds`);
        }, 5e3);
        const adbResponse = await fetch(`/api/adbs/${metadata.adbId}.json?t=${adbTimestamp}`, {
          signal: adbController.signal
        });
        if (timeoutId) clearTimeout(timeoutId);
        timeoutId = null;
        if (!adbResponse.ok) {
          console.error(`[CustomScene fetchAdbData] ADB fetch failed for ${metadata.adbId}. Status: ${adbResponse.status}, Text: ${adbResponse.statusText}`);
          const errorText = await adbResponse.text().catch(() => "Could not read error text");
          throw new Error(`ADB fetch failed: ${adbResponse.statusText || adbResponse.status} - ${errorText}`);
        }
        const adb = await adbResponse.json();
        setAdbData(adb.designBrief);
        console.log("[CustomScene fetchAdbData] Fetched ADB data:", adb.designBrief);
      } else {
        console.warn(`[CustomScene fetchAdbData] No adbId found in metadata for component ${componentId}.`);
        setAdbData(null);
      }
    } catch (e) {
      if (timeoutId) clearTimeout(timeoutId);
      console.error(`[CustomScene fetchAdbData] Error during data fetching for ${componentId}:`, e);
      setError(e.message || "Failed to load component data.");
      setAdbData(null);
    } finally {
      console.log(`[CustomScene fetchAdbData] In finally block for ${componentId}. Current loading: ${loading}. Will set loading to false.`);
      updateLoadingState(false, "fetchAdbData finally");
      callContinueRenderOnce();
    }
  }, [componentId, refreshKey, callContinueRenderOnce]);
  useEffect(() => {
    console.log(`[CustomScene useEffect for fetch] Triggered. componentId: ${componentId}, loading: ${loading}, error: ${error}, refreshKey: ${refreshKey}`);
    if (componentId) {
      if (!loading && !error) {
        updateLoadingState(true, "useEffect for new fetch");
      }
      fetchAdbData();
    } else {
      console.log("[CustomScene useEffect for fetch] No componentId, clearing state and setting error.");
      setAdbData(null);
      setFetchedMetadata(null);
      setError("Component ID is missing for fetch.");
      updateLoadingState(false, "useEffect no componentId");
      callContinueRenderOnce();
    }
  }, [componentId, fetchAdbData, refreshKey, error]);
  console.log(`[CustomScene RENDER] componentId: ${componentId}, id: ${id}, loading: ${loading}, error: ${JSON.stringify(error)}, adbData: ${adbData ? adbData.id : "null"}, fetchedMetadata: ${fetchedMetadata ? fetchedMetadata.componentName : "null"}, refreshKey: ${refreshKey}`);
  const handleRetry = () => {
    console.log("[CustomScene] Retry button clicked. Clearing error and re-triggering fetch via refreshKey.");
    setLoading(true);
    setError(null);
    setAdbData(null);
    setRefreshKey(`retry-${Date.now()}`);
  };
  const componentToRender = fetchedMetadata?.componentName || data.componentName;
  const scriptSrcToUse = fetchedMetadata?.scriptSrc || data.src;
  console.log(`[CustomScene] Preparing to render <RemoteComponent /> with: componentName=${componentToRender}, scriptSrc=${scriptSrcToUse}, adbDataId=${adbData?.id}, errorState=${error}, loadingState=${loading}`);
  if (error) {
    console.log("[CustomScene] Rendering: Error UI due to internal error state");
    return /* @__PURE__ */ React.createElement(
      AbsoluteFill,
      {
        style: {
          backgroundColor: "#222",
          color: "red",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }
      },
      /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("h2", null, "Component Error"), /* @__PURE__ */ React.createElement("p", null, error), /* @__PURE__ */ React.createElement(
        "button",
        {
          onClick: handleRetry,
          style: {
            background: "white",
            border: "1px solid red",
            color: "red",
            borderRadius: "0.25rem",
            padding: "0.5rem 1rem",
            cursor: "pointer",
            marginTop: "1rem"
          }
        },
        "Retry Loading"
      ))
    );
  }
  if (!componentId) {
    console.log("[CustomScene] Rendering: Error UI due to missing componentId");
    return /* @__PURE__ */ React.createElement(AbsoluteFill, { style: {
      backgroundColor: "#222",
      color: "white",
      display: "flex",
      alignItems: "center",
      justifyContent: "center"
    } }, /* @__PURE__ */ React.createElement("div", { style: { textAlign: "center" } }, /* @__PURE__ */ React.createElement("h2", null, "Configuration Error"), /* @__PURE__ */ React.createElement("p", null, "Component ID is missing.")));
  }
  return /* @__PURE__ */ React.createElement(AbsoluteFill, { style: {
    backgroundColor: "#222",
    color: "white",
    display: "flex",
    alignItems: "center",
    justifyContent: "center"
  } }, /* @__PURE__ */ React.createElement(ErrorBoundary, { FallbackComponent: ({ error: error2, resetErrorBoundary }) => /* @__PURE__ */ React.createElement("div", { className: "error-fallback p-4 bg-red-100 text-red-800 rounded" }, /* @__PURE__ */ React.createElement("h3", { className: "font-bold" }, "Error in component:"), /* @__PURE__ */ React.createElement("p", null, error2.message), /* @__PURE__ */ React.createElement(
    "button",
    {
      onClick: resetErrorBoundary,
      className: "mt-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
    },
    "Retry"
  )), onReset: () => {
    console.log("[CustomScene ErrorBoundary] onReset triggered. Retrying...");
    handleRetry();
  } }, /* @__PURE__ */ React.createElement(Suspense, { fallback: /* @__PURE__ */ React.createElement("div", { className: "loading-fallback p-4 bg-blue-100 text-blue-800 rounded flex items-center justify-center" }, /* @__PURE__ */ React.createElement("div", { className: "text-center" }, /* @__PURE__ */ React.createElement("div", { className: "animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent mx-auto mb-2" }), /* @__PURE__ */ React.createElement("p", null, "Loading dynamic component... ", componentId))) }, /* @__PURE__ */ React.createElement(
    RemoteComponent,
    {
      componentName: componentToRender,
      scriptSrc: scriptSrcToUse,
      componentProps: {
        ...data.componentProps || {},
        ...{
          componentProps: {
            id: adbData?.id || componentId || "default-component-id",
            width,
            height,
            durationInFrames,
            fps
          }
        }?.componentProps || {},
        ...adbData || {},
        // Pass ADB data; ensure it doesn't overwrite if componentProps has 'id' etc.
        adbData,
        // Explicitly pass adbData under its own key as well
        designBrief: adbData
        // common alternative name
      },
      id: adbData?.id || componentId || "remote-component-default-id",
      error,
      onStateChange: (remoteState) => {
        console.log("[CustomScene onStateChange from RemoteComponent]", remoteState);
        if (remoteState.state === "error" && !error) {
          setError(`RemoteComponent error: ${remoteState.error?.message || "Unknown error"}`);
        }
      },
      key: `remote-${componentToRender}-${scriptSrcToUse}-${refreshKey}`
    }
  ))));
};
var stdin_default = CustomScene;
export {
  CustomScene,
  stdin_default as default
};
