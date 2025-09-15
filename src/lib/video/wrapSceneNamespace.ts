// src/lib/video/wrapSceneNamespace.ts
// Helper to isolate a scene in an IIFE namespace and safely remap frame reads with an offset.

// See memory-bank/sprints/sprint98_autofix_analysis/preview-namespacing-followups.md
// Stable-ID namespacing and redeclaration tolerance prevent preview crashes when
// scenes are inserted/reordered or when a wrapper is emitted twice in one module.
export type WrapNamespaceParams = {
  sceneCode: string;
  index: number; // scene index in ordered list
  componentName: string; // compiled component name to return from the namespace
  startOffset?: number; // optional frame offset to add to useCurrentFrame
  namespaceName?: string; // optional stable namespace to use instead of index-based
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

// Wrap scene code in an IIFE and return a small API { Comp } under a stable name.
// - Use ID-based namespace (preferred) passed via namespaceName to avoid index drift.
// - Use 'var' for the outer binding so duplicate inclusions don't throw.
// - Optionally remap useCurrentFrame() to apply a startOffset without mutating globals.
export function wrapSceneNamespace(params: WrapNamespaceParams): WrapNamespaceResult {
  const { sceneCode, index, componentName } = params;
  const startOffset = Math.max(0, Math.floor(params.startOffset || 0));

  const sceneNamespaceName = params.namespaceName || `SceneNS_${index}`;
  const compVar = `__SceneComp_${index}`;

  // Prepare offset header + code rewrite.
  let offsetHeader = '';
  let namespacedBody = sceneCode;
  // Sanitize risky template-literal style attributes that can collide when concatenated
  try {
    namespacedBody = namespacedBody
      .replace(/transform:\s*`translate\(\$\{([^}]+)\}px,\s*\$\{([^}]+)\}px\)`/g, "transform: 'translate(' + $1 + 'px, ' + $2 + 'px)'")
      .replace(/transform:\s*`translateY\(\$\{([^}]+)\}%\)`/g, "transform: 'translateY(' + $1 + '%)'")
      .replace(/transform:\s*`scale\(\$\{([^}]+)\}\)`/g, "transform: 'scale(' + $1 + ')'")
      .replace(/viewBox\s*:\s*`0 0 \$\{([^}]+)\}\s+\$\{([^}]+)\}`/g, "viewBox: '0 0 ' + $1 + ' ' + $2");

    // Namespace SVG defs/filters IDs and their url(#...) references to avoid cross‑scene collisions
    const svgIdPrefix = sceneNamespaceName + '__';
    // Prefix ids defined on common SVG defs elements
    namespacedBody = namespacedBody.replace(
      /(React\.createElement\s*\(\s*['\"](?:linearGradient|radialGradient|filter|clipPath|mask|pattern)['\"]\s*,\s*\{[^}]*?\bid\s*:\s*['\"])([^'\"]+)(['\"])\s*/g,
      (_m, p1, id, p4) => `${p1}${svgIdPrefix}${id}${p4}`
    );
    // Update url(#...) references
    namespacedBody = namespacedBody.replace(/url\(#([^\)]+)\)/g, (_m, id) => `url(#${svgIdPrefix}${id})`);
  } catch {}
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

  // Detect server-compiled auto-return at EOF (e.g., `return TemplateScene;`)
  const hasAutoReturn = /\n\s*return\s+[A-Za-z_$][\w$]*\s*;\s*$/.test(namespacedBody);

  // Build the wrapped code
  const wrapped = (
    hasAutoReturn
      ? [
          `// Isolated namespace for Scene ${index}`,
          `var ${sceneNamespaceName} = (() => {`,
          offsetHeader,
          `  var ${compVar} = (function(){`,
          namespacedBody,
          `  })();`,
          `  return { Comp: ${compVar} };`,
          `})();`,
        ]
      : [
          `// Isolated namespace for Scene ${index}`,
          `var ${sceneNamespaceName} = (() => {`,
          offsetHeader,
          namespacedBody,
          `  return { Comp: ${componentName} };`,
          `})();`,
        ]
  )
    .filter(Boolean)
    .join('\n');

  // Best-effort detection of referenced Remotion functions for import hoisting
  const usedRemotionFns = REMOTION_FN_CANDIDATES.filter((fn) => wrapped.includes(fn));

  return { code: wrapped, usedRemotionFns };
}
