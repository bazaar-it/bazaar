// src/lib/video/wrapSceneNamespace.ts
// Helper to isolate a scene in an IIFE namespace and safely remap frame reads with an offset.

export type WrapNamespaceParams = {
  sceneCode: string;
  index: number; // scene index in ordered list
  componentName: string; // compiled component name to return from the namespace
  startOffset?: number; // optional frame offset to add to useCurrentFrame
};

export type WrapNamespaceResult = {
  code: string; // full wrapped code (IIFE + optional header + original code)
  usedRemotionFns: string[]; // best-effort set of Remotion hooks/exports referenced
};

// Very lightweight scan for common Remotion imports referenced inside a scene.
const REMOTION_FN_CANDIDATES = [
  'useCurrentFrame',
  'useVideoConfig',
  'interpolate',
  'spring',
  'Sequence',
  'Audio',
  'Video',
  'Img',
  'staticFile',
  'random',
];

export function wrapSceneNamespace(params: WrapNamespaceParams): WrapNamespaceResult {
  const { sceneCode, index, componentName } = params;
  const startOffset = Math.max(0, Math.floor(params.startOffset || 0));

  const sceneNamespaceName = `SceneNS_${index}`;

  // Prepare offset header + code rewrite.
  let offsetHeader = '';
  let namespacedBody = sceneCode;
  if (startOffset > 0) {
    try {
      // Define a helper that adds the startOffset without mutating globals.
      offsetHeader = `// Frame offset helper for Scene ${index}\nconst __offsetUseCurrentFrame_${index} = () => (useCurrentFrame() + ${startOffset});`;
      // Replace fully-qualified calls first, then bare calls, to avoid partial artifacts.
      namespacedBody = namespacedBody
        .replace(/window\.Remotion\s*\.useCurrentFrame\s*\(\s*\)/g, `__offsetUseCurrentFrame_${index}()`)
        .replace(/\buseCurrentFrame\s*\(\s*\)/g, `__offsetUseCurrentFrame_${index}()`);
    } catch (e) {
      // If anything goes wrong, fall back to original code and drop the offset remap.
      // This preserves playback rather than breaking the whole preview.
      // eslint-disable-next-line no-console
      console.warn('[wrapSceneNamespace] Failed to remap useCurrentFrame calls:', e);
      offsetHeader = '';
      namespacedBody = sceneCode;
    }
  }

  // Build the wrapped code
  const wrapped = [
    `// Isolated namespace for Scene ${index}`,
    `const ${sceneNamespaceName} = (() => {`,
    offsetHeader,
    namespacedBody,
    `  return { Comp: ${componentName} };`,
    `})();`,
  ]
    .filter(Boolean)
    .join('\n');

  // Best-effort detection of referenced Remotion functions for import hoisting
  const usedRemotionFns = REMOTION_FN_CANDIDATES.filter((fn) => wrapped.includes(fn));

  return { code: wrapped, usedRemotionFns };
}

