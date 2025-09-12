/**
 * AST-based Iconify icon replacement
 * Replaces IconifyIcon components with inline SVGs at build time
 */
import { parse } from '@babel/parser';
import traverseFn from '@babel/traverse';
import generateFn from '@babel/generator';
import * as t from '@babel/types';

// Handle both ESM and CJS exports from Babel packages
// TypeScript may compile these differently
const traverse = typeof traverseFn === 'function' ? traverseFn : (traverseFn as any).default;
const generate = typeof generateFn === 'function' ? generateFn : (generateFn as any).default;
import { buildInlineSVG, preloadIcons } from './icon-loader';
import { extractIconNames } from './icon-replacement/extract-icon-names';
import { buildIconVisitors } from './icon-replacement/visitors';

type SvgDef = { attributes: Record<string, string>, body: string };

/**
 * Replace IconifyIcon components with inline SVGs using AST transformation
 */
export async function replaceIconifyIcons(code: string): Promise<string> {
  // Check if already transformed (idempotency)
  if (code.includes('__INLINE_ICON_MAP') || code.includes('__InlineIcon')) {
    console.log('[Icon Replace] Code already transformed, skipping');
    return code;
  }
  
  console.log('[Icon Replace] Starting icon replacement process');
  
  // First, extract all icon names for preloading
  const iconNames = extractIconNames(code);
  console.log(`[Icon Replace] Found ${iconNames.size} unique icon names:`, Array.from(iconNames));
  
  // If no icons found, return original code
  if (iconNames.size === 0) {
    console.log('[Icon Replace] No icons found, returning original code');
    return code;
  }
  
  // Preload all icons (with fallback chain)
  const iconMap = await preloadIcons(Array.from(iconNames));
  console.log(`[Icon Replace] Preloaded ${iconMap.size} icons`);
  
  // Check if we got all icons
  const missingIcons = Array.from(iconNames).filter(name => !iconMap.has(name));
  if (missingIcons.length > 0) {
    console.warn(`[Icon Replace] Some icons could not be loaded (will use fallbacks):`, missingIcons);
  }
  
  // For dynamic icons, inject a runtime map at the top of the code
  const needsRuntimeMap = code.includes('iconData[') || code.includes('icons[');
  
  if (needsRuntimeMap) {
    // Build the inline icon map for runtime usage
    const inlineMapEntries: string[] = [];
    for (const [name, svg] of iconMap.entries()) {
      const attrsStr = JSON.stringify(svg.attributes);
      const bodyStr = JSON.stringify(svg.body);
      inlineMapEntries.push(`  "${name}": { attributes: ${attrsStr}, body: ${bodyStr} }`);
    }
    
    const runtimeCode = `
// Inline icon map for dynamic icon usage
const __INLINE_ICON_MAP = {
${inlineMapEntries.join(',\n')}
};

// Runtime icon component for dynamic icons
function __InlineIcon(props) {
  const icon = props.icon;
  const def = __INLINE_ICON_MAP[icon];
  
  if (!def) {
    // Return a placeholder SVG for missing icons
    console.warn('[InlineIcon] Icon not found, using placeholder:', icon);
    return React.createElement('svg', {
      viewBox: '0 0 24 24',
      width: '1em',
      height: '1em',
      fill: 'currentColor',
      dangerouslySetInnerHTML: {
        __html: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/><text x="12" y="16" text-anchor="middle" font-size="14" fill="currentColor">?</text>'
      }
    });
  }
  
  // Merge props with icon attributes
  const svgProps = Object.assign({
    fill: 'currentColor',
    width: '1em',
    height: '1em'
  }, def.attributes, props);
  
  // Remove the 'icon' prop as it's not a valid SVG attribute
  delete svgProps.icon;
  
  // Add the SVG body
  svgProps.dangerouslySetInnerHTML = { __html: def.body };
  
  return React.createElement('svg', svgProps);
}
// Lowercase alias to handle any casing variations
const __inlineIcon = __InlineIcon;
`;
    
    // Prepend the runtime code
    code = runtimeCode + '\n' + code;
    console.log('[Icon Replace] Injected runtime icon map with', iconMap.size, 'icons');
  }
  
  // Now parse and transform the code
  let ast;
  try {
    ast = parse(code, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
      errorRecovery: true,
      ranges: true,
      tokens: true,
    });
  } catch (parseError) {
    console.error('[Icon Replace] Failed to parse code:', parseError);
    // Return code with just the runtime map if parsing fails
    return code;
  }
  
  // Validate that traverse is a function
  if (typeof traverse !== 'function') {
    console.error('[Icon Replace] traverse is not a function:', typeof traverse, traverse);
    console.error('[Icon Replace] Falling back to regex replacement');
    // Simple regex-based replacement as fallback
    return code;
  }
  
  let hasTransformations = false;
  let hasExportDefault = false;
  
  // Helper to create dangerouslySetInnerHTML object
  const toDangerousInnerHTML = (body: string) =>
    t.objectExpression([
      t.objectProperty(t.identifier('__html'), t.stringLiteral(body)),
    ]);
  
  try {
    const visitors = buildIconVisitors(iconMap as any, needsRuntimeMap, toDangerousInnerHTML);
    traverse(ast, {
      ExportDefaultDeclaration() { hasExportDefault = true; },
      JSXElement(path: any) { visitors.JSXElement(path); },
      CallExpression(path: any) { visitors.CallExpression(path); },
    });
  } catch (traverseError) {
    console.error('[Icon Replace] Failed to traverse AST:', traverseError);
    // Return code with runtime map but no AST transformations
    return code;
  }
  
  // Generate code from AST if we made transformations
  // Generate code from AST and detect if it changed
  let transformedCode = code;
  try {
    const output = generate(ast);
    transformedCode = output.code;
    hasTransformations = hasTransformations || transformedCode !== code;
    console.log('[Icon Replace] Generated code from transformed AST');
  } catch (genError) {
    console.error('[Icon Replace] Failed to generate code from AST:', genError);
    // Fall back to original code with runtime map
  }
  
  // Replace all IconifyIcon references in the final code
  // This is crucial - we MUST replace window.IconifyIcon with __InlineIcon
  // because window.IconifyIcon doesn't exist in Lambda
  if (needsRuntimeMap || hasTransformations) {
    // Replace all references to window.IconifyIcon or IconifyIcon
    let replacementCount = 0;
    
    // Replace window.IconifyIcon with __InlineIcon
    const windowReplacements = (transformedCode.match(/window\.IconifyIcon/g) || []).length;
    transformedCode = transformedCode.replace(/window\.IconifyIcon/g, '__InlineIcon');
    replacementCount += windowReplacements;
    
    // Replace standalone IconifyIcon with __InlineIcon  
    const standaloneReplacements = (transformedCode.match(/\bIconifyIcon\b/g) || []).length;
    transformedCode = transformedCode.replace(/\bIconifyIcon\b/g, '__InlineIcon');
    replacementCount += standaloneReplacements;
    
    console.log(`[Icon Replace] Replaced ${replacementCount} IconifyIcon references (${windowReplacements} window.IconifyIcon, ${standaloneReplacements} IconifyIcon)`);
  }
  
  // Add export default Component if not present
  if (!hasExportDefault && transformedCode.includes('function Component')) {
    transformedCode += '\nexport default Component;';
    console.log('[Icon Replace] Added export default Component');
  }
  
  console.log(`[Icon Replace] Transformation complete. Icons inlined: ${hasTransformations || needsRuntimeMap}`);
  
  // POST-VALIDATION: Ensure no window.IconifyIcon remains
  const remainingIcons = transformedCode.match(/window\.IconifyIcon/g);
  const bareIconifyRefs = transformedCode.match(/\bIconifyIcon\b/g);
  
  if ((remainingIcons && remainingIcons.length > 0) || (bareIconifyRefs && bareIconifyRefs.length > 0)) {
    console.error(`[Icon Replace] CRITICAL: Found IconifyIcon references that weren't replaced by AST`);
    console.error(`[Icon Replace] window.IconifyIcon: ${remainingIcons?.length || 0}, bare IconifyIcon: ${bareIconifyRefs?.length || 0}`);
    
    // We need to inject the runtime code if it wasn't already added
    if (!transformedCode.includes('function __InlineIcon')) {
      console.warn('[Icon Replace] Injecting runtime __InlineIcon function for force-replaced references');
      
      // Inject a minimal __InlineIcon that just returns a placeholder
      const minimalRuntime = `
// Minimal runtime for IconifyIcon references that weren't caught by AST
function __InlineIcon(props) {
  const { icon, ...rest } = props;
  console.warn('[Runtime] Rendering placeholder for uncaught icon:', icon);
  return React.createElement('svg', {
    width: rest.width || 24,
    height: rest.height || 24,
    viewBox: '0 0 24 24',
    fill: 'currentColor',
    ...rest
  }, React.createElement('rect', { x: 4, y: 4, width: 16, height: 16, rx: 2 }));
}
// Lowercase alias to handle any casing variations
const __inlineIcon = __InlineIcon;
`;
      transformedCode = minimalRuntime + '\n' + transformedCode;
    }
    
    // Standardize all references to use __InlineIcon (capital I)
    transformedCode = transformedCode.replace(/window\.IconifyIcon/g, '__InlineIcon');
    transformedCode = transformedCode.replace(/\bIconifyIcon\b/g, '__InlineIcon');
    console.warn('[Icon Replace] Force-replaced remaining IconifyIcon references with runtime fallback');
  }
  
  // Final validation
  const finalCheck = transformedCode.match(/window\.IconifyIcon|\bIconifyIcon\b/g);
  if (finalCheck && finalCheck.length > 0) {
    console.error('[Icon Replace] POST-VALIDATION FAILED: IconifyIcon references still present after all replacements!');
    throw new Error('Failed to replace all IconifyIcon references - export will fail');
  } else {
    console.log('[Icon Replace] ✅ POST-VALIDATION PASSED: No IconifyIcon references remaining');
  }
  
  return transformedCode;
}
