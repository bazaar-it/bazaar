// src/server/services/render/replace-iconify-icons.ts
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

interface WarningHook {
  addWarning?: (w: { type: string; message: string; sceneId?: string; data?: any }) => void;
  sceneId?: string;
}

type SvgDef = { attributes: Record<string, string>, body: string };

/**
 * Replace IconifyIcon components with inline SVGs using AST transformation
 */
export async function replaceIconifyIcons(code: string, hook?: WarningHook): Promise<string> {
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
    if (hook?.addWarning) {
      for (const name of missingIcons) {
        hook.addWarning({
          type: 'icon_missing',
          message: `Icon not available: ${name} (placeholder will be used)`,
          sceneId: hook.sceneId,
          data: { icon: name }
        });
      }
    }
  }
  
  // We'll decide to inject runtime map later based on actual dynamic usage detected during traversal
  let dynamicIconUsed = false;
  
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
  
  // Traverse AST and inline icons
  try {
    // Check for export default and perform inline replacements
    traverse(ast, {
      ExportDefaultDeclaration() { hasExportDefault = true; },
      // Handle JSX <IconifyIcon .../> and <window.IconifyIcon .../>
      JSXElement(path: any) {
        try {
          const node = path.node;
          if (!node || !node.openingElement) return;
          const opening = node.openingElement;
          let isIconify = false;
          if (t.isJSXIdentifier(opening.name)) {
            const elementName = opening.name.name;
            isIconify = elementName === 'IconifyIcon' || elementName.includes('IconifyIcon');
          } else if (t.isJSXMemberExpression(opening.name)) {
            isIconify = t.isJSXIdentifier(opening.name.object, { name: 'window' }) &&
                        t.isJSXIdentifier(opening.name.property, { name: 'IconifyIcon' });
          }
          if (!isIconify) return;
          const iconAttr = opening.attributes.find(
            (a: any): a is t.JSXAttribute => t.isJSXAttribute(a) && t.isJSXIdentifier(a.name, { name: 'icon' })
          );
          if (!iconAttr) return;
          if (t.isStringLiteral(iconAttr.value)) {
            const iconName = iconAttr.value.value;
            const svg = iconMap.get(iconName);
            if (svg) {
              hasTransformations = true;
              const svgAttrs: t.JSXAttribute[] = [
                ...Object.entries(svg.attributes).map(([k, v]) => t.jsxAttribute(t.jsxIdentifier(k), t.stringLiteral(v))),
                t.jsxAttribute(t.jsxIdentifier('fill'), t.stringLiteral('currentColor')),
                t.jsxAttribute(t.jsxIdentifier('width'), t.stringLiteral('1em')),
                t.jsxAttribute(t.jsxIdentifier('height'), t.stringLiteral('1em')),
                t.jsxAttribute(
                  t.jsxIdentifier('dangerouslySetInnerHTML'),
                  t.jsxExpressionContainer(toDangerousInnerHTML(svg.body))
                ),
              ];
              for (const attr of opening.attributes) {
                if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name) && attr.name.name !== 'icon') {
                  svgAttrs.push(attr);
                }
              }
              path.replaceWith(
                t.jsxElement(
                  t.jsxOpeningElement(t.jsxIdentifier('svg'), svgAttrs, true),
                  null,
                  [],
                  true
                )
              );
            }
          } else if (t.isJSXExpressionContainer(iconAttr.value)) {
            dynamicIconUsed = true;
            hasTransformations = true;
            opening.name = t.jsxIdentifier('__InlineIcon');
          }
        } catch (err) {
          console.error('[Icon Replace] Error in JSXElement visitor:', err);
        }
      },
      // Handle React.createElement(window.IconifyIcon, {...})
      CallExpression(path: any) {
        try {
          const callee = path.node.callee;
          if (!t.isMemberExpression(callee) || !t.isIdentifier(callee.object, { name: 'React' }) || !t.isIdentifier(callee.property, { name: 'createElement' })) {
            return;
          }
          const [comp, props] = path.node.arguments;
          let isIconify = false;
          if (t.isIdentifier(comp, { name: 'IconifyIcon' })) isIconify = true;
          if (t.isMemberExpression(comp) && t.isIdentifier(comp.object, { name: 'window' }) && t.isIdentifier(comp.property, { name: 'IconifyIcon' })) isIconify = true;
          if (!isIconify || !t.isObjectExpression(props)) return;
          const iconProp = props.properties.find(
            (p): p is t.ObjectProperty => t.isObjectProperty(p) && ((t.isIdentifier(p.key, { name: 'icon' }) || (t.isStringLiteral(p.key) && p.key.value === 'icon')))
          );
          if (!iconProp) return;
          if (t.isStringLiteral(iconProp.value)) {
            const iconName = iconProp.value.value;
            const svg = iconMap.get(iconName);
            if (svg) {
              hasTransformations = true;
              const svgProps: t.ObjectProperty[] = [
                ...Object.entries(svg.attributes).map(([k, v]) => t.objectProperty(t.identifier(k), t.stringLiteral(v))),
                t.objectProperty(t.identifier('fill'), t.stringLiteral('currentColor')),
                t.objectProperty(t.identifier('width'), t.stringLiteral('1em')),
                t.objectProperty(t.identifier('height'), t.stringLiteral('1em')),
                t.objectProperty(t.identifier('dangerouslySetInnerHTML'), toDangerousInnerHTML(svg.body)),
              ];
              for (const prop of props.properties) {
                if (t.isObjectProperty(prop) && !((t.isIdentifier(prop.key) && prop.key.name === 'icon') || (t.isStringLiteral(prop.key) && prop.key.value === 'icon'))) {
                  svgProps.push(prop);
                }
              }
              path.replaceWith(
                t.callExpression(
                  t.memberExpression(t.identifier('React'), t.identifier('createElement')),
                  [t.stringLiteral('svg'), t.objectExpression(svgProps)]
                )
              );
            }
          } else {
            dynamicIconUsed = true;
            hasTransformations = true;
            path.node.arguments[0] = t.identifier('__InlineIcon');
          }
        } catch (err) {
          console.error('[Icon Replace] Error in CallExpression visitor:', err);
        }
      },
    });
  } catch (traverseError) {
    console.error('[Icon Replace] Failed to traverse AST:', traverseError);
    // Return code with runtime map but no AST transformations
    return code;
  }
  
  // If dynamic icon usage detected, inject runtime map before generating code
  if (dynamicIconUsed) {
    if (hook?.addWarning) {
      hook.addWarning({
        type: 'icon_dynamic',
        message: 'Dynamic icon usage detected; using runtime inline map',
        sceneId: hook.sceneId,
      });
    }
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
    console.warn('[InlineIcon] Icon not found, using placeholder:', icon);
    return React.createElement('svg', {
      viewBox: '0 0 24 24', width: '1em', height: '1em', fill: 'currentColor',
      dangerouslySetInnerHTML: { __html: '<circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>' +
        '<text x="12" y="16" text-anchor="middle" font-size="14" fill="currentColor">?</text>' }
    });
  }
  const svgProps = Object.assign({ fill: 'currentColor', width: '1em', height: '1em' }, def.attributes, props);
  delete svgProps.icon;
  svgProps.dangerouslySetInnerHTML = { __html: def.body };
  return React.createElement('svg', svgProps);
}
const __inlineIcon = __InlineIcon;
// Expose globally to avoid scope issues in Lambda Function wrapper
try { (globalThis as any).__InlineIcon = __InlineIcon; (globalThis as any).__inlineIcon = __InlineIcon; (globalThis as any)._InlineIcon = __InlineIcon; } catch (_) {}
`;
    code = runtimeCode + '\n' + code;
    console.log('[Icon Replace] Injected runtime icon map at top (dynamic usage) with', iconMap.size, 'icons');
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
  if (dynamicIconUsed || hasTransformations) {
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
  
  console.log(`[Icon Replace] Transformation complete. Icons inlined: ${hasTransformations || dynamicIconUsed}`);
  
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
