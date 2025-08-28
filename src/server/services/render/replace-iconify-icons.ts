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

type SvgDef = { attributes: Record<string, string>, body: string };

/**
 * Extract all icon names used in the code for preloading
 */
function extractIconNames(code: string): Set<string> {
  const iconNames = new Set<string>();
  
  // Find literal icon names in various patterns
  // Pattern 1: { icon: "mdi:heart" }
  const objectPattern = /\{\s*icon\s*:\s*["']([^"']+)["']/g;
  let match;
  while ((match = objectPattern.exec(code)) !== null) {
    if (match[1]) iconNames.add(match[1]);
  }
  
  // Pattern 2: icon="mdi:heart" (JSX)
  const jsxPattern = /icon\s*=\s*["']([^"']+)["']/g;
  while ((match = jsxPattern.exec(code)) !== null) {
    if (match[1]) iconNames.add(match[1]);
  }
  
  // Pattern 3: iconData arrays
  const arrayPattern = /["']([a-z0-9-]+:[a-z0-9-]+)["']/gi;
  while ((match = arrayPattern.exec(code)) !== null) {
    if (match[1] && match[1].includes(':')) {
      iconNames.add(match[1]);
    }
  }
  
  return iconNames;
}

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
  
  // Preload all icons
  const iconMap = await preloadIcons(Array.from(iconNames));
  console.log(`[Icon Replace] Preloaded ${iconMap.size} icons`);
  
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
    // No fallback - just return null for missing icons
    console.warn('[InlineIcon] Icon not found:', icon);
    return null;
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
    traverse(ast, {
    // Check for export default
    ExportDefaultDeclaration() {
      hasExportDefault = true;
    },
    
    // Handle JSX elements like <IconifyIcon icon="mdi:heart" />
    JSXElement(path: any) {
      try {
        const node = path.node;
        if (!node || !node.openingElement) return;
        
        const opening = node.openingElement;
        if (!t.isJSXIdentifier(opening.name)) return;
        
        const elementName = opening.name.name;
        if (elementName !== 'IconifyIcon' && !elementName.includes('IconifyIcon')) return;
        
        // Find icon attribute
      const iconAttr = opening.attributes.find(
        (a: any): a is t.JSXAttribute => 
          t.isJSXAttribute(a) && 
          t.isJSXIdentifier(a.name, { name: 'icon' })
      );
      
      if (!iconAttr) return;
      
      // Handle literal string icons
      if (t.isStringLiteral(iconAttr.value)) {
        const iconName = iconAttr.value.value;
        const svg = iconMap.get(iconName);
        
        if (svg) {
          hasTransformations = true;
          // Replace with inline SVG
          const svgAttrs: t.JSXAttribute[] = [
            ...Object.entries(svg.attributes).map(([k, v]) =>
              t.jsxAttribute(t.jsxIdentifier(k), t.stringLiteral(v))
            ),
            t.jsxAttribute(t.jsxIdentifier('fill'), t.stringLiteral('currentColor')),
            t.jsxAttribute(t.jsxIdentifier('width'), t.stringLiteral('1em')),
            t.jsxAttribute(t.jsxIdentifier('height'), t.stringLiteral('1em')),
            t.jsxAttribute(
              t.jsxIdentifier('dangerouslySetInnerHTML'),
              t.jsxExpressionContainer(toDangerousInnerHTML(svg.body))
            ),
          ];
          
          // Add other props from original element (except 'icon')
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
          console.log(`[Icon Replace] Replaced JSX icon: ${iconName}`);
        }
      } else if (t.isJSXExpressionContainer(iconAttr.value)) {
        // Dynamic icon - replace with __InlineIcon
        if (needsRuntimeMap) {
          hasTransformations = true;
          opening.name = t.jsxIdentifier('__InlineIcon');
          console.log('[Icon Replace] Replaced dynamic JSX icon with __InlineIcon');
        }
      }
      } catch (err) {
        // Safe error handling without Babel hub
        console.error('[Icon Replace] Error in JSXElement visitor:', err);
      }
    },
    
    // Handle React.createElement(IconifyIcon, { icon: "mdi:heart" })
    CallExpression(path: any) {
      try {
        const callee = path.node.callee;
      
      // Check for React.createElement
      if (
        !t.isMemberExpression(callee) ||
        !t.isIdentifier(callee.object, { name: 'React' }) ||
        !t.isIdentifier(callee.property, { name: 'createElement' })
      ) {
        return;
      }
      
      const [comp, props] = path.node.arguments;
      
      // Check if it's IconifyIcon
      if (!t.isIdentifier(comp, { name: 'IconifyIcon' })) return;
      if (!t.isObjectExpression(props)) return;
      
      // Find icon prop
      const iconProp = props.properties.find(
        (p): p is t.ObjectProperty =>
          t.isObjectProperty(p) &&
          ((t.isIdentifier(p.key, { name: 'icon' }) || 
           (t.isStringLiteral(p.key) && p.key.value === 'icon')))
      );
      
      if (!iconProp) return;
      
      // Handle literal string icons
      if (t.isStringLiteral(iconProp.value)) {
        const iconName = iconProp.value.value;
        const svg = iconMap.get(iconName);
        
        if (svg) {
          hasTransformations = true;
          // Build new props for SVG
          const svgProps: t.ObjectProperty[] = [
            ...Object.entries(svg.attributes).map(([k, v]) =>
              t.objectProperty(t.identifier(k), t.stringLiteral(v))
            ),
            t.objectProperty(t.identifier('fill'), t.stringLiteral('currentColor')),
            t.objectProperty(t.identifier('width'), t.stringLiteral('1em')),
            t.objectProperty(t.identifier('height'), t.stringLiteral('1em')),
            t.objectProperty(
              t.identifier('dangerouslySetInnerHTML'),
              toDangerousInnerHTML(svg.body)
            ),
          ];
          
          // Add other props (except 'icon')
          for (const prop of props.properties) {
            if (t.isObjectProperty(prop) && 
                !((t.isIdentifier(prop.key) && prop.key.name === 'icon') ||
                  (t.isStringLiteral(prop.key) && prop.key.value === 'icon'))) {
              svgProps.push(prop);
            }
          }
          
          // Replace with React.createElement('svg', ...)
          path.replaceWith(
            t.callExpression(
              t.memberExpression(t.identifier('React'), t.identifier('createElement')),
              [t.stringLiteral('svg'), t.objectExpression(svgProps)]
            )
          );
          console.log(`[Icon Replace] Replaced createElement icon: ${iconName}`);
        }
      } else {
        // Dynamic icon - replace with __InlineIcon
        if (needsRuntimeMap) {
          hasTransformations = true;
          path.node.arguments[0] = t.identifier('__InlineIcon');
          console.log('[Icon Replace] Replaced dynamic createElement with __InlineIcon');
        }
      }
      } catch (err) {
        // Safe error handling without Babel hub
        console.error('[Icon Replace] Error in CallExpression visitor:', err);
      }
    },
  });
  } catch (traverseError) {
    console.error('[Icon Replace] Failed to traverse AST:', traverseError);
    // Return code with runtime map but no AST transformations
    return code;
  }
  
  // Generate code from AST if we made transformations
  let transformedCode = code;
  if (hasTransformations && ast) {
    try {
      const output = generate(ast);
      transformedCode = output.code;
      console.log('[Icon Replace] Generated code from transformed AST');
    } catch (genError) {
      console.error('[Icon Replace] Failed to generate code from AST:', genError);
      // Fall back to original code with runtime map
    }
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
  return transformedCode;
}