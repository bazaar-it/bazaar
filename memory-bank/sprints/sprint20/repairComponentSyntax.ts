// src/server/workers/repairComponentSyntax.ts
import logger from "~/lib/logger";

/**
 * Repairs common syntax errors in LLM-generated TSX code
 * @param tsxCode The TSX code to repair
 * @returns The repaired TSX code and a list of applied fixes
 */
export function repairComponentSyntax(tsxCode: string): { 
  code: string; 
  fixes: string[];
  fixedSyntaxErrors: boolean;
} {
  const fixes: string[] = [];
  let fixedCode = tsxCode;
  let fixedSyntaxErrors = false;
  
  // Fix 1: Prevent redeclaring 'frame' variable
  const frameDeclarations = (fixedCode.match(/const\s+frame\s*=\s*useCurrentFrame\(\);/g) || []);
  if (frameDeclarations.length > 1) {
    // Keep only the first declaration, remove others
    let replaced = false;
    fixedCode = fixedCode.replace(/const\s+frame\s*=\s*useCurrentFrame\(\);/g, (match) => {
      if (!replaced) {
        replaced = true;
        return match; // Keep the first one
      }
      return '// Removed duplicate: const frame = useCurrentFrame();';
    });
    fixes.push("Removed duplicate frame declarations");
    fixedSyntaxErrors = true;
  }
  
  // Fix 2: Prevent redeclaring 'config' variable
  const configDeclarations = (fixedCode.match(/const\s+config\s*=\s*useVideoConfig\(\);/g) || []);
  if (configDeclarations.length > 1) {
    // Keep only the first declaration, remove others
    let replaced = false;
    fixedCode = fixedCode.replace(/const\s+config\s*=\s*useVideoConfig\(\);/g, (match) => {
      if (!replaced) {
        replaced = true;
        return match; // Keep the first one
      }
      return '// Removed duplicate: const config = useVideoConfig();';
    });
    fixes.push("Removed duplicate config declarations");
    fixedSyntaxErrors = true;
  }
  
  // Fix 3: Fix unescaped < in string literals
  // This is a simplified approach - a real implementation would be more robust
  const potentialStringLiterals = fixedCode.match(/(['"])(?:(?!\1).)*\1/g) || [];
  for (const literal of potentialStringLiterals) {
    if (literal.includes('<') && !literal.includes('&lt;')) {
      const fixed = literal.replace(/</g, '&lt;').replace(/>/g, '&gt;');
      fixedCode = fixedCode.replace(literal, fixed);
      fixes.push("Escaped < and > characters in string literals");
      fixedSyntaxErrors = true;
    }
  }
  
  // Fix 4: Fix malformed JSX by adding missing closing tags
  // This is a simplified demonstration - real JSX parsing would be more complex
  const openTags = fixedCode.match(/<([a-zA-Z][a-zA-Z0-9]*)[^>]*>/g) || [];
  const closeTags = fixedCode.match(/<\/([a-zA-Z][a-zA-Z0-9]*)>/g) || [];
  
  const openTagNames = openTags.map(tag => tag.match(/<([a-zA-Z][a-zA-Z0-9]*)/)?.[1] || '');
  const closeTagNames = closeTags.map(tag => tag.match(/<\/([a-zA-Z][a-zA-Z0-9]*)>/)?.[1] || '');
  
  // Simple check for mismatched tags
  for (const name of openTagNames) {
    const openCount = openTagNames.filter(n => n === name).length;
    const closeCount = closeTagNames.filter(n => n === name).length;
    
    if (openCount > closeCount) {
      logger.warn(`Potential missing closing tag for <${name}>`);
      // Real implementation would attempt to add the closing tag in the right place
      // This is just a warning for now
      fixes.push(`Detected potential missing closing tag for <${name}>`);
    }
  }
  
  // Fix 5: Ensure component is properly exported
  if (!fixedCode.includes('export default') && !fixedCode.includes('export function')) {
    // Look for a component function declaration
    const componentMatch = fixedCode.match(/function\s+([A-Za-z0-9_]+)\s*\(/);
    if (componentMatch && componentMatch[1]) {
      const componentName = componentMatch[1];
      fixedCode += `\n\n// Added missing export\nexport default ${componentName};\n`;
      fixes.push(`Added missing export default for ${componentName}`);
      fixedSyntaxErrors = true;
    }
  }
  
  return {
    code: fixedCode,
    fixes,
    fixedSyntaxErrors
  };
} 