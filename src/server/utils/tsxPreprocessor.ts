//src/server/utils/tsxPreprocessor.ts

import logger from '~/lib/logger';

/**
 * TypeScript + JSX preprocessor for correcting common syntax issues in LLM-generated components
 * 
 * This utility detects and fixes syntax errors that frequently appear in LLM-generated
 * Remotion components before they reach the validation and build stages.
 */

/**
 * Determines if a component error is fixable by our preprocessor
 */
export function isErrorFixableByPreprocessor(error: Error, tsxCode: string): boolean {
  const errorMsg = error.message || '';
  
  // Check for the types of errors our preprocessor can fix
  if (errorMsg.includes('Identifier') && errorMsg.includes('has already been declared')) {
    return true;
  }
  
  if (errorMsg.includes('Unexpected token')) {
    return true;
  }

  // Check for missing exports (if the component has a recognizable structure)
  const hasComponentStructure = /(?:function|class|const)\s+\w+\s*(?:=|\(|\{)/.test(tsxCode);
  if (errorMsg.includes('export') && hasComponentStructure) {
    return true;
  }
  
  return false;
}

/**
 * Pre-process TSX code to fix common syntax errors before validation
 * 
 * @param tsxCode The original TSX code from the LLM
 * @param componentName The expected component name
 * @returns Object containing fixed code, list of issues found, and success flag
 */
export function preprocessTsx(
  tsxCode: string, 
  componentName: string = 'Component'
): {
  code: string;
  issues: string[];
  fixed: boolean;
} {
  let fixed = false;
  const issues: string[] = [];
  let code = tsxCode;

  try {
    // 1. Fix variable redeclarations
    const fixedRedeclarations = fixVariableRedeclarations(code);
    if (fixedRedeclarations.fixed) {
      code = fixedRedeclarations.code;
      issues.push(...fixedRedeclarations.issues);
      fixed = true;
      logger.debug(`[TSX_PREPROCESS] Fixed variable redeclarations in ${componentName}`);
    }
    
    // 2. Fix unclosed JSX tags
    const jsxTagPairFixes = fixUnclosedJsxTags(code);
    if (jsxTagPairFixes.fixed) {
      code = jsxTagPairFixes.code;
      issues.push(...jsxTagPairFixes.issues);
      fixed = true;
      logger.debug(`[TSX_PREPROCESS] Fixed unclosed JSX tags in ${componentName}`);
    }
    
    // 3. Fix unescaped HTML/XML in string literals
    const stringLiteralFixes = fixUnescapedHtmlInStrings(code);
    if (stringLiteralFixes.fixed) {
      code = stringLiteralFixes.code;
      issues.push(...stringLiteralFixes.issues);
      fixed = true;
      logger.debug(`[TSX_PREPROCESS] Fixed unescaped HTML in strings in ${componentName}`);
    }
    
    // 4. Ensure there's a default export for the component if missing
    const exportFixes = ensureComponentExport(code, componentName);
    if (exportFixes.fixed) {
      code = exportFixes.code;
      issues.push(...exportFixes.issues);
      fixed = true;
      logger.debug(`[TSX_PREPROCESS] Added missing exports in ${componentName}`);
    }

    // 5. Validate the resulting code with a light parser
    try {
      validateBasicSyntax(code);
    } catch (parseError) {
      const errorMessage = parseError instanceof Error ? parseError.message : String(parseError);
      issues.push(`Warning: Code may still have syntax errors: ${errorMessage}`);
      logger.warn(`[TSX_PREPROCESS] Possible remaining syntax errors in ${componentName}: ${errorMessage}`);
    }
    
  } catch (error) {
    // Log any errors in the preprocessor itself
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`[TSX_PREPROCESS] Error preprocessing TSX for ${componentName}: ${errorMessage}`);
    issues.push(`Error during preprocessing: ${errorMessage}`);
  }

  return { code, issues, fixed };
}

/**
 * Fix variable redeclarations, focusing on common Remotion hooks
 */
function fixVariableRedeclarations(code: string): { code: string; issues: string[]; fixed: boolean } {
  const issues: string[] = [];
  let fixed = false;
  let result = code;
  
  // Check for duplicate frame declarations
  const frameRegex = /const\s+frame\s*=\s*useCurrentFrame\(\);/g;
  const frameMatches = Array.from(result.matchAll(frameRegex));
  
  if (frameMatches.length > 1) {
    // Keep only the first declaration
    const firstMatchIndex = frameMatches[0]?.index ?? 0;
    result = result.replace(frameRegex, (match, offset) => {
      // Keep the first occurrence, remove others
      if (offset === firstMatchIndex) {
        return match;
      }
      return '/* Removed duplicate frame declaration */';
    });
    
    issues.push('Fixed duplicate frame declaration (useCurrentFrame)');
    fixed = true;
  }
  
  // Check for duplicate videoConfig declarations
  const configRegex = /const\s+(?:videoConfig|config)\s*=\s*useVideoConfig\(\);/g;
  const configMatches = Array.from(result.matchAll(configRegex));
  
  if (configMatches.length > 1) {
    // Keep only the first declaration
    const firstConfigIndex = configMatches[0]?.index ?? 0;
    result = result.replace(configRegex, (match, offset) => {
      // Keep the first occurrence, remove others
      if (offset === firstConfigIndex) {
        return match;
      }
      return '/* Removed duplicate videoConfig declaration */';
    });
    
    issues.push('Fixed duplicate videoConfig declaration (useVideoConfig)');
    fixed = true;
  }
  
  return { code: result, issues, fixed };
}

/**
 * Fix unclosed JSX tags using a simple regex-based approach
 * Note: This is a simplified version - a real implementation would use a proper parser
 */
function fixUnclosedJsxTags(code: string): { code: string; issues: string[]; fixed: boolean } {
  const issues: string[] = [];
  let fixed = false;
  let result = code;
  
  // Simple pattern to identify potential JSX opening tags that might be unclosed
  // This regex looks for common SVG elements that are frequently unclosed in LLM output
  const commonElements = ['circle', 'rect', 'path', 'g', 'svg', 'line', 'polyline', 'polygon'];
  
  for (const element of commonElements) {
    // Look for patterns like: <element ... without a closing ">" or "/>"
    const unclosedPattern = new RegExp(`<${element}[^>]*(?<!/)$`, 'gm');
    const matches = result.match(unclosedPattern);
    
    if (matches && matches.length > 0) {
      result = result.replace(unclosedPattern, `$& />`);
      issues.push(`Fixed unclosed ${element} tag`);
      fixed = true;
    }
    
    // Look for patterns where there might be attributes but no closing tag
    // e.g.: <circle cx="50" cy="50" r="40" fill="red" 
    const missingClosingPattern = new RegExp(`<${element}[^>]*>[^<]*$`, 'gm');
    const missingClosingMatches = result.match(missingClosingPattern);
    
    if (missingClosingMatches && missingClosingMatches.length > 0) {
      result = result.replace(missingClosingPattern, `$&</${element}>`);
      issues.push(`Added missing </${element}> closing tag`);
      fixed = true;
    }
  }
  
  // Additionally, look for any line ending with an attribute without proper tag closure
  const lineEndingWithAttr = /(\w+)=['"][^'"]*['"](\s*)$/gm;
  const attrMatches = result.match(lineEndingWithAttr);
  
  if (attrMatches && attrMatches.length > 0) {
    result = result.replace(lineEndingWithAttr, `$1="$2" />`);
    issues.push('Fixed attribute with missing tag closure');
    fixed = true;
  }
  
  return { code: result, issues, fixed };
}

/**
 * Fix unescaped HTML/XML in string literals
 */
function fixUnescapedHtmlInStrings(code: string): { code: string; issues: string[]; fixed: boolean } {
  const issues: string[] = [];
  let fixed = false;
  let result = code;
  
  // Match string literals that contain < and > characters
  // This is a simplified approach - a real implementation would use AST parsing
  const stringLiteralPattern = /"([^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*')/g;
  
  result = result.replace(stringLiteralPattern, (match) => {
    // Only process if it contains < or > and looks like HTML/XML
    if ((match.includes('<') && match.includes('>')) && 
        /[<][a-zA-Z\/]/.test(match)) {
      
      const escaped = match
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      if (escaped !== match) {
        issues.push('Fixed unescaped HTML characters in string literal');
        fixed = true;
        return escaped;
      }
    }
    return match;
  });
  
  return { code: result, issues, fixed };
}

/**
 * Ensure the component has a proper export statement
 */
function ensureComponentExport(code: string, componentName: string): { code: string; issues: string[]; fixed: boolean } {
  const issues: string[] = [];
  let fixed = false;
  let result = code;
  
  // Check if there's an export statement for this component
  const hasDefaultExport = /export\s+default\s+(?:function\s+)?(\w+)/.test(code);
  const hasNamedExport = new RegExp(`export\\s+(?:const|function|class)\\s+${componentName}`).test(code);
  
  // If no export is found, add default export at the end
  if (!hasDefaultExport && !hasNamedExport) {
    // Try to find the component function/class/const declaration
    const componentDefRegex = new RegExp(`(?:function|class|const)\\s+${componentName}`);
    const hasComponentDef = componentDefRegex.test(code);
    
    if (hasComponentDef) {
      // Add default export at the end
      result += `\n\n// Added by pre-processor\nexport default ${componentName};\n`;
      issues.push(`Added missing default export for ${componentName}`);
      fixed = true;
    } else {
      // If we can't find the component definition, log an issue
      issues.push(`Could not find component declaration for ${componentName} to add export`);
    }
  }
  
  // Ensure window.__REMOTION_COMPONENT is set
  if (!code.includes('window.__REMOTION_COMPONENT')) {
    result += `\n\n// Added by pre-processor - required for Remotion
if (typeof window !== 'undefined') {
  window.__REMOTION_COMPONENT = ${componentName};
}\n`;
    issues.push('Added missing window.__REMOTION_COMPONENT assignment');
    fixed = true;
  }
  
  return { code: result, issues, fixed };
}

/**
 * Minimal syntax validation - placeholder for a real parser integration
 * In production, you would use TypeScript compiler or a proper JSX parser here
 */
function validateBasicSyntax(code: string): void {
  // This function would use a real parser in production
  // For now, we'll do some basic checks
  
  const checkBalancedBraces = (code: string) => {
    const stack: string[] = [];
    const pairs: Record<string, string> = { '{': '}', '(': ')', '[': ']' };
    
    for (let i = 0; i < code.length; i++) {
      const char = code.charAt(i);
      
      if (char in pairs) {
        // Opening brace/bracket/parenthesis
        stack.push(char);
      } else if (Object.values(pairs).includes(char)) {
        // Closing brace/bracket/parenthesis
        const last = stack.pop();
        if (!last || pairs[last as keyof typeof pairs] !== char) {
          throw new Error(`Mismatched braces at position ${i}: expected ${last ? pairs[last as keyof typeof pairs] : 'nothing'}, found ${char}`);
        }
      }
    }
    
    if (stack.length > 0) {
      throw new Error(`Unclosed braces: ${stack.join(', ')}`);
    }
  };
  
  // Very basic checks
  checkBalancedBraces(code);
}
