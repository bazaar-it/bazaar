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
    // 0. Handle import statements first - convert to global variable access
    const importFixes = convertImportToGlobals(code);
    if (importFixes.fixed) {
      code = importFixes.code;
      issues.push(...importFixes.issues);
      fixed = true;
      logger.debug(`[TSX_PREPROCESS] Converted imports to globals in ${componentName}`);
    }
    
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
    
    // 4. Fix variable references (common issue with size/width/height and color/backgroundColor)
    const variableRefFixes = fixCommonVariableReferences(code);
    if (variableRefFixes.fixed) {
      code = variableRefFixes.code;
      issues.push(...variableRefFixes.issues);
      fixed = true;
      logger.debug(`[TSX_PREPROCESS] Fixed variable reference errors in ${componentName}`);
    }
    
    // 5. Fix JSX structural issues (extra closing tags, missing tags)
    const jsxStructureFixes = fixJsxStructure(code);
    if (jsxStructureFixes.fixed) {
      code = jsxStructureFixes.code;
      issues.push(...jsxStructureFixes.issues);
      fixed = true;
      logger.debug(`[TSX_PREPROCESS] Fixed JSX structure issues in ${componentName}`);
    }
    
    // 6. Ensure there's a default export for the component if missing
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
  
  // Common Remotion hook redeclarations
  const hookPatterns = [
    // Frame hook patterns with various forms
    { 
      pattern: /const\s+frame\s*=\s*useCurrentFrame\(\);/g,
      replacement: '// frame is already declared above',
      issue: 'Fixed redeclaration of frame variable'
    },
    { 
      pattern: /let\s+frame\s*=\s*useCurrentFrame\(\);/g,
      replacement: '// frame is already declared above as const',
      issue: 'Fixed redeclaration of frame variable'
    },
    { 
      pattern: /var\s+frame\s*=\s*useCurrentFrame\(\);/g,
      replacement: '// frame is already declared above as const',
      issue: 'Fixed redeclaration of frame variable'
    },
    
    // VideoConfig patterns with different forms
    {
      pattern: /const\s+(?:videoConfig|config)\s*=\s*useVideoConfig\(\);/g,
      replacement: '// videoConfig is already available via destructured variables above',
      issue: 'Fixed redeclaration of videoConfig'
    },
    {
      pattern: /const\s*{\s*(?:width|height|fps|durationInFrames)[^}]*}\s*=\s*useVideoConfig\(\);/g,
      replacement: '// videoConfig variables (width, height, fps, durationInFrames) are already declared above',
      issue: 'Fixed redeclaration of videoConfig variables'
    },
    {
      pattern: /let\s*{\s*(?:width|height|fps|durationInFrames)[^}]*}\s*=\s*useVideoConfig\(\);/g,
      replacement: '// videoConfig variables are already declared above as const',
      issue: 'Fixed redeclaration of videoConfig variables'
    },
    {
      pattern: /var\s*{\s*(?:width|height|fps|durationInFrames)[^}]*}\s*=\s*useVideoConfig\(\);/g,
      replacement: '// videoConfig variables are already declared above as const',
      issue: 'Fixed redeclaration of videoConfig variables'
    },

    // Fix specific variable declarations from useVideoConfig
    {
      pattern: /const\s+width\s*=\s*(?:videoConfig|config)\.width;/g,
      replacement: '// width is already declared above',
      issue: 'Fixed redeclaration of width from videoConfig'
    },
    {
      pattern: /const\s+height\s*=\s*(?:videoConfig|config)\.height;/g,
      replacement: '// height is already declared above',
      issue: 'Fixed redeclaration of height from videoConfig'
    },
    {
      pattern: /const\s+fps\s*=\s*(?:videoConfig|config)\.fps;/g,
      replacement: '// fps is already declared above',
      issue: 'Fixed redeclaration of fps from videoConfig'
    },
    {
      pattern: /const\s+durationInFrames\s*=\s*(?:videoConfig|config)\.durationInFrames;/g,
      replacement: '// durationInFrames is already declared above',
      issue: 'Fixed redeclaration of durationInFrames from videoConfig'
    }
  ];
  
  // Apply all hook redeclaration fixes
  hookPatterns.forEach(({ pattern, replacement, issue }) => {
    if (pattern.test(result)) {
      result = result.replace(pattern, replacement);
      issues.push(issue);
      fixed = true;
    }
  });
  
  // Fix duplicate React import patterns
  const reactImportPatterns = [
    /import\s+React\s+from\s+['"]react['"];?/g,
    /import\s+\*\s+as\s+React\s+from\s+['"]react['"];?/g,
    /import\s+{[^}]*}\s+from\s+['"]react['"];?/g,
    /import\s+React\s*,\s*{[^}]*}\s+from\s+['"]react['"];?/g
  ];
  
  reactImportPatterns.forEach(pattern => {
    if (pattern.test(result)) {
      result = result.replace(pattern, '// React is already available as a global');
      issues.push('Fixed duplicate React import');
      fixed = true;
    }
  });
  
  return { code: result, issues, fixed };
}

/**
 * Fix unclosed JSX tags
 */
function fixUnclosedJsxTags(code: string): { code: string; fixed: boolean; issues: string[] } {
  const issues: string[] = [];
  let fixed = false;
  let result = code;
  
  // STEP 1: Fix self-closing tags like <img>, <br>, etc.
  const selfClosingTagsPattern = /<(img|br|hr|input|meta|link|source)([^>]*)>(?!\s*\/)/g;
  
  if (selfClosingTagsPattern.test(result)) {
    result = result.replace(selfClosingTagsPattern, '<$1$2 />');
    issues.push('Fixed unclosed self-closing tags (img, br, hr, input, etc.)');
    fixed = true;
  }
  
  // STEP 2: Fix the specific pattern causing unterminated regex error:
  // JSX closing tags immediately followed by closing parentheses
  // For example: </p>);  ->  </p> );
  const problematicPattern = /(<\/[a-z][a-z0-9]*>)(\s*\))/gi;
  if (problematicPattern.test(result)) {
    result = result.replace(problematicPattern, '$1 $2');
    issues.push('Fixed JSX closing tags followed by parentheses (prevents regex parsing errors)');
    fixed = true;
  }
  
  // STEP 3: Fix common unclosed tags using a simplified approach
  const commonUnclosedTags = ['div', 'span', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'ul', 'ol', 'li', 'button', 'a'];
  
  for (const tag of commonUnclosedTags) {
    // Count opening and closing tags
    const openPattern = new RegExp(`<${tag}([^>]*)>`, 'g');
    const closePattern = new RegExp(`<\/${tag}>`, 'g');
    
    const openMatches = (result.match(openPattern) || []).length;
    const closeMatches = (result.match(closePattern) || []).length;
    
    // If more opening than closing tags, add closing tags at the end
    if (openMatches > closeMatches) {
      const diff = openMatches - closeMatches;
      
      // Add closing tags at the end before any return statement
      result = result.replace(
        /(return\s*\([\s\S]*?)(\);)/,
        (match, beforeReturn, afterReturn) => {
          let closingTags = '';
          for (let i = 0; i < diff; i++) {
            closingTags += `</${tag}>`;
          }
          return beforeReturn + closingTags + afterReturn;
        }
      );
      
      issues.push(`Added ${diff} missing </${tag}> tags`);
      fixed = true;
    }
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
  
  // Find string literals containing unescaped < > characters
  const stringLiteralPattern = /"([^"\\]*(?:\\.[^"\\]*)*)"|'([^'\\]*(?:\\.[^'\\]*)*)'/g;
  
  // Replace < with &lt; and > with &gt; in string literals
  result = result.replace(stringLiteralPattern, (match) => {
    // Skip if the string appears to be JSX prop value
    if (match.includes('<') || match.includes('>')) {
      const replacedMatch = match
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      
      if (replacedMatch !== match) {
        fixed = true;
        issues.push('Escaped HTML tags in string literals');
        return replacedMatch;
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
  
  // Check if there's a default export for the component
  const exportPattern = new RegExp(`export\\s+default\\s+${componentName}\\s*;?`);
  
  if (!exportPattern.test(result)) {
    // No default export found, add one
    // First, check if the code defines the component
    const componentDefPattern = new RegExp(`(const|function|class)\\s+${componentName}\\s*`);
    
    if (componentDefPattern.test(result)) {
      // Component defined but not exported - add export at the end
      result = result.trim();
      if (!result.endsWith(';')) {
        result += ';';
      }
      result += `\n\n// Added missing export\nexport default ${componentName};\n`;
      issues.push(`Added missing default export for ${componentName}`);
      fixed = true;
    }
  }
  
  // Check for window.__REMOTION_COMPONENT assignment
  const windowAssignmentPattern = /window\.__REMOTION_COMPONENT\s*=\s*\w+\s*;?/;
  
  if (!windowAssignmentPattern.test(result)) {
    // Add the window assignment
    result = result.trim();
    if (!result.endsWith(';') && !result.endsWith('}')) {
      result += ';';
    }
    result += `\n\n// Critical registration for Remotion
window.__REMOTION_COMPONENT = ${componentName};
`;
    issues.push('Added missing window.__REMOTION_COMPONENT assignment');
    fixed = true;
  }
  
  return { code: result, issues, fixed };
}

/**
 * Fix import statements by converting them to global variable access
 */
function convertImportToGlobals(code: string): { code: string; issues: string[]; fixed: boolean } {
  const issues: string[] = [];
  let fixed = false;
  let result = code;
  
  // Match React imports
  const reactDefaultNamedPattern = /import\s+React\s*,\s*{([^}]+)}\s+from\s+['"]react['"];?/g;
  if (reactDefaultNamedPattern.test(result)) {
    result = result.replace(reactDefaultNamedPattern, (_m, names) => {
      const imports = names.split(',').map((s: string) => s.trim()).join(', ');
      return `// React provided by Remotion environment\nconst React = window.React;\nconst { ${imports} } = window.React;`;
    });
    issues.push('Converted React import to global variable access');
    fixed = true;
  }

  const reactImportPattern = /import\s+(?:React|(?:{[^}]*}))\s+from\s+['"]react['"](;)?/g;
  if (reactImportPattern.test(result)) {
    result = result.replace(reactImportPattern, '// React provided by Remotion environment\nconst React = window.React;');
    issues.push('Converted React import to global variable access');
    fixed = true;
  }
  
  // Match Remotion imports
  const remotionImportPattern = /import\s+(?:{([^}]*)}\s+from\s+['"]remotion['"](;)?)/g;
  const remotionMatches = result.match(remotionImportPattern);
  
  if (remotionMatches && remotionMatches.length > 0) {
    // Extract the imported items from within the curly braces
    const importListPattern = /import\s+{([^}]*)}\s+from\s+['"]remotion['"](?:;)?/;
    const importListMatch = result.match(importListPattern);
    
    if (importListMatch && importListMatch[1]) {
      const imports = importListMatch[1].split(',').map(s => s.trim());
      
      if (imports.length > 0) {
        result = result.replace(
          remotionImportPattern, 
          `// Remotion imports provided by environment\nconst { ${imports.join(', ')} } = window.Remotion || {};`
        );
        issues.push('Converted Remotion imports to global variable access');
        fixed = true;
      }
    }
  }
  
  // Match other imports and convert to comments
  const otherImportPattern = /import\s+.*?from\s+['"](?!react|remotion)([^'"]+)['"](?:;)?/g;
  const otherMatches = result.match(otherImportPattern);
  
  if (otherMatches && otherMatches.length > 0) {
    for (const match of otherMatches) {
      // Extract the module path
      const modulePathMatch = match.match(/from\s+['"]([^'"]+)['"]/);
      const modulePath = modulePathMatch ? modulePathMatch[1] : 'unknown';
      
      result = result.replace(
        match,
        `// NOTE: Import from "${modulePath}" was removed - make sure to include any necessary resources inline\n// ${match}`
      );
      issues.push(`Commented out import from "${modulePath}" - may need manual integration`);
      fixed = true;
    }
  }
  
  // Handle potential 'use client' directive
  if (/'use client'|"use client"/.test(result)) {
    result = result.replace(/'use client';?\n?|"use client";?\n?/g, '// Client directive removed - not needed in Remotion components\n');
    issues.push("Removed 'use client' directive");
    fixed = true;
  }
  
  return { code: result, issues, fixed };
}

/**
 * Fix common variable reference errors in component code
 * This specifically targets issues where variables are used incorrectly (like width instead of size)
 */
function fixCommonVariableReferences(code: string): { code: string; issues: string[]; fixed: boolean } {
  const issues: string[] = [];
  let fixed = false;
  let result = code;

  // Pattern 1: Using 'width' or 'height' instead of 'size' in common component patterns
  // Look for style objects containing width/height that should be using the size variable
  const widthHeightPattern = /style=\{\{[^}]*?(?:width|height)\s*:\s*(?:width|height)[^}]*?\}\}/g;
  const widthHeightMatches = result.match(widthHeightPattern);
  
  if (widthHeightMatches && widthHeightMatches.length > 0) {
    // For each match, check if there's a 'size' variable in scope
    const hasSizeVar = (/const\s+size\s*=/.test(result));
    
    if (hasSizeVar) {
      // Replace width: width with width: size and height: height with height: size
      result = result.replace(/width\s*:\s*width/g, 'width: size');
      result = result.replace(/height\s*:\s*height/g, 'height: size');
      issues.push('Fixed incorrect references to width/height (replaced with size)');
      fixed = true;
      logger.debug('[ESBUILD-FIX] Fixed width/height variable references');
    }
  }
  
  // Pattern 2: Using 'backgroundColor' instead of 'color' 
  // This is a common error in simpler components
  const bgColorPattern = /backgroundColor\s*:\s*backgroundColor/g;
  const hasBgColorIssue = bgColorPattern.test(result);
  
  if (hasBgColorIssue) {
    // Check if there's a 'color' variable in scope
    const hasColorVar = (/const\s+color\s*=/.test(result));
    
    if (hasColorVar) {
      result = result.replace(/backgroundColor\s*:\s*backgroundColor/g, 'backgroundColor: color');
      issues.push('Fixed incorrect reference to backgroundColor (replaced with color)');
      fixed = true;
      logger.debug('[ESBUILD-FIX] Fixed backgroundColor variable reference');
    }
  }
  
  // Pattern 3: Replace reference to undefined 'frame' with useCurrentFrame()
  if ((/frame(?![A-Za-z0-9_])[^=]*/).test(result) && !(/const\s+frame\s*=/).test(result)) {
    // Frame is referenced but not declared - check if useCurrentFrame is used
    if ((/useCurrentFrame/).test(result)) {
      // Add frame declaration if missing
      if (!(/const\s+frame\s*=\s*useCurrentFrame\(\)/).test(result)) {
        // Find a good insertion point - after imports or at the top of the component function
        const componentFnMatch = result.match(/(?:const|function)\s+(\w+)\s*(?:=|\()/); 
        if (componentFnMatch) {
          const insertPos = result.indexOf(componentFnMatch[0]);
          result = result.slice(0, insertPos) + 
                 'const frame = useCurrentFrame();\n\n  ' + 
                 result.slice(insertPos);
          issues.push('Added missing frame declaration using useCurrentFrame()');
          fixed = true;
          logger.debug('[ESBUILD-FIX] Added missing frame declaration');
        }
      }
    }
  }

  return { code: result, issues, fixed };
}

/**
 * Fix structural issues in JSX code
 * This targets problems like extra closing divs, missing closing tags, etc.
 */
function fixJsxStructure(code: string): { code: string; issues: string[]; fixed: boolean } {
  const issues: string[] = [];
  let fixed = false;
  let result = code;

  // Pattern 0 (NEW): Remove semicolons after JSX closing tags - this causes errors in esbuild
  const jsxSemicolonPattern = /(<\/\w+>);\s*(\)|,|{|$)/g;
  if (jsxSemicolonPattern.test(result)) {
    result = result.replace(jsxSemicolonPattern, '$1 $2');
    issues.push('Removed semicolons after JSX closing tags');
    fixed = true;
    logger.debug('[ESBUILD-FIX] Removed semicolons after JSX closing tags');
  }

  // Pattern 1: Extra semicolon and parenthesis at the end of JSX ("</div>; );")
  const extraSemicolonPattern = /(<\/\w+>)\s*;\s*\);/g;
  if (extraSemicolonPattern.test(result)) {
    result = result.replace(extraSemicolonPattern, '$1\n    );');
    issues.push('Removed extra semicolon after closing JSX tag');
    fixed = true;
    logger.debug('[ESBUILD-FIX] Fixed extra semicolon issue in JSX');
  }

  // Pattern 2: Double closing JSX tags ("</div></div>" where only one should be)
  // This requires careful analysis to avoid breaking valid nested tags
  const doubleClosingPattern = /(<\/\w+>)\s*(<\/\w+>)\s*\);/g;
  const doubleClosingMatch = result.match(doubleClosingPattern);
  
  if (doubleClosingMatch) {
    // Check if there might be unbalanced tags by looking for a simple pattern
    // This isn't perfect but catches common cases where there's one div too many
    const openTags = (result.match(/<div/g) || []).length;
    const closeTags = (result.match(/<\/div>/g) || []).length;
    
    if (closeTags > openTags) {
      result = result.replace(doubleClosingPattern, '$1\n    );');
      issues.push('Removed extra closing JSX tag - tags were unbalanced');
      fixed = true;
      logger.debug('[ESBUILD-FIX] Removed extra closing tag');
    }
  }

  // Pattern 3: Missing closing JSX tag - look for return statements without matching close tags
  const returnStatements = result.match(/return\s*\(\s*<([A-Za-z][A-Za-z0-9]*)[^>]*>[\s\S]*?(?:<\/\1>|\/>)/g) || [];
  
  for (const statement of returnStatements) {
    const openingTagMatch = statement.match(/<([A-Za-z][A-Za-z0-9]*)/g) || [];
    const closingTagMatch = statement.match(/<\/([A-Za-z][A-Za-z0-9]*)>/g) || [];
    
    if (openingTagMatch.length > closingTagMatch.length && openingTagMatch[0]) {
      const mainTag = openingTagMatch[0].substring(1);
      
      if (mainTag) {
        // Corrected regex: escape the parenthesis for new RegExp
        const closingTagRegex = new RegExp(`</${mainTag}>\\s*\\)\\s*;\\s*$`); 
        if (!closingTagRegex.test(result)) {
          // Corrected replacement regex: ensure the regex itself is valid when constructed
          result = result.replace(new RegExp('(\\s*\\)\\s*;\\s*)$'), `\n    </${mainTag}>$1`);
          issues.push(`Added missing closing tag </${mainTag}>`);
          fixed = true;
          logger.debug(`[ESBUILD-FIX] Added missing closing JSX tag: </${mainTag}>`);
        }
      }
    }
  }

  return { code: result, issues, fixed };
}

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
